use soroban_sdk::{symbol_short, Address, Env};
use crate::{arithmetic, events, oracle, rate_source, storage, types::*};

/// Mark a position to market.
/// Recomputes the forward for the remaining tenor, values the position,
/// and updates side states (Safe / Called / Liquidated).
pub fn mark_to_market(env: &Env, position_id: u64) -> MarkResult {
    let mut pos = storage::get_position(env, position_id).expect("position not found");
    assert!(pos.status == PositionStatus::Active, "position not active");

    let now = storage::current_time(env);
    let spot = oracle::get_spot(env);
    let rate_base = rate_source::get_rate(env, &pos.pair_base);
    let rate_quote = rate_source::get_rate(env, &pos.pair_quote);

    // Remaining tenor in days
    let remaining_seconds = if pos.maturity_time > now {
        pos.maturity_time - now
    } else {
        0
    };
    let remaining_days = (remaining_seconds / 86400) as u32;

    // Current forward for remaining tenor
    let current_forward = if remaining_days > 0 {
        arithmetic::compute_forward(spot, rate_base, rate_quote, remaining_days)
    } else {
        spot // at maturity, forward converges to spot
    };

    // Value from hedger's perspective
    let value = arithmetic::value_position(
        pos.locked_forward,
        current_forward,
        pos.notional,
        spot,
        &pos.direction,
    );

    // Margin thresholds
    let maint_pct = storage::get_maint_margin_pct(env);
    let margin_pct = storage::get_margin_pct(env);
    let maint_threshold = arithmetic::compute_maintenance_margin(pos.notional, maint_pct);
    let initial_margin = arithmetic::compute_initial_margin(pos.notional, margin_pct);

    // Hedger's loss = -value when value < 0; maker's loss = value when value > 0
    let hedger_loss = if value < 0 { -value } else { 0 };
    let maker_loss = if value > 0 { value } else { 0 };

    // Update hedger state
    if hedger_loss >= initial_margin {
        if pos.hedger_state != SideState::Liquidated {
            pos.hedger_state = SideState::Liquidated;
            events::emit_margin_call(env, position_id, symbol_short!("hedger"), hedger_loss);
        }
    } else if hedger_loss >= maint_threshold {
        if pos.hedger_state == SideState::Safe {
            pos.hedger_state = SideState::Called;
            events::emit_margin_call(env, position_id, symbol_short!("hedger"), hedger_loss);
        }
    } else {
        pos.hedger_state = SideState::Safe;
    }

    // Update maker state
    if maker_loss >= initial_margin {
        if pos.maker_state != SideState::Liquidated {
            pos.maker_state = SideState::Liquidated;
            events::emit_margin_call(env, position_id, symbol_short!("maker"), maker_loss);
        }
    } else if maker_loss >= maint_threshold {
        if pos.maker_state == SideState::Safe {
            pos.maker_state = SideState::Called;
            events::emit_margin_call(env, position_id, symbol_short!("maker"), maker_loss);
        }
    } else {
        pos.maker_state = SideState::Safe;
    }

    pos.last_mark_value = value;
    pos.last_mark_time = now;
    storage::set_position(env, &pos);

    MarkResult {
        position_id,
        value,
        hedger_state: pos.hedger_state,
        maker_state: pos.maker_state,
    }
}

/// Top up margin for a position
pub fn top_up(env: &Env, caller: &Address, position_id: u64, amount: i128) {
    let mut pos = storage::get_position(env, position_id).expect("position not found");
    assert!(pos.status == PositionStatus::Active, "position not active");

    let token = soroban_sdk::token::Client::new(env, &pos.margin_token);
    let contract_addr = env.current_contract_address();

    if *caller == pos.hedger {
        token.transfer(caller, &contract_addr, &amount);
        pos.hedger_margin += amount;
        pos.hedger_state = SideState::Safe;
        events::emit_top_up(env, position_id, symbol_short!("hedger"), amount);
    } else if *caller == pos.maker {
        token.transfer(caller, &contract_addr, &amount);
        pos.maker_margin += amount;
        pos.maker_state = SideState::Safe;
        events::emit_top_up(env, position_id, symbol_short!("maker"), amount);
    } else {
        panic!("not a position party");
    }

    storage::set_position(env, &pos);
}

/// Liquidate a position (partial 30% on first breach, full if continues)
pub fn liquidate(env: &Env, position_id: u64) -> LiquidationResult {
    let mut pos = storage::get_position(env, position_id).expect("position not found");
    assert!(pos.status == PositionStatus::Active, "position not active");

    // Use liquidation price (median of last 3 prints)
    let liq_spot = oracle::get_liquidation_price(env);
    let rate_base = rate_source::get_rate(env, &pos.pair_base);
    let rate_quote = rate_source::get_rate(env, &pos.pair_quote);

    let now = storage::current_time(env);
    let remaining_seconds = if pos.maturity_time > now { pos.maturity_time - now } else { 0 };
    let remaining_days = (remaining_seconds / 86400) as u32;

    let current_forward = if remaining_days > 0 {
        arithmetic::compute_forward(liq_spot, rate_base, rate_quote, remaining_days)
    } else {
        liq_spot
    };

    let value = arithmetic::value_position(
        pos.locked_forward, current_forward, pos.notional, liq_spot, &pos.direction,
    );

    let margin_pct = storage::get_margin_pct(env);
    let initial_margin = arithmetic::compute_initial_margin(pos.notional, margin_pct);
    let partial_pct = storage::get_partial_liq_pct(env);

    let hedger_loss = if value < 0 { -value } else { 0 };
    let maker_loss = if value > 0 { value } else { 0 };

    let token = soroban_sdk::token::Client::new(env, &pos.margin_token);
    let contract_addr = env.current_contract_address();

    // Determine which side to liquidate
    if hedger_loss >= initial_margin {
        // Liquidate hedger side
        let partial = pos.hedger_state != SideState::Liquidated;
        let liq_amount = if partial {
            // 30% partial liquidation on first breach
            pos.notional * partial_pct / 10_000
        } else {
            pos.notional
        };

        // Penalty = 1% of liquidated notional → insurance
        let penalty = liq_amount / 100;
        let remaining_margin = pos.hedger_margin;

        // Transfer margin to winner (maker)
        let payout = if remaining_margin > penalty {
            remaining_margin - penalty
        } else {
            0
        };

        if payout > 0 {
            token.transfer(&contract_addr, &pos.maker, &payout);
        }

        // Penalty to insurance
        let actual_penalty = remaining_margin.min(penalty);
        if actual_penalty > 0 {
            let ins = storage::get_insurance_balance(env);
            storage::set_insurance_balance(env, ins + actual_penalty);
        }

        if partial {
            // Reduce position notional by 30%
            pos.notional -= liq_amount;
            pos.hedger_margin = 0;
            pos.hedger_state = SideState::Liquidated;
            // Position stays active with reduced notional
        } else {
            // Full liquidation
            pos.hedger_margin = 0;
            pos.status = PositionStatus::Liquidated;
        }

        storage::set_position(env, &pos);
        events::emit_liquidation(env, position_id, symbol_short!("hedger"), liq_amount, partial);

        LiquidationResult {
            position_id,
            liquidated_side: symbol_short!("hedger"),
            amount_liquidated: liq_amount,
            penalty_to_insurance: actual_penalty,
            partial,
        }
    } else if maker_loss >= initial_margin {
        // Liquidate maker side
        let partial = pos.maker_state != SideState::Liquidated;
        let liq_amount = if partial {
            pos.notional * partial_pct / 10_000
        } else {
            pos.notional
        };

        let penalty = liq_amount / 100;
        let remaining_margin = pos.maker_margin;

        let payout = if remaining_margin > penalty {
            remaining_margin - penalty
        } else {
            0
        };

        if payout > 0 {
            token.transfer(&contract_addr, &pos.hedger, &payout);
        }

        let actual_penalty = remaining_margin.min(penalty);
        if actual_penalty > 0 {
            let ins = storage::get_insurance_balance(env);
            storage::set_insurance_balance(env, ins + actual_penalty);
        }

        if partial {
            pos.notional -= liq_amount;
            pos.maker_margin = 0;
            pos.maker_state = SideState::Liquidated;
        } else {
            pos.maker_margin = 0;
            pos.status = PositionStatus::Liquidated;
        }

        storage::set_position(env, &pos);
        events::emit_liquidation(env, position_id, symbol_short!("maker"), liq_amount, partial);

        LiquidationResult {
            position_id,
            liquidated_side: symbol_short!("maker"),
            amount_liquidated: liq_amount,
            penalty_to_insurance: actual_penalty,
            partial,
        }
    } else {
        panic!("not liquidatable");
    }
}

use soroban_sdk::Env;
use crate::{arithmetic, events, insurance, oracle, storage, types::*};

/// Cash settlement at maturity.
/// Pays the difference in margin token (USDC).
/// Waterfall: loser's margin → insurance fund → haircut on winner's payout.
pub fn settle(env: &Env, position_id: u64) -> SettlementResult {
    let mut pos = storage::get_position(env, position_id).expect("position not found");
    assert!(pos.status == PositionStatus::Active, "position not active");

    let now = storage::current_time(env);
    assert!(now >= pos.maturity_time, "position not mature");

    let spot = oracle::get_spot(env);

    // At maturity, forward converges to spot, but we compute for remaining = 0
    // which gives forward = spot
    let value = arithmetic::value_position(
        pos.locked_forward,
        spot, // at maturity, current forward = spot
        pos.notional,
        spot,
        &pos.direction,
    );

    let token = soroban_sdk::token::Client::new(env, &pos.margin_token);
    let contract_addr = env.current_contract_address();

    let mut insurance_used: i128 = 0;
    let mut haircut_applied = false;

    let (hedger_payout, maker_payout) = if value >= 0 {
        // Hedger gains, maker loses
        let hedger_gain = value;
        let maker_owes = hedger_gain;

        if maker_owes <= pos.maker_margin {
            // Maker can pay from margin
            (pos.hedger_margin + maker_owes, pos.maker_margin - maker_owes)
        } else {
            // Maker's margin insufficient — waterfall
            let shortfall = maker_owes - pos.maker_margin;

            // Step 2: insurance fund
            let (covered, remaining) = insurance::cover_loss(env, shortfall);
            insurance_used = covered;

            if remaining > 0 {
                // Step 3: haircut on winner's payout
                haircut_applied = true;
                let hedger_gets = pos.hedger_margin + pos.maker_margin + covered;
                (hedger_gets, 0_i128)
            } else {
                (pos.hedger_margin + maker_owes, 0_i128)
            }
        }
    } else {
        // Maker gains, hedger loses
        let maker_gain = -value;
        let hedger_owes = maker_gain;

        if hedger_owes <= pos.hedger_margin {
            (pos.hedger_margin - hedger_owes, pos.maker_margin + hedger_owes)
        } else {
            let shortfall = hedger_owes - pos.hedger_margin;
            let (covered, remaining) = insurance::cover_loss(env, shortfall);
            insurance_used = covered;

            if remaining > 0 {
                haircut_applied = true;
                let maker_gets = pos.maker_margin + pos.hedger_margin + covered;
                (0_i128, maker_gets)
            } else {
                (0_i128, pos.maker_margin + hedger_owes)
            }
        }
    };

    // Pay out
    if hedger_payout > 0 {
        token.transfer(&contract_addr, &pos.hedger, &hedger_payout);
    }
    if maker_payout > 0 {
        token.transfer(&contract_addr, &pos.maker, &maker_payout);
    }

    // Update position
    pos.status = PositionStatus::Settled;
    pos.hedger_margin = 0;
    pos.maker_margin = 0;
    pos.last_mark_value = value;
    pos.last_mark_time = now;
    storage::set_position(env, &pos);

    events::emit_settlement(env, position_id, hedger_payout, maker_payout);

    SettlementResult {
        position_id,
        hedger_payout,
        maker_payout,
        insurance_used,
        haircut_applied,
    }
}

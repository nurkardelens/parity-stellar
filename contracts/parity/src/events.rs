use soroban_sdk::{symbol_short, Env, Symbol};

pub fn emit_request_posted(env: &Env, request_id: u64, forward: i128) {
    env.events().publish(
        (symbol_short!("rfq"), symbol_short!("request")),
        (request_id, forward),
    );
}

pub fn emit_quote_submitted(env: &Env, request_id: u64, quote_id: u64, spread_bps: i128) {
    env.events().publish(
        (symbol_short!("rfq"), symbol_short!("quote")),
        (request_id, quote_id, spread_bps),
    );
}

pub fn emit_quote_cancelled(env: &Env, request_id: u64, quote_id: u64) {
    env.events().publish(
        (symbol_short!("rfq"), symbol_short!("cancel")),
        (request_id, quote_id),
    );
}

pub fn emit_position_opened(env: &Env, position_id: u64, locked_forward: i128) {
    env.events().publish(
        (symbol_short!("pos"), symbol_short!("open")),
        (position_id, locked_forward),
    );
}

pub fn emit_margin_call(env: &Env, position_id: u64, side: Symbol, loss: i128) {
    env.events().publish(
        (symbol_short!("margin"), symbol_short!("call")),
        (position_id, side, loss),
    );
}

pub fn emit_liquidation(env: &Env, position_id: u64, side: Symbol, amount: i128, partial: bool) {
    env.events().publish(
        (symbol_short!("margin"), symbol_short!("liq")),
        (position_id, side, amount, partial),
    );
}

pub fn emit_settlement(env: &Env, position_id: u64, hedger_payout: i128, maker_payout: i128) {
    env.events().publish(
        (symbol_short!("pos"), symbol_short!("settle")),
        (position_id, hedger_payout, maker_payout),
    );
}

pub fn emit_top_up(env: &Env, position_id: u64, side: Symbol, amount: i128) {
    env.events().publish(
        (symbol_short!("margin"), symbol_short!("topup")),
        (position_id, side, amount),
    );
}

use soroban_sdk::{Address, Env, Symbol, Vec};
use crate::{arithmetic, events, oracle, rate_source, storage, types::*};

/// Post a new request for quote
pub fn post_request(
    env: &Env,
    hedger: &Address,
    pair_base: &Symbol,
    pair_quote: &Symbol,
    direction: Direction,
    notional: i128,
    tenor_days: u32,
    margin_token: &Address,
) -> u64 {
    let spot = oracle::get_spot(env);
    let rate_base = rate_source::get_rate(env, pair_base);
    let rate_quote = rate_source::get_rate(env, pair_quote);

    let parity_forward = arithmetic::compute_forward(spot, rate_base, rate_quote, tenor_days);

    let id = storage::get_next_request_id(env);
    let now = storage::current_time(env);

    let request = Request {
        id,
        hedger: hedger.clone(),
        pair_base: pair_base.clone(),
        pair_quote: pair_quote.clone(),
        direction,
        notional,
        tenor_days,
        parity_forward,
        margin_token: margin_token.clone(),
        status: RequestStatus::Open,
        created_at: now,
        quote_count: 0,
    };

    storage::set_request(env, &request);
    storage::set_next_request_id(env, id + 1);

    let mut open = storage::get_open_requests(env);
    open.push_back(id);
    storage::set_open_requests(env, &open);

    events::emit_request_posted(env, id, parity_forward);

    id
}

/// Maker submits a quote on a request.
/// Maker's margin is reserved (transferred to contract) at quote submission.
pub fn submit_quote(
    env: &Env,
    maker: &Address,
    request_id: u64,
    spread_bps: i128,
    expiry: u64,
) -> u64 {
    let mut request = storage::get_request(env, request_id).expect("request not found");
    assert!(request.status == RequestStatus::Open, "request not open");

    let locked_forward = arithmetic::apply_spread(request.parity_forward, spread_bps);

    // Reserve maker's margin at quote time
    let margin_pct = storage::get_margin_pct(env);
    let initial_margin = arithmetic::compute_initial_margin(request.notional, margin_pct);

    let token = soroban_sdk::token::Client::new(env, &request.margin_token);
    let contract_addr = env.current_contract_address();
    token.transfer(maker, &contract_addr, &initial_margin);

    let quote_id = request.quote_count;
    let quote = Quote {
        id: quote_id,
        request_id,
        maker: maker.clone(),
        spread_bps,
        locked_forward,
        expiry,
        status: QuoteStatus::Live,
    };

    request.quote_count = quote_id + 1;
    storage::set_request(env, &request);
    storage::set_quote(env, &quote);

    events::emit_quote_submitted(env, request_id, quote_id, spread_bps);

    quote_id
}

/// Maker cancels a live quote. Reserved margin is returned.
pub fn cancel_quote(env: &Env, maker: &Address, request_id: u64, quote_id: u64) {
    let request = storage::get_request(env, request_id).expect("request not found");
    let mut quote = storage::get_quote(env, request_id, quote_id).expect("quote not found");
    assert!(quote.status == QuoteStatus::Live, "quote not live");
    assert!(quote.maker == *maker, "not quote maker");

    // Return maker's reserved margin
    let margin_pct = storage::get_margin_pct(env);
    let initial_margin = arithmetic::compute_initial_margin(request.notional, margin_pct);

    let token = soroban_sdk::token::Client::new(env, &request.margin_token);
    let contract_addr = env.current_contract_address();
    token.transfer(&contract_addr, maker, &initial_margin);

    quote.status = QuoteStatus::Cancelled;
    storage::set_quote(env, &quote);

    events::emit_quote_cancelled(env, request_id, quote_id);
}

/// Hedger accepts a quote — opens position, takes hedger margin in this tx.
/// Maker margin was already reserved at quote submission.
pub fn accept_quote(env: &Env, hedger: &Address, request_id: u64, quote_id: u64) -> u64 {
    let mut request = storage::get_request(env, request_id).expect("request not found");
    assert!(request.status == RequestStatus::Open, "request not open");
    assert!(request.hedger == *hedger, "not request hedger");

    let mut quote = storage::get_quote(env, request_id, quote_id).expect("quote not found");
    let now = storage::current_time(env);

    // Reject expired, cancelled, or already-accepted quotes
    assert!(quote.status == QuoteStatus::Live, "quote not live");
    if quote.expiry > 0 && now > quote.expiry {
        quote.status = QuoteStatus::Expired;
        storage::set_quote(env, &quote);
        panic!("quote expired");
    }

    // Compute initial margin
    let margin_pct = storage::get_margin_pct(env);
    let initial_margin = arithmetic::compute_initial_margin(request.notional, margin_pct);

    // Compute open fee
    let fee_bps = storage::get_open_fee_bps(env);
    let open_fee = arithmetic::compute_open_fee(request.notional, fee_bps);

    // Transfer hedger's margin + fee (maker's was already taken at quote submit)
    let token = soroban_sdk::token::Client::new(env, &request.margin_token);
    let contract_addr = env.current_contract_address();
    token.transfer(hedger, &contract_addr, &(initial_margin + open_fee));

    // Fee goes to insurance fund
    let ins_balance = storage::get_insurance_balance(env);
    storage::set_insurance_balance(env, ins_balance + open_fee);

    // Open position
    let maturity = now + (request.tenor_days as u64) * 86400;

    let position_id = storage::get_next_position_id(env);
    let position = Position {
        id: position_id,
        hedger: hedger.clone(),
        maker: quote.maker.clone(),
        pair_base: request.pair_base.clone(),
        pair_quote: request.pair_quote.clone(),
        direction: request.direction.clone(),
        notional: request.notional,
        locked_forward: quote.locked_forward,
        tenor_days: request.tenor_days,
        open_time: now,
        maturity_time: maturity,
        margin_token: request.margin_token.clone(),
        hedger_margin: initial_margin,
        maker_margin: initial_margin,
        hedger_state: SideState::Safe,
        maker_state: SideState::Safe,
        status: PositionStatus::Active,
        last_mark_value: 0,
        last_mark_time: now,
    };

    storage::set_position(env, &position);
    storage::set_next_position_id(env, position_id + 1);

    // Update quote and request status
    quote.status = QuoteStatus::Accepted;
    storage::set_quote(env, &quote);

    request.status = RequestStatus::Filled;
    storage::set_request(env, &request);

    // Remove from open requests
    let open = storage::get_open_requests(env);
    let mut new_open = Vec::new(env);
    for i in 0..open.len() {
        let rid = open.get(i).unwrap();
        if rid != request_id {
            new_open.push_back(rid);
        }
    }
    storage::set_open_requests(env, &new_open);

    events::emit_position_opened(env, position_id, quote.locked_forward);

    position_id
}

/// Get request details
pub fn get_request(env: &Env, request_id: u64) -> Request {
    storage::get_request(env, request_id).expect("request not found")
}

/// Get all open request IDs
pub fn get_open_requests(env: &Env) -> Vec<u64> {
    storage::get_open_requests(env)
}

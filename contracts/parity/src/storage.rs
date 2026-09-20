use soroban_sdk::{contracttype, Address, Env, Symbol, Vec};
use crate::types::{Position, Quote, Request};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    MarginPct,
    MaintMarginPct,
    OpenFeeBps,
    PartialLiqPct,
    InsuranceBalance,
    NextRequestId,
    NextPositionId,
    SpotPrice,
    SpotHistory,       // Vec of last 3 spot prices
    Rate(Symbol),      // governance rate per currency
    Eligible(Address), // allowlist entry
    Request(u64),
    Quote(u64, u64),   // (request_id, quote_id)
    Position(u64),
    OpenRequests,      // Vec<u64> of open request IDs
    DemoTime,          // admin override for contract time
}

// ── Admin ──

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

// ── Parameters ──

pub fn set_margin_pct(env: &Env, pct: i128) {
    env.storage().instance().set(&DataKey::MarginPct, &pct);
}

pub fn get_margin_pct(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::MarginPct).unwrap()
}

pub fn set_maint_margin_pct(env: &Env, pct: i128) {
    env.storage().instance().set(&DataKey::MaintMarginPct, &pct);
}

pub fn get_maint_margin_pct(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::MaintMarginPct).unwrap()
}

pub fn set_open_fee_bps(env: &Env, bps: i128) {
    env.storage().instance().set(&DataKey::OpenFeeBps, &bps);
}

pub fn get_open_fee_bps(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::OpenFeeBps).unwrap()
}

pub fn set_partial_liq_pct(env: &Env, pct: i128) {
    env.storage().instance().set(&DataKey::PartialLiqPct, &pct);
}

pub fn get_partial_liq_pct(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::PartialLiqPct).unwrap()
}

// ── Insurance ──

pub fn set_insurance_balance(env: &Env, balance: i128) {
    env.storage().instance().set(&DataKey::InsuranceBalance, &balance);
}

pub fn get_insurance_balance(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::InsuranceBalance).unwrap_or(0)
}

// ── Counters ──

pub fn set_next_request_id(env: &Env, id: u64) {
    env.storage().instance().set(&DataKey::NextRequestId, &id);
}

pub fn get_next_request_id(env: &Env) -> u64 {
    env.storage().instance().get(&DataKey::NextRequestId).unwrap_or(0)
}

pub fn set_next_position_id(env: &Env, id: u64) {
    env.storage().instance().set(&DataKey::NextPositionId, &id);
}

pub fn get_next_position_id(env: &Env) -> u64 {
    env.storage().instance().get(&DataKey::NextPositionId).unwrap_or(0)
}

// ── Oracle ──

pub fn set_spot_price(env: &Env, price: i128) {
    env.storage().instance().set(&DataKey::SpotPrice, &price);
}

pub fn get_spot_price(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::SpotPrice).unwrap_or(0)
}

pub fn set_spot_history(env: &Env, history: &Vec<i128>) {
    env.storage().instance().set(&DataKey::SpotHistory, history);
}

pub fn get_spot_history(env: &Env) -> Vec<i128> {
    env.storage().instance().get(&DataKey::SpotHistory)
        .unwrap_or(Vec::new(env))
}

// ── Rates ──

pub fn set_rate(env: &Env, currency: &Symbol, rate: i128) {
    env.storage().instance().set(&DataKey::Rate(currency.clone()), &rate);
}

pub fn get_rate(env: &Env, currency: &Symbol) -> i128 {
    env.storage().instance().get(&DataKey::Rate(currency.clone())).unwrap_or(0)
}

// ── Eligibility ──

pub fn set_eligible(env: &Env, account: &Address, eligible: bool) {
    env.storage().persistent().set(&DataKey::Eligible(account.clone()), &eligible);
}

pub fn is_eligible(env: &Env, account: &Address) -> bool {
    env.storage().persistent().get(&DataKey::Eligible(account.clone())).unwrap_or(false)
}

// ── Requests ──

pub fn set_request(env: &Env, request: &Request) {
    env.storage().persistent().set(&DataKey::Request(request.id), request);
}

pub fn get_request(env: &Env, id: u64) -> Option<Request> {
    env.storage().persistent().get(&DataKey::Request(id))
}

pub fn set_open_requests(env: &Env, ids: &Vec<u64>) {
    env.storage().instance().set(&DataKey::OpenRequests, ids);
}

pub fn get_open_requests(env: &Env) -> Vec<u64> {
    env.storage().instance().get(&DataKey::OpenRequests)
        .unwrap_or(Vec::new(env))
}

// ── Quotes ──

pub fn set_quote(env: &Env, quote: &Quote) {
    env.storage().persistent().set(
        &DataKey::Quote(quote.request_id, quote.id),
        quote,
    );
}

pub fn get_quote(env: &Env, request_id: u64, quote_id: u64) -> Option<Quote> {
    env.storage().persistent().get(&DataKey::Quote(request_id, quote_id))
}

// ── Positions ──

pub fn set_position(env: &Env, position: &Position) {
    env.storage().persistent().set(&DataKey::Position(position.id), position);
}

pub fn get_position(env: &Env, id: u64) -> Option<Position> {
    env.storage().persistent().get(&DataKey::Position(id))
}

// ── Demo Time ──

pub fn set_demo_time(env: &Env, timestamp: u64) {
    env.storage().instance().set(&DataKey::DemoTime, &timestamp);
}

pub fn get_demo_time(env: &Env) -> Option<u64> {
    env.storage().instance().get(&DataKey::DemoTime)
}

/// Get the effective current time (demo override or ledger timestamp)
pub fn current_time(env: &Env) -> u64 {
    get_demo_time(env).unwrap_or_else(|| env.ledger().timestamp())
}

#![no_std]

mod arithmetic;
mod types;
mod oracle;
mod rate_source;
mod rfq;
mod position;
mod margin;
mod insurance;
mod settlement;
mod admin;
mod eligibility;
mod errors;
mod events;
mod storage;
#[cfg(test)]
mod test;

pub use crate::types::*;
pub use crate::errors::*;

use soroban_sdk::{contract, contractimpl, Address, Env, Vec};

#[contract]
pub struct ParityContract;

#[contractimpl]
impl ParityContract {
    /// Initialize the contract with admin and insurance fund parameters
    pub fn initialize(
        env: Env,
        admin: Address,
        margin_pct: i128,       // basis points, e.g. 500 = 5%
        maint_margin_pct: i128, // basis points, e.g. 250 = 2.5%
        open_fee_bps: i128,     // basis points, e.g. 2
        partial_liq_pct: i128,  // basis points, e.g. 3000 = 30%
    ) {
        admin.require_auth();
        storage::set_admin(&env, &admin);
        storage::set_margin_pct(&env, margin_pct);
        storage::set_maint_margin_pct(&env, maint_margin_pct);
        storage::set_open_fee_bps(&env, open_fee_bps);
        storage::set_partial_liq_pct(&env, partial_liq_pct);
        storage::set_insurance_balance(&env, 0);
        storage::set_next_request_id(&env, 0);
        storage::set_next_position_id(&env, 0);
    }

    // ── Oracle & Rate Source ──

    /// Admin: set the mock oracle spot price (7 decimals)
    pub fn set_spot_price(env: Env, admin: Address, price: i128) {
        admin::require_admin(&env, &admin);
        oracle::set_spot(&env, price);
    }

    /// Admin: set the governance rate for a currency (7 decimals)
    pub fn set_rate(env: Env, admin: Address, currency: Symbol, rate: i128) {
        admin::require_admin(&env, &admin);
        rate_source::set_rate(&env, &currency, rate);
    }

    /// Admin: set the contract's notion of current time (ledger timestamp override for demo)
    pub fn set_time(env: Env, admin: Address, timestamp: u64) {
        admin::require_admin(&env, &admin);
        admin::set_demo_time(&env, timestamp);
    }

    /// Read the current spot price
    pub fn get_spot(env: Env) -> i128 {
        oracle::get_spot(&env)
    }

    /// Read a governance rate
    pub fn get_rate(env: Env, currency: Symbol) -> i128 {
        rate_source::get_rate(&env, &currency)
    }

    /// Compute the forward price for a pair and tenor
    pub fn compute_forward(_env: Env, spot: i128, rate_base: i128, rate_quote: i128, tenor_days: u32) -> i128 {
        arithmetic::compute_forward(spot, rate_base, rate_quote, tenor_days)
    }

    // ── Eligibility ──

    /// Admin: add address to allowlist
    pub fn add_eligible(env: Env, admin: Address, account: Address) {
        admin::require_admin(&env, &admin);
        eligibility::add(&env, &account);
    }

    /// Check if address is eligible
    pub fn is_eligible(env: Env, account: Address) -> bool {
        eligibility::is_eligible(&env, &account)
    }

    // ── RFQ ──

    /// Hedger posts a request for quote
    pub fn post_request(
        env: Env,
        hedger: Address,
        pair_base: Symbol,      // e.g. "USD"
        pair_quote: Symbol,     // e.g. "MXN" or "TRY"
        direction: Direction,   // SellBase or BuyBase
        notional: i128,         // 7 decimals
        tenor_days: u32,
        margin_token: Address,  // USDC SAC address
    ) -> u64 {
        hedger.require_auth();
        eligibility::require_eligible(&env, &hedger);
        rfq::post_request(&env, &hedger, &pair_base, &pair_quote, direction, notional, tenor_days, &margin_token)
    }

    /// Maker submits a quote on a request
    pub fn submit_quote(
        env: Env,
        maker: Address,
        request_id: u64,
        spread_bps: i128,
        expiry: u64,
    ) -> u64 {
        maker.require_auth();
        eligibility::require_eligible(&env, &maker);
        rfq::submit_quote(&env, &maker, request_id, spread_bps, expiry)
    }

    /// Maker cancels a quote (only if not yet accepted)
    pub fn cancel_quote(env: Env, maker: Address, request_id: u64, quote_id: u64) {
        maker.require_auth();
        rfq::cancel_quote(&env, &maker, request_id, quote_id);
    }

    /// Hedger accepts a quote — opens position and takes margins in one tx
    pub fn accept_quote(env: Env, hedger: Address, request_id: u64, quote_id: u64) -> u64 {
        hedger.require_auth();
        rfq::accept_quote(&env, &hedger, request_id, quote_id)
    }

    // ── Position ──

    /// Get position details
    pub fn get_position(env: Env, position_id: u64) -> Position {
        position::get_position(&env, position_id)
    }

    /// Get request details
    pub fn get_request(env: Env, request_id: u64) -> Request {
        rfq::get_request(&env, request_id)
    }

    /// Get all open request IDs
    pub fn get_open_requests(env: Env) -> Vec<u64> {
        rfq::get_open_requests(&env)
    }

    // ── Mark-to-Market & Margin ──

    /// Mark a position to market (anyone can call)
    pub fn mark_position(env: Env, position_id: u64) -> MarkResult {
        margin::mark_to_market(&env, position_id)
    }

    /// Top up margin for a position side
    pub fn top_up_margin(env: Env, caller: Address, position_id: u64, amount: i128) {
        caller.require_auth();
        margin::top_up(&env, &caller, position_id, amount);
    }

    /// Liquidate a position (anyone can call if conditions met)
    pub fn liquidate(env: Env, position_id: u64) -> LiquidationResult {
        margin::liquidate(&env, position_id)
    }

    // ── Settlement ──

    /// Settle a position at maturity (cash settlement)
    pub fn settle(env: Env, position_id: u64) -> SettlementResult {
        settlement::settle(&env, position_id)
    }

    // ── Insurance Fund ──

    /// Get insurance fund balance
    pub fn get_insurance_balance(env: Env) -> i128 {
        storage::get_insurance_balance(&env)
    }
}

use soroban_sdk::Symbol;

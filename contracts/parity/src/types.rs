use soroban_sdk::{contracttype, Address, Symbol};

/// 7 decimal places to match Stellar precision
pub const DECIMALS: i128 = 10_000_000; // 1e7
/// Days basis for interest calculation
pub const DAY_BASIS: i128 = 360;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Direction {
    SellBase, // hedger sells base currency forward (e.g., sells USD)
    BuyBase,  // hedger buys base currency forward
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestStatus {
    Open,
    Filled,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum QuoteStatus {
    Live,
    Cancelled,
    Accepted,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SideState {
    Safe,
    Called,
    Liquidated,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PositionStatus {
    Active,
    Settled,
    Liquidated,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Request {
    pub id: u64,
    pub hedger: Address,
    pub pair_base: Symbol,
    pub pair_quote: Symbol,
    pub direction: Direction,
    pub notional: i128,
    pub tenor_days: u32,
    pub parity_forward: i128, // computed at request time, 7 decimals
    pub margin_token: Address,
    pub status: RequestStatus,
    pub created_at: u64,
    pub quote_count: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Quote {
    pub id: u64,
    pub request_id: u64,
    pub maker: Address,
    pub spread_bps: i128,
    pub locked_forward: i128, // parity_forward adjusted by spread, 7 decimals
    pub expiry: u64,
    pub status: QuoteStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Position {
    pub id: u64,
    pub hedger: Address,
    pub maker: Address,
    pub pair_base: Symbol,
    pub pair_quote: Symbol,
    pub direction: Direction,
    pub notional: i128,
    pub locked_forward: i128,
    pub tenor_days: u32,
    pub open_time: u64,
    pub maturity_time: u64,
    pub margin_token: Address,
    pub hedger_margin: i128,
    pub maker_margin: i128,
    pub hedger_state: SideState,
    pub maker_state: SideState,
    pub status: PositionStatus,
    pub last_mark_value: i128, // positive = hedger gains
    pub last_mark_time: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarkResult {
    pub position_id: u64,
    pub value: i128, // positive = hedger gains
    pub hedger_state: SideState,
    pub maker_state: SideState,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiquidationResult {
    pub position_id: u64,
    pub liquidated_side: Symbol, // "hedger" or "maker"
    pub amount_liquidated: i128,
    pub penalty_to_insurance: i128,
    pub partial: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettlementResult {
    pub position_id: u64,
    pub hedger_payout: i128,
    pub maker_payout: i128,
    pub insurance_used: i128,
    pub haircut_applied: bool,
}

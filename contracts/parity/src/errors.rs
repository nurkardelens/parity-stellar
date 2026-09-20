use soroban_sdk::contracterror;

#[contracterror]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ParityError {
    NotAdmin = 1,
    NotEligible = 2,
    RequestNotFound = 3,
    QuoteNotFound = 4,
    QuoteExpired = 5,
    QuoteCancelled = 6,
    QuoteAlreadyAccepted = 7,
    PositionNotFound = 8,
    PositionNotActive = 9,
    PositionNotMature = 10,
    NotPositionParty = 11,
    InsufficientMargin = 12,
    NotLiquidatable = 13,
    Overflow = 14,
    InvalidInput = 15,
    AlreadyInitialized = 16,
    RequestNotOpen = 17,
    NotQuoteMaker = 18,
}

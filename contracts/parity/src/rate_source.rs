use soroban_sdk::{Env, Symbol};
use crate::storage;

/// Set a governance rate for a currency (admin-set implementation of RateSource)
pub fn set_rate(env: &Env, currency: &Symbol, rate: i128) {
    storage::set_rate(env, currency, rate);
}

/// Get the rate for a currency
pub fn get_rate(env: &Env, currency: &Symbol) -> i128 {
    storage::get_rate(env, currency)
}

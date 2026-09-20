use soroban_sdk::Env;
use crate::storage;

/// Add funds to the insurance pool
pub fn add_to_fund(env: &Env, amount: i128) {
    let balance = storage::get_insurance_balance(env);
    storage::set_insurance_balance(env, balance + amount);
}

/// Try to cover a loss from the insurance fund.
/// Returns (amount_covered, remaining_shortfall).
pub fn cover_loss(env: &Env, loss: i128) -> (i128, i128) {
    let balance = storage::get_insurance_balance(env);
    if balance >= loss {
        storage::set_insurance_balance(env, balance - loss);
        (loss, 0)
    } else {
        storage::set_insurance_balance(env, 0);
        (balance, loss - balance)
    }
}

/// Get current insurance fund balance
pub fn get_balance(env: &Env) -> i128 {
    storage::get_insurance_balance(env)
}

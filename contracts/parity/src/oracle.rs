use soroban_sdk::{Env, Vec};
use crate::storage;

/// Set the spot price (mock oracle / admin override)
pub fn set_spot(env: &Env, price: i128) {
    // Update spot history (keep last 3)
    let mut history = storage::get_spot_history(env);
    let current = storage::get_spot_price(env);
    if current > 0 {
        if history.len() >= 3 {
            // Remove oldest: shift left
            let mut new_history = Vec::new(env);
            for i in 1..history.len() {
                new_history.push_back(history.get(i).unwrap());
            }
            new_history.push_back(current);
            history = new_history;
        } else {
            history.push_back(current);
        }
    }
    storage::set_spot_history(env, &history);
    storage::set_spot_price(env, price);
}

/// Get current spot price
pub fn get_spot(env: &Env) -> i128 {
    storage::get_spot_price(env)
}

/// Get median of last 3 spot prices (for liquidation decisions)
/// Falls back to current spot if history insufficient
pub fn get_liquidation_price(env: &Env) -> i128 {
    let history = storage::get_spot_history(env);
    let current = storage::get_spot_price(env);

    if history.len() < 2 {
        return current;
    }

    // Collect last prices including current
    let mut prices = Vec::new(env);
    for i in 0..history.len() {
        prices.push_back(history.get(i).unwrap());
    }
    prices.push_back(current);

    // Simple median of last 3: sort and pick middle
    let len = prices.len();
    if len >= 3 {
        let a = prices.get(len - 3).unwrap();
        let b = prices.get(len - 2).unwrap();
        let c = prices.get(len - 1).unwrap();
        median_of_three(a, b, c)
    } else {
        current
    }
}

fn median_of_three(a: i128, b: i128, c: i128) -> i128 {
    if (a >= b && a <= c) || (a <= b && a >= c) {
        a
    } else if (b >= a && b <= c) || (b <= a && b >= c) {
        b
    } else {
        c
    }
}

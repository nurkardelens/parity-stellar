use soroban_sdk::{Address, Env};
use crate::storage;

/// Add an address to the eligibility allowlist
pub fn add(env: &Env, account: &Address) {
    storage::set_eligible(env, account, true);
}

/// Check if an address is eligible
pub fn is_eligible(env: &Env, account: &Address) -> bool {
    storage::is_eligible(env, account)
}

/// Require that an address is eligible (panics if not)
pub fn require_eligible(env: &Env, account: &Address) {
    if !is_eligible(env, account) {
        panic!("not eligible");
    }
}

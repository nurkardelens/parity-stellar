use soroban_sdk::{Address, Env};
use crate::storage;

/// Require that the caller is the admin
pub fn require_admin(env: &Env, caller: &Address) {
    caller.require_auth();
    let admin = storage::get_admin(env);
    if *caller != admin {
        panic!("not admin");
    }
}

/// Set the demo time override
pub fn set_demo_time(env: &Env, timestamp: u64) {
    storage::set_demo_time(env, timestamp);
}

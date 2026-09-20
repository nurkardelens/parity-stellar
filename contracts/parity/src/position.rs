use soroban_sdk::Env;
use crate::{storage, types::Position};

/// Get a position by ID
pub fn get_position(env: &Env, position_id: u64) -> Position {
    storage::get_position(env, position_id).expect("position not found")
}

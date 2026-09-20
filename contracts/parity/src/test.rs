#![cfg(test)]
extern crate std;

use soroban_sdk::{
    testutils::Address as _,
    token, Address, Env, Symbol,
};

use crate::{ParityContract, ParityContractClient, types::*};

fn setup_env() -> (Env, ParityContractClient<'static>, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ParityContract, ());
    let client = ParityContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let hedger = Address::generate(&env);
    let maker = Address::generate(&env);

    // Create a mock USDC token
    let token_admin = Address::generate(&env);
    let usdc_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let usdc_client = token::StellarAssetClient::new(&env, &usdc_id.address());

    // Mint USDC to hedger and maker (1,000,000 USDC each = 1e13 in 7 decimals)
    let million = 10_000_000_0000000_i128;
    usdc_client.mint(&hedger, &million);
    usdc_client.mint(&maker, &million);

    // Initialize contract
    client.initialize(
        &admin,
        &500_i128,  // 5% initial margin
        &250_i128,  // 2.5% maintenance margin
        &2_i128,    // 2 bps open fee
        &3000_i128, // 30% partial liquidation
    );

    // Add eligible
    client.add_eligible(&admin, &hedger);
    client.add_eligible(&admin, &maker);

    // Set rates
    let usd = Symbol::new(&env, "USD");
    let mxn = Symbol::new(&env, "MXN");
    client.set_rate(&admin, &usd, &400_000); // 4% = 0.04
    client.set_rate(&admin, &mxn, &1_000_000); // 10% = 0.10

    // Set spot price: 20.0 MXN/USD
    client.set_spot_price(&admin, &200_000_000);

    (env, client, admin, hedger, maker, usdc_id.address())
}

#[test]
fn test_full_lifecycle_happy_path() {
    let (_env, client, admin, hedger, maker, usdc) = setup_env();

    let usd = Symbol::new(&_env, "USD");
    let mxn = Symbol::new(&_env, "MXN");

    // 1. Post request
    let request_id = client.post_request(
        &hedger, &usd, &mxn, &Direction::SellBase,
        &1_000_000_0000000_i128, &90_u32, &usdc,
    );
    assert_eq!(request_id, 0);

    // Verify forward ~20.297
    let request = client.get_request(&request_id);
    assert_eq!(request.status, RequestStatus::Open);
    let expected_fwd = 202_970_297_i128;
    let diff = (request.parity_forward - expected_fwd).abs();
    assert!(diff < 100_000, "Forward off: {} vs {}", request.parity_forward, expected_fwd);

    // 2. Submit quote (zero spread)
    let quote_id = client.submit_quote(&maker, &request_id, &0_i128, &0_u64);
    assert_eq!(quote_id, 0);

    // 3. Accept quote → opens position
    let position_id = client.accept_quote(&hedger, &request_id, &quote_id);
    assert_eq!(position_id, 0);

    let pos = client.get_position(&position_id);
    assert_eq!(pos.status, PositionStatus::Active);
    assert_eq!(pos.hedger_state, SideState::Safe);
    assert_eq!(pos.maker_state, SideState::Safe);

    // Verify margins taken (5% of 100,000 = 5,000 USDC = 50_000_0000000)
    let expected_margin = 50_000_0000000_i128;
    assert_eq!(pos.hedger_margin, expected_margin);
    assert_eq!(pos.maker_margin, expected_margin);

    // 4. Mark to market (no spot change — value ≈ 0)
    let mark = client.mark_position(&position_id);
    assert_eq!(mark.hedger_state, SideState::Safe);
    assert_eq!(mark.maker_state, SideState::Safe);

    // 5. Advance time to day 30, spot to 19.61 → counterparty called
    let open_time = pos.open_time;
    client.set_time(&admin, &(open_time + 30 * 86400));
    client.set_spot_price(&admin, &196_100_000);

    let mark2 = client.mark_position(&position_id);
    assert!(mark2.value > 0, "Hedger should be gaining");
    assert_eq!(mark2.maker_state, SideState::Called);

    // 6. Advance to maturity, set spot back to 20.0
    client.set_time(&admin, &(open_time + 90 * 86400));
    client.set_spot_price(&admin, &200_000_000);

    // 7. Settle
    let result = client.settle(&position_id);
    assert_eq!(result.position_id, 0);
    assert!(result.hedger_payout > result.maker_payout, "Hedger should gain");
    assert!(!result.haircut_applied);

    let pos_final = client.get_position(&position_id);
    assert_eq!(pos_final.status, PositionStatus::Settled);
}

#[test]
fn test_margin_call_and_topup() {
    let (_env, client, admin, hedger, maker, usdc) = setup_env();

    let usd = Symbol::new(&_env, "USD");
    let mxn = Symbol::new(&_env, "MXN");

    let req_id = client.post_request(
        &hedger, &usd, &mxn, &Direction::SellBase,
        &1_000_000_0000000_i128, &90_u32, &usdc,
    );
    let q_id = client.submit_quote(&maker, &req_id, &0_i128, &0_u64);
    let pos_id = client.accept_quote(&hedger, &req_id, &q_id);

    let pos = client.get_position(&pos_id);
    let open_time = pos.open_time;

    // Move to day 30, spot down → maker loses
    client.set_time(&admin, &(open_time + 30 * 86400));
    client.set_spot_price(&admin, &196_100_000);

    let mark = client.mark_position(&pos_id);
    assert_eq!(mark.maker_state, SideState::Called);

    // Maker tops up
    client.top_up_margin(&maker, &pos_id, &25_000_0000000_i128);

    let pos2 = client.get_position(&pos_id);
    assert_eq!(pos2.maker_state, SideState::Safe);
}

#[test]
#[should_panic]
fn test_quote_cannot_be_accepted_twice() {
    let (_env, client, _admin, hedger, maker, usdc) = setup_env();

    let usd = Symbol::new(&_env, "USD");
    let mxn = Symbol::new(&_env, "MXN");

    let req_id = client.post_request(
        &hedger, &usd, &mxn, &Direction::SellBase,
        &1_000_000_0000000_i128, &90_u32, &usdc,
    );
    let q_id = client.submit_quote(&maker, &req_id, &0_i128, &0_u64);
    client.accept_quote(&hedger, &req_id, &q_id);

    // This should panic — request is Filled
    client.accept_quote(&hedger, &req_id, &q_id);
}

#[test]
#[should_panic]
fn test_cancelled_quote_cannot_be_accepted() {
    let (_env, client, _admin, hedger, maker, usdc) = setup_env();

    let usd = Symbol::new(&_env, "USD");
    let mxn = Symbol::new(&_env, "MXN");

    let req_id = client.post_request(
        &hedger, &usd, &mxn, &Direction::SellBase,
        &1_000_000_0000000_i128, &90_u32, &usdc,
    );
    let q_id = client.submit_quote(&maker, &req_id, &0_i128, &0_u64);
    client.cancel_quote(&maker, &req_id, &q_id);

    // This should panic — quote is cancelled
    client.accept_quote(&hedger, &req_id, &q_id);
}

#[test]
fn test_forward_computation_via_contract() {
    let (_env, client, _admin, _hedger, _maker, _usdc) = setup_env();

    let forward = client.compute_forward(
        &200_000_000_i128, &400_000_i128, &1_000_000_i128, &90_u32,
    );

    let expected = 202_970_297_i128;
    let diff = (forward - expected).abs();
    assert!(diff < 100_000, "Forward: {forward}, expected ~{expected}");
}

#[test]
fn test_insurance_fund_fed_by_open_fee() {
    let (_env, client, _admin, hedger, maker, usdc) = setup_env();

    let usd = Symbol::new(&_env, "USD");
    let mxn = Symbol::new(&_env, "MXN");

    let ins_before = client.get_insurance_balance();

    let req_id = client.post_request(
        &hedger, &usd, &mxn, &Direction::SellBase,
        &1_000_000_0000000_i128, &90_u32, &usdc,
    );
    let q_id = client.submit_quote(&maker, &req_id, &0_i128, &0_u64);
    client.accept_quote(&hedger, &req_id, &q_id);

    let ins_after = client.get_insurance_balance();

    // Open fee = 2 bps of 100,000 = 20 USDC = 200_0000000
    let expected_fee = 200_0000000_i128;
    assert_eq!(ins_after - ins_before, expected_fee);
}

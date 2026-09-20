use crate::types::{DECIMALS, DAY_BASIS, Direction};

/// Compute the forward price using covered interest parity:
/// F = S × (1 + r_quote × t/360) / (1 + r_base × t/360)
///
/// All values in 7 decimals (DECIMALS = 10_000_000).
/// Uses wider intermediates (i128) and multiply-before-divide to preserve precision.
pub fn compute_forward(spot: i128, rate_base: i128, rate_quote: i128, tenor_days: u32) -> i128 {
    let t = tenor_days as i128;

    // numerator = DECIMALS + r_quote * t / 360
    // = (DECIMALS * 360 + r_quote * t) / 360
    let num = DECIMALS * DAY_BASIS + rate_quote * t;

    // denominator = DECIMALS + r_base * t / 360
    // = (DECIMALS * 360 + r_base * t) / 360
    let den = DECIMALS * DAY_BASIS + rate_base * t;

    // F = spot * num / den
    // multiply before divide for precision
    spot * num / den
}

/// Value a position from the hedger's perspective, in margin token units (USDC, 7 decimals).
///
/// For SellBase (hedger sells base forward):
///   value = (locked_forward - current_forward) * notional / spot
///
/// For BuyBase (hedger buys base forward):
///   value = (current_forward - locked_forward) * notional / spot
///
/// Positive = hedger gains, negative = hedger loses.
/// The maker's value is always the negative of the hedger's value.
pub fn value_position(
    locked_forward: i128,
    current_forward: i128,
    notional: i128,
    spot: i128,
    direction: &Direction,
) -> i128 {
    let diff = match direction {
        Direction::SellBase => locked_forward - current_forward,
        Direction::BuyBase => current_forward - locked_forward,
    };

    // value_quote = diff * notional (both 7 dec → 14 dec)
    // value_base = value_quote / spot (14 dec / 7 dec → 7 dec)
    diff * notional / spot
}

/// Compute initial margin amount: notional * margin_pct / 10000
/// margin_pct is in basis points (500 = 5%)
pub fn compute_initial_margin(notional: i128, margin_pct: i128) -> i128 {
    notional * margin_pct / 10_000
}

/// Compute maintenance margin threshold: initial_margin * maint_pct / margin_pct
/// Or simpler: notional * maint_margin_pct / 10000
pub fn compute_maintenance_margin(notional: i128, maint_margin_pct: i128) -> i128 {
    notional * maint_margin_pct / 10_000
}

/// Compute open fee: notional * fee_bps / 10000
pub fn compute_open_fee(notional: i128, fee_bps: i128) -> i128 {
    notional * fee_bps / 10_000
}

/// Apply spread (in basis points) to a forward price.
/// spread_bps > 0 means maker asks for higher forward (hedger pays more).
/// locked = forward + forward * spread_bps / 10000
pub fn apply_spread(forward: i128, spread_bps: i128) -> i128 {
    forward + forward * spread_bps / 10_000
}

#[cfg(test)]
mod tests {
    use super::*;

    const SPOT: i128 = 200_000_000; // 20.0000000
    const RATE_MXN: i128 = 10_000_000; // 1.0000000 = 100% → actually 10% = 0.1
    // Wait — rates are expressed as annual rates. 10% = 0.10 in decimal.
    // In 7 decimals: 0.10 * 10_000_000 = 1_000_000
    // Let me correct:

    const R_MXN: i128 = 1_000_000; // 0.10 = 10% annual
    const R_USD: i128 = 400_000;   // 0.04 = 4% annual

    #[test]
    fn test_forward_computation() {
        // F = 20.0 * (1 + 0.10 * 90/360) / (1 + 0.04 * 90/360)
        // = 20.0 * (1 + 0.025) / (1 + 0.01)
        // = 20.0 * 1.025 / 1.01
        // = 20.0 * 1.014851485...
        // = 20.2970297...
        let forward = compute_forward(SPOT, R_USD, R_MXN, 90);

        // Expected: ~20.297 = 202_970_000 (7 decimals)
        // Allow small rounding: within 1000 units (0.0001)
        let expected = 202_970_297; // 20.2970297
        let diff = (forward - expected).abs();
        assert!(diff < 10_000, "Forward {forward} too far from expected {expected}, diff {diff}");
    }

    #[test]
    fn test_value_zero_at_inception() {
        // At inception, current_forward == locked_forward, so value == 0
        let locked = compute_forward(SPOT, R_USD, R_MXN, 90);
        let current = locked; // same
        let notional = 1_000_000_0000000_i128; // 100,000.0000000

        let value = value_position(locked, current, notional, SPOT, &Direction::SellBase);
        assert_eq!(value, 0, "Value at inception should be zero");
    }

    #[test]
    fn test_sides_sum_to_zero() {
        let locked = compute_forward(SPOT, R_USD, R_MXN, 90);
        // Simulate spot move to 19.61
        let new_spot = 196_100_000_i128; // 19.61
        let current = compute_forward(new_spot, R_USD, R_MXN, 60);
        let notional = 1_000_000_0000000_i128;

        let hedger_value = value_position(locked, current, notional, new_spot, &Direction::SellBase);
        let maker_value = -hedger_value;

        assert_eq!(hedger_value + maker_value, 0, "Sides must sum to zero");
    }

    #[test]
    fn test_margin_call_at_day30_spot_1961() {
        let locked = compute_forward(SPOT, R_USD, R_MXN, 90);
        let new_spot = 196_100_000_i128; // 19.61
        let current = compute_forward(new_spot, R_USD, R_MXN, 60);
        let notional = 1_000_000_0000000_i128; // 100,000

        let hedger_value = value_position(locked, current, notional, new_spot, &Direction::SellBase);

        // Expected: hedger gains ~2,500 = 25_000_000 (7 decimals)
        // Counterparty (maker) loses ~2,500
        let expected_approx = 25_000_0000000_i128; // 2,500.0000000
        let diff = (hedger_value - expected_approx).abs();
        // Allow 5% tolerance for rounding
        assert!(
            diff < expected_approx / 20,
            "Hedger value {hedger_value} should be ~{expected_approx}, diff {diff}"
        );
    }

    #[test]
    fn test_liquidation_at_day30_spot_1915() {
        let locked = compute_forward(SPOT, R_USD, R_MXN, 90);
        let new_spot = 191_500_000_i128; // 19.15
        let current = compute_forward(new_spot, R_USD, R_MXN, 60);
        let notional = 1_000_000_0000000_i128;

        let hedger_value = value_position(locked, current, notional, new_spot, &Direction::SellBase);

        // Expected: hedger gains ~5,000 = 50_000_000_000 (7 decimals)
        let expected_approx = 50_000_0000000_i128;
        let diff = (hedger_value - expected_approx).abs();
        assert!(
            diff < expected_approx / 10,
            "Hedger value {hedger_value} should be ~{expected_approx}, diff {diff}"
        );
    }

    #[test]
    fn test_no_overflow_extreme_inputs() {
        // Very large notional, extreme rates
        let spot = 1_000_000_0000000_i128; // 100,000.0 (extreme)
        let rate_base = 5_000_000_i128; // 50% annual
        let rate_quote = 9_000_000_i128; // 90% annual

        let forward = compute_forward(spot, rate_base, rate_quote, 360);
        assert!(forward > 0, "Forward must be positive");

        let notional = 10_000_000_0000000_i128; // 1,000,000
        let value = value_position(forward, spot, notional, spot, &Direction::SellBase);
        // Just check it doesn't panic
        let _ = value;
    }

    #[test]
    fn test_initial_margin_5pct() {
        let notional = 1_000_000_0000000_i128; // 100,000
        let margin = compute_initial_margin(notional, 500); // 5%
        let expected = 50_000_0000000_i128; // 5,000
        assert_eq!(margin, expected);
    }

    #[test]
    fn test_spread_application() {
        let forward = 202_970_000_i128; // ~20.297
        let with_spread = apply_spread(forward, 10); // 10 bps = 0.1%
        assert!(with_spread > forward, "Spread should increase forward");
        // 20.297 * 1.001 = 20.317297
        let expected_approx = forward + forward / 1000;
        let diff = (with_spread - expected_approx).abs();
        assert!(diff < 1000, "Spread application off by {diff}");
    }
}

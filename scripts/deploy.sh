#!/bin/bash
set -e

echo "=== Parity Testnet Deployment ==="

# Build contract
echo "Building contract..."
stellar contract build

WASM_PATH="target/wasm32v1-none/release/parity.wasm"

# Generate deployer identity if not exists
if ! stellar keys address deployer 2>/dev/null; then
    echo "Generating deployer identity..."
    stellar keys generate deployer --network testnet --fund
    echo "Deployer funded on testnet"
fi

DEPLOYER=$(stellar keys address deployer)
echo "Deployer: $DEPLOYER"

# Deploy contract
echo "Deploying contract to testnet..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm "$WASM_PATH" \
    --source deployer \
    --network testnet)

echo "Contract deployed: $CONTRACT_ID"

# Initialize contract
echo "Initializing contract..."
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source deployer \
    --network testnet \
    -- initialize \
    --admin "$DEPLOYER" \
    --margin_pct 500 \
    --maint_margin_pct 250 \
    --open_fee_bps 2 \
    --partial_liq_pct 3000

echo "Contract initialized!"

# Set rates
echo "Setting rates..."
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source deployer \
    --network testnet \
    -- set_rate \
    --admin "$DEPLOYER" \
    --currency USD \
    --rate 400000

stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source deployer \
    --network testnet \
    -- set_rate \
    --admin "$DEPLOYER" \
    --currency MXN \
    --rate 1000000

stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source deployer \
    --network testnet \
    -- set_rate \
    --admin "$DEPLOYER" \
    --currency TRY \
    --rate 4500000

echo "Rates set: USD=4%, MXN=10%, TRY=45%"

# Set spot price (MXN/USD = 20.0)
echo "Setting spot price..."
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source deployer \
    --network testnet \
    -- set_spot_price \
    --admin "$DEPLOYER" \
    --price 200000000

echo "Spot price set: 20.0 MXN/USD"

echo ""
echo "=== Deployment Complete ==="
echo "Contract ID: $CONTRACT_ID"
echo "Network: testnet"
echo "Admin: $DEPLOYER"
echo ""
echo "Save this contract ID in frontend/.env.local:"
echo "NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID"
echo "NEXT_PUBLIC_NETWORK=testnet"

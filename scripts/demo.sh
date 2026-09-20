#!/bin/bash
# Parity Demo Script — runs the 5-step demo sequence
# Usage: ./scripts/demo.sh <CONTRACT_ID>

set -e

CONTRACT_ID="${1:?Usage: ./scripts/demo.sh <CONTRACT_ID>}"
SOURCE="deployer"
NET="testnet"

invoke() {
    stellar contract invoke --id "$CONTRACT_ID" --source "$SOURCE" --network "$NET" -- "$@"
}

ADMIN=$(stellar keys address "$SOURCE")

echo "=== Parity Demo ==="
echo "Contract: $CONTRACT_ID"
echo "Admin: $ADMIN"
echo ""

# Step 0: Setup — add eligible addresses and set initial state
echo "Step 0: Setting up demo state..."
invoke set_spot_price --admin "$ADMIN" --price 200000000
invoke set_rate --admin "$ADMIN" --currency USD --rate 400000
invoke set_rate --admin "$ADMIN" --currency MXN --rate 1000000
echo "  Spot: 20.00 MXN/USD, USD rate: 4%, MXN rate: 10%"

echo ""
echo "Step 1: Post request, maker quotes, hedger accepts"
echo "  → Forward should compute to ~20.297"
echo "  → Both sides post 5,000 USDC margin"
echo "  (Use the frontend for this step)"

echo ""
read -p "Press Enter after Step 1 is done in the frontend..."

echo ""
echo "Step 2: Jump to day 30, push spot to 19.61"
# Get position open time and add 30 days
DEMO_TIME=$(($(date +%s) + 2592000))  # ~30 days from now
invoke set_time --admin "$ADMIN" --timestamp "$DEMO_TIME"
invoke set_spot_price --admin "$ADMIN" --price 196100000
echo "  → Counterparty margin call should fire on screen"
echo "  (Mark position in the frontend)"

echo ""
read -p "Press Enter to continue to Step 3..."

echo ""
echo "Step 3: Push spot to 19.15"
invoke set_spot_price --admin "$ADMIN" --price 191500000
echo "  → Partial liquidation (30%) should execute"
echo "  → Insurance fund untouched"
echo "  (Liquidate in the frontend)"

echo ""
read -p "Press Enter to continue to Step 4..."

echo ""
echo "Step 4: Gap to 18.50 (bad debt scenario)"
invoke set_spot_price --admin "$ADMIN" --price 185000000
echo "  → Bad debt appears"
echo "  → Waterfall: margin → insurance fund → winner haircut"
echo "  → Accounting still balances"
echo "  (Liquidate again in the frontend)"

echo ""
read -p "Press Enter to continue to Step 5..."

echo ""
echo "Step 5: Reset, jump to day 90, settle"
invoke set_spot_price --admin "$ADMIN" --price 200000000
MATURITY_TIME=$(($(date +%s) + 7776000))  # ~90 days from now
invoke set_time --admin "$ADMIN" --timestamp "$MATURITY_TIME"
echo "  → Settle the position in the frontend"

echo ""
echo "=== Demo Complete ==="

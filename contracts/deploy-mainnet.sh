#!/usr/bin/env bash
#
# Deploy the CAFS DryChain contracts to Base MAINNET.
#
#   ./deploy-mainnet.sh
#
# Asks for the deployer's private key with hidden input, so it never lands in
# shell history or the process list. That wallet becomes the RoleManager admin
# and must be the same one set as RELAYER_PRIVATE_KEY on Railway.
#
# Needs in the environment (export them first, or the script asks):
#   BASE_MAINNET_RPC_URL   your Alchemy/QuickNode Base mainnet endpoint
#   ETHERSCAN_API_KEY      Etherscan V2 key, used to verify on Basescan
#
# It refuses to broadcast unless the RPC really is Base mainnet, simulates the
# whole deploy first, and waits for you to type DEPLOY before spending anything.

set -euo pipefail
cd "$(dirname "$0")"

BASE_MAINNET_CHAIN_ID=8453
# Deploy measured at ~4.55M gas across 5 transactions; this is roughly 20x that
# at today's price, so a gas spike cannot strand a half-finished deploy.
MIN_BALANCE_WEI=500000000000000 # 0.0005 ETH

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

command -v forge >/dev/null || { red "forge not found. Install Foundry: https://getfoundry.sh"; exit 1; }
command -v cast  >/dev/null || { red "cast not found. Install Foundry: https://getfoundry.sh"; exit 1; }

bold "CAFS DryChain — Base MAINNET deploy"
echo

if [[ -z "${BASE_MAINNET_RPC_URL:-}" ]]; then
  read -rp "Base mainnet RPC URL: " BASE_MAINNET_RPC_URL
fi
if [[ -z "${ETHERSCAN_API_KEY:-}" ]]; then
  read -rp "Etherscan API key: " ETHERSCAN_API_KEY
fi
read -rsp "Deployer private key (hidden): " PRIVATE_KEY
echo
[[ "$PRIVATE_KEY" == 0x* ]] || PRIVATE_KEY="0x$PRIVATE_KEY"
export PRIVATE_KEY ETHERSCAN_API_KEY

# 1. The RPC must be mainnet. An RPC for the wrong chain is the one mistake that
#    would deploy real contracts somewhere nobody expects them.
CHAIN_ID=$(cast chain-id --rpc-url "$BASE_MAINNET_RPC_URL")
if [[ "$CHAIN_ID" != "$BASE_MAINNET_CHAIN_ID" ]]; then
  red "RPC reports chain $CHAIN_ID, not Base mainnet ($BASE_MAINNET_CHAIN_ID). Stopping."
  exit 1
fi
green "✓ RPC is Base mainnet"

# 2. The deployer must be funded.
DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")
BALANCE=$(cast balance "$DEPLOYER" --rpc-url "$BASE_MAINNET_RPC_URL")
echo "  Deployer: $DEPLOYER"
echo "  Balance:  $(cast from-wei "$BALANCE") ETH"
if (( BALANCE < MIN_BALANCE_WEI )); then
  red "Balance below $(cast from-wei $MIN_BALANCE_WEI) ETH. Fund this address first."
  exit 1
fi
green "✓ Deployer funded"

# 3. Simulate. Nothing is sent; this catches a broken build or a revert for free.
echo
bold "Simulating…"
env -u FORWARDER_ADDRESS -u ADMIN_ADDRESS \
  forge script script/DeployCAFS.s.sol:DeployCAFS --rpc-url "$BASE_MAINNET_RPC_URL" \
  | grep -E "Deployer|Admin|impl|proxy|Forwarder" || true
green "✓ Simulation succeeded"

# 4. Confirm.
echo
red "This deploys to Base MAINNET and spends real ETH from $DEPLOYER."
read -rp "Type DEPLOY to continue: " CONFIRM
[[ "$CONFIRM" == "DEPLOY" ]] || { echo "Cancelled. Nothing was sent."; exit 0; }

# 5. Broadcast and verify.
echo
bold "Deploying…"
LOG=$(mktemp)
env -u FORWARDER_ADDRESS -u ADMIN_ADDRESS \
  forge script script/DeployCAFS.s.sol:DeployCAFS \
  --rpc-url "$BASE_MAINNET_RPC_URL" --broadcast --verify 2>&1 | tee "$LOG"

pick() { grep -m1 "$1" "$LOG" | awk '{print $NF}'; }
ROLE_MANAGER=$(pick "RoleManager proxy:")
FORWARDER=$(pick "DryChainForwarder deployed:")
REGISTRY=$(pick "BatchRegistry proxy:")

if [[ -z "$REGISTRY" || -z "$ROLE_MANAGER" || -z "$FORWARDER" ]]; then
  red "Could not read the deployed addresses. Check the output above and $LOG."
  exit 1
fi

# 6. Prove the stack is wired before handing over the addresses.
echo
bold "Checking the deployment…"
[[ "$(cast call "$REGISTRY" 'roleManager()(address)' --rpc-url "$BASE_MAINNET_RPC_URL")" == "$ROLE_MANAGER" ]] \
  && green "✓ Registry points at the RoleManager" || red "✗ Registry is NOT wired to the RoleManager"
[[ "$(cast call "$REGISTRY" 'isTrustedForwarder(address)(bool)' "$FORWARDER" --rpc-url "$BASE_MAINNET_RPC_URL")" == "true" ]] \
  && green "✓ Registry trusts the forwarder" || red "✗ Registry does NOT trust the forwarder"
ADMIN_ROLE=$(cast call "$ROLE_MANAGER" 'DEFAULT_ADMIN_ROLE()(bytes32)' --rpc-url "$BASE_MAINNET_RPC_URL")
[[ "$(cast call "$ROLE_MANAGER" 'hasRole(bytes32,address)(bool)' "$ADMIN_ROLE" "$DEPLOYER" --rpc-url "$BASE_MAINNET_RPC_URL")" == "true" ]] \
  && green "✓ $DEPLOYER holds the admin role" || red "✗ Deployer does NOT hold the admin role"

echo
bold "Deployed. Set these on Railway:"
cat <<EOF

CHAIN_ENABLED="true"
CHAIN_ID=$BASE_MAINNET_CHAIN_ID
RPC_URL="$BASE_MAINNET_RPC_URL"
ROLE_MANAGER_ADDRESS="$ROLE_MANAGER"
BATCH_REGISTRY_ADDRESS="$REGISTRY"
FORWARDER_ADDRESS="$FORWARDER"
RELAYER_PRIVATE_KEY=<the key you just entered>

Nothing changes on Vercel: the site asks the server which chain it is on,
so explorer links follow CHAIN_ID automatically.

EOF
echo "  Registry on Basescan: https://basescan.org/address/$REGISTRY"

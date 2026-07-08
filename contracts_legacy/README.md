# CAFS DryChain — Smart Contracts

Upgradeable (UUPS) traceability contracts for the CAFS DryChain supply chain,
built with **Foundry** and **OpenZeppelin Upgradeable** for **Base** (EVM).

## Contracts

| Contract | Purpose |
| --- | --- |
| `RoleManager` | UUPS-upgradeable access-control authority. Admin provisions operator wallets by granting `FIELD_OFFICER_ROLE`, `DRYER_OPERATOR_ROLE`, or `LOGISTICS_ROLE`. |
| `BatchRegistry` | UUPS-upgradeable, pausable traceability ledger. Records the batch lifecycle (register → drying → storage/logistics → delivered). ERC-2771 so a derived operator wallet is the tx origin while a master wallet pays gas. |
| `DryChainForwarder` | Self-hosted ERC-2771 trusted forwarder for gas sponsorship (optional — skip if you use Biconomy/Gelato). |

Both upgradeable contracts sit behind `ERC1967Proxy`. Upgrades are gated by the
RoleManager's `DEFAULT_ADMIN_ROLE` / `UPGRADER_ROLE`.

### Security properties
- **RBAC** — every write is gated by an on-chain role; wallets can only write after the admin authorises them.
- **Gas sponsorship without custody** — operators never hold gas or a seed phrase; keys are re-derived on demand off-chain and sign meta-txs (ERC-2771).
- **Tamper-evidence** — `metadataHash` lets anyone re-hash the off-chain record and prove it was not altered (`verifyMetadata`).
- **Validated transitions** — drying and logistics state changes are validated; no arbitrary jumps.
- **Pausable** — admin can halt writes during an incident.
- **Upgrade safety** — `_disableInitializers()` in constructors, storage `__gap`s, `_authorizeUpgrade` behind the admin role.

## Setup

```bash
# 1. Install Foundry (if needed): https://book.getfoundry.sh/getting-started/installation
# 2. Install dependencies
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0
forge install OpenZeppelin/openzeppelin-contracts-upgradeable@v5.1.0

# 3. Build & test
forge build
forge test -vvv
```

Remappings are in `remappings.txt` (already configured for the paths above).

## Deploy

```bash
cp .env.example .env   # fill in PRIVATE_KEY, RPC_URL, etc.
source .env

forge script script/DeployCAFS.s.sol:DeployCAFS \
  --rpc-url $RPC_URL --broadcast --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

The script prints `ROLE_MANAGER_ADDRESS`, `BATCH_REGISTRY_ADDRESS`, and
`FORWARDER_ADDRESS` — copy them back into `.env` (and the backend's env).

## Provision an operator (each time the admin adds one)

```bash
GRANTEE=0xOperatorWallet ROLE=DRYER_OPERATOR \
forge script script/GrantRole.s.sol:GrantRole --rpc-url $RPC_URL --broadcast
```

## Upgrade

```bash
forge script script/UpgradeBatchRegistry.s.sol:UpgradeBatchRegistry \
  --rpc-url $RPC_URL --broadcast
```

The broadcaster must hold `DEFAULT_ADMIN_ROLE`. Storage layout is preserved via
`__gap`; run a storage-layout diff before any mainnet upgrade.

## Role ↔ backend mapping

The backend maps app actions to on-chain roles:
- Operator **registering** produce → `FIELD_OFFICER_ROLE`
- Operator **drying** updates → `DRYER_OPERATOR_ROLE`
- Operator **storage / distribution** → `LOGISTICS_ROLE`

A single operator wallet is typically granted all three at its hub.

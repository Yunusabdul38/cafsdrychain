# CAFS Drychain Smart Contracts ☀️🥭

This directory contains the smart contract logic for the CAFS Drychain Traceability Platform, built using **Foundry**. 

The smart contracts serve as the immutable source of truth for tracing agricultural produce (like Sun-dried Mangoes, Tomatoes, etc.) through the solar drying process, ensuring transparency, tamper-proof weight tracking, and secure meta-transactions on the Base blockchain.

---

## 🏗 Architecture Overview

We utilize a highly scalable, production-grade architecture leveraging **OpenZeppelin v5**:
1. **UUPS Upgradability:** All contracts are deployed behind an `ERC1967Proxy`. This allows the logic to be upgraded in the future without losing any historical batch data or changing the contract addresses.
2. **Pausability:** Contracts can be paused in an emergency, freezing all state-changing actions.
3. **Meta-Transactions (EIP-2771):** The contracts support gas sponsorship. Operators sign transactions locally on the frontend, and the Backend/Master Wallet submits them to the blockchain and pays the gas fees.

### On-Chain vs. Off-Chain Data Strategy
To ensure gas efficiency:
- **Stored On-Chain:** `batchId`, `currentFacilityId`, `freshWeight`, `currentWeight`, `BatchState` (timeline stages), operator addresses, and timestamps.
- **Stored Off-Chain:** Heavy metadata (farmer details, moisture percentages, logistics routes) are stored in the backend database.
- **The Bridge:** Every batch stores a `metadataHash` on-chain. The UI pulls the off-chain JSON data, hashes it, and compares it to the on-chain hash to mathematically prove the off-chain data has not been tampered with.

---

## 📜 Core Contracts

### 1. `RoleManagerUpgradeable.sol`
Manages the Role-Based Access Control (RBAC). Instead of hardcoding roles into the Batch Registry, this dedicated contract allows roles to be managed securely and shared across future contracts.
- **DEFAULT_ADMIN_ROLE:** Can upgrade contracts, pause the system, and grant/revoke other roles.
- **FIELD_OFFICER_ROLE:** Authorized to register new raw batches from farmers.
- **DRYER_OPERATOR_ROLE:** Authorized to update drying sessions and weights.
- **LOGISTICS_ROLE:** Authorized to update storage and delivery statuses.

### 2. `BatchRegistryUpgradeable.sol`
The core state machine of the traceability platform. Tracks batches through the following `BatchState` enum:
`Registered` ➔ `DryingStarted` ➔ `DryingCompleted` ➔ `InStorage` ➔ `InTransit` ➔ `Delivered`

*Note: All state-changing functions are restricted by roles and require the contract to not be paused.*

---

## 💻 Developer Setup & Usage

### Prerequisites
Make sure you have [Foundry](https://getfoundry.sh/) installed.

### 1. Installation
Clone the repository and install the OpenZeppelin Upgradeable library dependencies:
```bash
forge install OpenZeppelin/openzeppelin-contracts-upgradeable
```

### 2. Build
Compile the smart contracts:
```bash
forge build
```

### 3. Testing
Run the comprehensive test suite (which includes tests for the EIP-2771 Forwarder gas sponsorship flow and UUPS Proxy deployments):
```bash
forge test
```
*(Tip: Add `-vvvv` for maximum verbosity/stack traces).*

### 4. Deployment (Base Sepolia / Mainnet)
1. Copy `.env.example` to `.env`.
2. Fill in your `PRIVATE_KEY`, `RPC_URL`, and optionally your `FORWARDER_ADDRESS` (for Biconomy/Gelato).
3. Execute the deployment script:
```bash
forge script script/DeployCAFS.s.sol --rpc-url $RPC_URL --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

---

## 🔍 Data Getters & Pagination
The `BatchRegistry` provides several highly optimized view functions for your backend and frontend to query:
- `getBatch(batchId)`: Retrieve the full state and weights of a specific batch.
- `getBatchState(batchId)`: Quickly check the current stage.
- `getTotalBatches()`: Returns the integer count of all tracked batches.
- `getAllBatchIds()`: Returns a `string[]` of every batch tracked.
- `getBatchesPaginated(offset, limit)`: The recommended way to retrieve large amounts of batch data without exceeding RPC payload limits.

---

## 🌐 Live Deployments (Base Sepolia)
The CAFS Drychain platform is successfully deployed on the **Base Sepolia Testnet**!

- **RoleManager Proxy Address:** `0x9edB596e8E4D35633262fb926BAf9066Aed9436c`
- **BatchRegistry Proxy Address:** `0xFEb0c5D37031bA7327C4fCf155c3E0F8199B1D2b`
- **Deployment Transaction Hash:** `0xeaec954b5d6d9e44d7ed565c9b843a276d519b8bc3a76f43951253a868e55490`

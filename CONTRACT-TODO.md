# Pending contract changes

The UI and off-chain data model have moved ahead of the deployed contracts. This
file tracks every divergence, so the on-chain side can be brought back in line in
one deliberate pass instead of being reconstructed from memory.

Deployed (Base Sepolia):

| Contract | Address |
| --- | --- |
| BatchRegistry | `0x507C0F93437f7d8c78fcaFA73f472DF944A5F57b` |
| RoleManager | `0xeabc02…` |
| DryChainForwarder | `0x9834f9…` |

`BatchRegistry` is UUPS-upgradeable — see `contracts/script/UpgradeBatchRegistry.s.sol`.
The relayer wallet `0x486E22Ec9CDba5Ed7D082592F8C033e5f52C69C6` sponsors all gas.

---

## 1. The payment stage is entirely off chain

**Status:** DECIDED — payment stays off chain. Fees are commercial terms, not
provenance, and a public ledger is the wrong place for them. Revisit only if a
regulator asks for it.

`AWAITING_PAYMENT` exists in Postgres but has no on-chain counterpart, and
nothing about the fee is recorded on chain — not the amount, the reference, nor
whether it was waived.

To put it on chain, `BatchRegistry` needs either a `recordPayment` function or a
new `BatchState`, plus an event, which means an upgrade. Decide first whether a
public traceability record *should* expose commercial terms.

If payment facts move into the hashed metadata, that changes `hashBatch()` in
`server/src/services/batchService.ts` and therefore every future `metadataHash`.

## 2. Event args are not indexed

**Status:** DONE — every event now carries `bytes32 indexed batchIdKey`
(the keccak of the batch id) *alongside* the readable `string batchId`, so logs
can be filtered per product without losing legibility. `batchKey(string)` is
exposed as a pure view so clients can build the filter.

Still unverified: whether Basescan's UI honours a topic filter in a shareable
URL. The indexed arg is the prerequisite either way, and costs nothing.

The forward-only caveat that used to sit here is moot: mainnet starts with no
prior logs, so every event carries the indexed key.

## Done in the mainnet cut-over

Everything below was deferred until the chain and database could be recreated
from scratch, and was cleared in one pass when they were.

**Retired enum members deleted.** `BatchState` is now
`Registered, DryingStarted, DryingCompleted, Delivered` with no gaps, so
`Delivered` moved from 5 to 3. `relayLogistics` was updated to match — the step
this file warned would break silently. It does not any more: the state argument
is typed to the single value it writes, so a mismatch is a compile error.
`test_StatePositionsMatchTheRelayer` pins the numbering.

**Dead columns dropped.** `Batch.supplier`, `.transport`, `.packaging`,
`.storageLocation`, `User.mustChangePassword` and `AppSettings.minimumFee` are
gone, and `entryDate` lost its `@map("deliveryDate")` so the column takes its
real name. `supplier` also left `hashBatch()`, which it could not do while
older hashes had to stay reproducible.

**Retired DB stages dropped.** `BatchStage` no longer carries `STORED` or
`IN_TRANSIT`, and the labels, badges, adapters and lifecycle entries that
existed only for them went with it.

**Migrations replaced `db push`.** `prisma/migrations/0_init` is a single
baseline generated from the cleaned schema, and Railway now runs
`prisma migrate deploy`. Schema changes are versioned from here rather than
inferred, and a destructive change no longer silently fails a deploy.

**Explorer URLs centralised.** The server derives the explorer from `CHAIN_ID`
and serves it at `/api/config`; `client/lib/explorer.ts` builds links from that,
so they can never point at a different chain from the records. They were written out
at four call sites, all pinned to Sepolia.

## What the hardening upgrade added (2026-09-03)

Applied to `BatchRegistry` and `RoleManager`, ready to ship via
`script/UpgradeBatchRegistry.s.sol`. No storage was added, so the upgrade needs
no re-initialiser.

**Lifecycle is now enforced on chain.** Previously any role holder could write
any stage at any time: a batch could be delivered without ever being dried,
dried twice, or revived after delivery. The backend enforced order, but the
backend can be bypassed by anyone holding an operator key. `_assertTransition`
now permits only the forward path.

**Input validation.** Empty batch ids, empty metadata hashes and zero weights
are rejected rather than written.

**Weight integrity.** Drying cannot increase a batch's weight. The same rule is
mirrored in `batchService.advanceBatch`, so the UI reports it rather than saving
off chain and failing at relay time.

**Richer events.** Updates now emit the actor, the facility, the metadata hash
and a timestamp, so an auditor can reconstruct the record from logs alone.

**Admin lock-out closed.** `DEFAULT_ADMIN_ROLE` can no longer be renounced, and
an admin cannot revoke it from themselves — removing an admin requires a second
one. Losing the last admin would have frozen upgrades, pausing and operator
provisioning permanently.

**Upgrade script fixed.** It deployed the test mock `BatchRegistryV2` onto the
live proxy. It now deploys `BatchRegistry`, asserts the forwarder matches and
the broadcaster holds admin, and verifies state survived.

---

## Deployment log

### Base Sepolia (testnet, retired at the mainnet cut-over)

| Date | Implementation | What changed |
| --- | --- | --- |
| 2026-09-03 | `0x5b33B2f2379F357d014869F23f32A36354e06CB0` | Lifecycle enforcement, input validation, weight guard, indexed events, admin lock-out. `InTransit` retired. |
| 2026-09-09 | `0x9BDf6252AaFA88CCa7D010e08673a76F27E6582d` | `InStorage` retired: `DryingCompleted → Delivered` is now the only path to delivery, with a legacy escape for batches sitting at storage or dispatch. |

The proxy was unchanged throughout and all 17 batches survived both upgrades.
Both implementations are verified — always pass `--verify`, or the explorer
renders this contract's event logs as raw hex.

### Base Sepolia (fresh stack, 2026-09-29)

Redeployed from scratch to rehearse the mainnet cut-over: no upgrade, no
carried-over state, and the retired enum members finally gone.

| Contract | Address |
| --- | --- |
| BatchRegistry (proxy) | `0xBaFE3734ABAABb84AaF2D949d8EcFb3f4774dAD4` |
| BatchRegistry (impl) | `0x3D8715bd77d5F83804431708889FEee355b7F0A1` |
| RoleManager (proxy) | `0x592a5e38962Ff54046Fd241C65FD03f44897B03b` |
| RoleManager (impl) | `0x4AD83678E2648a29fFE5602827706C205c79B4A0` |
| DryChainForwarder | `0xA0E37021dF0322C2b9D0ab06a71116C33FEC8273` |

`Delivered` is position 3 here, verified on chain: `canTransition(…, 3)` answers
and `4` reverts as out of range. The older Sepolia proxy above is abandoned, not
upgraded — its batches stay readable at their own address.

### Base mainnet

Deployed fresh, with no upgrade history to preserve. Record the addresses here
once `DeployCAFS` has run.

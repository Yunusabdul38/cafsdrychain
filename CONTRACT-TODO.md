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

## 1. Two retired stages must be deleted on the next fresh deploy

**Status:** DONE for the upgrade path. **OPEN for a fresh redeploy.**

Both dispatch and storage are gone from the product. The lifecycle is now
`Registered → DryingStarted → DryingCompleted → Delivered`, and
`updateLogistics` accepts nothing but `Delivered`.

The two enum members survive as `InStorage_Retired` (3) and `InTransit_Retired`
(4) **only because these were upgrades**. Enum values are stored as their
position, so deleting either would renumber `Delivered` from 5 and make every
batch already delivered on chain decode as something else. Keeping the slots is
the price of not breaking existing records.

### On the next fresh deploy, delete them properly

A brand new proxy starts with no batches, so there is no historical state to
protect and renumbering is harmless. At that point:

1. Delete both retired members from `BatchState`, leaving
   `Registered, DryingStarted, DryingCompleted, Delivered`.
2. Drop their branches from `_assertTransition` and `canTransition` — they exist
   only so a legacy batch stuck at storage or dispatch could still finish.
3. Update `relayLogistics` in `server/src/chain/relayer.ts`: its state argument
   is pinned to `5` for delivered. **`Delivered` becomes 3.** This is the step
   that breaks silently if forgotten.
4. Remove the tests pinning the retired slots
   (`test_RevertWhen_WritingRetiredInTransit`,
   `test_RevertWhen_WritingRetiredStorage`,
   `test_RetiredStageKeepsDeliveredAtPositionFive`, and the legacy-recovery
   transition tests).

Do **not** do any of this as an upgrade to the current proxy.

## 2. The payment stage is entirely off chain

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

## 3. Fields the hash covers have changed

**Status:** app-side only; no contract change needed, but worth knowing.

`hashBatch()` now includes `category` and `dryingMethod`. The hash is recomputed
and written on every stage advance, so old and new batches stay verifiable —
`verifyOnChain` compares the current stored hash against the chain, not a
historical one.

`supplier` is still in the hash formula but is no longer collected, so it hashes
as `null` for new batches. Left in deliberately: churning the formula is riskier
than one dead field.

## 4. Schema cleanup for the mainnet cut-over

**Status:** deferred on purpose. Everything here is dead weight the app no
longer reads, kept only because Railway deploys with `npx prisma db push`
(see `server/railway.json`), which refuses a destructive change and would fail
the deploy.

The plan is to do all of it in one pass when moving to mainnet, where the
database is recreated from scratch and migrations are re-run — so nothing below
needs a careful data migration, only deleting.

### Columns to drop

| Column | Why it is dead |
| --- | --- |
| `Batch.supplier` | no longer collected; still in the `hashBatch` formula, hashing as `null` |
| `Batch.transport` | no longer collected |
| `Batch.packaging` | no longer collected |
| `Batch.storageLocation` | the storage stage is retired; legacy rows hold values nothing reads |
| `User.mustChangePassword` | invitation links replaced the emailed-password flow |
| `AppSettings.minimumFee` | replaced by the per-hub `Location.feesEnabled` toggle |

### Rename

`Batch.entryDate` is mapped to the physical column `deliveryDate` via `@map`.
`db push` treats a rename as drop-plus-add, so the `@map` stays until the
cut-over. Drop the `@map` and let the column take its real name.

### Also at the cut-over

- Delete the retired `BatchState` enum members (section 1) — that is the same
  fresh-deploy pass.
- Switch the Railway start command off `db push` to `prisma migrate deploy`, so
  schema changes are versioned from then on rather than inferred.
- Re-check `hashBatch()`: dropping `supplier` changes the hash formula. Safe by
  itself — `verifyOnChain` compares the *stored* hash against the chain rather
  than recomputing — but it is the moment to make the formula match reality.

## 5. Event args are not indexed

**Status:** DONE — every event now carries `bytes32 indexed batchIdKey`
(the keccak of the batch id) *alongside* the readable `string batchId`, so logs
can be filtered per product without losing legibility. `batchKey(string)` is
exposed as a pure view so clients can build the filter.

Still unverified: whether Basescan's UI honours a topic filter in a shareable
URL. The indexed arg is the prerequisite either way, and costs nothing.

Note this is **forward-only**: logs written before the upgrade carry the old
event signature and cannot be re-emitted, so the two existing batches stay
unfilterable.

## 6. Explorer URL is hardcoded in three places

`https://sepolia.basescan.org` appears in `Timeline.tsx`, `ChainLedger.tsx` and
`RelayerWalletCard.tsx`. Pull into one constant before changing networks.


---

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

| Date | Implementation | What changed |
| --- | --- | --- |
| 2026-09-03 | `0x5b33B2f2379F357d014869F23f32A36354e06CB0` | Lifecycle enforcement, input validation, weight guard, indexed events, admin lock-out. `InTransit` retired. |
| 2026-09-09 | `0x9BDf6252AaFA88CCa7D010e08673a76F27E6582d` | `InStorage` retired: `DryingCompleted → Delivered` is now the only path to delivery, with a legacy escape for batches sitting at storage or dispatch. |

The proxy is unchanged throughout and all 17 batches survived both upgrades.
Both implementations are verified — always pass `--verify`, or the explorer
renders this contract's event logs as raw hex.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ERC2771ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {RoleManager} from "./RoleManager.sol";

/**
 * @title BatchRegistry
 * @notice UUPS-upgradeable, tamper-resistant traceability ledger.
 *
 * Gas sponsorship (ERC-2771): an operator's derived wallet signs a meta-tx; the
 * master/relayer wallet submits it through the trusted forwarder and pays gas.
 * `_msgSender()` therefore resolves to the operator wallet, keeping it as the
 * transaction's origin while it never needs to hold native tokens.
 *
 * Authorisation is delegated to {RoleManager}. Upgrades are gated by the
 * RoleManager's DEFAULT_ADMIN_ROLE.
 *
 * ## Integrity model
 *
 * A traceability record is only worth as much as the rules it enforces. This
 * contract is the last line: the backend also validates, but the backend can be
 * bypassed by anyone holding an operator key and talking to the chain directly.
 * So the invariants live here.
 *
 *  - Every batch follows one forward-only path: registered, drying, dried,
 *    delivered. A stage cannot be skipped, repeated, or walked backwards.
 *  - A batch cannot be dried before it exists, or delivered before it is
 *    dried.
 *  - Drying cannot increase a batch's weight, and no recorded weight may be
 *    zero.
 *  - Identifiers and metadata hashes cannot be empty.
 *
 * Payment is deliberately **not** recorded here. Fees are commercial terms, not
 * provenance, and a public ledger is the wrong place for them.
 *
 * @custom:security-contact support@cafsdrychain.com
 */
contract BatchRegistry is
    Initializable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ERC2771ContextUpgradeable
{
    // ---------------------------------------------------------------- storage --
    // WARNING: this contract sits behind a proxy. Never reorder, remove or
    // change the type of an existing variable. Append new ones immediately
    // above `__gap` and reduce the gap by the same number of slots.

    RoleManager public roleManager;

    enum BatchState {
        Registered, // 0
        DryingStarted, // 1
        DryingCompleted, // 2
        // 3 and 4 are retired stages. Their values must stay declared: enum
        // members are stored as their position, so deleting either would
        // renumber Delivered and make every batch already delivered on chain
        // decode as something else entirely.
        InStorage_Retired, // 3 — rejected on write, kept so old records decode
        InTransit_Retired, // 4 — rejected on write, kept so old records decode
        Delivered // 5
    }

    struct Batch {
        string batchId;
        address creator;
        uint256 createdAt;
        uint256 updatedAt;
        string metadataHash; // hash/CID of the full off-chain record
        BatchState state;
        string currentFacilityId;
        uint256 freshWeight;
        uint256 currentWeight;
    }

    mapping(string => Batch) public batches;
    uint256 public totalBatches;

    // ----------------------------------------------------------------- events --
    // `batchIdKey` is the keccak of the batch id, so logs can be filtered to a
    // single product; the readable `batchId` is kept alongside it because an
    // indexed dynamic type is stored as its hash and would otherwise be lost.

    event BatchRegistered(
        bytes32 indexed batchIdKey,
        string batchId,
        address indexed creator,
        string facilityId,
        uint256 freshWeight,
        string metadataHash,
        uint256 timestamp
    );

    event DryingUpdated(
        bytes32 indexed batchIdKey,
        string batchId,
        address indexed actor,
        string facilityId,
        BatchState state,
        uint256 currentWeight,
        string metadataHash,
        uint256 timestamp
    );

    event LogisticsUpdated(
        bytes32 indexed batchIdKey,
        string batchId,
        address indexed actor,
        string facilityId,
        BatchState state,
        string metadataHash,
        uint256 timestamp
    );

    // ----------------------------------------------------------------- errors --

    error Unauthorized();
    error BatchExists();
    error BatchMissing();
    error InvalidState();
    /// @dev The requested move is not legal from the batch's current stage.
    error InvalidTransition(BatchState from, BatchState to);
    error EmptyBatchId();
    error EmptyMetadata();
    error InvalidWeight();
    /// @dev Drying removes water; it cannot make a batch heavier.
    error WeightIncreased(uint256 freshWeight, uint256 currentWeight);
    error ZeroAddress();

    modifier onlyRole(bytes32 role) {
        if (!roleManager.hasRole(role, _msgSender())) revert Unauthorized();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder) ERC2771ContextUpgradeable(trustedForwarder) {
        if (trustedForwarder == address(0)) revert ZeroAddress();
        _disableInitializers();
    }

    function initialize(address _roleManager) external initializer {
        if (_roleManager == address(0)) revert ZeroAddress();
        __Pausable_init();
        roleManager = RoleManager(_roleManager);
    }

    // -------------------------------------------------------------- lifecycle --

    /**
     * @notice Open a record for produce taken in at a hub.
     * @dev The first and only entry point: every other call requires the batch
     *      to already exist, so a record cannot begin part-way through.
     */
    function registerBatch(
        string calldata batchId,
        string calldata facilityId,
        uint256 freshWeight,
        string calldata metadataHash
    ) external whenNotPaused onlyRole(roleManager.FIELD_OFFICER_ROLE()) {
        if (bytes(batchId).length == 0) revert EmptyBatchId();
        if (bytes(metadataHash).length == 0) revert EmptyMetadata();
        if (freshWeight == 0) revert InvalidWeight();
        if (batches[batchId].createdAt != 0) revert BatchExists();

        address actor = _msgSender();

        batches[batchId] = Batch({
            batchId: batchId,
            creator: actor,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            metadataHash: metadataHash,
            state: BatchState.Registered,
            currentFacilityId: facilityId,
            freshWeight: freshWeight,
            currentWeight: freshWeight
        });
        unchecked {
            ++totalBatches;
        }

        emit BatchRegistered(
            _key(batchId),
            batchId,
            actor,
            facilityId,
            freshWeight,
            metadataHash,
            block.timestamp
        );
    }

    /**
     * @notice Record the start or completion of drying.
     * @dev Completion cannot report a weight above the intake weight: drying
     *      removes moisture, so a heavier result is a mis-entry or a forgery.
     */
    function updateDryingSession(
        string calldata batchId,
        string calldata facilityId,
        BatchState newState,
        uint256 currentWeight,
        string calldata metadataHash
    ) external whenNotPaused onlyRole(roleManager.DRYER_OPERATOR_ROLE()) {
        if (bytes(metadataHash).length == 0) revert EmptyMetadata();

        Batch storage batch = _mustExist(batchId);

        if (newState != BatchState.DryingStarted && newState != BatchState.DryingCompleted) {
            revert InvalidState();
        }
        _assertTransition(batch.state, newState);

        if (currentWeight == 0) revert InvalidWeight();
        if (currentWeight > batch.freshWeight) {
            revert WeightIncreased(batch.freshWeight, currentWeight);
        }

        batch.state = newState;
        batch.currentFacilityId = facilityId;
        batch.currentWeight = currentWeight;
        batch.metadataHash = metadataHash;
        batch.updatedAt = block.timestamp;

        emit DryingUpdated(
            _key(batchId),
            batchId,
            _msgSender(),
            facilityId,
            newState,
            currentWeight,
            metadataHash,
            block.timestamp
        );
    }

    /**
     * @notice Record delivery.
     * @dev Storage and dispatch are both retired: a batch goes from dried
     *      straight to delivered. Writing either retired value is refused.
     */
    function updateLogistics(
        string calldata batchId,
        string calldata facilityId,
        BatchState newState,
        string calldata metadataHash
    ) external whenNotPaused onlyRole(roleManager.LOGISTICS_ROLE()) {
        if (bytes(metadataHash).length == 0) revert EmptyMetadata();

        Batch storage batch = _mustExist(batchId);

        if (newState != BatchState.Delivered) revert InvalidState();
        _assertTransition(batch.state, newState);

        batch.state = newState;
        batch.currentFacilityId = facilityId;
        batch.metadataHash = metadataHash;
        batch.updatedAt = block.timestamp;

        emit LogisticsUpdated(
            _key(batchId),
            batchId,
            _msgSender(),
            facilityId,
            newState,
            metadataHash,
            block.timestamp
        );
    }

    // ------------------------------------------------------------- transitions --

    /**
     * @dev The only legal moves. Anything else — repeating a stage, skipping
     *      drying, reviving a delivered batch — reverts.
     *
     *  Registered      → DryingStarted
     *  DryingStarted   → DryingCompleted
     *  DryingCompleted → Delivered
     *  Delivered       → (terminal)
     */
    function _assertTransition(BatchState from, BatchState to) private pure {
        bool ok;

        if (from == BatchState.Registered) {
            ok = to == BatchState.DryingStarted;
        } else if (from == BatchState.DryingStarted) {
            ok = to == BatchState.DryingCompleted;
        } else if (from == BatchState.DryingCompleted) {
            ok = to == BatchState.Delivered;
        } else if (
            from == BatchState.InStorage_Retired || from == BatchState.InTransit_Retired
        ) {
            // No batch can enter these stages any more, but one recorded before
            // they were retired must still be completable rather than stranded.
            ok = to == BatchState.Delivered;
        }
        // Delivered is terminal: `ok` stays false.

        if (!ok) revert InvalidTransition(from, to);
    }

    function _mustExist(string calldata batchId) private view returns (Batch storage batch) {
        batch = batches[batchId];
        if (batch.createdAt == 0) revert BatchMissing();
    }

    /// @dev Indexed log key for a batch id. Public so clients can build filters.
    function batchKey(string calldata batchId) external pure returns (bytes32) {
        return keccak256(bytes(batchId));
    }

    function _key(string calldata batchId) private pure returns (bytes32) {
        return keccak256(bytes(batchId));
    }

    // ------------------------------------------------------------------ views --

    function getBatch(string calldata batchId) external view returns (Batch memory) {
        return batches[batchId];
    }

    function getBatchState(string calldata batchId) external view returns (BatchState) {
        return batches[batchId].state;
    }

    function getBatchMetadata(string calldata batchId) external view returns (string memory) {
        return batches[batchId].metadataHash;
    }

    function getBatchFacility(string calldata batchId) external view returns (string memory) {
        return batches[batchId].currentFacilityId;
    }

    function isBatchExists(string calldata batchId) external view returns (bool) {
        return batches[batchId].createdAt != 0;
    }

    /// @notice Whether a move would be accepted right now, without sending a tx.
    function canTransition(string calldata batchId, BatchState to) external view returns (bool) {
        Batch storage b = batches[batchId];
        if (b.createdAt == 0) return false;

        BatchState from = b.state;
        if (from == BatchState.Registered) return to == BatchState.DryingStarted;
        if (from == BatchState.DryingStarted) return to == BatchState.DryingCompleted;
        if (from == BatchState.DryingCompleted) return to == BatchState.Delivered;
        if (
            from == BatchState.InStorage_Retired || from == BatchState.InTransit_Retired
        ) {
            return to == BatchState.Delivered;
        }
        return false;
    }

    /// @notice Verify an off-chain record hash matches on-chain state.
    function verifyMetadata(string calldata batchId, string calldata metadataHash)
        external
        view
        returns (bool)
    {
        Batch storage b = batches[batchId];
        return b.createdAt != 0 && keccak256(bytes(b.metadataHash)) == keccak256(bytes(metadataHash));
    }

    // ------------------------------------------------------------- pause hooks
    function pause() external onlyRole(roleManager.DEFAULT_ADMIN_ROLE()) {
        _pause();
    }

    function unpause() external onlyRole(roleManager.DEFAULT_ADMIN_ROLE()) {
        _unpause();
    }

    // ------------------------------------------------------------ upgrade auth
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(roleManager.DEFAULT_ADMIN_ROLE())
    {
        if (newImplementation == address(0)) revert ZeroAddress();
    }

    // --------------------------------------------- ERC2771 / Context resolution
    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }

    function _contextSuffixLength()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (uint256)
    {
        return ERC2771ContextUpgradeable._contextSuffixLength();
    }

    /// @dev Reserved storage for future upgrades. No new variables were added in
    ///      this revision, so the gap is unchanged from the deployed layout.
    uint256[48] private __gap;
}

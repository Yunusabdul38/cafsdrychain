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
 */
contract BatchRegistry is
    Initializable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ERC2771ContextUpgradeable
{
    RoleManager public roleManager;

    enum BatchState {
        Registered, // 0
        DryingStarted, // 1
        DryingCompleted, // 2
        InStorage, // 3
        InTransit, // 4
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

    event BatchRegistered(string batchId, address indexed creator, uint256 timestamp);
    event DryingUpdated(string batchId, string facilityId, BatchState state, uint256 currentWeight);
    event LogisticsUpdated(string batchId, string facilityId, BatchState state);

    error Unauthorized();
    error BatchExists();
    error BatchMissing();
    error InvalidState();

    modifier onlyRole(bytes32 role) {
        if (!roleManager.hasRole(role, _msgSender())) revert Unauthorized();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder) ERC2771ContextUpgradeable(trustedForwarder) {
        _disableInitializers();
    }

    function initialize(address _roleManager) external initializer {
        require(_roleManager != address(0), "BatchRegistry: zero roleManager");
        __Pausable_init();
        __UUPSUpgradeable_init();
        roleManager = RoleManager(_roleManager);
    }

    // -------------------------------------------------------------- lifecycle --

    function registerBatch(
        string calldata batchId,
        string calldata facilityId,
        uint256 freshWeight,
        string calldata metadataHash
    ) external whenNotPaused onlyRole(roleManager.FIELD_OFFICER_ROLE()) {
        if (batches[batchId].createdAt != 0) revert BatchExists();

        batches[batchId] = Batch({
            batchId: batchId,
            creator: _msgSender(),
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

        emit BatchRegistered(batchId, _msgSender(), block.timestamp);
    }

    function updateDryingSession(
        string calldata batchId,
        string calldata facilityId,
        BatchState newState,
        uint256 currentWeight,
        string calldata metadataHash
    ) external whenNotPaused onlyRole(roleManager.DRYER_OPERATOR_ROLE()) {
        if (batches[batchId].createdAt == 0) revert BatchMissing();
        if (newState != BatchState.DryingStarted && newState != BatchState.DryingCompleted) {
            revert InvalidState();
        }

        Batch storage batch = batches[batchId];
        batch.state = newState;
        batch.currentFacilityId = facilityId;
        batch.currentWeight = currentWeight;
        batch.metadataHash = metadataHash;
        batch.updatedAt = block.timestamp;

        emit DryingUpdated(batchId, facilityId, newState, currentWeight);
    }

    function updateLogistics(
        string calldata batchId,
        string calldata facilityId,
        BatchState newState,
        string calldata metadataHash
    ) external whenNotPaused onlyRole(roleManager.LOGISTICS_ROLE()) {
        if (batches[batchId].createdAt == 0) revert BatchMissing();
        if (
            newState != BatchState.InStorage &&
            newState != BatchState.InTransit &&
            newState != BatchState.Delivered
        ) {
            revert InvalidState();
        }

        Batch storage batch = batches[batchId];
        batch.state = newState;
        batch.currentFacilityId = facilityId;
        batch.metadataHash = metadataHash;
        batch.updatedAt = block.timestamp;

        emit LogisticsUpdated(batchId, facilityId, newState);
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
    {}

    /// @dev Reserved storage for future upgrades.
    uint256[48] private __gap;
}

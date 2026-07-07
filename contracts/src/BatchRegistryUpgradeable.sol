// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC2771ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {RoleManagerUpgradeable} from "./RoleManagerUpgradeable.sol";

contract BatchRegistryUpgradeable is Initializable, ERC2771ContextUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    RoleManagerUpgradeable public roleManager;

    enum BatchState {
        Registered,
        DryingStarted,
        DryingCompleted,
        InStorage,
        InTransit,
        Delivered
    }

    struct Batch {
        string batchId;
        address creator;
        uint256 createdAt;
        uint256 updatedAt;
        string metadataHash;
        BatchState state;
        string currentFacilityId;
        uint256 freshWeight;
        uint256 currentWeight;
    }

    mapping(string => Batch) public batches;
    string[] public batchIds;

    event BatchRegistered(string indexed batchId, address indexed creator, uint256 timestamp);
    event DryingUpdated(string indexed batchId, string indexed facilityId, BatchState state, uint256 currentWeight);
    event LogisticsUpdated(string indexed batchId, string indexed facilityId, BatchState state);

    error BatchAlreadyExists(string batchId);
    error BatchNotFound(string batchId);
    error Unauthorized();
    error InvalidStateForDrying();
    error InvalidStateForLogistics();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder_) ERC2771ContextUpgradeable(trustedForwarder_) {
        _disableInitializers();
    }

    function initialize(address _roleManager) initializer public {
        __Pausable_init();
        roleManager = RoleManagerUpgradeable(_roleManager);
    }

    function _authorizeUpgrade(address newImplementation) internal override {
        if (!roleManager.hasRole(roleManager.DEFAULT_ADMIN_ROLE(), _msgSender())) {
            revert Unauthorized();
        }
    }

    function pause() external {
        if (!roleManager.hasRole(roleManager.DEFAULT_ADMIN_ROLE(), _msgSender())) {
            revert Unauthorized();
        }
        _pause();
    }

    function unpause() external {
        if (!roleManager.hasRole(roleManager.DEFAULT_ADMIN_ROLE(), _msgSender())) {
            revert Unauthorized();
        }
        _unpause();
    }

    modifier onlyRole(bytes32 role) {
        if (!roleManager.hasRole(role, _msgSender())) {
            revert Unauthorized();
        }
        _;
    }

    function registerBatch(
        string memory batchId,
        string memory metadataHash,
        string memory facilityId,
        uint256 freshWeight
    ) external whenNotPaused onlyRole(roleManager.FIELD_OFFICER_ROLE()) {
        if (batches[batchId].createdAt != 0) {
            revert BatchAlreadyExists(batchId);
        }

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

        batchIds.push(batchId);

        emit BatchRegistered(batchId, _msgSender(), block.timestamp);
    }

    function updateDryingSession(
        string memory batchId,
        string memory facilityId,
        uint256 newWeight,
        BatchState newState,
        string memory metadataHash
    ) external whenNotPaused onlyRole(roleManager.DRYER_OPERATOR_ROLE()) {
        if (batches[batchId].createdAt == 0) {
            revert BatchNotFound(batchId);
        }
        if (newState != BatchState.DryingStarted && newState != BatchState.DryingCompleted) {
            revert InvalidStateForDrying();
        }

        Batch storage batch = batches[batchId];
        batch.state = newState;
        batch.currentWeight = newWeight;
        batch.currentFacilityId = facilityId;
        batch.metadataHash = metadataHash;
        batch.updatedAt = block.timestamp;

        emit DryingUpdated(batchId, facilityId, newState, newWeight);
    }

    function updateLogistics(
        string memory batchId,
        string memory facilityId,
        BatchState newState,
        string memory metadataHash
    ) external whenNotPaused onlyRole(roleManager.LOGISTICS_ROLE()) {
        if (batches[batchId].createdAt == 0) {
            revert BatchNotFound(batchId);
        }
        if (newState != BatchState.InStorage && newState != BatchState.InTransit && newState != BatchState.Delivered) {
            revert InvalidStateForLogistics();
        }

        Batch storage batch = batches[batchId];
        batch.state = newState;
        batch.currentFacilityId = facilityId;
        batch.metadataHash = metadataHash;
        batch.updatedAt = block.timestamp;

        emit LogisticsUpdated(batchId, facilityId, newState);
    }

    // Getters
    function getBatch(string memory batchId) external view returns (Batch memory) {
        return batches[batchId];
    }

    function getBatchState(string memory batchId) external view returns (BatchState) {
        return batches[batchId].state;
    }

    function getBatchMetadata(string memory batchId) external view returns (string memory) {
        return batches[batchId].metadataHash;
    }

    function getBatchFacility(string memory batchId) external view returns (string memory) {
        return batches[batchId].currentFacilityId;
    }

    function isBatchExists(string memory batchId) external view returns (bool) {
        return batches[batchId].createdAt != 0;
    }

    function getTotalBatches() external view returns (uint256) {
        return batchIds.length;
    }

    function getAllBatchIds() external view returns (string[] memory) {
        return batchIds;
    }

    function getAllBatches() external view returns (Batch[] memory) {
        uint256 total = batchIds.length;
        Batch[] memory result = new Batch[](total);
        for (uint256 i = 0; i < total; i++) {
            result[i] = batches[batchIds[i]];
        }
        return result;
    }

    function getBatchesPaginated(uint256 offset, uint256 limit) external view returns (Batch[] memory) {
        uint256 total = batchIds.length;
        if (offset >= total) {
            return new Batch[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 size = end - offset;
        Batch[] memory result = new Batch[](size);
        
        for (uint256 i = 0; i < size; i++) {
            result[i] = batches[batchIds[offset + i]];
        }
        
        return result;
    }

    function _msgSender() internal view override(ERC2771ContextUpgradeable, ContextUpgradeable) returns (address) {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData() internal view override(ERC2771ContextUpgradeable, ContextUpgradeable) returns (bytes calldata) {
        return ERC2771ContextUpgradeable._msgData();
    }
    
    function _contextSuffixLength() internal view override(ERC2771ContextUpgradeable, ContextUpgradeable) returns (uint256) {
        return ERC2771ContextUpgradeable._contextSuffixLength();
    }
}

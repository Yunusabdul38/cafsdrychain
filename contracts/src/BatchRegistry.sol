// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {RoleManager} from "./RoleManager.sol";

contract BatchRegistry is ERC2771Context {
    RoleManager public roleManager;

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

    event BatchRegistered(string batchId, address indexed creator, uint256 timestamp);
    event DryingUpdated(string batchId, string facilityId, BatchState state, uint256 currentWeight);
    event LogisticsUpdated(string batchId, string facilityId, BatchState state);

    modifier onlyRole(bytes32 role) {
        require(roleManager.hasRole(role, _msgSender()), "BatchRegistry: Unauthorized");
        _;
    }

    constructor(address trustedForwarder, address _roleManager) ERC2771Context(trustedForwarder) {
        roleManager = RoleManager(_roleManager);
    }

    function registerBatch(
        string memory batchId,
        string memory facilityId,
        uint256 freshWeight,
        string memory metadataHash
    ) external onlyRole(roleManager.FIELD_OFFICER_ROLE()) {
        require(batches[batchId].createdAt == 0, "Batch already exists");

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

        emit BatchRegistered(batchId, _msgSender(), block.timestamp);
    }

    function updateDryingSession(
        string memory batchId,
        string memory facilityId,
        BatchState newState,
        uint256 currentWeight,
        string memory metadataHash
    ) external onlyRole(roleManager.DRYER_OPERATOR_ROLE()) {
        require(batches[batchId].createdAt != 0, "Batch does not exist");
        require(
            newState == BatchState.DryingStarted || newState == BatchState.DryingCompleted,
            "Invalid state for drying session"
        );

        Batch storage batch = batches[batchId];
        batch.state = newState;
        batch.currentFacilityId = facilityId;
        batch.currentWeight = currentWeight;
        batch.metadataHash = metadataHash;
        batch.updatedAt = block.timestamp;

        emit DryingUpdated(batchId, facilityId, newState, currentWeight);
    }

    function updateLogistics(
        string memory batchId,
        string memory facilityId,
        BatchState newState,
        string memory metadataHash
    ) external onlyRole(roleManager.LOGISTICS_ROLE()) {
        require(batches[batchId].createdAt != 0, "Batch does not exist");
        require(
            newState == BatchState.InStorage || newState == BatchState.InTransit || newState == BatchState.Delivered,
            "Invalid state for logistics"
        );

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
}

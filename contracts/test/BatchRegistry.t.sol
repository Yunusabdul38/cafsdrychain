// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";

// A simple mock forwarder to test EIP-2771 functionality
contract MockForwarder {
    function execute(address target, bytes memory data, address sender) external returns (bool) {
        // Append the sender address to the end of the calldata (EIP-2771 standard)
        bytes memory forwardData = abi.encodePacked(data, sender);
        
        (bool success, ) = target.call(forwardData);
        return success;
    }
}

contract BatchRegistryTest is Test {
    RoleManager roleManager;
    BatchRegistry batchRegistry;
    MockForwarder forwarder;

    address admin = address(1);
    address fieldOfficer = address(2);
    address dryerOperator = address(3);
    address logisticsOperator = address(4);
    address unauthorizedUser = address(5);
    address masterWallet = address(6); // The gas sponsor

    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy Mock Forwarder
        forwarder = new MockForwarder();

        // Deploy RoleManager
        roleManager = new RoleManager(admin);

        // Grant Roles
        roleManager.grantRole(roleManager.FIELD_OFFICER_ROLE(), fieldOfficer);
        roleManager.grantRole(roleManager.DRYER_OPERATOR_ROLE(), dryerOperator);
        roleManager.grantRole(roleManager.LOGISTICS_ROLE(), logisticsOperator);

        // Deploy Batch Registry, trusting our Mock Forwarder
        batchRegistry = new BatchRegistry(address(forwarder), address(roleManager));
        
        vm.stopPrank();
    }

    function test_DirectCallUnauthorized() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert("BatchRegistry: Unauthorized");
        batchRegistry.registerBatch("BATCH_001", "FACILITY_1", 100, "hash123");
    }

    function test_RegisterBatchSuccess() public {
        vm.prank(fieldOfficer);
        batchRegistry.registerBatch("BATCH_001", "FACILITY_1", 100, "hash123");

        BatchRegistry.Batch memory batch = batchRegistry.getBatch("BATCH_001");
        assertEq(batch.batchId, "BATCH_001");
        assertEq(batch.creator, fieldOfficer);
        assertEq(uint(batch.state), uint(BatchRegistry.BatchState.Registered));
        assertEq(batch.freshWeight, 100);
        assertEq(batch.currentWeight, 100);
    }

    function test_MetaTransaction_RegisterBatch() public {
        // The masterWallet submits the transaction on behalf of the fieldOfficer
        
        // The function data we want to execute
        bytes memory data = abi.encodeWithSelector(
            batchRegistry.registerBatch.selector,
            "BATCH_002",
            "FACILITY_1",
            200,
            "hash456"
        );

        vm.prank(masterWallet);
        bool success = forwarder.execute(address(batchRegistry), data, fieldOfficer);
        assertTrue(success);

        // Verify the batch was created and the creator is correctly identified as fieldOfficer (not masterWallet)
        BatchRegistry.Batch memory batch = batchRegistry.getBatch("BATCH_002");
        assertEq(batch.creator, fieldOfficer);
    }

    function test_UpdateDryingSession() public {
        vm.prank(fieldOfficer);
        batchRegistry.registerBatch("BATCH_003", "FACILITY_1", 100, "hash123");

        vm.prank(dryerOperator);
        batchRegistry.updateDryingSession(
            "BATCH_003", 
            "DRYER_A", 
            BatchRegistry.BatchState.DryingStarted, 
            95, 
            "hash_drying_started"
        );

        BatchRegistry.Batch memory batch = batchRegistry.getBatch("BATCH_003");
        assertEq(uint(batch.state), uint(BatchRegistry.BatchState.DryingStarted));
        assertEq(batch.currentWeight, 95);
        assertEq(batch.currentFacilityId, "DRYER_A");
    }
}

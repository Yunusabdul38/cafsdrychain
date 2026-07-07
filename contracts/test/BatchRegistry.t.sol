// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {BatchRegistryUpgradeable} from "../src/BatchRegistryUpgradeable.sol";
import {RoleManagerUpgradeable} from "../src/RoleManagerUpgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Mock Forwarder for testing EIP-2771
contract MockForwarder {
    function execute(address target, bytes calldata data, address from) external returns (bytes memory) {
        // Append the "from" address to the end of the calldata as required by ERC2771
        bytes memory forwarderData = abi.encodePacked(data, from);
        (bool success, bytes memory result) = target.call(forwarderData);
        require(success, "Forwarder call failed");
        return result;
    }
}

contract BatchRegistryTest is Test {
    BatchRegistryUpgradeable public batchRegistry;
    RoleManagerUpgradeable public roleManager;
    MockForwarder public forwarder;

    address admin = address(1);
    address fieldOfficer = address(2);
    address dryerOperator = address(3);
    address logisticsOperator = address(4);
    address masterWallet = address(5); // Pays for gas
    address unauthorized = address(6);

    function setUp() public {
        vm.startPrank(admin);
        forwarder = new MockForwarder();

        // Deploy and Initialize RoleManager Proxy
        RoleManagerUpgradeable roleManagerImpl = new RoleManagerUpgradeable();
        ERC1967Proxy roleManagerProxy = new ERC1967Proxy(
            address(roleManagerImpl),
            abi.encodeWithSelector(RoleManagerUpgradeable.initialize.selector, admin)
        );
        roleManager = RoleManagerUpgradeable(address(roleManagerProxy));

        // Deploy and Initialize BatchRegistry Proxy
        BatchRegistryUpgradeable batchRegistryImpl = new BatchRegistryUpgradeable(address(forwarder));
        ERC1967Proxy batchRegistryProxy = new ERC1967Proxy(
            address(batchRegistryImpl),
            abi.encodeWithSelector(BatchRegistryUpgradeable.initialize.selector, address(roleManager))
        );
        batchRegistry = BatchRegistryUpgradeable(address(batchRegistryProxy));

        // Grant Roles
        roleManager.grantRole(roleManager.FIELD_OFFICER_ROLE(), fieldOfficer);
        roleManager.grantRole(roleManager.DRYER_OPERATOR_ROLE(), dryerOperator);
        roleManager.grantRole(roleManager.LOGISTICS_ROLE(), logisticsOperator);

        vm.stopPrank();
    }

    function test_RegisterBatchSuccess() public {
        vm.prank(fieldOfficer);
        batchRegistry.registerBatch("BATCH_001", "QmHash123", "Dryer-A", 100);

        assertTrue(batchRegistry.isBatchExists("BATCH_001"));
        BatchRegistryUpgradeable.Batch memory b = batchRegistry.getBatch("BATCH_001");
        assertEq(b.freshWeight, 100);
        assertEq(uint(b.state), uint(BatchRegistryUpgradeable.BatchState.Registered));
        assertEq(batchRegistry.getTotalBatches(), 1);
    }

    function test_MetaTransaction_RegisterBatch() public {
        // Here we simulate the MasterWallet paying the gas, 
        // but the actual sender is the Field Officer via the forwarder.

        bytes memory data = abi.encodeWithSelector(
            batchRegistry.registerBatch.selector,
            "BATCH_002",
            "QmHashXYZ",
            "Dryer-B",
            200
        );

        vm.prank(masterWallet);
        forwarder.execute(address(batchRegistry), data, fieldOfficer);

        assertTrue(batchRegistry.isBatchExists("BATCH_002"));
        BatchRegistryUpgradeable.Batch memory b = batchRegistry.getBatch("BATCH_002");
        assertEq(b.creator, fieldOfficer); // Crucial: The creator is the fieldOfficer, not the masterWallet!
    }

    function test_DirectCallUnauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert(BatchRegistryUpgradeable.Unauthorized.selector);
        batchRegistry.registerBatch("BATCH_X", "hash", "D-1", 50);
    }

    function test_UpdateDryingSession() public {
        vm.prank(fieldOfficer);
        batchRegistry.registerBatch("BATCH_003", "hash1", "Dryer-A", 100);

        vm.prank(dryerOperator);
        batchRegistry.updateDryingSession("BATCH_003", "Dryer-A", 80, BatchRegistryUpgradeable.BatchState.DryingStarted, "hash2");

        BatchRegistryUpgradeable.Batch memory b = batchRegistry.getBatch("BATCH_003");
        assertEq(b.currentWeight, 80);
        assertEq(uint(b.state), uint(BatchRegistryUpgradeable.BatchState.DryingStarted));
    }

    function test_PauseAndUnpause() public {
        vm.prank(admin);
        batchRegistry.pause();

        vm.prank(fieldOfficer);
        vm.expectRevert(); // Should revert with EnforcedPause
        batchRegistry.registerBatch("BATCH_PAUSED", "hash", "D-1", 50);

        vm.prank(admin);
        batchRegistry.unpause();

        vm.prank(fieldOfficer);
        batchRegistry.registerBatch("BATCH_UNPAUSED", "hash", "D-1", 50);
        assertTrue(batchRegistry.isBatchExists("BATCH_UNPAUSED"));
    }
}

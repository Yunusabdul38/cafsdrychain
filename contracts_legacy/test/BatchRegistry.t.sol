// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";
import {BatchRegistryV2} from "../src/mocks/BatchRegistryV2.sol";

/// @dev Minimal EIP-2771 forwarder: appends `sender` to calldata and forwards.
contract MockForwarder {
    function execute(address target, bytes memory data, address sender) external returns (bool) {
        (bool ok, ) = target.call(abi.encodePacked(data, sender));
        return ok;
    }
}

contract BatchRegistryTest is Test {
    RoleManager roleManager;
    BatchRegistry registry;
    MockForwarder forwarder;

    address admin = address(0x1);
    address fieldOfficer = address(0x2);
    address dryerOperator = address(0x3);
    address logistics = address(0x4);
    address stranger = address(0x5);
    address masterWallet = address(0x6); // gas sponsor / relayer

    function setUp() public {
        forwarder = new MockForwarder();

        // RoleManager behind a proxy
        RoleManager rmImpl = new RoleManager();
        roleManager = RoleManager(
            address(new ERC1967Proxy(address(rmImpl), abi.encodeCall(RoleManager.initialize, (admin))))
        );

        // BatchRegistry behind a proxy (forwarder baked into the implementation)
        BatchRegistry brImpl = new BatchRegistry(address(forwarder));
        registry = BatchRegistry(
            address(
                new ERC1967Proxy(
                    address(brImpl),
                    abi.encodeCall(BatchRegistry.initialize, (address(roleManager)))
                )
            )
        );

        // Admin provisions operators
        vm.startPrank(admin);
        roleManager.grantRole(roleManager.FIELD_OFFICER_ROLE(), fieldOfficer);
        roleManager.grantRole(roleManager.DRYER_OPERATOR_ROLE(), dryerOperator);
        roleManager.grantRole(roleManager.LOGISTICS_ROLE(), logistics);
        vm.stopPrank();
    }

    function test_Initialized() public view {
        assertEq(address(registry.roleManager()), address(roleManager));
        assertTrue(roleManager.hasRole(roleManager.DEFAULT_ADMIN_ROLE(), admin));
        assertEq(registry.totalBatches(), 0);
    }

    function test_RegisterBatch() public {
        vm.prank(fieldOfficer);
        registry.registerBatch("DRY-1", "OYO", 480, "ipfs://meta1");

        BatchRegistry.Batch memory b = registry.getBatch("DRY-1");
        assertEq(b.creator, fieldOfficer);
        assertEq(uint8(b.state), uint8(BatchRegistry.BatchState.Registered));
        assertEq(b.freshWeight, 480);
        assertEq(registry.totalBatches(), 1);
    }

    function test_RevertWhen_Unauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(BatchRegistry.Unauthorized.selector);
        registry.registerBatch("DRY-X", "OYO", 100, "ipfs://x");
    }

    function test_FullLifecycle() public {
        vm.prank(fieldOfficer);
        registry.registerBatch("DRY-2", "OYO", 500, "m0");

        vm.prank(dryerOperator);
        registry.updateDryingSession("DRY-2", "OYO", BatchRegistry.BatchState.DryingStarted, 500, "m1");

        vm.prank(dryerOperator);
        registry.updateDryingSession("DRY-2", "OYO", BatchRegistry.BatchState.DryingCompleted, 100, "m2");

        vm.prank(logistics);
        registry.updateLogistics("DRY-2", "WH-B", BatchRegistry.BatchState.InStorage, "m3");

        vm.prank(logistics);
        registry.updateLogistics("DRY-2", "WH-B", BatchRegistry.BatchState.Delivered, "m4");

        BatchRegistry.Batch memory b = registry.getBatch("DRY-2");
        assertEq(uint8(b.state), uint8(BatchRegistry.BatchState.Delivered));
        assertEq(b.currentWeight, 100);
        assertTrue(registry.verifyMetadata("DRY-2", "m4"));
        assertFalse(registry.verifyMetadata("DRY-2", "tampered"));
    }

    function test_RevertWhen_InvalidDryingState() public {
        vm.prank(fieldOfficer);
        registry.registerBatch("DRY-3", "OYO", 500, "m0");

        vm.prank(dryerOperator);
        vm.expectRevert(BatchRegistry.InvalidState.selector);
        registry.updateDryingSession("DRY-3", "OYO", BatchRegistry.BatchState.Delivered, 500, "m1");
    }

    /// @notice Gas sponsorship: operator wallet is the origin, master wallet pays.
    function test_MetaTx_GasSponsorship() public {
        bytes memory data = abi.encodeCall(
            BatchRegistry.registerBatch,
            ("DRY-META", "OYO", 300, "ipfs://meta")
        );

        // masterWallet submits & pays gas; fieldOfficer is the appended sender.
        vm.prank(masterWallet);
        bool ok = forwarder.execute(address(registry), data, fieldOfficer);
        assertTrue(ok);

        BatchRegistry.Batch memory b = registry.getBatch("DRY-META");
        assertEq(b.creator, fieldOfficer, "operator wallet must be the tx origin");
    }

    function test_RevertWhen_MetaTxSenderUnauthorized() public {
        bytes memory data = abi.encodeCall(
            BatchRegistry.registerBatch,
            ("DRY-BAD", "OYO", 300, "ipfs://meta")
        );
        vm.prank(masterWallet);
        bool ok = forwarder.execute(address(registry), data, stranger);
        assertFalse(ok, "unauthorized appended sender must fail");
        assertFalse(registry.isBatchExists("DRY-BAD"));
    }

    function test_Upgrade_PreservesState() public {
        vm.prank(fieldOfficer);
        registry.registerBatch("DRY-UP", "OYO", 400, "m0");

        BatchRegistryV2 newImpl = new BatchRegistryV2(address(forwarder));
        vm.prank(admin);
        registry.upgradeToAndCall(address(newImpl), "");

        BatchRegistryV2 upgraded = BatchRegistryV2(address(registry));
        assertEq(upgraded.version(), "v2");
        // state survived the upgrade
        assertEq(upgraded.getBatch("DRY-UP").creator, fieldOfficer);
        assertEq(upgraded.totalBatches(), 1);
    }

    function test_RevertWhen_NonAdminUpgrades() public {
        BatchRegistryV2 newImpl = new BatchRegistryV2(address(forwarder));
        vm.prank(stranger);
        vm.expectRevert(BatchRegistry.Unauthorized.selector);
        registry.upgradeToAndCall(address(newImpl), "");
    }

    function test_Pause_BlocksWrites() public {
        vm.prank(admin);
        registry.pause();

        vm.prank(fieldOfficer);
        vm.expectRevert(); // Pausable: EnforcedPause
        registry.registerBatch("DRY-P", "OYO", 100, "m");
    }
}

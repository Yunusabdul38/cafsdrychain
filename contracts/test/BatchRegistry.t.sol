// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console, Vm} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
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
    address admin2 = address(0x7);

    // Shorthand for the enum.
    BatchRegistry.BatchState constant REGISTERED = BatchRegistry.BatchState.Registered;
    BatchRegistry.BatchState constant DRYING = BatchRegistry.BatchState.DryingStarted;
    BatchRegistry.BatchState constant DRIED = BatchRegistry.BatchState.DryingCompleted;
    BatchRegistry.BatchState constant STORED = BatchRegistry.BatchState.InStorage_Retired;
    BatchRegistry.BatchState constant TRANSIT = BatchRegistry.BatchState.InTransit_Retired;
    BatchRegistry.BatchState constant DELIVERED = BatchRegistry.BatchState.Delivered;

    function setUp() public {
        forwarder = new MockForwarder();

        RoleManager rmImpl = new RoleManager();
        roleManager = RoleManager(
            address(new ERC1967Proxy(address(rmImpl), abi.encodeCall(RoleManager.initialize, (admin))))
        );

        BatchRegistry brImpl = new BatchRegistry(address(forwarder));
        registry = BatchRegistry(
            address(
                new ERC1967Proxy(
                    address(brImpl),
                    abi.encodeCall(BatchRegistry.initialize, (address(roleManager)))
                )
            )
        );

        vm.startPrank(admin);
        roleManager.grantRole(roleManager.FIELD_OFFICER_ROLE(), fieldOfficer);
        roleManager.grantRole(roleManager.DRYER_OPERATOR_ROLE(), dryerOperator);
        roleManager.grantRole(roleManager.LOGISTICS_ROLE(), logistics);
        vm.stopPrank();
    }

    // ------------------------------------------------------------- helpers --

    function _register(string memory id, uint256 fresh) internal {
        vm.prank(fieldOfficer);
        registry.registerBatch(id, "OYO", fresh, "m0");
    }

    function _dry(string memory id, BatchRegistry.BatchState to, uint256 weight) internal {
        vm.prank(dryerOperator);
        registry.updateDryingSession(id, "OYO", to, weight, "m1");
    }

    function _move(string memory id, BatchRegistry.BatchState to) internal {
        vm.prank(logistics);
        registry.updateLogistics(id, "WH-B", to, "m2");
    }

    /// Walk a batch to `target` through every legal step.
    function _advanceTo(string memory id, BatchRegistry.BatchState target) internal {
        _register(id, 500);
        if (target == REGISTERED) return;
        _dry(id, DRYING, 500);
        if (target == DRYING) return;
        _dry(id, DRIED, 300);
        if (target == DRIED) return;
        _move(id, DELIVERED);
    }

    // -------------------------------------------------------------- basics --

    function test_Initialized() public view {
        assertEq(address(registry.roleManager()), address(roleManager));
        assertTrue(roleManager.hasRole(roleManager.DEFAULT_ADMIN_ROLE(), admin));
        assertEq(registry.totalBatches(), 0);
    }

    function test_RegisterBatch() public {
        _register("DRY-1", 480);

        BatchRegistry.Batch memory b = registry.getBatch("DRY-1");
        assertEq(b.creator, fieldOfficer);
        assertEq(uint8(b.state), uint8(REGISTERED));
        assertEq(b.freshWeight, 480);
        assertEq(b.currentWeight, 480);
        assertEq(registry.totalBatches(), 1);
    }

    function test_FullLifecycle_DriedToDelivered() public {
        _advanceTo("DRY-2", DELIVERED);

        BatchRegistry.Batch memory b = registry.getBatch("DRY-2");
        assertEq(uint8(b.state), uint8(DELIVERED));
        assertEq(b.currentWeight, 300);
        assertTrue(registry.verifyMetadata("DRY-2", "m2"));
        assertFalse(registry.verifyMetadata("DRY-2", "tampered"));
    }

    /// Storage and dispatch are retired: neither can be written any more.
    function test_RevertWhen_WritingRetiredStorage() public {
        _advanceTo("RT-1", DRIED);
        vm.prank(logistics);
        vm.expectRevert(BatchRegistry.InvalidState.selector);
        registry.updateLogistics("RT-1", "WH", STORED, "m");
    }

    function test_RevertWhen_WritingRetiredInTransit() public {
        _advanceTo("RT-2", DRIED);
        vm.prank(logistics);
        vm.expectRevert(BatchRegistry.InvalidState.selector);
        registry.updateLogistics("RT-2", "WH", TRANSIT, "m");
    }

    /// Their numbering is preserved so delivered batches still decode correctly.
    function test_RetiredStagesKeepDeliveredAtPositionFive() public pure {
        assertEq(uint8(BatchRegistry.BatchState.InStorage_Retired), 3);
        assertEq(uint8(BatchRegistry.BatchState.InTransit_Retired), 4);
        assertEq(uint8(BatchRegistry.BatchState.Delivered), 5);
    }

    // ------------------------------------------------- transition enforcement --

    function test_RevertWhen_RegisteringTwice() public {
        _register("DUP", 100);
        vm.prank(fieldOfficer);
        vm.expectRevert(BatchRegistry.BatchExists.selector);
        registry.registerBatch("DUP", "OYO", 100, "m0");
    }

    function test_RevertWhen_DryingAnUnknownBatch() public {
        vm.prank(dryerOperator);
        vm.expectRevert(BatchRegistry.BatchMissing.selector);
        registry.updateDryingSession("GHOST", "OYO", DRYING, 10, "m");
    }

    function test_RevertWhen_StartingDryingTwice() public {
        _advanceTo("T1", DRYING);
        vm.prank(dryerOperator);
        vm.expectRevert(
            abi.encodeWithSelector(BatchRegistry.InvalidTransition.selector, DRYING, DRYING)
        );
        registry.updateDryingSession("T1", "OYO", DRYING, 400, "m");
    }

    function test_RevertWhen_CompletingDryingBeforeStarting() public {
        _advanceTo("T2", REGISTERED);
        vm.prank(dryerOperator);
        vm.expectRevert(
            abi.encodeWithSelector(BatchRegistry.InvalidTransition.selector, REGISTERED, DRIED)
        );
        registry.updateDryingSession("T2", "OYO", DRIED, 200, "m");
    }

    function test_RevertWhen_DeliveringBeforeDryingCompletes() public {
        _advanceTo("T3", DRYING);
        vm.prank(logistics);
        vm.expectRevert(
            abi.encodeWithSelector(BatchRegistry.InvalidTransition.selector, DRYING, DELIVERED)
        );
        registry.updateLogistics("T3", "WH", DELIVERED, "m");
    }

    function test_RevertWhen_DeliveringStraightFromRegistered() public {
        _advanceTo("T4", REGISTERED);
        vm.prank(logistics);
        vm.expectRevert(
            abi.encodeWithSelector(BatchRegistry.InvalidTransition.selector, REGISTERED, DELIVERED)
        );
        registry.updateLogistics("T4", "WH", DELIVERED, "m");
    }

    function test_RevertWhen_MovingBackwards() public {
        _advanceTo("T5", DELIVERED);
        vm.prank(dryerOperator);
        vm.expectRevert(
            abi.encodeWithSelector(BatchRegistry.InvalidTransition.selector, DELIVERED, DRYING)
        );
        registry.updateDryingSession("T5", "OYO", DRYING, 100, "m");
    }

    function test_RevertWhen_TouchingADeliveredBatch() public {
        _advanceTo("T6", DELIVERED);

        vm.prank(logistics);
        vm.expectRevert(
            abi.encodeWithSelector(BatchRegistry.InvalidTransition.selector, DELIVERED, DELIVERED)
        );
        registry.updateLogistics("T6", "WH", DELIVERED, "m");
    }

    function test_RevertWhen_DryingStateGivenToLogistics() public {
        _advanceTo("T7", DRIED);
        vm.prank(logistics);
        vm.expectRevert(BatchRegistry.InvalidState.selector);
        registry.updateLogistics("T7", "WH", DRYING, "m");
    }

    function test_RevertWhen_LogisticsStateGivenToDrying() public {
        _advanceTo("T8", REGISTERED);
        vm.prank(dryerOperator);
        vm.expectRevert(BatchRegistry.InvalidState.selector);
        registry.updateDryingSession("T8", "OYO", DELIVERED, 100, "m");
    }

    function test_CanTransition_MatchesEnforcement() public {
        _advanceTo("T9", DRIED);
        assertTrue(registry.canTransition("T9", DELIVERED));
        assertFalse(registry.canTransition("T9", STORED));
        assertFalse(registry.canTransition("T9", TRANSIT));
        assertFalse(registry.canTransition("T9", DRYING));
        assertFalse(registry.canTransition("UNKNOWN", DELIVERED));
    }

    // ------------------------------------------------------ input validation --

    function test_RevertWhen_EmptyBatchId() public {
        vm.prank(fieldOfficer);
        vm.expectRevert(BatchRegistry.EmptyBatchId.selector);
        registry.registerBatch("", "OYO", 100, "m");
    }

    function test_RevertWhen_EmptyMetadataOnRegister() public {
        vm.prank(fieldOfficer);
        vm.expectRevert(BatchRegistry.EmptyMetadata.selector);
        registry.registerBatch("E1", "OYO", 100, "");
    }

    function test_RevertWhen_EmptyMetadataOnDrying() public {
        _advanceTo("E2", REGISTERED);
        vm.prank(dryerOperator);
        vm.expectRevert(BatchRegistry.EmptyMetadata.selector);
        registry.updateDryingSession("E2", "OYO", DRYING, 100, "");
    }

    function test_RevertWhen_EmptyMetadataOnLogistics() public {
        _advanceTo("E3", DRIED);
        vm.prank(logistics);
        vm.expectRevert(BatchRegistry.EmptyMetadata.selector);
        registry.updateLogistics("E3", "WH", DELIVERED, "");
    }

    function test_RevertWhen_ZeroFreshWeight() public {
        vm.prank(fieldOfficer);
        vm.expectRevert(BatchRegistry.InvalidWeight.selector);
        registry.registerBatch("Z1", "OYO", 0, "m");
    }

    function test_RevertWhen_ZeroCurrentWeight() public {
        _advanceTo("Z2", REGISTERED);
        vm.prank(dryerOperator);
        vm.expectRevert(BatchRegistry.InvalidWeight.selector);
        registry.updateDryingSession("Z2", "OYO", DRYING, 0, "m");
    }

    /// Drying removes water: a heavier result is a mis-entry or a forgery.
    function test_RevertWhen_DryingIncreasesWeight() public {
        _register("W1", 500);
        vm.prank(dryerOperator);
        vm.expectRevert(
            abi.encodeWithSelector(BatchRegistry.WeightIncreased.selector, 500, 501)
        );
        registry.updateDryingSession("W1", "OYO", DRYING, 501, "m");
    }

    function test_DryingToEqualWeightIsAllowed() public {
        _register("W2", 500);
        _dry("W2", DRYING, 500);
        assertEq(registry.getBatch("W2").currentWeight, 500);
    }

    function testFuzz_DryingNeverExceedsFreshWeight(uint256 fresh, uint256 dried) public {
        fresh = bound(fresh, 1, type(uint128).max);
        dried = bound(dried, 1, type(uint128).max);

        _register("F1", fresh);
        vm.prank(dryerOperator);
        if (dried > fresh) {
            vm.expectRevert(
                abi.encodeWithSelector(BatchRegistry.WeightIncreased.selector, fresh, dried)
            );
            registry.updateDryingSession("F1", "OYO", DRYING, dried, "m");
        } else {
            registry.updateDryingSession("F1", "OYO", DRYING, dried, "m");
            assertLe(registry.getBatch("F1").currentWeight, fresh);
        }
    }

    // ------------------------------------------------------- access control --

    function test_RevertWhen_Unauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(BatchRegistry.Unauthorized.selector);
        registry.registerBatch("DRY-X", "OYO", 100, "ipfs://x");
    }

    function test_RevertWhen_WrongRoleForDrying() public {
        _advanceTo("R1", REGISTERED);
        vm.prank(logistics); // holds LOGISTICS, not DRYER_OPERATOR
        vm.expectRevert(BatchRegistry.Unauthorized.selector);
        registry.updateDryingSession("R1", "OYO", DRYING, 100, "m");
    }

    function test_RevertWhen_WrongRoleForLogistics() public {
        _advanceTo("R2", DRIED);
        vm.prank(dryerOperator); // holds DRYER_OPERATOR, not LOGISTICS
        vm.expectRevert(BatchRegistry.Unauthorized.selector);
        registry.updateLogistics("R2", "WH", DELIVERED, "m");
    }

    function test_RevertWhen_RevokedOperatorWrites() public {
        _advanceTo("R3", REGISTERED);
        bytes32 dryerRole = roleManager.DRYER_OPERATOR_ROLE();

        vm.prank(admin);
        roleManager.revokeRole(dryerRole, dryerOperator);

        vm.prank(dryerOperator);
        vm.expectRevert(BatchRegistry.Unauthorized.selector);
        registry.updateDryingSession("R3", "OYO", DRYING, 100, "m");
    }

    // ------------------------------------------------------ gas sponsorship --

    function test_MetaTx_GasSponsorship() public {
        bytes memory data = abi.encodeCall(
            BatchRegistry.registerBatch,
            ("DRY-META", "OYO", 300, "ipfs://meta")
        );

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

    /// The relayer pays gas but must not be able to act in its own name.
    function test_RevertWhen_RelayerActsDirectly() public {
        vm.prank(masterWallet);
        vm.expectRevert(BatchRegistry.Unauthorized.selector);
        registry.registerBatch("DRY-RELAY", "OYO", 100, "m");
    }

    // ---------------------------------------------------------- pause/upgrade --

    function test_Pause_BlocksEveryWrite() public {
        _advanceTo("P1", DRIED);

        vm.prank(admin);
        registry.pause();

        vm.prank(fieldOfficer);
        vm.expectRevert();
        registry.registerBatch("DRY-P", "OYO", 100, "m");

        vm.prank(logistics);
        vm.expectRevert();
        registry.updateLogistics("P1", "WH", DELIVERED, "m");

        vm.prank(admin);
        registry.unpause();
        _move("P1", DELIVERED);
        assertEq(uint8(registry.getBatchState("P1")), uint8(DELIVERED));
    }

    function test_RevertWhen_NonAdminPauses() public {
        vm.prank(stranger);
        vm.expectRevert(BatchRegistry.Unauthorized.selector);
        registry.pause();
    }

    function test_Upgrade_PreservesState() public {
        _register("DRY-UP", 400);

        BatchRegistryV2 newImpl = new BatchRegistryV2(address(forwarder));
        vm.prank(admin);
        registry.upgradeToAndCall(address(newImpl), "");

        BatchRegistryV2 upgraded = BatchRegistryV2(address(registry));
        assertEq(upgraded.version(), "v2");
        assertEq(upgraded.getBatch("DRY-UP").creator, fieldOfficer);
        assertEq(upgraded.totalBatches(), 1);
    }

    function test_RevertWhen_NonAdminUpgrades() public {
        BatchRegistryV2 newImpl = new BatchRegistryV2(address(forwarder));
        vm.prank(stranger);
        vm.expectRevert(BatchRegistry.Unauthorized.selector);
        registry.upgradeToAndCall(address(newImpl), "");
    }

    // ------------------------------------------------------ lock-out guards --

    function test_RevertWhen_AdminRenouncesAdminRole() public {
        bytes32 adminRole = roleManager.DEFAULT_ADMIN_ROLE();

        vm.prank(admin);
        vm.expectRevert(RoleManager.CannotRenounceAdmin.selector);
        roleManager.renounceRole(adminRole, admin);

        assertTrue(roleManager.hasRole(adminRole, admin));
    }

    function test_RevertWhen_AdminRevokesOwnAdminRole() public {
        bytes32 adminRole = roleManager.DEFAULT_ADMIN_ROLE();

        vm.prank(admin);
        vm.expectRevert(RoleManager.CannotRevokeOwnAdmin.selector);
        roleManager.revokeRole(adminRole, admin);

        assertTrue(roleManager.hasRole(adminRole, admin));
    }

    /// Removing an admin stays possible — it just takes a second admin.
    function test_SecondAdminCanRemoveTheFirst() public {
        bytes32 adminRole = roleManager.DEFAULT_ADMIN_ROLE();

        vm.prank(admin);
        roleManager.grantRole(adminRole, admin2);

        vm.prank(admin2);
        roleManager.revokeRole(adminRole, admin);

        assertFalse(roleManager.hasRole(adminRole, admin));
        assertTrue(roleManager.hasRole(adminRole, admin2));
    }

    /// Only the admin role is protected; operators may still walk away.
    function test_OperatorCanRenounceTheirOwnRole() public {
        bytes32 dryerRole = roleManager.DRYER_OPERATOR_ROLE();

        vm.prank(dryerOperator);
        roleManager.renounceRole(dryerRole, dryerOperator);
        assertFalse(roleManager.hasRole(dryerRole, dryerOperator));
    }

    function test_RevertWhen_StrangerGrantsRoles() public {
        bytes32 fieldRole = roleManager.FIELD_OFFICER_ROLE();

        vm.prank(stranger);
        vm.expectRevert();
        roleManager.grantRole(fieldRole, stranger);
    }

    // -------------------------------------------------------------- events --

    function test_EventsCarryIndexedBatchKey() public {
        bytes32 key = registry.batchKey("EV-1");
        assertEq(key, keccak256(bytes("EV-1")));

        vm.recordLogs();
        _register("EV-1", 100);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 1);
        // topic0 = signature, topic1 = indexed batch key
        assertEq(logs[0].topics[1], key, "batch key must be filterable");
    }
}

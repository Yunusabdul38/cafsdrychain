// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";
import {RoleManager} from "../src/RoleManager.sol";

/**
 * Upgrades the BatchRegistry proxy to the current implementation via UUPS.
 *
 * The broadcaster must hold DEFAULT_ADMIN_ROLE in the RoleManager.
 *
 * Env: PRIVATE_KEY, BATCH_REGISTRY_ADDRESS (proxy), FORWARDER_ADDRESS,
 *      ETHERSCAN_API_KEY (for --verify).
 *
 * Run: forge script script/UpgradeBatchRegistry.s.sol:UpgradeBatchRegistry \
 *        --rpc-url $RPC_URL --broadcast --verify
 *
 * Always pass --verify. Without it the new implementation is unverified, and
 * the explorer cannot decode this contract's event logs: every batch record
 * shows as raw hex instead of readable names. The proxy relinks to the new
 * implementation on its own once the implementation is verified.
 *
 * Verifying afterwards, if it was missed:
 *
 *   forge verify-contract <IMPLEMENTATION> src/BatchRegistry.sol:BatchRegistry \
 *     --chain-id 84532 \
 *     --constructor-args $(cast abi-encode "constructor(address)" $FORWARDER_ADDRESS) \
 *     --compiler-version 0.8.24 --num-of-optimizations 200 \
 *     --etherscan-api-key $ETHERSCAN_API_KEY --watch
 *
 * Deliberately upgrades to {BatchRegistry} itself. An earlier revision pointed
 * at the test mock `BatchRegistryV2`, which would have put a fixture on a live
 * proxy.
 */
contract UpgradeBatchRegistry is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxy = vm.envAddress("BATCH_REGISTRY_ADDRESS");
        address forwarder = vm.envAddress("FORWARDER_ADDRESS");

        BatchRegistry live = BatchRegistry(proxy);

        // --- pre-flight ------------------------------------------------------
        // The forwarder is immutable in the implementation's bytecode. Deploying
        // a new implementation with a different one silently breaks every
        // operator's gas-sponsored write, so refuse to proceed on a mismatch.
        require(
            live.isTrustedForwarder(forwarder),
            "Upgrade: FORWARDER_ADDRESS is not the forwarder this proxy trusts"
        );

        address admin = vm.addr(pk);
        RoleManager roles = live.roleManager();
        require(
            roles.hasRole(roles.DEFAULT_ADMIN_ROLE(), admin),
            "Upgrade: broadcaster does not hold DEFAULT_ADMIN_ROLE"
        );

        // Snapshot so the upgrade can be proven non-destructive.
        uint256 batchesBefore = live.totalBatches();
        address rolesBefore = address(roles);

        console.log("Proxy:              ", proxy);
        console.log("Admin:              ", admin);
        console.log("Batches before:     ", batchesBefore);

        // --- upgrade ---------------------------------------------------------
        vm.startBroadcast(pk);

        BatchRegistry newImpl = new BatchRegistry(forwarder);
        console.log("New implementation: ", address(newImpl));

        // No re-initialiser: this revision adds no storage.
        live.upgradeToAndCall(address(newImpl), "");

        vm.stopBroadcast();

        // --- post-flight -----------------------------------------------------
        require(live.totalBatches() == batchesBefore, "Upgrade: batch count changed");
        require(address(live.roleManager()) == rolesBefore, "Upgrade: roleManager changed");
        require(live.isTrustedForwarder(forwarder), "Upgrade: forwarder no longer trusted");

        console.log("Upgrade complete. State preserved.");
    }
}

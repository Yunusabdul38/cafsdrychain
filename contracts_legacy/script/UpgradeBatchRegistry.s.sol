// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";
import {BatchRegistryV2} from "../src/mocks/BatchRegistryV2.sol";

/**
 * Upgrades the BatchRegistry proxy to a new implementation via UUPS.
 * The broadcaster must hold DEFAULT_ADMIN_ROLE in the RoleManager.
 *
 * Env: PRIVATE_KEY, BATCH_REGISTRY_ADDRESS (proxy), FORWARDER_ADDRESS.
 *
 * Run: forge script script/UpgradeBatchRegistry.s.sol:UpgradeBatchRegistry \
 *        --rpc-url $RPC_URL --broadcast
 */
contract UpgradeBatchRegistry is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxy = vm.envAddress("BATCH_REGISTRY_ADDRESS");
        address forwarder = vm.envAddress("FORWARDER_ADDRESS");

        vm.startBroadcast(pk);

        // Deploy the new implementation (same forwarder as the current one).
        BatchRegistryV2 newImpl = new BatchRegistryV2(forwarder);
        console.log("New implementation:", address(newImpl));

        // Perform the upgrade through the proxy (no re-init call needed here).
        BatchRegistry(proxy).upgradeToAndCall(address(newImpl), "");
        console.log("Proxy", proxy, "upgraded to", address(newImpl));

        vm.stopBroadcast();
    }
}

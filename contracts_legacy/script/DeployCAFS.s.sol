// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";
import {DryChainForwarder} from "../src/DryChainForwarder.sol";

/**
 * Deploys the full upgradeable stack behind ERC1967 proxies:
 *   1. RoleManager implementation + proxy (initialize(admin))
 *   2. Trusted forwarder (uses FORWARDER_ADDRESS if set, else deploys one)
 *   3. BatchRegistry implementation + proxy (initialize(roleManager))
 *
 * Env: PRIVATE_KEY (required), FORWARDER_ADDRESS (optional), ADMIN_ADDRESS (optional).
 *
 * Run: forge script script/DeployCAFS.s.sol:DeployCAFS \
 *        --rpc-url $RPC_URL --broadcast --verify
 */
contract DeployCAFS is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);
        address forwarderAddress = vm.envOr("FORWARDER_ADDRESS", address(0));

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("Admin (roles owner):", admin);

        // 1. RoleManager (upgradeable)
        RoleManager roleManagerImpl = new RoleManager();
        ERC1967Proxy roleManagerProxy = new ERC1967Proxy(
            address(roleManagerImpl),
            abi.encodeCall(RoleManager.initialize, (admin))
        );
        console.log("RoleManager impl:", address(roleManagerImpl));
        console.log("RoleManager proxy:", address(roleManagerProxy));

        // 2. Trusted forwarder for gas sponsorship
        address forwarder = forwarderAddress;
        if (forwarder == address(0)) {
            forwarder = address(new DryChainForwarder());
            console.log("DryChainForwarder deployed:", forwarder);
        } else {
            console.log("Using external forwarder:", forwarder);
        }

        // 3. BatchRegistry (upgradeable) — forwarder baked into the implementation
        BatchRegistry batchRegistryImpl = new BatchRegistry(forwarder);
        ERC1967Proxy batchRegistryProxy = new ERC1967Proxy(
            address(batchRegistryImpl),
            abi.encodeCall(BatchRegistry.initialize, (address(roleManagerProxy)))
        );
        console.log("BatchRegistry impl:", address(batchRegistryImpl));
        console.log("BatchRegistry proxy:", address(batchRegistryProxy));

        vm.stopBroadcast();

        console.log("\n--- Save these addresses ---");
        console.log("ROLE_MANAGER_ADDRESS=", address(roleManagerProxy));
        console.log("BATCH_REGISTRY_ADDRESS=", address(batchRegistryProxy));
        console.log("FORWARDER_ADDRESS=", forwarder);
    }
}

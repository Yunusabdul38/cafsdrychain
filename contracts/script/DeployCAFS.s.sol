// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {BatchRegistry} from "../src/BatchRegistry.sol";

contract DeployCAFS is Script {
    function run() external {
        // Retrieve private key and optional forwarder address from .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address forwarderAddress = vm.envOr("FORWARDER_ADDRESS", address(0));

        // Start broadcasting transactions to the network
        vm.startBroadcast(deployerPrivateKey);
        
        address admin = vm.addr(deployerPrivateKey);
        console.log("Deploying contracts with Admin Address:", admin);

        // 1. Deploy RoleManager
        RoleManager roleManager = new RoleManager(admin);
        console.log("RoleManager deployed to:", address(roleManager));

        // 2. Deploy BatchRegistry
        BatchRegistry batchRegistry = new BatchRegistry(forwarderAddress, address(roleManager));
        console.log("BatchRegistry deployed to:", address(batchRegistry));

        // Note: Field Officers, Dryer Operators, and Logistics Roles 
        // will need to be granted via the RoleManager later.

        vm.stopBroadcast();
    }
}

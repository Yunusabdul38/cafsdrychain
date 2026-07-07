// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RoleManagerUpgradeable} from "../src/RoleManagerUpgradeable.sol";
import {BatchRegistryUpgradeable} from "../src/BatchRegistryUpgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployCAFS is Script {
    function run() external {
        // Retrieve private key and optional forwarder address from .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address forwarderAddress = vm.envOr("FORWARDER_ADDRESS", address(0));

        // Start broadcasting transactions to the network
        vm.startBroadcast(deployerPrivateKey);
        
        address admin = vm.addr(deployerPrivateKey);
        console.log("Deploying contracts with Admin Address:", admin);

        // 1. Deploy RoleManager Implementation and Proxy
        RoleManagerUpgradeable roleManagerImplementation = new RoleManagerUpgradeable();
        ERC1967Proxy roleManagerProxy = new ERC1967Proxy(
            address(roleManagerImplementation),
            abi.encodeWithSelector(RoleManagerUpgradeable.initialize.selector, admin)
        );
        RoleManagerUpgradeable roleManager = RoleManagerUpgradeable(address(roleManagerProxy));
        console.log("RoleManager Proxy deployed to:", address(roleManager));

        // 2. Deploy BatchRegistry Implementation and Proxy
        BatchRegistryUpgradeable batchRegistryImplementation = new BatchRegistryUpgradeable(forwarderAddress);
        ERC1967Proxy batchRegistryProxy = new ERC1967Proxy(
            address(batchRegistryImplementation),
            abi.encodeWithSelector(BatchRegistryUpgradeable.initialize.selector, address(roleManager))
        );
        BatchRegistryUpgradeable batchRegistry = BatchRegistryUpgradeable(address(batchRegistryProxy));
        console.log("BatchRegistry Proxy deployed to:", address(batchRegistry));

        vm.stopBroadcast();
    }
}

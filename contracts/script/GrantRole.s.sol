// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RoleManager} from "../src/RoleManager.sol";

/**
 * Grants a role to a (deterministically-derived) operator wallet.
 * The backend calls this — or the equivalent RoleManager.grantRole tx — every
 * time an admin provisions a new operator.
 *
 * Env:
 *   PRIVATE_KEY           admin key (holds DEFAULT_ADMIN_ROLE)
 *   ROLE_MANAGER_ADDRESS  RoleManager proxy
 *   GRANTEE               wallet to authorise
 *   ROLE                  one of: FIELD_OFFICER | DRYER_OPERATOR | LOGISTICS
 *
 * Run: forge script script/GrantRole.s.sol:GrantRole --rpc-url $RPC_URL --broadcast
 */
contract GrantRole is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        RoleManager rm = RoleManager(vm.envAddress("ROLE_MANAGER_ADDRESS"));
        address grantee = vm.envAddress("GRANTEE");
        string memory roleName = vm.envString("ROLE");

        bytes32 role = _resolveRole(rm, roleName);

        vm.startBroadcast(pk);
        rm.grantRole(role, grantee);
        vm.stopBroadcast();

        console.log("Granted", roleName, "to", grantee);
    }

    function _resolveRole(RoleManager rm, string memory name) internal view returns (bytes32) {
        bytes32 h = keccak256(bytes(name));
        if (h == keccak256("FIELD_OFFICER")) return rm.FIELD_OFFICER_ROLE();
        if (h == keccak256("DRYER_OPERATOR")) return rm.DRYER_OPERATOR_ROLE();
        if (h == keccak256("LOGISTICS")) return rm.LOGISTICS_ROLE();
        revert("Unknown ROLE (use FIELD_OFFICER | DRYER_OPERATOR | LOGISTICS)");
    }
}

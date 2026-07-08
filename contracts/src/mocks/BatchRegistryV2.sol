// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BatchRegistry} from "../BatchRegistry.sol";

/**
 * @dev Example V2 implementation used to prove UUPS upgrades preserve state.
 *      Adds one new function + one new storage variable (consuming a __gap slot
 *      would be the pattern for same-contract growth; as a subclass it is
 *      appended after the parent layout, which is upgrade-safe).
 */
contract BatchRegistryV2 is BatchRegistry {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder) BatchRegistry(trustedForwarder) {}

    function version() external pure returns (string memory) {
        return "v2";
    }
}

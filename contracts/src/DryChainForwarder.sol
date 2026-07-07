// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC2771Forwarder} from "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title DryChainForwarder
 * @notice Self-hosted EIP-712 trusted forwarder for gas sponsorship.
 *
 * Deploy this if you are NOT using a third-party relayer (Biconomy / Gelato).
 * The operator wallet signs a ForwardRequest; the master/relayer wallet calls
 * {execute} and pays gas. Not upgradeable by design — a forwarder must have
 * fixed, auditable verification logic for the registry to safely trust it.
 */
contract DryChainForwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("DryChainForwarder") {}
}

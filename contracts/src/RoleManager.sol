// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title RoleManager
 * @notice Central, UUPS-upgradeable access-control authority for CAFS DryChain.
 *
 * The admin (DEFAULT_ADMIN_ROLE) provisions every other actor. When the backend
 * creates a new operator it derives a deterministic wallet and the admin grants
 * that wallet the appropriate role here — so a wallet can only write to the
 * BatchRegistry after it has been explicitly authorised on-chain.
 *
 * Upgrades are gated by UPGRADER_ROLE (held by the admin / a multisig).
 */
contract RoleManager is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant FIELD_OFFICER_ROLE = keccak256("FIELD_OFFICER_ROLE");
    bytes32 public constant DRYER_OPERATOR_ROLE = keccak256("DRYER_OPERATOR_ROLE");
    bytes32 public constant LOGISTICS_ROLE = keccak256("LOGISTICS_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @param defaultAdmin address granted DEFAULT_ADMIN_ROLE and UPGRADER_ROLE.
     *                     Use a multisig / KMS-backed admin wallet in production.
     */
    function initialize(address defaultAdmin) external initializer {
        require(defaultAdmin != address(0), "RoleManager: zero admin");

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(UPGRADER_ROLE, defaultAdmin);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    /// @dev Reserved storage for future upgrades.
    uint256[50] private __gap;
}

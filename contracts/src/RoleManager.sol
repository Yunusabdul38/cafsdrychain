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
 *
 * ## Lock-out protection
 *
 * DEFAULT_ADMIN_ROLE is the only route to granting operators, pausing the
 * registry and authorising upgrades. Losing the last holder would freeze the
 * system permanently with no recovery, so two paths that would allow it are
 * closed: admins cannot renounce that role, and cannot revoke it from
 * themselves. Removing an admin therefore always requires a second one.
 *
 * @custom:security-contact support@cafsdrychain.com
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

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(UPGRADER_ROLE, defaultAdmin);
    }

    error CannotRenounceAdmin();
    error CannotRevokeOwnAdmin();
    error ZeroAddress();

    /**
     * @dev Renouncing the admin role is refused outright.
     *
     * AccessControl allows an account to walk away from a role. For every other
     * role that is fine; for this one it is how a system becomes permanently
     * unadministrable. Other roles renounce as normal.
     */
    function renounceRole(bytes32 role, address callerConfirmation)
        public
        override
    {
        if (role == DEFAULT_ADMIN_ROLE) revert CannotRenounceAdmin();
        super.renounceRole(role, callerConfirmation);
    }

    /**
     * @dev An admin cannot strip their own admin role.
     *
     * Only an admin may revoke it, so requiring the target to be someone else
     * guarantees at least one admin always remains.
     */
    function revokeRole(bytes32 role, address account)
        public
        override
    {
        if (role == DEFAULT_ADMIN_ROLE && account == _msgSender()) {
            revert CannotRevokeOwnAdmin();
        }
        super.revokeRole(role, account);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        if (newImplementation == address(0)) revert ZeroAddress();
    }

    /// @dev Reserved storage for future upgrades.
    uint256[50] private __gap;
}

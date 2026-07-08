// Minimal ABIs for the deployed contracts (see /contracts).

export const ROLE_MANAGER_ABI = [
  'function FIELD_OFFICER_ROLE() view returns (bytes32)',
  'function DRYER_OPERATOR_ROLE() view returns (bytes32)',
  'function LOGISTICS_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)',
] as const;

export const BATCH_REGISTRY_ABI = [
  'function registerBatch(string batchId, string facilityId, uint256 freshWeight, string metadataHash)',
  'function updateDryingSession(string batchId, string facilityId, uint8 newState, uint256 currentWeight, string metadataHash)',
  'function updateLogistics(string batchId, string facilityId, uint8 newState, string metadataHash)',
  'function isBatchExists(string batchId) view returns (bool)',
  'function verifyMetadata(string batchId, string metadataHash) view returns (bool)',
  'function getBatchState(string batchId) view returns (uint8)',
] as const;

// OpenZeppelin v5 ERC2771Forwarder
export const FORWARDER_ABI = [
  'function nonces(address owner) view returns (uint256)',
  'function execute((address from,address to,uint256 value,uint256 gas,uint48 deadline,bytes data,bytes signature) request) payable',
  'function verify((address from,address to,uint256 value,uint256 gas,uint48 deadline,bytes data,bytes signature) request) view returns (bool)',
] as const;

// EIP-712 types for the OZ v5 ForwardRequest (nonce is part of the signed struct).
export const FORWARD_REQUEST_TYPES = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint48' },
    { name: 'data', type: 'bytes' },
  ],
} as const;

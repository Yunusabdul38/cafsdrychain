import { env } from '../env.js';
import { logger } from '../lib/logger.js';
import { FORWARD_REQUEST_TYPES } from './abi.js';
import { batchRegistry, chainEnabled, forwarder, roleManager } from './client.js';
import { deriveSigner } from './derivation.js';

/**
 * Gas sponsorship via ERC-2771: the operator's derived wallet signs a
 * ForwardRequest (no gas, no seed phrase held by the user) and the master/
 * relayer wallet submits it, paying the fee. On-chain, `_msgSender()` resolves
 * to the operator's EOA — so the operator wallet is the recorded signer.
 */

export type RelayResult = { txHash: string | null; status: 'CONFIRMED' | 'FAILED' | 'SKIPPED' };

const SKIPPED: RelayResult = { txHash: null, status: 'SKIPPED' };

/** Grant an operator wallet the roles it needs for the full batch lifecycle. */
export async function grantOperatorRoles(address: string): Promise<string[]> {
  if (!chainEnabled()) return [];
  const rm = roleManager();
  const roles: string[] = [
    await rm.FIELD_OFFICER_ROLE(),
    await rm.DRYER_OPERATOR_ROLE(),
    await rm.LOGISTICS_ROLE(),
  ];
  const hashes: string[] = [];
  for (const role of roles) {
    if (await rm.hasRole(role, address)) continue;
    const tx = await rm.grantRole(role, address);
    await tx.wait();
    hashes.push(tx.hash);
  }
  return hashes;
}

async function relay(index: number, data: string): Promise<RelayResult> {
  if (!chainEnabled() || !env.FORWARDER_ADDRESS) return SKIPPED;
  try {
    const signer = deriveSigner(index); // re-derive operator key to sign, then discard
    const fwd = forwarder();
    const from = signer.address;
    const to = env.BATCH_REGISTRY_ADDRESS as string;
    const nonce: bigint = await fwd.nonces(from);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const gas = 600_000n;

    const domain = {
      name: 'DryChainForwarder',
      version: '1',
      chainId: env.CHAIN_ID,
      verifyingContract: env.FORWARDER_ADDRESS,
    };

    const message = { from, to, value: 0n, gas, nonce, deadline, data };
    const signature = await signer.signTypedData(domain, FORWARD_REQUEST_TYPES as never, message);

    // execute() struct omits nonce (read internally); signature covers it.
    const requestData = { from, to, value: 0n, gas, deadline, data, signature };
    const tx = await fwd.execute(requestData);
    const receipt = await tx.wait();
    return { txHash: tx.hash, status: receipt?.status === 1 ? 'CONFIRMED' : 'FAILED' };
  } catch (err) {
    logger.error({ err }, 'meta-tx relay failed');
    return { txHash: null, status: 'FAILED' };
  }
}

// On-chain BatchState: 0 Registered,1 DryingStarted,2 DryingCompleted,3 InStorage,4 InTransit,5 Delivered

export function relayRegister(
  index: number,
  batchId: string,
  facilityId: string,
  freshWeight: number,
  metadataHash: string
): Promise<RelayResult> {
  const data = batchRegistry().interface.encodeFunctionData('registerBatch', [
    batchId,
    facilityId,
    BigInt(Math.round(freshWeight)),
    metadataHash,
  ]);
  return relay(index, data);
}

export function relayDrying(
  index: number,
  batchId: string,
  facilityId: string,
  state: 1 | 2,
  currentWeight: number,
  metadataHash: string
): Promise<RelayResult> {
  const data = batchRegistry().interface.encodeFunctionData('updateDryingSession', [
    batchId,
    facilityId,
    state,
    BigInt(Math.round(currentWeight)),
    metadataHash,
  ]);
  return relay(index, data);
}

export function relayLogistics(
  index: number,
  batchId: string,
  facilityId: string,
  state: 3 | 4 | 5,
  metadataHash: string
): Promise<RelayResult> {
  const data = batchRegistry().interface.encodeFunctionData('updateLogistics', [
    batchId,
    facilityId,
    state,
    metadataHash,
  ]);
  return relay(index, data);
}

export async function verifyOnChain(batchId: string, metadataHash: string): Promise<boolean> {
  if (!chainEnabled()) return false;
  try {
    return await batchRegistry().verifyMetadata(batchId, metadataHash);
  } catch {
    return false;
  }
}

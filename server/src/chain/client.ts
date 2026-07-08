import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { env } from '../env.js';
import { BATCH_REGISTRY_ABI, FORWARDER_ABI, ROLE_MANAGER_ABI } from './abi.js';

/**
 * Lazily-constructed chain clients. The whole system runs off-chain (DB only)
 * until CHAIN_ENABLED=true and the addresses/keys are configured, so the app is
 * usable before the contracts are deployed.
 */

export function chainEnabled(): boolean {
  return Boolean(
    env.CHAIN_ENABLED &&
      env.RPC_URL &&
      env.RELAYER_PRIVATE_KEY &&
      env.ROLE_MANAGER_ADDRESS &&
      env.BATCH_REGISTRY_ADDRESS
  );
}

let _provider: JsonRpcProvider | null = null;
export function provider(): JsonRpcProvider {
  if (!_provider) _provider = new JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  return _provider;
}

let _relayer: Wallet | null = null;
/** Master / relayer wallet — pays gas and holds the admin role on-chain. */
export function relayer(): Wallet {
  if (!_relayer) _relayer = new Wallet(env.RELAYER_PRIVATE_KEY as string, provider());
  return _relayer;
}

export function roleManager(): Contract {
  return new Contract(env.ROLE_MANAGER_ADDRESS as string, ROLE_MANAGER_ABI, relayer());
}

/** Read-only registry, bound to the provider (writes go via the forwarder). */
export function batchRegistry(): Contract {
  return new Contract(env.BATCH_REGISTRY_ADDRESS as string, BATCH_REGISTRY_ABI, provider());
}

export function forwarder(): Contract {
  return new Contract(env.FORWARDER_ADDRESS as string, FORWARDER_ABI, relayer());
}

import { HDNodeWallet, Mnemonic, type Provider } from 'ethers';
import { env } from '../env.js';

/**
 * Deterministic HD wallet derivation.
 *
 *   wallet(index) = f(master_seed, index)  at  m/44'/coin'/0'/0/index
 *
 * The master seed lives only in memory (from env; KMS/HSM in production) and
 * never leaves this process. Individual private keys are NEVER persisted —
 * they are re-derived on demand and discarded after signing.
 */

function requireMnemonic(): Mnemonic {
  if (!env.MASTER_MNEMONIC) {
    throw new Error('MASTER_MNEMONIC is not configured — cannot derive wallets');
  }
  return Mnemonic.fromPhrase(env.MASTER_MNEMONIC.trim());
}

export function derivationPath(index: number): string {
  return `m/44'/${env.COIN_TYPE}'/0'/0/${index}`;
}

/** Derive only the public address for an index (no key retained). */
export function deriveAddress(index: number): string {
  const node = HDNodeWallet.fromMnemonic(requireMnemonic(), derivationPath(index));
  const address = node.address;
  return address;
}

/**
 * Re-derive a signer for an index. The caller must use it immediately and let
 * it go out of scope so the key is garbage-collected — never store it.
 */
export function deriveSigner(index: number, provider?: Provider): HDNodeWallet {
  const node = HDNodeWallet.fromMnemonic(requireMnemonic(), derivationPath(index));
  return provider ? node.connect(provider) : node;
}

export function isDerivationConfigured(): boolean {
  return Boolean(env.MASTER_MNEMONIC);
}

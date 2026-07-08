import { HDNodeWallet, Mnemonic, type Provider } from 'ethers';
import { env } from '../env.js';

/**
 * Deterministic HD wallet derivation.
 *
 *   address(index) = m/44'/coin'/0'/0/index
 *
 * Two modes:
 *  - MASTER_XPUB  → watch-only. Derives addresses without any signing ability.
 *                   Preferred for the API server (a breach leaks addresses only).
 *  - MASTER_MNEMONIC → full seed. Required to SIGN meta-transactions. Keep this
 *                   on the signer service only (KMS/HSM in production).
 *
 * When both are set, addresses come from the xpub and signing uses the seed —
 * they derive the same addresses.
 */

function accountPath(): string {
  return `m/44'/${env.COIN_TYPE}'/0'`;
}

export function derivationPath(index: number): string {
  return `m/44'/${env.COIN_TYPE}'/0'/0/${index}`;
}

/** Derive an address only. Uses the xpub if available, else the mnemonic. */
export function deriveAddress(index: number): string {
  if (env.MASTER_XPUB) {
    const account = HDNodeWallet.fromExtendedKey(env.MASTER_XPUB.trim());
    // Relative to the account node: 0/<index>  ==  m/44'/coin'/0'/0/index
    return account.deriveChild(0).deriveChild(index).address;
  }
  if (env.MASTER_MNEMONIC) {
    return deriveSigner(index).address;
  }
  throw new Error('Configure MASTER_XPUB (address-only) or MASTER_MNEMONIC (signing)');
}

/**
 * Re-derive a signer for an index — REQUIRES the mnemonic. Use it immediately
 * and let it go out of scope so the key is garbage-collected; never store it.
 */
export function deriveSigner(index: number, provider?: Provider): HDNodeWallet {
  if (!env.MASTER_MNEMONIC) {
    throw new Error('MASTER_MNEMONIC not set — this instance is watch-only (xpub) and cannot sign');
  }
  const node = HDNodeWallet.fromMnemonic(
    Mnemonic.fromPhrase(env.MASTER_MNEMONIC.trim()),
    derivationPath(index)
  );
  return provider ? node.connect(provider) : node;
}

/** Can this instance derive addresses at all? */
export function isDerivationConfigured(): boolean {
  return Boolean(env.MASTER_XPUB || env.MASTER_MNEMONIC);
}

/** Can this instance sign (i.e. is it holding the seed)? */
export function canSign(): boolean {
  return Boolean(env.MASTER_MNEMONIC);
}

export { accountPath };

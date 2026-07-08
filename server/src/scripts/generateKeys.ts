/**
 * Generate deterministic-wallet key material for CAFS DryChain.
 *
 * Usage:
 *   npm run keys                              # fresh 12-word mnemonic + xpub
 *   npm run keys -- "your existing twelve word mnemonic ..."   # xpub from existing
 *   COIN_TYPE=60 npm run keys                 # override BIP-44 coin type
 *
 * Prints (copy into the RIGHT place):
 *   MASTER_MNEMONIC  -> SECRET. Signer service only. KMS/HSM in production.
 *   MASTER_XPUB      -> Safe for the API server. Watch-only address derivation.
 *
 * This script is standalone — it does NOT load the app's .env, so you can run it
 * before anything else is configured.
 */
import { HDNodeWallet, Mnemonic, randomBytes } from 'ethers';

const COIN = Number(process.env.COIN_TYPE ?? 60);
const ACCOUNT_PATH = `m/44'/${COIN}'/0'`;

function main() {
  const arg = process.argv.slice(2).join(' ').trim();
  const mnemonic = arg ? Mnemonic.fromPhrase(arg) : Mnemonic.fromEntropy(randomBytes(16));

  // Account-level node (m/44'/coin'/0'). Its neutered form is the xpub.
  const account = HDNodeWallet.fromMnemonic(mnemonic, ACCOUNT_PATH);
  const voidAccount = account.neuter(); // public-only
  const xpub = voidAccount.extendedKey;

  // Prove the xpub (watch-only) derives the SAME addresses the signer will use.
  const sample = [1, 2, 3].map((i) => ({
    index: i,
    path: `${ACCOUNT_PATH}/0/${i}`,
    fromXpub: voidAccount.deriveChild(0).deriveChild(i).address,
    fromSeed: account.deriveChild(0).deriveChild(i).address,
  }));

  console.log('\n=== CAFS DryChain wallet keys ===');
  console.log(`BIP-44 coin type : ${COIN}`);
  console.log(`Account path     : ${ACCOUNT_PATH}`);
  console.log(`User wallet path : ${ACCOUNT_PATH}/0/<index>\n`);

  console.log('# ---- SECRET (signer service ONLY — never commit, use KMS/HSM) ----');
  console.log(`MASTER_MNEMONIC="${mnemonic.phrase}"\n`);

  console.log('# ---- Safe for the API server (watch-only address derivation) ----');
  console.log(`MASTER_XPUB="${xpub}"\n`);

  console.log('Sanity check (xpub-derived == seed-derived):');
  for (const s of sample) {
    const ok = s.fromXpub.toLowerCase() === s.fromSeed.toLowerCase();
    console.log(`  #${s.index}  ${s.fromXpub}  ${ok ? '✓' : '✗ MISMATCH'}  (${s.path})`);
  }
  console.log('\nStore the mnemonic in a secrets manager. Rotate per environment.\n');
}

main();

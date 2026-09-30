import { env } from '../env.js';

const EXPLORERS: Record<number, string> = {
  8453: 'https://basescan.org',
  84532: 'https://sepolia.basescan.org',
};

/** The explorer for the chain in CHAIN_ID, or null for a chain not listed above. */
export const explorerUrl: string | null = EXPLORERS[env.CHAIN_ID] ?? null;

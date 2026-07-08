import { id as keccakUtf8 } from 'ethers';

/**
 * Deterministic keccak256 hash of an off-chain record. Stored on-chain so anyone
 * can re-hash the canonical record and prove it was not tampered with.
 */
export function metadataHash(record: Record<string, unknown>): string {
  return keccakUtf8(canonicalize(record));
}

/** Stable JSON stringify with sorted keys so the hash is reproducible. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

import argon2 from 'argon2';
import crypto from 'node:crypto';

// Argon2id — memory-hard, resistant to GPU cracking.
const options: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, options);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** Generate a random temporary password for admin-provisioned accounts. */
export function generateTempPassword(): string {
  // 12 URL-safe chars, no ambiguity issues for onboarding emails.
  return crypto.randomBytes(9).toString('base64url');
}

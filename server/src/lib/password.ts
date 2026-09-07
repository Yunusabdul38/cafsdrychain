import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

export async function hashPassword(plain: string): Promise<string> {
  const salt = (await randomBytes(16)).toString('hex');
  const derivedKey = (await scrypt(plain, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    if (hash.startsWith('$argon2')) {
      const argon2 = await import('argon2');
      return await argon2.default.verify(hash, plain);
    }
    const [algo, salt, key] = hash.split(':');
    if (algo !== 'scrypt' || !salt || !key) return false;
    const derivedKey = (await scrypt(plain, salt, 64)) as Buffer;
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
  } catch {
    return false;
  }
}

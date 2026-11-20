import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { env } from '../config/env';

const scrypt = promisify(scryptCallback);

function getEncryptionKey(): Buffer {
  const value = env.tokenEncryptionKey;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string.');
  }
  return Buffer.from(value, 'hex');
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 */
export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encryptedValue = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    encryptedValue: encryptedValue.toString('base64'),
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 */
export function decryptSecret(encryptedValue: string, iv: string, tag: string): string {
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Encrypts an OAuth token for database storage.
 */
export function encryptToken(token: string) {
  const { encryptedValue, iv, tag } = encryptSecret(token);
  return { encryptedToken: encryptedValue, tokenIv: iv, tokenTag: tag };
}

/**
 * Decrypts a stored OAuth token.
 */
export function decryptToken(encryptedToken: string, tokenIv: string, tokenTag: string): string {
  return decryptSecret(encryptedToken, tokenIv, tokenTag);
}

/**
 * Hashes a user password with a random 16-byte salt using Node's native scrypt KDF.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored `scrypt:<salt>:<hash>` record using timing-safe equality.
 */
export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  if (!storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const [, salt, keyHex] = parts;
  if (!salt || !keyHex || !/^[a-fA-F0-9]+$/.test(keyHex)) return false;

  try {
    const storedKey = Buffer.from(keyHex, 'hex');
    const derivedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;
    return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}

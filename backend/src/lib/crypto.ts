import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env';

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

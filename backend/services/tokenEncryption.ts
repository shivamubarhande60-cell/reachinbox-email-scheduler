import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function getKey() {
  const value = process.env.TOKEN_ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string.');
  }
  return Buffer.from(value, 'hex');
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encryptedValue = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    encryptedValue: encryptedValue.toString('base64'),
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptSecret(encryptedValue: string, iv: string, tag: string) {
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptToken(token: string) {
  const { encryptedValue, iv, tag } = encryptSecret(token);
  return { encryptedToken: encryptedValue, tokenIv: iv, tokenTag: tag };
}

export function decryptToken(encryptedToken: string, tokenIv: string, tokenTag: string) {
  return decryptSecret(encryptedToken, tokenIv, tokenTag);
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function deriveKey(secret: string) {
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plaintext: string, encryptionKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(encryptionKey), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload: string, encryptionKey: string) {
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Invalid encrypted secret payload.');
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    deriveKey(encryptionKey),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

import { createPasswordHash, verifyPassword } from './crypto.util';

/**
 * Generate a 24-character recovery key
 * Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 */
export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0,O,1,I)
  let key = '';

  for (let i = 0; i < 24; i++) {
    if (i > 0 && i % 4 === 0) {
      key += '-';
    }
    key += chars[Math.floor(Math.random() * chars.length)];
  }

  return key;
}

/**
 * Hash recovery key (same as password hashing)
 */
export async function hashRecoveryKey(key: string): Promise<string> {
  return await createPasswordHash(key);
}

/**
 * Verify recovery key
 */
export async function verifyRecoveryKey(key: string, hash: string): Promise<boolean> {
  return await verifyPassword(key, hash);
}
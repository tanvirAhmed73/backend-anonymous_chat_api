import { randomBytes } from 'node:crypto';

/** Public user id: `usr_` + random suffix (contract-style). */
export function generateUserId(): string {
  return `usr_${randomBytes(9).toString('base64url')}`;
}

/** Opaque bearer token (stored only in Redis). */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

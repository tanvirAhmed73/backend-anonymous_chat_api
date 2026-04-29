/**
 * Machine-readable error codes for API responses (contract: SNAKE_CASE).
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_NAME_TAKEN: 'ROOM_NAME_TAKEN',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  MESSAGE_EMPTY: 'MESSAGE_EMPTY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeId = (typeof ErrorCodes)[keyof typeof ErrorCodes];

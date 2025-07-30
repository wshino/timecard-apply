export class KingOfTimeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'KingOfTimeError';
  }
}

export const ErrorCodes = {
  LOGIN_FAILED: 'LOGIN_FAILED',
  SESSION_TIMEOUT: 'SESSION_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
import { logger } from './logger';

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
  shouldRetry: () => true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${opts.maxAttempts}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === opts.maxAttempts) {
        logger.error(`All ${opts.maxAttempts} attempts failed`, { error: error.message });
        throw error;
      }
      
      if (opts.shouldRetry && !opts.shouldRetry(error)) {
        logger.warn('Error is not retryable', { error: error.message });
        throw error;
      }
      
      const delay = opts.delayMs * Math.pow(opts.backoffFactor || 1, attempt - 1);
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, { 
        error: error.message,
        nextAttempt: attempt + 1,
        delay,
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.message?.includes('net::') || error.message?.includes('NS_ERROR_')) {
    return true;
  }
  
  // Timeout errors
  if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
    return true;
  }
  
  // Temporary server errors
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }
  
  // Rate limiting
  if (error.statusCode === 429) {
    return true;
  }
  
  // Connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    return true;
  }
  
  return false;
}
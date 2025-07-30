import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, isRetryableError } from '../../src/utils/retry';

describe('Retry Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');
      
      const result = await withRetry(fn, { delayMs: 10 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(withRetry(fn, { maxAttempts: 2, delayMs: 10 }))
        .rejects.toThrow('Always fails');
      
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry if shouldRetry returns false', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Non-retryable'));
      const shouldRetry = vi.fn().mockReturnValue(false);
      
      await expect(withRetry(fn, { shouldRetry, delayMs: 10 }))
        .rejects.toThrow('Non-retryable');
      
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should apply exponential backoff', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');
      
      const start = Date.now();
      const result = await withRetry(fn, { 
        delayMs: 10, 
        backoffFactor: 2,
        maxAttempts: 3 
      });
      const duration = Date.now() - start;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      // First retry: 10ms, Second retry: 20ms, Total minimum: 30ms
      expect(duration).toBeGreaterThanOrEqual(30);
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(isRetryableError(new Error('net::ERR_CONNECTION_REFUSED'))).toBe(true);
      expect(isRetryableError(new Error('NS_ERROR_FAILURE'))).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true);
      expect(isRetryableError(new Error('Operation Timeout'))).toBe(true);
    });

    it('should identify server errors as retryable', () => {
      expect(isRetryableError({ statusCode: 500 })).toBe(true);
      expect(isRetryableError({ statusCode: 503 })).toBe(true);
    });

    it('should identify rate limiting as retryable', () => {
      expect(isRetryableError({ statusCode: 429 })).toBe(true);
    });

    it('should identify connection errors as retryable', () => {
      expect(isRetryableError({ code: 'ECONNREFUSED' })).toBe(true);
      expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
    });

    it('should not retry on client errors', () => {
      expect(isRetryableError({ statusCode: 400 })).toBe(false);
      expect(isRetryableError({ statusCode: 404 })).toBe(false);
      expect(isRetryableError(new Error('Invalid input'))).toBe(false);
    });
  });
});
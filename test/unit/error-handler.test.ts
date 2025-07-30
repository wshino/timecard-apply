import { describe, it, expect, vi } from 'vitest';
import { Page } from 'playwright';
import {
  handleLoginError,
  checkSessionTimeout,
  handleNetworkError,
  handleElementNotFound,
} from '../../src/utils/error-handler';
import { ErrorCodes } from '../../src/types';

describe('Error Handler', () => {
  describe('handleLoginError', () => {
    it('should throw error with login error message from page', async () => {
      const mockPage = {
        locator: vi.fn().mockReturnValue({
          textContent: vi.fn().mockResolvedValue('Invalid credentials'),
        }),
      } as unknown as Page;

      await expect(handleLoginError(mockPage, new Error('Test error')))
        .rejects.toThrow('Login failed: Invalid credentials');
    });

    it('should throw generic error when no error message on page', async () => {
      const mockPage = {
        locator: vi.fn().mockReturnValue({
          textContent: vi.fn().mockRejectedValue(new Error()),
        }),
      } as unknown as Page;

      await expect(handleLoginError(mockPage, new Error('Test error')))
        .rejects.toThrow('Login failed: Unknown error');
    });
  });

  describe('checkSessionTimeout', () => {
    it('should return true when login form is visible and URL contains login', async () => {
      const mockPage = {
        locator: vi.fn().mockReturnValue({
          isVisible: vi.fn().mockResolvedValue(true),
        }),
        url: vi.fn().mockReturnValue('https://example.com/login/timeout'),
      } as unknown as Page;

      const result = await checkSessionTimeout(mockPage);
      expect(result).toBe(true);
    });

    it('should return false when login form is not visible', async () => {
      const mockPage = {
        locator: vi.fn().mockReturnValue({
          isVisible: vi.fn().mockResolvedValue(false),
        }),
        url: vi.fn().mockReturnValue('https://example.com/dashboard'),
      } as unknown as Page;

      const result = await checkSessionTimeout(mockPage);
      expect(result).toBe(false);
    });

    it('should return false when URL is admin login page', async () => {
      const mockPage = {
        locator: vi.fn().mockReturnValue({
          isVisible: vi.fn().mockResolvedValue(true),
        }),
        url: vi.fn().mockReturnValue('https://example.com/login/admin'),
      } as unknown as Page;

      const result = await checkSessionTimeout(mockPage);
      expect(result).toBe(false);
    });
  });

  describe('handleNetworkError', () => {
    it('should throw KingOfTimeError for network errors', () => {
      const error = new Error('net::ERR_CONNECTION_REFUSED');
      
      expect(() => handleNetworkError(error)).toThrow('Network connection error occurred');
    });

    it('should throw KingOfTimeError for NS errors', () => {
      const error = new Error('NS_ERROR_FAILURE');
      
      expect(() => handleNetworkError(error)).toThrow('Network connection error occurred');
    });

    it('should rethrow non-network errors', () => {
      const error = new Error('Some other error');
      
      expect(() => handleNetworkError(error)).toThrow('Some other error');
    });
  });

  describe('handleElementNotFound', () => {
    it('should throw error with selector only', () => {
      expect(() => handleElementNotFound('#submit-button'))
        .toThrow('Element not found: #submit-button');
    });

    it('should throw error with selector and context', () => {
      expect(() => handleElementNotFound('#submit-button', 'login form'))
        .toThrow('Element not found: #submit-button in login form');
    });

    it('should have correct error code', () => {
      try {
        handleElementNotFound('#test');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCodes.ELEMENT_NOT_FOUND);
        expect(error.details).toEqual({ selector: '#test', context: undefined });
      }
    });
  });
});
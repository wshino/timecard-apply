import { Page } from 'playwright';
import { KingOfTimeError, ErrorCodes } from '../types';

export async function handleLoginError(page: Page, error: any): Promise<never> {
  const errorMessage = await page.locator('.error-message').textContent().catch(() => null);
  
  if (errorMessage) {
    throw new KingOfTimeError(
      `Login failed: ${errorMessage}`,
      ErrorCodes.LOGIN_FAILED,
      { originalError: error }
    );
  }
  
  throw new KingOfTimeError(
    'Login failed: Unknown error',
    ErrorCodes.LOGIN_FAILED,
    { originalError: error }
  );
}

export async function checkSessionTimeout(page: Page): Promise<boolean> {
  const loginForm = await page.locator('input[name="login_id"]').isVisible().catch(() => false);
  if (loginForm) {
    const currentUrl = page.url();
    if (currentUrl.includes('login') && !currentUrl.includes('admin')) {
      return true;
    }
  }
  return false;
}

export function handleNetworkError(error: any): never {
  if (error.message?.includes('net::') || error.message?.includes('NS_ERROR_')) {
    throw new KingOfTimeError(
      'Network connection error occurred',
      ErrorCodes.NETWORK_ERROR,
      { originalError: error }
    );
  }
  throw error;
}

export function handleElementNotFound(selector: string, context?: string): never {
  throw new KingOfTimeError(
    `Element not found: ${selector}${context ? ` in ${context}` : ''}`,
    ErrorCodes.ELEMENT_NOT_FOUND,
    { selector, context }
  );
}
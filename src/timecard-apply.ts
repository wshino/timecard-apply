import { chromium, Browser, Page } from 'playwright';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { KingOfTimeError, ErrorCodes } from './types';
import { 
  handleLoginError, 
  checkSessionTimeout, 
  handleNetworkError, 
  handleElementNotFound 
} from './utils/error-handler';
import { Config, loadConfig } from './config';
import { logger, logProcessingResult, logSession } from './utils/logger';
import { withRetry, isRetryableError } from './utils/retry';

dotenv.config();

async function login(page: Page, config: Config): Promise<void> {
  try {
    logger.info('Navigating to login page...');
    await withRetry(
      () => page.goto('https://login.ta.kingoftime.jp/admin', { 
        waitUntil: 'domcontentloaded',
        timeout: config.navigationTimeout 
      }),
      {
        maxAttempts: config.maxRetries,
        delayMs: config.retryDelayMs,
        backoffFactor: config.retryBackoffFactor,
        shouldRetry: isRetryableError,
      }
    );

    // Check for required credentials
    if (!process.env.KINGOFTIME_ID || !process.env.KINGOFTIME_PASSWORD) {
      throw new KingOfTimeError(
        'Missing credentials. Please set KINGOFTIME_ID and KINGOFTIME_PASSWORD in .env file',
        ErrorCodes.LOGIN_FAILED
      );
    }

    // Wait for the login form to be visible
    try {
      await page.waitForSelector('input[name="login_id"]', { timeout: config.elementTimeout });
      await page.waitForSelector('input[name="login_password"]', { timeout: config.elementTimeout });
    } catch (error) {
      handleElementNotFound('login form', 'login page');
    }

    // Input credentials
    logger.info('Entering credentials...');
    await page.fill('input[name="login_id"]', process.env.KINGOFTIME_ID);
    await page.fill('input[name="login_password"]', process.env.KINGOFTIME_PASSWORD);

    // Wait for login button and click
    const loginButton = await page.waitForSelector('input#login_button', { timeout: config.elementTimeout });
    if (!loginButton) {
      handleElementNotFound('login button', 'login form');
    }
    await loginButton.click();

    // Wait for navigation and check for login errors
    try {
      await withRetry(
        () => page.waitForNavigation({ timeout: config.pageLoadTimeout, waitUntil: 'networkidle' }),
        {
          maxAttempts: config.maxRetries,
          delayMs: config.retryDelayMs,
          backoffFactor: config.retryBackoffFactor,
          shouldRetry: isRetryableError,
        }
      );
    } catch (error) {
      await handleLoginError(page, error);
    }

    // Verify login success
    const isStillOnLoginPage = page.url().includes('/login');
    if (isStillOnLoginPage) {
      await handleLoginError(page, new Error('Still on login page after submission'));
    }

    logger.info('Login successful!');
  } catch (error: any) {
    if (error.name === 'KingOfTimeError') {
      throw error;
    }
    handleNetworkError(error);
  }
}

async function processErrorRow(page: Page, targetRow: any, config: Config): Promise<void> {
  if (config.dryRun) {
    logger.info('[DRY RUN] Starting to process error row...');
  } else {
    logger.info('Starting to process error row...');
  }
  
  // Select time clock application option
  logger.debug('Selecting time clock application option...');
  
  const selectLocator = await targetRow.$('select.htBlock-selectOther');
  if (!selectLocator) {
    throw new KingOfTimeError(
      'Select element not found in the row',
      ErrorCodes.ELEMENT_NOT_FOUND,
      { context: 'error row processing' }
    );
  }
  
  await selectLocator.selectOption({ label: '打刻申請' });
  await page.waitForTimeout(1000);

  // Find and click the initial application button
  logger.debug('Looking for initial application button...');
  const buttons = await page.$$('input[type="button"]');
  let buttonClicked = false;
  
  for (const button of buttons) {
    const buttonId = await button.getAttribute('id');
    if (buttonId && buttonId.startsWith('button_') && !buttonId.includes('schedule')) {
      logger.debug('Found button, clicking...');
      await button.click();
      buttonClicked = true;
      break;
    }
  }
  
  if (!buttonClicked) {
    throw new KingOfTimeError(
      'Application button not found',
      ErrorCodes.ELEMENT_NOT_FOUND,
      { context: 'row action buttons' }
    );
  }

  // Wait for the form to appear
  logger.debug('Waiting for form to appear...');
  await page.waitForTimeout(config.formWaitTime);

  // Enter clock-in time
  logger.debug('Entering clock-in time...');
  const clockInSelectResult = await page.evaluate(() => {
    const select = document.querySelector('#recording_type_code_1') as HTMLSelectElement;
    if (select) {
      select.value = '1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  });
  
  if (!clockInSelectResult) {
    throw new KingOfTimeError(
      'Clock-in type selector not found',
      ErrorCodes.ELEMENT_NOT_FOUND,
      { context: 'time entry form' }
    );
  }
  
  await page.waitForTimeout(1000);
  await page.fill('#recording_timestamp_time_1', config.clockInTime);
  await page.fill('input[name="request_remark_1"]', config.applicationReason);

  // Enter clock-out time
  logger.debug('Entering clock-out time...');
  const clockOutSelectResult = await page.evaluate(() => {
    const select = document.querySelector('#recording_type_code_2') as HTMLSelectElement;
    if (select) {
      select.value = '2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  });
  
  if (!clockOutSelectResult) {
    throw new KingOfTimeError(
      'Clock-out type selector not found',
      ErrorCodes.ELEMENT_NOT_FOUND,
      { context: 'time entry form' }
    );
  }
  
  await page.waitForTimeout(1000);
  await page.fill('#recording_timestamp_time_2', config.clockOutTime);
  await page.fill('input[name="request_remark_2"]', config.applicationReason);

  // Click the final submit button
  logger.debug('Clicking final submit button...');
  const finalButton = await page.waitForSelector('#button_01', { timeout: config.elementTimeout });
  if (!finalButton) {
    throw new KingOfTimeError(
      'Submit button not found',
      ErrorCodes.ELEMENT_NOT_FOUND,
      { context: 'time entry form submission' }
    );
  }
  
  if (config.dryRun) {
    logger.info('[DRY RUN] Would click submit button (skipping actual submission)');
    logger.info(`[DRY RUN] Would submit: Clock-in: ${config.clockInTime}, Clock-out: ${config.clockOutTime}, Reason: ${config.applicationReason}`);
  } else {
    await finalButton.click();
    logger.info('Final button clicked, waiting for page refresh...');
    await page.waitForTimeout(config.afterSubmitWaitTime);
  }
}

async function applyTimecard() {
  let browser: Browser | null = null;
  
  try {
    // Load configuration
    let config: Config;
    const configPath = path.join(process.cwd(), 'config.json');
    
    if (fs.existsSync(configPath)) {
      logger.info('Loading configuration from config.json...');
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config = loadConfig(configData);
    } else {
      logger.info('Using default configuration...');
      config = loadConfig();
    }
    
    if (config.debug) {
      logger.debug('Configuration:', config);
    }
    
    if (config.dryRun) {
      logger.warn('=== DRY RUN MODE ENABLED ===');
      logger.warn('No actual time card applications will be submitted');
    }
    
    browser = await chromium.launch({ headless: config.headless });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set up network error handling
    page.on('requestfailed', request => {
      logger.error(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Login
    await login(page, config);

    // Main processing loop
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const startTime = Date.now();
    
    logSession('start');
    
    while (true) {
      // Check for session timeout
      if (await checkSessionTimeout(page)) {
        logger.warn('Session timeout detected, re-logging in...');
        await login(page, config);
      }
      
      // Wait for the page to stabilize and load all elements
      logger.debug('Waiting for page to stabilize...');
      await page.waitForTimeout(config.afterSubmitWaitTime);
      
      // Get all rows with error status
      const errorRows = await page.$$('tr:has(td[title="エラー勤務です。"])');
      if (!errorRows || errorRows.length === 0) {
        const duration = Date.now() - startTime;
        if (config.dryRun) {
          logger.info(`[DRY RUN] Processing complete! Would process: ${processedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
        } else {
          logger.info(`Processing complete! Processed: ${processedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
        }
        logSession('end', { processed: processedCount, errors: errorCount, skipped: skippedCount, duration });
        break;
      }

      // Find the first row that hasn't been submitted yet
      let targetRow = null;
      for (const row of errorRows) {
        const hasRequestMark = await row.$('td.start_end_timerecord span.specific-requested');
        if (!hasRequestMark) {
          targetRow = row;
          break;
        }
      }

      if (!targetRow) {
        logger.info('No unsubmitted error rows found');
        break;
      }

      if (config.dryRun) {
        logger.info(`[DRY RUN] Found unsubmitted error row (${processedCount + 1})`);
      } else {
        logger.info(`Found unsubmitted error row (${processedCount + 1})`);
      }
      
      try {
        await withRetry(
          () => processErrorRow(page, targetRow, config),
          {
            maxAttempts: config.maxRetries,
            delayMs: config.retryDelayMs,
            backoffFactor: config.retryBackoffFactor,
            shouldRetry: (error) => {
              // Retry on specific errors
              if (isRetryableError(error)) {
                return true;
              }
              // Also retry on element not found errors as the page might be loading
              if (error.code === ErrorCodes.ELEMENT_NOT_FOUND) {
                return true;
              }
              return false;
            },
          }
        );
        processedCount++;
        if (config.dryRun) {
          logger.info(`[DRY RUN] ✓ Would process row ${processedCount}`);
          logProcessingResult({
            type: 'success',
            rowId: `row-${processedCount}`,
            message: `[DRY RUN] Would process row ${processedCount}`
          });
        } else {
          logger.info(`✓ Successfully processed row ${processedCount}`);
          logProcessingResult({
            type: 'success',
            rowId: `row-${processedCount}`,
            message: `Successfully processed row ${processedCount}`
          });
        }
      } catch (error: any) {
        errorCount++;
        logger.error(`✗ Error processing row: ${error.message}`);
        
        if (error.code === ErrorCodes.ELEMENT_NOT_FOUND) {
          skippedCount++;
          logger.warn('Skipping this row due to missing elements');
          logProcessingResult({
            type: 'skip',
            rowId: `row-${processedCount + errorCount}`,
            message: 'Skipped row due to missing elements',
            details: { error: error.message }
          });
          await page.waitForTimeout(config.afterSubmitWaitTime);
        } else {
          logProcessingResult({
            type: 'error',
            rowId: `row-${processedCount + errorCount}`,
            message: `Error processing row: ${error.message}`,
            details: { error: error.message, code: error.code }
          });
          throw error;
        }
      }
    }

  } catch (error: any) {
    logger.error('=== Fatal Error ===', {
      type: error.code || 'Unknown',
      message: error.message,
      details: error.details,
      stack: process.env.DEBUG === 'true' ? error.stack : undefined
    });
    
    logProcessingResult({
      type: 'error',
      message: `Fatal error: ${error.message}`,
      details: {
        type: error.code || 'Unknown',
        message: error.message,
        details: error.details
      }
    });
    
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise, reason });
  process.exit(1);
});

applyTimecard();
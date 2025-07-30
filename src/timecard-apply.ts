import { chromium, Browser, Page } from 'playwright';
import dotenv from 'dotenv';
import { KingOfTimeError, ErrorCodes } from './types';
import { 
  handleLoginError, 
  checkSessionTimeout, 
  handleNetworkError, 
  handleElementNotFound 
} from './utils/error-handler';

dotenv.config();

async function login(page: Page): Promise<void> {
  try {
    console.log('Navigating to login page...');
    await page.goto('https://login.ta.kingoftime.jp/admin', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Check for required credentials
    if (!process.env.KINGOFTIME_ID || !process.env.KINGOFTIME_PASSWORD) {
      throw new KingOfTimeError(
        'Missing credentials. Please set KINGOFTIME_ID and KINGOFTIME_PASSWORD in .env file',
        ErrorCodes.LOGIN_FAILED
      );
    }

    // Wait for the login form to be visible
    try {
      await page.waitForSelector('input[name="login_id"]', { timeout: 10000 });
      await page.waitForSelector('input[name="login_password"]', { timeout: 10000 });
    } catch (error) {
      handleElementNotFound('login form', 'login page');
    }

    // Input credentials
    console.log('Entering credentials...');
    await page.fill('input[name="login_id"]', process.env.KINGOFTIME_ID);
    await page.fill('input[name="login_password"]', process.env.KINGOFTIME_PASSWORD);

    // Wait for login button and click
    const loginButton = await page.waitForSelector('input#login_button', { timeout: 10000 });
    if (!loginButton) {
      handleElementNotFound('login button', 'login form');
    }
    await loginButton.click();

    // Wait for navigation and check for login errors
    try {
      await page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle' });
    } catch (error) {
      await handleLoginError(page, error);
    }

    // Verify login success
    const isStillOnLoginPage = page.url().includes('/login');
    if (isStillOnLoginPage) {
      await handleLoginError(page, new Error('Still on login page after submission'));
    }

    console.log('Login successful!');
  } catch (error: any) {
    if (error.name === 'KingOfTimeError') {
      throw error;
    }
    handleNetworkError(error);
  }
}

async function processErrorRow(page: Page, targetRow: any): Promise<void> {
  console.log('Starting to process error row...');
  
  // Select time clock application option
  console.log('Selecting time clock application option...');
  
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
  console.log('Looking for initial application button...');
  const buttons = await page.$$('input[type="button"]');
  let buttonClicked = false;
  
  for (const button of buttons) {
    const buttonId = await button.getAttribute('id');
    if (buttonId && buttonId.startsWith('button_') && !buttonId.includes('schedule')) {
      console.log('Found button, clicking...');
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
  console.log('Waiting for form to appear...');
  await page.waitForTimeout(3000);

  // Enter clock-in time
  console.log('Entering clock-in time...');
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
  await page.fill('#recording_timestamp_time_1', '1000');
  await page.fill('input[name="request_remark_1"]', 'x');

  // Enter clock-out time
  console.log('Entering clock-out time...');
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
  await page.fill('#recording_timestamp_time_2', '1900');
  await page.fill('input[name="request_remark_2"]', 'x');

  // Click the final submit button
  console.log('Clicking final submit button...');
  const finalButton = await page.waitForSelector('#button_01', { timeout: 5000 });
  if (!finalButton) {
    throw new KingOfTimeError(
      'Submit button not found',
      ErrorCodes.ELEMENT_NOT_FOUND,
      { context: 'time entry form submission' }
    );
  }
  
  await finalButton.click();
  console.log('Final button clicked, waiting for page refresh...');
  await page.waitForTimeout(2000);
}

async function applyTimecard() {
  let browser: Browser | null = null;
  
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set up network error handling
    page.on('requestfailed', request => {
      console.error(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Login
    await login(page);

    // Main processing loop
    let processedCount = 0;
    let errorCount = 0;
    
    while (true) {
      // Check for session timeout
      if (await checkSessionTimeout(page)) {
        console.log('Session timeout detected, re-logging in...');
        await login(page);
      }
      
      // Wait for the page to stabilize and load all elements
      console.log('Waiting for page to stabilize...');
      await page.waitForTimeout(2000);
      
      // Get all rows with error status
      const errorRows = await page.$$('tr:has(td[title="エラー勤務です。"])');
      if (!errorRows || errorRows.length === 0) {
        console.log(`\nProcessing complete! Processed: ${processedCount}, Errors: ${errorCount}`);
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
        console.log('No unsubmitted error rows found');
        break;
      }

      console.log(`\nFound unsubmitted error row (${processedCount + 1})`);
      
      try {
        await processErrorRow(page, targetRow);
        processedCount++;
        console.log(`✓ Successfully processed row ${processedCount}`);
      } catch (error: any) {
        errorCount++;
        console.error(`✗ Error processing row: ${error.message}`);
        
        if (error.code === ErrorCodes.ELEMENT_NOT_FOUND) {
          console.log('Skipping this row due to missing elements');
          await page.waitForTimeout(2000);
        } else {
          throw error;
        }
      }
    }

  } catch (error: any) {
    console.error('\n=== Fatal Error ===');
    console.error(`Type: ${error.code || 'Unknown'}`);
    console.error(`Message: ${error.message}`);
    
    if (error.details) {
      console.error('Details:', error.details);
    }
    
    if (process.env.DEBUG === 'true') {
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

applyTimecard();
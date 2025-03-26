import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

async function applyTimecard() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the login page
    console.log('Navigating to login page...');
    await page.goto('https://login.ta.kingoftime.jp/admin');

    // Wait for the login form to be visible
    await page.waitForSelector('input[name="login_id"]', { timeout: 5000 });
    await page.waitForSelector('input[name="login_password"]', { timeout: 5000 });

    // Input credentials
    console.log('Entering credentials...');
    await page.fill('input[name="login_id"]', process.env.KINGOFTIME_ID || '');
    await page.fill('input[name="login_password"]', process.env.KINGOFTIME_PASSWORD || '');

    // Wait for login button and click
    const loginButton = await page.waitForSelector('input#login_button', { timeout: 5000 });
    await loginButton.click();

    // Wait for navigation and page load
    await page.waitForNavigation({ timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    console.log('Login successful!');

    // Main processing loop
    while (true) {
        // Wait for the page to stabilize and load all elements
        console.log('Waiting for page to stabilize...');
        await page.waitForTimeout(2000);
        
        // Get all rows with error status
        const errorRows = await page.$$('tr:has(td[title="エラー勤務です。"])');
        if (!errorRows || errorRows.length === 0) {
            console.log('No more error rows to process');
            await browser.close();
            return;
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
            await browser.close();
            return;
        }

        console.log('Found unsubmitted error row');
        
        try {
            console.log('Starting to process error row...');
            
            // Select time clock application option
            console.log('Selecting time clock application option...');
            
            // Select the application option
            console.log('Selecting time clock application from dropdown...');
            const selectLocator = await targetRow.$('select.htBlock-selectOther');
            if (!selectLocator) {
              console.log('Select element not found, skipping row');
              return;
            }
            
            await selectLocator.selectOption({ label: '打刻申請' });
            await page.waitForTimeout(1000);

            // Find and click the initial application button
            console.log('Looking for initial application button...');
            const buttons = await page.$$('input[type="button"]');
            for (const button of buttons) {
              const buttonId = await button.getAttribute('id');
              if (buttonId && buttonId.startsWith('button_') && !buttonId.includes('schedule')) {
                console.log('Found button, clicking...');
                break;
              }
            }

            // Wait for the form to appear
            console.log('Waiting for form to appear...');
            await page.waitForTimeout(3000);

            // Enter clock-in time
            console.log('Entering clock-in time...');
            await page.evaluate(() => {
              const select = document.querySelector('#recording_type_code_1') as HTMLSelectElement;
              if (select) {
                select.value = '1';
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.dispatchEvent(new Event('input', { bubbles: true }));
              }
            });
            
            await page.waitForTimeout(1000);
            await page.fill('#recording_timestamp_time_1', '1000');
            await page.fill('input[name="request_remark_1"]', 'x');

            // Enter clock-out time
            console.log('Entering clock-out time...');
            await page.evaluate(() => {
              const select = document.querySelector('#recording_type_code_2') as HTMLSelectElement;
              if (select) {
                select.value = '2';
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.dispatchEvent(new Event('input', { bubbles: true }));
              }
            });
            
            await page.waitForTimeout(1000);
            await page.fill('#recording_timestamp_time_2', '1900');
            await page.fill('input[name="request_remark_2"]', 'x');

            // Click the final submit button
            console.log('Clicking final submit button...');
            const finalButton = await page.waitForSelector('#button_01', { timeout: 5000 });
            if (finalButton) {
                await finalButton.click();
                console.log('Final button clicked, waiting for page refresh...');
                await page.waitForTimeout(2000);
            }

        } catch (rowError) {
            console.error('Error processing a row:', rowError);
            // Wait before continuing to next iteration if an error occurs
            await page.waitForTimeout(2000);
        }
    }

  } catch (error) {
    console.error('An error occurred:', error);
    await browser.close();
  }
}

applyTimecard(); 
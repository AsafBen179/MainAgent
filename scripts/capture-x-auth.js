/**
 * X (Twitter) Authentication Capture Script
 *
 * This script opens a visible browser window for the user to manually
 * log into X (Twitter). After successful login, it saves the session
 * state for reuse in automated sentiment analysis.
 *
 * SECURITY: The output file (x_auth.json) contains sensitive cookies
 * and should NEVER be committed to git or shared.
 *
 * Usage: node scripts/capture-x-auth.js
 * Verify: node scripts/capture-x-auth.js --verify
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuration
const CONFIG = {
  sessionsDir: path.join(__dirname, '..', 'sessions'),
  authFile: 'x_auth.json',
  xUrl: 'https://x.com/',
  loginUrl: 'https://x.com/i/flow/login',
  timeout: 300000, // 5 minutes for manual login
};

// Create readline interface for user prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function captureAuth() {
  console.log('\n========================================');
  console.log('  X (Twitter) Authentication Capture');
  console.log('========================================\n');

  // Ensure sessions directory exists
  if (!fs.existsSync(CONFIG.sessionsDir)) {
    fs.mkdirSync(CONFIG.sessionsDir, { recursive: true });
    console.log(`Created sessions directory: ${CONFIG.sessionsDir}`);
  }

  const authFilePath = path.join(CONFIG.sessionsDir, CONFIG.authFile);

  // Check if auth file already exists
  if (fs.existsSync(authFilePath)) {
    const answer = await prompt('Auth file already exists. Overwrite? (y/n): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled. Existing auth file preserved.');
      rl.close();
      process.exit(0);
    }
  }

  console.log('\nLaunching browser...');
  console.log('A browser window will open. Please log in to X manually.\n');

  // Launch browser in headed mode (visible)
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  // Create context with realistic settings
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });

  const page = await context.newPage();

  try {
    // Navigate to X
    console.log('Navigating to X...');
    await page.goto(CONFIG.xUrl, { waitUntil: 'networkidle' });

    console.log('\n========================================');
    console.log('  MANUAL LOGIN REQUIRED');
    console.log('========================================');
    console.log('\n1. Click "Sign in" on X');
    console.log('2. Log in with your credentials');
    console.log('3. Complete any 2FA if required');
    console.log('4. Wait until you see your home feed');
    console.log('\nThe script will detect when you are logged in.\n');

    // Wait for login indicator
    console.log('Waiting for login (timeout: 5 minutes)...\n');

    // Poll for login status
    let loggedIn = false;
    const startTime = Date.now();

    while (!loggedIn && (Date.now() - startTime) < CONFIG.timeout) {
      try {
        // Check for various login indicators
        const indicators = await page.evaluate(() => {
          // Check for logged-in indicators
          const homeLink = document.querySelector('[data-testid="AppTabBar_Home_Link"]');
          const sideNav = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
          const accountSwitcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
          const loginButton = document.querySelector('[data-testid="loginButton"]');
          const signUpButton = document.querySelector('[data-testid="signupButton"]');

          return {
            hasHomeLink: !!homeLink,
            hasSideNav: !!sideNav,
            hasAccountSwitcher: !!accountSwitcher,
            hasLoginButton: !!loginButton,
            hasSignUpButton: !!signUpButton
          };
        });

        // If we have logged-in indicators and no login/signup buttons, we're logged in
        if ((indicators.hasHomeLink || indicators.hasSideNav || indicators.hasAccountSwitcher)
            && !indicators.hasLoginButton && !indicators.hasSignUpButton) {
          loggedIn = true;
          console.log('Login detected! Home feed found.');
        } else {
          // Wait a bit before checking again
          await new Promise(r => setTimeout(r, 2000));
          process.stdout.write('.');
        }
      } catch (e) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!loggedIn) {
      console.log('\n\nTimeout waiting for login. Please try again.');
      await browser.close();
      rl.close();
      process.exit(1);
    }

    console.log('\n\nLogin successful! Saving authentication state...');

    // Wait a moment for any final cookies to be set
    await new Promise(r => setTimeout(r, 3000));

    // Save the storage state (cookies, localStorage, etc.)
    await context.storageState({ path: authFilePath });

    console.log(`\nAuth state saved to: ${authFilePath}`);
    console.log('\n========================================');
    console.log('  SUCCESS - Authentication Captured');
    console.log('========================================');
    console.log('\nYour X session has been saved.');
    console.log('The agent can now use this session for live sentiment analysis.');
    console.log('\nSECURITY REMINDER:');
    console.log('- NEVER share x_auth.json');
    console.log('- NEVER commit it to git');
    console.log('- Re-run this script if your session expires');
    console.log('\nUSAGE:');
    console.log('- Layer 4 (Social Sentiment) will now be active');
    console.log('- The agent will scrape X for live sentiment data');

  } catch (error) {
    console.error('\nError during auth capture:', error.message);
  } finally {
    // Give user time to see the message
    await prompt('\nPress Enter to close the browser...');
    await browser.close();
    rl.close();
  }
}

// Verify auth file is valid
async function verifyAuth() {
  const authFilePath = path.join(CONFIG.sessionsDir, CONFIG.authFile);

  if (!fs.existsSync(authFilePath)) {
    console.log('No auth file found. Run capture first:');
    console.log('  npm run capture-x-auth');
    return false;
  }

  console.log('Verifying saved X authentication...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: authFilePath
  });

  const page = await context.newPage();

  try {
    await page.goto(CONFIG.xUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      const homeLink = document.querySelector('[data-testid="AppTabBar_Home_Link"]');
      const accountSwitcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      const loginButton = document.querySelector('[data-testid="loginButton"]');
      return (!!homeLink || !!accountSwitcher) && !loginButton;
    });

    if (isLoggedIn) {
      console.log('✅ X auth is valid!');
      console.log('Layer 4 (Social Sentiment) is ready to use.');
    } else {
      console.log('❌ X auth has expired. Please re-capture:');
      console.log('  npm run capture-x-auth');
    }
    return isLoggedIn;
  } catch (error) {
    console.error('Error verifying auth:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Command line handling
const args = process.argv.slice(2);

if (args.includes('--verify')) {
  verifyAuth().then(valid => process.exit(valid ? 0 : 1));
} else {
  captureAuth().catch(console.error);
}

/**
 * TradingView Authentication Capture Script
 *
 * This script opens a visible browser window for the user to manually
 * log into TradingView. After successful login, it saves the session
 * state for reuse in automated analysis.
 *
 * SECURITY: The output file (tv_auth.json) contains sensitive cookies
 * and should NEVER be committed to git or shared.
 *
 * Usage: node scripts/capture-tv-auth.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuration
const CONFIG = {
  sessionsDir: path.join(__dirname, '..', 'sessions'),
  authFile: 'tv_auth.json',
  tradingViewUrl: 'https://www.tradingview.com/',
  loginUrl: 'https://www.tradingview.com/accounts/signin/',
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
  console.log('  TradingView Authentication Capture');
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
  console.log('A browser window will open. Please log in to TradingView manually.\n');

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
    // Navigate to TradingView
    console.log('Navigating to TradingView...');
    await page.goto(CONFIG.tradingViewUrl, { waitUntil: 'networkidle' });

    console.log('\n========================================');
    console.log('  MANUAL LOGIN REQUIRED');
    console.log('========================================');
    console.log('\n1. Click "Sign in" on TradingView');
    console.log('2. Log in with your credentials');
    console.log('3. Complete any 2FA if required');
    console.log('4. Wait until you see your dashboard');
    console.log('\nThe script will detect when you are logged in.\n');

    // Wait for login indicator - check for user menu or avatar
    console.log('Waiting for login (timeout: 5 minutes)...\n');

    // Poll for login status
    let loggedIn = false;
    const startTime = Date.now();

    while (!loggedIn && (Date.now() - startTime) < CONFIG.timeout) {
      try {
        // Check for various login indicators
        const indicators = await page.evaluate(() => {
          // Check for user menu button (appears when logged in)
          const userMenu = document.querySelector('[data-name="user-menu"]');
          const avatarButton = document.querySelector('.tv-header__user-menu-button');
          const profileIcon = document.querySelector('[class*="userAvatar"]');
          const signInButton = document.querySelector('[data-name="header-user-menu-sign-in"]');

          return {
            hasUserMenu: !!userMenu,
            hasAvatarButton: !!avatarButton,
            hasProfileIcon: !!profileIcon,
            hasSignInButton: !!signInButton // If this exists, NOT logged in
          };
        });

        if ((indicators.hasUserMenu || indicators.hasAvatarButton || indicators.hasProfileIcon)
            && !indicators.hasSignInButton) {
          loggedIn = true;
          console.log('Login detected! User menu found.');
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
    console.log('\nYour TradingView session has been saved.');
    console.log('The agent can now use this session for automated analysis.');
    console.log('\nSECURITY REMINDER:');
    console.log('- NEVER share tv_auth.json');
    console.log('- NEVER commit it to git');
    console.log('- Re-run this script if your session expires');

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
    console.log('No auth file found. Run capture first.');
    return false;
  }

  console.log('Verifying saved authentication...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: authFilePath
  });

  const page = await context.newPage();

  try {
    await page.goto(CONFIG.tradingViewUrl, { waitUntil: 'networkidle' });

    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      const userMenu = document.querySelector('[data-name="user-menu"]');
      const signInButton = document.querySelector('[data-name="header-user-menu-sign-in"]');
      return !!userMenu && !signInButton;
    });

    console.log(isLoggedIn ? 'Auth is valid!' : 'Auth has expired. Please re-capture.');
    return isLoggedIn;
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

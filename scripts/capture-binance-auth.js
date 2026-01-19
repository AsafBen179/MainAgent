/**
 * Binance Authentication Capture Script
 *
 * This script opens a visible browser window for the user to manually
 * log into Binance. After successful login, it saves the session
 * state for reuse in automated demo trading operations.
 *
 * SECURITY: The output file (binance_auth.json) contains sensitive cookies
 * and should NEVER be committed to git or shared.
 *
 * Usage: node scripts/capture-binance-auth.js
 * Verify: node scripts/capture-binance-auth.js --verify
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuration - DEMO BINANCE ONLY
const CONFIG = {
  sessionsDir: path.join(__dirname, '..', 'sessions'),
  authFile: 'binance_auth.json',
  // CRITICAL: Only use demo.binance.com - NEVER real binance.com
  binanceUrl: 'https://demo.binance.com/en',
  loginUrl: 'https://demo.binance.com/en/login',
  tradingUrl: 'https://demo.binance.com/en/trade/SOL_USDT?type=spot',
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
  console.log('  Binance DEMO Authentication Capture');
  console.log('========================================');
  console.log('');
  console.log('  ⚠️  DEMO MODE ONLY - demo.binance.com');
  console.log('  ⚠️  This is for paper trading, not real funds');
  console.log('');

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
  console.log('A browser window will open. Please log in to Binance DEMO manually.');
  console.log('URL: https://demo.binance.com/en/login\n');

  // Launch browser in headed mode (visible)
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--disable-notifications',           // Block notification prompts
      '--disable-popup-blocking',          // Allow necessary popups
      '--no-first-run',                    // Skip first run dialogs
      '--no-default-browser-check',        // Skip default browser check
      '--disable-infobars',                // Disable info bars
      '--disable-session-crashed-bubble',  // Disable "restore pages" bubble
      '--disable-restore-session-state'    // Don't restore previous session
    ]
  });

  // Create context with realistic settings + notification permissions denied
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: [],  // Deny all permissions by default
    geolocation: null,
    ignoreHTTPSErrors: true
  });

  // Block notification permission requests
  await context.grantPermissions([], { origin: 'https://demo.binance.com' });

  const page = await context.newPage();

  try {
    // Navigate to Binance login page
    console.log('Navigating to Binance...');
    await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('\n========================================');
    console.log('  MANUAL LOGIN REQUIRED (DEMO SITE)');
    console.log('========================================');
    console.log('\n1. Log in with your Binance credentials');
    console.log('2. Complete 2FA verification');
    console.log('3. Complete any security challenges');
    console.log('4. Wait until you see your DEMO dashboard');
    console.log('\n⚠️  Verify you are on demo.binance.com (not www.binance.com)');
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
          // Check for user-related elements (appears when logged in)
          const userCenter = document.querySelector('[data-testid="header-user-center"]');
          const userAvatar = document.querySelector('.user-avatar');
          const avatarIcon = document.querySelector('[class*="UserAvatar"]');
          const spotBalance = document.querySelector('[data-testid="spot-balance"]');
          const accountMenu = document.querySelector('[id*="header-account"]');

          // Check for login/register buttons (appears when NOT logged in)
          const loginButton = document.querySelector('[data-testid="btn-login"]');
          const registerButton = document.querySelector('[data-testid="btn-register"]');
          const loginLink = document.querySelector('a[href*="/login"]');

          // Check URL for successful redirect
          const isOnDashboard = window.location.pathname.includes('/my/');
          const isOnTrade = window.location.pathname.includes('/trade');

          return {
            hasUserCenter: !!userCenter,
            hasUserAvatar: !!userAvatar,
            hasAvatarIcon: !!avatarIcon,
            hasSpotBalance: !!spotBalance,
            hasAccountMenu: !!accountMenu,
            hasLoginButton: !!loginButton || !!registerButton || !!loginLink,
            isOnDashboard,
            isOnTrade,
            url: window.location.href
          };
        });

        const hasUserIndicator = indicators.hasUserCenter ||
                                 indicators.hasUserAvatar ||
                                 indicators.hasAvatarIcon ||
                                 indicators.hasSpotBalance ||
                                 indicators.hasAccountMenu;

        if (hasUserIndicator && !indicators.hasLoginButton) {
          loggedIn = true;
          console.log('\nLogin detected! User menu found.');
        } else if (indicators.isOnDashboard || indicators.isOnTrade) {
          // Additional check - if we're on dashboard/trade page, likely logged in
          loggedIn = true;
          console.log('\nLogin detected! Navigated to authenticated page.');
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

    console.log('\nLogin successful! Navigating to DEMO trading page to capture full state...');

    // Navigate to DEMO trading page to ensure all trading-related cookies are set
    await page.goto(CONFIG.tradingUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // Verify we're still on demo.binance.com
    const currentUrl = page.url();
    if (!currentUrl.includes('demo.binance.com')) {
      console.error('\n❌ ERROR: Redirected away from demo.binance.com!');
      console.error('Current URL:', currentUrl);
      console.error('Auth capture aborted for safety.');
      await browser.close();
      rl.close();
      process.exit(1);
    }

    // Wait for the page to fully load
    await new Promise(r => setTimeout(r, 5000));

    console.log('Saving authentication state...');

    // Save the storage state (cookies, localStorage, etc.)
    await context.storageState({ path: authFilePath });

    console.log(`\nAuth state saved to: ${authFilePath}`);
    console.log('\n========================================');
    console.log('  SUCCESS - Authentication Captured');
    console.log('========================================');
    console.log('\nYour Binance DEMO session has been saved.');
    console.log('The agent can now use this session for paper trading.');
    console.log('\nIMPORTANT REMINDERS:');
    console.log('- This session is for demo.binance.com ONLY');
    console.log('- The agent will NEVER access real binance.com');
    console.log('- All trades are paper/demo trades with virtual funds');
    console.log('- Session typically expires in 7-14 days');
    console.log('\nSECURITY REMINDER:');
    console.log('- NEVER share binance_auth.json');
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

  console.log('Verifying saved Binance DEMO authentication...');
  console.log('Target: demo.binance.com (paper trading only)');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: authFilePath,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    await page.goto(CONFIG.tradingUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for page to settle
    await new Promise(r => setTimeout(r, 3000));

    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      const userCenter = document.querySelector('[data-testid="header-user-center"]');
      const userAvatar = document.querySelector('.user-avatar');
      const loginButton = document.querySelector('[data-testid="btn-login"]');
      const registerButton = document.querySelector('[data-testid="btn-register"]');

      const hasUserIndicator = !!userCenter || !!userAvatar;
      const hasLoginButton = !!loginButton || !!registerButton;

      return hasUserIndicator && !hasLoginButton;
    });

    console.log(isLoggedIn ? 'Auth is valid!' : 'Auth has expired or is invalid. Please re-capture.');
    return isLoggedIn;
  } catch (error) {
    console.error('Verification failed:', error.message);
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

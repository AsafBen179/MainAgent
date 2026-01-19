/**
 * Test Binance Auth Session
 * Run: node scripts/test-binance-auth.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const AUTH_FILE = path.join(__dirname, '..', 'sessions', 'binance_auth.json');
const BINANCE_URL = 'https://demo.binance.com/en/trade/SOL_USDT?type=spot';

async function testAuth() {
  console.log('=== Binance Auth Session Test ===\n');

  // Check if auth file exists
  if (!fs.existsSync(AUTH_FILE)) {
    console.error('❌ Auth file not found:', AUTH_FILE);
    process.exit(1);
  }

  const stats = fs.statSync(AUTH_FILE);
  console.log('✅ Auth file found:', AUTH_FILE);
  console.log('   Size:', stats.size, 'bytes');
  console.log('   Modified:', stats.mtime);

  // Parse and check cookies
  const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  console.log('   Cookies:', authData.cookies?.length || 0);
  console.log('   Origins:', authData.origins?.length || 0);

  // Check for expired cookies
  const now = Date.now() / 1000;
  const expiredCookies = authData.cookies?.filter(c => c.expires && c.expires < now) || [];
  if (expiredCookies.length > 0) {
    console.log('⚠️  Expired cookies:', expiredCookies.length);
  }

  console.log('\n--- Launching browser with auth session ---\n');

  const browser = await chromium.launch({
    headless: false,  // Show browser for visual verification
    slowMo: 500,
    args: [
      '--disable-notifications',
      '--disable-session-crashed-bubble',
      '--disable-restore-session-state',
      '--no-first-run'
    ]
  });

  const context = await browser.newContext({
    storageState: AUTH_FILE,
    permissions: []  // Deny all permissions
  });

  // Block notification permission requests
  await context.grantPermissions([], { origin: 'https://demo.binance.com' });

  const page = await context.newPage();

  console.log('Navigating to:', BINANCE_URL);
  await page.goto(BINANCE_URL, { waitUntil: 'domcontentloaded' });

  // Wait for page to settle
  await page.waitForTimeout(3000);

  // Check if logged in by looking for user menu or login button
  const isLoggedIn = await page.evaluate(() => {
    // Look for login/register buttons (indicates NOT logged in)
    const loginBtn = document.querySelector('[data-testid="nav-login-btn"]') ||
                     document.querySelector('a[href*="/login"]') ||
                     document.querySelector('#header-login-btn');

    // Look for user menu (indicates logged in)
    const userMenu = document.querySelector('[data-testid="user-menu"]') ||
                     document.querySelector('.user-center') ||
                     document.querySelector('#userMenuIcon') ||
                     document.querySelector('[class*="AccountIcon"]');

    // Get page text to check for login prompts
    const bodyText = document.body.innerText.substring(0, 500);

    return {
      hasLoginButton: !!loginBtn,
      hasUserMenu: !!userMenu,
      url: window.location.href,
      bodyPreview: bodyText
    };
  });

  console.log('\n=== Results ===');
  console.log('URL:', isLoggedIn.url);
  console.log('Login button visible:', isLoggedIn.hasLoginButton);
  console.log('User menu visible:', isLoggedIn.hasUserMenu);

  if (isLoggedIn.hasLoginButton && !isLoggedIn.hasUserMenu) {
    console.log('\n❌ NOT LOGGED IN - Auth session may be expired');
    console.log('   You need to re-capture the auth session');
    console.log('   Run: node scripts/capture-binance-auth.js');
  } else if (isLoggedIn.hasUserMenu) {
    console.log('\n✅ LOGGED IN - Auth session is working!');
  } else {
    console.log('\n⚠️  Unable to determine login status');
  }

  // Keep browser open for 10 seconds to verify visually
  console.log('\nBrowser will close in 10 seconds...');
  await page.waitForTimeout(10000);

  await browser.close();
}

testAuth().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

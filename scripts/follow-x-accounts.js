/**
 * X (Twitter) Account Follower Script
 *
 * Uses saved X session to follow specified accounts.
 *
 * Usage: node scripts/follow-x-accounts.js @handle1 @handle2 ...
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  sessionsDir: path.join(__dirname, '..', 'sessions'),
  authFile: 'x_auth.json',
  xUrl: 'https://x.com/',
};

async function followAccounts(handles) {
  const authFilePath = path.join(CONFIG.sessionsDir, CONFIG.authFile);

  if (!fs.existsSync(authFilePath)) {
    console.log('No X auth file found. Run capture first:');
    console.log('  npm run capture-x-auth');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('  X Account Follower');
  console.log('========================================\n');
  console.log(`Accounts to follow: ${handles.join(', ')}\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    storageState: authFilePath,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  const results = [];

  try {
    for (const handle of handles) {
      const cleanHandle = handle.replace('@', '');
      console.log(`\nNavigating to @${cleanHandle}...`);

      try {
        await page.goto(`https://x.com/${cleanHandle}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });

        // Wait for page content to stabilize
        await page.waitForTimeout(3000);

        // Wait for page to load
        await page.waitForTimeout(2000);

        // Check if account exists
        const notFound = await page.$('text="This account doesn\'t exist"');
        if (notFound) {
          console.log(`  Account @${cleanHandle} not found!`);
          results.push({ handle: cleanHandle, status: 'not_found' });
          continue;
        }

        // Look for Follow button (not Following)
        const followButton = await page.$('[data-testid$="-follow"]');
        const followingButton = await page.$('[data-testid$="-unfollow"]');

        if (followingButton) {
          console.log(`  Already following @${cleanHandle}`);
          results.push({ handle: cleanHandle, status: 'already_following' });
        } else if (followButton) {
          // Click follow
          await followButton.click();
          await page.waitForTimeout(1500);

          // Verify follow succeeded
          const nowFollowing = await page.$('[data-testid$="-unfollow"]');
          if (nowFollowing) {
            console.log(`  Successfully followed @${cleanHandle}`);
            results.push({ handle: cleanHandle, status: 'followed' });
          } else {
            console.log(`  Follow button clicked for @${cleanHandle}, verifying...`);
            results.push({ handle: cleanHandle, status: 'clicked' });
          }
        } else {
          console.log(`  Could not find follow button for @${cleanHandle}`);
          results.push({ handle: cleanHandle, status: 'no_button' });
        }

        // Small delay between accounts
        await page.waitForTimeout(2000);

      } catch (err) {
        console.log(`  Error with @${cleanHandle}: ${err.message}`);
        results.push({ handle: cleanHandle, status: 'error', error: err.message });
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('  SUMMARY');
    console.log('========================================');

    const followed = results.filter(r => r.status === 'followed' || r.status === 'clicked').length;
    const alreadyFollowing = results.filter(r => r.status === 'already_following').length;
    const failed = results.filter(r => !['followed', 'clicked', 'already_following'].includes(r.status)).length;

    console.log(`\nNewly followed: ${followed}`);
    console.log(`Already following: ${alreadyFollowing}`);
    console.log(`Failed: ${failed}`);

    console.log('\nDetails:');
    results.forEach(r => {
      const icon = r.status === 'followed' || r.status === 'clicked' ? '+' :
                   r.status === 'already_following' ? '=' : 'x';
      console.log(`  [${icon}] @${r.handle}: ${r.status}`);
    });

  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    console.log('\nClosing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // Default accounts for crypto sentiment
  const defaultAccounts = [
    '@whale_alert',
    '@CryptoQuant',
    '@santaborntotrade',
    '@Pentosh1',
    '@CryptoCred'
  ];
  console.log('No accounts specified. Using default crypto accounts...');
  followAccounts(defaultAccounts);
} else {
  followAccounts(args);
}

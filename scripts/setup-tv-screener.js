/**
 * TradingView CEX Screener Setup Script (v2.1)
 * IMPROVED - Properly handles checkbox filters
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  sessionsDir: path.join(__dirname, '..', 'sessions'),
  screenshotsDir: path.join(__dirname, '..', 'screenshots', 'scout'),
  tvAuthFile: 'tv_auth.json',
  cexScreenerUrl: 'https://www.tradingview.com/cex-screener/',
  webhookUrl: 'http://localhost:3001/webhook/tv-alert',
  alertName: 'Scout_CEX_Binance_USDT',
  webhookMessage: '{"ticker":"{{ticker}}","price":"{{close}}","reason":"CEX Screener Alert","exchange":"{{exchange}}"}',
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function takeScreenshot(page, name) {
  const filepath = path.join(CONFIG.screenshotsDir, `${name}.png`);
  await page.screenshot({ path: filepath });
  console.log(`      Screenshot: ${name}.png`);
}

async function dismissPopups(page) {
  for (const sel of ['button:has-text("Accept all")', 'button:has-text("Accept")', 'button:has-text("Got it")']) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) await el.click();
    } catch {}
  }
  try { await page.keyboard.press('Escape'); } catch {}
}

async function setFilter(page, filterName, valuesToSelect, stepNum) {
  console.log(`\n[${stepNum}] Setting ${filterName} filter...`);

  try {
    // Click the filter dropdown button
    await page.click(`button:has-text("${filterName}")`, { timeout: 5000 });
    await delay(1000);
    await takeScreenshot(page, `step${stepNum}_${filterName.toLowerCase()}_open`);

    // First, look for a search input in the dropdown to filter the list
    const searchInput = await page.$('input[placeholder*="Search"], input[type="search"], input[placeholder*="search"]');
    if (searchInput && await searchInput.isVisible()) {
      // Clear and type the value to filter
      await searchInput.fill(valuesToSelect[0]);
      await delay(500);
      console.log(`      Searching for: ${valuesToSelect[0]}`);
    }

    // Try to click "Only" button next to the item (some TradingView filters have this)
    for (const value of valuesToSelect) {
      try {
        const onlyBtn = await page.$(`button:has-text("Only"):near(:text("${value}"))`);
        if (onlyBtn && await onlyBtn.isVisible()) {
          await onlyBtn.click();
          console.log(`      Clicked "Only" for ${value}`);
          await delay(500);
          continue;
        }
      } catch {}

      // Otherwise, find the checkbox/label and click it
      const selectors = [
        `label:has-text("${value}")`,
        `span:has-text("${value}")`,
        `div[role="option"]:has-text("${value}")`,
        `[data-value="${value}"]`,
        `[data-value="${value.toUpperCase()}"]`,
      ];

      for (const sel of selectors) {
        try {
          const el = await page.$(sel);
          if (el && await el.isVisible()) {
            await el.click();
            console.log(`      Selected: ${value}`);
            await delay(300);
            break;
          }
        } catch {}
      }
    }

    await delay(500);

    // Look for Apply button
    const applyBtns = ['button:has-text("Apply")', 'button:has-text("OK")', 'button[type="submit"]'];
    for (const sel of applyBtns) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          await btn.click();
          console.log('      Applied filter');
          await delay(1000);
          break;
        }
      } catch {}
    }

    // Close dropdown with Escape if no Apply button
    await page.keyboard.press('Escape');
    await delay(500);

    await takeScreenshot(page, `step${stepNum}_${filterName.toLowerCase()}_set`);

  } catch (e) {
    console.log(`      ${filterName} filter error:`, e.message);
    await page.keyboard.press('Escape');
  }
}

async function setupCEXScreener() {
  console.log('\n========================================');
  console.log('  CEX SCREENER SETUP v2.1 (IMPROVED)');
  console.log('========================================\n');

  const authFilePath = path.join(CONFIG.sessionsDir, CONFIG.tvAuthFile);
  if (!fs.existsSync(authFilePath)) {
    console.log('ERROR: TradingView auth not found. Run: npm run capture-tv-auth');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.screenshotsDir)) {
    fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    storageState: authFilePath,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate
    console.log('\n[1/7] Navigating to CEX Screener...');
    await page.goto(CONFIG.cexScreenerUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(5000);
    await dismissPopups(page);
    await takeScreenshot(page, 'step1_initial');

    // Step 2-4: Configure filters
    await setFilter(page, 'Exchange', ['Binance'], 2);
    await setFilter(page, 'Symbol type', ['Spot'], 3);
    await setFilter(page, 'Quote currency', ['USDT'], 4);

    // Step 5: Verify filtered results
    console.log('\n[5/7] Verifying filtered results...');
    await delay(2000);
    await takeScreenshot(page, 'step5_filtered');

    // Step 6: Find and click Alert button
    console.log('\n[6/7] Looking for Alert/Export options...');

    // Look in various locations for alert functionality
    const alertSelectors = [
      'button[aria-label*="Alert"]',
      'button[aria-label*="alert"]',
      'button:has-text("Alert")',
      'button:has-text("Create Alert")',
      '[data-name="create-alert"]',
      'button[title*="Alert"]',
    ];

    let alertClicked = false;
    for (const sel of alertSelectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          await el.click();
          console.log(`      Found and clicked: ${sel}`);
          alertClicked = true;
          await delay(2000);
          await takeScreenshot(page, 'step6_alert_dialog');
          break;
        }
      } catch {}
    }

    if (!alertClicked) {
      // Try right-clicking on the table to get context menu
      console.log('      Trying right-click context menu...');
      try {
        const tableRow = await page.$('tr[class*="row"], tbody tr');
        if (tableRow) {
          await tableRow.click({ button: 'right' });
          await delay(1000);
          await takeScreenshot(page, 'step6_context_menu');
        }
      } catch {}
    }

    // Step 7: Configure webhook if alert dialog is open
    console.log('\n[7/7] Attempting webhook configuration...');

    // Look for webhook-related elements
    try {
      // Enable webhook checkbox/toggle
      const webhookToggle = await page.$('label:has-text("Webhook"), input[name*="webhook"], [data-name*="webhook"]');
      if (webhookToggle && await webhookToggle.isVisible()) {
        await webhookToggle.click();
        console.log('      Enabled webhook');
        await delay(500);
      }

      // Fill webhook URL
      const urlInput = await page.$('input[placeholder*="URL"], input[name*="webhook-url"], input[type="url"]');
      if (urlInput && await urlInput.isVisible()) {
        await urlInput.fill(CONFIG.webhookUrl);
        console.log('      Entered webhook URL');
      }

      // Fill message
      const msgInput = await page.$('textarea[name*="message"], textarea[placeholder*="Message"]');
      if (msgInput && await msgInput.isVisible()) {
        await msgInput.fill(CONFIG.webhookMessage);
        console.log('      Entered webhook message');
      }

      await takeScreenshot(page, 'step7_webhook');
    } catch (e) {
      console.log('      Webhook config:', e.message);
    }

    await takeScreenshot(page, 'step7_final');

    // Print summary
    console.log('\n========================================');
    console.log('  SETUP STATUS');
    console.log('========================================');
    console.log('\nFilters configured:');
    console.log('  - Exchange: BINANCE');
    console.log('  - Symbol Type: Spot');
    console.log('  - Quote Currency: USDT');
    console.log('\nTo complete alert setup manually (if needed):');
    console.log('  1. Look for Alert/Bell icon in toolbar');
    console.log('  2. Name: ' + CONFIG.alertName);
    console.log('  3. Enable Webhook URL');
    console.log('  4. URL: ' + CONFIG.webhookUrl);
    console.log('  5. Message:');
    console.log('     ' + CONFIG.webhookMessage);
    console.log('\nScreenshots: ' + CONFIG.screenshotsDir);
    console.log('========================================');

    // Keep browser open
    console.log('\nBrowser open for 90 seconds for manual completion...');
    await delay(90000);

  } catch (error) {
    console.error('\nError:', error.message);
    await takeScreenshot(page, 'error');
  } finally {
    console.log('\nClosing browser...');
    await browser.close();
  }
}

setupCEXScreener().catch(console.error);

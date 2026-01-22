/**
 * Scout Module Initialization Script
 *
 * Initializes the Market Scanner (Scout) module:
 * - Creates/updates dynamic_watchlist.json
 * - Syncs Binance USDT pairs whitelist
 * - Populates initial volume leaders and movers
 *
 * Usage: node scripts/scout-init.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  configDir: path.join(__dirname, '..', 'config'),
  watchlistFile: 'dynamic_watchlist.json',
  binanceApi: 'https://api.binance.com/api/v3',
  volumeThreshold: 10000000, // $10M minimum
  pollingIntervalHours: 4,
  topN: 10, // Top 10 for each category
};

// Stablecoins and wrapped tokens to blacklist
const BLACKLIST = {
  USDCUSDT: 'Stablecoin',
  BUSDUSDT: 'Stablecoin',
  TUSDUSDT: 'Stablecoin',
  USDPUSDT: 'Stablecoin',
  DAIUSDT: 'Stablecoin',
  FDUSDUSDT: 'Stablecoin',
  EURUSDT: 'Fiat pair',
  GBPUSDT: 'Fiat pair',
  WBTCUSDT: 'Wrapped token',
  WBETHUSDT: 'Wrapped token',
};

async function fetchBinanceExchangeInfo() {
  console.log('Fetching Binance exchange info...');
  try {
    const response = await axios.get(`${CONFIG.binanceApi}/exchangeInfo`);
    const symbols = response.data.symbols
      .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .map(s => s.symbol);
    console.log(`Found ${symbols.length} USDT trading pairs on Binance`);
    return symbols;
  } catch (error) {
    console.error('Error fetching exchange info:', error.message);
    return [];
  }
}

async function fetchTicker24h() {
  console.log('Fetching 24h ticker data...');
  try {
    const response = await axios.get(`${CONFIG.binanceApi}/ticker/24hr`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ticker data:', error.message);
    return [];
  }
}

function processTickerData(tickers, whitelist) {
  // Filter to USDT pairs only and add calculated fields
  const usdtTickers = tickers
    .filter(t => t.symbol.endsWith('USDT') && whitelist.includes(t.symbol))
    .filter(t => !BLACKLIST[t.symbol])
    .map(t => ({
      symbol: t.symbol,
      price: parseFloat(t.lastPrice),
      volume_24h_usd: parseFloat(t.quoteVolume),
      change_24h_pct: parseFloat(t.priceChangePercent),
      high_24h: parseFloat(t.highPrice),
      low_24h: parseFloat(t.lowPrice),
    }))
    .filter(t => t.volume_24h_usd >= CONFIG.volumeThreshold);

  // Sort by volume for volume leaders
  const volumeLeaders = [...usdtTickers]
    .sort((a, b) => b.volume_24h_usd - a.volume_24h_usd)
    .slice(0, CONFIG.topN)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  // Top gainers (>$20M volume, sorted by gain)
  const topGainers = [...usdtTickers]
    .filter(t => t.volume_24h_usd >= 20000000 && t.change_24h_pct > 3)
    .sort((a, b) => b.change_24h_pct - a.change_24h_pct)
    .slice(0, CONFIG.topN)
    .map(t => ({ ...t, category: 'GAINER' }));

  // Top losers (>$20M volume, sorted by loss)
  const topLosers = [...usdtTickers]
    .filter(t => t.volume_24h_usd >= 20000000 && t.change_24h_pct < -3)
    .sort((a, b) => a.change_24h_pct - b.change_24h_pct)
    .slice(0, CONFIG.topN)
    .map(t => ({ ...t, category: 'LOSER' }));

  return { volumeLeaders, topGainers, topLosers };
}

function createActiveWatchlist(volumeLeaders, topGainers, topLosers) {
  const seen = new Set();
  const assets = [];

  // Add volume leaders first (highest priority)
  volumeLeaders.forEach(t => {
    if (!seen.has(t.symbol)) {
      seen.add(t.symbol);
      assets.push({
        symbol: t.symbol,
        added_at: new Date().toISOString(),
        source: 'volume_leaders',
        priority: 'HIGH',
        last_analysis: null,
        analysis_result: null,
        notes: `Rank #${t.rank} by volume ($${(t.volume_24h_usd / 1e9).toFixed(2)}B)`,
      });
    }
  });

  // Add top gainers
  topGainers.forEach(t => {
    if (!seen.has(t.symbol)) {
      seen.add(t.symbol);
      assets.push({
        symbol: t.symbol,
        added_at: new Date().toISOString(),
        source: 'top_gainers',
        priority: 'MEDIUM',
        last_analysis: null,
        analysis_result: null,
        notes: `+${t.change_24h_pct.toFixed(2)}% in 24H - potential SHORT (overextended)`,
      });
    }
  });

  // Add top losers
  topLosers.forEach(t => {
    if (!seen.has(t.symbol)) {
      seen.add(t.symbol);
      assets.push({
        symbol: t.symbol,
        added_at: new Date().toISOString(),
        source: 'top_losers',
        priority: 'MEDIUM',
        last_analysis: null,
        analysis_result: null,
        notes: `${t.change_24h_pct.toFixed(2)}% in 24H - potential LONG (oversold bounce)`,
      });
    }
  });

  return assets;
}

async function initializeWatchlist() {
  console.log('\n========================================');
  console.log('  SCOUT MODULE INITIALIZATION');
  console.log('========================================\n');

  // Ensure config directory exists
  if (!fs.existsSync(CONFIG.configDir)) {
    fs.mkdirSync(CONFIG.configDir, { recursive: true });
    console.log(`Created config directory: ${CONFIG.configDir}`);
  }

  const watchlistPath = path.join(CONFIG.configDir, CONFIG.watchlistFile);
  const now = new Date();
  const nextPoll = new Date(now.getTime() + CONFIG.pollingIntervalHours * 60 * 60 * 1000);

  // Fetch data
  const whitelist = await fetchBinanceExchangeInfo();
  if (whitelist.length === 0) {
    console.error('Failed to fetch Binance whitelist. Aborting.');
    process.exit(1);
  }

  const tickers = await fetchTicker24h();
  if (tickers.length === 0) {
    console.error('Failed to fetch ticker data. Aborting.');
    process.exit(1);
  }

  // Process data
  const { volumeLeaders, topGainers, topLosers } = processTickerData(tickers, whitelist);
  const activeWatchlist = createActiveWatchlist(volumeLeaders, topGainers, topLosers);

  // Create watchlist structure
  const watchlist = {
    version: '1.0.0',
    last_updated: now.toISOString(),
    polling_interval_hours: CONFIG.pollingIntervalHours,
    next_poll: nextPoll.toISOString(),

    binance_whitelist: {
      description: 'All valid Binance USDT pairs',
      count: whitelist.length,
      last_sync: now.toISOString(),
      pairs: whitelist,
    },

    active_watchlist: {
      description: 'Currently monitored assets',
      assets: activeWatchlist,
    },

    volume_leaders: {
      last_poll: now.toISOString(),
      assets: volumeLeaders,
    },

    top_gainers: {
      last_poll: now.toISOString(),
      assets: topGainers,
    },

    top_losers: {
      last_poll: now.toISOString(),
      assets: topLosers,
    },

    new_listings: {
      last_poll: now.toISOString(),
      assets: [],
    },

    alert_triggers: {
      description: 'Assets triggered by TradingView alerts',
      pending_analysis: [],
    },

    blacklist: {
      description: 'Assets excluded from scanning',
      assets: Object.keys(BLACKLIST),
      reasons: BLACKLIST,
    },
  };

  // Write watchlist file
  fs.writeFileSync(watchlistPath, JSON.stringify(watchlist, null, 2));
  console.log(`\nWatchlist saved to: ${watchlistPath}`);

  // Print summary
  console.log('\n========================================');
  console.log('  INITIALIZATION COMPLETE');
  console.log('========================================');
  console.log(`\nBinance Whitelist: ${whitelist.length} USDT pairs`);
  console.log(`Volume Leaders: ${volumeLeaders.length} assets`);
  console.log(`Top Gainers: ${topGainers.length} assets`);
  console.log(`Top Losers: ${topLosers.length} assets`);
  console.log(`Active Watchlist: ${activeWatchlist.length} unique assets`);
  console.log(`Next Poll: ${nextPoll.toISOString()}`);

  console.log('\n--- VOLUME LEADERS ---');
  volumeLeaders.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. ${t.symbol}: $${t.price.toFixed(4)} | Vol: $${(t.volume_24h_usd / 1e9).toFixed(2)}B | ${t.change_24h_pct >= 0 ? '+' : ''}${t.change_24h_pct.toFixed(2)}%`);
  });

  console.log('\n--- TOP GAINERS ---');
  topGainers.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. ${t.symbol}: +${t.change_24h_pct.toFixed(2)}% | Vol: $${(t.volume_24h_usd / 1e6).toFixed(0)}M`);
  });

  console.log('\n--- TOP LOSERS ---');
  topLosers.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. ${t.symbol}: ${t.change_24h_pct.toFixed(2)}% | Vol: $${(t.volume_24h_usd / 1e6).toFixed(0)}M`);
  });

  console.log('\n========================================');
  console.log('  NEXT STEPS');
  console.log('========================================');
  console.log('1. Run: node scripts/setup-tv-screener.js');
  console.log('   → Configure TradingView screener filters');
  console.log('   → Create webhook alert');
  console.log('\n2. Ensure Bridge server is running on port 3001');
  console.log('   → npm run start:bridge');
  console.log('\n3. Scout is ready for operation!');
  console.log('========================================\n');
}

// Run initialization
initializeWatchlist().catch(console.error);

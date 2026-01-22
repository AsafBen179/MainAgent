/**
 * Binance Client Helper Utility
 * Direct API integration for market data, scanning, and execution scaffolding
 * Part of the Binance Engine skill
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  baseUrl: 'api.binance.com',
  watchlistPath: path.join(__dirname, '..', 'config', 'dynamic_watchlist.json'),
  scanResultsPath: path.join(__dirname, '..', 'config', 'scan_results.json'),
  analysisHistoryPath: path.join(__dirname, '..', 'data', 'analysis_history.json'),
  observationListPath: path.join(__dirname, '..', 'data', 'observation_list.json'),
  signalsHistoryPath: path.join(__dirname, '..', 'data', 'signals_history.json'),
  // Scanner thresholds
  minVolume24h: 20_000_000,  // $20M USD
  minChange24h: 3,           // 3% absolute
  minChange4h: 1.5,          // 1.5%
  rvolThreshold: 1.5,        // RVOL > 1.5
  // Smart filter thresholds
  analysisExpireHours: 4,    // Re-analyze after 4 hours
  priceChangeThreshold: 0.02, // 2% price change triggers re-analysis
  // Signal gatekeeper thresholds
  signalCooldownHours: 24,   // No duplicate signals within 24h for same direction
  monitorIntervalMs: 5 * 60 * 1000, // Check active signals every 5 minutes
  // Confidence threshold and muting
  confidenceThreshold: 75,   // Minimum 75% confidence for SIGNAL
  muteDurationHours: 4,      // Mute asset for 4 hours after WAIT result
};

/**
 * Make HTTPS request to Binance API
 */
function apiRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.baseUrl,
      path: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'MainAgent-BinanceClient/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// ANALYSIS MEMORY LAYER
// ═══════════════════════════════════════════════════════════════

/**
 * Load analysis history from JSON storage
 * @returns {Object} Analysis history keyed by symbol
 */
function loadAnalysisHistory() {
  try {
    if (fs.existsSync(CONFIG.analysisHistoryPath)) {
      const data = fs.readFileSync(CONFIG.analysisHistoryPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[Memory] Error loading analysis history:', e.message);
  }
  return { assets: {}, lastUpdated: null };
}

/**
 * Save analysis history to JSON storage
 * @param {Object} history - The analysis history object
 */
function saveAnalysisHistory(history) {
  try {
    const dir = path.dirname(CONFIG.analysisHistoryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    history.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CONFIG.analysisHistoryPath, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('[Memory] Error saving analysis history:', e.message);
  }
}

/**
 * Load observation list (assets being watched but not analyzed)
 * @returns {Object} Observation list
 */
function loadObservationList() {
  try {
    if (fs.existsSync(CONFIG.observationListPath)) {
      const data = fs.readFileSync(CONFIG.observationListPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[Memory] Error loading observation list:', e.message);
  }
  return { assets: [], lastUpdated: null };
}

/**
 * Save observation list
 * @param {Object} list - The observation list
 */
function saveObservationList(list) {
  try {
    const dir = path.dirname(CONFIG.observationListPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    list.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CONFIG.observationListPath, JSON.stringify(list, null, 2));
  } catch (e) {
    console.error('[Memory] Error saving observation list:', e.message);
  }
}

/**
 * Check if an asset is currently muted (cooldown after WAIT result)
 * @param {string} symbol - Asset symbol
 * @returns {Object} { muted: boolean, muteUntil: string|null, remainingMinutes: number }
 */
function checkMuteStatus(symbol) {
  const history = loadAnalysisHistory();
  const assetHistory = history.assets[symbol];

  if (!assetHistory || !assetHistory.mute_until) {
    return { muted: false, muteUntil: null, remainingMinutes: 0 };
  }

  const now = Date.now();
  const muteUntil = new Date(assetHistory.mute_until).getTime();

  if (now < muteUntil) {
    const remainingMs = muteUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    return {
      muted: true,
      muteUntil: assetHistory.mute_until,
      remainingMinutes,
      remainingHours: (remainingMinutes / 60).toFixed(1)
    };
  }

  return { muted: false, muteUntil: null, remainingMinutes: 0 };
}

/**
 * Mute an asset for the configured duration (after WAIT result)
 * @param {string} symbol - Asset symbol
 * @param {string} reason - Reason for muting
 * @param {number} confidenceScore - The confidence score that triggered the mute
 * @returns {Object} Updated asset history entry
 */
function muteAsset(symbol, reason, confidenceScore = null) {
  const history = loadAnalysisHistory();
  const muteUntil = new Date(Date.now() + CONFIG.muteDurationHours * 60 * 60 * 1000).toISOString();

  if (!history.assets[symbol]) {
    history.assets[symbol] = { symbol };
  }

  history.assets[symbol].mute_until = muteUntil;
  history.assets[symbol].mute_reason = reason;
  history.assets[symbol].last_confidence_score = confidenceScore;
  history.assets[symbol].muted_at = new Date().toISOString();

  saveAnalysisHistory(history);

  console.log(`[Mute] ${symbol} muted until ${muteUntil} (${CONFIG.muteDurationHours}h)`);
  console.log(`[Mute] Reason: ${reason}`);
  if (confidenceScore !== null) {
    console.log(`[Mute] Confidence: ${confidenceScore}% (threshold: ${CONFIG.confidenceThreshold}%)`);
  }

  return history.assets[symbol];
}

/**
 * Clear mute status for an asset
 * @param {string} symbol - Asset symbol
 */
function unmmuteAsset(symbol) {
  const history = loadAnalysisHistory();

  if (history.assets[symbol]) {
    delete history.assets[symbol].mute_until;
    delete history.assets[symbol].mute_reason;
    delete history.assets[symbol].muted_at;
    saveAnalysisHistory(history);
    console.log(`[Mute] ${symbol} unmuted`);
  }
}

/**
 * Calculate confidence score percentage from pillar points
 * @param {number} totalPoints - Points scored (out of 15)
 * @param {number} maxPoints - Maximum possible points (default 15)
 * @returns {number} Confidence percentage (0-100)
 */
function calculateConfidencePercent(totalPoints, maxPoints = 15) {
  return Math.round((totalPoints / maxPoints) * 100);
}

/**
 * Check if confidence score meets the threshold for SIGNAL
 * @param {number} confidencePercent - Confidence percentage
 * @returns {Object} { meetsThreshold: boolean, threshold: number, difference: number }
 */
function checkConfidenceThreshold(confidencePercent) {
  const threshold = CONFIG.confidenceThreshold;
  const meetsThreshold = confidencePercent >= threshold;
  const difference = confidencePercent - threshold;

  return {
    meetsThreshold,
    threshold,
    confidencePercent,
    difference,
    message: meetsThreshold
      ? `Confidence ${confidencePercent}% meets threshold (${threshold}%)`
      : `Confidence ${confidencePercent}% below threshold (${threshold}%) - WAIT triggered`
  };
}

/**
 * Process analysis result - mute if WAIT, allow if SIGNAL
 * @param {string} symbol - Asset symbol
 * @param {Object} result - Analysis result
 * @returns {Object} Processing result with mute status
 */
function processAnalysisResult(symbol, result) {
  const { signal, confluenceScore, confidence, direction } = result;
  const confidencePercent = calculateConfidencePercent(confluenceScore || 0);
  const thresholdCheck = checkConfidenceThreshold(confidencePercent);

  // Determine if this is a WAIT or SIGNAL
  const isWait = signal === 'WAIT' || !thresholdCheck.meetsThreshold;

  if (isWait) {
    // Mute the asset for 4 hours
    const reason = !thresholdCheck.meetsThreshold
      ? `Confidence ${confidencePercent}% below ${CONFIG.confidenceThreshold}% threshold`
      : `Analysis resulted in WAIT`;

    muteAsset(symbol, reason, confidencePercent);

    return {
      action: 'MUTED',
      sendWhatsApp: false, // Do NOT send WhatsApp message for WAIT
      reason,
      confidencePercent,
      muteUntil: new Date(Date.now() + CONFIG.muteDurationHours * 60 * 60 * 1000).toISOString(),
      message: `Asset ${symbol} resulted in WAIT. Muted for ${CONFIG.muteDurationHours} hours.`
    };
  }

  // SIGNAL with confidence >= 75%
  return {
    action: 'SIGNAL',
    sendWhatsApp: true, // Send WhatsApp message
    confidencePercent,
    direction,
    message: `Asset ${symbol} SIGNAL with ${confidencePercent}% confidence`
  };
}

/**
 * Get all muted assets
 * @returns {Array} List of muted assets with remaining time
 */
function getMutedAssets() {
  const history = loadAnalysisHistory();
  const now = Date.now();
  const muted = [];

  for (const [symbol, data] of Object.entries(history.assets)) {
    if (data.mute_until) {
      const muteUntil = new Date(data.mute_until).getTime();
      if (now < muteUntil) {
        const remainingMs = muteUntil - now;
        muted.push({
          symbol,
          muteUntil: data.mute_until,
          mutedAt: data.muted_at,
          reason: data.mute_reason,
          confidenceScore: data.last_confidence_score,
          remainingMinutes: Math.ceil(remainingMs / (1000 * 60)),
          remainingHours: (remainingMs / (1000 * 60 * 60)).toFixed(1)
        });
      }
    }
  }

  return muted.sort((a, b) => a.remainingMinutes - b.remainingMinutes);
}

/**
 * Check if an asset should be analyzed based on smart filter logic
 * NOW INCLUDES MUTE CHECK
 * @param {string} symbol - Asset symbol
 * @param {number} currentPrice - Current price
 * @param {number} currentRvol - Current RVOL (optional)
 * @returns {Object} { shouldAnalyze: boolean, reason: string }
 */
function shouldAnalyze(symbol, currentPrice, currentRvol = null) {
  const history = loadAnalysisHistory();
  const assetHistory = history.assets[symbol];

  // Rule 0: Check if asset is MUTED (cooldown after WAIT)
  const muteStatus = checkMuteStatus(symbol);
  if (muteStatus.muted) {
    return {
      shouldAnalyze: false,
      reason: 'MUTED',
      message: `[${symbol}] MUTED for ${muteStatus.remainingHours}h more (until ${muteStatus.muteUntil}) - SKIPPING`
    };
  }

  // Rule 1: Asset NOT in history -> ANALYZE
  if (!assetHistory) {
    return {
      shouldAnalyze: true,
      reason: 'NEW_ASSET',
      message: `[${symbol}] New asset - first analysis`
    };
  }

  const now = Date.now();
  const lastAnalysisTime = new Date(assetHistory.last_analysis_time).getTime();
  const hoursSinceAnalysis = (now - lastAnalysisTime) / (1000 * 60 * 60);

  // Rule 2: Time expired (> 4 hours) -> ANALYZE
  if (hoursSinceAnalysis > CONFIG.analysisExpireHours) {
    return {
      shouldAnalyze: true,
      reason: 'TIME_EXPIRED',
      message: `[${symbol}] ${hoursSinceAnalysis.toFixed(1)}h since last analysis (threshold: ${CONFIG.analysisExpireHours}h)`
    };
  }

  // Rule 3: Price changed > 2% -> ANALYZE
  const lastPrice = assetHistory.last_price;
  const priceChange = Math.abs((currentPrice - lastPrice) / lastPrice);

  if (priceChange > CONFIG.priceChangeThreshold) {
    const changePercent = (priceChange * 100).toFixed(2);
    return {
      shouldAnalyze: true,
      reason: 'PRICE_DELTA',
      message: `[${symbol}] Price delta ${changePercent}% exceeds threshold (${CONFIG.priceChangeThreshold * 100}%)`
    };
  }

  // Rule 4: No significant change -> SKIP
  return {
    shouldAnalyze: false,
    reason: 'NO_SIGNIFICANT_CHANGE',
    message: `[${symbol}] Already analyzed ${hoursSinceAnalysis.toFixed(1)}h ago, price delta ${(priceChange * 100).toFixed(2)}% - SKIPPING`
  };
}

/**
 * Update analysis history after successful analysis
 * @param {string} symbol - Asset symbol
 * @param {number} price - Current price
 * @param {number} rvol - Current RVOL
 * @param {Object} analysisResult - Optional analysis result metadata
 */
function updateAnalysisHistory(symbol, price, rvol, analysisResult = null) {
  const history = loadAnalysisHistory();

  history.assets[symbol] = {
    symbol: symbol,
    last_analysis_time: new Date().toISOString(),
    last_price: price,
    last_rvol: rvol,
    analysis_count: (history.assets[symbol]?.analysis_count || 0) + 1,
    last_result: analysisResult ? {
      signal: analysisResult.signal || 'UNKNOWN',
      confidence: analysisResult.confidence || 'NORMAL',
      confluence_score: analysisResult.confluenceScore || null
    } : null
  };

  saveAnalysisHistory(history);
  console.log(`[Memory] Updated history for ${symbol} @ $${price}`);
}

/**
 * Add asset to observation list (skipped but still meeting scout criteria)
 * @param {string} symbol - Asset symbol
 * @param {string} reason - Why it was added to observation
 */
function addToObservation(symbol, reason) {
  const list = loadObservationList();

  // Check if already in list
  const existingIndex = list.assets.findIndex(a => a.symbol === symbol);

  const entry = {
    symbol: symbol,
    added_time: new Date().toISOString(),
    reason: reason,
    check_count: existingIndex >= 0 ? (list.assets[existingIndex].check_count || 0) + 1 : 1
  };

  if (existingIndex >= 0) {
    list.assets[existingIndex] = entry;
  } else {
    list.assets.push(entry);
  }

  // Keep only last 50 observations
  if (list.assets.length > 50) {
    list.assets = list.assets.slice(-50);
  }

  saveObservationList(list);
}

/**
 * Get analysis history summary
 * @returns {Object} Summary of analysis history
 */
function getHistorySummary() {
  const history = loadAnalysisHistory();
  const assets = Object.values(history.assets);

  return {
    totalAssets: assets.length,
    lastUpdated: history.lastUpdated,
    recentAnalyses: assets
      .sort((a, b) => new Date(b.last_analysis_time) - new Date(a.last_analysis_time))
      .slice(0, 10)
      .map(a => ({
        symbol: a.symbol,
        price: a.last_price,
        analyzedAt: a.last_analysis_time,
        result: a.last_result?.signal || 'N/A'
      }))
  };
}

// ═══════════════════════════════════════════════════════════════
// SIGNAL HISTORY & TRADE LIFECYCLE
// ═══════════════════════════════════════════════════════════════

/**
 * Signal status enum
 */
const SignalStatus = {
  ACTIVE: 'Active',
  HIT_SL: 'Hit_SL',
  HIT_TP1: 'Hit_TP1',
  HIT_TP2: 'Hit_TP2',
  HIT_TP3: 'Hit_TP3',
  EXPIRED_DAILY: 'Expired_Daily',
  INVALIDATED: 'Invalidated',
  CLOSED_MANUAL: 'Closed_Manual'
};

/**
 * Load signals history from JSON storage
 * @returns {Object} Signals history
 */
function loadSignalsHistory() {
  try {
    if (fs.existsSync(CONFIG.signalsHistoryPath)) {
      const data = fs.readFileSync(CONFIG.signalsHistoryPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[Signals] Error loading signals history:', e.message);
  }
  return {
    signals: [],
    lastUpdated: null,
    stats: { total: 0, wins: 0, losses: 0, active: 0 }
  };
}

/**
 * Save signals history to JSON storage
 * @param {Object} history - The signals history object
 */
function saveSignalsHistory(history) {
  try {
    const dir = path.dirname(CONFIG.signalsHistoryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    history.lastUpdated = new Date().toISOString();
    // Update stats
    history.stats = {
      total: history.signals.length,
      wins: history.signals.filter(s => s.status.startsWith('Hit_TP')).length,
      losses: history.signals.filter(s => s.status === SignalStatus.HIT_SL).length,
      active: history.signals.filter(s => s.status === SignalStatus.ACTIVE).length
    };
    fs.writeFileSync(CONFIG.signalsHistoryPath, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('[Signals] Error saving signals history:', e.message);
  }
}

/**
 * Record a new signal in history
 * @param {Object} signal - Signal details
 */
function recordSignal(signal) {
  const history = loadSignalsHistory();

  const newSignal = {
    id: `SIG_${Date.now()}_${signal.symbol}`,
    symbol: signal.symbol,
    direction: signal.direction, // 'LONG' or 'SHORT'
    timestamp: new Date().toISOString(),
    status: SignalStatus.ACTIVE,
    entry_price: signal.entry_price,
    sl_price: signal.sl_price,
    tp1_price: signal.tp1_price,
    tp2_price: signal.tp2_price || null,
    tp3_price: signal.tp3_price || null,
    confluence_score: signal.confluence_score || null,
    confidence: signal.confidence || 'NORMAL',
    trigger_reason: signal.trigger_reason || 'Smart Scan',
    last_checked: new Date().toISOString(),
    history: [{
      timestamp: new Date().toISOString(),
      event: 'SIGNAL_CREATED',
      price: signal.entry_price
    }]
  };

  history.signals.push(newSignal);
  saveSignalsHistory(history);

  console.log(`[Signals] Recorded new ${signal.direction} signal for ${signal.symbol}`);
  return newSignal;
}

/**
 * Update signal status
 * @param {string} signalId - Signal ID
 * @param {string} newStatus - New status
 * @param {number} currentPrice - Price at status change
 */
function updateSignalStatus(signalId, newStatus, currentPrice) {
  const history = loadSignalsHistory();
  const signal = history.signals.find(s => s.id === signalId);

  if (!signal) {
    console.error(`[Signals] Signal ${signalId} not found`);
    return null;
  }

  const oldStatus = signal.status;
  signal.status = newStatus;
  signal.last_checked = new Date().toISOString();
  signal.history.push({
    timestamp: new Date().toISOString(),
    event: `STATUS_CHANGE: ${oldStatus} -> ${newStatus}`,
    price: currentPrice
  });

  saveSignalsHistory(history);
  console.log(`[Signals] Updated ${signal.symbol}: ${oldStatus} -> ${newStatus} @ $${currentPrice}`);
  return signal;
}

/**
 * Get today's UTC date string (YYYY-MM-DD)
 */
function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a signal was already sent today for symbol/direction
 * @param {string} symbol - Trading pair
 * @param {string} direction - 'LONG' or 'SHORT'
 * @returns {Object} { blocked: boolean, reason: string, existingSignal: Object|null }
 */
function checkDailyDirectionLimit(symbol, direction) {
  const history = loadSignalsHistory();
  const todayUTC = getTodayUTC();

  const todaySignal = history.signals.find(s =>
    s.symbol === symbol &&
    s.direction === direction &&
    s.timestamp.startsWith(todayUTC)
  );

  if (todaySignal) {
    return {
      blocked: true,
      reason: `DAILY_LIMIT: ${direction} signal for ${symbol} already sent today at ${todaySignal.timestamp}`,
      existingSignal: todaySignal
    };
  }

  return { blocked: false, reason: null, existingSignal: null };
}

/**
 * Check if there's an active trade that hasn't hit SL or TP
 * @param {string} symbol - Trading pair
 * @param {string} direction - 'LONG' or 'SHORT'
 * @param {number} currentPrice - Current market price
 * @returns {Object} { blocked: boolean, reason: string, signal: Object|null, statusUpdate: string|null }
 */
function checkActiveTrade(symbol, direction, currentPrice) {
  const history = loadSignalsHistory();

  // Find the most recent active signal for this symbol/direction
  const activeSignal = history.signals
    .filter(s =>
      s.symbol === symbol &&
      s.direction === direction &&
      s.status === SignalStatus.ACTIVE
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

  if (!activeSignal) {
    return { blocked: false, reason: null, signal: null, statusUpdate: null };
  }

  // Check if price hit SL or TP1
  const isLong = direction === 'LONG';

  // For LONG: SL is below entry, TP1 is above entry
  // For SHORT: SL is above entry, TP1 is below entry
  const hitSL = isLong
    ? currentPrice <= activeSignal.sl_price
    : currentPrice >= activeSignal.sl_price;

  const hitTP1 = isLong
    ? currentPrice >= activeSignal.tp1_price
    : currentPrice <= activeSignal.tp1_price;

  if (hitSL) {
    // Update status to Hit_SL
    updateSignalStatus(activeSignal.id, SignalStatus.HIT_SL, currentPrice);
    return {
      blocked: false,
      reason: `Previous trade hit SL @ $${currentPrice}. New analysis allowed.`,
      signal: activeSignal,
      statusUpdate: SignalStatus.HIT_SL
    };
  }

  if (hitTP1) {
    // Update status to Hit_TP1
    updateSignalStatus(activeSignal.id, SignalStatus.HIT_TP1, currentPrice);
    return {
      blocked: false,
      reason: `Previous trade hit TP1 @ $${currentPrice}. New analysis allowed.`,
      signal: activeSignal,
      statusUpdate: SignalStatus.HIT_TP1
    };
  }

  // Trade still in progress
  return {
    blocked: true,
    reason: `ACTIVE_TRADE: ${direction} position for ${symbol} still open (Entry: $${activeSignal.entry_price}, Current: $${currentPrice}, SL: $${activeSignal.sl_price}, TP1: $${activeSignal.tp1_price})`,
    signal: activeSignal,
    statusUpdate: null
  };
}

/**
 * Signal Gatekeeper - Check if analysis should proceed
 * @param {string} symbol - Trading pair
 * @param {string} direction - 'LONG' or 'SHORT' (optional, checks both if not provided)
 * @param {number} currentPrice - Current market price
 * @returns {Object} { allowed: boolean, reason: string, details: Object }
 */
async function signalGatekeeper(symbol, direction, currentPrice) {
  console.log(`\n[Gatekeeper] Checking ${symbol} ${direction || 'BOTH'} @ $${currentPrice}`);

  // If direction not specified, we just check if any direction is blocked
  const directionsToCheck = direction ? [direction] : ['LONG', 'SHORT'];
  const results = {};

  for (const dir of directionsToCheck) {
    // Check 1: Daily directional limit
    const dailyCheck = checkDailyDirectionLimit(symbol, dir);
    if (dailyCheck.blocked) {
      console.log(`  ⊘ ${dir}: ${dailyCheck.reason}`);
      results[dir] = { allowed: false, reason: dailyCheck.reason, type: 'DAILY_LIMIT' };
      continue;
    }

    // Check 2: Active trade check
    const activeCheck = checkActiveTrade(symbol, dir, currentPrice);
    if (activeCheck.blocked) {
      console.log(`  ⊘ ${dir}: ${activeCheck.reason}`);
      results[dir] = { allowed: false, reason: activeCheck.reason, type: 'ACTIVE_TRADE' };
      continue;
    }

    // Passed all checks
    if (activeCheck.statusUpdate) {
      console.log(`  ✓ ${dir}: Previous trade closed (${activeCheck.statusUpdate}). Analysis allowed.`);
    } else {
      console.log(`  ✓ ${dir}: No blocking conditions. Analysis allowed.`);
    }
    results[dir] = { allowed: true, reason: activeCheck.reason || 'No blocking conditions', type: null };
  }

  // Determine overall result
  const anyAllowed = Object.values(results).some(r => r.allowed);

  return {
    symbol,
    currentPrice,
    timestamp: new Date().toISOString(),
    results,
    anyAllowed,
    allowedDirections: Object.entries(results)
      .filter(([_, r]) => r.allowed)
      .map(([dir, _]) => dir)
  };
}

/**
 * Get all active signals
 * @returns {Array} Active signals
 */
function getActiveSignals() {
  const history = loadSignalsHistory();
  return history.signals.filter(s => s.status === SignalStatus.ACTIVE);
}

/**
 * Monitor all active signals and update their status based on current prices
 * @returns {Object} Monitoring results
 */
async function monitorActiveSignals() {
  console.log('\n════════════════════════════════════════');
  console.log('  SIGNAL MONITOR - Checking Active Trades');
  console.log('════════════════════════════════════════\n');

  const activeSignals = getActiveSignals();

  if (activeSignals.length === 0) {
    console.log('No active signals to monitor.');
    return { checked: 0, updated: [] };
  }

  console.log(`Monitoring ${activeSignals.length} active signal(s)...\n`);

  // Fetch current prices for all unique symbols
  const symbols = [...new Set(activeSignals.map(s => s.symbol))];
  const marketData = await fetchMarketData();
  const priceMap = {};
  marketData.forEach(t => priceMap[t.symbol] = t.price);

  const updated = [];

  for (const signal of activeSignals) {
    const currentPrice = priceMap[signal.symbol];

    if (!currentPrice) {
      console.log(`  ⚠ ${signal.symbol}: Price not found`);
      continue;
    }

    const isLong = signal.direction === 'LONG';

    // Check SL
    const hitSL = isLong
      ? currentPrice <= signal.sl_price
      : currentPrice >= signal.sl_price;

    // Check TP levels
    const hitTP1 = isLong
      ? currentPrice >= signal.tp1_price
      : currentPrice <= signal.tp1_price;

    const hitTP2 = signal.tp2_price && (isLong
      ? currentPrice >= signal.tp2_price
      : currentPrice <= signal.tp2_price);

    const hitTP3 = signal.tp3_price && (isLong
      ? currentPrice >= signal.tp3_price
      : currentPrice <= signal.tp3_price);

    let newStatus = null;
    let statusEmoji = '🔄';

    if (hitSL) {
      newStatus = SignalStatus.HIT_SL;
      statusEmoji = '🔴';
    } else if (hitTP3) {
      newStatus = SignalStatus.HIT_TP3;
      statusEmoji = '🏆';
    } else if (hitTP2) {
      newStatus = SignalStatus.HIT_TP2;
      statusEmoji = '🎯';
    } else if (hitTP1) {
      newStatus = SignalStatus.HIT_TP1;
      statusEmoji = '✅';
    }

    if (newStatus) {
      updateSignalStatus(signal.id, newStatus, currentPrice);
      updated.push({ signal, newStatus, currentPrice });
      console.log(`  ${statusEmoji} ${signal.symbol} ${signal.direction}: ${newStatus} @ $${currentPrice}`);
    } else {
      // Calculate P&L percentage
      const pnlPct = isLong
        ? ((currentPrice - signal.entry_price) / signal.entry_price * 100).toFixed(2)
        : ((signal.entry_price - currentPrice) / signal.entry_price * 100).toFixed(2);
      const pnlEmoji = parseFloat(pnlPct) >= 0 ? '📈' : '📉';
      console.log(`  ${pnlEmoji} ${signal.symbol} ${signal.direction}: Active (${pnlPct}%) @ $${currentPrice}`);

      // Update last_checked timestamp
      const history = loadSignalsHistory();
      const sig = history.signals.find(s => s.id === signal.id);
      if (sig) {
        sig.last_checked = new Date().toISOString();
        saveSignalsHistory(history);
      }
    }
  }

  console.log(`\nMonitoring complete. Updated: ${updated.length}/${activeSignals.length}`);

  return { checked: activeSignals.length, updated };
}

/**
 * Get signals history summary
 * @returns {Object} Summary statistics
 */
function getSignalsSummary() {
  const history = loadSignalsHistory();
  const signals = history.signals;

  const active = signals.filter(s => s.status === SignalStatus.ACTIVE);
  const wins = signals.filter(s => s.status.startsWith('Hit_TP'));
  const losses = signals.filter(s => s.status === SignalStatus.HIT_SL);
  const todaySignals = signals.filter(s => s.timestamp.startsWith(getTodayUTC()));

  return {
    total: signals.length,
    active: active.length,
    wins: wins.length,
    losses: losses.length,
    winRate: signals.length > 0 ? ((wins.length / (wins.length + losses.length)) * 100).toFixed(1) : 'N/A',
    todayCount: todaySignals.length,
    lastUpdated: history.lastUpdated,
    recentSignals: signals
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
      .map(s => ({
        symbol: s.symbol,
        direction: s.direction,
        status: s.status,
        entry: s.entry_price,
        timestamp: s.timestamp
      }))
  };
}

/**
 * Start background monitoring loop
 * @param {number} intervalMs - Monitoring interval in milliseconds
 */
let monitorInterval = null;
function startSignalMonitor(intervalMs = CONFIG.monitorIntervalMs) {
  if (monitorInterval) {
    console.log('[Monitor] Already running');
    return;
  }

  console.log(`[Monitor] Starting signal monitor (interval: ${intervalMs / 1000}s)`);

  // Run immediately
  monitorActiveSignals().catch(console.error);

  // Then run on interval
  monitorInterval = setInterval(() => {
    monitorActiveSignals().catch(console.error);
  }, intervalMs);

  console.log('[Monitor] Signal monitor started');
}

/**
 * Stop background monitoring loop
 */
function stopSignalMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[Monitor] Signal monitor stopped');
  }
}

// ═══════════════════════════════════════════════════════════════
// MARKET DATA FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch 24h ticker data for all USDT pairs
 */
async function fetchMarketData() {
  console.log('[BinanceClient] Fetching 24h ticker data...');

  const tickers = await apiRequest('/api/v3/ticker/24hr');

  // Filter to USDT pairs only
  const usdtPairs = tickers.filter(t => t.symbol.endsWith('USDT'));

  console.log(`[BinanceClient] Found ${usdtPairs.length} USDT pairs`);

  return usdtPairs.map(t => ({
    symbol: t.symbol,
    price: parseFloat(t.lastPrice),
    priceChange24h: parseFloat(t.priceChangePercent),
    volume24h: parseFloat(t.quoteVolume), // Volume in USDT
    high24h: parseFloat(t.highPrice),
    low24h: parseFloat(t.lowPrice),
    trades: parseInt(t.count),
  }));
}

/**
 * Fetch klines (candlestick) data for a symbol
 */
async function fetchKlines(symbol, interval = '1h', limit = 24) {
  const endpoint = `/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const klines = await apiRequest(endpoint);

  return klines.map(k => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
    quoteVolume: parseFloat(k[7]),
    trades: k[8],
  }));
}

/**
 * Calculate RVOL (Relative Volume)
 * RVOL = Current hour volume / Average hourly volume (24h)
 */
async function calculateRVOL(symbol) {
  try {
    const klines = await fetchKlines(symbol, '1h', 25); // 24h + current hour

    if (klines.length < 2) return null;

    // Current hour volume (last candle)
    const currentVolume = klines[klines.length - 1].quoteVolume;

    // Average of previous 24 hours
    const historicalKlines = klines.slice(0, -1);
    const avgVolume = historicalKlines.reduce((sum, k) => sum + k.quoteVolume, 0) / historicalKlines.length;

    if (avgVolume === 0) return null;

    const rvol = currentVolume / avgVolume;

    return {
      symbol,
      currentHourVolume: currentVolume,
      avgHourlyVolume: avgVolume,
      rvol: Math.round(rvol * 100) / 100,
    };
  } catch (e) {
    console.error(`[RVOL] Error for ${symbol}: ${e.message}`);
    return null;
  }
}

/**
 * Calculate 4H price change
 */
async function calculate4hChange(symbol) {
  try {
    const klines = await fetchKlines(symbol, '4h', 2);

    if (klines.length < 2) return null;

    const prevClose = klines[0].close;
    const currentClose = klines[1].close;

    const change = ((currentClose - prevClose) / prevClose) * 100;

    return Math.round(change * 100) / 100;
  } catch (e) {
    return null;
  }
}

/**
 * Run market scan with discovery criteria
 * Returns coins that meet all thresholds
 */
async function runScan(options = {}) {
  const {
    minVolume = CONFIG.minVolume24h,
    minChange24h = CONFIG.minChange24h,
    minChange4h = CONFIG.minChange4h,
    rvolThreshold = CONFIG.rvolThreshold,
    limit = 20,
  } = options;

  console.log('\n========================================');
  console.log('  BINANCE ENGINE - MARKET SCAN');
  console.log('========================================\n');
  console.log('Discovery Criteria:');
  console.log(`  - Volume 24h: > $${(minVolume / 1_000_000).toFixed(0)}M`);
  console.log(`  - Change 24h: > ${minChange24h}% (absolute)`);
  console.log(`  - Change 4h:  > ${minChange4h}%`);
  console.log(`  - RVOL:       > ${rvolThreshold}`);
  console.log('');

  // Step 1: Fetch all market data
  console.log('[1/4] Fetching market data...');
  const marketData = await fetchMarketData();

  // Step 2: Filter by volume and 24h change
  console.log('[2/4] Applying volume and change filters...');
  const volumeFiltered = marketData.filter(t =>
    t.volume24h >= minVolume &&
    Math.abs(t.priceChange24h) >= minChange24h
  );
  console.log(`      ${volumeFiltered.length} pairs passed volume/change filter`);

  // Step 3: Calculate 4h change for filtered pairs
  console.log('[3/4] Calculating 4H changes...');
  const withChange4h = [];
  for (const ticker of volumeFiltered.slice(0, 50)) { // Limit API calls
    const change4h = await calculate4hChange(ticker.symbol);
    if (change4h !== null && Math.abs(change4h) >= minChange4h) {
      withChange4h.push({ ...ticker, change4h });
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`      ${withChange4h.length} pairs passed 4H change filter`);

  // Step 4: Calculate RVOL for remaining candidates
  console.log('[4/4] Calculating RVOL...');
  const candidates = [];
  for (const ticker of withChange4h) {
    const rvolData = await calculateRVOL(ticker.symbol);
    if (rvolData && rvolData.rvol >= rvolThreshold) {
      candidates.push({
        ...ticker,
        rvol: rvolData.rvol,
        currentHourVolume: rvolData.currentHourVolume,
      });
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // Sort by RVOL (highest first)
  candidates.sort((a, b) => b.rvol - a.rvol);

  // Take top N
  const results = candidates.slice(0, limit);

  // Save results
  const scanReport = {
    timestamp: new Date().toISOString(),
    criteria: { minVolume, minChange24h, minChange4h, rvolThreshold },
    totalPairsScanned: marketData.length,
    passedVolumeFilter: volumeFiltered.length,
    passed4hFilter: withChange4h.length,
    passedRvolFilter: candidates.length,
    results: results,
  };

  fs.writeFileSync(CONFIG.scanResultsPath, JSON.stringify(scanReport, null, 2));

  // Print results
  console.log('\n========================================');
  console.log('  SCAN RESULTS');
  console.log('========================================\n');

  if (results.length === 0) {
    console.log('No coins matched all criteria.');
  } else {
    console.log(`Found ${results.length} high-potential candidates:\n`);

    results.forEach((r, i) => {
      const direction = r.priceChange24h > 0 ? '▲' : '▼';
      console.log(`${i + 1}. ${r.symbol}`);
      console.log(`   Price:     $${r.price.toFixed(6)}`);
      console.log(`   24h:       ${direction} ${r.priceChange24h.toFixed(2)}%`);
      console.log(`   4h:        ${r.change4h > 0 ? '▲' : '▼'} ${r.change4h.toFixed(2)}%`);
      console.log(`   Volume:    $${(r.volume24h / 1_000_000).toFixed(2)}M`);
      console.log(`   RVOL:      ${r.rvol}x`);
      console.log('');
    });
  }

  console.log(`Results saved to: ${CONFIG.scanResultsPath}`);
  console.log('========================================\n');

  return results;
}

/**
 * Smart Scan - Scan with memory-aware filtering
 * Only triggers deep analysis for assets that pass the smart filter
 * @param {Object} options - Scan options
 * @returns {Object} { toAnalyze: [], skipped: [], observations: [] }
 */
async function smartScan(options = {}) {
  const {
    minVolume = CONFIG.minVolume24h,
    minChange24h = CONFIG.minChange24h,
    minChange4h = CONFIG.minChange4h,
    rvolThreshold = CONFIG.rvolThreshold,
    limit = 20,
  } = options;

  console.log('\n════════════════════════════════════════');
  console.log('  BINANCE ENGINE - SMART SCAN');
  console.log('  (Memory-Aware Delta Filtering)');
  console.log('════════════════════════════════════════\n');

  console.log('Discovery Criteria:');
  console.log(`  - Volume 24h: > $${(minVolume / 1_000_000).toFixed(0)}M`);
  console.log(`  - Change 24h: > ${minChange24h}% (absolute)`);
  console.log(`  - Change 4h:  > ${minChange4h}%`);
  console.log(`  - RVOL:       > ${rvolThreshold}`);
  console.log('\nSmart Filter Rules:');
  console.log(`  - New asset:     → ANALYZE`);
  console.log(`  - Time > ${CONFIG.analysisExpireHours}h:     → ANALYZE`);
  console.log(`  - Price Δ > ${CONFIG.priceChangeThreshold * 100}%: → ANALYZE`);
  console.log(`  - Otherwise:     → SKIP (add to observation)`);
  console.log('');

  // Step 1: Run normal scan to get candidates
  console.log('[1/5] Running initial scan...');
  const marketData = await fetchMarketData();

  // Step 2: Filter by volume and 24h change
  console.log('[2/5] Applying volume/change filters...');
  const volumeFiltered = marketData.filter(t =>
    t.volume24h >= minVolume &&
    Math.abs(t.priceChange24h) >= minChange24h
  );
  console.log(`      ${volumeFiltered.length} pairs passed volume/change filter`);

  // Step 3: Calculate 4h change for filtered pairs
  console.log('[3/5] Calculating 4H changes...');
  const withChange4h = [];
  for (const ticker of volumeFiltered.slice(0, 50)) {
    const change4h = await calculate4hChange(ticker.symbol);
    if (change4h !== null && Math.abs(change4h) >= minChange4h) {
      withChange4h.push({ ...ticker, change4h });
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`      ${withChange4h.length} pairs passed 4H change filter`);

  // Step 4: Calculate RVOL
  console.log('[4/5] Calculating RVOL...');
  const scoutedCandidates = [];
  for (const ticker of withChange4h) {
    const rvolData = await calculateRVOL(ticker.symbol);
    if (rvolData && rvolData.rvol >= rvolThreshold) {
      scoutedCandidates.push({
        ...ticker,
        rvol: rvolData.rvol,
        currentHourVolume: rvolData.currentHourVolume,
      });
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`      ${scoutedCandidates.length} pairs passed RVOL filter`);

  // Step 5: Apply Smart Filter
  console.log('[5/5] Applying smart filter (memory check)...');

  const toAnalyze = [];
  const skipped = [];
  const observations = [];

  for (const candidate of scoutedCandidates) {
    const filterResult = shouldAnalyze(candidate.symbol, candidate.price, candidate.rvol);

    if (filterResult.shouldAnalyze) {
      console.log(`  ✓ ${filterResult.message}`);
      toAnalyze.push({
        ...candidate,
        filterReason: filterResult.reason
      });
    } else {
      console.log(`  ⊘ ${filterResult.message}`);
      skipped.push({
        ...candidate,
        filterReason: filterResult.reason
      });

      // Add to observation list
      addToObservation(candidate.symbol, `Scout criteria met, no significant delta`);
      observations.push(candidate.symbol);
    }
  }

  // Sort toAnalyze by RVOL
  toAnalyze.sort((a, b) => b.rvol - a.rvol);

  // Limit results
  const limitedAnalyze = toAnalyze.slice(0, limit);

  // Save results
  const scanReport = {
    timestamp: new Date().toISOString(),
    type: 'SMART_SCAN',
    criteria: { minVolume, minChange24h, minChange4h, rvolThreshold },
    smartFilterConfig: {
      analysisExpireHours: CONFIG.analysisExpireHours,
      priceChangeThreshold: CONFIG.priceChangeThreshold
    },
    totalPairsScanned: marketData.length,
    passedScoutFilter: scoutedCandidates.length,
    passedSmartFilter: toAnalyze.length,
    skippedBySmartFilter: skipped.length,
    toAnalyze: limitedAnalyze,
    skipped: skipped,
    observations: observations
  };

  fs.writeFileSync(CONFIG.scanResultsPath, JSON.stringify(scanReport, null, 2));

  // Print results
  console.log('\n════════════════════════════════════════');
  console.log('  SMART SCAN RESULTS');
  console.log('════════════════════════════════════════\n');

  console.log(`Scout Matches:     ${scoutedCandidates.length}`);
  console.log(`→ Need Analysis:   ${toAnalyze.length}`);
  console.log(`→ Skipped:         ${skipped.length} (in observation)`);
  console.log('');

  if (limitedAnalyze.length > 0) {
    console.log('━━━ ASSETS REQUIRING ANALYSIS ━━━\n');
    limitedAnalyze.forEach((r, i) => {
      const direction = r.priceChange24h > 0 ? '▲' : '▼';
      console.log(`${i + 1}. ${r.symbol} [${r.filterReason}]`);
      console.log(`   Price:  $${r.price.toFixed(6)} | ${direction} ${r.priceChange24h.toFixed(2)}% (24h)`);
      console.log(`   Volume: $${(r.volume24h / 1_000_000).toFixed(2)}M | RVOL: ${r.rvol}x`);
      console.log('');
    });
  } else {
    console.log('No assets require new analysis at this time.\n');
  }

  if (skipped.length > 0) {
    console.log('━━━ IN OBSERVATION (SKIPPED) ━━━');
    console.log(`Assets: ${skipped.map(s => s.symbol).join(', ')}\n`);
  }

  console.log(`Results saved to: ${CONFIG.scanResultsPath}`);
  console.log('════════════════════════════════════════\n');

  return {
    toAnalyze: limitedAnalyze,
    skipped,
    observations,
    scoutMatches: scoutedCandidates.length
  };
}

/**
 * Send scan report to WhatsApp webhook for notification
 * @param {Object} scanResults - Results from smartScan()
 * @returns {Promise<boolean>} Success status
 */
async function sendScanReportToWhatsApp(scanResults) {
  const { toAnalyze, skipped, observations, scoutMatches } = scanResults;

  // Only send if there's something to report
  if (toAnalyze.length === 0 && skipped.length === 0) {
    console.log('[WhatsApp] No results to report');
    return false;
  }

  const payload = JSON.stringify({
    toAnalyze,
    skipped,
    observations,
    scoutMatches,
    timestamp: new Date().toISOString()
  });

  return new Promise((resolve) => {
    const req = require('http').request({
      hostname: 'localhost',
      port: 3001,
      path: '/webhook/scan-report',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[WhatsApp] Scan report sent successfully');
          resolve(true);
        } else {
          console.log('[WhatsApp] Scan report failed:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log('[WhatsApp] Could not send scan report:', e.message);
      console.log('[WhatsApp] (Bridge may not be running - this is optional)');
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Execute Order (SCAFFOLD - requires API keys)
 * This is a placeholder for future implementation
 */
async function executeOrder(params) {
  const { symbol, side, type = 'MARKET', quantity, price } = params;

  console.log('\n[ExecuteOrder] SCAFFOLD MODE - Not executing real trade');
  console.log('Order Details:');
  console.log(`  Symbol:   ${symbol}`);
  console.log(`  Side:     ${side}`);
  console.log(`  Type:     ${type}`);
  console.log(`  Quantity: ${quantity}`);
  if (price) console.log(`  Price:    ${price}`);

  // TODO: Implement with signed requests when API keys are configured
  // const timestamp = Date.now();
  // const queryString = `symbol=${symbol}&side=${side}&type=${type}&quantity=${quantity}&timestamp=${timestamp}`;
  // const signature = createHmac('sha256', API_SECRET).update(queryString).digest('hex');

  return {
    status: 'SCAFFOLD',
    message: 'Order execution requires API key configuration',
    params,
  };
}

/**
 * Get Positions (SCAFFOLD - requires API keys)
 */
async function getPositions() {
  console.log('\n[GetPositions] SCAFFOLD MODE - Requires API key configuration');

  // TODO: Implement with /api/v3/account endpoint

  return {
    status: 'SCAFFOLD',
    message: 'Position tracking requires API key configuration',
    positions: [],
  };
}

/**
 * Get Order Book for a symbol
 */
async function getOrderBook(symbol, limit = 10) {
  const endpoint = `/api/v3/depth?symbol=${symbol}&limit=${limit}`;
  const book = await apiRequest(endpoint);

  return {
    symbol,
    bids: book.bids.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
    asks: book.asks.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
  };
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'scan';

  try {
    switch (command) {
      case 'scan':
        await runScan();
        break;

      case 'smart-scan':
      case 'smartscan':
        const smartResults = await smartScan();
        // Optionally send to WhatsApp if --notify flag is passed
        if (args.includes('--notify') || args.includes('-n')) {
          await sendScanReportToWhatsApp(smartResults);
        }
        break;

      case 'history':
        const summary = getHistorySummary();
        console.log('\n════════════════════════════════════════');
        console.log('  ANALYSIS HISTORY SUMMARY');
        console.log('════════════════════════════════════════\n');
        console.log(`Total Assets Tracked: ${summary.totalAssets}`);
        console.log(`Last Updated: ${summary.lastUpdated || 'Never'}`);
        if (summary.recentAnalyses.length > 0) {
          console.log('\nRecent Analyses:');
          summary.recentAnalyses.forEach(a => {
            console.log(`  ${a.symbol}: $${a.price} @ ${a.analyzedAt} [${a.result}]`);
          });
        }
        console.log('');
        break;

      case 'check':
        const checkSymbol = args[1];
        if (!checkSymbol) {
          console.log('Usage: node binance-client.js check <SYMBOL>');
          console.log('Check if asset needs re-analysis');
          process.exit(1);
        }
        // Get current price
        const checkData = await fetchMarketData();
        const checkTicker = checkData.find(t => t.symbol === checkSymbol.toUpperCase());
        if (!checkTicker) {
          console.log(`Symbol ${checkSymbol} not found`);
          process.exit(1);
        }
        const checkResult = shouldAnalyze(checkSymbol.toUpperCase(), checkTicker.price);
        console.log(`\n${checkSymbol.toUpperCase()} Smart Filter Check:`);
        console.log(`  Current Price: $${checkTicker.price}`);
        console.log(`  Result: ${checkResult.shouldAnalyze ? '✓ ANALYZE' : '⊘ SKIP'}`);
        console.log(`  Reason: ${checkResult.reason}`);
        console.log(`  ${checkResult.message}`);
        break;

      case 'update-history':
        const updateSymbol = args[1];
        const updatePrice = parseFloat(args[2]);
        const updateRvol = parseFloat(args[3]) || 1.0;
        if (!updateSymbol || isNaN(updatePrice)) {
          console.log('Usage: node binance-client.js update-history <SYMBOL> <PRICE> [RVOL]');
          process.exit(1);
        }
        updateAnalysisHistory(updateSymbol.toUpperCase(), updatePrice, updateRvol);
        console.log(`Updated history for ${updateSymbol.toUpperCase()}`);
        break;

      case 'observations':
        const obsList = loadObservationList();
        console.log('\n════════════════════════════════════════');
        console.log('  OBSERVATION LIST');
        console.log('════════════════════════════════════════\n');
        console.log(`Last Updated: ${obsList.lastUpdated || 'Never'}`);
        console.log(`Total: ${obsList.assets.length} assets\n`);
        if (obsList.assets.length > 0) {
          obsList.assets.forEach(a => {
            console.log(`  ${a.symbol}: ${a.reason} (checks: ${a.check_count})`);
          });
        }
        console.log('');
        break;

      // ═══════════════════════════════════════════════════════════
      // SIGNAL MANAGEMENT COMMANDS
      // ═══════════════════════════════════════════════════════════

      case 'signals':
        const sigSummary = getSignalsSummary();
        console.log('\n════════════════════════════════════════');
        console.log('  SIGNALS HISTORY');
        console.log('════════════════════════════════════════\n');
        console.log(`Total Signals: ${sigSummary.total}`);
        console.log(`Active:        ${sigSummary.active}`);
        console.log(`Wins (TP):     ${sigSummary.wins}`);
        console.log(`Losses (SL):   ${sigSummary.losses}`);
        console.log(`Win Rate:      ${sigSummary.winRate}%`);
        console.log(`Today:         ${sigSummary.todayCount} signals`);
        console.log(`Last Updated:  ${sigSummary.lastUpdated || 'Never'}`);
        if (sigSummary.recentSignals.length > 0) {
          console.log('\nRecent Signals:');
          sigSummary.recentSignals.forEach(s => {
            const emoji = s.status === 'Active' ? '🔄' : s.status.startsWith('Hit_TP') ? '✅' : '🔴';
            console.log(`  ${emoji} ${s.symbol} ${s.direction}: ${s.status} @ $${s.entry}`);
          });
        }
        console.log('');
        break;

      case 'gatekeeper':
        const gkSymbol = args[1];
        const gkDirection = args[2]?.toUpperCase();
        if (!gkSymbol) {
          console.log('Usage: node binance-client.js gatekeeper <SYMBOL> [LONG|SHORT]');
          console.log('Example: node binance-client.js gatekeeper BTCUSDT LONG');
          process.exit(1);
        }
        // Get current price
        const gkMarketData = await fetchMarketData();
        const gkTicker = gkMarketData.find(t => t.symbol === gkSymbol.toUpperCase());
        if (!gkTicker) {
          console.log(`Symbol ${gkSymbol} not found`);
          process.exit(1);
        }
        const gkResult = await signalGatekeeper(gkSymbol.toUpperCase(), gkDirection, gkTicker.price);
        console.log('\n════════════════════════════════════════');
        console.log('  GATEKEEPER RESULT');
        console.log('════════════════════════════════════════\n');
        console.log(`Symbol: ${gkResult.symbol}`);
        console.log(`Price:  $${gkResult.currentPrice}`);
        console.log(`Allowed Directions: ${gkResult.allowedDirections.join(', ') || 'None'}`);
        Object.entries(gkResult.results).forEach(([dir, res]) => {
          const emoji = res.allowed ? '✓' : '⊘';
          console.log(`\n${emoji} ${dir}: ${res.allowed ? 'ALLOWED' : 'BLOCKED'}`);
          if (res.reason) console.log(`  Reason: ${res.reason}`);
        });
        console.log('');
        break;

      case 'record-signal':
        const rsSymbol = args[1];
        const rsDirection = args[2]?.toUpperCase();
        const rsEntry = parseFloat(args[3]);
        const rsSL = parseFloat(args[4]);
        const rsTP1 = parseFloat(args[5]);
        if (!rsSymbol || !rsDirection || isNaN(rsEntry) || isNaN(rsSL) || isNaN(rsTP1)) {
          console.log('Usage: node binance-client.js record-signal <SYMBOL> <LONG|SHORT> <ENTRY> <SL> <TP1>');
          console.log('Example: node binance-client.js record-signal BTCUSDT LONG 100000 98000 104000');
          process.exit(1);
        }
        const newSig = recordSignal({
          symbol: rsSymbol.toUpperCase(),
          direction: rsDirection,
          entry_price: rsEntry,
          sl_price: rsSL,
          tp1_price: rsTP1,
          trigger_reason: 'Manual entry'
        });
        console.log(`\n✓ Signal recorded: ${newSig.id}`);
        console.log(`  ${newSig.symbol} ${newSig.direction} @ $${newSig.entry_price}`);
        console.log(`  SL: $${newSig.sl_price} | TP1: $${newSig.tp1_price}`);
        break;

      case 'monitor':
        if (args[1] === 'start') {
          const intervalSec = parseInt(args[2]) || 300;
          startSignalMonitor(intervalSec * 1000);
          console.log('Press Ctrl+C to stop monitoring');
          // Keep process alive
          await new Promise(() => {});
        } else if (args[1] === 'once') {
          await monitorActiveSignals();
        } else {
          console.log('Usage: node binance-client.js monitor <start|once> [interval_seconds]');
          console.log('  start [sec] - Start continuous monitoring (default: 300s)');
          console.log('  once        - Run single monitoring check');
        }
        break;

      case 'active-signals':
        const activeSigs = getActiveSignals();
        console.log('\n════════════════════════════════════════');
        console.log('  ACTIVE SIGNALS');
        console.log('════════════════════════════════════════\n');
        if (activeSigs.length === 0) {
          console.log('No active signals.');
        } else {
          console.log(`${activeSigs.length} active signal(s):\n`);
          for (const sig of activeSigs) {
            console.log(`${sig.symbol} ${sig.direction}`);
            console.log(`  Entry: $${sig.entry_price}`);
            console.log(`  SL:    $${sig.sl_price}`);
            console.log(`  TP1:   $${sig.tp1_price}`);
            console.log(`  Since: ${sig.timestamp}`);
            console.log('');
          }
        }
        break;

      // ═══════════════════════════════════════════════════════════
      // MUTE/COOLDOWN COMMANDS
      // ═══════════════════════════════════════════════════════════

      case 'muted':
        const mutedAssets = getMutedAssets();
        console.log('\n════════════════════════════════════════');
        console.log('  MUTED ASSETS (Cooldown)');
        console.log('════════════════════════════════════════\n');
        console.log(`Confidence Threshold: ${CONFIG.confidenceThreshold}%`);
        console.log(`Mute Duration: ${CONFIG.muteDurationHours} hours\n`);
        if (mutedAssets.length === 0) {
          console.log('No muted assets.');
        } else {
          console.log(`${mutedAssets.length} asset(s) currently muted:\n`);
          for (const m of mutedAssets) {
            console.log(`🔇 ${m.symbol}`);
            console.log(`   Confidence: ${m.confidenceScore || 'N/A'}%`);
            console.log(`   Reason: ${m.reason}`);
            console.log(`   Remaining: ${m.remainingHours}h (until ${m.muteUntil})`);
            console.log('');
          }
        }
        break;

      case 'mute':
        const muteSymbol = args[1];
        const muteReason = args.slice(2).join(' ') || 'Manual mute';
        if (!muteSymbol) {
          console.log('Usage: node binance-client.js mute <SYMBOL> [reason]');
          console.log('Example: node binance-client.js mute BTCUSDT "Testing cooldown"');
          process.exit(1);
        }
        muteAsset(muteSymbol.toUpperCase(), muteReason);
        console.log(`\n✓ ${muteSymbol.toUpperCase()} muted for ${CONFIG.muteDurationHours} hours`);
        break;

      case 'unmute':
        const unmuteSymbol = args[1];
        if (!unmuteSymbol) {
          console.log('Usage: node binance-client.js unmute <SYMBOL>');
          process.exit(1);
        }
        unmmuteAsset(unmuteSymbol.toUpperCase());
        console.log(`\n✓ ${unmuteSymbol.toUpperCase()} unmuted`);
        break;

      case 'check-confidence':
        const ccPoints = parseInt(args[1]);
        if (isNaN(ccPoints)) {
          console.log('Usage: node binance-client.js check-confidence <POINTS>');
          console.log('Example: node binance-client.js check-confidence 11');
          process.exit(1);
        }
        const ccPercent = calculateConfidencePercent(ccPoints);
        const ccResult = checkConfidenceThreshold(ccPercent);
        console.log(`\n════════════════════════════════════════`);
        console.log(`  CONFIDENCE CHECK`);
        console.log(`════════════════════════════════════════\n`);
        console.log(`Points: ${ccPoints}/15`);
        console.log(`Confidence: ${ccPercent}%`);
        console.log(`Threshold: ${ccResult.threshold}%`);
        console.log(`Result: ${ccResult.meetsThreshold ? '✓ SIGNAL ALLOWED' : '⊘ WAIT (MUTED)'}`);
        console.log(`${ccResult.message}`);
        break;

      case 'rvol':
        const symbol = args[1];
        if (!symbol) {
          console.log('Usage: node binance-client.js rvol <SYMBOL>');
          console.log('Example: node binance-client.js rvol BTCUSDT');
          process.exit(1);
        }
        const rvolData = await calculateRVOL(symbol.toUpperCase());
        if (rvolData) {
          console.log(`\n${rvolData.symbol} RVOL Analysis:`);
          console.log(`  Current Hour Volume: $${(rvolData.currentHourVolume / 1_000_000).toFixed(2)}M`);
          console.log(`  Avg Hourly Volume:   $${(rvolData.avgHourlyVolume / 1_000_000).toFixed(2)}M`);
          console.log(`  RVOL:                ${rvolData.rvol}x`);
        } else {
          console.log('Could not calculate RVOL');
        }
        break;

      case 'ticker':
        const tickerSymbol = args[1];
        if (!tickerSymbol) {
          console.log('Usage: node binance-client.js ticker <SYMBOL>');
          process.exit(1);
        }
        const marketData = await fetchMarketData();
        const ticker = marketData.find(t => t.symbol === tickerSymbol.toUpperCase());
        if (ticker) {
          console.log(`\n${ticker.symbol} Ticker:`);
          console.log(`  Price:     $${ticker.price}`);
          console.log(`  24h Change: ${ticker.priceChange24h}%`);
          console.log(`  Volume:    $${(ticker.volume24h / 1_000_000).toFixed(2)}M`);
          console.log(`  High:      $${ticker.high24h}`);
          console.log(`  Low:       $${ticker.low24h}`);
        } else {
          console.log('Symbol not found');
        }
        break;

      case 'book':
        const bookSymbol = args[1];
        if (!bookSymbol) {
          console.log('Usage: node binance-client.js book <SYMBOL>');
          process.exit(1);
        }
        const book = await getOrderBook(bookSymbol.toUpperCase());
        console.log(`\n${book.symbol} Order Book:`);
        console.log('\nAsks (Sell):');
        book.asks.slice(0, 5).reverse().forEach(a =>
          console.log(`  $${a.price.toFixed(6)} - ${a.qty}`)
        );
        console.log('  ---');
        console.log('Bids (Buy):');
        book.bids.slice(0, 5).forEach(b =>
          console.log(`  $${b.price.toFixed(6)} - ${b.qty}`)
        );
        break;

      default:
        console.log('Binance Client - Commands:');
        console.log('');
        console.log('  Scanning:');
        console.log('    scan              - Run full market scan (no memory filter)');
        console.log('    smart-scan [-n]   - Run smart scan with memory-aware filtering');
        console.log('                        -n, --notify: Send report to WhatsApp');
        console.log('');
        console.log('  Memory:');
        console.log('    history           - Show analysis history summary');
        console.log('    check <SYM>       - Check if asset needs re-analysis');
        console.log('    observations      - Show assets in observation list');
        console.log('    update-history <SYM> <PRICE> [RVOL] - Manual history update');
        console.log('');
        console.log('  Signals:');
        console.log('    signals           - Show signals history and stats');
        console.log('    active-signals    - List all active (open) signals');
        console.log('    gatekeeper <SYM> [DIR] - Check if signal is allowed');
        console.log('    record-signal <SYM> <DIR> <ENTRY> <SL> <TP1> - Record a signal');
        console.log('    monitor <start|once> [sec] - Monitor active signals');
        console.log('');
        console.log('  Mute/Cooldown:');
        console.log('    muted             - Show all muted assets (in cooldown)');
        console.log('    mute <SYM> [reason] - Manually mute an asset');
        console.log('    unmute <SYM>      - Remove mute from an asset');
        console.log('    check-confidence <POINTS> - Check if points meet 75% threshold');
        console.log('');
        console.log('  Data:');
        console.log('    rvol <SYM>        - Calculate RVOL for symbol');
        console.log('    ticker <SYM>      - Get ticker info');
        console.log('    book <SYM>        - Get order book');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  // Market data
  fetchMarketData,
  fetchKlines,
  calculateRVOL,
  calculate4hChange,
  getOrderBook,
  // Scanning
  runScan,
  smartScan,
  // Memory layer
  loadAnalysisHistory,
  saveAnalysisHistory,
  shouldAnalyze,
  updateAnalysisHistory,
  loadObservationList,
  addToObservation,
  getHistorySummary,
  // Mute/Cooldown
  checkMuteStatus,
  muteAsset,
  unmmuteAsset,
  getMutedAssets,
  // Confidence threshold
  calculateConfidencePercent,
  checkConfidenceThreshold,
  processAnalysisResult,
  // Signal management
  SignalStatus,
  loadSignalsHistory,
  saveSignalsHistory,
  recordSignal,
  updateSignalStatus,
  checkDailyDirectionLimit,
  checkActiveTrade,
  signalGatekeeper,
  getActiveSignals,
  monitorActiveSignals,
  getSignalsSummary,
  startSignalMonitor,
  stopSignalMonitor,
  // Notifications
  sendScanReportToWhatsApp,
  // Execution (scaffold)
  executeOrder,
  getPositions,
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(console.error);
}

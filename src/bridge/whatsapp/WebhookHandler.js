const express = require('express');
const logger = require('../utils/logger');
const eventBus = require('../core/EventBus');
const messageParser = require('./MessageParser');
const whatsappClient = require('./WhatsAppClient');
const fs = require('fs');
const path = require('path');

// Analysis history and observation list paths
const ANALYSIS_HISTORY_PATH = path.join(__dirname, '..', '..', '..', 'data', 'analysis_history.json');
const OBSERVATION_LIST_PATH = path.join(__dirname, '..', '..', '..', 'data', 'observation_list.json');

/**
 * Handle incoming webhooks from WhatsAppAPI and TradingView
 */
class WebhookHandler {
  constructor() {
    this.router = express.Router();
    this.groupNameCache = new Map(); // Cache group names
    this.watchlistPath = path.join(__dirname, '..', '..', '..', 'config', 'dynamic_watchlist.json');
    this.setupRoutes();
  }

  /**
   * Setup webhook routes
   */
  setupRoutes() {
    this.router.post('/whatsapp', this.handleWhatsAppWebhook.bind(this));
    this.router.post('/tv-alert', this.handleTVAlertWebhook.bind(this));
    this.router.post('/scan-report', this.handleScanReport.bind(this));
    this.router.get('/observations', this.handleGetObservations.bind(this));
    this.router.get('/health', this.handleHealthCheck.bind(this));
  }

  /**
   * Handle incoming TradingView screener alert webhook
   * Endpoint: POST /webhook/tv-alert
   */
  async handleTVAlertWebhook(req, res) {
    try {
      const payload = req.body;
      const timestamp = new Date().toISOString();

      logger.info('TradingView Alert received', { payload, timestamp });

      // Parse ticker - TradingView sends "BINANCE:SOLUSDT" format
      let symbol = payload.ticker || payload.symbol || '';
      if (symbol.includes(':')) {
        symbol = symbol.split(':')[1]; // Extract SOLUSDT from BINANCE:SOLUSDT
      }

      if (!symbol) {
        logger.warn('TV Alert: No symbol in payload', { payload });
        return res.status(400).json({ status: 'error', message: 'No symbol provided' });
      }

      // Validate against Binance whitelist
      const isValid = await this.validateAgainstWhitelist(symbol);
      if (!isValid) {
        logger.info('TV Alert: Symbol not on Binance whitelist', { symbol });
        return res.json({
          status: 'rejected',
          symbol,
          reason: 'Not on Binance USDT whitelist',
          timestamp
        });
      }

      // Add to pending analysis queue
      await this.addToPendingAnalysis({
        symbol,
        triggered_at: timestamp,
        trigger_reason: this.extractTriggerReason(payload),
        price_at_trigger: parseFloat(payload.price || payload.close || 0),
        volume: payload.volume,
        change_4h: payload.change_4h,
        rsi: payload.rsi,
        status: 'PENDING_ANALYSIS'
      });

      // Emit event for Scout to trigger 5-Pillar analysis
      eventBus.emitEvent('TV_ALERT_RECEIVED', {
        symbol,
        price: payload.price || payload.close,
        exchange: payload.exchange || 'BINANCE',
        triggerReason: this.extractTriggerReason(payload),
        timestamp
      });

      logger.info('TV Alert processed', { symbol, action: 'queued_for_analysis' });

      res.json({
        status: 'received',
        symbol,
        action: '5_pillar_analysis_triggered',
        timestamp
      });

    } catch (error) {
      logger.error('TV Alert webhook error', { error: error.message, stack: error.stack });
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  /**
   * Validate symbol against Binance whitelist
   */
  async validateAgainstWhitelist(symbol) {
    try {
      if (!fs.existsSync(this.watchlistPath)) {
        logger.warn('Watchlist file not found, allowing symbol', { symbol });
        return true; // Allow if no watchlist (fail open)
      }

      const watchlist = JSON.parse(fs.readFileSync(this.watchlistPath, 'utf8'));
      const whitelist = watchlist.binance_whitelist?.pairs || [];

      // Check if symbol is in whitelist
      const isWhitelisted = whitelist.includes(symbol) || whitelist.includes(symbol.toUpperCase());

      // Also check blacklist
      const blacklist = watchlist.blacklist?.assets || [];
      const isBlacklisted = blacklist.includes(symbol) || blacklist.includes(symbol.toUpperCase());

      return isWhitelisted && !isBlacklisted;
    } catch (error) {
      logger.error('Whitelist validation error', { error: error.message, symbol });
      return true; // Fail open if error reading file
    }
  }

  /**
   * Add triggered asset to pending analysis queue
   */
  async addToPendingAnalysis(alertData) {
    try {
      if (!fs.existsSync(this.watchlistPath)) {
        logger.warn('Watchlist file not found, cannot add to pending');
        return;
      }

      const watchlist = JSON.parse(fs.readFileSync(this.watchlistPath, 'utf8'));

      // Initialize alert_triggers if needed
      if (!watchlist.alert_triggers) {
        watchlist.alert_triggers = {
          description: 'Assets triggered by TradingView alerts',
          pending_analysis: []
        };
      }

      // Check if already pending
      const existing = watchlist.alert_triggers.pending_analysis.find(
        a => a.symbol === alertData.symbol
      );

      if (existing) {
        // Update existing entry
        existing.triggered_at = alertData.triggered_at;
        existing.trigger_reason = alertData.trigger_reason;
        existing.price_at_trigger = alertData.price_at_trigger;
        logger.info('Updated existing pending analysis', { symbol: alertData.symbol });
      } else {
        // Add new entry
        watchlist.alert_triggers.pending_analysis.push(alertData);
        logger.info('Added to pending analysis', { symbol: alertData.symbol });
      }

      // Update watchlist file
      watchlist.last_updated = new Date().toISOString();
      fs.writeFileSync(this.watchlistPath, JSON.stringify(watchlist, null, 2));

    } catch (error) {
      logger.error('Error adding to pending analysis', { error: error.message });
    }
  }

  /**
   * Extract trigger reason from TV alert payload
   */
  extractTriggerReason(payload) {
    const reasons = [];

    if (payload.rsi) {
      const rsi = parseFloat(payload.rsi);
      if (rsi < 30) reasons.push(`RSI oversold (${rsi.toFixed(1)})`);
      if (rsi > 70) reasons.push(`RSI overbought (${rsi.toFixed(1)})`);
    }

    if (payload.change_4h) {
      const change = parseFloat(payload.change_4h);
      if (change > 3) reasons.push(`4H gain +${change.toFixed(1)}%`);
      if (change < -3) reasons.push(`4H drop ${change.toFixed(1)}%`);
    }

    if (payload.volume) {
      const vol = parseFloat(payload.volume);
      if (vol > 50000000) reasons.push(`High volume $${(vol / 1e6).toFixed(0)}M`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Screener filter match';
  }

  /**
   * Get Express router
   */
  getRouter() {
    return this.router;
  }

  /**
   * Handle incoming WhatsApp webhook
   */
  async handleWhatsAppWebhook(req, res) {
    try {
      const payload = req.body;

      logger.info('Webhook received', { event: payload.event, chatName: payload.payload?.chatName, from: payload.payload?.from });

      // Parse the message
      const parsed = messageParser.parseWebhookPayload(payload);

      // Ignore non-relevant messages
      if (parsed.type === 'ignored') {
        logger.info('Message ignored', { reason: parsed.reason });
        return res.json({ success: true, ignored: true });
      }

      // For group messages, get group name and check if it's a project group
      if (parsed.isGroupMessage) {
        // Prefer chatName from webhook payload, fallback to API call
        const groupName = payload.payload?.chatName || await this.getGroupName(parsed.groupId);
        parsed.groupName = groupName;

        // Check if this is a project group
        const projectName = messageParser.extractProjectName(groupName);
        if (!projectName) {
          logger.info('Not a project group', { groupName, groupId: parsed.groupId });
          return res.json({ success: true, ignored: true, reason: 'Not a project group' });
        }

        parsed.projectName = projectName;
      } else {
        // Direct messages - could be admin commands or project-agnostic
        parsed.projectName = null;
      }

      // Emit the message received event
      eventBus.emitEvent(eventBus.constructor.Events.MESSAGE_RECEIVED, parsed);

      // Respond to webhook immediately
      res.json({ success: true, received: true });

    } catch (error) {
      logger.error('Webhook handling error', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get group name from group ID (with caching)
   */
  async getGroupName(groupId) {
    // Check cache first
    if (this.groupNameCache.has(groupId)) {
      return this.groupNameCache.get(groupId);
    }

    try {
      // Get from WhatsApp API
      const response = await whatsappClient.getChatInfo(groupId);
      // Response structure: { success: true, chat: { id, name, isGroup, ... } }
      const chatInfo = response?.chat || response;
      const groupName = chatInfo?.name || chatInfo?.subject || 'Unknown Group';

      logger.debug('Got group name from WhatsApp API', { groupId, groupName, response });

      // Cache for 5 minutes
      this.groupNameCache.set(groupId, groupName);
      setTimeout(() => this.groupNameCache.delete(groupId), 5 * 60 * 1000);

      return groupName;
    } catch (error) {
      logger.error('Failed to get group name', { error: error.message, groupId });
      return 'Unknown Group';
    }
  }

  /**
   * Clear group name cache
   */
  clearGroupCache(groupId = null) {
    if (groupId) {
      this.groupNameCache.delete(groupId);
    } else {
      this.groupNameCache.clear();
    }
  }

  /**
   * Handle smart scan report - updates KnowledgeBase and sends WhatsApp notifications
   * Endpoint: POST /webhook/scan-report
   */
  async handleScanReport(req, res) {
    try {
      const { toAnalyze, skipped, observations, scoutMatches, timestamp } = req.body;

      logger.info('Scan report received', {
        scoutMatches,
        toAnalyzeCount: toAnalyze?.length || 0,
        skippedCount: skipped?.length || 0,
        observationCount: observations?.length || 0
      });

      // Update KnowledgeBase with observation status
      if (observations && observations.length > 0) {
        await this.updateObservationStatus(observations);
      }

      // Emit event for any listeners
      eventBus.emitEvent('SMART_SCAN_COMPLETE', {
        toAnalyze: toAnalyze || [],
        skipped: skipped || [],
        observations: observations || [],
        scoutMatches: scoutMatches || 0,
        timestamp: timestamp || new Date().toISOString()
      });

      // Generate WhatsApp summary if there are updates
      const summary = this.generateScanSummary({ toAnalyze, skipped, observations, scoutMatches });

      res.json({
        status: 'received',
        summary,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Scan report error', { error: error.message, stack: error.stack });
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  /**
   * Get current observation list
   * Endpoint: GET /webhook/observations
   */
  async handleGetObservations(req, res) {
    try {
      let observations = { assets: [], lastUpdated: null };

      if (fs.existsSync(OBSERVATION_LIST_PATH)) {
        observations = JSON.parse(fs.readFileSync(OBSERVATION_LIST_PATH, 'utf8'));
      }

      res.json({
        status: 'ok',
        count: observations.assets?.length || 0,
        lastUpdated: observations.lastUpdated,
        assets: observations.assets || []
      });

    } catch (error) {
      logger.error('Get observations error', { error: error.message });
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  /**
   * Update observation status in KnowledgeBase
   */
  async updateObservationStatus(observations) {
    try {
      // For now, just log - KnowledgeBase integration would go here
      logger.info('Updating observation status', {
        count: observations.length,
        symbols: observations
      });

      // Emit event for KnowledgeBase to pick up
      eventBus.emitEvent('OBSERVATION_UPDATE', {
        assets: observations,
        status: 'IN_OBSERVATION',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Observation status update error', { error: error.message });
    }
  }

  /**
   * Generate scan summary for WhatsApp notification
   */
  generateScanSummary({ toAnalyze, skipped, observations, scoutMatches }) {
    const lines = [];

    lines.push('📊 *Smart Scan Report*');
    lines.push(`Scout Matches: ${scoutMatches || 0}`);
    lines.push('');

    if (toAnalyze && toAnalyze.length > 0) {
      lines.push(`🔍 *Need Analysis (${toAnalyze.length}):*`);
      toAnalyze.slice(0, 5).forEach(a => {
        const direction = a.priceChange24h > 0 ? '▲' : '▼';
        lines.push(`  • ${a.symbol}: ${direction}${Math.abs(a.priceChange24h).toFixed(1)}% | RVOL ${a.rvol}x`);
      });
      if (toAnalyze.length > 5) {
        lines.push(`  ... +${toAnalyze.length - 5} more`);
      }
      lines.push('');
    }

    if (skipped && skipped.length > 0) {
      lines.push(`👁️ *In Observation (${skipped.length}):*`);
      lines.push(`  ${skipped.map(s => s.symbol).join(', ')}`);
      lines.push('  _(No significant delta since last analysis)_');
    }

    if (toAnalyze?.length === 0 && skipped?.length === 0) {
      lines.push('_No assets matched scout criteria._');
    }

    return lines.join('\n');
  }

  /**
   * Health check endpoint
   */
  handleHealthCheck(req, res) {
    res.json({
      status: 'ok',
      service: 'whatsapp-claude-bridge',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new WebhookHandler();

---
name: on-chain-intel
description: LAYER 5 - On-Chain Whale & Smart Money Intelligence. Tracks large fund movements, smart money accumulation/distribution, and whale activity to confirm if institutional players align with trade thesis. Use for "whale activity", "on-chain analysis", "smart money", "whale alert", "accumulation", "distribution".
version: 1.0.0
allowed-tools:
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_wait
  - mcp__playwright__browser_hover
  - mcp__playwright__browser_type
  - mcp__playwright__browser_press
  - mcp__playwright__browser_scroll
  - Read
---

# On-Chain Intelligence Skill - LAYER 5

```
+===============================================================================+
|                                                                               |
|           ON-CHAIN INTELLIGENCE - LAYER 5                                     |
|           Whale & Smart Money Tracking                                        |
|                                                                               |
|  Objective: Detect large fund movements and smart money positioning           |
|  to confirm if "Big Players" align with trade thesis.                         |
|                                                                               |
|  Primary Sources:                                                             |
|    - Arkham Intelligence (https://platform.arkhamintelligence.com/)           |
|    - Solscan (https://solscan.io/) - for Solana assets                        |
|    - Etherscan (https://etherscan.io/) - for ETH assets                       |
|    - Whale Alert (https://whale-alert.io/)                                    |
|                                                                               |
|  Output: ONCHAIN_LAYER5_OUTPUT                                                |
|                                                                               |
+===============================================================================+
```

---

## SCORING SYSTEM

```
ONCHAIN_SCORE (1-10 Scale):
+===============================================================================+
|                                                                               |
|  1-2:  HEAVY DISTRIBUTION - Whales are aggressively selling                   |
|        - Multiple large outflows to exchanges                                 |
|        - Smart money wallets reducing positions                               |
|        - Bearish signal - avoid LONG positions                                |
|                                                                               |
|  3-4:  LIGHT DISTRIBUTION - Net selling by large holders                      |
|        - Some outflows detected                                               |
|        - Mixed signals from smart money                                       |
|        - Caution for LONG positions                                           |
|                                                                               |
|  5-6:  NEUTRAL - No significant whale activity                                |
|        - Balanced inflows/outflows                                            |
|        - Normal trading patterns                                              |
|        - Rely on other layers for direction                                   |
|                                                                               |
|  7-8:  LIGHT ACCUMULATION - Net buying by large holders                       |
|        - Some inflows from exchanges to wallets                               |
|        - Smart money increasing positions                                     |
|        - Supports LONG thesis                                                 |
|                                                                               |
|  9-10: HEAVY ACCUMULATION - Whales are aggressively buying                    |
|        - Multiple large inflows from exchanges                                |
|        - Top traders adding to positions                                      |
|        - Strong confirmation for LONG thesis                                  |
|                                                                               |
+===============================================================================+
```

---

## DETECTION CRITERIA

### 1. Whale Alert Detection

```
WHALE_ALERT_THRESHOLDS:
+===============================================================================+
|  Asset Class     | Transaction Threshold | Alert Level                        |
+==================+======================+====================================+
|  BTC             | > $1,000,000         | SIGNIFICANT                        |
|  BTC             | > $10,000,000        | MAJOR WHALE                        |
|  BTC             | > $50,000,000        | INSTITUTIONAL                      |
+------------------+----------------------+------------------------------------+
|  ETH             | > $500,000           | SIGNIFICANT                        |
|  ETH             | > $5,000,000         | MAJOR WHALE                        |
|  ETH             | > $25,000,000        | INSTITUTIONAL                      |
+------------------+----------------------+------------------------------------+
|  SOL / Altcoins  | > $250,000           | SIGNIFICANT                        |
|  SOL / Altcoins  | > $1,000,000         | MAJOR WHALE                        |
|  SOL / Altcoins  | > $5,000,000         | INSTITUTIONAL                      |
+===============================================================================+
```

### 2. Smart Money Flow Detection

```
SMART_MONEY_INDICATORS:
+===============================================================================+
|                                                                               |
|  ACCUMULATION SIGNALS (Bullish):                                              |
|  +-------------------------------------------------------------------------+  |
|  | - Exchange outflows > inflows (coins leaving exchanges)                 |  |
|  | - Whale wallets increasing balance                                      |  |
|  | - Top traders (high win rate wallets) adding positions                  |  |
|  | - Dormant wallets reactivating to buy                                   |  |
|  | - OTC desk activity (large private purchases)                           |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
|  DISTRIBUTION SIGNALS (Bearish):                                              |
|  +-------------------------------------------------------------------------+  |
|  | - Exchange inflows > outflows (coins entering exchanges)                |  |
|  | - Whale wallets decreasing balance                                      |  |
|  | - Top traders reducing/closing positions                                |  |
|  | - Large transfers to exchange deposit addresses                         |  |
|  | - Mining wallets selling                                                |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
+===============================================================================+
```

### 3. Top Wallet Tracking

```
TOP_WALLET_ANALYSIS:
+===============================================================================+
|                                                                               |
|  Track wallets with:                                                          |
|  - High historical win rate (>60%)                                            |
|  - Large portfolio value (>$1M)                                               |
|  - Consistent profitable trades                                               |
|  - Known institutional/fund wallets                                           |
|                                                                               |
|  Check for:                                                                   |
|  [ ] Position changes in last 24H                                             |
|  [ ] New positions opened                                                     |
|  [ ] Positions closed/reduced                                                 |
|  [ ] Wallet balance trend (7D)                                                |
|                                                                               |
+===============================================================================+
```

---

## NAVIGATION WORKFLOW

### Primary Source: Arkham Intelligence

```
ARKHAM_WORKFLOW:
+===============================================================================+

STEP 1: Navigate to Arkham
--------------------------
URL: https://platform.arkhamintelligence.com/
Action: mcp__playwright__browser_navigate
Wait: 3-4 seconds for load

STEP 2: Search for Asset
------------------------
- Use search bar to find asset (BTC, ETH, SOL, etc.)
- Or navigate to specific token page
- Selector: input[placeholder*="Search"]

STEP 3: Check Top Holders
-------------------------
- Navigate to "Top Holders" or "Leaderboard" section
- Identify wallet changes in last 24H/7D
- Note any significant position changes

STEP 4: Check Recent Transactions
---------------------------------
- View "Transactions" or "Transfers" tab
- Filter for large transactions (>threshold)
- Note direction: Exchange -> Wallet (accumulation) vs Wallet -> Exchange (distribution)

STEP 5: Check Smart Money Activity
----------------------------------
- Look for labeled wallets (Funds, Institutions, Smart Money)
- Check their recent activity
- Note any coordinated movements

STEP 6: Take Screenshot
-----------------------
Action: mcp__playwright__browser_take_screenshot
Purpose: Visual proof of on-chain data

+===============================================================================+
```

### Alternative Source: Solscan (for Solana)

```
SOLSCAN_WORKFLOW:
+===============================================================================+

STEP 1: Navigate to Solscan
---------------------------
URL: https://solscan.io/
Action: mcp__playwright__browser_navigate

STEP 2: Search Token
--------------------
- Enter token address or name
- Navigate to token page

STEP 3: Check Holders Tab
-------------------------
- View "Holders" section
- Check top holder changes
- Note concentration risk

STEP 4: Check Transfers
-----------------------
- View recent large transfers
- Identify whale movements
- Check exchange flows

+===============================================================================+
```

### Alternative Source: Whale Alert

```
WHALE_ALERT_WORKFLOW:
+===============================================================================+

STEP 1: Navigate to Whale Alert
-------------------------------
URL: https://whale-alert.io/
Action: mcp__playwright__browser_navigate

STEP 2: Filter by Asset
-----------------------
- Select specific asset (BTC, ETH, etc.)
- Set time range (last 24H)

STEP 3: Analyze Transactions
----------------------------
- Count exchange inflows vs outflows
- Note transaction sizes
- Identify patterns

+===============================================================================+
```

---

## ONCHAIN_LAYER5_OUTPUT FORMAT

```json
{
  "layer": 5,
  "name": "on-chain-intel",
  "timestamp": "[ISO]",
  "asset": "[SYMBOL]",

  "whale_activity": {
    "score": 7,
    "interpretation": "LIGHT_ACCUMULATION",
    "summary": "3 large wallets accumulated $2.1M SOL in last 4H"
  },

  "transactions": {
    "significant_count": 5,
    "total_volume_usd": 2100000,
    "net_flow": "ACCUMULATION",
    "largest_tx": {
      "amount_usd": 850000,
      "direction": "Exchange -> Wallet",
      "time_ago": "2H"
    }
  },

  "smart_money": {
    "top_traders_bullish": 3,
    "top_traders_bearish": 1,
    "sentiment": "BULLISH",
    "confidence": 0.75
  },

  "exchange_flow": {
    "net_flow_24h": "OUTFLOW",
    "outflow_volume_usd": 5200000,
    "inflow_volume_usd": 3100000,
    "interpretation": "Coins leaving exchanges - bullish"
  },

  "confluence_points": 2,
  "verdict": "ACCUMULATION_CONFIRMED",
  "confidence": 0.80,

  "alerts": [
    "Whale wallet 0x...abc accumulated $850K in 2H",
    "Top trader @whale123 increased SOL position by 15%",
    "Net exchange outflow of $2.1M in last 24H"
  ]
}
```

---

## CONFLUENCE SCORING (Layer 5 Contribution)

```
LAYER5_CONFLUENCE_POINTS:
+===============================================================================+
|                                                                               |
|  [ ] On-chain flow aligned with technical bias                    +1         |
|      → If SMC is BULLISH and on-chain shows ACCUMULATION                     |
|      → If SMC is BEARISH and on-chain shows DISTRIBUTION                     |
|                                                                               |
|  [ ] No major whale distribution warning                          +1         |
|      → No large exchange inflows detected                                    |
|      → Smart money not reducing positions                                    |
|                                                                               |
|  LAYER 5 MAX: 2 points                                                        |
|                                                                               |
+===============================================================================+
```

---

## HIGH-CONVICTION RULE

```
+===============================================================================+
|                       HIGH-CONVICTION RULE                                     |
+===============================================================================+
|                                                                               |
|  IF Layer 1 (SMC) is BULLISH                                                  |
|  AND Layer 5 (On-Chain) shows HEAVY ACCUMULATION (Score >= 8)                 |
|  THEN:                                                                        |
|    -> Set Confidence Level to "EXTREME"                                       |
|    -> Allow position size up to 125% of normal                                |
|    -> Flag as "Whale-Confirmed Setup"                                         |
|                                                                               |
|  IF Layer 1 (SMC) is BEARISH                                                  |
|  AND Layer 5 (On-Chain) shows HEAVY DISTRIBUTION (Score <= 2)                 |
|  THEN:                                                                        |
|    -> Set Confidence Level to "EXTREME"                                       |
|    -> Allow position size up to 125% of normal                                |
|    -> Flag as "Whale-Confirmed Setup"                                         |
|                                                                               |
+===============================================================================+
```

---

## CONTRARIAN WARNING (Layer 5)

```
+===============================================================================+
|                    ON-CHAIN CONTRARIAN WARNING                                 |
+===============================================================================+
|                                                                               |
|  IF technicals are BULLISH but On-Chain shows DISTRIBUTION:                   |
|  -> Flag as "WHALE DIVERGENCE WARNING"                                        |
|  -> Reduce position size to 50%                                               |
|  -> Add warning: "Whales selling into strength"                               |
|                                                                               |
|  IF technicals are BEARISH but On-Chain shows ACCUMULATION:                   |
|  -> Flag as "SMART MONEY DIVERGENCE"                                          |
|  -> Consider waiting for reversal confirmation                                |
|  -> Add warning: "Whales buying into weakness - possible bottom"              |
|                                                                               |
+===============================================================================+
```

---

## WHATSAPP OUTPUT FORMAT

```
WHALE ACTIVITY SECTION (Add to Signal Output):
+===============================================================================+

SIGNAL OUTPUT (Whale Section):
------------------------------
[After Social Pulse section, add:]

[whale] **Whale Activity:** [Score]/10 - [Summary]
   [If whale-confirmed: [star] WHALE CONFIRMED: High-conviction setup]
   [If divergence: [warning] WHALE DIVERGENCE: [Warning message]]

EXAMPLE (Accumulation):
-----------------------
[whale] **Whale Activity:** 8/10 - 3 Top Wallets accumulated $2.1M in last 4H
   [star] WHALE CONFIRMED: Smart money aligned with LONG thesis

EXAMPLE (Distribution Warning):
-------------------------------
[whale] **Whale Activity:** 3/10 - Net exchange inflows of $5M detected
   [warning] WHALE DIVERGENCE: Whales selling into strength - reduce size 50%

EXAMPLE (Neutral):
------------------
[whale] **Whale Activity:** 5/10 - No significant whale movements detected

+===============================================================================+
```

---

## PLATFORM SELECTION LOGIC

```
PLATFORM_SELECTION:
+===============================================================================+

IF asset is SOL or Solana token:
  -> Primary: Solscan (https://solscan.io/)
  -> Secondary: Arkham Intelligence

IF asset is ETH or ERC-20 token:
  -> Primary: Etherscan (https://etherscan.io/)
  -> Secondary: Arkham Intelligence

IF asset is BTC:
  -> Primary: Arkham Intelligence
  -> Secondary: Whale Alert

FOR all assets (general whale tracking):
  -> Whale Alert (https://whale-alert.io/)
  -> Arkham Intelligence (comprehensive)

+===============================================================================+
```

---

## INTEGRATION WITH ORCHESTRATOR

```
ORCHESTRATOR_INTEGRATION:
+===============================================================================+

The on-chain-intel skill is invoked as STEP 5 in the 5-pillar workflow:

STEP 4: INVOKE LAYER 4 (Social Sentiment)
  ... [existing workflow]

STEP 5: INVOKE LAYER 5 (On-Chain Intel)  <- NEW
-------------------------------------------
-> Check asset type (SOL/ETH/BTC)
-> Navigate to appropriate platform
-> Check whale transactions (last 24H)
-> Check smart money flow direction
-> Calculate on-chain score (1-10)
-> Apply High-Conviction Rule
-> Apply Contrarian Warning if needed
-> Receive: ONCHAIN_LAYER5_OUTPUT

CHECK: If layer5_verdict == "WHALE_DIVERGENCE"
  -> Flag in output, reduce position to 50%

CHECK: If layer5_verdict == "WHALE_CONFIRMED"
  -> Set confidence to EXTREME, allow +25% position

STEP 6: FINAL CONFLUENCE CHECK
------------------------------
-> Count total confirmations from all 5 layers
-> Apply 5-pillar confluence matrix
-> Determine SIGNAL or WAIT
-> Include Whale Activity in output

+===============================================================================+
```

---

## VERIFICATION CHECKLIST

```
LAYER5_VERIFICATION:
+===============================================================================+

[ ] Asset type identified (SOL/ETH/BTC/Other)
[ ] Appropriate platform selected
[ ] Navigated to platform successfully
[ ] Large transactions checked (last 24H)
[ ] Whale threshold applied correctly
[ ] Exchange flow direction determined
[ ] Smart money activity analyzed
[ ] On-chain score calculated (1-10)
[ ] Interpretation assigned (ACCUMULATION/DISTRIBUTION/NEUTRAL)
[ ] High-Conviction Rule checked
[ ] Contrarian Warning checked
[ ] Screenshot captured for proof
[ ] ONCHAIN_LAYER5_OUTPUT generated

+===============================================================================+
```

---

## EXAMPLE ANALYSIS

```
EXAMPLE_ONCHAIN_ANALYSIS:
+===============================================================================+

Asset: SOL
Platform: Solscan + Arkham

STEP 1: Check Solscan Top Holders
---------------------------------
-> Whale wallet 5abc... increased position by 50,000 SOL ($5M)
-> Top 10 holder concentration: 15% (healthy)
-> No major selling from top wallets

STEP 2: Check Arkham Smart Money
--------------------------------
-> 3 labeled "Smart Money" wallets bought in last 4H
-> Total smart money inflow: $2.1M
-> Top trader @whale123 increased SOL position

STEP 3: Check Exchange Flows
----------------------------
-> Binance outflows: $3.2M
-> Binance inflows: $1.1M
-> Net flow: OUTFLOW ($2.1M leaving exchange)

CALCULATION:
------------
-> Large accumulation detected (+2)
-> Smart money buying (+2)
-> Exchange outflows (+2)
-> No distribution warnings (+1)
-> Score: 7/10 (LIGHT ACCUMULATION)

OUTPUT:
-------
[whale] **Whale Activity:** 8/10 - 3 Top Wallets accumulated $2.1M SOL in last 4H
   [star] WHALE CONFIRMED: Smart money aligned with LONG thesis

+===============================================================================+
```

---

## ERROR HANDLING

```
ERROR_HANDLING:
+===============================================================================+

IF platform is unavailable or blocked:
  -> Try alternative platform
  -> Output: "[warning] On-chain data unavailable. Using alternative source..."
  -> If all sources fail: Skip Layer 5 with warning

IF no significant transactions detected:
  -> Score: 5/10 (NEUTRAL)
  -> Output: "[whale] **Whale Activity:** 5/10 - No significant movements"
  -> Layer 5 contributes 1 point (no divergence warning)

IF rate limited:
  -> Wait 30 seconds and retry
  -> If still blocked: Skip with warning

+===============================================================================+
```

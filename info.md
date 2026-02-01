TRADING BOT — CURRENT STATE SUMMARY
1️⃣ Tech Stack

Next.js 14 (App Router)

TypeScript

MongoDB (Mongoose)

ccxt (Binance Spot, Testnet / Live)

Tailwind CSS (black + orange UI)

Runs fully server-side (no client trading logic)

2️⃣ Architecture (Clean & Correct)
Core Layers
UI (Dashboard)
   ↓
API routes (route.ts)
   ↓
Bot Engine (loop per symbol)
   ↓
Exchange (ccxt)
   ↓
Binance Spot

Key Folders
app/
 ├─ api/           → start, stop, sell, status, trades
 ├─ bot/           → engine, exchange, strategy logic
 ├─ models/        → BotState, Trade
 ├─ mongodb.ts     → DB connection

3️⃣ Bot Capabilities (What It ACTUALLY Does)
✅ Spot Trading (Real Orders)

Market BUY

Market SELL

No leverage

No futures

No fake simulation

✅ Dynamic Configuration (Per Coin)

Each coin has its own state:

symbol (BNB/USDT, BTC/USDT, etc.)

tradeUSDT (capital per trade)

targetPct (take profit %)

stopLossPct

dailyPnL

realizedPnL

isRunning

status (IDLE / HOLDING)

4️⃣ Trading Logic (Exact Rules)
BUY

When:

Bot is running

Status = IDLE

Action:

Buys tradeUSDT / price

Saves entry price + quantity

Logs BUY trade

SELL (3 Ways)
1. 🎯 Target Hit
price >= entryPrice * (1 + targetPct / 100)

2. 🔻 Stop Loss Hit
price <= entryPrice * (1 - stopLossPct / 100)

3. 🛑 Manual Sell Button

User-triggered

Immediate market sell

Profit Calculation (CORRECT)
PnL = (exitPrice - entryPrice) * quantity


Calculated only at SELL

Stored in DB

Added to:

dailyPnL

realizedPnL

5️⃣ Risk Management (This Is Important)

❌ No martingale

❌ No revenge trading

❌ No averaging down

✅ Fixed capital per trade

✅ Daily profit cap

✅ Stop trading after daily target

6️⃣ Daily Reset (Automatic)

At midnight (UTC):

dailyPnL = 0

Bot continues cleanly next day

No manual intervention needed

7️⃣ Persistence & Safety
MongoDB Stores:

Current bot state

Trade history

PnL totals

Benefits:

Server restart safe

No duplicate trades

No lost positions

Bot resumes correctly

8️⃣ Multi-Coin Support

One loop per symbol

Independent state per coin

Can run:

BTC/USDT
BNB/USDT
ETH/USDT


at the same time

9️⃣ Dashboard (What You Can See Live)
Status Cards

Symbol

Running status

Entry price

Current price

Daily PnL

Total PnL

Trade Table

BUY / SELL

Entry price

Exit price

Quantity

PnL

Timestamp

Controls

Save / update config

Start bot

Stop bot

Manual sell

🔑 Exchange Mode
Testnet

Fake money

Real market prices

Safe for testing

Live

Real Binance keys

Spot trading only

Withdraw disabled (recommended)

Switchable via .env.local

🚦 What This Bot IS

✅ Real trading bot
✅ Production-grade logic
✅ Restart safe
✅ Risk controlled
✅ Extendable
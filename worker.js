require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const mongoose = require('mongoose');
const ccxt = require('ccxt');
const { RSI, BollingerBands, EMA, ADX, ATR, MACD } = require('technicalindicators');

const MONGO_URI = process.env.NEXT_PUBLIC_MONGO_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ FATAL: NEXT_PUBLIC_MONGO_URI is missing from environment!');
  process.exit(1);
}

// Mongoose Schemas
const BotStateSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true },
  status: { type: String, default: 'IDLE' },
  entryPrice: Number,
  exitPrice: Number,
  quantity: Number,
  realizedPnL: { type: Number, default: 0 },
  dailyPnL: { type: Number, default: 0 },
  lastPrice: { type: Number, default: 0 },
  targetPct: { type: Number, default: 10.0 },
  stopLossPct: { type: Number, default: 20.0 },
  tradeUSDT: { type: Number, default: 10.0 },
  mode: { type: String, enum: ['TESTNET', 'LIVE'], default: 'LIVE' },
  isRunning: { type: Boolean, default: false },
  strategy: { type: String, default: 'AUTO_COMPOUND_10PCT' },
  indicatorValue: String,
  lastReset: String,
  updatedAt: { type: Date, default: Date.now }
});

const TradeSchema = new mongoose.Schema({
  symbol: String,
  side: String,
  price: Number,
  quantity: Number,
  pnl: Number,
  reason: String,
  entryPrice: Number,
  createdAt: { type: Date, default: Date.now },
  endedAt: Date,
  strategy: String,
  balanceBefore: Number,
  balanceAfter: Number
});

const BotConfigSchema = new mongoose.Schema({
  symbol: { type: String, default: 'XRP/USDT' },
  tradeUSDT: { type: Number, default: 10 },
  dailyTarget: { type: Number, default: 10 },
  stopLoss: { type: Number, default: 20 },
  tradingMode: { type: String, default: 'LIVE' },
  strategy: { type: String, default: 'AUTO_COMPOUND_10PCT' }
});

const BotState = mongoose.models.BotState || mongoose.model('BotState', BotStateSchema);
const Trade = mongoose.models.Trade || mongoose.model('Trade', TradeSchema);
const BotConfig = mongoose.models.BotConfig || mongoose.model('BotConfig', BotConfigSchema);

const activeLoops = {};
const peaks = {};

function getExchange(mode = 'LIVE') {
  const isTest = mode === 'TESTNET';
  const apiKey = isTest
    ? process.env.TEST_BINANCE_API_KEY || process.env.NEXT_PUBLIC_TEST_BINANCE_API_KEY
    : process.env.BINANCE_API_KEY || process.env.NEXT_PUBLIC_BINANCE_API_KEY;

  const secret = isTest
    ? process.env.TEST_BINANCE_API_SECRET || process.env.NEXT_PUBLIC_TEST_BINANCE_API_SECRET
    : process.env.BINANCE_API_SECRET || process.env.NEXT_PUBLIC_BINANCE_API_SECRET;

  const config = {
    apiKey,
    secret,
    enableRateLimit: true,
    options: { defaultType: 'spot' }
  };

  if (isTest) {
    config.sandbox = true;
    config.urls = {
      api: {
        public: 'https://testnet.binance.vision/api',
        private: 'https://testnet.binance.vision/api'
      }
    };
  }

  return new ccxt.binance(config);
}

function shouldBuySignal(candles, strategy) {
  if (!candles || candles.length < 20) return false;
  const closes = candles.map(c => c[4]);
  const lastClose = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];
  const prev2Close = closes[closes.length - 3] || prevClose;

  if (strategy === 'AUTO_COMPOUND_10PCT') {
    const rsi = RSI.calculate({ period: 14, values: closes }).pop() || 50;
    const prevRsi = RSI.calculate({ period: 14, values: closes.slice(0, -1) }).pop() || 50;
    const bb = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes }).pop();

    const isDipReversal = rsi <= 42 && rsi > prevRsi && lastClose >= prevClose;
    const isBBounce = bb ? lastClose <= bb.lower * 1.01 && lastClose > prevClose : false;
    const isMomentum = lastClose > prevClose && prevClose > prev2Close && rsi > 45 && rsi < 65;

    return isDipReversal || isBBounce || isMomentum;
  }

  // Safe Default: RSI Oversold + Bounce
  const rsi = RSI.calculate({ period: 14, values: closes }).pop() || 50;
  return rsi < 32 && lastClose > prevClose;
}

function shouldSellSignal(entry, price, target, stop, peak, strategy) {
  const pct = ((price - entry) / entry) * 100;
  if (pct >= target) return 'TARGET';

  if (strategy === 'AUTO_COMPOUND_10PCT' || target >= 5.0) {
    if (peak && peak > entry) {
      const maxPct = ((peak - entry) / entry) * 100;
      if (maxPct >= 6.0 && pct <= 3.0) return 'TRAILING_PROFIT_LOCK';
    }
    if (pct <= -stop) return 'STOP_LOSS';
    return null;
  }

  if (peak && peak > entry) {
    const maxPct = ((peak - entry) / entry) * 100;
    if (maxPct >= 0.35 && pct <= 0.1) return 'BREAKEVEN_STOP';
    if (maxPct >= 0.25) {
      const dropPct = ((peak - price) / peak) * 100;
      if (dropPct >= 0.15) return 'TRAILING_STOP';
    }
  }

  if (pct <= -stop) return 'STOP_LOSS';
  return null;
}

async function runBotLoop(symbol, mode) {
  if (activeLoops[symbol]) return;
  activeLoops[symbol] = true;

  console.log(`\n🚀 [WORKER] Starting 24/7 Engine for ${symbol} (${mode})...`);
  const exchange = getExchange(mode);

  while (activeLoops[symbol]) {
    try {
      const state = await BotState.findOne({ symbol });
      if (!state || !state.isRunning) {
        console.log(`🛑 [WORKER] Stopped signal received for ${symbol}. Ending loop.`);
        activeLoops[symbol] = false;
        delete peaks[symbol];
        break;
      }

      const ticker = await exchange.fetchTicker(symbol);
      const price = ticker.last;
      state.lastPrice = price;

      const candles = await exchange.fetchOHLCV(symbol, '1m', undefined, 40);
      const strategyName = state.strategy || 'AUTO_COMPOUND_10PCT';

      // BUY LOGIC
      if (state.status === 'IDLE') {
        if (shouldBuySignal(candles, strategyName)) {
          const rawQty = state.tradeUSDT / price;
          let formattedQty = rawQty;
          try {
            if (typeof exchange.amountToPrecision === 'function') {
              formattedQty = parseFloat(exchange.amountToPrecision(symbol, rawQty));
            }
          } catch {}

          if (formattedQty > 0) {
            console.log(`⚡ [WORKER] BUY TRIGGER for ${symbol} @ $${price} (Qty: ${formattedQty})`);
            const order = await exchange.createMarketBuyOrder(symbol, formattedQty);
            const filledPrice = order.average || order.price || price;
            const filledQty = order.filled || formattedQty;

            state.status = 'HOLDING';
            state.entryPrice = filledPrice;
            state.quantity = filledQty;
            peaks[symbol] = filledPrice;

            await Trade.create({
              symbol,
              side: 'BUY',
              price: filledPrice,
              quantity: filledQty,
              entryPrice: filledPrice,
              strategy: strategyName
            });
          }
        } else {
          const rsi = RSI.calculate({ period: 14, values: candles.map(c => c[4]) }).pop() || 50;
          state.indicatorValue = `🔥 24/7 Cloud Worker | RSI: ${rsi.toFixed(1)} | Target: +${state.targetPct}% | SL: -${state.stopLossPct}%`;
          await state.save();
        }
      }

      // SELL LOGIC
      if (state.status === 'HOLDING' && state.entryPrice && state.quantity) {
        peaks[symbol] = Math.max(peaks[symbol] || state.entryPrice, price);
        const sellReason = shouldSellSignal(
          state.entryPrice,
          price,
          state.targetPct || 10.0,
          state.stopLossPct || 20.0,
          peaks[symbol],
          strategyName
        );

        if (sellReason) {
          console.log(`🎯 [WORKER] SELL TRIGGER (${sellReason}) for ${symbol} @ $${price}`);
          let sellQty = state.quantity;
          try {
            if (typeof exchange.amountToPrecision === 'function') {
              sellQty = parseFloat(exchange.amountToPrecision(symbol, state.quantity));
            }
          } catch {}

          const order = await exchange.createMarketSellOrder(symbol, sellQty);
          const fillExitPrice = order.average || order.price || price;
          const pnl = (fillExitPrice - state.entryPrice) * sellQty;

          state.status = 'IDLE';
          state.realizedPnL = (state.realizedPnL || 0) + pnl;
          state.dailyPnL = (state.dailyPnL || 0) + pnl;

          // Auto-Compounding Reinvestment
          if (strategyName === 'AUTO_COMPOUND_10PCT' && pnl > 0) {
            const newBudget = Math.max(10, (state.tradeUSDT || 10) + pnl);
            state.tradeUSDT = parseFloat(newBudget.toFixed(2));
            console.log(`🔄 [WORKER] REINVESTING PROFITS: New Next Budget = $${state.tradeUSDT} USDT`);
          }

          const entry = state.entryPrice;
          state.entryPrice = undefined;
          state.quantity = undefined;
          delete peaks[symbol];

          await Trade.create({
            symbol,
            side: 'SELL',
            price: fillExitPrice,
            quantity: sellQty,
            pnl,
            reason: sellReason,
            entryPrice: entry,
            endedAt: new Date(),
            strategy: strategyName
          });
        }
      }

      state.updatedAt = new Date();
      await state.save();

    } catch (err) {
      console.error(`[WORKER ${symbol} ERROR]:`, err.message || err);
    }

    await new Promise(r => setTimeout(r, 2000)); // 2-second adaptive execution loop
  }
}

async function startMasterWorker() {
  console.log('====================================================');
  console.log('⚡ ALGOTRADER PRO: 24/7 CLOUD WORKER ENGINE ACTIVE');
  console.log('====================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas successfully.');

  // Polling loop to manage active bots
  setInterval(async () => {
    try {
      const runningBots = await BotState.find({ isRunning: true });
      for (const bot of runningBots) {
        if (!activeLoops[bot.symbol]) {
          runBotLoop(bot.symbol, bot.mode || 'LIVE');
        }
      }
    } catch (e) {
      console.error('[WORKER SUPERVISOR ERROR]:', e.message || e);
    }
  }, 3000);
}

startMasterWorker();

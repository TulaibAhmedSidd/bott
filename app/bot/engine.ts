// import { getExchange } from './exchange'
// import { botConfig } from './config'
// import { shouldBuy, shouldSell } from './strategy'
// import { canTrade, addProfit } from './risk'
// import { marketBuy, marketSell } from './trader'

// // let position: { entry: number } | null = null
// let timer: NodeJS.Timeout | null = null
// let position: {
//     entry: number
//     qty: number
// } | null = null
// export function startBot() {
//     if (timer) return

//     console.log('BOT STARTED')

//     timer = setInterval(async () => {
//         try {
//             const exchange = await getExchange()
//             if (!botConfig.running || !canTrade(botConfig.dailyTarget)) {
//                 stopBot()
//                 return
//             }

//             // const candles = await exchange.fetchOHLCV(
//             //     botConfig.symbol,
//             //     botConfig.timeframe,
//             //     undefined,
//             //     50
//             // )
//             const candles = await exchange.fetchOHLCV(
//                 botConfig.symbol,
//                 botConfig.timeframe,
//                 undefined,
//                 50
//             )

//             const closes: number[] = candles
//                 .map(c => c[4])
//                 .filter((v): v is number => typeof v === 'number')

//             if (closes.length === 0) return
//             const price = closes[closes.length - 1]

//             // if (!position && shouldBuy(closes)) {
//             //     position = { entry: price }
//             //     console.log('BUY @', price)
//             // }

//             if (!position && shouldBuy(closes)) {
//                 const usdtPerTrade = 10 // SAFE TEST VALUE

//                 const order = await marketBuy(botConfig.symbol, usdtPerTrade)

//                 position = {
//                     entry: order.average ?? price,
//                     qty: order.amount
//                 }

//                 console.log('REAL BUY', position)
//             }


//             // if (position) {
//             //     const result = shouldSell(
//             //         position.entry,
//             //         price,
//             //         botConfig.dailyTarget,
//             //         botConfig.stopLoss
//             //     )

//             //     if (result) {
//             //         const profit =
//             //             ((price - position.entry) / position.entry) * 100

//             //         addProfit(profit)
//             //         console.log(`SELL ${result} ${profit.toFixed(2)}%`)
//             //         position = null
//             //     }
//             // }

//             if (position) {
//                 const result = shouldSell(
//                     position.entry,
//                     price,
//                     botConfig.dailyTarget,
//                     botConfig.stopLoss
//                 )

//                 if (result) {
//                     await marketSell(botConfig.symbol, position.qty)

//                     const profit =
//                         ((price - position.entry) / position.entry) * 100

//                     addProfit(profit)

//                     console.log(`REAL SELL ${result} ${profit.toFixed(2)}%`)
//                     position = null
//                 }
//             }

//         } catch (err) {
//             console.error('BOT ERROR:', err)
//         }
//     }, 60_000)
// }

// export function stopBot() {
//     if (timer) clearInterval(timer)
//     timer = null
//     botConfig.running = false
//     console.log('BOT STOPPED')
// }




// import BotState from "@/app/models/BotState";
// import Trade from "@/app/models/Trade";
// import { getExchange } from "./exchange";

// export async function runBot(config: any) {
//   const exchange = await getExchange();

//   let state =
//     (await BotState.findOne({ symbol: config.symbol })) ||
//     (await BotState.create({ symbol: config.symbol }));

//   const ticker = await exchange.fetchTicker(config.symbol);
//   const price = ticker.last;

//   state.lastPrice = price;
//   state.updatedAt = new Date();

//   // BUY LOGIC
//   if (state.status === "IDLE") {
//     const qty = config.tradeUSDT / price;

//     const order = await exchange.createMarketBuyOrder(
//       config.symbol,
//       qty
//     );

//     state.status = "HOLDING";
//     state.entryPrice = price;
//     state.quantity = qty;

//     await Trade.create({
//       symbol: config.symbol,
//       side: "BUY",
//       price,
//       quantity: qty,
//     });
//   }

//   // SELL LOGIC
//   if (
//     state.status === "HOLDING" &&
//     price >= state.entryPrice * (1 + config.dailyTarget / 100)
//   ) {
//     const order = await exchange.createMarketSellOrder(
//       config.symbol,
//       state.quantity
//     );

//     const pnl =
//       (price - state.entryPrice) * state.quantity;

//     state.status = "STOPPED";
//     state.exitPrice = price;
//     state.realizedPnL += pnl;
//     state.dailyPnL += pnl;

//     await Trade.create({
//       symbol: config.symbol,
//       side: "SELL",
//       price,
//       quantity: state.quantity,
//       pnl,
//     });
//   }

//   await state.save();
// }



// import BotState from "@/app/models/BotState";
// import Trade from "@/app/models/Trade";
// import { getExchange } from "./exchange";
// import connectDB from "@/app/mongodb";

// let running = false;

// export async function startBot(config: any) {
//     if (running) return;
//     running = true;

//     await connectDB();
//     const exchange = await getExchange();
//     const state = await BotState.findOne()

//     if (!state.isRunning) {
//         return // 🚫 HARD STOP
//     }
//     while (running) {
//         try {
//             let state = await BotState.findOne({ symbol: config.symbol });
//             if (!state) break;

//             const ticker = await exchange.fetchTicker(config.symbol);
//             const price = ticker.last;

//             state.lastPrice = price;
//             state.updatedAt = new Date();

//             // BUY
//             if (state.status === "IDLE") {
//                 const qty = config.tradeUSDT / price;

//                 await exchange.createMarketBuyOrder(config.symbol, qty);

//                 state.status = "HOLDING";
//                 state.entryPrice = price;
//                 state.quantity = qty;

//                 await Trade.create({
//                     symbol: config.symbol,
//                     side: "BUY",
//                     price,
//                     quantity: qty,
//                     entryPrice: state.entryPrice,
//                 });
//             }

//             // SELL
//             if (
//                 state.status === "HOLDING" &&
//                 price >= state.entryPrice! * (1 + config.dailyTarget / 100)
//             ) {
//                 await exchange.createMarketSellOrder(
//                     config.symbol,
//                     state.quantity!
//                 );

//                 const pnl =
//                     (price - state.entryPrice!) * state.quantity!;

//                 state.status = "STOPPED";
//                 state.exitPrice = price;
//                 state.realizedPnL += pnl;
//                 state.dailyPnL += pnl;

//                 await Trade.create({
//                     symbol: config.symbol,
//                     side: "SELL",
//                     price,
//                     quantity: state.quantity,
//                     pnl,
//                     entryPrice: state.entryPrice,
//                 });

//                 running = false; // daily target hit
//             }

//             await state.save();
//         } catch (err) {
//             console.error("BOT ERROR:", err);
//         }

//         await new Promise((r) => setTimeout(r, 1000)); // 1s loop
//     }
// }

// export function stopBot() {
//     running = false;
// }


import BotState from "@/app/models/BotState"
import Trade from "@/app/models/Trade"
import { getExchange } from "./exchange"
import connectDB from "@/app/mongodb"
import { shouldBuy, getStrategyValue } from "./strategy"
import { RSI } from 'technicalindicators'

const loops: Record<string, boolean> = {}

export async function startBot(symbol: string, mode: 'TESTNET' | 'LIVE') {
  if (loops[symbol]) return
  loops[symbol] = true

  await connectDB()
  const exchange = await getExchange(mode)

  // Log START event
  const startState = await BotState.findOne({ symbol })
  await Trade.create({
    symbol,
    side: 'START',
    reason: 'USER_ACTION',
    price: 0,
    quantity: 0,
    strategy: startState?.strategy || 'RSI'
  })

  while (loops[symbol]) {
    try {
      // Re-fetch state to check for STOP command (and Strategy updates)
      const state = await BotState.findOne({ symbol })
      if (!state || !state.isRunning) {
        loops[symbol] = false
        break
      }

      // DAILY RESET
      const today = new Date().toISOString().slice(0, 10)
      if (state.lastReset !== today) {
        state.dailyPnL = 0
        state.lastReset = today
        await state.save()
      }

      const ticker = await exchange.fetchTicker(symbol)
      const price = ticker.last!
      state.lastPrice = price

      // STRATEGY: Fetch Candles
      const candles = await exchange.fetchOHLCV(symbol, '1m', undefined, 50) // Need more candles for MACD/BB
      const closes = candles.map((c: any) => c[4])
      const strategyName = state.strategy || 'RSI'

      // BUY
      if (state.status === 'IDLE') {
        // Only buy if Strategy says YES
        if (shouldBuy(closes, strategyName)) {
          const qty = state.tradeUSDT / price

          console.log(`[BOT ${symbol}] ${strategyName} BUY SIGNAL. Price=${price} Qty=${qty}`)
          await exchange.createMarketBuyOrder(symbol, qty)

          state.status = 'HOLDING'
          state.entryPrice = price
          state.quantity = qty

          await Trade.create({
            symbol,
            side: 'BUY',
            price,
            quantity: qty,
            entryPrice: price,
            strategy: strategyName
          })
          console.log(`[BOT ${symbol}] BUY EXECUTED`)
        } else {
          const val = getStrategyValue(closes, strategyName)
          console.log(`[BOT ${symbol}] WAITING (${strategyName}): ${val}`)

          // Update UI with current indicator status so user knows why it's not buying
          state.indicatorValue = val;
          await state.save();
        }
      }

      // SELL (TARGET)
      const targetPrice =
        state.entryPrice! * (1 + state.targetPct / 100)

      // SELL (STOP LOSS)
      const stopPrice =
        state.entryPrice! * (1 - state.stopLossPct / 100)

      if (
        state.status === 'HOLDING' &&
        (price >= targetPrice || price <= stopPrice)
      ) {
        const reason = price >= targetPrice ? 'TARGET' : 'STOP_LOSS'
        console.log(`[BOT ${symbol}] SELLING (${reason}): Price=${price} Entry=${state.entryPrice} PnL=${((price - state.entryPrice!) / state.entryPrice! * 100).toFixed(2)}%`)

        await exchange.createMarketSellOrder(symbol, state.quantity!)

        const pnl = (price - state.entryPrice!) * state.quantity!

        state.status = 'IDLE'
        state.realizedPnL += pnl
        state.dailyPnL += pnl

        const entryPrice = state.entryPrice!
        const quantity = state.quantity!

        state.entryPrice = undefined
        state.quantity = undefined

        await Trade.create({
          symbol,
          side: 'SELL',
          price,
          quantity,
          pnl,
          reason,
          entryPrice,
          endedAt: new Date(),
          strategy: strategyName
        })

        console.log(`[BOT ${symbol}] SELL EXECUTED. PnL=${pnl}`)

        // STOP FOR DAY IF TARGET HIT
        if (state.dailyPnL >= state.tradeUSDT * (state.targetPct / 100)) {
          console.log(`[BOT ${symbol}] DAILY TARGET HIT. STOPPING.`)
          state.isRunning = false
          loops[symbol] = false
        }
      }

      await state.save()
    } catch (e) {
      console.error(`[BOT ${symbol}]`, e)
    }

    await new Promise(r => setTimeout(r, 1000))
  }
}

export async function stopBot(symbol: string) {
  loops[symbol] = false
  await connectDB() // Ensure DB connection
  const state = await BotState.findOneAndUpdate({ symbol }, { isRunning: false })

  // Log STOP event
  await Trade.create({
    symbol,
    side: 'STOP',
    reason: 'USER_ACTION',
    price: 0,
    quantity: 0,
    strategy: state?.strategy || 'RSI'
  })
}
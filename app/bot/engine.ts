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
import { getExchange, formatOrderAmount } from "./exchange"
import connectDB from "@/app/mongodb"
import { shouldBuy, shouldSell, getStrategyValue } from "./strategy"

const loops: Record<string, boolean> = {}
const peaks: Record<string, number> = {}

export async function startBot(symbol: string, mode: 'TESTNET' | 'LIVE') {
  if (loops[symbol]) return
  loops[symbol] = true

  await connectDB()
  const exchange = await getExchange(mode)

  // Log START event
  const startState = await BotState.findOne({ symbol })
  let initBalance = 0
  try {
    const balObj = await exchange.fetchBalance()
    initBalance = balObj?.total?.['USDT'] || 0
  } catch {
    initBalance = 0
  }

  await Trade.create({
    symbol,
    side: 'START',
    reason: 'USER_ACTION',
    price: 0,
    quantity: 0,
    strategy: startState?.strategy || 'BOLLINGER_RSI_EMA',
    balanceBefore: initBalance,
    balanceAfter: 0
  })

  // RESET Trade Count for this run
  if (startState) {
    startState.tradeCount = 0
    await startState.save()
  }

  while (loops[symbol]) {
    try {
      // Re-fetch state to check for STOP command (and Strategy updates)
      const state = await BotState.findOne({ symbol })
      if (!state || !state.isRunning) {
        loops[symbol] = false
        delete peaks[symbol]
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

      // STRATEGY: Fetch Candles (50 candles of 1m)
      const candles = await exchange.fetchOHLCV(symbol, '1m', undefined, 50)
      const strategyName = state.strategy || 'BOLLINGER_RSI_EMA'

      // BUY LOGIC
      if (state.status === 'IDLE') {
        if (shouldBuy(candles, strategyName)) {
          const rawQty = state.tradeUSDT / price
          const formattedQty = formatOrderAmount(exchange, symbol, rawQty)

          if (formattedQty <= 0) {
            console.warn(`[BOT ${symbol}] Formatted qty is 0. Trade USDT amount may be too small.`)
          } else {
            console.log(`[BOT ${symbol}] ${strategyName} BUY SIGNAL. Price=${price} RawQty=${rawQty} FormattedQty=${formattedQty}`)

            let balBefore = 0
            try {
              const b = await exchange.fetchBalance()
              balBefore = b?.total?.['USDT'] || 0
            } catch {}

            const order = await exchange.createMarketBuyOrder(symbol, formattedQty)
            const filledPrice = order.average || order.price || price
            const filledQty = order.filled || formattedQty

            state.status = 'HOLDING'
            state.entryPrice = filledPrice
            state.quantity = filledQty
            peaks[symbol] = filledPrice

            await Trade.create({
              symbol,
              side: 'BUY',
              price: filledPrice,
              quantity: filledQty,
              entryPrice: filledPrice,
              strategy: strategyName,
              balanceBefore: balBefore
            })
            console.log(`[BOT ${symbol}] BUY EXECUTED. Filled Price=${filledPrice} Qty=${filledQty}`)
          }
        } else {
          const val = getStrategyValue(candles, strategyName)
          console.log(`[BOT ${symbol}] WAITING (${strategyName}): ${val}`)
          state.indicatorValue = val
          await state.save()
        }
      }

      // HOLDING & SELL LOGIC
      if (state.status === 'HOLDING') {
        // Track peak price for Trailing Stop-Loss
        peaks[symbol] = Math.max(peaks[symbol] || state.entryPrice || price, price)

        const sellSignal = shouldSell(
          state.entryPrice!,
          price,
          state.targetPct,
          state.stopLossPct,
          peaks[symbol]
        )

        if (sellSignal) {
          const reason = sellSignal
          console.log(`[BOT ${symbol}] SELLING (${reason}): Price=${price} Entry=${state.entryPrice} Peak=${peaks[symbol]} PnL=${(((price - state.entryPrice!) / state.entryPrice!) * 100).toFixed(2)}%`)

          const sellQty = formatOrderAmount(exchange, symbol, state.quantity!)
          const order = await exchange.createMarketSellOrder(symbol, sellQty)
          const fillExitPrice = order.average || order.price || price

          let finalBal = 0
          try {
            const b = await exchange.fetchBalance()
            finalBal = b?.total?.['USDT'] || 0
          } catch {}

          const pnl = (fillExitPrice - state.entryPrice!) * sellQty

          state.status = 'IDLE'
          state.realizedPnL += pnl
          state.dailyPnL += pnl

          const entryPrice = state.entryPrice!
          const quantity = state.quantity!

          state.entryPrice = undefined
          state.quantity = undefined
          delete peaks[symbol]

          await Trade.create({
            symbol,
            side: 'SELL',
            price: fillExitPrice,
            quantity: sellQty,
            pnl,
            reason,
            entryPrice,
            endedAt: new Date(),
            strategy: strategyName,
            balanceAfter: finalBal
          })

          console.log(`[BOT ${symbol}] SELL EXECUTED (${reason}). PnL=${pnl.toFixed(4)} USDT`)

          state.tradeCount = (state.tradeCount || 0) + 1

          // STOP CONDITIONS
          if (state.dailyPnL >= state.tradeUSDT * (state.targetPct / 100)) {
            console.log(`[BOT ${symbol}] DAILY TARGET HIT. STOPPING.`)
            state.isRunning = false
            loops[symbol] = false
          } else if (state.maxTrades && state.tradeCount >= state.maxTrades) {
            console.log(`[BOT ${symbol}] MAX TRADES (${state.maxTrades}) HIT. STOPPING.`)
            state.isRunning = false
            loops[symbol] = false
          }
        }
      }

      await state.save()
    } catch (e) {
      console.error(`[BOT ${symbol}] Error in loop:`, e)
    }

    // 5-second tick interval (Safe against Binance rate limits)
    await new Promise((r) => setTimeout(r, 5000))
  }
}

export async function stopBot(symbol: string) {
  loops[symbol] = false
  delete peaks[symbol]
  await connectDB()
  const state = await BotState.findOneAndUpdate({ symbol }, { isRunning: false })

  await Trade.create({
    symbol,
    side: 'STOP',
    reason: 'USER_ACTION',
    price: 0,
    quantity: 0,
    strategy: state?.strategy || 'BOLLINGER_RSI_EMA'
  })
}
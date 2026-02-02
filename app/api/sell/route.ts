import { NextResponse } from 'next/server'
import BotState from '@/app/models/BotState'
import { getExchange } from '@/app/bot/exchange'
import connectDB from '@/app/mongodb'
import Trade from '@/app/models/Trade'

export async function POST(req: Request) {
  const { symbol } = await req.json()
  await connectDB()

  const state = await BotState.findOne({ symbol })
  if (!state || state.status !== 'HOLDING') {
    return NextResponse.json({ error: 'No position' }, { status: 400 })
  }

  const exchange = await getExchange()
  const price = (await exchange.fetchTicker(symbol)).last!

  const balBefore = (await exchange.fetchBalance()).total['USDT']
  await exchange.createMarketSellOrder(symbol, state.quantity!)
  const balAfter = (await exchange.fetchBalance()).total['USDT']

  const pnl = (price - state.entryPrice!) * state.quantity!
  const quantity = state.quantity!
  const entryPrice = state.entryPrice!
  const strategy = state.strategy || 'RSI' // fallback if missing

  state.status = 'IDLE'
  state.realizedPnL += pnl
  state.dailyPnL += pnl
  state.entryPrice = undefined
  state.quantity = undefined

  await Trade.create({
    symbol,
    side: 'SELL',
    price,
    quantity,
    pnl,
    reason: 'MANUAL',
    entryPrice,
    strategy,
    balanceBefore: balBefore,
    balanceAfter: balAfter,
    endedAt: new Date()
  })

  await state.save()

  return NextResponse.json({ success: true, pnl })
}

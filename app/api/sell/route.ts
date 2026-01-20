import { NextResponse } from 'next/server'
import BotState from '@/app/models/BotState'
import { getExchange } from '@/app/bot/exchange'
import connectDB from '@/app/mongodb'

export async function POST(req: Request) {
  const { symbol } = await req.json()
  await connectDB()

  const state = await BotState.findOne({ symbol })
  if (!state || state.status !== 'HOLDING') {
    return NextResponse.json({ error: 'No position' }, { status: 400 })
  }

  const exchange = await getExchange()
  const price = (await exchange.fetchTicker(symbol)).last!

  await exchange.createMarketSellOrder(symbol, state.quantity!)

  const pnl = (price - state.entryPrice!) * state.quantity!

  state.status = 'IDLE'
  state.realizedPnL += pnl
  state.dailyPnL += pnl
  state.entryPrice = undefined
  state.quantity = undefined

  await state.save()

  return NextResponse.json({ success: true, pnl })
}

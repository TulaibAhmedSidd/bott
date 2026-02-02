// // app/api/start/route.ts

// import { botConfig } from "@/app/bot/config"
// import { dailyProfit } from "@/app/bot/risk"

// export async function GET() {
//   return Response.json({ ...botConfig, dailyP// verifying status route
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import connectDB from '@/app/mongodb'
import BotConfig from '@/app/models/BotConfig'
import BotState from '@/app/models/BotState'
import { getAccountBalance } from '@/app/bot/exchange'

export async function GET() {
  await connectDB()

  // Fetch Config for Mode
  const config = await BotConfig.findOne()
  const mode = config?.tradingMode || (process.env.NEXT_PUBLIC_TRADING_MODE === 'test' ? 'TESTNET' : 'LIVE')

  // Fetch all active bots or recently updated ones
  const bots = await BotState.find({
    $or: [
      { isRunning: true },
      { status: { $ne: 'IDLE' } },
      // Include the most recent IDLE one if it was active recently
      { updatedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    ]
  }).sort({ updatedAt: -1 })

  // If no bots found, create a default one (optional, or let UI handle empty)
  if (bots.length === 0) {
    const defaultBot = await BotState.create({
      symbol: 'BNB/USDT',
      status: 'IDLE',
      realizedPnL: 0,
      dailyPnL: 0,
    })
    bots.push(defaultBot)
  }

  // Calculate distinct balances
  const botsWithBalance = await Promise.all(bots.map(async (bot) => {
    const b = bot.toObject()
    const symbol = b.symbol
    if (symbol === 'NOT_SET') return { ...b, balance: 0 }

    // Fetch balance using valid mode
    const balance = await getAccountBalance(symbol, mode as 'TESTNET' | 'LIVE')
    return { ...b, balance }
  }))

  const totalBalance = botsWithBalance.reduce((sum, b) => sum + (b.balance || 0), 0) // Naive sum? No, we should fetch actual wallet balance once.
  // Actually, getAccountBalance logic might be per symbol? Let's check exchange.ts.
  // If we want GLOBAL USDT balance:
  const exchange = await (await import('@/app/bot/exchange')).getExchange(mode as 'TESTNET' | 'LIVE') // Dynamic import to avoid circular dep if any? No, direct is fine.
  const globalBalance = (await exchange.fetchBalance()).total['USDT'] || 0

  return NextResponse.json({ bots: botsWithBalance, mode, totalBalance: globalBalance })
}

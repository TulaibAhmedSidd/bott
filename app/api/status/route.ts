export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import connectDB from '@/app/mongodb'
import BotConfig from '@/app/models/BotConfig'
import BotState from '@/app/models/BotState'
import { getExchange } from '@/app/bot/exchange'

// In-memory cache for balance to prevent hammering Binance rate limits
let cachedBalance: { freeUsdt: number; totalUsdt: number; mode: string } | null = null
let lastBalanceFetchTime = 0

export async function GET() {
  try {
    await connectDB()

    // Fetch Config for Mode
    const config = await BotConfig.findOne()
    const mode = config?.tradingMode || (process.env.NEXT_PUBLIC_TRADING_MODE === 'test' ? 'TESTNET' : 'LIVE')

    // Fetch all active or recent bots from DB
    const bots = await BotState.find({
      $or: [
        { isRunning: true },
        { status: { $ne: 'IDLE' } },
        { updatedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    }).sort({ updatedAt: -1 })

    // Map bots with safe defaults
    const formattedBots = bots.map((b) => {
      const obj = b.toObject()
      return {
        ...obj,
        tradeUSDT: obj.tradeUSDT || config?.tradeUSDT || 10,
        targetPct: obj.targetPct || config?.dailyTarget || 1.0,
        stopLossPct: obj.stopLossPct || config?.stopLoss || 0.5,
        strategy: obj.strategy || config?.strategy || 'BOLLINGER_RSI_EMA'
      }
    })

    // Calculate capital locked in active positions from active bots
    const usedUsdt = formattedBots.reduce((acc, bot) => {
      if (bot.status === 'HOLDING' && bot.quantity && bot.lastPrice) {
        return acc + bot.quantity * bot.lastPrice
      }
      return acc
    }, 0)

    let freeUsdt = 0
    let totalPortfolioValue = 0

    const now = Date.now()
    if (cachedBalance && cachedBalance.mode === mode && now - lastBalanceFetchTime < 3000) {
      freeUsdt = cachedBalance.freeUsdt
      totalPortfolioValue = cachedBalance.totalUsdt
    } else {
      try {
        const exchange = await getExchange(mode as 'TESTNET' | 'LIVE')
        // Timeout balance fetch after 2500ms
        const balPromise = exchange.fetchBalance()
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
        const balRes: any = await Promise.race([balPromise, timeoutPromise])

        if (balRes) {
          freeUsdt = balRes.free?.['USDT'] ?? balRes.total?.['USDT'] ?? 0
          totalPortfolioValue = (balRes.total?.['USDT'] ?? freeUsdt) + usedUsdt

          cachedBalance = {
            freeUsdt,
            totalUsdt: totalPortfolioValue,
            mode
          }
          lastBalanceFetchTime = now
        }
      } catch (err) {
        if (cachedBalance && cachedBalance.mode === mode) {
          freeUsdt = cachedBalance.freeUsdt
          totalPortfolioValue = cachedBalance.totalUsdt
        }
      }
    }

    if (totalPortfolioValue === 0 && freeUsdt > 0) {
      totalPortfolioValue = freeUsdt + usedUsdt
    }

    return NextResponse.json({
      bots: formattedBots,
      mode,
      freeUsdt,
      usedUsdt,
      totalBalance: totalPortfolioValue
    })
  } catch (error) {
    console.error('[STATUS API ERROR]:', error)
    return NextResponse.json(
      {
        bots: [],
        mode: 'TESTNET',
        freeUsdt: 0,
        usedUsdt: 0,
        totalBalance: 0,
        error: (error as any)?.message || 'Status error'
      },
      { status: 200 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import connectDB from '@/app/mongodb'
import BotConfig from '@/app/models/BotConfig'
import BotState from '@/app/models/BotState'
import { getExchange } from '@/app/bot/exchange'

export async function GET() {
  try {
    await connectDB()

    // Fetch Config for Mode
    const config = await BotConfig.findOne()
    const mode = config?.tradingMode || (process.env.NEXT_PUBLIC_TRADING_MODE === 'test' ? 'TESTNET' : 'LIVE')

    // Fetch all active or recent bots
    const bots = await BotState.find({
      $or: [
        { isRunning: true },
        { status: { $ne: 'IDLE' } },
        { updatedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    }).sort({ updatedAt: -1 })

    let freeUsdt = 0
    let totalPortfolioValue = 0

    try {
      const exchange = await getExchange(mode as 'TESTNET' | 'LIVE')
      const balRes = await exchange.fetchBalance()
      
      if (balRes) {
        freeUsdt = balRes.free?.['USDT'] || balRes.total?.['USDT'] || 0
        totalPortfolioValue = balRes.total?.['USDT'] || freeUsdt

        // Calculate live portfolio value across held non-USDT crypto assets
        if (balRes.total) {
          for (const [asset, qty] of Object.entries(balRes.total)) {
            if (asset !== 'USDT' && typeof qty === 'number' && qty > 0.00001) {
              try {
                const pairSymbol = `${asset}/USDT`
                const ticker = await exchange.fetchTicker(pairSymbol)
                if (ticker && ticker.last) {
                  totalPortfolioValue += qty * ticker.last
                }
              } catch {
                // Ignore non-USDT pairs
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[STATUS API] Wallet balance fetch failed for ${mode} mode:`, (err as any)?.message || err)
    }

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

    // Calculate capital locked in active positions
    const usedUsdt = formattedBots.reduce((acc, bot) => {
      if (bot.status === 'HOLDING' && bot.quantity && bot.lastPrice) {
        return acc + bot.quantity * bot.lastPrice
      }
      return acc
    }, 0)

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

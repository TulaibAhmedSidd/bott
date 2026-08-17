export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const preferredRegion = ['fra1', 'sin1', 'lhr1']

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/app/mongodb'
import BotConfig from '@/app/models/BotConfig'
import BotState from '@/app/models/BotState'
import { getExchange } from '@/app/bot/exchange'

let cachedBalance: { freeUsdt: number; totalUsdt: number; mode: string } | null = null
let lastBalanceFetchTime = 0

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const config = await BotConfig.findOne()
    const queryMode = req.nextUrl.searchParams.get('mode')
    const mode = (queryMode === 'LIVE' || queryMode === 'TESTNET')
      ? queryMode
      : (config?.tradingMode || 'TESTNET')

    const bots = await BotState.find({
      $or: [
        { isRunning: true },
        { status: { $ne: 'IDLE' } },
        { updatedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    }).sort({ updatedAt: -1 })

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
        const balRes = await exchange.fetchBalance()

        if (balRes) {
          freeUsdt = balRes.free?.['USDT'] ?? balRes.total?.['USDT'] ?? 0
          totalPortfolioValue = balRes.total?.['USDT'] ?? freeUsdt

          // For LIVE mode, calculate total asset value across holdings (e.g. SOL, BTC, ETH, BNB)
          if (mode === 'LIVE' && balRes.total) {
            const majorCoins = ['SOL', 'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'TRX', 'LINK', 'LTC']
            for (const coin of majorCoins) {
              const amount = balRes.total[coin]
              if (typeof amount === 'number' && amount > 0.0001) {
                try {
                  const pair = `${coin}/USDT`
                  if (exchange.markets && exchange.markets[pair]) {
                    const ticker = await exchange.fetchTicker(pair)
                    if (ticker?.last) {
                      totalPortfolioValue += amount * ticker.last
                    }
                  }
                } catch {}
              }
            }
          }

          totalPortfolioValue += usedUsdt

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
        mode: req.nextUrl.searchParams.get('mode') || 'TESTNET',
        freeUsdt: 0,
        usedUsdt: 0,
        totalBalance: 0,
        error: (error as any)?.message || 'Status error'
      },
      { status: 200 }
    )
  }
}

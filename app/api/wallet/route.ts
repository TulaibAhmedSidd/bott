export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import connectDB from '@/app/mongodb'
import BotConfig from '@/app/models/BotConfig'
import { getExchange } from '@/app/bot/exchange'

export async function GET() {
  try {
    await connectDB()
    const config = await BotConfig.findOne()
    const mode = config?.tradingMode || (process.env.NEXT_PUBLIC_TRADING_MODE === 'test' ? 'TESTNET' : 'LIVE')

    const exchange = await getExchange(mode as 'TESTNET' | 'LIVE')
    const balRes = await exchange.fetchBalance()

    const assets: { asset: string; free: number; used: number; total: number }[] = []

    if (balRes && balRes.total) {
      for (const [asset, total] of Object.entries(balRes.total)) {
        if (typeof total === 'number' && total > 0.00001) {
          assets.push({
            asset,
            free: balRes.free?.[asset] || 0,
            used: balRes.used?.[asset] || 0,
            total
          })
        }
      }
    }

    // Sort USDT to the top, then sort by total balance descending
    assets.sort((a, b) => {
      if (a.asset === 'USDT') return -1
      if (b.asset === 'USDT') return 1
      return b.total - a.total
    })

    const freeUSDT = balRes?.free?.['USDT'] ?? balRes?.total?.['USDT'] ?? 0

    return NextResponse.json({
      mode,
      freeUSDT,
      totalAssetsCount: assets.length,
      assets: assets.slice(0, 30) // Return top 30 assets
    })
  } catch (error) {
    console.error('[WALLET API ERROR]:', error)
    return NextResponse.json(
      {
        mode: 'TESTNET',
        freeUSDT: 0,
        totalAssetsCount: 0,
        assets: [],
        error: (error as any)?.message || 'Failed to fetch wallet'
      },
      { status: 200 }
    )
  }
}

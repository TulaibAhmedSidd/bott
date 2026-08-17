export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/app/mongodb'
import BotConfig from '@/app/models/BotConfig'
import { getExchange } from '@/app/bot/exchange'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const config = await BotConfig.findOne()

    const queryMode = req.nextUrl.searchParams.get('mode')
    const mode = (queryMode === 'LIVE' || queryMode === 'TESTNET')
      ? queryMode
      : (config?.tradingMode || 'TESTNET')

    const exchange = await getExchange(mode as 'TESTNET' | 'LIVE')
    const balRes = await exchange.fetchBalance()

    const assets: { asset: string; free: number; used: number; total: number; usdtValue: number }[] = []
    let totalEstUSDT = 0

    if (balRes && balRes.total) {
      for (const [asset, total] of Object.entries(balRes.total)) {
        if (typeof total === 'number' && total > 0.00001) {
          const free = balRes.free?.[asset] || 0
          const used = balRes.used?.[asset] || 0
          let usdtValue = 0

          if (asset === 'USDT' || asset === 'USDC' || asset === 'BUSD' || asset === 'FDUSD') {
            usdtValue = total
          }

          assets.push({
            asset,
            free,
            used,
            total,
            usdtValue
          })
        }
      }
    }

    // Fetch live market prices for top non-stable assets (e.g. SOL, BTC, ETH, BNB)
    for (const item of assets) {
      if (item.usdtValue === 0 && exchange.markets && exchange.markets[`${item.asset}/USDT`]) {
        try {
          const ticker = await exchange.fetchTicker(`${item.asset}/USDT`)
          if (ticker && ticker.last) {
            item.usdtValue = item.total * ticker.last
          }
        } catch {}
      }
      totalEstUSDT += item.usdtValue
    }

    // Sort by USD value descending, putting highest-value coins first
    assets.sort((a, b) => b.usdtValue - a.usdtValue)

    const freeUSDT = balRes?.free?.['USDT'] ?? balRes?.total?.['USDT'] ?? 0
    if (mode === 'TESTNET' && totalEstUSDT === 0) {
      totalEstUSDT = freeUSDT
    }

    const info = balRes?.info || {}
    const activeKey = (exchange as any).apiKey
      ? `${(exchange as any).apiKey.slice(0, 8)}...${(exchange as any).apiKey.slice(-4)}`
      : 'Connected'

    return NextResponse.json({
      mode,
      freeUSDT,
      totalEstPortfolioUSDT: totalEstUSDT,
      totalAssetsCount: assets.length,
      accountInfo: {
        accountType: info.accountType || 'SPOT',
        canTrade: info.canTrade !== undefined ? info.canTrade : true,
        canWithdraw: info.canWithdraw !== undefined ? info.canWithdraw : false,
        canDeposit: info.canDeposit !== undefined ? info.canDeposit : true,
        makerCommission: info.makerCommission ? `${info.makerCommission / 100}%` : '0.10%',
        takerCommission: info.takerCommission ? `${info.takerCommission / 100}%` : '0.10%',
        permissions: info.permissions || ['SPOT'],
        apiKeyMasked: activeKey
      },
      assets: assets.slice(0, 50)
    })
  } catch (error) {
    console.error('[WALLET API ERROR]:', error)
    return NextResponse.json(
      {
        mode: req.nextUrl.searchParams.get('mode') || 'TESTNET',
        freeUSDT: 0,
        totalEstPortfolioUSDT: 0,
        totalAssetsCount: 0,
        accountInfo: {
          accountType: 'SPOT',
          canTrade: false,
          apiKeyMasked: 'Auth Error'
        },
        assets: [],
        error: (error as any)?.message || 'Failed to fetch wallet'
      },
      { status: 200 }
    )
  }
}

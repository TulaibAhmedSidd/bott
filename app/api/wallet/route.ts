export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const preferredRegion = ['fra1', 'sin1', 'lhr1']

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/app/mongodb'
import BotConfig from '@/app/models/BotConfig'
import { getExchange } from '@/app/bot/exchange'

let cachedWallet: { data: any; timestamp: number; mode: string } | null = null

export async function GET(req: NextRequest) {
  try {
    const queryMode = req.nextUrl.searchParams.get('mode')
    let mode = queryMode === 'LIVE' || queryMode === 'TESTNET' ? queryMode : null

    if (!mode) {
      await connectDB()
      const config = await BotConfig.findOne()
      mode = config?.tradingMode || 'TESTNET'
    }

    const now = Date.now()
    if (cachedWallet && cachedWallet.mode === mode && now - cachedWallet.timestamp < 4000) {
      return NextResponse.json(cachedWallet.data)
    }

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

    const freeUSDT = balRes?.free?.['USDT'] ?? balRes?.total?.['USDT'] ?? 0

    if (mode === 'LIVE') {
      // In LIVE mode, fetch price only for top major non-stable holdings in parallel
      const topNonStable = assets.filter(a => a.usdtValue === 0 && a.total > 0.0001).slice(0, 5)
      await Promise.all(
        topNonStable.map(async (item) => {
          try {
            const pair = `${item.asset}/USDT`
            if (exchange.markets && exchange.markets[pair]) {
              const ticker = await exchange.fetchTicker(pair)
              if (ticker?.last) {
                item.usdtValue = item.total * ticker.last
              }
            }
          } catch {}
        })
      )
    }

    totalEstUSDT = assets.reduce((sum, a) => sum + (a.usdtValue || 0), 0)
    if (totalEstUSDT === 0 || mode === 'TESTNET') {
      totalEstUSDT = (balRes?.total?.['USDT'] ?? freeUSDT) || freeUSDT
    }

    // Sort: USDT first, then by usdtValue, then by total amount
    assets.sort((a, b) => {
      if (a.asset === 'USDT') return -1
      if (b.asset === 'USDT') return 1
      if (b.usdtValue !== a.usdtValue) return (b.usdtValue || 0) - (a.usdtValue || 0)
      return b.total - a.total
    })

    const info = balRes?.info || {}
    const activeKey = (exchange as any).apiKey
      ? `${(exchange as any).apiKey.slice(0, 8)}...${(exchange as any).apiKey.slice(-4)}`
      : 'Connected'

    const result = {
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
    }

    cachedWallet = {
      data: result,
      timestamp: now,
      mode
    }

    return NextResponse.json(result)
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

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

    assets.sort((a, b) => {
      if (a.asset === 'USDT') return -1
      if (b.asset === 'USDT') return 1
      return b.total - a.total
    })

    const freeUSDT = balRes?.free?.['USDT'] ?? balRes?.total?.['USDT'] ?? 0
    const info = balRes?.info || {}
    const activeKey = (exchange as any).apiKey ? `${(exchange as any).apiKey.slice(0, 8)}...${(exchange as any).apiKey.slice(-4)}` : 'Connected'

    return NextResponse.json({
      mode,
      freeUSDT,
      totalAssetsCount: assets.length,
      accountInfo: {
        accountType: info.accountType || 'SPOT',
        canTrade: info.canTrade ?? true,
        canWithdraw: info.canWithdraw ?? false,
        canDeposit: info.canDeposit ?? true,
        makerCommission: info.makerCommission ? `${info.makerCommission / 100}%` : '0.1%',
        takerCommission: info.takerCommission ? `${info.takerCommission / 100}%` : '0.1%',
        apiKeyMasked: activeKey
      },
      assets: assets.slice(0, 50)
    })
  } catch (error) {
    console.error('[WALLET API ERROR]:', error)
    return NextResponse.json(
      {
        mode: 'TESTNET',
        freeUSDT: 0,
        totalAssetsCount: 0,
        accountInfo: {
          accountType: 'SPOT',
          canTrade: false,
          apiKeyMasked: 'Unknown'
        },
        assets: [],
        error: (error as any)?.message || 'Failed to fetch wallet'
      },
      { status: 200 }
    )
  }
}

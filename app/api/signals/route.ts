export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const preferredRegion = ['fra1', 'sin1', 'lhr1']

import { NextResponse } from 'next/server'
import { RSI, BollingerBands, EMA, ADX } from 'technicalindicators'
import { getExchange } from '@/app/bot/exchange'
import connectDB from '@/app/mongodb'
import BotConfig from '@/app/models/BotConfig'

let cachedSignals: any[] = []
let lastSignalsFetchTime = 0
let isScanning = false

export async function GET() {
  try {
    const now = Date.now()

    // 1. If cached within 5 seconds, return immediately
    if (cachedSignals.length > 0 && now - lastSignalsFetchTime < 5000) {
      return NextResponse.json({
        signals: cachedSignals,
        cached: true,
        updatedAt: new Date(lastSignalsFetchTime).toISOString()
      })
    }

    // 2. Prevent concurrent scan pile-ups
    if (isScanning && cachedSignals.length > 0) {
      return NextResponse.json({
        signals: cachedSignals,
        cached: true,
        updatedAt: new Date(lastSignalsFetchTime).toISOString()
      })
    }

    isScanning = true
    await connectDB()
    const config = await BotConfig.findOne()
    const mode = config?.tradingMode || 'TESTNET'
    const exchange = await getExchange(mode as 'TESTNET' | 'LIVE')

    const symbols = ['BNB/USDT', 'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT']

    const symbolPromises = symbols.map(async (sym) => {
      try {
        const [ticker, orderbook, ohlcv] = await Promise.all([
          exchange.fetchTicker(sym),
          exchange.fetchOrderBook(sym, 15),
          exchange.fetchOHLCV(sym, '1m', undefined, 40)
        ])

        const closes = ohlcv.map((c: any) => (Array.isArray(c) ? c[4] : c.close))
        const highs = ohlcv.map((c: any) => (Array.isArray(c) ? c[2] : c.high))
        const lows = ohlcv.map((c: any) => (Array.isArray(c) ? c[3] : c.low))
        const lastClose = closes[closes.length - 1]
        const prevClose = closes[closes.length - 2]

        // 1. Order Book Imbalance (OBI)
        const bidVol = orderbook.bids.slice(0, 10).reduce((acc: number, b: any) => acc + b[1], 0)
        const askVol = orderbook.asks.slice(0, 10).reduce((acc: number, a: any) => acc + a[1], 0)
        const totalDepth = bidVol + askVol
        const bidRatio = totalDepth > 0 ? (bidVol / totalDepth) * 100 : 50

        // 2. Technical Confluences
        const rsiSeries = RSI.calculate({ period: 14, values: closes })
        const lastRSI = rsiSeries[rsiSeries.length - 1] || 50
        const prevRSI = rsiSeries[rsiSeries.length - 2] || 50

        const bbSeries = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
        const lastBB = bbSeries[bbSeries.length - 1]

        const ema50Series = EMA.calculate({ period: 50, values: closes })
        const lastEMA50 = ema50Series[ema50Series.length - 1] || lastClose

        const adxSeries = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 })
        const lastADX = adxSeries.length > 0 ? adxSeries[adxSeries.length - 1].adx : 20

        // 3. ICT Fair Value Gap (FVG)
        let bullishFVG = false
        let bearishFVG = false
        if (ohlcv.length >= 3) {
          const c1 = ohlcv[ohlcv.length - 3]
          const c3 = ohlcv[ohlcv.length - 1]
          const c1High = Array.isArray(c1) ? c1[2] : c1.high
          const c1Low = Array.isArray(c1) ? c1[3] : c1.low
          const c3High = Array.isArray(c3) ? c3[2] : c3.high
          const c3Low = Array.isArray(c3) ? c3[3] : c3.low

          if (c3Low > c1High) bullishFVG = true
          if (c3High < c1Low) bearishFVG = true
        }

        // 4. VWAP
        let num = 0
        let den = 0
        ohlcv.slice(-20).forEach((c: any) => {
          const h = Array.isArray(c) ? c[2] : c.high
          const l = Array.isArray(c) ? c[3] : c.low
          const cl = Array.isArray(c) ? c[4] : c.close
          const vol = Array.isArray(c) ? c[5] : c.volume
          num += ((h + l + cl) / 3) * vol
          den += vol
        })
        const vwap = den > 0 ? num / den : lastClose
        const vwapDev = ((lastClose - vwap) / vwap) * 100

        // 5. Confluence Scoring
        let score = 50
        const reasons = []

        if (lastClose > lastEMA50) {
          score += 10
          reasons.push('Macro Trend Bullish (Above 50-EMA)')
        } else {
          score -= 10
          reasons.push('Macro Trend Bearish (Below 50-EMA)')
        }

        if (lastRSI <= 35 && lastRSI > prevRSI) {
          score += 20
          reasons.push(`RSI Oversold Bounce (${lastRSI.toFixed(1)})`)
        } else if (lastRSI >= 65 && lastRSI < prevRSI) {
          score -= 20
          reasons.push(`RSI Overbought Pullback (${lastRSI.toFixed(1)})`)
        }

        if (lastBB && lastClose <= lastBB.lower * 1.002) {
          score += 15
          reasons.push('Lower Bollinger Band Pierce')
        } else if (lastBB && lastClose >= lastBB.upper * 0.998) {
          score -= 15
          reasons.push('Upper Bollinger Band Pierce')
        }

        if (bidRatio >= 60) {
          score += 15
          reasons.push(`Orderbook Buyer Domination (${bidRatio.toFixed(1)}% Bids)`)
        } else if (bidRatio <= 40) {
          score -= 15
          reasons.push(`Orderbook Seller Domination (${(100 - bidRatio).toFixed(1)}% Asks)`)
        }

        if (vwapDev <= -0.5) {
          score += 10
          reasons.push(`VWAP Discount (${vwapDev.toFixed(2)}%)`)
        } else if (vwapDev >= 0.5) {
          score -= 10
          reasons.push(`VWAP Premium (+${vwapDev.toFixed(2)}%)`)
        }

        if (bullishFVG) reasons.push('Bullish Fair Value Gap Retest')
        if (bearishFVG) reasons.push('Bearish Fair Value Gap')

        score = Math.max(5, Math.min(95, score))

        let action: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' = 'NEUTRAL'
        if (score >= 75) action = 'STRONG_BUY'
        else if (score >= 60) action = 'BUY'
        else if (score <= 25) action = 'STRONG_SELL'
        else if (score <= 40) action = 'SELL'

        return {
          symbol: sym,
          price: lastClose,
          score,
          action,
          targetTP: lastClose * 1.008,
          stopLoss: lastClose * 0.994,
          reasons,
          rsi: lastRSI,
          adx: lastADX,
          bidRatio,
          vwapDev
        }
      } catch (err) {
        return null
      }
    })

    const results = (await Promise.all(symbolPromises)).filter(Boolean)
    if (results.length > 0) {
      cachedSignals = results
      lastSignalsFetchTime = Date.now()
    }

    isScanning = false

    return NextResponse.json({
      signals: cachedSignals,
      updatedAt: new Date(lastSignalsFetchTime).toISOString()
    })
  } catch (error) {
    isScanning = false
    console.error('[SIGNALS API ERROR]:', error)
    return NextResponse.json({ signals: cachedSignals, error: (error as any)?.message }, { status: 200 })
  }
}

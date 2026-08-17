import { RSI, MACD, BollingerBands, EMA, ADX, ATR } from 'technicalindicators'

export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Calculate ADX & Market Regime (Trending vs Ranging)
export function getMarketRegime(candles: any[]) {
  if (!candles || candles.length < 28) {
    return { adx: 20, isTrending: false, isRanging: true, atr: 0 }
  }

  const highs = candles.map((c: any) => (Array.isArray(c) ? c[2] : c.high))
  const lows = candles.map((c: any) => (Array.isArray(c) ? c[3] : c.low))
  const closes = candles.map((c: any) => (Array.isArray(c) ? c[4] : c.close))

  const adxSeries = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 })
  const lastADX = adxSeries.length > 0 ? adxSeries[adxSeries.length - 1].adx : 20

  const atrSeries = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 })
  const lastATR = atrSeries.length > 0 ? atrSeries[atrSeries.length - 1] : 0

  return {
    adx: lastADX,
    isTrending: lastADX >= 25,
    isRanging: lastADX < 25,
    atr: lastATR
  }
}

export function shouldBuy(candles: any[], strategy: string = 'BOLLINGER_RSI_EMA') {
  if (!candles || candles.length < 15) return false

  const highs: number[] = candles.map((c: any) => (Array.isArray(c) ? c[2] : c.high))
  const lows: number[] = candles.map((c: any) => (Array.isArray(c) ? c[3] : c.low))
  const closes: number[] = candles.map((c: any) => (Array.isArray(c) ? c[4] : c.close))
  const volumes: number[] = candles.map((c: any) => (Array.isArray(c) ? c[5] : c.volume))

  const lastClose = closes[closes.length - 1]
  const prevClose = closes[closes.length - 2]
  const prev2Close = closes[closes.length - 3] || prevClose
  const lastVol = volumes[volumes.length - 1]
  const prevVol = volumes[volumes.length - 2] || lastVol

  const regime = getMarketRegime(candles)

  // 0. AUTO_COMPOUND_10PCT: 10% Target Day Reinvesting Cycler
  if (strategy === 'AUTO_COMPOUND_10PCT') {
    if (closes.length < 30) return false

    // Flash Crash Protection Gate: If drop in last 5 candles > 4%, do not buy
    const high5 = Math.max(...highs.slice(-5))
    const drop5Pct = ((high5 - lastClose) / high5) * 100
    if (drop5Pct >= 4.0) return false

    const rsiSeries = RSI.calculate({ period: 14, values: closes })
    const lastRSI = rsiSeries[rsiSeries.length - 1] || 50
    const prevRSI = rsiSeries[rsiSeries.length - 2] || 50

    const bbSeries = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    const lastBB = bbSeries[bbSeries.length - 1]

    // Buy when oversold dip turns upward or bullish momentum breakout
    const isDipTurnUp = lastRSI <= 42 && lastRSI > prevRSI && lastClose >= prevClose
    const isBBLowerBounce = lastBB ? lastClose <= lastBB.lower * 1.01 && lastClose > prevClose : false
    const isMomentumReversal = lastClose > prevClose && prevClose > prev2Close && lastRSI > 45 && lastRSI < 65

    return (isDipTurnUp || isBBLowerBounce || isMomentumReversal)
  }

  // 1. SECONDS STRATEGY: LIGHTNING MICRO-SCALPER
  if (strategy === 'SECONDS_MICRO_SCALPER') {
    const isMicroUptick = lastClose > prevClose && prevClose <= prev2Close
    const bb = BollingerBands.calculate({ period: 14, stdDev: 1.8, values: closes })
    const lastBB = bb[bb.length - 1]
    const isNearLower = lastBB ? lastClose <= lastBB.middle : true

    return isMicroUptick && isNearLower
  }

  // 2. SECONDS STRATEGY: MICRO-DIP HUNTER
  if (strategy === 'MICRO_DIP_HUNTER') {
    const bb = BollingerBands.calculate({ period: 10, stdDev: 2, values: closes })
    const lastBB = bb[bb.length - 1]
    const isPiercingLower = lastBB ? lastClose <= lastBB.lower * 1.0015 : false
    const isBouncingBack = lastClose > prevClose

    return isPiercingLower || (isBouncingBack && prevClose <= (lastBB?.lower || 0))
  }

  // 3. SECONDS STRATEGY: MOMENTUM BLITZ
  if (strategy === 'MOMENTUM_BLITZ') {
    const is3Upticks = lastClose > prevClose && prevClose > prev2Close
    const isVolExpanding = lastVol >= prevVol * 1.1

    return is3Upticks && isVolExpanding
  }

  // 4. FILTERED MEAN REVERSION (Bollinger + RSI + EMA Trend Filter + ADX Regime Gate)
  if (strategy === 'BOLLINGER_RSI_EMA' || strategy === 'MEAN_REVERSION') {
    if (closes.length < 40) return false

    const ema50Series = EMA.calculate({ period: 50, values: closes })
    const lastEMA50 = ema50Series[ema50Series.length - 1]
    const bbSeries = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    const lastBB = bbSeries[bbSeries.length - 1]
    const rsiSeries = RSI.calculate({ period: 14, values: closes })
    const lastRSI = rsiSeries[rsiSeries.length - 1]
    const prevRSI = rsiSeries[rsiSeries.length - 2]

    if (!lastBB || !lastRSI || !prevRSI || !lastEMA50) return false

    const isMacroIntact = lastClose >= lastEMA50 * 0.985
    const isOversold = lastClose <= lastBB.lower && lastRSI <= 35
    const isTurningUp = lastRSI > prevRSI && lastClose >= prevClose

    if (regime.adx > 35) return false

    return isMacroIntact && isOversold && isTurningUp
  }

  // 5. VWAP SNAPBACK SCALPER
  if (strategy === 'VWAP') {
    if (candles.length < 20) return false
    if (regime.adx > 32) return false

    let num = 0
    let den = 0
    const slice = candles.slice(-20)
    slice.forEach((c: any) => {
      const high = Array.isArray(c) ? c[2] : c.high
      const low = Array.isArray(c) ? c[3] : c.low
      const close = Array.isArray(c) ? c[4] : c.close
      const vol = Array.isArray(c) ? c[5] : c.volume
      const typical = (high + low + close) / 3
      num += typical * vol
      den += vol
    })

    const vwap = den > 0 ? num / den : lastClose
    const dev = ((lastClose - vwap) / vwap) * 100

    return dev <= -0.8 && lastClose > prevClose
  }

  // 6. TREND MOMENTUM BREAKOUT
  if (strategy === 'TREND_MOMENTUM') {
    if (closes.length < 35) return false

    const ema9 = EMA.calculate({ period: 9, values: closes })
    const ema21 = EMA.calculate({ period: 21, values: closes })
    const lastEMA9 = ema9[ema9.length - 1]
    const lastEMA21 = ema21[ema21.length - 1]
    const prevEMA9 = ema9[ema9.length - 2]
    const prevEMA21 = ema21[ema21.length - 2]

    if (!lastEMA9 || !lastEMA21 || !prevEMA9 || !prevEMA21) return false

    const isBullishCross = prevEMA9 <= prevEMA21 && lastEMA9 > lastEMA21
    const isRSIBullish = (RSI.calculate({ period: 14, values: closes }).pop() || 50) >= 52

    return isBullishCross && isRSIBullish && regime.isTrending
  }

  // 7. MACD
  if (strategy === 'MACD') {
    const macdSeries = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    })
    if (macdSeries.length < 2) return false

    const last = macdSeries[macdSeries.length - 1]
    const prev = macdSeries[macdSeries.length - 2]

    return (
      last.MACD !== undefined &&
      last.signal !== undefined &&
      prev.MACD !== undefined &&
      prev.signal !== undefined &&
      last.MACD > last.signal &&
      prev.MACD <= prev.signal &&
      (last.histogram || 0) > 0
    )
  }

  // 8. BOLLINGER
  if (strategy === 'BOLLINGER') {
    const bb = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    const lastBB = bb[bb.length - 1]
    return lastBB !== undefined && lastClose < lastBB.lower && lastClose > prevClose
  }

  // 9. DAILY_PCT
  if (strategy === 'DAILY_PCT') {
    if (closes.length >= 4) {
      const c1 = closes[closes.length - 1]
      const c2 = closes[closes.length - 2]
      const c3 = closes[closes.length - 3]
      if (c1 < c2 && c2 < c3) return false
    }
    return true
  }

  const rsiSeries = RSI.calculate({ values: closes, period: 14 })
  const lastRSI = rsiSeries[rsiSeries.length - 1]
  const prevRSI = rsiSeries[rsiSeries.length - 2]

  return lastRSI !== undefined && prevRSI !== undefined && lastRSI < 30 && lastRSI > prevRSI
}

export function shouldSell(
  entry: number,
  price: number,
  target: number,
  stop: number,
  peakPrice?: number,
  strategy?: string
): string | null {
  const pct = ((price - entry) / entry) * 100

  // 1. Take Profit Hit
  if (pct >= target) return 'TARGET'

  // 2. Compounding 10% Strategy Trailing Protection
  if (strategy === 'AUTO_COMPOUND_10PCT' || target >= 5.0) {
    if (peakPrice && peakPrice > entry) {
      const maxPct = ((peakPrice - entry) / entry) * 100
      // If reached +6%, move stop to +3% (lock in gain)
      if (maxPct >= 6.0 && pct <= 3.0) {
        return 'TRAILING_PROFIT_LOCK'
      }
    }
    // Hard Stop Loss
    if (pct <= -stop) return 'STOP_LOSS'
    return null
  }

  // 3. Trailing & Breakeven Stop Logic for micro-scalpers
  if (peakPrice && peakPrice > entry) {
    const maxPct = ((peakPrice - entry) / entry) * 100

    if (maxPct >= 0.35 && pct <= 0.1) {
      return 'BREAKEVEN_STOP'
    }

    if (maxPct >= 0.25) {
      const dropFromPeakPct = ((peakPrice - price) / peakPrice) * 100
      if (dropFromPeakPct >= 0.15) {
        return 'TRAILING_STOP'
      }
    }
  }

  // 4. Hard Stop Loss Hit
  if (pct <= -stop) return 'STOP_LOSS'

  return null
}

export function getStrategyValue(candles: any[], strategy: string = 'BOLLINGER_RSI_EMA'): string {
  if (!candles || candles.length === 0) return 'Loading...'
  const closes: number[] = candles.map((c: any) => (Array.isArray(c) ? c[4] : c.close))
  const lastClose = closes[closes.length - 1]

  if (strategy === 'AUTO_COMPOUND_10PCT') {
    const rsi = RSI.calculate({ period: 14, values: closes }).pop() || 50
    return `🔥 10% Compounding Engine | RSI: ${rsi.toFixed(1)} | Target: +10% | SL: -20%`
  }

  if (strategy === 'SECONDS_MICRO_SCALPER') {
    const prevClose = closes[closes.length - 2] || lastClose
    const tickDiff = ((lastClose - prevClose) / prevClose) * 100
    return `⚡ TickSpeed=${tickDiff >= 0 ? '+' : ''}${tickDiff.toFixed(3)}% [Fast Scalp]`
  }

  if (strategy === 'MICRO_DIP_HUNTER') {
    const bb = BollingerBands.calculate({ period: 10, stdDev: 2, values: closes })
    const lastBB = bb[bb.length - 1]
    const dev = lastBB ? ((lastClose - lastBB.lower) / lastBB.lower) * 100 : 0
    return `🌊 LowerBandDist=${dev.toFixed(2)}% [Dip Reversal]`
  }

  if (strategy === 'MOMENTUM_BLITZ') {
    return `🚀 Momentum Surge Hunter [Blitz]`
  }

  const rsi = RSI.calculate({ values: closes, period: 14 }).pop() || 50
  return `RSI: ${rsi.toFixed(1)}`
}

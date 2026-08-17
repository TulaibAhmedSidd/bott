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

  // 1. SECONDS STRATEGY: LIGHTNING MICRO-SCALPER
  if (strategy === 'SECONDS_MICRO_SCALPER') {
    // Quick micro-dip turn-up with rapid uptick momentum
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
    const rsi = RSI.calculate({ period: 7, values: closes }) // 7-period fast RSI
    const lastRSI = rsi[rsi.length - 1]

    const isOversoldDip = lastBB ? lastClose <= lastBB.lower * 1.001 : false
    const isFastRsiOversold = lastRSI !== undefined && lastRSI <= 32

    return (isOversoldDip || isFastRsiOversold) && lastClose >= prevClose
  }

  // 3. SECONDS STRATEGY: MOMENTUM BLITZ
  if (strategy === 'MOMENTUM_BLITZ') {
    // 3 consecutive rising closes + volume expansion
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

    const isBullishCross = lastEMA9 > lastEMA21 && prevEMA9 <= prevEMA21
    const isTrending = regime.adx >= 23

    return isBullishCross && isTrending && lastClose > prevClose
  }

  // 7. MACD
  if (strategy === 'MACD') {
    const macdOutput = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    })
    const last = macdOutput[macdOutput.length - 1]
    const prev = macdOutput[macdOutput.length - 2]

    return (
      last &&
      prev &&
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
  peakPrice?: number
): string | null {
  const pct = ((price - entry) / entry) * 100

  // 1. Take Profit Hit
  if (pct >= target) return 'TARGET'

  // 2. Trailing & Breakeven Stop Logic
  if (peakPrice && peakPrice > entry) {
    const maxPct = ((peakPrice - entry) / entry) * 100

    // Breakeven Protection: If position reached +0.35% / +0.5%, move stop to +0.1% (fees covered)
    if (maxPct >= 0.35 && pct <= 0.1) {
      return 'BREAKEVEN_STOP'
    }

    // Dynamic Micro Trailing Stop: If peak was >= +0.25%, sell if price falls 0.15% from peak
    if (maxPct >= 0.25) {
      const dropFromPeakPct = ((peakPrice - price) / peakPrice) * 100
      if (dropFromPeakPct >= 0.15) {
        return 'TRAILING_STOP'
      }
    }
  }

  // 3. Hard Stop Loss Hit
  if (pct <= -stop) return 'STOP_LOSS'

  return null
}

export function getStrategyValue(candles: any[], strategy: string = 'BOLLINGER_RSI_EMA'): string {
  if (!candles || candles.length === 0) return 'Loading...'
  const closes: number[] = candles.map((c: any) => (Array.isArray(c) ? c[4] : c.close))
  const lastClose = closes[closes.length - 1]
  const regime = getMarketRegime(candles)
  const regimeStr = regime.isTrending ? `Trend(ADX=${regime.adx.toFixed(0)})` : `Range(ADX=${regime.adx.toFixed(0)})`

  if (strategy === 'SECONDS_MICRO_SCALPER') {
    const prevClose = closes[closes.length - 2] || lastClose
    const tickDiff = ((lastClose - prevClose) / prevClose) * 100
    return `⚡ TickSpeed=${tickDiff >= 0 ? '+' : ''}${tickDiff.toFixed(3)}% [Fast Scalp]`
  }

  if (strategy === 'MICRO_DIP_HUNTER') {
    const bb = BollingerBands.calculate({ period: 10, stdDev: 2, values: closes })
    const lastBB = bb[bb.length - 1]
    return lastBB ? `DipLow=$${lastBB.lower.toFixed(2)} Price=$${lastClose.toFixed(2)}` : 'DipHunter (N/A)'
  }

  if (strategy === 'MOMENTUM_BLITZ') {
    return `🚀 Momentum Surge [Fast 2s Loop]`
  }

  if (strategy === 'BOLLINGER_RSI_EMA' || strategy === 'MEAN_REVERSION') {
    const rsiSeries = RSI.calculate({ period: 14, values: closes })
    const bbSeries = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    const lastRSI = rsiSeries[rsiSeries.length - 1]
    const lastBB = bbSeries[bbSeries.length - 1]
    return lastRSI && lastBB
      ? `RSI=${lastRSI.toFixed(1)} LowBB=$${lastBB.lower.toFixed(2)} [${regimeStr}]`
      : `B-RSI [${regimeStr}]`
  }

  if (strategy === 'VWAP') {
    let num = 0
    let den = 0
    const slice = candles.slice(-20)
    slice.forEach((c: any) => {
      const high = Array.isArray(c) ? c[2] : c.high
      const low = Array.isArray(c) ? c[3] : c.low
      const close = Array.isArray(c) ? c[4] : c.close
      const vol = Array.isArray(c) ? c[5] : c.volume
      num += ((high + low + close) / 3) * vol
      den += vol
    })
    const vwap = den > 0 ? num / den : lastClose
    const dev = ((lastClose - vwap) / vwap) * 100
    return `VWAP=$${vwap.toFixed(2)} Dev=${dev.toFixed(2)}% [${regimeStr}]`
  }

  if (strategy === 'TREND_MOMENTUM') {
    return `Momentum [${regimeStr}]`
  }

  if (strategy === 'MACD') {
    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    })
    const last = macd[macd.length - 1]
    return last ? `MACD=${last.MACD?.toFixed(2)} Sig=${last.signal?.toFixed(2)} [${regimeStr}]` : `MACD [${regimeStr}]`
  }

  const rsi = RSI.calculate({ values: closes, period: 14 })
  const lastRSI = rsi[rsi.length - 1]
  return `RSI=${lastRSI ? lastRSI.toFixed(1) : 'N/A'} [${regimeStr}]`
}

import { RSI, MACD, BollingerBands, EMA } from 'technicalindicators'

export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function shouldBuy(candles: any[], strategy: string = 'BOLLINGER_RSI_EMA') {
  if (!candles || candles.length < 20) return false

  const closes: number[] = candles.map((c: any) => (Array.isArray(c) ? c[4] : c.close))
  const lastClose = closes[closes.length - 1]
  const prevClose = closes[closes.length - 2]

  // 1. FILTERED MEAN REVERSION (Bollinger + RSI + EMA Trend Filter) - HIGH WIN-RATE
  if (strategy === 'BOLLINGER_RSI_EMA' || strategy === 'MEAN_REVERSION') {
    if (closes.length < 40) return false

    // EMA Trend Filter (EMA 50)
    const ema50Series = EMA.calculate({ period: 50, values: closes })
    const lastEMA50 = ema50Series[ema50Series.length - 1]

    // Bollinger Bands
    const bbSeries = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    const lastBB = bbSeries[bbSeries.length - 1]

    // RSI 14
    const rsiSeries = RSI.calculate({ period: 14, values: closes })
    const lastRSI = rsiSeries[rsiSeries.length - 1]
    const prevRSI = rsiSeries[rsiSeries.length - 2]

    if (!lastBB || !lastRSI || !prevRSI || !lastEMA50) return false

    // Trend filter: Price is above or near 50-EMA (Macro intact) OR RSI is deeply oversold (< 25)
    const isMacroIntact = lastClose >= lastEMA50 * 0.985
    const isOversold = lastClose <= lastBB.lower && lastRSI <= 35
    const isTurningUp = lastRSI > prevRSI && lastClose >= prevClose // Confirmation curve up

    return isMacroIntact && isOversold && isTurningUp
  }

  // 2. VWAP SNAPBACK SCALPER
  if (strategy === 'VWAP') {
    if (candles.length < 20) return false

    // Compute VWAP = Sum(Price * Volume) / Sum(Volume) over 20 candles
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
    const dev = (lastClose - vwap) / vwap * 100

    // Buy when price is depressed 0.8% below VWAP and shows immediate reversal candle
    return dev <= -0.8 && lastClose > prevClose
  }

  // 3. ENHANCED MACD
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

    // Buy Crossover: Now > Signal AND Prev <= Signal AND MACD histogram positive turn
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

  // 4. ENHANCED BOLLINGER
  if (strategy === 'BOLLINGER') {
    const bb = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    const lastBB = bb[bb.length - 1]
    // Requires turn-up candle confirmation
    return lastBB !== undefined && lastClose < lastBB.lower && lastClose > prevClose
  }

  // 5. DAILY_PCT (Momentum Filtered)
  if (strategy === 'DAILY_PCT') {
    // Avoid buying during crash spikes (last 3 closes declining)
    if (closes.length >= 4) {
      const c1 = closes[closes.length - 1]
      const c2 = closes[closes.length - 2]
      const c3 = closes[closes.length - 3]
      if (c1 < c2 && c2 < c3) return false // Active downtrend cascade
    }
    return true
  }

  // 6. ENHANCED DEFAULT RSI (with turn-up curve confirmation)
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

  // 2. Trailing Stop Loss Hit (If peak hit at least +0.6%, sell if price falls 0.25% from peak)
  if (peakPrice && peakPrice > entry) {
    const maxPct = ((peakPrice - entry) / entry) * 100
    if (maxPct >= 0.6) {
      const dropFromPeakPct = ((peakPrice - price) / peakPrice) * 100
      if (dropFromPeakPct >= 0.25) {
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

  if (strategy === 'BOLLINGER_RSI_EMA' || strategy === 'MEAN_REVERSION') {
    const rsiSeries = RSI.calculate({ period: 14, values: closes })
    const bbSeries = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    const lastRSI = rsiSeries[rsiSeries.length - 1]
    const lastBB = bbSeries[bbSeries.length - 1]
    return lastRSI && lastBB
      ? `RSI=${lastRSI.toFixed(1)} LowBB=${lastBB.lower.toFixed(2)}`
      : 'B-RSI (N/A)'
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
    return `VWAP=${vwap.toFixed(2)} Dev=${dev.toFixed(2)}%`
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
    return last ? `MACD=${last.MACD?.toFixed(2)} Sig=${last.signal?.toFixed(2)}` : 'MACD (N/A)'
  }

  if (strategy === 'BOLLINGER') {
    const bb = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    const last = bb[bb.length - 1]
    return last ? `Price=${lastClose.toFixed(2)} Low=${last.lower.toFixed(2)}` : 'BB (N/A)'
  }

  if (strategy === 'DAILY_PCT') {
    return 'Active Loop'
  }

  const rsi = RSI.calculate({ values: closes, period: 14 })
  const lastRSI = rsi[rsi.length - 1]
  return `RSI=${lastRSI ? lastRSI.toFixed(1) : 'N/A'}`
}

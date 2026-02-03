// src/bot/strategy.ts
import { RSI, MACD, BollingerBands } from 'technicalindicators'

export function shouldBuy(closes: number[], strategy: string = 'RSI') {
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

    // Buy Crossover: Now > Signal AND Prev <= Signal
    return last && prev && last.MACD && last.signal && prev.MACD && prev.signal &&
      last.MACD > last.signal && prev.MACD <= prev.signal
  }

  if (strategy === 'BOLLINGER') {
    const bb = BollingerBands.calculate({
      period: 20,
      stdDev: 2,
      values: closes
    })
    const lastBB = bb[bb.length - 1]
    const lastClose = closes[closes.length - 1]

    // Buy if price is below lower band
    return lastBB && lastClose < lastBB.lower
  }

  if (strategy === 'DAILY_PCT') {
    // Buy Immediately if engine asks
    return true
  }

  // Default RSI
  const rsi = RSI.calculate({ values: closes, period: 14 })
  const lastRSI = rsi.pop()

  // Buy if RSI is Oversold (< 30)
  return lastRSI !== undefined && lastRSI < 30
}

export function shouldSell(entry: number, price: number, target: number, stop: number) {
  const pct = ((price - entry) / entry) * 100
  if (pct >= target) return 'TARGET'
  if (pct <= -stop) return 'STOP_LOSS' // Fixed return string to match engine convention/logging
  return null
}

export function getStrategyValue(closes: number[], strategy: string = 'RSI'): string {
  if (strategy === 'MACD') {
    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    })
    const last = macd.pop()
    return last ? `MACD=${last.MACD?.toFixed(2)} Sig=${last.signal?.toFixed(2)}` : 'MACD (N/A)'
  }
  if (strategy === 'BOLLINGER') {
    const bb = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes })
    const last = bb.pop()
    const close = closes[closes.length - 1]
    return last ? `Price=${close.toFixed(2)} Low=${last.lower.toFixed(2)}` : 'BB (N/A)'
  }
  if (strategy === 'DAILY_PCT') {
    return 'Looping...'
  }
  const rsi = RSI.calculate({ values: closes, period: 14 })
  return `RSI=${rsi.pop()?.toFixed(2)}`
}

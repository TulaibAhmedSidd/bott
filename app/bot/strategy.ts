// src/bot/strategy.ts
import { RSI } from 'technicalindicators'

export function shouldBuy(closes: number[]) {
  const rsi = RSI.calculate({ values: closes, period: 14 }).pop()
  return rsi !== undefined && rsi > 30 && rsi < 60
}

export function shouldSell(entry: number, price: number, target: number, stop: number) {
  const pct = ((price - entry) / entry) * 100
  if (pct >= target) return 'TARGET'
  if (pct <= -stop) return 'STOP'
  return null
}

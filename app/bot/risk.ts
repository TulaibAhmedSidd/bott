// src/bot/risk.ts
let dailyProfit = 0

export function resetDailyProfit() {
  dailyProfit = 0
}

export function canTrade(target: number): boolean {
  return dailyProfit < target
}

export function addProfit(pct: number) {
  dailyProfit += pct
}

export function getDailyProfit() {
  return Number(dailyProfit.toFixed(3))
}
export { dailyProfit }
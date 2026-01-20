// src/bot/config.ts

export type BotConfig = {
    symbol: string
    dailyTarget: number
    stopLoss: number
    timeframe: string
    running: boolean
    capital: number
    tradePercent: number
}
export const botConfig: BotConfig = {
    symbol: 'BNB/USDT',
    capital: 100,
    tradePercent: 20,
    dailyTarget: 1,
    stopLoss: 0.5,
    timeframe: '5m',
    running: false
}

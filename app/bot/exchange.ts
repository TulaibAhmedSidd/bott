// src/bot/exchange.ts
const exchanges: Record<string, any> = {}

export async function getExchange(mode: 'TESTNET' | 'LIVE' = 'TESTNET') {
  if (exchanges[mode]) return exchanges[mode]

  const ccxt = await import('ccxt')
  const isTest = mode === 'TESTNET'

  const apiKey = isTest
    ? process.env.TEST_BINANCE_API_KEY || process.env.NEXT_PUBLIC_TEST_BINANCE_API_KEY
    : process.env.BINANCE_API_KEY || process.env.NEXT_PUBLIC_BINANCE_API_KEY

  const secret = isTest
    ? process.env.TEST_BINANCE_API_SECRET || process.env.NEXT_PUBLIC_TEST_BINANCE_API_SECRET
    : process.env.BINANCE_API_SECRET || process.env.NEXT_PUBLIC_BINANCE_API_SECRET

  console.log(`[EXCHANGE] Initializing ${mode} mode (Key: ${apiKey ? apiKey.slice(0, 8) + '...' : 'MISSING'})...`)

  const instance = new ccxt.binance({
    apiKey,
    secret,
    sandbox: isTest,
    enableRateLimit: true,
    options: {
      defaultType: 'spot'
    },
    urls: isTest ? {
      api: {
        public: 'https://testnet.binance.vision/api',
        private: 'https://testnet.binance.vision/api'
      }
    } : undefined
  })

  try {
    await instance.loadMarkets()
  } catch (e) {
    console.warn(`[EXCHANGE] Failed to pre-load markets for ${mode}:`, e)
  }

  exchanges[mode] = instance
  return exchanges[mode]
}

export async function getAccountBalance(symbol: string, mode: 'TESTNET' | 'LIVE' = 'TESTNET') {
  const exchange = await getExchange(mode)
  try {
    const balance = await exchange.fetchBalance()
    const asset = symbol.split('/')[1] || 'USDT'
    return balance[asset]?.free || 0
  } catch (err) {
    console.error('FETCH BALANCE ERROR', err)
    return 0
  }
}

export function formatOrderAmount(exchange: any, symbol: string, rawQty: number): number {
  try {
    if (typeof exchange.amountToPrecision === 'function') {
      const formattedStr = exchange.amountToPrecision(symbol, rawQty)
      return parseFloat(formattedStr)
    }
  } catch (e) {
    console.warn(`[EXCHANGE] amountToPrecision fallback for ${symbol}:`, e)
  }
  return parseFloat(rawQty.toFixed(5))
}

// src/bot/exchange.ts
import fs from 'fs'
import path from 'path'

const exchanges: Record<string, any> = {}

// Helper to ensure env keys are freshly read if runtime lags
function getEnvKey(key: string): string {
  if (process.env[key]) return process.env[key]!

  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8')
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/)
        if (match && match[1] === key) {
          return (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
        }
      }
    }
  } catch {}
  return ''
}

export async function getExchange(mode: 'TESTNET' | 'LIVE' = 'TESTNET') {
  const isTest = mode === 'TESTNET'

  const apiKey = isTest
    ? getEnvKey('TEST_BINANCE_API_KEY') || getEnvKey('NEXT_PUBLIC_TEST_BINANCE_API_KEY')
    : getEnvKey('BINANCE_API_KEY') || getEnvKey('NEXT_PUBLIC_BINANCE_API_KEY')

  const secret = isTest
    ? getEnvKey('TEST_BINANCE_API_SECRET') || getEnvKey('NEXT_PUBLIC_TEST_BINANCE_API_SECRET')
    : getEnvKey('BINANCE_API_SECRET') || getEnvKey('NEXT_PUBLIC_BINANCE_API_SECRET')

  const cacheKey = `${mode}_${apiKey.slice(0, 8)}`
  if (exchanges[cacheKey]) return exchanges[cacheKey]

  const ccxt = await import('ccxt')

  const config: any = {
    apiKey,
    secret,
    enableRateLimit: true,
    options: {
      defaultType: 'spot'
    }
  }

  if (isTest) {
    config.sandbox = true
    config.urls = {
      api: {
        public: 'https://testnet.binance.vision/api',
        private: 'https://testnet.binance.vision/api'
      }
    }
  }

  const instance = new ccxt.binance(config)

  try {
    await instance.loadMarkets()
  } catch (e) {
    console.warn(`[EXCHANGE] loadMarkets warning for ${mode}:`, (e as any)?.message)
  }

  exchanges[cacheKey] = instance
  return instance
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

// // src/bot/exchange.ts
// import ccxt from 'ccxt'

// export const exchange = new ccxt.binance({
// //   apiKey: process.env.BINANCE_API_KEY,
// //   secret: process.env.BINANCE_API_SECRET,
//   apiKey: process.env.NEXT_PUBLIC_TEST_BINANCE_API_KEY,
//   secret: process.env.NEXT_PUBLIC_TEST_BINANCE_API_SECRET,
//   enableRateLimit: true,
//   options: {
//     defaultType: 'spot'
//   },
//   urls: {
//     api: {
//       public: 'https://testnet.binance.vision/api',
//       private: 'https://testnet.binance.vision/api'
//     }
//   }
// })

const exchanges: Record<string, any> = {}

export async function getExchange(mode: 'TESTNET' | 'LIVE' = 'TESTNET') {
  if (exchanges[mode]) return exchanges[mode]

  const ccxt = await import('ccxt')
  const isTest = mode === 'TESTNET'

  console.log(`[EXCHANGE] Initializing ${mode} mode...`)

  exchanges[mode] = new ccxt.binance({
    apiKey: isTest
      ? process.env.NEXT_PUBLIC_TEST_BINANCE_API_KEY
      : process.env.BINANCE_API_KEY,
    secret: isTest
      ? process.env.NEXT_PUBLIC_TEST_BINANCE_API_SECRET
      : process.env.BINANCE_API_SECRET,
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

  return exchanges[mode]
}

export async function getAccountBalance(symbol: string, mode: 'TESTNET' | 'LIVE' = 'TESTNET') {
  const exchange = await getExchange(mode)
  try {
    const balance = await exchange.fetchBalance()
    const asset = symbol.split('/')[1] // 'USDT' from 'BNB/USDT'
    return balance[asset]?.free || 0
  } catch (err) {
    console.error('FETCH BALANCE ERROR', err)
    return 0
  }
}

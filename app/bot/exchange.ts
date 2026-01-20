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

let exchange: any = null
const isTest = process.env.TRADING_MODE === 'test'

export async function getExchange() {
  if (exchange) return exchange

  const ccxt = await import('ccxt')

  exchange = new ccxt.binance({
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
    urls: {
      api: {
        public: 'https://testnet.binance.vision/api',
        private: 'https://testnet.binance.vision/api'
      }
    }
  })

  return exchange
}

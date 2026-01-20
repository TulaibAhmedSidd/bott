import { getExchange } from './exchange'

export async function marketBuy(symbol: string, usdtAmount: number) {
    const exchange = await getExchange()
    const price = (await exchange.fetchTicker(symbol)).last!
    const quantity = Number((usdtAmount / price).toFixed(6))

    return exchange.createMarketBuyOrder(symbol, quantity)
}

export async function marketSell(symbol: string, quantity: number) {
    const exchange = await getExchange()
    return exchange.createMarketSellOrder(symbol, quantity)
}

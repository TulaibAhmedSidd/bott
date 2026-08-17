export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const preferredRegion = ['fra1', 'sin1', 'lhr1'];

import { NextResponse } from "next/server";
import Trade from "@/app/models/Trade";
import BotConfig from "@/app/models/BotConfig";
import connectDB from "@/app/mongodb";
import { getExchange } from "@/app/bot/exchange";

export async function GET() {
  try {
    await connectDB();
    const config = await BotConfig.findOne();
    const mode = config?.tradingMode || "TESTNET";

    // 1. Fetch DB Trades
    const dbTrades = await Trade.find().sort({ createdAt: -1 }).limit(50);

    // 2. If in LIVE mode, also fetch real Binance account spot trades
    let liveBinanceTrades: any[] = [];
    if (mode === "LIVE") {
      try {
        const exchange = await getExchange("LIVE");
        const pairs = ["SOL/USDT", "XRP/USDT", "BNB/USDT", "BTC/USDT", "ETH/USDT"];
        
        for (const pair of pairs) {
          try {
            if (exchange.markets && exchange.markets[pair]) {
              const myTrades = await exchange.fetchMyTrades(pair, undefined, 5);
              if (myTrades && myTrades.length > 0) {
                myTrades.forEach((t: any) => {
                  liveBinanceTrades.push({
                    symbol: t.symbol,
                    side: t.side.toUpperCase(),
                    price: t.price,
                    quantity: t.amount,
                    pnl: undefined,
                    reason: "BINANCE_REAL_TRADE",
                    createdAt: new Date(t.timestamp).toISOString(),
                    strategy: "Spot Execution",
                    isExchangeTrade: true
                  });
                });
              }
            }
          } catch {}
        }
      } catch (err) {
        console.warn("[TRADES API] Could not fetch live trades:", (err as any)?.message);
      }
    }

    // Combine and sort by date descending
    const combined = [...dbTrades.map(t => t.toObject()), ...liveBinanceTrades];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(combined);
  } catch (error) {
    console.error("[TRADES API ERROR]:", error);
    return NextResponse.json([]);
  }
}

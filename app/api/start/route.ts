export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { startBot } from "@/app/bot/engine";
import BotState from "@/app/models/BotState";
import connectDB from "@/app/mongodb";
import BotConfig from "@/app/models/BotConfig";

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json().catch(() => ({}));

  let config = await BotConfig.findOne();
  if (!config) {
    config = await BotConfig.create({
      symbol: body.symbol || "BNB/USDT",
      tradeUSDT: 10,
      dailyTarget: 1,
      stopLoss: 0.5,
      tradingMode: "TESTNET",
      strategy: "BOLLINGER_RSI_EMA"
    });
  }

  const symbol = body.symbol || config.symbol || "BNB/USDT";
  const mode = config.tradingMode || "TESTNET";

  let state = await BotState.findOne({ symbol });

  if (!state) {
    state = await BotState.create({
      symbol,
      status: "IDLE",
      isRunning: true,
      tradeUSDT: config.tradeUSDT || 10,
      targetPct: config.dailyTarget || 1,
      stopLossPct: config.stopLoss || 0.5,
      strategy: config.strategy || "BOLLINGER_RSI_EMA",
      realizedPnL: 0,
      dailyPnL: 0
    });
  } else {
    state.isRunning = true;
    state.tradeUSDT = config.tradeUSDT || state.tradeUSDT || 10;
    state.targetPct = config.dailyTarget || state.targetPct || 1;
    state.stopLossPct = config.stopLoss || state.stopLossPct || 0.5;
    state.strategy = config.strategy || state.strategy || "BOLLINGER_RSI_EMA";

    if (state.status === "STOPPED") {
      state.status = "IDLE";
    }

    await state.save();
  }

  // Launch Engine loop for the symbol with the active trading mode (TESTNET or LIVE)
  startBot(symbol, mode as "TESTNET" | "LIVE");

  return NextResponse.json({ started: true, symbol, mode });
}

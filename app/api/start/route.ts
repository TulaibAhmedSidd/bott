// app/api/start/route.ts

// import { botConfig } from "@/app/bot/config"
// import { startBot } from "@/app/bot/engine"

// export async function POST() {
//   botConfig.running = true
//   startBot()
//   return Response.json({ status: 'started' })
// }


export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { startBot } from "@/app/bot/engine";
import BotState from "@/app/models/BotState";
import connectDB from "@/app/mongodb";
import BotConfig from "@/app/models/BotConfig";

export async function POST(req: Request) {
  await connectDB();

  // 1. Get Config
  const config = await BotConfig.findOne();
  if (!config) {
    return NextResponse.json({ error: "No config found. Save config first." }, { status: 400 });
  }

  // 2. Ensure BotState exists & set to RUNNING
  // Using findOneAndUpdate with separate $set and $setOnInsert to avoid conflicts
  // and handle status reset logic if needed (we'll do strict update)

  let state = await BotState.findOne({ symbol: config.symbol });

  if (!state) {
    state = await BotState.create({
      symbol: config.symbol,
      status: 'IDLE',
      isRunning: true,
      tradeUSDT: config.tradeUSDT,
      targetPct: config.dailyTarget,
      stopLossPct: config.stopLoss,
      realizedPnL: 0,
      dailyPnL: 0
    });
  } else {
    // Update existing state
    state.isRunning = true;
    state.tradeUSDT = config.tradeUSDT;
    state.targetPct = config.dailyTarget;
    state.stopLossPct = config.stopLoss;

    // Reset status if it was stopped, so it can start trading again
    if (state.status === 'STOPPED') {
      state.status = 'IDLE';
    }

    await state.save();
  }

  // 3. Start Engine
  startBot(config.symbol, config.tradingMode || 'TESTNET');

  return NextResponse.json({ started: true, symbol: config.symbol, mode: config.tradingMode });
}

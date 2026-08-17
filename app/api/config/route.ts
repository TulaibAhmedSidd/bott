export const runtime = "nodejs";

import { NextResponse } from "next/server";
import connectDB from "@/app/mongodb";
import BotConfig from "@/app/models/BotConfig";
import BotState from "@/app/models/BotState";

export async function GET() {
  await connectDB();
  const config = await BotConfig.findOne();
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json().catch(() => ({}));

  let existingConfig = await BotConfig.findOne();

  if (!existingConfig) {
    existingConfig = await BotConfig.create({
      symbol: body.symbol || "BNB/USDT",
      tradeUSDT: body.tradeUSDT || 10,
      dailyTarget: body.dailyTarget || 1,
      stopLoss: body.stopLoss || 0.5,
      tradingMode: body.tradingMode || "TESTNET",
      strategy: body.strategy || "BOLLINGER_RSI_EMA"
    });
  } else {
    if (body.tradingMode) existingConfig.tradingMode = body.tradingMode;
    if (body.symbol) existingConfig.symbol = body.symbol;
    if (body.tradeUSDT) existingConfig.tradeUSDT = body.tradeUSDT;
    if (body.dailyTarget) existingConfig.dailyTarget = body.dailyTarget;
    if (body.stopLoss) existingConfig.stopLoss = body.stopLoss;
    if (body.strategy) existingConfig.strategy = body.strategy;
    if (body.maxTrades !== undefined) existingConfig.maxTrades = body.maxTrades;
    await existingConfig.save();
  }

  if (body.symbol) {
    await BotState.findOneAndUpdate(
      { symbol: body.symbol },
      {
        $set: {
          targetPct: body.dailyTarget || existingConfig.dailyTarget,
          stopLossPct: body.stopLoss || existingConfig.stopLoss,
          tradeUSDT: body.tradeUSDT || existingConfig.tradeUSDT,
          strategy: body.strategy || existingConfig.strategy,
          maxTrades: body.maxTrades
        },
        $setOnInsert: {
          status: "IDLE",
          realizedPnL: 0,
          dailyPnL: 0,
          isRunning: false
        }
      },
      { upsert: true, new: true }
    );
  }

  return NextResponse.json(existingConfig);
}

export async function DELETE() {
  await connectDB();
  await BotConfig.deleteMany({});
  return NextResponse.json({ deleted: true });
}

// // app/api/start/route.ts

// import { botConfig } from "@/app/bot/config"
// import { startBot } from "@/app/bot/engine"


// export async function POST(req: Request) {
//   const body = await req.json()

//   Object.assign(botConfig, body)

//   return Response.json({ ok: true, botConfig })
// }

// export const runtime = 'nodejs'

// import { NextResponse } from 'next/server'
// import  connectDB from '@/app/mongodb'
// import BotState from '@/app/models/BotState'

// export async function POST(req: Request) {
//   await connectDB()

//   const config = await req.json()

//   let state = await BotState.findOne({ symbol: config.symbol })

//   if (!state) {
//     state = await BotState.create({
//       symbol: config.symbol,
//       status: 'IDLE',
//       realizedPnL: 0,
//       dailyPnL: 0,
//     })
//   }

//   return NextResponse.json({ ok: true })
// }


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
  const body = await req.json();

  // If we only want to update mode, handle specific payload? 
  // Or just always replace config. 
  // If UI sends full config, it is fine.

  await BotConfig.deleteMany({}); // single-bot system for now

  const config = await BotConfig.create({
    ...body,
    tradingMode: body.tradingMode || 'TESTNET' // Default if missing
  });

  // ensure state exists or update parameters if exists
  await BotState.findOneAndUpdate(
    { symbol: body.symbol },
    {
      $set: {
        targetPct: body.dailyTarget,
        stopLossPct: body.stopLoss,
        strategy: body.strategy, // Save Strategy
        maxTrades: body.maxTrades
      },
      $setOnInsert: {
        status: "IDLE",
        realizedPnL: 0,
        dailyPnL: 0,
        isRunning: false
      }
    },
    { upsert: true }
  );

  return NextResponse.json(config);
}

export async function DELETE() {
  await connectDB();
  await BotConfig.deleteMany({});
  return NextResponse.json({ deleted: true });
}


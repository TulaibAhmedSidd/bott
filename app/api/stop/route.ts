// app/api/stop/route.ts

// import { startBot, stopBot } from "@/app/bot/engine"

// export async function POST() {
//   stopBot()
//   return Response.json({ status: 'stopped' })
// }

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { stopBot } from "@/app/bot/engine";
import BotState from "@/app/models/BotState";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { symbol } = body;

  if (!symbol) {
    // If no symbol, maybe stop all? For now require symbol or pick from config?
    // Let's try to stop all active ones if no symbol provided (Safe fallback)
    // Or just error.
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  await BotState.updateOne({ symbol }, {
    isRunning: false
  })

  await stopBot(symbol);

  return NextResponse.json({ stopped: true, symbol });
}

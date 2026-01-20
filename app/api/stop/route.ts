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

export async function POST() {
  await BotState.updateOne({}, {
    isRunning: false
  })
  stopBot();
  return NextResponse.json({ stopped: true });
}

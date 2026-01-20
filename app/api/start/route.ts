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
import  connectDB  from "@/app/mongodb";
import BotConfig from "@/app/models/BotConfig";

export async function POST() {
  await connectDB();

  const config = await BotConfig.findOne();
  if (!config) {
    return NextResponse.json({ error: "No config" }, { status: 400 });
  }

  await startBot(config);
  return NextResponse.json({ started: true });
}

// // app/api/start/route.ts

// import { botConfig } from "@/app/bot/config"
// import { dailyProfit } from "@/app/bot/risk"

// export async function GET() {
//   return Response.json({ ...botConfig, dailyProfit })
// }

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import  connectDB  from '@/app/mongodb'
import BotState from '@/app/models/BotState'

export async function GET() {
  await connectDB()

  let state = await BotState.findOne().sort({ updatedAt: -1 })

  if (!state) {
    state = await BotState.create({
      symbol: 'NOT_SET',
      status: 'IDLE',
      realizedPnL: 0,
      dailyPnL: 0,
    })
  }

  return NextResponse.json(state)
}

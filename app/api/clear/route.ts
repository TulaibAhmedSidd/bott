
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import connectDB from "@/app/mongodb";
import Trade from "@/app/models/Trade";
import BotState from "@/app/models/BotState";

export async function POST() {
    await connectDB();

    // 1. Delete all trade history
    await Trade.deleteMany({});

    // 2. Reset Bot Stats (keep them running, just reset counters)
    await BotState.updateMany({}, {
        $set: {
            realizedPnL: 0,
            dailyPnL: 0,
            lastReset: new Date().toISOString().slice(0, 10)
        }
    });

    return NextResponse.json({ cleared: true });
}

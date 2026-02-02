export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import connectDB from '@/app/mongodb';
import BotConfig from '@/app/models/BotConfig';
import BotState from '@/app/models/BotState';

export async function POST() {
    await connectDB();

    // Stop all running bots (flag only, loop needs to check DB)
    await BotState.updateMany({}, { isRunning: false, status: 'STOPPED' });

    // Delete Configs and States
    await BotConfig.deleteMany({});
    await BotState.deleteMany({});

    return NextResponse.json({ success: true, message: "All bots deleted." });
}

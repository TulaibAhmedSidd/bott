export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Trade from "@/app/models/Trade";
import  connectDB from "@/app/mongodb";

export async function GET() {
  await connectDB();
  const trades = await Trade.find().sort({ createdAt: -1 }).limit(20);
  return NextResponse.json(trades);
}

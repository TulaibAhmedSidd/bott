export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Trade from "@/app/models/Trade";
import connectDB from "@/app/mongodb";

export async function GET() {
  await connectDB();
  const trades = await Trade.find().sort({ createdAt: -1 }).limit(100);
  return NextResponse.json(trades);
}

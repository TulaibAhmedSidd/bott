export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getExchange } from "@/app/bot/exchange";

export async function GET() {
  const exchange = await getExchange();
  const markets = await exchange.loadMarkets();

  const symbols = Object.keys(markets).filter(
    (s) =>
      s.endsWith("/USDT") &&
      markets[s].spot &&
      markets[s].active
  );

  return NextResponse.json(symbols);
}

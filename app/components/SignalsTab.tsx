"use client";

import { useEffect, useState } from "react";

type SignalData = {
  symbol: string;
  price: number;
  score: number;
  action: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  targetTP: number;
  stopLoss: number;
  reasons: string[];
  rsi: number;
  adx: number;
  bidRatio: number;
  vwapDev: number;
};

export default function SignalsTab({ onExecute }: { onExecute: () => void }) {
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingSymbol, setExecutingSymbol] = useState<string | null>(null);

  const fetchSignals = async () => {
    try {
      const res = await fetch("/api/signals").then((r) => r.json());
      if (Array.isArray(res.signals)) {
        setSignals(res.signals);
      }
    } catch (e) {
      console.error("Failed to load signals:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleExecuteSignal = async (sig: SignalData) => {
    setExecutingSymbol(sig.symbol);
    try {
      // 1. Configure Bot with Signal's Pre-Calculated Targets
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sig.symbol,
          tradeUSDT: 10,
          dailyTarget: 0.8,
          stopLoss: 0.6,
          strategy: "BOLLINGER_RSI_EMA"
        })
      });

      // 2. Start Bot Execution
      await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sig.symbol })
      });

      onExecute();
    } catch (e) {
      console.error("Failed to execute signal bot:", e);
    } finally {
      setExecutingSymbol(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Explainer */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/40 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-emerald-950/20">
        <span className="text-2xl">🎯</span>
        <div className="text-xs text-zinc-300 space-y-1">
          <div className="font-bold text-emerald-400 text-sm flex items-center gap-2">
            Institutional Quant & AI Signal Intelligence
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-normal">
              Real-Time Confluence Radar
            </span>
          </div>
          <p>
            Synthesizes <strong>Orderbook Depth Imbalances (OBI)</strong>, <strong>Institutional Fair Value Gaps (FVG)</strong>, <strong>50-EMA Macro Trend</strong>, and <strong>Bollinger/RSI Mean Reversion</strong> to score highest-probability buy/sell opportunities.
          </p>
        </div>
      </div>

      {/* Signal Cards Grid */}
      {loading && signals.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-10 text-center text-zinc-500 text-sm">
          ⚡ Scanning live Binance orderbooks and calculating quantitative confluences...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map((sig, i) => {
            const isBuy = sig.action === "STRONG_BUY" || sig.action === "BUY";
            const isSell = sig.action === "STRONG_SELL" || sig.action === "SELL";

            return (
              <div
                key={i}
                className={`p-4 sm:p-5 rounded-xl border transition-all ${
                  sig.action === "STRONG_BUY"
                    ? "bg-emerald-950/30 border-emerald-500/50 shadow-xl shadow-emerald-950/20 ring-1 ring-emerald-500/30"
                    : isBuy
                    ? "bg-zinc-900/80 border-emerald-900/50"
                    : isSell
                    ? "bg-rose-950/20 border-rose-900/40"
                    : "bg-zinc-900/60 border-zinc-800"
                }`}
              >
                {/* CARD HEADER */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-black text-white">{sig.symbol}</h3>
                    <div className="text-xs font-mono text-zinc-300 mt-0.5">
                      Live Rate: <span className="font-bold text-white">${sig.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                      sig.action === "STRONG_BUY"
                        ? "bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/30"
                        : sig.action === "BUY"
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                        : sig.action === "STRONG_SELL"
                        ? "bg-rose-600 text-white border-rose-500"
                        : sig.action === "SELL"
                        ? "bg-rose-950/80 text-rose-300 border-rose-800"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {sig.action.replace("_", " ")}
                  </span>
                </div>

                {/* CONFIDENCE BAR */}
                <div className="my-3 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-400">Signal Confidence:</span>
                    <span
                      className={`font-bold ${
                        sig.score >= 70 ? "text-emerald-400" : sig.score <= 40 ? "text-rose-400" : "text-zinc-300"
                      }`}
                    >
                      {sig.score}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        sig.score >= 70
                          ? "bg-gradient-to-r from-emerald-500 to-green-400"
                          : sig.score <= 40
                          ? "bg-gradient-to-r from-rose-600 to-red-500"
                          : "bg-gradient-to-r from-amber-500 to-yellow-400"
                      }`}
                      style={{ width: `${sig.score}%` }}
                    />
                  </div>
                </div>

                {/* TARGET & STOP LOSS MATH */}
                <div className="bg-black/60 border border-zinc-800/80 rounded-lg p-2.5 my-2.5 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Target TP (+0.8%)</span>
                    <span className="text-emerald-400 font-bold">${sig.targetTP.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Stop Loss (-0.6%)</span>
                    <span className="text-rose-400 font-bold">${sig.stopLoss.toFixed(2)}</span>
                  </div>
                </div>

                {/* CONFLUENCE DRIVERS LIST */}
                <div className="my-3 space-y-1 text-[11px]">
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Key Confluence Drivers:</div>
                  <div className="space-y-0.5">
                    {sig.reasons.slice(0, 3).map((r, ri) => (
                      <div key={ri} className="flex items-center gap-1 text-zinc-300">
                        <span className="text-emerald-400 text-xs">✓</span>
                        <span className="truncate">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* METRICS ROW */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono bg-zinc-950/70 p-2 rounded border border-zinc-800/60 mb-3">
                  <div>
                    <div className="text-zinc-500">RSI</div>
                    <div className="text-white font-bold">{sig.rsi.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Orderbook Bids</div>
                    <div className="text-emerald-400 font-bold">{sig.bidRatio.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">VWAP Dev</div>
                    <div className="text-white font-bold">{sig.vwapDev.toFixed(2)}%</div>
                  </div>
                </div>

                {/* 1-CLICK EXECUTE BUTTON */}
                <button
                  onClick={() => handleExecuteSignal(sig)}
                  disabled={executingSymbol === sig.symbol}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    isBuy
                      ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-950/40"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {executingSymbol === sig.symbol ? (
                    <span>⌛ Initializing Bot...</span>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Trade This Signal ({sig.symbol})</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

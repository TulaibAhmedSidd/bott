"use client";

import { useState } from "react";

export default function CompoundingDayTab({
  availableUsdt = 0,
  onSaved
}: {
  availableUsdt?: number;
  onSaved: () => void;
}) {
  const [selectedPair, setSelectedPair] = useState("XRP/USDT");
  const [tradeUSDT, setTradeUSDT] = useState(availableUsdt >= 10 ? Math.floor(availableUsdt) : 11);
  const [targetPct, setTargetPct] = useState(10.0);
  const [stopLossPct, setStopLossPct] = useState(20.0);
  const [loading, setLoading] = useState(false);

  // Dynamic Compounding projection based on user's custom target percentage
  const multiplier = 1 + targetPct / 100;
  const cycle1 = tradeUSDT * multiplier;
  const cycle2 = cycle1 * multiplier;
  const cycle3 = cycle2 * multiplier;
  const cycle4 = cycle3 * multiplier;

  const launchCompoundBot = async () => {
    if (targetPct <= 0 || targetPct > 100) {
      alert("Target percentage must be between 1% and 100%.");
      return;
    }
    if (stopLossPct <= 0 || stopLossPct > 50) {
      alert("Stop loss percentage must be between 1% and 50%.");
      return;
    }

    setLoading(true);
    try {
      // 1. Save Config
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedPair,
          tradeUSDT: tradeUSDT,
          dailyTarget: targetPct,
          stopLoss: stopLossPct,
          strategy: "AUTO_COMPOUND_10PCT"
        })
      });

      // 2. Start Bot
      await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selectedPair })
      });

      onSaved();
    } catch (e) {
      console.error("Failed to launch compounding bot:", e);
      alert("Error starting bot. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategy Hero Banner */}
      <div className="bg-gradient-to-r from-orange-950/60 via-amber-950/40 to-zinc-900 border border-orange-500/50 rounded-xl p-5 shadow-xl shadow-orange-950/30">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-2xl shadow-lg shadow-orange-950/60 shrink-0">
            🔥
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white">
                Continuous Auto-Compounding Day Runner
              </h3>
              <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                Target: +{targetPct}% | SL: -{stopLossPct}%
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Buys high-probability dips, locks in your custom <strong>+{targetPct}%</strong> gain, and immediately rolls your compounded balance into the next cycle. Continues running uninterrupted until you stop it or market crash trigger is hit.
            </p>
          </div>
        </div>
      </div>

      {/* Compounding Growth Roadmap Calculator */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 space-y-3 shadow-lg">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            📈 Projected Compounding Ladder (+{targetPct}% / Cycle starting with ${tradeUSDT.toFixed(2)} USDT)
          </span>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            +{((cycle4 - tradeUSDT) / tradeUSDT * 100).toFixed(1)}% Gain Across 4 Cycles
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-black/60 border border-zinc-800 p-3 rounded-lg">
            <div className="text-[10px] text-zinc-500 uppercase">Cycle 1 Exit (+{targetPct}%)</div>
            <div className="text-emerald-400 font-bold text-base mt-0.5">${cycle1.toFixed(2)} USDT</div>
            <div className="text-[10px] text-zinc-400">+${(cycle1 - tradeUSDT).toFixed(2)} net gain</div>
          </div>
          <div className="bg-black/60 border border-zinc-800 p-3 rounded-lg">
            <div className="text-[10px] text-zinc-500 uppercase">Cycle 2 Exit (+{targetPct}%)</div>
            <div className="text-emerald-400 font-bold text-base mt-0.5">${cycle2.toFixed(2)} USDT</div>
            <div className="text-[10px] text-zinc-400">+${(cycle2 - tradeUSDT).toFixed(2)} net gain</div>
          </div>
          <div className="bg-black/60 border border-zinc-800 p-3 rounded-lg">
            <div className="text-[10px] text-zinc-500 uppercase">Cycle 3 Exit (+{targetPct}%)</div>
            <div className="text-emerald-400 font-bold text-base mt-0.5">${cycle3.toFixed(2)} USDT</div>
            <div className="text-[10px] text-zinc-400">+${(cycle3 - tradeUSDT).toFixed(2)} net gain</div>
          </div>
          <div className="bg-black/60 border border-zinc-800 p-3 rounded-lg">
            <div className="text-[10px] text-zinc-500 uppercase">Cycle 4 Exit (+{targetPct}%)</div>
            <div className="text-emerald-400 font-bold text-base mt-0.5">${cycle4.toFixed(2)} USDT</div>
            <div className="text-[10px] text-zinc-400">+${(cycle4 - tradeUSDT).toFixed(2)} net gain</div>
          </div>
        </div>
      </div>

      {/* Configuration & Launch Panel with Editable Target & Stop Loss */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Pair Select */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Trading Pair
            </label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="w-full bg-black/60 border border-zinc-700 focus:border-orange-500 rounded-lg px-3 py-2.5 text-white font-medium text-sm outline-none transition-all font-mono"
            >
              <option value="XRP/USDT">XRP / USDT</option>
              <option value="BNB/USDT">BNB / USDT</option>
              <option value="SOL/USDT">SOL / USDT</option>
              <option value="BTC/USDT">BTC / USDT</option>
              <option value="ETH/USDT">ETH / USDT</option>
              <option value="ADA/USDT">ADA / USDT</option>
            </select>
          </div>

          {/* Trade Budget */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Starting Budget (USDT)
              </label>
              <div className="text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-zinc-500">Available:</span>
                <span className="text-emerald-400 font-bold">${availableUsdt.toFixed(2)} USDT</span>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                min={10}
                max={500}
                value={tradeUSDT}
                onChange={(e) => setTradeUSDT(Math.max(10, +e.target.value))}
                className="w-full bg-black/60 border border-zinc-700 focus:border-orange-500 rounded-lg px-3 py-2.5 text-white font-medium text-sm outline-none transition-all pr-24 font-mono"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTradeUSDT(10)}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold font-mono transition-colors"
                >
                  $10
                </button>
                {availableUsdt >= 10 && (
                  <button
                    type="button"
                    onClick={() => setTradeUSDT(Math.floor(availableUsdt))}
                    className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded text-[10px] font-bold font-mono transition-colors"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Editable Take Profit Target */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Take Profit Target (%)
              </label>
              <span className="text-[10px] text-emerald-400 font-bold font-mono">+{targetPct}%</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={targetPct}
                onChange={(e) => setTargetPct(Math.max(1, +e.target.value))}
                className="w-full bg-black/60 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3 py-2.5 text-white font-medium text-sm outline-none transition-all pr-28 font-mono"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTargetPct(5)}
                  className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold font-mono transition-colors"
                >
                  5%
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPct(10)}
                  className="px-1.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold font-mono transition-colors"
                >
                  10%
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPct(15)}
                  className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold font-mono transition-colors"
                >
                  15%
                </button>
              </div>
            </div>
          </div>

          {/* Editable Stop Loss Limit */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Stop Loss Limit (%)
              </label>
              <span className="text-[10px] text-rose-400 font-bold font-mono">-{stopLossPct}%</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(Math.max(1, +e.target.value))}
                className="w-full bg-black/60 border border-zinc-700 focus:border-rose-500 rounded-lg px-3 py-2.5 text-white font-medium text-sm outline-none transition-all pr-28 font-mono"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStopLossPct(10)}
                  className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold font-mono transition-colors"
                >
                  10%
                </button>
                <button
                  type="button"
                  onClick={() => setStopLossPct(15)}
                  className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold font-mono transition-colors"
                >
                  15%
                </button>
                <button
                  type="button"
                  onClick={() => setStopLossPct(20)}
                  className="px-1.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-[10px] font-bold font-mono transition-colors"
                >
                  20%
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Lifecycle Explainer */}
        <div className="bg-black/40 border border-zinc-800/80 rounded-xl p-3.5 text-xs text-zinc-300 space-y-1">
          <div className="font-bold text-amber-400 flex items-center gap-1.5">
            <span>🛡️</span> Continuous Auto-Cycling Rules:
          </div>
          <p>
            1. Upon reaching your target of <strong>+{targetPct}%</strong>, the bot executes a market sell and locks in profit.
          </p>
          <p>
            2. It immediately resets to <strong>`SCANNING MARKET`</strong> and enters the next signal using the new grown budget.
          </p>
          <p>
            3. If price falls by <strong>-{stopLossPct}%</strong> or a sudden market dump occurs (&gt; 4% drop in 5 mins), the safety cutoff halts the trade.
          </p>
        </div>

        {/* Launch Button */}
        <button
          onClick={launchCompoundBot}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-500 hover:to-amber-500 text-black font-black text-sm rounded-xl shadow-xl shadow-orange-950/50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
        >
          {loading ? (
            <span>🚀 Initializing Auto-Compounding Bot...</span>
          ) : (
            <>
              <span>🔥</span>
              <span>Launch Auto-Compounding Bot (+{targetPct}% Target / -{stopLossPct}% SL) on {selectedPair}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

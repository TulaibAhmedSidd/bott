"use client";

import { useState } from "react";

export default function FastScalperTab({
  onSaved,
  availableUsdt = 0
}: {
  onSaved: () => void;
  availableUsdt?: number;
}) {
  const [selectedPair, setSelectedPair] = useState("BNB/USDT");
  const [tradeUSDT, setTradeUSDT] = useState(10);
  const [selectedPreset, setSelectedPreset] = useState<"SECONDS_MICRO_SCALPER" | "MICRO_DIP_HUNTER" | "MOMENTUM_BLITZ">("SECONDS_MICRO_SCALPER");
  const [circuitBreakerLosses, setCircuitBreakerLosses] = useState(3);
  const [maxDailyLossUSDT, setMaxDailyLossUSDT] = useState(2.0);
  const [loading, setLoading] = useState(false);

  const presets = {
    SECONDS_MICRO_SCALPER: {
      name: "Lightning Micro-Scalper",
      badge: "⚡ 5s - 30s Trade Cycle",
      desc: "Executes ultra-fast round-trip scalps on micro-price impulses. Targets fast +0.35% micro-gains with a tight -0.25% stop and fee-protection buffer.",
      targetPct: 0.35,
      stopLossPct: 0.25,
      speed: "Fastest (2s Loop)",
      features: [
        "Fee-Buffered Net Profit Target (+0.35%)",
        "Micro Trailing Stop (+0.25% activation)",
        "3-Loss Circuit Breaker (60s Cooldown)",
        "Spread Filter (< 0.05% Spread Gate)"
      ]
    },
    MICRO_DIP_HUNTER: {
      name: "Micro-Dip Hunter",
      badge: "🌊 Fast Dip Reversal",
      desc: "Captures instant 15-second oversold bounces off lower micro-bands. Enters on rapid tick dips and exits immediately upon snapback.",
      targetPct: 0.45,
      stopLossPct: 0.30,
      speed: "Fast (2s Loop)",
      features: [
        "Rapid Tick Oversold Bounce Trigger",
        "Instant +0.45% Snapback Exit",
        "Tight -0.30% Safety Cutoff",
        "Zero Falling-Knife Delay"
      ]
    },
    MOMENTUM_BLITZ: {
      name: "Momentum Blitz Scalper",
      badge: "🚀 Rapid Volume Surge",
      desc: "Rides explosive 1-minute volume surges. Enters on rapid consecutive price upticks and trails winners with dynamic micro-stops.",
      targetPct: 0.60,
      stopLossPct: 0.35,
      speed: "Adaptive (2s Loop)",
      features: [
        "3-Consecutive Uptick Momentum",
        "Dynamic Trailing Runner (+0.40% trigger)",
        "Volume Surge Confirmation",
        "Hard Circuit Breaker Protection"
      ]
    }
  };

  const activePreset = presets[selectedPreset];

  const launchFastBot = async () => {
    setLoading(true);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedPair,
          tradeUSDT: tradeUSDT,
          dailyTarget: activePreset.targetPct,
          stopLoss: activePreset.stopLossPct,
          strategy: selectedPreset,
          circuitBreakerLosses,
          maxDailyLossUSDT
        })
      });

      await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selectedPair })
      });

      onSaved();
    } catch (e) {
      console.error("Failed to launch seconds bot:", e);
      alert("Error launching fast scalper. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning & Speed Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-zinc-900 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-amber-950/20">
        <span className="text-2xl">⚡</span>
        <div className="text-xs text-zinc-300 space-y-1">
          <div className="font-bold text-amber-400 text-sm flex items-center gap-2">
            Ultra-Fast Seconds Strategy Mode
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-normal">
              Sub-Minute Execution
            </span>
          </div>
          <p>
            Trades execute within 5 to 60 seconds. All orders are protected by <strong>Round-Trip Fee Buffer (0.20%)</strong>, <strong>Spread Gate (&lt; 0.05%)</strong>, and an automated <strong>Circuit Breaker</strong> to prevent churn during choppy markets.
          </p>
        </div>
      </div>

      {/* Preset Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preset 1 */}
        <div
          onClick={() => setSelectedPreset("SECONDS_MICRO_SCALPER")}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all ${
            selectedPreset === "SECONDS_MICRO_SCALPER"
              ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2.5">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              ⚡ Ultra-Fast
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full">
              +0.35% TP / -0.25% SL
            </span>
          </div>
          <h4 className="text-base font-bold text-white mb-1.5">{presets.SECONDS_MICRO_SCALPER.name}</h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">{presets.SECONDS_MICRO_SCALPER.desc}</p>
          <div className="text-[11px] font-mono text-amber-400/90 font-semibold">{presets.SECONDS_MICRO_SCALPER.badge}</div>
        </div>

        {/* Preset 2 */}
        <div
          onClick={() => setSelectedPreset("MICRO_DIP_HUNTER")}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all ${
            selectedPreset === "MICRO_DIP_HUNTER"
              ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2.5">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              🌊 Dip Reversal
            </span>
            <span className="text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full">
              +0.45% TP / -0.30% SL
            </span>
          </div>
          <h4 className="text-base font-bold text-white mb-1.5">{presets.MICRO_DIP_HUNTER.name}</h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">{presets.MICRO_DIP_HUNTER.desc}</p>
          <div className="text-[11px] font-mono text-cyan-400/90 font-semibold">{presets.MICRO_DIP_HUNTER.badge}</div>
        </div>

        {/* Preset 3 */}
        <div
          onClick={() => setSelectedPreset("MOMENTUM_BLITZ")}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all ${
            selectedPreset === "MOMENTUM_BLITZ"
              ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2.5">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              🚀 Surge Runner
            </span>
            <span className="text-[10px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full">
              +0.60% TP / -0.35% SL
            </span>
          </div>
          <h4 className="text-base font-bold text-white mb-1.5">{presets.MOMENTUM_BLITZ.name}</h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">{presets.MOMENTUM_BLITZ.desc}</p>
          <div className="text-[11px] font-mono text-purple-400/90 font-semibold">{presets.MOMENTUM_BLITZ.badge}</div>
        </div>
      </div>

      {/* Configuration & Action Deck */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚡</span> {activePreset.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{activePreset.desc}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Execution Engine</span>
            <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-lg">
              {activePreset.speed}
            </div>
          </div>
        </div>

        {/* Safety Guardrails */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {activePreset.features.map((feat, i) => (
            <div key={i} className="bg-black/40 border border-zinc-800 rounded-lg p-2.5 sm:p-3 text-center">
              <div className="text-amber-400 text-xs font-bold mb-0.5">🛡️ Safety Gate</div>
              <div className="text-[11px] sm:text-xs font-medium text-zinc-300">{feat}</div>
            </div>
          ))}
        </div>

        {/* Configuration Inputs with Real Available Balance Prominence */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Trading Pair
            </label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="w-full bg-black/60 border border-zinc-700 focus:border-amber-500 rounded-lg px-3 py-2.5 text-white font-medium text-sm outline-none transition-all"
            >
              <option value="BNB/USDT">BNB / USDT</option>
              <option value="BTC/USDT">BTC / USDT</option>
              <option value="ETH/USDT">ETH / USDT</option>
              <option value="XRP/USDT">XRP / USDT</option>
              <option value="SOL/USDT">SOL / USDT</option>
              <option value="ADA/USDT">ADA / USDT</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Trade Size (USDT)
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
                className="w-full bg-black/60 border border-zinc-700 focus:border-amber-500 rounded-lg px-3 py-2.5 text-white font-medium text-sm outline-none transition-all pr-24 font-mono"
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
                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold font-mono transition-colors"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Micro Risk Rules
            </label>
            <div className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 flex items-center justify-between">
              <span>TP: +{activePreset.targetPct}%</span>
              <span>SL: -{activePreset.stopLossPct}%</span>
              <span>Circuit: 3 Losses</span>
            </div>
          </div>
        </div>

        {/* Action Launch Button */}
        <button
          onClick={launchFastBot}
          disabled={loading}
          className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-950/50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span>⚡ Launching High-Speed Scalper...</span>
          ) : (
            <>
              <span>⚡</span>
              <span>Launch {activePreset.name} ({selectedPair})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

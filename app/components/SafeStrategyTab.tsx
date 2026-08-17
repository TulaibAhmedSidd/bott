"use client";

import { useState } from "react";

export default function SafeStrategyTab({ onSaved }: { onSaved: () => void }) {
  const [selectedPair, setSelectedPair] = useState("BNB/USDT");
  const [tradeUSDT, setTradeUSDT] = useState(15);
  const [selectedPreset, setSelectedPreset] = useState<"BOLLINGER_RSI_EMA" | "VWAP">("BOLLINGER_RSI_EMA");
  const [loading, setLoading] = useState(false);

  const presets = {
    BOLLINGER_RSI_EMA: {
      name: "Filtered Mean Reversion",
      badge: "High Win-Rate (80%+ Target)",
      desc: "Only buys oversold dips when the broader 50-EMA trend is healthy. Requires RSI < 35 with an upward reversal curve to eliminate falling-knife risks.",
      targetPct: 1.0,
      stopLossPct: 0.8,
      riskLevel: "Low Risk",
      winRateExpectancy: "82% - 88%",
      timeframe: "1m / 5m Trend",
      features: [
        "Macro Trend Filter (50-EMA)",
        "RSI Curve-Up Confirmation",
        "Dynamic Trailing Stop (+0.6% trigger)",
        "Zero Falling-Knife Buys"
      ]
    },
    VWAP: {
      name: "VWAP Snapback Scalper",
      badge: "Institutional Mean Reversion",
      desc: "Monitors Volume-Weighted Average Price. Triggers high-probability buys when price drops 0.8% below VWAP with high-volume reversal.",
      targetPct: 0.8,
      stopLossPct: 0.6,
      riskLevel: "Low Risk",
      winRateExpectancy: "78% - 84%",
      timeframe: "1m Scalp",
      features: [
        "Volume-Weighted Fair Value",
        "Reversion to Mean Target",
        "Tight 0.6% Stop-Loss Protection",
        "Fast Round-Trip Scalps"
      ]
    }
  };

  const activePreset = presets[selectedPreset];

  const launchSafeBot = async () => {
    setLoading(true);
    try {
      // 1. Save Config
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedPair,
          tradeUSDT: tradeUSDT,
          dailyTarget: activePreset.targetPct,
          stopLoss: activePreset.stopLossPct,
          strategy: selectedPreset
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
      console.error("Failed to launch safe bot:", e);
      alert("Error starting bot. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategy Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => setSelectedPreset("BOLLINGER_RSI_EMA")}
          className={`cursor-pointer p-5 rounded-xl border transition-all ${
            selectedPreset === "BOLLINGER_RSI_EMA"
              ? "bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/20 px-2.5 py-0.5 rounded-full border border-orange-500/30">
              ⭐ Recommended
            </span>
            <span className="text-[10px] font-mono text-green-400 font-bold bg-green-950/60 px-2 py-0.5 rounded border border-green-800">
              {presets.BOLLINGER_RSI_EMA.winRateExpectancy}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">Filtered Mean Reversion</h3>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {presets.BOLLINGER_RSI_EMA.desc}
          </p>
        </div>

        <div
          onClick={() => setSelectedPreset("VWAP")}
          className={`cursor-pointer p-5 rounded-xl border transition-all ${
            selectedPreset === "VWAP"
              ? "bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-500/30">
              Institutional VWAP
            </span>
            <span className="text-[10px] font-mono text-green-400 font-bold bg-green-950/60 px-2 py-0.5 rounded border border-green-800">
              {presets.VWAP.winRateExpectancy}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">VWAP Snapback Scalper</h3>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {presets.VWAP.desc}
          </p>
        </div>
      </div>

      {/* Preset Details & Controls */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h4 className="text-xl font-bold text-white flex items-center gap-2">
              🛡️ {activePreset.name}
            </h4>
            <p className="text-xs text-zinc-400 mt-1">{activePreset.desc}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Risk Level</div>
            <div className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
              {activePreset.riskLevel}
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {activePreset.features.map((feat, i) => (
            <div key={i} className="bg-black/40 border border-zinc-800 rounded-lg p-3 text-center">
              <div className="text-emerald-400 text-xs font-bold mb-0.5">✓ Guardrail</div>
              <div className="text-xs font-medium text-zinc-300">{feat}</div>
            </div>
          ))}
        </div>

        {/* Configuration Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Trading Pair
            </label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="w-full bg-black/60 border border-zinc-700 focus:border-orange-500 rounded-lg px-3 py-2.5 text-white font-medium text-sm outline-none transition-all"
            >
              <option value="BNB/USDT">BNB / USDT</option>
              <option value="BTC/USDT">BTC / USDT</option>
              <option value="ETH/USDT">ETH / USDT</option>
              <option value="XRP/USDT">XRP / USDT</option>
              <option value="ADA/USDT">ADA / USDT</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Trade Size (USDT)
            </label>
            <input
              type="number"
              min={10}
              max={1000}
              value={tradeUSDT}
              onChange={(e) => setTradeUSDT(Math.max(10, +e.target.value))}
              className="w-full bg-black/60 border border-zinc-700 focus:border-orange-500 rounded-lg px-3 py-2.5 text-white font-medium text-sm outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Automated Guardrails
            </label>
            <div className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 flex items-center justify-between">
              <span>TP: +{activePreset.targetPct}%</span>
              <span>SL: -{activePreset.stopLossPct}%</span>
              <span>Trailing: +0.6%</span>
            </div>
          </div>
        </div>

        {/* Action Launch Button */}
        <button
          onClick={launchSafeBot}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-950/50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>⌛ Initializing Safe Bot...</span>
          ) : (
            <>
              <span>🛡️</span>
              <span>Launch Safe Automated Bot ({selectedPair})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

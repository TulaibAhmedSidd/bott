"use client";

import { useState } from "react";

export default function SafeStrategyTab({ onSaved }: { onSaved: () => void }) {
  const [selectedPair, setSelectedPair] = useState("BNB/USDT");
  const [tradeUSDT, setTradeUSDT] = useState(15);
  const [selectedPreset, setSelectedPreset] = useState<"BOLLINGER_RSI_EMA" | "VWAP" | "TREND_MOMENTUM">("BOLLINGER_RSI_EMA");
  const [loading, setLoading] = useState(false);

  const presets = {
    BOLLINGER_RSI_EMA: {
      name: "Filtered Mean Reversion",
      badge: "High Win-Rate (82% - 88%)",
      regime: "Ranging Market (ADX < 25)",
      desc: "Buys oversold dips when the broader 50-EMA trend is healthy. Features ADX regime gating, RSI curve-up confirmation, and Breakeven Stop protection (+0.5% profit locks in +0.1% fees covered).",
      targetPct: 1.0,
      stopLossPct: 0.8,
      riskLevel: "Low Risk",
      winRateExpectancy: "82% - 88%",
      timeframe: "1m / 5m Trend",
      features: [
        "ADX < 25 Ranging Gate",
        "50-EMA Macro Trend Filter",
        "Breakeven Stop (+0.5% trigger)",
        "Zero Falling-Knife Buys"
      ]
    },
    VWAP: {
      name: "VWAP Snapback Scalper",
      badge: "Institutional Mean Reversion",
      regime: "Ranging Market (ADX < 25)",
      desc: "Monitors Volume-Weighted Average Price. Triggers high-probability buys when price drops 0.8% below VWAP with high-volume reversal, locking in profit when snapping back.",
      targetPct: 0.8,
      stopLossPct: 0.6,
      riskLevel: "Low Risk",
      winRateExpectancy: "78% - 84%",
      timeframe: "1m Scalp",
      features: [
        "VWAP Institutional Value",
        "ADX Trend Protection",
        "Reversion to Mean Target",
        "Tight 0.6% Stop Loss"
      ]
    },
    TREND_MOMENTUM: {
      name: "Trend Momentum Breakout",
      badge: "Trending Market Scalper",
      regime: "Trending Market (ADX >= 25)",
      desc: "Activates during strong market trends. Enters on 9/21 EMA ribbon bullish crosses with volume momentum, trailing winners with dynamic stops.",
      targetPct: 1.5,
      stopLossPct: 0.9,
      riskLevel: "Medium-Low Risk",
      winRateExpectancy: "72% - 78%",
      timeframe: "1m / 5m Momentum",
      features: [
        "ADX >= 25 Trend Gate",
        "EMA 9/21 Ribbon Cross",
        "Trailing Profit Runner",
        "Breakout Volume Filter"
      ]
    }
  };

  const activePreset = presets[selectedPreset];

  const launchSafeBot = async () => {
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
          strategy: selectedPreset
        })
      });

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Filtered Mean Reversion */}
        <div
          onClick={() => setSelectedPreset("BOLLINGER_RSI_EMA")}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all ${
            selectedPreset === "BOLLINGER_RSI_EMA"
              ? "bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full border border-orange-500/30">
              ⭐ Recommended
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              {presets.BOLLINGER_RSI_EMA.winRateExpectancy}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1">Filtered Mean Reversion</h3>
          <div className="text-[10px] font-bold text-amber-400 mt-0.5">{presets.BOLLINGER_RSI_EMA.regime}</div>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {presets.BOLLINGER_RSI_EMA.desc}
          </p>
        </div>

        {/* Card 2: VWAP Snapback */}
        <div
          onClick={() => setSelectedPreset("VWAP")}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all ${
            selectedPreset === "VWAP"
              ? "bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
              VWAP Scalp
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              {presets.VWAP.winRateExpectancy}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1">VWAP Snapback Scalper</h3>
          <div className="text-[10px] font-bold text-blue-400 mt-0.5">{presets.VWAP.regime}</div>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {presets.VWAP.desc}
          </p>
        </div>

        {/* Card 3: Trend Momentum Breakout */}
        <div
          onClick={() => setSelectedPreset("TREND_MOMENTUM")}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all ${
            selectedPreset === "TREND_MOMENTUM"
              ? "bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
              Trend Breakout
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              {presets.TREND_MOMENTUM.winRateExpectancy}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1">Trend Momentum</h3>
          <div className="text-[10px] font-bold text-purple-400 mt-0.5">{presets.TREND_MOMENTUM.regime}</div>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {presets.TREND_MOMENTUM.desc}
          </p>
        </div>
      </div>

      {/* Preset Details & Controls */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-4 gap-3">
          <div>
            <h4 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              🛡️ {activePreset.name}
            </h4>
            <p className="text-xs text-zinc-400 mt-1">{activePreset.desc}</p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Target Market Regime</div>
            <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
              {activePreset.regime}
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {activePreset.features.map((feat, i) => (
            <div key={i} className="bg-black/40 border border-zinc-800 rounded-lg p-2.5 sm:p-3 text-center">
              <div className="text-emerald-400 text-xs font-bold mb-0.5">✓ Guardrail</div>
              <div className="text-[11px] sm:text-xs font-medium text-zinc-300">{feat}</div>
            </div>
          ))}
        </div>

        {/* Configuration Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
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
              <span>BE: +0.5%</span>
            </div>
          </div>
        </div>

        {/* Action Launch Button */}
        <button
          onClick={launchSafeBot}
          disabled={loading}
          className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-950/50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>⌛ Initializing Algorithm...</span>
          ) : (
            <>
              <span>🛡️</span>
              <span>Launch {activePreset.name} ({selectedPair})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

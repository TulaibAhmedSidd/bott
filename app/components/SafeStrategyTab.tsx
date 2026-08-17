"use client";

import { useState } from "react";

export default function SafeStrategyTab({
  onSaved,
  availableUsdt = 0
}: {
  onSaved: () => void;
  availableUsdt?: number;
}) {
  const [selectedPair, setSelectedPair] = useState("BNB/USDT");
  const [tradeUSDT, setTradeUSDT] = useState(10);
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
        {/* Card 1 */}
        <div
          onClick={() => setSelectedPreset("BOLLINGER_RSI_EMA")}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all ${
            selectedPreset === "BOLLINGER_RSI_EMA"
              ? "bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2.5">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
              {presets.BOLLINGER_RSI_EMA.riskLevel}
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
              {presets.BOLLINGER_RSI_EMA.winRateExpectancy}
            </span>
          </div>
          <h4 className="text-base font-bold text-white mb-1.5">{presets.BOLLINGER_RSI_EMA.name}</h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">{presets.BOLLINGER_RSI_EMA.desc}</p>
          <div className="text-[11px] font-mono text-zinc-500">{presets.BOLLINGER_RSI_EMA.timeframe}</div>
        </div>

        {/* Card 2 */}
        <div
          onClick={() => setSelectedPreset("VWAP")}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all ${
            selectedPreset === "VWAP"
              ? "bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2.5">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              {presets.VWAP.riskLevel}
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
              {presets.VWAP.winRateExpectancy}
            </span>
          </div>
          <h4 className="text-base font-bold text-white mb-1.5">{presets.VWAP.name}</h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">{presets.VWAP.desc}</p>
          <div className="text-[11px] font-mono text-zinc-500">{presets.VWAP.timeframe}</div>
        </div>

        {/* Card 3 */}
        <div
          onClick={() => setSelectedPreset("TREND_MOMENTUM")}
          className={`cursor-pointer p-4 sm:p-5 rounded-xl border transition-all ${
            selectedPreset === "TREND_MOMENTUM"
              ? "bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-950/30"
              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex justify-between items-start mb-2.5">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              {presets.TREND_MOMENTUM.riskLevel}
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
              {presets.TREND_MOMENTUM.winRateExpectancy}
            </span>
          </div>
          <h4 className="text-base font-bold text-white mb-1.5">{presets.TREND_MOMENTUM.name}</h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">{presets.TREND_MOMENTUM.desc}</p>
          <div className="text-[11px] font-mono text-zinc-500">{presets.TREND_MOMENTUM.timeframe}</div>
        </div>
      </div>

      {/* Configuration & Action Deck */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🛡️</span> {activePreset.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{activePreset.desc}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Market Regime Gate</span>
            <div className="text-xs font-mono font-bold text-orange-400 bg-orange-950/40 border border-orange-800/60 px-2.5 py-1 rounded-lg">
              {activePreset.regime}
            </div>
          </div>
        </div>

        {/* Feature Tags */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {activePreset.features.map((feat, i) => (
            <div key={i} className="bg-black/40 border border-zinc-800 rounded-lg p-2.5 sm:p-3 text-center">
              <div className="text-emerald-400 text-xs font-bold mb-0.5">✓ Feature</div>
              <div className="text-[11px] sm:text-xs font-medium text-zinc-300">{feat}</div>
            </div>
          ))}
        </div>

        {/* Configuration Inputs with Available USDT Bar */}
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

          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Risk Targets
            </label>
            <div className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 flex items-center justify-between">
              <span>Target: +{activePreset.targetPct}%</span>
              <span>Stop: -{activePreset.stopLossPct}%</span>
            </div>
          </div>
        </div>

        {/* Action Launch Button */}
        <button
          onClick={launchSafeBot}
          disabled={loading}
          className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span>🚀 Launching Protected Strategy...</span>
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

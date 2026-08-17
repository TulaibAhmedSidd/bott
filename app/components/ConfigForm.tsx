"use client";

import { useState } from "react";

const InputField = ({ label, value, onChange, type = "text", placeholder }: any) => (
    <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {label}
        </label>
        <input
            type={type}
            className="w-full bg-black/50 border border-zinc-700 focus:border-orange-500 rounded-lg px-3 py-2 text-white outline-none transition-all focus:ring-1 focus:ring-orange-500 font-mono text-sm"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    </div>
);

const SelectField = ({ label, value, onChange, options }: any) => (
    <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {label}
        </label>
        <select
            className="w-full bg-black/50 border border-zinc-700 focus:border-orange-500 rounded-lg px-3 py-2 text-white outline-none transition-all focus:ring-1 focus:ring-orange-500 appearance-none text-sm"
            value={value}
            onChange={onChange}
        >
            {options.map((opt: string) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
    </div>
);

export default function ConfigForm({
    onSaved,
    availableUsdt = 0
}: {
    onSaved: () => void;
    availableUsdt?: number;
}) {
    const [form, setForm] = useState({
        symbol: "BNB/USDT",
        tradeUSDT: 10,
        dailyTarget: 1,
        stopLoss: 0.5,
        strategy: "BOLLINGER_RSI_EMA",
    });

    const validate = () => {
        if (form.tradeUSDT < 10 || form.tradeUSDT > 1000) {
            alert("Trade Amount must be between 10 and 1000 USDT.");
            return false;
        }
        if (form.dailyTarget <= 0 || form.dailyTarget > 20) {
            alert("Daily Target must be between 0% and 20%.");
            return false;
        }
        if (form.stopLoss < 0 || form.stopLoss > 20) {
            alert("Stop Loss must be between 0% and 20%.");
            return false;
        }
        return true;
    }

    const start = async () => {
        if (!validate()) return;

        await fetch("/api/config", {
            method: "POST",
            body: JSON.stringify(form),
        });

        await fetch("/api/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: form.symbol })
        });

        onSaved();
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <SelectField
                    label="Trading Pair"
                    value={form.symbol}
                    onChange={(e: any) => setForm({ ...form, symbol: e.target.value })}
                    options={["BNB/USDT", "BTC/USDT", "ETH/USDT", "XRP/USDT", "SOL/USDT", "ADA/USDT"]}
                />
                <SelectField
                    label="Strategy"
                    value={form.strategy}
                    onChange={(e: any) => setForm({ ...form, strategy: e.target.value })}
                    options={["BOLLINGER_RSI_EMA", "VWAP", "RSI", "MACD", "BOLLINGER", "DAILY_PCT"]}
                />
            </div>

            <div>
                <div className="flex justify-between items-center mb-1">
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
                        max={1000}
                        value={form.tradeUSDT}
                        onChange={(e: any) => setForm({ ...form, tradeUSDT: Math.max(10, +e.target.value) })}
                        className="w-full bg-black/50 border border-zinc-700 focus:border-orange-500 rounded-lg px-3 py-2 text-white outline-none transition-all focus:ring-1 focus:ring-orange-500 font-mono text-sm pr-20"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, tradeUSDT: 10 })}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold font-mono transition-colors"
                        >
                            $10
                        </button>
                        {availableUsdt >= 10 && (
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, tradeUSDT: Math.floor(availableUsdt) })}
                                className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded text-[10px] font-bold font-mono transition-colors"
                            >
                                MAX
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <InputField
                    label="Take Profit Target (%)"
                    type="number"
                    value={form.dailyTarget}
                    onChange={(e: any) => setForm({ ...form, dailyTarget: +e.target.value })}
                />
                <InputField
                    label="Stop Loss Limit (%)"
                    type="number"
                    value={form.stopLoss}
                    onChange={(e: any) => setForm({ ...form, stopLoss: +e.target.value })}
                />
            </div>

            <button
                onClick={start}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-bold py-3 px-4 rounded-xl transition duration-200 mt-2 shadow-lg shadow-orange-950/40 cursor-pointer"
            >
                🚀 Save & Launch Custom Bot
            </button>
        </div>
    );
}

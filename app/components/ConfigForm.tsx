"use client";

import { useState } from "react";

// Helper components defined OUTSIDE the main component to prevent re-creation/remounting
const InputField = ({ label, value, onChange, type = "text", placeholder }: any) => (
    <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {label}
        </label>
        <input
            type={type}
            className="w-full bg-black/50 border border-zinc-700 focus:border-orange-500 rounded-lg px-3 py-2 text-white outline-none transition-all focus:ring-1 focus:ring-orange-500"
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
            className="w-full bg-black/50 border border-zinc-700 focus:border-orange-500 rounded-lg px-3 py-2 text-white outline-none transition-all focus:ring-1 focus:ring-orange-500 appearance-none"
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

export default function ConfigForm({ onSaved }: { onSaved: () => void }) {
    const [form, setForm] = useState({
        symbol: "BNB/USDT",
        tradeUSDT: 10,
        dailyTarget: 1,
        stopLoss: 0.5,
        strategy: "RSI",
    });

    const validate = () => {
        if (form.tradeUSDT <= 0 || form.dailyTarget <= 0 || form.stopLoss <= 0) {
            alert("Values must be positive numbers.");
            return false;
        }
        return true;
    }

    const save = async () => {
        if (!validate()) return;

        await fetch("/api/config", {
            method: "POST",
            body: JSON.stringify(form),
        });
        onSaved();
    };

    const start = async () => {
        if (!validate()) return;

        // 1. Save Config First (Ensure DB matches UI)
        await fetch("/api/config", {
            method: "POST",
            body: JSON.stringify(form),
        });

        // 2. Start Bot
        await fetch("/api/start", { method: "POST" });

        onSaved();
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <SelectField
                    label="Trading Pair"
                    value={form.symbol}
                    onChange={(e: any) => setForm({ ...form, symbol: e.target.value })}
                    options={["BNB/USDT", "BTC/USDT", "ETH/USDT", "XRP/USDT", "ADA/USDT"]}
                />
                <SelectField
                    label="Strategy"
                    value={form.strategy}
                    onChange={(e: any) => setForm({ ...form, strategy: e.target.value })}
                    options={["RSI", "MACD", "BOLLINGER"]}
                />
            </div>

            <InputField
                label="Trade Amount (USDT)"
                type="number"
                value={form.tradeUSDT}
                onChange={(e: any) => setForm({ ...form, tradeUSDT: +e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
                <InputField
                    label="Take Profit %"
                    type="number"
                    value={form.dailyTarget}
                    onChange={(e: any) => setForm({ ...form, dailyTarget: +e.target.value })}
                />

                <InputField
                    label="Stop Loss %"
                    type="number"
                    value={form.stopLoss}
                    onChange={(e: any) => setForm({ ...form, stopLoss: +e.target.value })}
                />
            </div>

            <div className="flex flex-col gap-3 pt-4">
                <button
                    onClick={save}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                    Save Configuration
                </button>

                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={start}
                        className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02]"
                    >
                        Start Bot ({form.symbol})
                    </button>
                </div>
            </div>
        </div>
    );
}

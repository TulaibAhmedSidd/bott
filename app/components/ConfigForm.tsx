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

    // Removed standalone save function button as requested
    // const save = async () => ...

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
                    options={["RSI", "MACD", "BOLLINGER", "DAILY_PCT"]}
                />
            </div>

            <InputField
                label="Trade Amount (USDT)"
                type="number"
                value={form.tradeUSDT}
                onChange={(e: any) => setForm({ ...form, tradeUSDT: +e.target.value })}
                placeholder="Min 10 - Max 1000"
            />

            <div className="grid grid-cols-2 gap-4">
                <InputField
                    label="Take Profit %"
                    type="number"
                    value={form.dailyTarget}
                    onChange={(e: any) => setForm({ ...form, dailyTarget: +e.target.value })}
                    placeholder="Max 20%"
                />

                <InputField
                    label="Stop Loss %"
                    type="number"
                    value={form.stopLoss}
                    onChange={(e: any) => setForm({ ...form, stopLoss: +e.target.value })}
                    placeholder="Max 20%"
                />
            </div>

            {form.strategy === 'DAILY_PCT' && (
                <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-lg space-y-2">
                    <div className="text-orange-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <span>🔁</span> Loop Settings
                    </div>
                    <InputField
                        label="Max Iterations (Loop Count)"
                        type="number"
                        value={(form as any).maxTrades || 0}
                        onChange={(e: any) => setForm({ ...form, maxTrades: +e.target.value } as any)}
                        placeholder="0 = Unlimited"
                    />
                    <div className="text-[10px] text-zinc-500">
                        Bot will buy immediately, sell at Target %, and repeat X times.
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 pt-4">
                {(/* Hidden Save Button */ null)}

                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={start}
                        className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>🚀</span> Start & Save Bot ({form.symbol})
                    </button>
                </div>
            </div>
        </div>
    );
}

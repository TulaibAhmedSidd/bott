"use client";

import { useEffect, useState } from "react";

type AssetBalance = {
  asset: string;
  free: number;
  used: number;
  total: number;
};

export default function WalletAssetsTab({ mode }: { mode: string }) {
  const [assets, setAssets] = useState<AssetBalance[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [freeUSDT, setFreeUSDT] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" }).then((r) => r.json());
      if (Array.isArray(res.assets)) {
        setAssets(res.assets);
        setTotalCount(res.totalAssetsCount || res.assets.length);
        setFreeUSDT(res.freeUSDT || 0);
      }
    } catch (e) {
      console.error("Failed to load wallet balances:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [mode]);

  const filteredAssets = assets.filter((a) =>
    a.asset.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              💼 Binance Spot Wallet Breakdown
            </h3>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                mode === "LIVE"
                  ? "bg-emerald-950 text-emerald-400 border-emerald-700"
                  : "bg-amber-950 text-amber-400 border-amber-700"
              }`}
            >
              {mode === "LIVE" ? "🟢 LIVE ACCOUNT" : "🟡 TESTNET ACCOUNT"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time balance breakdown of your authenticated Binance spot wallet coins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-black/60 border border-zinc-800 px-3 py-1.5 rounded-lg text-right">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Free USDT</div>
            <div className="text-sm font-mono font-bold text-emerald-400">
              ${freeUSDT.toFixed(4)} USDT
            </div>
          </div>

          <button
            onClick={fetchWallet}
            disabled={loading}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all border border-zinc-700 flex items-center gap-1.5 shrink-0"
          >
            <span>🔄</span> {loading ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex justify-between items-center gap-3">
        <input
          type="text"
          placeholder="🔍 Search coin (e.g. USDT, BNB, BTC, ETH)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-black/60 border border-zinc-700 focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none w-full sm:w-80 transition-all font-mono"
        />
        <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
          Showing {filteredAssets.length} of {totalCount} coins
        </span>
      </div>

      {/* Asset Cards Grid */}
      {loading && assets.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-10 text-center text-zinc-500 text-sm">
          ⏳ Fetching actual Binance spot balances...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-10 text-center text-zinc-500 text-sm italic">
          No matching coins found for &quot;{search}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredAssets.map((item, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border transition-all ${
                item.asset === "USDT" || item.asset === "BNB" || item.asset === "BTC" || item.asset === "ETH"
                  ? "bg-zinc-900 border-zinc-700 shadow-md ring-1 ring-zinc-800"
                  : "bg-zinc-950/80 border-zinc-850 hover:border-zinc-800"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-amber-400 border border-zinc-700">
                    {item.asset.slice(0, 3)}
                  </div>
                  <span className="font-bold text-white text-base">{item.asset}</span>
                </div>
                {item.asset === "USDT" && (
                  <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Primary Cash
                  </span>
                )}
              </div>

              <div className="space-y-1 mt-3 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Available:</span>
                  <span className="text-white font-bold">{item.free.toFixed(item.free < 1 ? 6 : 2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>In Orders:</span>
                  <span>{item.used.toFixed(item.used < 1 ? 6 : 2)}</span>
                </div>
                <div className="flex justify-between text-zinc-300 pt-1.5 border-t border-zinc-800/80 font-bold">
                  <span>Total Holding:</span>
                  <span className="text-amber-400">{item.total.toFixed(item.total < 1 ? 6 : 2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

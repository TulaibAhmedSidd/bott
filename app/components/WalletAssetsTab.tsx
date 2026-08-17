"use client";

import { useEffect, useState, useRef } from "react";

type AssetBalance = {
  asset: string;
  free: number;
  used: number;
  total: number;
  usdtValue?: number;
};

type AccountInfo = {
  accountType: string;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  makerCommission: string;
  takerCommission: string;
  apiKeyMasked: string;
};

export default function WalletAssetsTab({ mode }: { mode: string }) {
  const [assets, setAssets] = useState<AssetBalance[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [freeUSDT, setFreeUSDT] = useState(0);
  const [totalEstPortfolioUSDT, setTotalEstPortfolioUSDT] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const isFetchingRef = useRef(false);

  const fetchWallet = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch(`/api/wallet?mode=${mode}`, { cache: "no-store" }).then((r) => r.json());
      if (Array.isArray(res.assets)) {
        setAssets(res.assets);
        setTotalCount(res.totalAssetsCount || res.assets.length);
        setFreeUSDT(res.freeUSDT || 0);
        setTotalEstPortfolioUSDT(res.totalEstPortfolioUSDT || res.freeUSDT || 0);
        if (res.accountInfo) {
          setAccountInfo(res.accountInfo);
        }
      }
    } catch (e) {
      console.error("Failed to load wallet balances:", e);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
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
      {/* Account Verification & Identity Card */}
      {accountInfo && (
        <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-500/40 rounded-xl p-4 sm:p-5 shadow-lg shadow-blue-950/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="text-lg font-bold text-white">Verified Binance Account Identity</h3>
                <span
                  className={`text-[10px] border px-2 py-0.5 rounded-full font-mono font-bold ${
                    mode === "LIVE"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {mode === "LIVE" ? "🟢 Live Binance Mainnet" : "🟡 Testnet Sandbox"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cryptographically authenticated via Binance REST API.
              </p>
            </div>

            <div className="font-mono text-xs text-zinc-300 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800">
              Active Key: <span className="text-amber-400 font-bold">{accountInfo.apiKeyMasked}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="bg-black/40 border border-zinc-800/80 p-2.5 rounded-lg">
              <span className="text-[10px] text-zinc-500 block uppercase">Account Type</span>
              <span className="text-white font-bold">{accountInfo.accountType}</span>
            </div>
            <div className="bg-black/40 border border-zinc-800/80 p-2.5 rounded-lg">
              <span className="text-[10px] text-zinc-500 block uppercase">Trading Permission</span>
              <span className="text-emerald-400 font-bold">{accountInfo.canTrade ? "✓ Authorized (Active)" : "Disabled"}</span>
            </div>
            <div className="bg-black/40 border border-zinc-800/80 p-2.5 rounded-lg">
              <span className="text-[10px] text-zinc-500 block uppercase">Spot Fee Rate</span>
              <span className="text-zinc-200 font-bold">{accountInfo.takerCommission}</span>
            </div>
            <div className="bg-black/40 border border-zinc-800/80 p-2.5 rounded-lg">
              <span className="text-[10px] text-zinc-500 block uppercase">Verified Holdings</span>
              <span className="text-amber-400 font-bold">{totalCount} Coins</span>
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            💼 Binance Spot Wallet Breakdown
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time balance breakdown of all assets currently residing in your Binance wallet.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-black/60 border border-zinc-800 px-3 py-1.5 rounded-lg text-right">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Total Portfolio Est.</div>
            <div className="text-sm font-mono font-bold text-emerald-400">
              ${totalEstPortfolioUSDT.toFixed(2)} USDT
            </div>
          </div>

          <div className="bg-black/60 border border-zinc-800 px-3 py-1.5 rounded-lg text-right">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Free Cash</div>
            <div className="text-sm font-mono font-bold text-zinc-300">
              ${freeUSDT.toFixed(4)} USDT
            </div>
          </div>

          <button
            onClick={fetchWallet}
            disabled={loading}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all border border-zinc-700 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>🔄</span> {loading ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex justify-between items-center gap-3">
        <input
          type="text"
          placeholder="🔍 Search coin (e.g. USDT, BNB, BTC, ETH, SOL)..."
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
                item.asset === "USDT" || item.asset === "BNB" || item.asset === "BTC" || item.asset === "ETH" || item.asset === "SOL"
                  ? "bg-zinc-900 border-zinc-700 shadow-md ring-1 ring-zinc-800"
                  : "bg-zinc-950/80 border-zinc-850 hover:border-zinc-800"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-amber-400 border border-zinc-700">
                    {item.asset.slice(0, 3)}
                  </div>
                  <div>
                    <span className="font-bold text-white text-base block">{item.asset}</span>
                    {typeof item.usdtValue === 'number' && item.usdtValue > 0 && (
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        ≈ ${item.usdtValue.toFixed(2)} USDT
                      </span>
                    )}
                  </div>
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
                  <span className={item.used > 0 ? "text-amber-400 font-bold" : ""}>
                    {item.used.toFixed(item.used < 1 ? 6 : 2)}
                  </span>
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

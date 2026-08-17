'use client'

import { useEffect, useState, useRef } from 'react'
import ConfigForm from '@/app/components/ConfigForm'
import SafeStrategyTab from '@/app/components/SafeStrategyTab'
import FastScalperTab from '@/app/components/FastScalperTab'
import SignalsTab from '@/app/components/SignalsTab'
import WalletAssetsTab from '@/app/components/WalletAssetsTab'

type BotState = {
  symbol: string
  status: string
  entryPrice?: number
  exitPrice?: number
  lastPrice?: number
  realizedPnL?: number
  dailyPnL?: number
  balance?: number
  mode?: string
  isRunning?: boolean
  strategy?: string
  indicatorValue?: string
  quantity?: number
  tradeUSDT?: number
  targetPct?: number
  stopLossPct?: number
}

type Trade = {
  side: 'BUY' | 'SELL' | 'START' | 'STOP'
  price: number
  quantity: number
  pnl?: number
  createdAt: string
  entryPrice?: number
  reason?: string
  endedAt?: string
  strategy?: string
  symbol?: string
}

const getDuration = (start: string, end?: string) => {
  if (!end) return 'Active'
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

export default function Dashboard() {
  const [data, setData] = useState<{
    bots: BotState[]
    mode: string
    totalBalance: number
    freeUsdt?: number
    usedUsdt?: number
  } | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [activeTab, setActiveTab] = useState<'SIGNALS' | 'SAFE' | 'FAST' | 'WALLET' | 'CUSTOM' | 'BOTS' | 'TRADES'>('SIGNALS')
  const [currentMode, setCurrentMode] = useState<'TESTNET' | 'LIVE'>('TESTNET')
  const [switchingMode, setSwitchingMode] = useState(false)

  const isRefreshingRef = useRef(false)
  const currentModeRef = useRef(currentMode)
  currentModeRef.current = currentMode

  // Load saved preference on initial mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('algo_trading_mode') as 'TESTNET' | 'LIVE' | null
      if (savedMode === 'LIVE' || savedMode === 'TESTNET') {
        setCurrentMode(savedMode)
        currentModeRef.current = savedMode
      }
    } catch {}
  }, [])

  const refresh = async (explicitMode?: string) => {
    if (isRefreshingRef.current) return
    isRefreshingRef.current = true

    const targetMode = explicitMode || currentModeRef.current

    try {
      const [sRes, tRes] = await Promise.allSettled([
        fetch(`/api/status?mode=${targetMode}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/trades?mode=${targetMode}`, { cache: 'no-store' }).then((r) => r.json())
      ])

      if (sRes.status === 'fulfilled' && sRes.value) {
        // Only accept the response if it matches the current active targetMode to prevent race condition flips
        if (sRes.value.mode === currentModeRef.current) {
          setData(sRes.value)
        }
      }
      if (tRes.status === 'fulfilled' && Array.isArray(tRes.value)) {
        setTrades(tRes.value)
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e)
    } finally {
      isRefreshingRef.current = false
    }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(() => refresh(), 2500)
    return () => clearInterval(interval)
  }, [])

  const bots = data?.bots || []
  const mode = currentMode
  const totalBalance = typeof data?.totalBalance === 'number' ? data.totalBalance : 0
  const freeUsdt = typeof data?.freeUsdt === 'number' ? data.freeUsdt : totalBalance
  const usedUsdt = typeof data?.usedUsdt === 'number' ? data.usedUsdt : 0

  // Metrics computation
  const closedTrades = trades.filter((t) => t.side === 'SELL' && typeof t.pnl === 'number')
  const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0)
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
  const totalRealizedPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0)
  const activeBotsCount = bots.filter((b) => b.isRunning).length

  const handleModeSwitch = async () => {
    if (switchingMode) return
    const newMode = mode === 'TESTNET' ? 'LIVE' : 'TESTNET'
    if (!confirm(`Switch trading mode to ${newMode}?`)) return

    setSwitchingMode(true)
    setCurrentMode(newMode)
    currentModeRef.current = newMode
    try {
      localStorage.setItem('algo_trading_mode', newMode)
    } catch {}

    setData((prev) => (prev ? { ...prev, mode: newMode } : { bots: [], mode: newMode, totalBalance: 0 }))

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradingMode: newMode })
      })
      await refresh(newMode)
    } catch (e) {
      console.error('Failed to switch mode:', e)
    } finally {
      setSwitchingMode(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-200">
      {/* TOP HEADER */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          
          {/* BRAND */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-lg shadow-lg shadow-orange-950/40 shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 truncate">
                AlgoTrader Pro
                <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full shrink-0">
                  AI Signals & Quant Engine
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400 truncate">Binance Spot Confluence & Live Wallet Viewer</p>
            </div>
          </div>

          {/* BALANCE CARDS & MODE TOGGLE */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 flex-wrap">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 flex flex-col justify-center">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Total Portfolio</span>
              <span className="font-mono text-sm sm:text-base font-bold text-emerald-400">${totalBalance.toFixed(2)} USDT</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl px-3 py-1.5 flex flex-col justify-center hidden sm:flex">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Available Cash</span>
              <span className="font-mono text-sm font-bold text-zinc-300">${freeUsdt.toFixed(2)} USDT</span>
            </div>

            <button
              onClick={handleModeSwitch}
              disabled={switchingMode}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all hover:scale-105 border shrink-0 ${
                mode === 'TESTNET'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30 ring-1 ring-amber-500/20'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30 ring-1 ring-emerald-500/20'
              }`}
            >
              {switchingMode ? '⌛ SWITCHING...' : mode === 'TESTNET' ? '🟡 TESTNET' : '🟢 LIVE REAL'}
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD METRICS BAR */}
      <section className="bg-zinc-900/40 border-b border-zinc-800/60 py-3.5">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Net Realized PnL</div>
            <div className={`font-mono text-base sm:text-xl font-bold mt-0.5 truncate ${totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalRealizedPnL >= 0 ? '+' : ''}{totalRealizedPnL.toFixed(4)} USDT
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Win Rate Expectancy</div>
            <div className="font-mono text-base sm:text-xl font-bold text-white mt-0.5 truncate">
              {winRate.toFixed(1)}% <span className="text-[11px] text-zinc-500 font-normal">({winningTrades.length}/{closedTrades.length})</span>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Active Bots</div>
            <div className="font-mono text-base sm:text-xl font-bold text-amber-400 mt-0.5 truncate">
              {activeBotsCount} <span className="text-[11px] text-zinc-500 font-normal">Running</span>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Capital In Positions</div>
            <div className="font-mono text-base sm:text-xl font-bold text-blue-400 mt-0.5 truncate">
              ${usedUsdt.toFixed(2)} USDT
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* TABS CONTROLLER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="grid grid-cols-3 sm:flex bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800 gap-1 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('SIGNALS')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'SIGNALS'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-black shadow-md shadow-emerald-950/40 font-black'
                  : 'text-emerald-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span>🎯</span> <span className="truncate">Live Signals</span>
            </button>
            <button
              onClick={() => setActiveTab('WALLET')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'WALLET'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-950/40 font-black'
                  : 'text-blue-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span>💼</span> <span className="truncate">Binance Wallet</span>
            </button>
            <button
              onClick={() => setActiveTab('SAFE')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'SAFE'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span>🛡️</span> <span className="truncate">Safe Strategies</span>
            </button>
            <button
              onClick={() => setActiveTab('FAST')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'FAST'
                  ? 'bg-gradient-to-r from-amber-500 to-red-500 text-black shadow-md'
                  : 'text-amber-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span>⚡</span> <span className="truncate">Seconds Scalper</span>
            </button>
            <button
              onClick={() => setActiveTab('BOTS')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'BOTS'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span>🤖</span> <span className="truncate">Active Bots ({bots.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('CUSTOM')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'CUSTOM'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span>⚙️</span> <span className="truncate">Custom Config</span>
            </button>
            <button
              onClick={() => setActiveTab('TRADES')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'TRADES'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span>📜</span> <span className="truncate">Trade Ledger ({trades.length})</span>
            </button>
          </div>

          {/* DANGER PURGE CONTROLS */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={async () => {
                if (confirm('🚨 STOP ALL BOTS? This will immediately stop background trading tasks.')) {
                  await fetch('/api/clear-bots', { method: 'POST' })
                  refresh()
                }
              }}
              className="px-2.5 py-1.5 rounded-lg border border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/40 text-[11px] font-bold transition-colors"
            >
              🛑 Stop All Bots
            </button>
            <button
              onClick={async () => {
                if (confirm('Clear all recorded trade logs from history?')) {
                  await fetch('/api/clear', { method: 'POST' })
                  refresh()
                }
              }}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-rose-400 text-[11px] font-bold transition-colors"
            >
              🗑️ Clear Ledger
            </button>
          </div>
        </div>

        {/* TAB PANELS */}

        {/* TAB 0: LIVE AI & QUANT SIGNALS RADAR */}
        {activeTab === 'SIGNALS' && (
          <SignalsTab onExecute={() => { refresh(); setActiveTab('BOTS'); }} />
        )}

        {/* TAB 1: BINANCE WALLET ASSETS BREAKDOWN */}
        {activeTab === 'WALLET' && (
          <WalletAssetsTab mode={mode} />
        )}

        {/* TAB 2: SAFE STRATEGY */}
        {activeTab === 'SAFE' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5 flex items-start gap-2.5">
              <span className="text-lg">💡</span>
              <div className="text-xs text-zinc-300">
                <span className="font-bold text-orange-400">Professional Safe Strategy Rules:</span> Every trade uses 50-EMA macro trend filters, RSI curve-up reversal triggers, LOT_SIZE precision formatting, 0.1% Binance fee deduction, and dynamic trailing stops (+0.6% activation) to protect capital.
              </div>
            </div>
            <SafeStrategyTab availableUsdt={freeUsdt} onSaved={() => { refresh(); setActiveTab('BOTS'); }} />
          </div>
        )}

        {/* TAB 3: SECONDS SCALPER */}
        {activeTab === 'FAST' && (
          <div className="space-y-6">
            <FastScalperTab availableUsdt={freeUsdt} onSaved={() => { refresh(); setActiveTab('BOTS'); }} />
          </div>
        )}

        {/* TAB 4: CUSTOM CONFIG */}
        {activeTab === 'CUSTOM' && (
          <div className="max-w-2xl mx-auto bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🚀</span> Configure Custom Bot
            </h2>
            <ConfigForm availableUsdt={freeUsdt} onSaved={() => { refresh(); setActiveTab('BOTS'); }} />
          </div>
        )}

        {/* TAB 5: ACTIVE BOTS */}
        {activeTab === 'BOTS' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>⚡</span> Active Bot Instances ({bots.length})
            </h2>

            {bots.length === 0 ? (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-10 text-center text-zinc-500 text-sm">
                No active bot loops running. Select <button onClick={() => setActiveTab('SIGNALS')} className="text-emerald-400 font-bold underline">Live Signals</button>, <button onClick={() => setActiveTab('SAFE')} className="text-orange-400 font-bold underline">Safe Strategies</button>, or <button onClick={() => setActiveTab('WALLET')} className="text-blue-400 font-bold underline">Binance Wallet</button> to get started!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {bots.map((bot, i) => {
                  const tradeUSDT = bot.tradeUSDT || 10
                  const targetPct = bot.targetPct || 1.0
                  const stopLossPct = bot.stopLossPct || 0.5
                  const lastPrice = bot.lastPrice || 0
                  const entryPrice = bot.entryPrice || 0
                  const targetPrice = entryPrice > 0 ? entryPrice * (1 + targetPct / 100) : (lastPrice > 0 ? lastPrice * (1 + targetPct / 100) : 0)
                  const stopLossPrice = entryPrice > 0 ? entryPrice * (1 - stopLossPct / 100) : (lastPrice > 0 ? lastPrice * (1 - stopLossPct / 100) : 0)
                  const isHolding = bot.status === 'HOLDING'
                  const isIdle = bot.status === 'IDLE'

                  return (
                    <div
                      key={i}
                      className={`p-4 sm:p-5 rounded-xl border transition-all ${
                        bot.isRunning
                          ? 'bg-zinc-900/90 border-zinc-800 shadow-xl shadow-black/60 ring-1 ring-zinc-800'
                          : 'bg-zinc-950 border-zinc-900 opacity-60'
                      }`}
                    >
                      {/* CARD HEADER */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-2xl font-black text-white flex items-center gap-2">
                            {bot.symbol}
                            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              ${tradeUSDT.toFixed(2)} USDT / Trade
                            </span>
                          </div>
                          <div
                            className={`text-xs font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5 ${
                              isHolding
                                ? 'text-emerald-400'
                                : bot.status === 'BUYING'
                                ? 'text-blue-400'
                                : bot.status === 'SELLING'
                                ? 'text-amber-400'
                                : 'text-zinc-400'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isHolding ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {isHolding ? '🚀 POSITION ACTIVE (HOLDING)' : isIdle ? '🟢 SCANNING MARKET (IDLE)' : bot.status}
                          </div>
                        </div>

                        {bot.isRunning && (
                          <button
                            onClick={async () => {
                              if (confirm(`Stop automated loop for ${bot.symbol}?`)) {
                                await fetch('/api/stop', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ symbol: bot.symbol })
                                })
                                refresh()
                              }
                            }}
                            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition-colors"
                          >
                            STOP
                          </button>
                        )}
                      </div>

                      {/* EXPLANATION BANNER */}
                      {isIdle && bot.isRunning && (
                        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-2.5 my-2.5 text-[11px] text-zinc-400 space-y-1">
                          <div className="text-amber-400 font-bold flex items-center gap-1">
                            <span>🔍</span> Market Scanning Active
                          </div>
                          <div>
                            Allocated Trade Size: <span className="font-bold text-white">${tradeUSDT.toFixed(2)} USDT</span>. USDT balance will decrease when strategy triggers a BUY order.
                          </div>
                          {freeUsdt < tradeUSDT && (
                            <div className="text-amber-300 text-[10px] bg-amber-950/40 p-1 rounded border border-amber-800/40 mt-1">
                              ⚠️ Wallet USDT (${freeUsdt.toFixed(2)}) is less than trade size (${tradeUSDT.toFixed(2)}). Fund wallet before buy order fires.
                            </div>
                          )}
                        </div>
                      )}

                      {/* LIVE INVESTMENT & TARGET METRICS GRID */}
                      <div className="bg-black/60 border border-zinc-800 rounded-lg p-3 my-3 text-xs space-y-2 font-mono">
                        <div className="flex justify-between items-center text-zinc-400 pb-1.5 border-b border-zinc-800/60">
                          <span>Strategy:</span>
                          <span className="text-orange-400 font-bold">{bot.strategy || 'BOLLINGER_RSI_EMA'}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-zinc-500 block">Take Profit Target</span>
                            <span className="text-emerald-400 font-bold">+{targetPct}% (${targetPrice.toFixed(2)})</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Stop Loss Limit</span>
                            <span className="text-rose-400 font-bold">-{stopLossPct}% (${stopLossPrice.toFixed(2)})</span>
                          </div>
                        </div>

                        {/* SIGNAL INDICATOR READOUT */}
                        {isIdle && (
                          <div className="pt-1 border-t border-zinc-800/60">
                            <div className="text-zinc-500 text-[10px] uppercase font-bold">Live Indicator Readout</div>
                            <div className="text-zinc-200 text-xs mt-0.5 text-ellipsis overflow-hidden">
                              {bot.indicatorValue || 'Calculating live indicators...'}
                            </div>
                          </div>
                        )}

                        {/* OPEN POSITION LIVE DETAILS */}
                        {isHolding && entryPrice > 0 && bot.quantity && (
                          <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                            <div className="text-emerald-400 font-bold text-[11px] uppercase tracking-wider flex items-center justify-between">
                              <span>Open Position Math</span>
                              <span>{bot.quantity.toFixed(4)} Coins</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-zinc-500 block">Invested Entry</span>
                                <span className="text-white font-bold">${entryPrice.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block">Current Price</span>
                                <span className="text-white font-bold">${lastPrice.toFixed(2)}</span>
                              </div>
                            </div>

                            <div className="bg-zinc-900 p-2 rounded border border-zinc-800 flex justify-between items-center text-xs">
                              <span className="text-zinc-400">Unrealized PnL:</span>
                              <span
                                className={`font-bold ${
                                  lastPrice >= entryPrice ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {((lastPrice - entryPrice) * bot.quantity).toFixed(4)} USDT (
                                {(((lastPrice - entryPrice) / entryPrice) * 100).toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* STATS FOOTER */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                          <div className="text-zinc-500 text-[10px]">Realized PnL</div>
                          <div className={`font-bold ${ (bot.realizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(bot.realizedPnL || 0).toFixed(4)} USDT
                          </div>
                        </div>
                        <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                          <div className="text-zinc-500 text-[10px]">Market Price</div>
                          <div className="text-zinc-200 font-bold">${lastPrice.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* MANUAL SELL BUTTON */}
                      <button
                        disabled={!isHolding}
                        onClick={async () => {
                          if (confirm(`Execute immediate market sell for ${bot.symbol}?`)) {
                            await fetch('/api/sell', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ symbol: bot.symbol })
                            })
                            refresh()
                          }
                        }}
                        className={`mt-4 w-full py-2 rounded-lg text-xs font-bold transition-all border ${
                          isHolding
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-orange-500/30 cursor-pointer shadow-md'
                            : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {isHolding ? '🚨 IMMEDIATE MARKET SELL' : 'NO ACTIVE POSITION TO SELL'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: TRADE LEDGER */}
        {activeTab === 'TRADES' && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xl overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-4">Trade Ledger & Audit Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-950/60">
                  <tr>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3">Strategy</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Entry</th>
                    <th className="py-2.5 px-3 text-right">Exit</th>
                    <th className="py-2.5 px-3 text-right">PnL</th>
                    <th className="py-2.5 px-3 text-center">Reason</th>
                    <th className="py-2.5 px-3 text-right">Duration</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {trades.map((t, i) => {
                    if (t.side === 'START' || t.side === 'STOP') {
                      return (
                        <tr key={i} className="bg-zinc-950/40">
                          <td colSpan={10} className="py-2 px-4 text-[11px] text-center text-zinc-500 font-sans uppercase tracking-wider">
                            --- {t.side === 'START' ? '🚀 BOT STARTED' : '🛑 BOT STOPPED'} [{t.symbol}] ({t.strategy}) ---
                            <span className="ml-3 opacity-50">{new Date(t.createdAt).toLocaleTimeString()}</span>
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">{t.symbol || '-'}</td>
                        <td className={`py-2.5 px-3 font-bold ${t.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.side}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400">{t.strategy || '-'}</td>
                        <td className="py-2.5 px-3 text-right text-zinc-300">{t.quantity?.toFixed(4) || '-'}</td>
                        <td className="py-2.5 px-3 text-right text-zinc-300">
                          {t.entryPrice ? `$${t.entryPrice.toFixed(2)}` : t.side === 'BUY' ? `$${t.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-300">
                          {t.side === 'SELL' ? `$${t.price.toFixed(2)}` : '-'}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            t.pnl && t.pnl > 0 ? 'text-emerald-400' : t.pnl && t.pnl < 0 ? 'text-rose-400' : 'text-zinc-500'
                          }`}
                        >
                          {t.pnl ? `${t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(4)} USDT` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase ${
                              t.reason === 'TARGET'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : t.reason === 'TRAILING_STOP'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : t.reason === 'BREAKEVEN_STOP'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : t.reason === 'STOP_LOSS'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {t.reason || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-400 text-[11px]">
                          {t.side === 'SELL' ? getDuration(t.createdAt, t.endedAt) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-400 text-[11px]">
                          {new Date(t.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    )
                  })}
                  {trades.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-zinc-500 italic">
                        No trade history recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

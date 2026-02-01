// 'use client'
// import { useState } from 'react'

// export default function Page() {
//   const [form, setForm] = useState({
//     symbol: 'BNB/USDT',
//     dailyTarget: 1,
//     stopLoss: 0.5,
//     tradeUSDT: 10
//   })

//   const update = async () => {
//     await fetch('/api/config', {
//       method: 'POST',
//       body: JSON.stringify(form)
//     })
//   }

//   return (
//     <div className="min-h-screen bg-black text-white flex items-center justify-center">
//       <div className="w-full max-w-md bg-zinc-900 p-6 rounded-xl shadow-lg space-y-4">
//         <h1 className="text-2xl font-bold text-orange-500">
//           Crypto Trading Bot
//         </h1>

//         <input
//           className="w-full bg-black border border-zinc-700 rounded px-3 py-2"
//           value={form.symbol}
//           onChange={e => setForm({ ...form, symbol: e.target.value })}
//           placeholder="Symbol (BNB/USDT)"
//         />

//         <input
//           type="number"
//           className="w-full bg-black border border-zinc-700 rounded px-3 py-2"
//           value={form.dailyTarget}
//           onChange={e => setForm({ ...form, dailyTarget: +e.target.value })}
//           placeholder="Daily Target %"
//         />

//         <input
//           type="number"
//           className="w-full bg-black border border-zinc-700 rounded px-3 py-2"
//           value={form.stopLoss}
//           onChange={e => setForm({ ...form, stopLoss: +e.target.value })}
//           placeholder="Stop Loss %"
//         />

//         <input
//           type="number"
//           className="w-full bg-black border border-zinc-700 rounded px-3 py-2"
//           value={form.tradeUSDT}
//           onChange={e => setForm({ ...form, tradeUSDT: +e.target.value })}
//           placeholder="USDT per trade"
//         />

//         <button
//           onClick={update}
//           className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold py-2 rounded"
//         >
//           Save Config
//         </button>

//         <div className="flex gap-3">
//           <button
//             onClick={() => fetch('/api/start', { method: 'POST' })}
//             className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded"
//           >
//             Start
//           </button>

//           <button
//             onClick={() => fetch('/api/stop', { method: 'POST' })}
//             className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded"
//           >
//             Stop
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }




'use client'

import { useEffect, useState } from 'react'
import ConfigForm from '@/app/components/ConfigForm'

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
}

type Trade = {
  side: 'BUY' | 'SELL'
  price: number
  quantity: number
  pnl?: number
  createdAt: string
  entryPrice?: number
  reason?: string
  endedAt?: string
  strategy?: string
}

// Helper to get duration
const getDuration = (start: string, end?: string) => {
  if (!end) return 'Active'
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

export default function Dashboard() {
  const [data, setData] = useState<{ bots: BotState[], mode: string } | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])

  const refresh = async () => {
    try {
      const s = await fetch('/api/status').then(r => r.json())
      const t = await fetch('/api/trades').then(r => r.json())
      setData(s)
      setTrades(t)
    } catch (e) {
      console.error("Failed to fetch data", e)
    }
  }

  useEffect(() => {
    refresh()
    const i = setInterval(refresh, 1500)
    return () => clearInterval(i)
  }, [])

  const bots = data?.bots || []
  const mode = data?.mode || ''

  // If no bots are active or returned, show configuration to start one
  // API promises to return at least a default IDLE bot if none found.

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
              🤖 AlgoTrader Pro
            </h1>
            {mode && (
              <button
                onClick={async () => {
                  const newMode = mode === 'TESTNET' ? 'LIVE' : 'TESTNET'
                  if (confirm(`Switch to ${newMode} mode? This will update your configuration.`)) {
                    await fetch('/api/config', {
                      method: 'POST',
                      body: JSON.stringify({ tradingMode: newMode })
                    })
                    refresh()
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg transition-all hover:scale-105 ${mode === 'TESTNET'
                  ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/30'
                  : 'bg-green-500/20 text-green-500 border border-green-500/30 hover:bg-green-500/30'
                  }`}
              >
                {mode === 'TESTNET' ? 'TESTNET MODE' : 'LIVE MODE'}
              </button>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={async () => {
                if (confirm("⚠️ Are you sure you want to clear ALL trade history and reset stats? This cannot be undone.")) {
                  await fetch('/api/clear', { method: 'POST' });
                  refresh();
                }
              }}
              className="text-xs font-bold text-zinc-500 hover:text-red-500 bg-zinc-900 border border-zinc-800 hover:border-red-900 px-3 py-2 rounded-lg transition-colors"
            >
              🗑️ CLEAR HISTORY
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* LEFT COLUMN: CONFIG & ACTIVE BOTS */}
          <div className="xl:col-span-1 space-y-6">

            {/* START NEW BOT CONFIG */}
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>🚀</span> Start New Bot
              </h2>
              <ConfigForm onSaved={refresh} />
            </div>

            {/* ACTIVE BOTS LIST */}
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>⚡</span> Active Bots ({bots.length})
              </h2>

              <div className="space-y-4">
                {bots.map((bot, i) => (
                  <div key={i} className={`relative p-4 rounded-lg border transition-all ${bot.isRunning ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-900 border-zinc-800 opacity-60'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-lg font-bold text-white">{bot.symbol}</div>
                        <div className={`text-xs font-bold uppercase tracking-wider ${bot.status === 'BUYING' ? 'text-blue-400' :
                          bot.status === 'HOLDING' ? 'text-green-400' :
                            bot.status === 'SELLING' ? 'text-red-400' :
                              bot.status === 'STOPPED' ? 'text-red-600' : 'text-zinc-500'
                          }`}>{bot.status} {bot.isRunning && bot.status === 'IDLE' && '(Running)'}</div>

                        <div className="flex flex-col gap-1 mt-1">
                          <div className="text-[10px] text-zinc-600 bg-zinc-900/50 px-1 rounded border border-zinc-800 inline-block w-fit">
                            Strategy: {bot.strategy || 'RSI'}
                          </div>
                          {bot.status === 'IDLE' && bot.isRunning && (
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {bot.indicatorValue ? `signal: ${bot.indicatorValue}` : 'Calculating...'}
                            </div>
                          )}
                        </div>
                      </div>
                      {bot.isRunning && (
                        <button
                          onClick={async () => {
                            if (confirm(`Stop bot for ${bot.symbol}?`)) {
                              await fetch('/api/stop', { method: 'POST', body: JSON.stringify({ symbol: bot.symbol }) }) // Note: api/stop needs to support symbol payload if not already
                              refresh()
                            }
                          }}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold transition-colors"
                        >
                          STOP
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-zinc-500 text-xs">PnL (Realized)</div>
                        <div className={`font-mono font-bold ${(bot.realizedPnL || 0) > 0 ? 'text-green-400' : (bot.realizedPnL || 0) < 0 ? 'text-red-400' : 'text-zinc-300'}`}>
                          {bot.realizedPnL?.toFixed(2) ?? '0.00'} USDT
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500 text-xs">Balance</div>
                        <div className="font-mono text-zinc-300">{bot.balance?.toFixed(2) ?? '-'}</div>
                      </div>
                      {bot.entryPrice && (
                        <>
                          <div>
                            <div className="text-zinc-500 text-xs">Entry</div>
                            <div className="font-mono text-zinc-300">{bot.entryPrice.toFixed(4)}</div>
                          </div>
                          <div>
                            <div className="text-zinc-500 text-xs">Current</div>
                            <div className="font-mono text-zinc-300">{bot.lastPrice?.toFixed(4) ?? '-'}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* MANUAL SELL ACTIONS */}

                    <button
                      disabled={bot.status !== 'HOLDING'}
                      onClick={async () => {
                        if (bot.status !== 'HOLDING') return;
                        if (confirm(`Sell position for ${bot.symbol}?`)) {
                          await fetch('/api/sell', {
                            method: 'POST',
                            body: JSON.stringify({ symbol: bot.symbol }),
                          })
                          refresh()
                        }
                      }}
                      className={`mt-3 w-full py-1.5 rounded text-xs font-bold transition-colors border ${bot.status === 'HOLDING'
                        ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/30 cursor-pointer'
                        : 'bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed opacity-50'
                        }`}
                    >
                      {bot.status === 'HOLDING' ? '🚨 MANUAL SELL' : 'NO POSITION TO SELL'}
                    </button>
                  </div>
                ))}

                {bots.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 italic">No bots found. Start one above!</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: TRADES */}
          <div className="xl:col-span-2">
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6 shadow-xl overflow-hidden h-full">
              <h2 className="text-xl font-bold text-white mb-4">Trade History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-zinc-500 border-b border-zinc-800">
                    <tr>
                      <th className="text-left pb-3 font-medium px-2">Symbol</th>
                      <th className="text-left pb-3 font-medium">Type</th>
                      <th className="text-left pb-3 font-medium">Strategy</th>
                      <th className="text-right pb-3 font-medium">Qty</th>
                      <th className="text-right pb-3 font-medium">Entry</th>
                      <th className="text-right pb-3 font-medium">Exit</th>
                      <th className="text-right pb-3 font-medium">PnL</th>
                      <th className="text-center pb-3 font-medium">Reason</th>
                      <th className="text-right pb-3 font-medium">Duration</th>
                      <th className="text-right pb-3 font-medium px-2">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {trades.map((t: any, i) => {
                      if (t.side === 'START' || t.side === 'STOP') {
                        return (
                          <tr key={i} className="bg-white/5 border-b border-zinc-800/50">
                            <td colSpan={10} className="py-2 px-4 text-xs font-mono text-center text-zinc-500 uppercase tracking-widest">
                              --- {t.side === 'START' ? '🚀 BOT STARTED' : '🛑 BOT STOPPED'} [{t.symbol}] ({t.strategy}) ---
                              <span className="ml-2 opacity-50">{new Date(t.createdAt).toLocaleTimeString()}</span>
                            </td>
                          </tr>
                        )
                      }
                      return (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                          <td className="py-3 px-2 font-bold text-zinc-300">{(t as any).symbol || '-'}</td>
                          <td className={`py-3 font-mono font-bold ${t.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                            {t.side}
                          </td>
                          <td className="py-3 text-zinc-500 text-xs">{t.strategy || '-'}</td>
                          <td className="text-right py-3 text-zinc-400">{t.quantity?.toFixed(4) ?? '-'}</td>
                          <td className="text-right py-3 text-zinc-300">
                            {t.entryPrice ? t.entryPrice.toFixed(4) : (t.side === 'BUY' ? t.price.toFixed(4) : '-')}
                          </td>
                          <td className="text-right py-3 text-zinc-300">
                            {t.side === 'SELL' ? t.price?.toFixed(4) : '-'}
                          </td>
                          <td className={`text-right py-3 font-bold ${t.pnl && t.pnl > 0 ? 'text-green-400' : t.pnl && t.pnl < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                            {t.pnl ? t.pnl.toFixed(2) : '-'}
                          </td>
                          <td className="text-center py-3">
                            <span className={`px-2 py-0.5 rounded text-xs border ${t.reason === 'TARGET' ? 'bg-green-900/20 border-green-900/50 text-green-400' :
                              t.reason === 'STOP_LOSS' ? 'bg-red-900/20 border-red-900/50 text-red-400' :
                                t.reason === 'MANUAL' ? 'bg-blue-900/20 border-blue-900/50 text-blue-400' : 'border-transparent text-zinc-500'
                              }`}>
                              {t.reason || '-'}
                            </span>
                          </td>
                          <td className="text-right py-3 text-zinc-500 text-xs font-mono">
                            {t.side === 'SELL' ? getDuration(t.createdAt, t.endedAt) : '-'}
                          </td>
                          <td className="text-right py-3 px-2 text-zinc-500 text-xs">
                            {new Date(t.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      )
                    })}
                    {trades.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-12 text-zinc-600 italic">
                          No trades recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



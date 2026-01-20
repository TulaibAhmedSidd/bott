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

type BotState = {
  symbol: string
  status: string
  entryPrice?: number
  exitPrice?: number
  lastPrice?: number
  realizedPnL?: number
  dailyPnL?: number
}

type Trade = {
  side: 'BUY' | 'SELL'
  price: number
  quantity: number
  pnl?: number
  createdAt: string
  entryPrice?: number
}

export default function Dashboard() {
  const [state, setState] = useState<BotState | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])

  const refresh = async () => {
    const s = await fetch('/api/status').then(r => r.json())
    const t = await fetch('/api/trades').then(r => r.json())
    setState(s)
    setTrades(t)
  }

  useEffect(() => {
    refresh()
    const i = setInterval(refresh, 1500)
    return () => clearInterval(i)
  }, [])

  console.log('state', state)

  if (state?.symbol === 'NOT_SET') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-zinc-900 p-6 rounded-xl text-center">
          <p className="mb-4 text-zinc-400">
            Bot not configured yet
          </p>
          <p className="text-orange-400">
            Please select a coin and start the bot
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold text-orange-500 mb-6">
        Trading Bot Dashboard
      </h1>

      {/* STATUS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card title="Symbol" value={state?.symbol} />
        <Card title="Status" value={state?.status} />
        <Card title="Entry Price" value={state?.entryPrice?.toFixed(4) ?? '-'} />
        <Card title="Current Price" value={state?.lastPrice?.toFixed(4) ?? '-'} />
        <Card title="Daily PnL" value={`${state?.dailyPnL?.toFixed(2)} USDT`} />
        <Card title="Total PnL" value={`${state?.realizedPnL?.toFixed(2)} USDT`} />
      </div>

      {/* TRADES */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h2 className="text-xl mb-3 text-orange-400">Trades</h2>
        <ConfigForm onSaved={async () => {
          refresh()
        }} />
        <button
          onClick={async () => {
            await fetch('/api/sell', {
              method: 'POST',
              body: JSON.stringify({ symbol: state?.symbol }),
            })
            refresh()
          }}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Manual Sell
        </button>

        <table className="w-full text-sm">
          <thead className="text-zinc-400">
            <tr>
              <th className="text-left">Side</th>
              <th className="text-left">Price</th>
              <th className="text-left">Entry</th>
              <th className="text-left">Qty</th>
              <th className="text-left">PnL</th>
              <th className="text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={i} className="border-t border-zinc-800">
                <td className={t.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                  {t.side}
                </td>
                <td>{t.price.toFixed(4)}</td>
                <td>
                  {t.entryPrice ? t.entryPrice.toFixed(4) : '-'}
                </td>
                <td>{t.quantity.toFixed(4)}</td>
                <td>{t.pnl ? t.pnl.toFixed(2) : '-'}</td>
                <td>{new Date(t.createdAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConfigForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({
    symbol: "BNB/USDT",
    tradeUSDT: 10,
    dailyTarget: 1,
    stopLoss: 0.5,
  });

  const save = async () => {
    await fetch("/api/config", {
      method: "POST",
      body: JSON.stringify(form),
    });
    onSaved();
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-4 mb-6">
      <h2 className="text-orange-400 mb-3 text-lg">Bot Configuration</h2>

      <div className="grid grid-cols-2 gap-3">
        <input
          className="bg-black border border-zinc-700 p-2 rounded"
          value={form.symbol}
          onChange={e => setForm({ ...form, symbol: e.target.value })}
          placeholder="Symbol (BNB/USDT)"
        />

        <input
          type="number"
          className="bg-black border border-zinc-700 p-2 rounded"
          value={form.tradeUSDT}
          onChange={e => setForm({ ...form, tradeUSDT: +e.target.value })}
          placeholder="USDT Amount"
        />

        <input
          type="number"
          className="bg-black border border-zinc-700 p-2 rounded"
          value={form.dailyTarget}
          onChange={e => setForm({ ...form, dailyTarget: +e.target.value })}
          placeholder="Daily Target %"
        />

        <input
          type="number"
          className="bg-black border border-zinc-700 p-2 rounded"
          value={form.stopLoss}
          onChange={e => setForm({ ...form, stopLoss: +e.target.value })}
          placeholder="Stop Loss %"
        />
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={save}
          className="bg-orange-500 text-black px-4 py-2 rounded font-semibold"
        >
          Save / Update
        </button>

        <button
          onClick={() => fetch("/api/start", { method: "POST" })}
          className="bg-green-600 px-4 py-2 rounded"
        >
          Start
        </button>

        <button
          onClick={() => fetch("/api/stop", { method: "POST" })}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Stop
        </button>

      </div>
    </div>
  );
}


function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className="text-zinc-400 text-sm">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

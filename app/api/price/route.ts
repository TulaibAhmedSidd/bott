export const runtime = 'nodejs'

import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')
  if (!symbol) return new Response('Missing symbol', { status: 400 })

  const streamSymbol = symbol.replace('/', '').toLowerCase()

  const ws = new WebSocket(
    `wss://testnet.binance.vision/ws/${streamSymbol}@trade`
  )

  const stream = new ReadableStream({
    start(controller) {
      ws.onmessage = (msg) => {
        controller.enqueue(msg.data)
      }

      ws.onerror = () => controller.error()
      ws.onclose = () => controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}

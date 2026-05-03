import fs from 'fs'
import path from 'path'
import WebSocket from 'ws'
import protobuf from 'protobufjs'
import { config } from './config'
import { TickWriter } from './tickWriter'

type ProtoEnvelope = {
  payloadType: number
  payload?: Uint8Array
}

type SymbolMeta = {
  symbolId: string
  symbolName: string
}

const PROTO_PATHS = [
  path.resolve(__dirname, '../../ctrader-metrics-engine/proto/OpenApiCommonModelMessages.proto'),
  path.resolve(__dirname, '../../ctrader-metrics-engine/proto/OpenApiCommonMessages.proto'),
  path.resolve(__dirname, '../../ctrader-metrics-engine/proto/OpenApiModelMessages.proto'),
  path.resolve(__dirname, '../../ctrader-metrics-engine/proto/OpenApiMessages.proto'),
]

const ensureProtoFilesExist = () => {
  const missing = PROTO_PATHS.filter((p) => !fs.existsSync(p))
  if (missing.length) {
    throw new Error(`Missing proto files required by ctrader-ticks: ${missing.join(', ')}`)
  }
}

const decodeEnvelope = (root: protobuf.Root, data: WebSocket.RawData): ProtoEnvelope => {
  const ProtoMessage = root.lookupType('ProtoMessage')
  return ProtoMessage.decode(new Uint8Array(data as Buffer)) as unknown as ProtoEnvelope
}

const encodeEnvelope = (root: protobuf.Root, payload: protobuf.Message<{}>) => {
  const ProtoMessage = root.lookupType('ProtoMessage')
  const encodedPayload = (payload as any).$type.encode(payload).finish()
  const envelope = ProtoMessage.create({
    payloadType: (payload as any).$type.fields.payloadType?.defaultValue,
    payload: encodedPayload,
  })
  return ProtoMessage.encode(envelope).finish()
}

const decodePayload = (root: protobuf.Root, payloadType: number, payload?: Uint8Array) => {
  if (!payload) return null
  const payloadEnum = root.lookupEnum('ProtoOAPayloadType')
  const payloadName = payloadEnum.valuesById[payloadType]
  if (!payloadName) return null

  const overrides: Record<string, string> = {
    PROTO_OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_RES: 'ProtoOAGetAccountListByAccessTokenRes',
  }

  const camel = payloadName
    .replace('PROTO_OA_', '')
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())

  const messageType = overrides[payloadName] ?? `ProtoOA${camel.charAt(0).toUpperCase()}${camel.slice(1)}`
  try {
    return root.lookupType(messageType).decode(payload)
  } catch {
    return null
  }
}

const createAppAuthReq = (root: protobuf.Root) => {
  const T = root.lookupType('ProtoOAApplicationAuthReq')
  return T.create({ clientId: config.clientId, clientSecret: config.clientSecret })
}

const createAccountListReq = (root: protobuf.Root) => {
  const T = root.lookupType('ProtoOAGetAccountListByAccessTokenReq')
  return T.create({ accessToken: config.accessToken })
}

const createAccountAuthReq = (root: protobuf.Root, ctidTraderAccountId: string) => {
  const T = root.lookupType('ProtoOAAccountAuthReq')
  return T.create({ ctidTraderAccountId: Number(ctidTraderAccountId), accessToken: config.accessToken })
}

const createSymbolsListReq = (root: protobuf.Root, ctidTraderAccountId: string) => {
  const T = root.lookupType('ProtoOASymbolsListReq')
  return T.create({ ctidTraderAccountId: Number(ctidTraderAccountId), includeArchivedSymbols: false })
}

const createSubscribeSpotsReq = (root: protobuf.Root, ctidTraderAccountId: string, symbolIds: string[]) => {
  const T = root.lookupType('ProtoOASubscribeSpotsReq')
  return T.create({
    ctidTraderAccountId: Number(ctidTraderAccountId),
    symbolId: symbolIds.map((id) => Number(id)),
    subscribeToSpotTimestamp: true,
  })
}

async function run() {
  ensureProtoFilesExist()
  const root = await protobuf.load(PROTO_PATHS)
  const writer = new TickWriter(config.ticksDir)

  let ws: WebSocket | null = null
  let pingTimer: NodeJS.Timeout | null = null
  let reconnectTimer: NodeJS.Timeout | null = null
  let accountId: string | null = null
  const symbolById = new Map<string, SymbolMeta>()
  const wantedSymbols = new Set(config.symbols)

  const clearTimers = () => {
    if (pingTimer) clearInterval(pingTimer)
    pingTimer = null
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  const send = (bytes: Uint8Array) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(bytes)
  }

  const subscribeConfiguredSymbols = () => {
    if (!accountId) return
    const symbolIds = Array.from(symbolById.values())
      .filter((meta) => wantedSymbols.has(meta.symbolName.toUpperCase()))
      .map((meta) => meta.symbolId)
    if (!symbolIds.length) {
      console.warn('[ctrader-ticks] No configured symbols found in broker symbol list yet')
      return
    }
    send(encodeEnvelope(root, createSubscribeSpotsReq(root, accountId, symbolIds)))
    console.log(`[ctrader-ticks] Subscribed ${symbolIds.length} symbols`)
  }

  const scheduleReconnect = () => {
    clearTimers()
    reconnectTimer = setTimeout(() => {
      void connect()
    }, config.reconnectDelayMs)
  }

  const connect = async () => {
    clearTimers()
    symbolById.clear()
    accountId = null

    ws = new WebSocket(config.wsUrl)

    ws.on('open', () => {
      console.log('[ctrader-ticks] WS connected')
      send(encodeEnvelope(root, createAppAuthReq(root)))
      send(encodeEnvelope(root, createAccountListReq(root)))
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) ws.ping()
      }, config.pingIntervalMs)
    })

    ws.on('pong', () => {
      // heartbeat ok
    })

    ws.on('message', (raw) => {
      const envelope = decodeEnvelope(root, raw)
      const payload = decodePayload(root, envelope.payloadType, envelope.payload)
      if (!payload) return
      const payloadName = root.lookupEnum('ProtoOAPayloadType').valuesById[envelope.payloadType]

      if (payloadName === 'PROTO_OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_RES') {
        const accounts = ((payload as any).ctidTraderAccount ?? []) as any[]
        if (!accounts.length) {
          console.warn('[ctrader-ticks] No accounts resolved for access token')
          return
        }
        accountId = String(accounts[0].ctidTraderAccountId)
        send(encodeEnvelope(root, createAccountAuthReq(root, accountId)))
        send(encodeEnvelope(root, createSymbolsListReq(root, accountId)))
        return
      }

      if (payloadName === 'PROTO_OA_SYMBOLS_LIST_RES') {
        const symbols = ((payload as any).symbol ?? []) as any[]
        symbols.forEach((s) => {
          if (s?.symbolId == null || !s?.symbolName) return
          symbolById.set(String(s.symbolId), {
            symbolId: String(s.symbolId),
            symbolName: String(s.symbolName),
          })
        })
        subscribeConfiguredSymbols()
        return
      }

      if (payloadName === 'PROTO_OA_SPOT_EVENT') {
        const symbolId = String((payload as any).symbolId ?? '')
        const symbolMeta = symbolById.get(symbolId)
        if (!symbolMeta) return

        const bidRaw = Number((payload as any).bid)
        const askRaw = Number((payload as any).ask)
        const tsRaw = Number((payload as any).timestamp)
        if (!Number.isFinite(bidRaw) || !Number.isFinite(askRaw)) return
        const ts = Number.isFinite(tsRaw) && tsRaw > 0 ? tsRaw : Date.now()

        // Preserve raw broker values exactly as provided.
        writer.appendTick({
          symbol: symbolMeta.symbolName,
          bid: bidRaw,
          ask: askRaw,
          timestamp: ts,
        })
      }
    })

    ws.on('close', () => {
      console.warn('[ctrader-ticks] WS closed, reconnecting...')
      scheduleReconnect()
    })

    ws.on('error', (err) => {
      console.error('[ctrader-ticks] WS error:', err)
    })
  }

  await connect()

  process.on('SIGINT', () => {
    clearTimers()
    ws?.close()
    process.exit(0)
  })
}

run().catch((error) => {
  console.error('[ctrader-ticks] Fatal error', error)
  process.exit(1)
})

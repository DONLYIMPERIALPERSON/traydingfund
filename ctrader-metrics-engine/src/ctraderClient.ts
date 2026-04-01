import WebSocket from 'ws'
import protobuf from 'protobufjs'
import path from 'path'
import fs from 'fs'
import { config } from './config'
import type { CTraderTokens } from './tokenManager'
import { CTraderAccountSnapshot, CTraderStreamState } from './types'

type ProtoMessageEnvelope = {
  payloadType: number
  payload?: Uint8Array
  clientMsgId?: string
}

export type CTraderResolvedAccount = {
  accountNumber: string
  ctidTraderAccountId: string
  brokerName?: string
  connected: boolean
  authSent: boolean
  authOk: boolean
  lastSeenAt?: number
}

export type CTraderPosition = {
  positionId: string
  symbolId: string
  volume: number
  entryPrice: number
  tradeSide: 'BUY' | 'SELL'
  openTime?: number
  closeTime?: number
  isOpen: boolean
}

export type CTraderSpot = {
  bid?: number
  ask?: number
  timestamp?: number
}

export type CTraderExecutionEvent = {
  accountNumber: string
  executionType?: string | number
  position?: unknown
  order?: unknown
  deal?: unknown
  depositWithdraw?: unknown
  isServerEvent?: boolean
}

export type CTraderAccountState = {
  balance: number
  equity: number
  unrealizedPnl: number
  balanceRaw?: number
  moneyDigits?: number
  lastPnlRaw?: number
  lastPnlAt?: number
  lastPnlPositions?: number
  positions: Map<string, CTraderPosition>
  symbolPrices: Map<string, CTraderSpot>
  symbolToPositions: Map<string, Set<string>>
  positionPnls: Map<string, number>
}

export type CTraderSymbolInfo = {
  symbolId: string
  symbolName?: string
  digits?: number
  pipPosition?: number
  measurementUnits?: string
  lotSize?: number
}

type CTraderStreamHandlers = {
  onState?: (state: CTraderStreamState) => void
  onResolvedAccounts?: (resolved: Map<string, CTraderResolvedAccount>) => void
  onAccountAuth?: (accountNumber: string, resolved: CTraderResolvedAccount) => void
  onAccountDisconnect?: (accountNumber: string) => void
  onBalanceUpdate?: (accountNumber: string, balance: number) => void
  onPositionsUpdate?: (accountNumber: string, state: CTraderAccountState) => void
  onSpotUpdate?: (accountNumber: string, symbolId: string, spot: CTraderSpot) => void
  onExecution?: (accountNumber: string, event: CTraderExecutionEvent) => void
}

const PROTO_PATHS = [
  path.resolve(__dirname, '../proto/OpenApiCommonModelMessages.proto'),
  path.resolve(__dirname, '../proto/OpenApiCommonMessages.proto'),
  path.resolve(__dirname, '../proto/OpenApiModelMessages.proto'),
  path.resolve(__dirname, '../proto/OpenApiMessages.proto'),
]

const PRICE_DEBUG_FILE = path.resolve(__dirname, '../data/price-scaling.log')
const SYMBOL_DEBUG_FILE = path.resolve(__dirname, '../data/symbol-metadata.log')

const appendPriceDebug = (data: Record<string, unknown>) => {
  try {
    const dir = path.dirname(PRICE_DEBUG_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (!fs.existsSync(PRICE_DEBUG_FILE)) {
      fs.writeFileSync(PRICE_DEBUG_FILE, '')
    }
    fs.appendFileSync(PRICE_DEBUG_FILE, `${JSON.stringify(data)}\n`)
  } catch (error) {
    console.error('[ctrader] Failed to write price debug log', error)
  }
}

const appendSymbolDebug = (data: Record<string, unknown>) => {
  try {
    const dir = path.dirname(SYMBOL_DEBUG_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (!fs.existsSync(SYMBOL_DEBUG_FILE)) {
      fs.writeFileSync(SYMBOL_DEBUG_FILE, '')
    }
    fs.appendFileSync(SYMBOL_DEBUG_FILE, `${JSON.stringify(data)}\n`)
  } catch (error) {
    console.error('[ctrader] Failed to write symbol debug log', error)
  }
}

const loadRoot = async () => {
  return protobuf.load(PROTO_PATHS)
}

const encodeEnvelope = (root: protobuf.Root, payload: protobuf.Message<{}>) => {
  const ProtoMessage = root.lookupType('ProtoMessage')
  const payloadType = (payload as any).payloadType ?? (payload as any).$type?.fields?.payloadType?.defaultValue

  const envelope = ProtoMessage.create({
    payloadType,
    payload: (payload as any).$type?.encode(payload).finish(),
  })

  return ProtoMessage.encode(envelope).finish()
}

const decodeEnvelope = (root: protobuf.Root, data: WebSocket.RawData): ProtoMessageEnvelope => {
  const ProtoMessage = root.lookupType('ProtoMessage')
  const decoded = ProtoMessage.decode(new Uint8Array(data as Buffer)) as any
  return decoded as ProtoMessageEnvelope
}

const decodePayload = (root: protobuf.Root, payloadType: number, payload?: Uint8Array) => {
  if (!payload) return null

  const payloadEnum = root.lookupEnum('ProtoOAPayloadType')
  const payloadName = payloadEnum.valuesById[payloadType]

  const payloadNameOverrides: Record<string, string> = {
    PROTO_OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_RES: 'ProtoOAGetAccountListByAccessTokenRes',
    PROTO_OA_GET_POSITION_UNREALIZED_PNL_RES: 'ProtoOAGetPositionUnrealizedPnLRes',
  }

  if (!payloadName) return null
  const payloadMessageName = payloadName
    .replace('PROTO_OA_', '')
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())

  const defaultMessageTypeName = `ProtoOA${payloadMessageName.charAt(0).toUpperCase()}${payloadMessageName.slice(1)}`
  const messageTypeName = payloadNameOverrides[payloadName] ?? defaultMessageTypeName
  try {
    const messageType = root.lookupType(messageTypeName)
    return messageType.decode(payload)
  } catch (error) {
    console.warn('[ctrader] Unknown payload type', { payloadName, messageTypeName, error })
    return null
  }
}

const createAccountSnapshot = (accountId: string, trader: any, accountNumberOverride?: string): CTraderAccountSnapshot => {
  const moneyDigits = trader.moneyDigits ?? 2
  const balance = Number(trader.balance ?? 0) / Math.pow(10, moneyDigits)
  const equity = trader.equity != null ? Number(trader.equity) / Math.pow(10, moneyDigits) : Number.NaN

  return {
    accountId,
    accountNumber: String(accountNumberOverride ?? trader.traderLogin ?? trader.login ?? accountId),
    balance,
    equity,
  }
}

const normalizePrice = (rawValue: number, digits: number) => {
  if (!Number.isFinite(rawValue)) return 0
  if (rawValue === 0) return 0
  const baseDivisor = Math.pow(10, digits)
  if (rawValue < baseDivisor) return rawValue
  const scaled = rawValue / baseDivisor
  if (scaled > 100000) {
    const adjustedDivisor = Math.pow(10, digits + 3)
    const adjustedScaled = rawValue / adjustedDivisor
    return adjustedScaled > 0 ? adjustedScaled : rawValue
  }
  return scaled
}

const mapPositionFromDeal = (deal: any, existing?: CTraderPosition, symbol?: CTraderSymbolInfo): CTraderPosition | null => {
  if (!deal) return null
  const positionId = deal?.positionId != null ? String(deal.positionId) : undefined
  if (!positionId) return null
  const tradeSide = deal.tradeSide === 2 ? 'SELL' : 'BUY'
  const openTime = deal.createTimestamp ? Number(deal.createTimestamp) : undefined
  const closeTime = deal.executionTimestamp ? Number(deal.executionTimestamp) : undefined
  const isClosed = Boolean(deal.closePositionDetail)
  const digits = symbol?.digits ?? 5
  const divisor = Math.pow(10, digits)
  const rawExecutionPrice = deal.executionPrice ?? existing?.entryPrice ?? 0
  const entryPrice = normalizePrice(Number(rawExecutionPrice), digits)
  appendPriceDebug({
    type: 'deal-entry-price',
    symbolId: deal.symbolId,
    rawExecutionPrice,
    digits,
    divisor,
    entryPrice,
    pipPosition: symbol?.pipPosition,
    timestamp: new Date().toISOString(),
  })
  const volumeUnits = deal.volume != null ? Number(deal.volume) / 100 : existing?.volume ?? 0

  return {
    positionId,
    symbolId: String(deal.symbolId ?? existing?.symbolId ?? ''),
    volume: volumeUnits,
    entryPrice,
    tradeSide,
    openTime: existing?.openTime ?? openTime,
    closeTime: isClosed ? closeTime ?? existing?.closeTime : existing?.closeTime,
    isOpen: !isClosed,
  }
}

const mapPositionFromProto = (position: any, symbol?: CTraderSymbolInfo): CTraderPosition | null => {
  if (!position?.tradeData?.symbolId || position?.positionId == null) return null
  const tradeData = position.tradeData
  const tradeSide = tradeData.tradeSide === 2 ? 'SELL' : 'BUY'
  const rawVolume = tradeData.volume != null ? Number(tradeData.volume) : 0
  const volumeUnits = rawVolume / 100
  const openTime = tradeData.openTimestamp ? Number(tradeData.openTimestamp) : undefined
  const closeTime = tradeData.closeTimestamp ? Number(tradeData.closeTimestamp) : undefined
  const digits = symbol?.digits ?? 5
  const divisor = Math.pow(10, digits)
  const rawPrice = position.price != null ? Number(position.price) : 0
  const price = normalizePrice(rawPrice, digits)
  appendPriceDebug({
    type: 'reconcile-position',
    symbolId: tradeData.symbolId,
    rawPrice,
    digits,
    divisor,
    entryPrice: price,
    rawVolume,
    volumeUnits,
    pipPosition: symbol?.pipPosition,
    timestamp: new Date().toISOString(),
  })
  const isOpen = position.positionStatus === 1

  return {
    positionId: String(position.positionId),
    symbolId: String(tradeData.symbolId),
    volume: volumeUnits,
    entryPrice: price,
    tradeSide,
    openTime,
    closeTime,
    isOpen,
  }
}

const mapSpot = (spot: any, symbol?: CTraderSymbolInfo): CTraderSpot => {
  const digits = symbol?.digits ?? 5
  const divisor = Math.pow(10, digits)
  const rawBid = spot.bid != null ? Number(spot.bid) : undefined
  const rawAsk = spot.ask != null ? Number(spot.ask) : undefined
  const bid = rawBid != null ? normalizePrice(rawBid, digits) : undefined
  const ask = rawAsk != null ? normalizePrice(rawAsk, digits) : undefined
  const timestamp = spot.timestamp != null ? Number(spot.timestamp) : undefined
  if (rawBid != null || rawAsk != null) {
    appendPriceDebug({
      type: 'spot-price',
      symbolId: spot.symbolId,
      rawBid,
      rawAsk,
      digits,
      divisor,
      bid,
      ask,
      pipPosition: symbol?.pipPosition,
      timestamp: new Date().toISOString(),
    })
  }
  return {
    bid: bid && bid > 0 ? bid : undefined,
    ask: ask && ask > 0 ? ask : undefined,
    timestamp,
  }
}

const toNumber = (value: any) => {
  if (value == null) return undefined
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (typeof value === 'object') {
    if (typeof value.toNumber === 'function') {
      const parsed = value.toNumber()
      return Number.isFinite(parsed) ? parsed : undefined
    }
    if (typeof value.low === 'number' || typeof value.high === 'number') {
      const low = Number(value.low ?? 0)
      const high = Number(value.high ?? 0)
      const parsed = low + high * 4294967296
      return Number.isFinite(parsed) ? parsed : undefined
    }
  }
  return undefined
}

const buildSymbolInfo = (symbol: any): CTraderSymbolInfo => ({
  symbolId: String(symbol.symbolId ?? ''),
  symbolName: symbol.symbolName ?? symbol.name,
  digits: toNumber(symbol.digits),
  pipPosition: toNumber(symbol.pipPosition),
  measurementUnits: symbol.measurementUnits ?? undefined,
  lotSize: toNumber(symbol.lotSize),
})

const mergeSymbolInfo = (existing: CTraderSymbolInfo | undefined, incoming: CTraderSymbolInfo) => ({
  symbolId: incoming.symbolId,
  symbolName: incoming.symbolName ?? existing?.symbolName,
  digits: incoming.digits ?? existing?.digits,
  pipPosition: incoming.pipPosition ?? existing?.pipPosition,
  measurementUnits: incoming.measurementUnits ?? existing?.measurementUnits,
  lotSize: incoming.lotSize ?? existing?.lotSize,
})

const createAppAuthReq = (root: protobuf.Root) => {
  const MessageType = root.lookupType('ProtoOAApplicationAuthReq')
  return MessageType.create({
    clientId: config.ctrader.clientId,
    clientSecret: config.ctrader.clientSecret,
  })
}

const createAccountAuthReq = (root: protobuf.Root, accountId: string, accessToken?: string) => {
  const MessageType = root.lookupType('ProtoOAAccountAuthReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
    accessToken: accessToken ?? config.ctrader.accessToken,
  })
}

const createAccountListReq = (root: protobuf.Root, accessToken?: string) => {
  const MessageType = root.lookupType('ProtoOAGetAccountListByAccessTokenReq')
  return MessageType.create({
    accessToken: accessToken ?? config.ctrader.accessToken,
  })
}

const createTraderReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOATraderReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
  })
}

const createSymbolsListReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOASymbolsListReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
    includeArchivedSymbols: false,
  })
}

const createSymbolByIdReq = (root: protobuf.Root, accountId: string, symbolIds: string[]) => {
  const MessageType = root.lookupType('ProtoOASymbolByIdReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
    symbolId: symbolIds.map((id) => Number(id)),
  })
}

const createSubscribeSpotsReq = (root: protobuf.Root, accountId: string, symbolIds: string[]) => {
  const MessageType = root.lookupType('ProtoOASubscribeSpotsReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
    symbolId: symbolIds.map((id) => Number(id)),
    subscribeToSpotTimestamp: true,
  })
}

const createReconcileReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOAReconcileReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
  })
}

const createPositionUnrealizedPnlReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOAGetPositionUnrealizedPnLReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
  })
}


export const startCTraderStream = async (
  handlers: CTraderStreamHandlers,
  options?: {
    shouldAuthorizeAccount?: (accountNumber: string) => boolean
    getAccessToken?: () => string | undefined
    onAccessTokenUpdate?: (tokens: CTraderTokens) => void
  },
) => {
  const root = await loadRoot()
  if (!config.ctrader.wsUrl) {
    throw new Error('CTRADER_WS_URL is not configured.')
  }
  const ws = new WebSocket(config.ctrader.wsUrl)
  let pingInterval: NodeJS.Timeout | undefined
  const resolvedAccountIds: string[] = []
  let accountListRequested = false
  const initializedAccounts = new Set<string>()
  const pendingAccountAuths: string[] = []
  let accountAuthTimer: NodeJS.Timeout | undefined
  const ACCOUNT_AUTH_DELAY_MS = 300
  const ACCOUNT_INIT_DELAY_MS = 300
  const pendingAccountInitTasks: Array<() => void> = []
  let accountInitTimer: NodeJS.Timeout | undefined
  const ACCOUNT_INIT_STEP_DELAY_MS = 300
  const pollableAccounts = new Set<string>()
  const pollableAccountNumbers = new Map<string, string>()
  const accountNumbersById = new Map<string, string>()
  const resolvedAccounts = new Map<string, CTraderResolvedAccount>()
  const accountStates = new Map<string, CTraderAccountState>()
  const symbolCatalog = new Map<string, CTraderSymbolInfo>()
  const symbolNames = new Map<string, string>()
  const symbolSubscriptions = new Map<string, Set<string>>()
  const lastEquityByAccount = new Map<string, number>()
  const moneyDigitsByAccount = new Map<string, number>()
  const emptyReconcileCount = new Map<string, number>()

  const send = (payload: protobuf.Message<{}>) => {
    if (ws.readyState !== WebSocket.OPEN) {
      return
    }
    const data = encodeEnvelope(root, payload)
    ws.send(data)
  }

  const getAccessToken = () => options?.getAccessToken?.() ?? config.ctrader.accessToken

  const ensureAccountState = (accountNumber: string) => {
    const existing = accountStates.get(accountNumber)
    if (existing) return existing
    const initial: CTraderAccountState = {
      balance: 0,
      equity: 0,
      unrealizedPnl: 0,
      balanceRaw: undefined,
      moneyDigits: undefined,
      lastPnlRaw: undefined,
      lastPnlAt: undefined,
      lastPnlPositions: undefined,
      positions: new Map<string, CTraderPosition>(),
      symbolPrices: new Map<string, CTraderSpot>(),
      symbolToPositions: new Map<string, Set<string>>(),
      positionPnls: new Map<string, number>(),
    }
    accountStates.set(accountNumber, initial)
    return initial
  }

  const getContractSize = (symbolId: string) => {
    const symbolInfo = symbolCatalog.get(symbolId)
    if (symbolInfo?.lotSize != null) {
      const size = Number(symbolInfo.lotSize)
      const divisor = config.ctrader.lotSizeDivisors?.[symbolId] ?? 1
      const normalized = size / divisor
      return Number.isFinite(normalized) && normalized > 0 ? normalized : 1
    }
    return 1
  }

  const getSafeEquity = (accountNumber: string, equity: number | null | undefined, balance: number) => {
    if (typeof equity === 'number' && Number.isFinite(equity) && equity !== balance) {
      lastEquityByAccount.set(accountNumber, equity)
      return equity
    }
    const lastEquity = lastEquityByAccount.get(accountNumber)
    if (lastEquity != null) {
      return lastEquity
    }
    return balance
  }

  const updatePositionIndex = (state: CTraderAccountState, position: CTraderPosition) => {
    const existing = state.symbolToPositions.get(position.symbolId) ?? new Set<string>()
    if (position.isOpen) {
      existing.add(position.positionId)
      state.symbolToPositions.set(position.symbolId, existing)
    } else if (existing.size) {
      existing.delete(position.positionId)
      if (existing.size === 0) {
        state.symbolToPositions.delete(position.symbolId)
      } else {
        state.symbolToPositions.set(position.symbolId, existing)
      }
    }
  }

  const subscribeSymbols = (accountId: string, symbolIds: string[]) => {
    if (!symbolIds.length) return
    const accountNumber = accountNumbersById.get(accountId) ?? accountId
    const subscribed = symbolSubscriptions.get(accountNumber) ?? new Set<string>()
    const toSubscribe = symbolIds.filter((id) => !subscribed.has(id))
    if (!toSubscribe.length) return
    send(createSubscribeSpotsReq(root, accountId, toSubscribe))
    toSubscribe.forEach((id) => subscribed.add(id))
    symbolSubscriptions.set(accountNumber, subscribed)
  }

  const requestSymbolsMeta = (accountId: string, symbolIds: string[]) => {
    const missing = symbolIds.filter((id) => !symbolCatalog.has(id))
    if (!missing.length) return
    send(createSymbolByIdReq(root, accountId, missing))
  }

  const handlePositionUpdate = (accountNumber: string, position: CTraderPosition) => {
    const state = ensureAccountState(accountNumber)
    if (position.isOpen) {
      state.positions.set(position.positionId, position)
    } else {
      state.positions.delete(position.positionId)
      state.positionPnls.delete(position.positionId)
    }
    updatePositionIndex(state, position)
    handlers.onPositionsUpdate?.(accountNumber, state)
  }

  const reconcileClosedPositions = (accountNumber: string, liveIds: Set<string>) => {
    const state = ensureAccountState(accountNumber)
    Array.from(state.positions.values()).forEach((position) => {
      if (liveIds.has(position.positionId)) return
      const closed: CTraderPosition = { ...position, isOpen: false, closeTime: Date.now() }
      updatePositionIndex(state, closed)
      state.positions.delete(position.positionId)
      state.positionPnls.delete(position.positionId)
    })
  }

  const queueAccountAuths = (accountIds: string[]) => {
    pendingAccountAuths.push(...accountIds)
    if (accountAuthTimer) return
    accountAuthTimer = setInterval(() => {
      const nextAccount = pendingAccountAuths.shift()
      if (!nextAccount) {
        if (accountAuthTimer) {
          clearInterval(accountAuthTimer)
          accountAuthTimer = undefined
        }
        return
      }
      const accountNumber = accountNumbersById.get(nextAccount) ?? nextAccount
      if (options?.shouldAuthorizeAccount && !options.shouldAuthorizeAccount(accountNumber)) {
        return
      }
      const resolved = resolvedAccounts.get(accountNumber)
      if (resolved?.authSent) {
        return
      }
      if (resolved) {
        resolved.authSent = true
        resolvedAccounts.set(accountNumber, resolved)
      }
      send(createAccountAuthReq(root, nextAccount, getAccessToken()))
    }, ACCOUNT_AUTH_DELAY_MS)
  }

  const queueAccountInit = (accountId: string) => {
    pendingAccountInitTasks.push(() => {
      send(createTraderReq(root, accountId))
    })
    pendingAccountInitTasks.push(() => {
      send(createReconcileReq(root, accountId))
    })
    pendingAccountInitTasks.push(() => {
      send(createSymbolsListReq(root, accountId))
    })

    if (accountInitTimer) return
    accountInitTimer = setInterval(() => {
      const nextTask = pendingAccountInitTasks.shift()
      if (!nextTask) {
        if (accountInitTimer) {
          clearInterval(accountInitTimer)
          accountInitTimer = undefined
        }
        return
      }
      nextTask()
    }, ACCOUNT_INIT_STEP_DELAY_MS)
  }

  ws.on('open', () => {
    console.log('[ctrader] WebSocket open')
    handlers.onState?.({ status: 'connected' })
    send(createAppAuthReq(root))
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping()
      }
    }, 20000)
  })

  ws.on('message', (data) => {
    const envelope = decodeEnvelope(root, data)
    const payload = decodePayload(root, envelope.payloadType, envelope.payload)

    if (!payload) return

    const payloadType = envelope.payloadType
    const payloadEnum = root.lookupEnum('ProtoOAPayloadType')
    const payloadName = payloadEnum.valuesById[payloadType]
    const accountId = String((payload as any).ctidTraderAccountId ?? '')
    const accountNumber = accountNumbersById.get(accountId) ?? String((payload as any).traderLogin ?? accountId)
    switch (payloadType) {
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_APPLICATION_AUTH_RES']:
        if (!accountListRequested) {
          send(createAccountListReq(root, getAccessToken()))
          accountListRequested = true
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_RES']:
        {
          const accounts = (payload as any).ctidTraderAccount ?? []
          const resolvedEntries = accounts.map((account: any) => {
            const accountNumber = String(
              account.accountNumber
                ?? account.traderLogin
                ?? account.login
                ?? account.ctidTraderAccountId,
            )
            const ctidTraderAccountId = String(account.ctidTraderAccountId)
            return { accountNumber, ctidTraderAccountId, brokerName: account.brokerTitleShort }
          })
          const filteredEntries = resolvedEntries.filter((entry: { accountNumber: string }) =>
            options?.shouldAuthorizeAccount ? options.shouldAuthorizeAccount(entry.accountNumber) : true
          )
          resolvedAccountIds.splice(0, resolvedAccountIds.length, ...filteredEntries.map((entry: { accountNumber: string; ctidTraderAccountId: string; brokerName?: string }) => {
            const resolved: CTraderResolvedAccount = {
              accountNumber: entry.accountNumber,
              ctidTraderAccountId: entry.ctidTraderAccountId,
              brokerName: entry.brokerName,
              connected: false,
              authSent: false,
              authOk: false,
              lastSeenAt: Date.now(),
            }
            resolvedAccounts.set(entry.accountNumber, resolved)
            accountNumbersById.set(entry.ctidTraderAccountId, entry.accountNumber)
            pollableAccountNumbers.set(entry.ctidTraderAccountId, entry.accountNumber)
            return entry.ctidTraderAccountId
          }))
          if (!resolvedAccountIds.length) {
            console.warn('[ctrader] No accounts returned for access token')
            break
          }
          handlers.onResolvedAccounts?.(resolvedAccounts)
          queueAccountAuths(resolvedAccountIds)
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_ACCOUNT_AUTH_RES']:
        {
          if (!initializedAccounts.has(accountId)) {
            initializedAccounts.add(accountId)
            setTimeout(() => {
              queueAccountInit(accountId)
            }, ACCOUNT_INIT_DELAY_MS)
          }
          pollableAccounts.add(accountId)
          const resolved = resolvedAccounts.get(accountNumber)
          if (resolved) {
            resolved.connected = true
            resolved.authOk = true
            resolved.lastSeenAt = Date.now()
            resolvedAccounts.set(accountNumber, resolved)
            handlers.onAccountAuth?.(accountNumber, resolved)
          }
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_ERROR_RES']:
        {
          const errorCode = (payload as any)?.errorCode
          if (errorCode === 'ALREADY_LOGGED_IN') {
            if (accountId) {
              pollableAccounts.add(accountId)
              const resolved = resolvedAccounts.get(accountNumber)
              if (resolved) {
                resolved.connected = true
                resolved.authOk = true
                resolved.lastSeenAt = Date.now()
                resolvedAccounts.set(accountNumber, resolved)
                handlers.onAccountAuth?.(accountNumber, resolved)
              }
              if (!initializedAccounts.has(accountId)) {
                initializedAccounts.add(accountId)
                setTimeout(() => {
                  queueAccountInit(accountId)
                }, ACCOUNT_INIT_DELAY_MS)
              }
            }
            break
          }
          console.error('[ctrader] Error response', payload)
          break
        }
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_CLIENT_DISCONNECT_EVENT']:
        console.warn('[ctrader] Client disconnect event', payload)
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_ACCOUNTS_TOKEN_INVALIDATED_EVENT']:
        console.warn('[ctrader] Accounts token invalidated', payload)
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_ACCOUNT_DISCONNECT_EVENT']:
        console.warn('[ctrader] Account disconnected', payload)
        if (accountNumber) {
          const resolved = resolvedAccounts.get(accountNumber)
          if (resolved) {
            resolved.connected = false
            resolved.authOk = false
            resolvedAccounts.set(accountNumber, resolved)
            handlers.onAccountDisconnect?.(accountNumber)
          }
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_TRADER_RES']:
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_TRADER_UPDATE_EVENT']:
        {
          const trader = (payload as any).trader ?? payload
          const traderAccountNumber = String(
            trader.traderLogin
              ?? trader.login
              ?? pollableAccountNumbers.get(accountId)
              ?? accountId,
          )
          const snapshot = createAccountSnapshot(accountId, trader, traderAccountNumber)
          if (trader.moneyDigits != null) {
            moneyDigitsByAccount.set(snapshot.accountNumber, Number(trader.moneyDigits))
          }
          const state = ensureAccountState(snapshot.accountNumber)
          const moneyDigits = Number(trader.moneyDigits ?? moneyDigitsByAccount.get(snapshot.accountNumber) ?? 2)
          state.moneyDigits = moneyDigits
          const balanceRaw = toNumber(trader.balance)
          state.balanceRaw = balanceRaw ?? state.balanceRaw
          state.balance = Number(snapshot.balance.toFixed(2))
          if (typeof state.lastPnlRaw === 'number' && Number.isFinite(state.lastPnlRaw) && typeof state.balanceRaw === 'number') {
            const equityRaw = state.balanceRaw + state.lastPnlRaw
            const equity = equityRaw / Math.pow(10, moneyDigits)
            state.equity = Number(equity.toFixed(moneyDigits))
            state.unrealizedPnl = Number((state.equity - state.balance).toFixed(moneyDigits))
          }
          handlers.onBalanceUpdate?.(snapshot.accountNumber, state.balance)
          handlers.onPositionsUpdate?.(snapshot.accountNumber, state)
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_EXECUTION_EVENT']:
        {
          const executionEvent = payload as any
          const executionSnapshot: CTraderExecutionEvent = {
            accountNumber,
            executionType: executionEvent?.executionType,
            position: executionEvent?.position,
            order: executionEvent?.order,
            deal: executionEvent?.deal,
            depositWithdraw: executionEvent?.depositWithdraw,
            isServerEvent: executionEvent?.isServerEvent,
          }
          handlers.onExecution?.(accountNumber, executionSnapshot)
          if (executionEvent?.deal) {
            const deal = executionEvent.deal
            const existing = accountNumber ? ensureAccountState(accountNumber).positions.get(String(deal.positionId ?? '')) : undefined
            const symbolInfo = deal.symbolId ? symbolCatalog.get(String(deal.symbolId)) : undefined
            const position = mapPositionFromDeal(deal, existing, symbolInfo)
            if (position && accountNumber) {
              handlePositionUpdate(accountNumber, position)
              if (position.symbolId) {
                requestSymbolsMeta(accountId, [position.symbolId])
                subscribeSymbols(accountId, [position.symbolId])
              }
            }
          }
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_RECONCILE_RES']:
        {
          const positions = (payload as any).position ?? []
          if (!accountNumber) break
          const liveIds = new Set<string>()
          positions.forEach((position: any) => {
            const symbolInfo = position.tradeData?.symbolId
              ? symbolCatalog.get(String(position.tradeData.symbolId))
              : undefined
            const mapped = mapPositionFromProto(position, symbolInfo)
            if (mapped) {
              liveIds.add(mapped.positionId)
              handlePositionUpdate(accountNumber, mapped)
              requestSymbolsMeta(accountId, [mapped.symbolId])
              subscribeSymbols(accountId, [mapped.symbolId])
            }
          })
          reconcileClosedPositions(accountNumber, liveIds)
          if (positions.length === 0) {
            const emptyCount = (emptyReconcileCount.get(accountNumber) ?? 0) + 1
            emptyReconcileCount.set(accountNumber, emptyCount)
            if (emptyCount < 2) {
              break
            }
          } else {
            emptyReconcileCount.delete(accountNumber)
          }
          if (positions.length === 0) {
            const state = ensureAccountState(accountNumber)
            state.positionPnls.clear()
            state.equity = state.balance
            state.unrealizedPnl = 0
            lastEquityByAccount.set(accountNumber, state.balance)
            handlers.onPositionsUpdate?.(accountNumber, state)
          }
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_GET_POSITION_UNREALIZED_PNL_RES']:
        {
          if (!accountNumber) break
          const entries = (payload as any).positionUnrealizedPnL ?? []
          const payloadMoneyDigits = Number((payload as any).moneyDigits ?? moneyDigitsByAccount.get(accountNumber) ?? 2)
          const divisor = Math.pow(10, payloadMoneyDigits)
          const state = ensureAccountState(accountNumber)
          if (!entries.length) {
            state.positionPnls.clear()
            state.equity = state.balance
            state.unrealizedPnl = 0
            state.lastPnlPositions = 0
            lastEquityByAccount.set(accountNumber, state.balance)
            handlers.onPositionsUpdate?.(accountNumber, state)
            break
          }
          let total = 0
          let totalRaw = 0
          const seen = new Set<string>()
          entries.forEach((entry: any) => {
            const positionId = entry?.positionId != null ? String(entry.positionId) : undefined
            if (!positionId) return
            const netRaw = toNumber(entry.netUnrealizedPnL)
            if (netRaw == null) return
            totalRaw += netRaw
            const pnl = netRaw / divisor
            state.positionPnls.set(positionId, pnl)
            total += pnl
            seen.add(positionId)
          })
          Array.from(state.positionPnls.keys()).forEach((positionId) => {
            if (seen.has(positionId)) return
            state.positionPnls.delete(positionId)
          })
          state.lastPnlRaw = totalRaw
          state.lastPnlAt = Date.now()
          state.lastPnlPositions = entries.length
          const moneyDigits = state.moneyDigits ?? moneyDigitsByAccount.get(accountNumber) ?? payloadMoneyDigits ?? 2
          const balanceRaw = state.balanceRaw
          if (typeof balanceRaw === 'number' && Number.isFinite(balanceRaw)) {
            const equityRaw = balanceRaw + totalRaw
            const equity = equityRaw / Math.pow(10, moneyDigits)
            state.equity = Number(equity.toFixed(moneyDigits))
          } else {
            // Wait until balanceRaw is available before setting equity.
            return
          }
          state.unrealizedPnl = Number((state.equity - state.balance).toFixed(moneyDigits))
          handlers.onPositionsUpdate?.(accountNumber, state)
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_SYMBOLS_LIST_RES']:
        {
          const symbols = (payload as any).symbol ?? []
          symbols.forEach((symbol: any) => {
            const info = buildSymbolInfo(symbol)
            if (!info.symbolId) return
            const merged = mergeSymbolInfo(symbolCatalog.get(info.symbolId), info)
            symbolCatalog.set(info.symbolId, merged)
            if (info.symbolName) {
              symbolNames.set(info.symbolName, info.symbolId)
            }
            appendSymbolDebug({
              type: 'symbol-metadata',
              symbolId: merged.symbolId ?? null,
              symbolName: merged.symbolName ?? null,
              digits: merged.digits ?? null,
              pipPosition: merged.pipPosition ?? null,
              measurementUnits: merged.measurementUnits ?? null,
              lotSize: merged.lotSize ?? null,
              timestamp: new Date().toISOString(),
            })
          })
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_SYMBOL_BY_ID_RES']:
        {
          const symbols = (payload as any).symbol ?? []
          symbols.forEach((symbol: any) => {
            const info = buildSymbolInfo(symbol)
            if (!info.symbolId) return
            const merged = mergeSymbolInfo(symbolCatalog.get(info.symbolId), info)
            symbolCatalog.set(info.symbolId, merged)
            appendSymbolDebug({
              type: 'symbol-metadata-by-id',
              symbolId: merged.symbolId ?? null,
              symbolName: merged.symbolName ?? null,
              digits: merged.digits ?? null,
              pipPosition: merged.pipPosition ?? null,
              measurementUnits: merged.measurementUnits ?? null,
              lotSize: merged.lotSize ?? null,
              timestamp: new Date().toISOString(),
            })
          })
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_SPOT_EVENT']:
        {
          if (!accountNumber) break
          const symbolId = String((payload as any).symbolId ?? '')
          if (!symbolId) break
          const state = ensureAccountState(accountNumber)
          const symbolInfo = symbolCatalog.get(symbolId)
          const spot = mapSpot(payload, symbolInfo)
          if (spot.bid != null || spot.ask != null) {
            state.symbolPrices.set(symbolId, spot)
          }
          const affected = state.symbolToPositions.get(symbolId)
          if (affected) {
            // PnL is provided by server unrealized PnL requests.
          }
          handlers.onSpotUpdate?.(accountNumber, symbolId, spot)
          handlers.onPositionsUpdate?.(accountNumber, state)
        }
        break
      default:
        break
    }
  })

  ws.on('error', (error) => {
    console.error('[ctrader] WebSocket error', error)
    handlers.onState?.({ status: 'error', error })
  })

  ws.on('close', (code, reason) => {
    if (pingInterval) {
      clearInterval(pingInterval)
    }
    if (accountAuthTimer) {
      clearInterval(accountAuthTimer)
      accountAuthTimer = undefined
    }
    if (accountInitTimer) {
      clearInterval(accountInitTimer)
      accountInitTimer = undefined
    }
    console.warn('[ctrader] WebSocket closed', { code, reason: reason.toString() })
    handlers.onState?.({ status: 'closed' })
  })

  return {
    send,
    getResolvedAccounts: () => resolvedAccounts,
    getAccountStates: () => accountStates,
    resolveAccountsByAccessToken: () => send(createAccountListReq(root, getAccessToken())),
    requestTraderSnapshot: (accountNumber: string) => {
      const resolved = resolvedAccounts.get(accountNumber)
      if (!resolved?.ctidTraderAccountId) {
        return { status: 'unresolved' as const }
      }
      send(createTraderReq(root, resolved.ctidTraderAccountId))
      return { status: 'requested' as const }
    },
    requestUnrealizedPnl: (accountNumber: string) => {
      const resolved = resolvedAccounts.get(accountNumber)
      if (!resolved?.ctidTraderAccountId) {
        return { status: 'unresolved' as const }
      }
      send(createPositionUnrealizedPnlReq(root, resolved.ctidTraderAccountId))
      return { status: 'requested' as const }
    },
    startMonitoring: (accountNumber: string) => {
      const resolved = resolvedAccounts.get(accountNumber)
      if (!resolved?.ctidTraderAccountId) {
        return { status: 'unresolved' as const }
      }
      if (resolved.authOk) {
        return { status: 'already-auth' as const }
      }
      queueAccountAuths([resolved.ctidTraderAccountId])
      return { status: 'auth-queued' as const }
    },
    updateAccessToken: (tokens: CTraderTokens) => {
      if (options?.onAccessTokenUpdate) {
        options.onAccessTokenUpdate(tokens)
      }
      accountListRequested = false
      resolvedAccounts.forEach((value, key) => {
        resolvedAccounts.set(key, {
          ...value,
          authSent: false,
          authOk: false,
        })
      })
      resolvedAccountIds.splice(0, resolvedAccountIds.length)
      pollableAccounts.clear()
      pollableAccountNumbers.clear()
      accountNumbersById.clear()
      if (accountAuthTimer) {
        clearInterval(accountAuthTimer)
        accountAuthTimer = undefined
      }
      pendingAccountAuths.splice(0, pendingAccountAuths.length)
      send(createAccountListReq(root, tokens.accessToken))
    },
  }
}
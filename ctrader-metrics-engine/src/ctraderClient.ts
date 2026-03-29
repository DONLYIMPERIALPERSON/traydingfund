import WebSocket from 'ws'
import protobuf from 'protobufjs'
import path from 'path'
import { config } from './config'
import { CTraderAccountSnapshot, CTraderDeal, CTraderStreamState } from './types'

type ProtoMessageEnvelope = {
  payloadType: number
  payload?: Uint8Array
  clientMsgId?: string
}

type CTraderEvent = {
  accountId: string
  snapshot?: CTraderAccountSnapshot
  deals?: CTraderDeal[]
}

const PROTO_PATHS = [
  path.resolve(__dirname, '../proto/OpenApiCommonModelMessages.proto'),
  path.resolve(__dirname, '../proto/OpenApiCommonMessages.proto'),
  path.resolve(__dirname, '../proto/OpenApiModelMessages.proto'),
  path.resolve(__dirname, '../proto/OpenApiMessages.proto'),
]

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

const createAccountSnapshot = (accountId: string, trader: any): CTraderAccountSnapshot => {
  const moneyDigits = trader.moneyDigits ?? 2
  const balance = Number(trader.balance ?? 0) / Math.pow(10, moneyDigits)
  const equity = trader.equity != null ? Number(trader.equity) / Math.pow(10, moneyDigits) : balance

  return {
    accountId,
    accountNumber: String(trader.traderLogin ?? accountId),
    balance,
    equity,
  }
}

const mapDeal = (deal: any): CTraderDeal => {
  const moneyDigits = deal.moneyDigits ?? 2
  const profit = deal.closePositionDetail?.grossProfit ?? deal.closePositionDetail?.netProfit ?? 0
  const hasCloseDetail = Boolean(deal.closePositionDetail)

  return {
    dealId: String(deal.dealId ?? ''),
    positionId: deal.positionId ? String(deal.positionId) : undefined,
    volume: deal.volume != null ? Number(deal.volume) / 100 : undefined,
    profit: profit != null ? Number(profit) / Math.pow(10, moneyDigits) : undefined,
    openTime: deal.createTimestamp ? new Date(Number(deal.createTimestamp)).toISOString() : undefined,
    closeTime: hasCloseDetail && deal.executionTimestamp
      ? new Date(Number(deal.executionTimestamp)).toISOString()
      : undefined,
  }
}

const createAppAuthReq = (root: protobuf.Root) => {
  const MessageType = root.lookupType('ProtoOAApplicationAuthReq')
  return MessageType.create({
    clientId: config.ctrader.clientId,
    clientSecret: config.ctrader.clientSecret,
  })
}

const createAccountAuthReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOAAccountAuthReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
    accessToken: config.ctrader.accessToken,
  })
}

const createAccountListReq = (root: protobuf.Root) => {
  const MessageType = root.lookupType('ProtoOAGetAccountListByAccessTokenReq')
  return MessageType.create({
    accessToken: config.ctrader.accessToken,
  })
}

const createTraderReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOATraderReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
  })
}

const createDealListReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOADealListReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
    maxRows: 50,
  })
}

const createReconcileReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOAReconcileReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
  })
}

export const startCTraderStream = async (
  onEvent: (event: CTraderEvent) => Promise<void> | void,
  onState?: (state: CTraderStreamState) => void,
) => {
  const root = await loadRoot()
  const ws = new WebSocket(config.ctrader.wsUrl)
  let pingInterval: NodeJS.Timeout | undefined
  let resolvedAccountIds: string[] = []
  let accountListRequested = false
  const initializedAccounts = new Set<string>()
  const pendingAccountAuths: string[] = []
  let accountAuthTimer: NodeJS.Timeout | undefined
  const ACCOUNT_AUTH_DELAY_MS = 300
  const ACCOUNT_INIT_DELAY_MS = 300
  const pendingAccountInitTasks: Array<() => void> = []
  let accountInitTimer: NodeJS.Timeout | undefined
  const ACCOUNT_INIT_STEP_DELAY_MS = 300

  const send = (payload: protobuf.Message<{}>) => {
    const data = encodeEnvelope(root, payload)
    ws.send(data)
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
      send(createAccountAuthReq(root, nextAccount))
      console.log('[ctrader] Sent account auth request', nextAccount)
    }, ACCOUNT_AUTH_DELAY_MS)
  }

  const queueAccountInit = (accountId: string) => {
    pendingAccountInitTasks.push(() => {
      send(createTraderReq(root, accountId))
      console.log('[ctrader] Requested trader snapshot', accountId)
    })
    pendingAccountInitTasks.push(() => {
      send(createDealListReq(root, accountId))
      console.log('[ctrader] Requested deal list', accountId)
    })
    pendingAccountInitTasks.push(() => {
      send(createReconcileReq(root, accountId))
      console.log('[ctrader] Requested reconcile', accountId)
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
    onState?.({ status: 'connected' })
    send(createAppAuthReq(root))
    console.log('[ctrader] Sent application auth request')
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
    console.log('[ctrader] Message received', payloadName)
    switch (payloadType) {
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_APPLICATION_AUTH_RES']:
        console.log('[ctrader] Application auth ok')
        if (!accountListRequested) {
          send(createAccountListReq(root))
          accountListRequested = true
          console.log('[ctrader] Requested account list by access token')
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_RES']:
        {
          const accounts = (payload as any).ctidTraderAccount ?? []
          resolvedAccountIds = accounts.map((account: any) => String(account.ctidTraderAccountId))
          console.log(
            '[ctrader] Accounts from token',
            accounts.map((account: any) => ({
              ctidTraderAccountId: account.ctidTraderAccountId,
              login: account.traderLogin ?? account.login,
            })),
          )
          if (!resolvedAccountIds.length) {
            console.warn('[ctrader] No accounts returned for access token')
            break
          }
          queueAccountAuths(resolvedAccountIds)
          console.log('[ctrader] Queued account auth requests for resolved account IDs')
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_ACCOUNT_AUTH_RES']:
        {
          const accountId = String((payload as any).ctidTraderAccountId)
          console.log('[ctrader] Account auth ok', accountId)
          if (!initializedAccounts.has(accountId)) {
            initializedAccounts.add(accountId)
            setTimeout(() => {
              queueAccountInit(accountId)
            }, ACCOUNT_INIT_DELAY_MS)
          }
        }
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_ERROR_RES']:
        console.error('[ctrader] Error response', payload)
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_CLIENT_DISCONNECT_EVENT']:
        console.warn('[ctrader] Client disconnect event', payload)
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_ACCOUNTS_TOKEN_INVALIDATED_EVENT']:
        console.warn('[ctrader] Accounts token invalidated', payload)
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_ACCOUNT_DISCONNECT_EVENT']:
        console.warn('[ctrader] Account disconnected', payload)
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_TRADER_RES']:
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_TRADER_UPDATE_EVENT']:
        onEvent({
          accountId: String((payload as any).ctidTraderAccountId),
          snapshot: createAccountSnapshot(String((payload as any).ctidTraderAccountId), (payload as any).trader ?? payload),
        })
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_DEAL_LIST_RES']:
        onEvent({
          accountId: String((payload as any).ctidTraderAccountId),
          deals: ((payload as any).deal ?? []).map(mapDeal),
        })
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_EXECUTION_EVENT']:
        if ((payload as any).deal) {
          onEvent({
            accountId: String((payload as any).ctidTraderAccountId),
            deals: [mapDeal((payload as any).deal)],
          })
        }
        break
      default:
        break
    }
  })

  ws.on('error', (error) => {
    console.error('[ctrader] WebSocket error', error)
    onState?.({ status: 'error', error })
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
    onState?.({ status: 'closed' })
  })
}
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

  if (!payloadName) return null
  const payloadMessageName = payloadName
    .replace('PROTO_OA_', '')
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())

  const messageTypeName = `ProtoOA${payloadMessageName.charAt(0).toUpperCase()}${payloadMessageName.slice(1)}`
  const messageType = root.lookupType(messageTypeName)
  return messageType.decode(payload)
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

  return {
    dealId: String(deal.dealId ?? ''),
    positionId: deal.positionId ? String(deal.positionId) : undefined,
    volume: deal.volume != null ? Number(deal.volume) / 100 : undefined,
    profit: profit != null ? Number(profit) / Math.pow(10, moneyDigits) : undefined,
    openTime: deal.createTimestamp ? new Date(Number(deal.createTimestamp)).toISOString() : undefined,
    closeTime: deal.executionTimestamp ? new Date(Number(deal.executionTimestamp)).toISOString() : undefined,
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

  const send = (payload: protobuf.Message<{}>) => {
    const data = encodeEnvelope(root, payload)
    ws.send(data)
  }

  ws.on('open', () => {
    onState?.({ status: 'connected' })
    send(createAppAuthReq(root))
  })

  ws.on('message', (data) => {
    const envelope = decodeEnvelope(root, data)
    const payload = decodePayload(root, envelope.payloadType, envelope.payload)

    if (!payload) return

    const payloadType = envelope.payloadType
    switch (payloadType) {
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_APPLICATION_AUTH_RES']:
        config.ctrader.accountIds.forEach((accountId) => send(createAccountAuthReq(root, accountId)))
        break
      case root.lookupEnum('ProtoOAPayloadType').values['PROTO_OA_ACCOUNT_AUTH_RES']:
        config.ctrader.accountIds.forEach((accountId) => {
          send(createTraderReq(root, accountId))
          send(createDealListReq(root, accountId))
          send(createReconcileReq(root, accountId))
        })
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
    onState?.({ status: 'error', error })
  })

  ws.on('close', () => {
    onState?.({ status: 'closed' })
  })
}
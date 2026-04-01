import fs from 'fs'
import path from 'path'
import WebSocket from 'ws'
import protobuf from 'protobufjs'
import dotenv from 'dotenv'

type PendingRequest = {
  predicate: (payloadType: number, payload: any) => boolean
  resolve: (payload: any) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

const PROTO_PATHS = [
  path.resolve(__dirname, '../../proto/OpenApiCommonModelMessages.proto'),
  path.resolve(__dirname, '../../proto/OpenApiCommonMessages.proto'),
  path.resolve(__dirname, '../../proto/OpenApiModelMessages.proto'),
  path.resolve(__dirname, '../../proto/OpenApiMessages.proto'),
]

const USD_SIZES = [2000, 10000, 30000, 50000, 100000, 200000]
const NGN_SIZES = [200000, 500000, 800000]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isValidPropAccount = (balance: number, currency: string) => {
  const rounded = Math.round(balance)
  if (currency === 'USD') return USD_SIZES.includes(rounded)
  if (currency === 'NGN') return NGN_SIZES.includes(rounded)
  return false
}

const formatSize = (balance: number, currency: string) => {
  const rounded = Math.round(balance)
  if (currency === 'NGN') {
    return `"₦${rounded.toLocaleString()}"`
  }
  return `"$${rounded.toLocaleString()}"`
}

const loadRoot = async () => protobuf.load(PROTO_PATHS)

const encodeEnvelope = (root: protobuf.Root, payload: protobuf.Message<{}>) => {
  const ProtoMessage = root.lookupType('ProtoMessage')
  const payloadType = (payload as any).payloadType ?? (payload as any).$type?.fields?.payloadType?.defaultValue
  const envelope = ProtoMessage.create({
    payloadType,
    payload: (payload as any).$type?.encode(payload).finish(),
  })
  return ProtoMessage.encode(envelope).finish()
}

const decodeEnvelope = (root: protobuf.Root, data: WebSocket.RawData) => {
  const ProtoMessage = root.lookupType('ProtoMessage')
  return ProtoMessage.decode(new Uint8Array(data as Buffer)) as any
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
    console.warn('[ready-accounts] Unknown payload type', { payloadName, messageTypeName, error })
    return null
  }
}

const createAppAuthReq = (root: protobuf.Root, clientId: string, clientSecret: string) => {
  const MessageType = root.lookupType('ProtoOAApplicationAuthReq')
  return MessageType.create({
    clientId,
    clientSecret,
  })
}

const createAccountAuthReq = (root: protobuf.Root, accountId: string, accessToken: string) => {
  const MessageType = root.lookupType('ProtoOAAccountAuthReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
    accessToken,
  })
}

const createAccountListReq = (root: protobuf.Root, accessToken: string) => {
  const MessageType = root.lookupType('ProtoOAGetAccountListByAccessTokenReq')
  return MessageType.create({
    accessToken,
  })
}

const createTraderReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOATraderReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
  })
}

const createReconcileReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOAReconcileReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
  })
}

const createDealListReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOADealListReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
    fromTimestamp: 0,
    toTimestamp: Date.now(),
    maxRows: 1,
  })
}

const createAssetListReq = (root: protobuf.Root, accountId: string) => {
  const MessageType = root.lookupType('ProtoOAAssetListReq')
  return MessageType.create({
    ctidTraderAccountId: Number(accountId),
  })
}

const loadEnv = () => {
  const envPath = path.resolve(__dirname, '../../.env')
  dotenv.config({ path: envPath })
  return {
    wsUrl: process.env.CTRADER_WS_URL ?? 'wss://demo.ctraderapi.com:5035',
    clientId: process.env.CTRADER_CLIENT_ID,
    clientSecret: process.env.CTRADER_CLIENT_SECRET,
    accessToken: process.env.CTRADER_ACCESS_TOKEN,
  }
}

const main = async () => {
  const env = loadEnv()
  const root = await loadRoot()
  if (!env.wsUrl) {
    throw new Error('CTRADER_WS_URL is not configured.')
  }
  const accessToken = env.accessToken
  if (!accessToken) {
    throw new Error('CTRADER_ACCESS_TOKEN is required to run this script.')
  }
  if (!env.clientId || !env.clientSecret) {
    throw new Error('CTRADER_CLIENT_ID and CTRADER_CLIENT_SECRET are required to run this script.')
  }

  const ws = new WebSocket(env.wsUrl)
  const pending: PendingRequest[] = []

  const waitFor = (label: string, predicate: PendingRequest['predicate'], timeoutMs = 30000) =>
    new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for response: ${label}`))
      }, timeoutMs)
      pending.push({ predicate, resolve, reject, timeout })
    })

  const send = (payload: protobuf.Message<{}>) => {
    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not open')
    }
    ws.send(encodeEnvelope(root, payload))
  }

  ws.on('message', (data) => {
    const envelope = decodeEnvelope(root, data)
    const payload = decodePayload(root, envelope.payloadType, envelope.payload)
    if (!payload) return
    const errorType = root.lookupEnum('ProtoOAPayloadType').values.PROTO_OA_ERROR_RES
    if (envelope.payloadType === errorType) {
      console.error('[ready-accounts] API error', payload)
    }
    const matches = pending.filter((item) => item.predicate(envelope.payloadType, payload))
    matches.forEach((item) => {
      clearTimeout(item.timeout)
      item.resolve(payload)
    })
    if (matches.length) {
      matches.forEach((item) => {
        const index = pending.indexOf(item)
        if (index >= 0) pending.splice(index, 1)
      })
    }
  })

  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve())
    ws.once('error', (error) => reject(error))
  })

  send(createAppAuthReq(root, env.clientId, env.clientSecret))
  await waitFor('app_auth', (payloadType) =>
    payloadType === root.lookupEnum('ProtoOAPayloadType').values.PROTO_OA_APPLICATION_AUTH_RES
  )

  send(createAccountListReq(root, accessToken))
  const accountListRes = await waitFor('account_list', (payloadType) =>
    payloadType === root.lookupEnum('ProtoOAPayloadType').values.PROTO_OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_RES
  )

  const accounts = accountListRes?.ctidTraderAccount ?? []
  const readyAccounts: Array<Record<string, string>> = []

  for (const account of accounts) {
    const accountId = String(account.ctidTraderAccountId)
    const accountNumber = String(account.accountNumber ?? account.traderLogin ?? account.ctidTraderAccountId)
    const broker = account.brokerTitleShort ?? 'Unknown'

    send(createAccountAuthReq(root, accountId, accessToken))
    await waitFor(`account_auth:${accountId}`, (payloadType, payload) =>
      payloadType === root.lookupEnum('ProtoOAPayloadType').values.PROTO_OA_ACCOUNT_AUTH_RES
      && String(payload.ctidTraderAccountId ?? '') === accountId
    )

    send(createTraderReq(root, accountId))
    const traderRes = await waitFor(`trader:${accountId}`, (payloadType, payload) =>
      payloadType === root.lookupEnum('ProtoOAPayloadType').values.PROTO_OA_TRADER_RES
      && String(payload.ctidTraderAccountId ?? '') === accountId
    )

    const trader = traderRes?.trader ?? traderRes
    const moneyDigits = Number(trader?.moneyDigits ?? 2)
    const balance = Number(trader?.balance ?? 0) / Math.pow(10, moneyDigits)
    const depositAssetId = String(trader?.depositAssetId ?? '')

    send(createAssetListReq(root, accountId))
    const assetsRes = await waitFor(`assets:${accountId}`, (payloadType, payload) =>
      payloadType === root.lookupEnum('ProtoOAPayloadType').values.PROTO_OA_ASSET_LIST_RES
      && String(payload.ctidTraderAccountId ?? '') === accountId
    )
    const assets = assetsRes?.asset ?? []
    const depositAsset = assets.find((asset: any) => String(asset.assetId ?? '') === depositAssetId)
    let currency = String(depositAsset?.name ?? 'USD').toUpperCase()
    if (currency === 'USDT') currency = 'USD'

    if (!isValidPropAccount(balance, currency)) {
      await sleep(200)
      continue
    }

    send(createReconcileReq(root, accountId))
    const reconcileRes = await waitFor(`reconcile:${accountId}`, (payloadType, payload) =>
      payloadType === root.lookupEnum('ProtoOAPayloadType').values.PROTO_OA_RECONCILE_RES
      && String(payload.ctidTraderAccountId ?? '') === accountId
    )

    const positions = reconcileRes?.position ?? []
    if (positions.length > 0) {
      await sleep(200)
      continue
    }

    send(createDealListReq(root, accountId))
    const dealsRes = await waitFor(`deals:${accountId}`, (payloadType, payload) =>
      payloadType === root.lookupEnum('ProtoOAPayloadType').values.PROTO_OA_DEAL_LIST_RES
      && String(payload.ctidTraderAccountId ?? '') === accountId
    )
    const deals = dealsRes?.deal ?? []
    if (deals.length > 0) {
      await sleep(200)
      continue
    }

    readyAccounts.push({
      account_number: accountNumber,
      broker,
      account_size: formatSize(balance, currency),
      currency,
      status: 'Ready',
      review_status: '',
    })

    await sleep(200)
  }

  const header = 'account_number,broker,account_size,currency,status,review_status\n'
  const rows = readyAccounts.map((row) =>
    `${row.account_number},${row.broker},${row.account_size},${row.currency},${row.status},${row.review_status}`
  )

  const outputPath = path.resolve(process.cwd(), 'ready_accounts.csv')
  fs.writeFileSync(outputPath, header + rows.join('\n'))
  console.log(`✅ Saved ${readyAccounts.length} ready accounts to ${outputPath}`)
  ws.close()
}

main().catch((error) => {
  console.error('[ready-accounts] Failed to generate CSV', error)
  process.exit(1)
})
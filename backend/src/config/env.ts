import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  appPublicBaseUrl: process.env.APP_PUBLIC_BASE_URL ?? '',
  safehavenBaseUrl: process.env.SAFEHAVEN_BASE_URL ?? 'https://api.sandbox.safehavenmfb.com',
  safehavenClientId: process.env.SAFEHAVEN_CLIENT_ID ?? '',
  safehavenPrivateKey: process.env.SAFEHAVEN_PRIVATE_KEY ?? '',
  safehavenAudience: process.env.SAFEHAVEN_AUDIENCE ?? '',
  safehavenSettlementBankCode: process.env.SAFEHAVEN_SETTLEMENT_BANK_CODE ?? '',
  safehavenSettlementAccountNumber: process.env.SAFEHAVEN_SETTLEMENT_ACCOUNT_NUMBER ?? '',
  cryptoBtcAddress: process.env.CRYPTO_BTC_ADDRESS ?? '',
  cryptoEthAddress: process.env.CRYPTO_ETH_ADDRESS ?? '',
  cryptoSolAddress: process.env.CRYPTO_SOL_ADDRESS ?? '',
  cryptoTrxAddress: process.env.CRYPTO_TRX_ADDRESS ?? '',
}
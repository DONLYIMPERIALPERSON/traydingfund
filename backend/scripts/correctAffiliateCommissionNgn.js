require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const AFFILIATE_COMMISSION_PERCENT = 10
const FX_CONFIG_KEY = 'fx_rates'

async function getUsdNgnRate() {
  const existing = await prisma.tradingObjectiveConfig.findUnique({
    where: { key: FX_CONFIG_KEY },
  })

  const rules = existing && typeof existing.rules === 'object' && existing.rules
    ? existing.rules
    : null

  const rate = rules && typeof rules.usd_ngn_rate === 'number'
    ? rules.usd_ngn_rate
    : 1300

  return rate > 0 ? rate : 1300
}

function toUsdKobo(amountKobo, currency, usdNgnRate) {
  if (String(currency || '').toUpperCase() === 'NGN') {
    const amount = amountKobo / 100
    return Math.round((amount / usdNgnRate) * 100)
  }
  return amountKobo
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const usdNgnRate = await getUsdNgnRate()

  const commissions = await prisma.affiliateCommission.findMany({
    include: {
      order: {
        select: {
          id: true,
          currency: true,
          netAmountKobo: true,
          providerOrderId: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  let checked = 0
  let updated = 0
  let skipped = 0

  console.log(`[commission-fix] mode=${dryRun ? 'dry-run' : 'apply'} usd_ngn_rate=${usdNgnRate}`)

  for (const commission of commissions) {
    checked += 1
    const order = commission.order
    if (!order) {
      skipped += 1
      console.log(`[commission-fix] skip commission=${commission.id} reason=missing-order`)
      continue
    }

    if (String(order.currency || '').toUpperCase() !== 'NGN') {
      skipped += 1
      continue
    }

    const commissionBaseKobo = toUsdKobo(order.netAmountKobo, order.currency, usdNgnRate)
    const expectedAmountKobo = Math.round(commissionBaseKobo * (AFFILIATE_COMMISSION_PERCENT / 100))

    if (commission.amountKobo === expectedAmountKobo) {
      skipped += 1
      continue
    }

    console.log(
      `[commission-fix] commission=${commission.id} order=${order.id} providerOrderId=${order.providerOrderId || 'n/a'} ` +
      `currency=${order.currency} netAmountKobo=${order.netAmountKobo} oldAmountKobo=${commission.amountKobo} newAmountKobo=${expectedAmountKobo}`
    )

    if (!dryRun) {
      await prisma.affiliateCommission.update({
        where: { id: commission.id },
        data: { amountKobo: expectedAmountKobo },
      })
    }

    updated += 1
  }

  console.log(`[commission-fix] checked=${checked} updated=${updated} skipped=${skipped}`)
}

main()
  .catch((error) => {
    console.error('[commission-fix] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
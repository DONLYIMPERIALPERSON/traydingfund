require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const pendingPayouts = await prisma.affiliatePayout.findMany({
    where: { status: 'pending' },
    orderBy: [{ affiliateId: 'asc' }, { requestedAt: 'asc' }],
  })

  let checked = 0
  let updated = 0
  let skipped = 0

  console.log(`[affiliate-payout-fix] mode=${dryRun ? 'dry-run' : 'apply'}`)

  for (const payout of pendingPayouts) {
    checked += 1

    const [earned, paid, otherPending] = await Promise.all([
      prisma.affiliateCommission.aggregate({
        _sum: { amountKobo: true },
        where: { affiliateId: payout.affiliateId },
      }),
      prisma.affiliateCommission.aggregate({
        _sum: { amountKobo: true },
        where: { affiliateId: payout.affiliateId, status: 'paid' },
      }),
      prisma.affiliatePayout.aggregate({
        _sum: { amountKobo: true },
        where: { affiliateId: payout.affiliateId, status: 'pending', id: { not: payout.id } },
      }),
    ])

    const totalEarned = earned._sum.amountKobo ?? 0
    const totalPaid = paid._sum.amountKobo ?? 0
    const otherPendingAmount = otherPending._sum.amountKobo ?? 0
    const correctedAmountKobo = Math.max(0, totalEarned - totalPaid - otherPendingAmount)

    if (payout.amountKobo === correctedAmountKobo) {
      skipped += 1
      continue
    }

    console.log(
      `[affiliate-payout-fix] payout=${payout.id} affiliate=${payout.affiliateId} oldAmountKobo=${payout.amountKobo} newAmountKobo=${correctedAmountKobo}`
    )

    if (!dryRun) {
      await prisma.affiliatePayout.update({
        where: { id: payout.id },
        data: { amountKobo: correctedAmountKobo },
      })
    }

    updated += 1
  }

  console.log(`[affiliate-payout-fix] checked=${checked} updated=${updated} skipped=${skipped}`)
}

main()
  .catch((error) => {
    console.error('[affiliate-payout-fix] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
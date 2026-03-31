import 'dotenv/config'

import { prisma } from '../config/prisma'

const SIM_EMAIL_PREFIX = 'sim+'

const run = async () => {
  console.log('🧹 Cleaning simulation data...')

  const simUsers = await prisma.user.findMany({
    where: { email: { startsWith: SIM_EMAIL_PREFIX } },
    select: { id: true, email: true },
  })

  const simUserIds = simUsers.map((user) => user.id)

  if (simUserIds.length === 0) {
    console.log('No simulation users found.')
    return
  }

  await prisma.payout.deleteMany({
    where: { userId: { in: simUserIds } },
  })

  await prisma.certificate.deleteMany({
    where: { userId: { in: simUserIds } },
  })

  await prisma.cTraderAccountMetric.deleteMany({
    where: { account: { userId: { in: simUserIds } } },
  })

  await prisma.cTraderAccount.deleteMany({
    where: { userId: { in: simUserIds } },
  })

  await prisma.user.deleteMany({
    where: { id: { in: simUserIds } },
  })

  await prisma.cTraderAccount.deleteMany({
    where: {
      status: 'ready',
      challengeId: { startsWith: 'READY-SIM-' },
    },
  })

  console.log(`Deleted ${simUserIds.length} simulation users and related records.`)
}

run()
  .catch((error) => {
    console.error('Cleanup failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
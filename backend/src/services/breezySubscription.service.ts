import { prisma } from '../config/prisma'
import { sendUnifiedEmail } from './email.service'
import { sendEmailOnce } from './emailLog.service'
import { buildCacheKey, clearCacheByPrefix } from '../common/cache'

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

export const processBreezySubscriptions = async () => {
  const now = new Date()
  const accounts = await prisma.cTraderAccount.findMany({
    where: {
      challengeType: 'breezy',
      subscriptionExpiresAt: { not: null },
      status: { notIn: ['completed'] },
    },
    include: { user: true },
  })

  for (const account of accounts) {
    const expiresAt = account.subscriptionExpiresAt
    if (!expiresAt || !account.user?.email) continue

    const msLeft = expiresAt.getTime() - now.getTime()
    const cycleKey = expiresAt.toISOString().slice(0, 10)

    if (msLeft <= TWO_DAYS_MS && msLeft > 0) {
      await prisma.cTraderAccount.update({ where: { id: account.id }, data: { subscriptionStatus: 'renewal_due' } })
      await sendEmailOnce({
        type: `BREEZY_RENEWAL_REMINDER_${cycleKey}`,
        accountId: account.id,
        userId: account.userId ?? null,
        send: async () => {
          await sendUnifiedEmail({
            to: account.user!.email,
            subject: '⏰ Breezy renewal due in 2 days',
            title: 'Your Breezy account expires soon',
            subtitle: 'Renew within 2 days to keep trading',
            content: 'Your Breezy account is approaching its weekly expiration date. Renew before expiry to keep the account active.',
            buttonText: 'View Dashboard',
            infoBox: `Account: ${account.accountNumber}<br>Expires At: ${expiresAt.toISOString()}`,
          })
        },
      })
    }

    if (msLeft <= 0) {
      await prisma.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: 'completed',
          subscriptionStatus: 'completed',
        },
      })
      if (account.userId) {
        await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', account.userId]))
      }
      await sendEmailOnce({
        type: `BREEZY_EXPIRY_NOTICE_${cycleKey}`,
        accountId: account.id,
        userId: account.userId ?? null,
        send: async () => {
          await sendUnifiedEmail({
            to: account.user!.email,
            subject: '🚫 Your Breezy account has expired',
            title: 'Breezy subscription expired',
            subtitle: 'This account is now completed',
            content: 'Your Breezy account reached its expiration date without renewal payment, so it has been marked completed and can no longer be used.',
            buttonText: 'View Dashboard',
            infoBox: `Account: ${account.accountNumber}<br>Expired At: ${expiresAt.toISOString()}`,
          })
        },
      })
    }
  }
}
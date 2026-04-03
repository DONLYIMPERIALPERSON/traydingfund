import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'
import {
  generateRewardCertificateBuffer,
  generateOverallRewardCertificateBuffer,
} from '../src/services/rewardCertificate.service'
import { sendUnifiedEmail } from '../src/services/email.service'

const NAME = 'Eris ogbabuko'
const PAYOUT_AMOUNT_NGN = 2500
const OVERALL_REWARD_NGN = 2500
const RECIPIENT_EMAIL = 'local-only@machefunded.com'

const formatNgn = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const loadEnv = () => {
  const envPath = path.resolve(__dirname, '../.env')
  dotenv.config({ path: envPath })
}

const ensureOutputDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true })
}

const main = async () => {
  loadEnv()

  const outputDir = path.resolve(__dirname, '../outputs')
  await ensureOutputDir(outputDir)

  const payoutBuffer = await generateRewardCertificateBuffer({
    name: NAME,
    rewardLabel: formatNgn(PAYOUT_AMOUNT_NGN),
    date: new Date(),
  })

  const overallBuffer = await generateOverallRewardCertificateBuffer({
    name: NAME,
    rewardLabel: formatNgn(OVERALL_REWARD_NGN),
    date: new Date(),
  })

  const payoutPath = path.resolve(outputDir, 'payout-certificate-imperial.png')
  const overallPath = path.resolve(outputDir, 'overall-reward-certificate-imperial.png')

  await fs.writeFile(payoutPath, payoutBuffer)
  await fs.writeFile(overallPath, overallBuffer)

  console.log('✅ Payout certificate saved to', payoutPath)
  console.log('✅ Overall reward certificate saved to', overallPath)
  console.log('ℹ️ Email send skipped for local certificate generation.')
}

main().catch((error) => {
  console.error('[generatePayoutCertificateAndEmail] Failed', error)
  process.exit(1)
})
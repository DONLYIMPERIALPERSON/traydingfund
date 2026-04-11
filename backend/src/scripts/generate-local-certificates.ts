import 'dotenv/config'

import fs from 'fs/promises'
import path from 'path'
import {
  generateOverallRewardCertificateBuffer,
  generateRewardCertificateBuffer,
} from '../services/rewardCertificate.service'

const OUTPUT_DIR = path.join(process.cwd(), 'outputs', 'generated-certificates')

const randomNames = [
  'Amaka Obi',
  'Tunde Balogun',
  'Zara Bello',
  'Chidi Okonkwo',
  'Ifunanya Okoro',
]

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const pickRandom = <T>(items: T[]) => items[randomInt(0, items.length - 1)]

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const buildRewardLabel = (currency: 'NGN' | 'USD', amount: number) =>
  currency === 'NGN'
    ? `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const run = async () => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const outputs: string[] = []
  const date = new Date()
  date.setHours(10, 0, 0, 0)

  const currency: 'NGN' | 'USD' = 'NGN'
  const name = pickRandom(randomNames) ?? 'Trader'
  const amount = 70_000
  const rewardLabel = buildRewardLabel(currency, amount)

  const rewardBuffer = await generateRewardCertificateBuffer({
    name,
    rewardLabel,
    date,
  })
  const rewardPath = path.join(
    OUTPUT_DIR,
    `reward-${currency.toLowerCase()}-${formatDateLabel(date)}.png`.replace(/\s+/g, '-'),
  )
  await fs.writeFile(rewardPath, rewardBuffer)
  outputs.push(rewardPath)

  const overallBuffer = await generateOverallRewardCertificateBuffer({
    name,
    rewardLabel,
    date,
  })
  const overallPath = path.join(
    OUTPUT_DIR,
    `overall-${currency.toLowerCase()}-${formatDateLabel(date)}.png`.replace(/\s+/g, '-'),
  )
  await fs.writeFile(overallPath, overallBuffer)
  outputs.push(overallPath)

  console.log('✅ Generated certificates:')
  outputs.forEach((output) => console.log(`- ${output}`))
}

run().catch((error) => {
  console.error('Certificate generation failed:', error)
  process.exitCode = 1
})
import fs from 'fs/promises'
import path from 'path'
import { createCanvas, loadImage, registerFont } from 'canvas'
import QRCode from 'qrcode'

const TEMPLATE_FILENAME = 'reward-template.png'
const ONBOARDING_TEMPLATE_FILENAME = 'onboarding-cert.png'
const PASSED_CHALLENGE_TEMPLATE_FILENAME = 'pass-challenge-cert.png'

const CERTIFICATE_LAYOUT = {
  name: { x: 75, y: 344, width: 959 - 75, height: 408 - 344 },
  reward: { x: 73, y: 490, width: 626 - 73, height: 589 - 490 },
  date: { x: 119, y: 688, width: 501 - 119, height: 733 - 688 },
  qr: { x: 991, y: 295, width: 1140 - 991, height: 445 - 295 },
}

const resolveTemplatePath = () => path.join(process.cwd(), 'assets', TEMPLATE_FILENAME)
const resolveOnboardingTemplatePath = () => path.join(process.cwd(), 'assets', ONBOARDING_TEMPLATE_FILENAME)
const resolvePassedChallengeTemplatePath = () => path.join(process.cwd(), 'assets', PASSED_CHALLENGE_TEMPLATE_FILENAME)
const resolveBoldFontPath = () => path.join(process.cwd(), 'assets', 'fonts', 'static', 'OpenSans-Bold.ttf')
const resolveRegularFontPath = () => path.join(process.cwd(), 'assets', 'fonts', 'static', 'OpenSans-Regular.ttf')
const resolveOutputPath = () => path.join(process.cwd(), 'outputs', 'reward-certificate-test.png')
const resolveOnboardingOutputPath = () => path.join(process.cwd(), 'outputs', 'onboarding-certificate-test.png')
const resolvePassedChallengeOutputPath = () => path.join(process.cwd(), 'outputs', 'passed-challenge-certificate-test.png')

type CertificateRenderPayload = {
  templatePath: string
  name: string
  dateLabel: string
  rewardLabel?: string
  qrValue?: string
}

const formatCertificateDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const registerCertificateFonts = () => {
  const boldFontPath = resolveBoldFontPath()
  const regularFontPath = resolveRegularFontPath()
  registerFont(boldFontPath, { family: 'Open Sans', weight: 'bold' })
  registerFont(regularFontPath, { family: 'Open Sans', weight: 'normal' })
}

const renderCertificateBuffer = async ({
  templatePath,
  name,
  dateLabel,
  rewardLabel,
  qrValue,
}: CertificateRenderPayload) => {
  registerCertificateFonts()

  const templateImage = await loadImage(templatePath)
  const canvas = createCanvas(templateImage.width, templateImage.height)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(templateImage, 0, 0, templateImage.width, templateImage.height)

  ctx.fillStyle = '#FFFFFF'

  ctx.font = 'bold 50px "Open Sans", "Arial", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, CERTIFICATE_LAYOUT.name.x, CERTIFICATE_LAYOUT.name.y + CERTIFICATE_LAYOUT.name.height / 2)

  if (rewardLabel) {
    ctx.font = 'bold 75px "Open Sans", "Arial", sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(rewardLabel, CERTIFICATE_LAYOUT.reward.x, CERTIFICATE_LAYOUT.reward.y + CERTIFICATE_LAYOUT.reward.height / 2)
  }

  ctx.font = '20px "Open Sans", "Arial", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(dateLabel, CERTIFICATE_LAYOUT.date.x + CERTIFICATE_LAYOUT.date.width / 2, CERTIFICATE_LAYOUT.date.y + CERTIFICATE_LAYOUT.date.height / 2)

  const qrDataUrl = await QRCode.toDataURL(qrValue ?? 'https://machefunded.com', {
    margin: 1,
    width: CERTIFICATE_LAYOUT.qr.width,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
  const qrImage = await loadImage(qrDataUrl)

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(CERTIFICATE_LAYOUT.qr.x, CERTIFICATE_LAYOUT.qr.y, CERTIFICATE_LAYOUT.qr.width, CERTIFICATE_LAYOUT.qr.height)
  ctx.drawImage(qrImage, CERTIFICATE_LAYOUT.qr.x, CERTIFICATE_LAYOUT.qr.y, CERTIFICATE_LAYOUT.qr.width, CERTIFICATE_LAYOUT.qr.height)

  return canvas.toBuffer('image/png')
}

export const generateRewardCertificateBuffer = async (payload: {
  name: string
  rewardLabel: string
  date: Date
  qrValue?: string
}) => renderCertificateBuffer({
  templatePath: resolveTemplatePath(),
  name: payload.name,
  dateLabel: formatCertificateDate(payload.date),
  rewardLabel: payload.rewardLabel,
  ...(payload.qrValue ? { qrValue: payload.qrValue } : {}),
})

export const generateOnboardingCertificateBuffer = async (payload: {
  name: string
  date: Date
  qrValue?: string
}) => renderCertificateBuffer({
  templatePath: resolveOnboardingTemplatePath(),
  name: payload.name,
  dateLabel: formatCertificateDate(payload.date),
  ...(payload.qrValue ? { qrValue: payload.qrValue } : {}),
})

export const generatePassedChallengeCertificateBuffer = async (payload: {
  name: string
  date: Date
  qrValue?: string
}) => renderCertificateBuffer({
  templatePath: resolvePassedChallengeTemplatePath(),
  name: payload.name,
  dateLabel: formatCertificateDate(payload.date),
  ...(payload.qrValue ? { qrValue: payload.qrValue } : {}),
})

export const generateRewardCertificateTest = async () => {
  const outputPath = resolveOutputPath()

  const buffer = await generateRewardCertificateBuffer({
    name: 'LUCKY CHI',
    rewardLabel: '$10,061',
    date: new Date('2026-03-18T00:00:00Z'),
  })

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, buffer)

  return outputPath
}

export const generateOnboardingCertificateTest = async () => {
  const outputPath = resolveOnboardingOutputPath()

  const buffer = await generateOnboardingCertificateBuffer({
    name: 'LUCKY CHI',
    date: new Date('2026-03-18T00:00:00Z'),
  })

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, buffer)

  return outputPath
}

export const generatePassedChallengeCertificateTest = async () => {
  const outputPath = resolvePassedChallengeOutputPath()

  const buffer = await generatePassedChallengeCertificateBuffer({
    name: 'LUCKY CHI',
    date: new Date('2026-03-18T00:00:00Z'),
  })

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, buffer)

  return outputPath
}
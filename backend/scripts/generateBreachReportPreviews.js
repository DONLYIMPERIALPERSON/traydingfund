const { writeBreachReportPreview } = require('../dist/services/breachReport.service.js')

async function main() {
  const generatedAt = new Date('2026-04-21T00:00:00Z')
  const samples = [
    ['breach-report-daily-dd.pdf', {
      accountNumber: '435279648',
      challengeId: 'CH-9001-funded',
      traderName: 'John Doe',
      traderEmail: 'khpvc02@gmail.com',
      accountSize: '$2,000',
      phase: 'Funded',
      challengeType: 'Two Step',
      platform: 'mt5',
      currency: 'USD',
      status: 'Breached',
      generatedAt,
      breachReason: 'DAILY_DRAWDOWN',
      breachReasonLabel: 'Daily Drawdown Breach',
      breachNarrative: 'Your account exceeded the allowed daily loss limit. Once your equity dropped below the threshold, the system automatically marked the account as breached.',
      breachTimeLabel: '21 Apr 2026',
      peakBalance: '$2,000.00',
      balanceBeforeTrade: '$1,938.09',
      equityAtBreach: '$1,899.83',
      dailyLimit: '$1,900.00',
      maxLimit: '$1,780.00',
      dailyDrawdownUsageLabel: '100.17% used',
      maxDrawdownUsageLabel: '45.53% used',
      breachDetails: [],
      openPositions: [
        { symbol: 'BTCUSDm', ticket: '2624286108', floatingPnl: '-$19.30', time: '21:45' },
        { symbol: 'BTCUSDm', ticket: '2624286246', floatingPnl: '-$18.96', time: '21:45' },
      ],
      analysisParagraph: 'Your balance before the drawdown sequence was $1,938.09. The daily protection line sat at $1,900.00, and the equity curve fell through that level to $1,899.83, which is why the account was breached.',
      balanceLineLabel: 'Balance before trade: $1,938.09',
      limitLineLabel: 'Daily loss limit: $1,900.00',
      equityLineLabel: 'Equity movement',
      breachPointLabel: 'Breach at $1,899.83',
      guidance: [
        'Always use stop-loss to control downside risk',
        'Avoid stacking multiple high-risk positions',
        'Monitor equity, not just balance',
        'Reduce lot size during volatile market conditions',
      ],
    }],
    ['breach-report-max-dd.pdf', {
      accountNumber: '435406663',
      challengeId: 'CH-9012-ph2',
      traderName: 'John Doe',
      traderEmail: 'ada@example.com',
      accountSize: '₦200,000',
      phase: 'Phase 2',
      challengeType: 'NGN Standard',
      platform: 'mt5',
      currency: 'NGN',
      status: 'Breached',
      generatedAt,
      breachReason: 'MAX_DRAWDOWN',
      breachReasonLabel: 'Maximum Drawdown Breach',
      breachNarrative: 'Your account equity fell below the overall drawdown protection level calculated from your peak balance. The breach was permanent once that line was crossed.',
      breachTimeLabel: '21 Apr 2026',
      peakBalance: '₦240,000.00',
      balanceBeforeTrade: '₦205,000.00',
      equityAtBreach: '₦178,500.00',
      dailyLimit: '₦193,000.00',
      maxLimit: '₦178,600.00',
      dailyDrawdownUsageLabel: '84.12% used',
      maxDrawdownUsageLabel: '100.12% used',
      breachDetails: [],
      openPositions: [
        { symbol: 'XAUUSDm', ticket: '9981272', floatingPnl: '-₦14,500.00', time: '13:22' },
      ],
      analysisParagraph: 'The account first reached a peak balance of ₦240,000.00. From there, the maximum drawdown floor was ₦178,600.00. The equity line dropped to ₦178,500.00, which breached that line by ₦100.00.',
      balanceLineLabel: 'Peak balance reference: ₦240,000.00',
      limitLineLabel: 'Max drawdown floor: ₦178,600.00',
      equityLineLabel: 'Equity movement',
      breachPointLabel: 'Breach at ₦178,500.00',
      guidance: [
        'Lock profits after strong runs',
        'Reduce size after peak-equity expansion',
        'Avoid holding oversized losses',
        'Review overall account exposure continuously',
      ],
    }],
    ['breach-report-duration.pdf', {
      accountNumber: '435366798',
      challengeId: 'CH-9020',
      traderName: 'John Doe',
      traderEmail: 'lucky@example.com',
      accountSize: '$10,000',
      phase: 'Phase 1',
      challengeType: 'Two Step',
      platform: 'mt5',
      currency: 'USD',
      status: 'Breached',
      generatedAt,
      breachReason: 'MIN_TRADE_DURATION',
      breachReasonLabel: 'Minimum Trade Duration Breach',
      breachNarrative: 'The account breached the minimum trade duration rule after multiple trades were closed too quickly. This triggered the automated violation threshold.',
      breachTimeLabel: '21 Apr 2026',
      peakBalance: '$10,080.00',
      balanceBeforeTrade: '$10,012.00',
      equityAtBreach: '$9,988.00',
      dailyLimit: '$9,500.00',
      maxLimit: '$8,900.00',
      dailyDrawdownUsageLabel: '9.20% used',
      maxDrawdownUsageLabel: '1.01% used',
      showEquityChart: false,
      breachDetails: [],
      openPositions: [],
      earlyClosedTrades: [
        { symbol: 'EURUSDm', dealId: '7812451', duration: '1.42 min', closedAt: '21 Apr 2026 10:13' },
        { symbol: 'GBPUSDm', dealId: '7812457', duration: '2.05 min', closedAt: '21 Apr 2026 10:19' },
        { symbol: 'XAUUSDm', dealId: '7812470', duration: '2.48 min', closedAt: '21 Apr 2026 10:31' },
      ],
      analysisParagraph: 'This breach was not caused by equity crossing a drawdown line. It was triggered because multiple trades were closed before the minimum required holding period, which violated the program rules.',
      guidance: [
        'Let trades develop before closing',
        'Avoid ultra-short scalping patterns',
        'Track hold time per trade',
        'Review strategy execution discipline',
      ],
    }],
  ]

  const outputs = []
  for (const [filename, payload] of samples) {
    outputs.push(await writeBreachReportPreview(filename, payload))
  }

  console.log(JSON.stringify(outputs, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
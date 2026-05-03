import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopTradingAccountsPage.css'
import { fetchTradingObjectives, fetchPublicChallengePlans, type TradingObjectivesResponse, type PublicChallengePlan } from '../lib/traderAuth'

type PricingTier = {
  account: string
  price: string
  originalPrice?: string
  discountPrice?: string
  discountBadge?: string
}

type PricingTab = {
  key: 'twoPhase' | 'onePhase' | 'ngnStandard' | 'ngnOneStep' | 'ngnFlexi' | 'breezy'
  label: string
  tiers: PricingTier[]
  rules: string[]
}

type AccountView = {
  id?: string
  size: string
  drawdown: string
  target: string
  phases: string
  days: string
  payout: string
  fee: string
  status: 'available' | 'paused'
  profit_split: string
  challenge_type: 'two_step' | 'one_step' | 'ngn_standard' | 'ngn_one_step' | 'ngn_flexi' | 'breezy'
  phase: 'phase_1' | 'phase_2' | 'funded'
  description?: string
}

const pricingTabs: PricingTab[] = [
  {
    key: 'ngnStandard',
    label: 'NGN Standard',
    tiers: [
      { account: '₦200,000', price: '₦5,000' },
      { account: '₦500,000', price: '₦11,500' },
      { account: '₦800,000', price: '₦17,000' },
    ],
    rules: [],
  },
  {
    key: 'ngnOneStep',
    label: 'NGN 1 Step',
    tiers: [
      { account: '₦200,000', price: '₦6,000' },
      { account: '₦500,000', price: '₦13,800' },
      { account: '₦800,000', price: '₦20,400' },
    ],
    rules: [
      'Max Drawdown: 10%',
      'Max Daily Drawdown: 3%',
      'Phase 1 Profit Target: 10%',
      'Minimum Trading Days: 1',
      'Profit Split: 80%',
      'Withdrawals: Weekly',
    ],
  },
  {
    key: 'ngnFlexi',
    label: 'NGN Flexi',
    tiers: [
      { account: '₦200,000', price: '₦9,000' },
      { account: '₦500,000', price: '₦21,000' },
      { account: '₦800,000', price: '₦31,500' },
    ],
    rules: [],
  },
  {
    key: 'breezy',
    label: 'NGN Breezy',
    tiers: [
      { account: '₦200,000', price: '₦7,500' },
      { account: '₦500,000', price: '₦15,000' },
      { account: '₦800,000', price: '₦24,000' },
      { account: '₦1,000,000', price: '₦30,000' },
    ],
    rules: [
      'Challenge: None',
      'Daily DD: None',
      'Max DD: None',
      'Minimum Trades Required: 5',
      'Profit Split: Up to 100%',
      'Withdrawals: On Demand',
    ],
  },
  {
    key: 'twoPhase',
    label: '2 Step',
    tiers: [
      { account: '$2K', price: '$12' },
      { account: '$10K', price: '$81' },
      { account: '$30K', price: '$163' },
      { account: '$50K', price: '$203' },
      { account: '$100K', price: '$354' },
      { account: '$200K', price: '$681' },
    ],
    rules: [],
  },
  {
    key: 'onePhase',
    label: '1 Step',
    tiers: [
      { account: '$2K', price: '$26' },
      { account: '$10K', price: '$108' },
      { account: '$30K', price: '$203' },
      { account: '$50K', price: '$299' },
      { account: '$100K', price: '$450' },
      { account: '$200K', price: '$885' },
    ],
    rules: [],
  },
]

const formatAccountSize = (label: string) => {
  const trimmed = label.trim()
  if (trimmed.startsWith('₦')) return trimmed

  const normalized = trimmed.replace(/[^0-9km]/gi, '').toLowerCase()
  if (!normalized) return label

  const multiplier = normalized.includes('m') ? 1_000_000 : normalized.includes('k') ? 1_000 : 1
  const number = parseFloat(normalized.replace(/[km]/g, '')) * multiplier

  if (Number.isNaN(number)) return label
  return `$${number.toLocaleString('en-US')}`
}

const normalizeDisplayPrice = (value: string | number | null | undefined, currency?: string | null) => {
  if (value == null) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (raw.startsWith('$') || raw.startsWith('₦')) return raw

  const numeric = Number(raw.replace(/[^0-9.\-]/g, ''))
  if (!Number.isFinite(numeric)) return raw

  const normalizedCurrency = String(currency ?? '').toUpperCase() === 'NGN' ? 'NGN' : 'USD'
  return normalizedCurrency === 'NGN'
    ? `₦${numeric.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : `$${numeric.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const DesktopTradingAccountsPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<PricingTab>(() => pricingTabs[0] as PricingTab)
  const [planPrices, setPlanPrices] = useState<Record<string, PublicChallengePlan[]>>({})
  const [objectiveRules, setObjectiveRules] = useState<Record<string, string[]>>({})
  const effectiveRules = objectiveRules[activeTab.key] ?? activeTab.rules
  const visibleRules = effectiveRules.filter((rule) => !rule.toLowerCase().includes('minimum trade duration'))

  useEffect(() => {
    const loadObjectives = async () => {
      try {
        const response = (await fetchTradingObjectives()) as TradingObjectivesResponse
        const rules = ((response.rules as { challenge_types?: any[] } | undefined)?.challenge_types ?? []) as any[]

        const next: Record<string, string[]> = {}

        const buildMergedRules = (phases: any[]) => {
          const aggregated = new Map<string, string[]>()
          const results: string[] = []

          phases.forEach((phase: any) => {
            const fallbackPhaseLabel = phase.key === 'phase_1'
              ? 'Phase 1'
              : phase.key === 'phase_2'
                ? 'Phase 2'
                : phase.label
            const phaseLabel = fallbackPhaseLabel?.toLowerCase().includes('phase') ? fallbackPhaseLabel : null
            phase.rules.forEach((rule: any) => {
              if (rule.key === 'profit_target' && phaseLabel) {
                results.push(`${phaseLabel} Profit Target: ${rule.value}`)
                return
              }

              const label = rule.label
              const list = aggregated.get(label) ?? []
              if (!list.includes(rule.value)) {
                list.push(rule.value)
              }
              aggregated.set(label, list)
            })
          })

          aggregated.forEach((values, label) => {
            if (values.length === 1) {
              results.push(`${label}: ${values[0]}`)
            } else {
              results.push(`${label}: ${values.join(' / ')}`)
            }
          })

          return results
        }
        rules.forEach((challenge: any) => {
          if (challenge.key === 'two_step') {
            next.twoPhase = buildMergedRules(challenge.phases)
            return
          }

          if (challenge.key === 'one_step') {
            next.onePhase = buildMergedRules(challenge.phases)
            return
          }

          if (challenge.key === 'ngn_standard') {
            next.ngnStandard = buildMergedRules(challenge.phases)
            return
          }

          if (challenge.key === 'ngn_one_step') {
            next.ngnOneStep = buildMergedRules(challenge.phases)
            return
          }

          if (challenge.key === 'ngn_flexi') {
            next.ngnFlexi = buildMergedRules(challenge.phases)
          }
        })
        if (!next.ngnOneStep || next.ngnOneStep.length === 0) {
          next.ngnOneStep = [
            'Max Drawdown: 10%',
            'Max Daily Drawdown: 3%',
            'Phase 1 Profit Target: 10%',
            'Minimum Trading Days: 1',
            'Profit Split: 80%',
            'Withdrawals: Weekly',
          ]
        }
        setObjectiveRules(next)
      } catch (err) {
        console.error('Failed to load trading objectives', err)
      }
    }

    loadObjectives()
  }, [])

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plans = await fetchPublicChallengePlans()
        const grouped: Record<string, PublicChallengePlan[]> = {}
        plans.forEach((plan) => {
          const key = plan.challenge_type ?? 'two_step'
          if (!grouped[key]) {
            grouped[key] = []
          }
          grouped[key].push(plan)
        })
        setPlanPrices(grouped)
      } catch (error) {
        console.error('Failed to load challenge plans', error)
      }
    }

    loadPlans()
  }, [])

  const accounts = useMemo(() => {
    const getRuleValue = (prefixes: string[]) => {
      const rule = effectiveRules.find((item) =>
        prefixes.some((prefix) => item.toLowerCase().startsWith(prefix.toLowerCase()))
      )
      return rule ? rule.split(':').slice(1).join(':').trim() : 'N/A'
    }

    const challengeKey = activeTab.key === 'onePhase'
      ? 'one_step'
      : activeTab.key === 'ngnStandard'
          ? 'ngn_standard'
          : activeTab.key === 'ngnOneStep'
            ? 'ngn_one_step'
          : activeTab.key === 'ngnFlexi'
            ? 'ngn_flexi'
            : activeTab.key === 'breezy'
              ? 'breezy'
            : 'two_step'
    const availablePlans = planPrices[challengeKey] ?? []

    const resolvePlanForTier = (tier: PricingTier) => {
      const normalizedTier = tier.account.replace(/[^0-9]/g, '')
      return availablePlans.find((plan) => plan.account_size?.replace(/[^0-9]/g, '') === normalizedTier)
    }

    return activeTab.tiers.map((tier) => {
      const matchedPlan = resolvePlanForTier(tier)
      const isNgnAccount = tier.account.trim().startsWith('₦')
      const planId = isNgnAccount
        ? tier.account.replace(/[^0-9]/g, '')
        : tier.account.replace(/[^0-9km.]/gi, '').toLowerCase()
      const challengeType = challengeKey
      const phase = 'phase_1'
      const resolvedCurrency = matchedPlan?.currency
        ?? (isNgnAccount ? 'NGN' : 'USD')
      const fee = normalizeDisplayPrice(
        matchedPlan?.price ? `${matchedPlan.price}` : (tier.discountPrice ?? tier.price),
        resolvedCurrency
      )
      const status = matchedPlan?.status?.toLowerCase() === 'paused' ? 'paused' : 'available'
      return {
        id: matchedPlan?.id ?? planId,
        size: tier.account,
        drawdown: getRuleValue(['Max Drawdown', 'Daily Drawdown', 'Max Daily Drawdown']),
        target: getRuleValue(['Phase 1 Profit Target', 'Profit Target']),
        phases: activeTab.label,
        days: 'N/A',
        payout: getRuleValue(['Withdrawals']),
        fee,
        status,
        profit_split: getRuleValue(['Profit Split']),
        challenge_type: challengeType as AccountView['challenge_type'],
        phase,
        description: activeTab.key === 'breezy' ? 'Weekly subscription · bank transfer only' : undefined,
      }
    })
  }, [activeTab, effectiveRules, planPrices])

  const isPurchaseRestricted = (tabKey: PricingTab['key']) => {
    const challengeKey = tabKey === 'onePhase'
      ? 'one_step'
      : tabKey === 'ngnStandard'
          ? 'ngn_standard'
          : tabKey === 'ngnOneStep'
            ? 'ngn_one_step'
          : tabKey === 'ngnFlexi'
            ? 'ngn_flexi'
            : tabKey === 'breezy'
              ? 'breezy'
              : 'two_step'

    if (['two_step', 'one_step'].includes(challengeKey)) {
      return (planPrices[challengeKey] ?? []).length === 0
    }

    return false
  }

  return (
    <div className="desktop-trading-accounts-page">
      <DesktopHeader />
      <DesktopSidebar />

      <div className="trading-accounts-content">
        <div className="page-header trading-accounts-header">
          <h1>Trading Accounts</h1>
          <p>Choose your account size and start your challenge.</p>
        </div>

        <div className="pricing-tabs">
          {pricingTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab)}
              className={`pricing-tab ${activeTab.key === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pricing-panel">
          <p className="pricing-eyebrow">Machefunded — Account Sizes &amp; Pricing</p>
          <div className="pricing-grid">
            {activeTab.tiers.map((tier, index) => (
              <div key={`${activeTab.key}-${tier.account}-${index}`} className="pricing-tier">
                {tier.discountBadge && (
                  <span className="pricing-badge">{tier.discountBadge}</span>
                )}
                <div className="pricing-tier-glow" />
                <div className="pricing-tier-header">
                  <div className="pricing-tier-account">{formatAccountSize(tier.account)}</div>
                </div>
                <div className="pricing-tier-details">
                  {visibleRules.map((rule) => (
                    <div key={rule} className="pricing-detail">
                      <span className="pricing-bullet">•</span>
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
                <div className="pricing-tier-price pricing-tier-price--bottom">
                  {tier.discountPrice ? (
                    <div className="pricing-price-stack">
                      <span className="pricing-price-old">{tier.originalPrice}</span>
                      <span className="pricing-price-current">{tier.discountPrice}</span>
                    </div>
                  ) : (
                    <span className="pricing-price-current">{accounts[index]?.fee ?? tier.price}</span>
                  )}
                </div>
                <button
                  className="pricing-tier-button"
                  disabled={isPurchaseRestricted(activeTab.key)}
                  onClick={() => navigate(
                    window.matchMedia('(max-width: 768px)').matches ? '/mobile-start-challenge' : '/start-challenge',
                    { state: accounts[index] },
                  )}
                >
                  {isPurchaseRestricted(activeTab.key) ? 'Temporarily Unavailable' : activeTab.key === 'breezy' ? 'Activate Now' : 'Start Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DesktopFooter />
    </div>
  )
}

export default DesktopTradingAccountsPage
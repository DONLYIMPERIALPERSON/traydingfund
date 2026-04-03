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
  key: 'twoPhase' | 'onePhase' | 'instant' | 'ngnStandard' | 'ngnFlexi'
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
  challenge_type: 'two_step' | 'one_step' | 'instant_funded' | 'ngn_standard' | 'ngn_flexi'
  phase: 'phase_1' | 'phase_2' | 'funded'
}

const pricingTabs: PricingTab[] = [
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
  {
    key: 'instant',
    label: 'Instant Funded',
    tiers: [
      { account: '$2K', price: '$53' },
      { account: '$10K', price: '$163' },
      { account: '$30K', price: '$381' },
      { account: '$50K', price: '$612' },
      { account: '$100K', price: '$1091' },
      { account: '$200K', price: '$1910' },
    ],
    rules: [],
  },
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
    key: 'ngnFlexi',
    label: 'NGN Flexi',
    tiers: [
      { account: '₦200,000', price: '₦9,000' },
      { account: '₦500,000', price: '₦21,000' },
      { account: '₦800,000', price: '₦31,500' },
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

const DesktopTradingAccountsPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<PricingTab>(() => pricingTabs[0] as PricingTab)
  const [planPrices, setPlanPrices] = useState<Record<string, PublicChallengePlan[]>>({})
  const [objectiveRules, setObjectiveRules] = useState<Record<string, string[]>>({})
  const effectiveRules = objectiveRules[activeTab.key] ?? activeTab.rules

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

          if (challenge.key === 'instant_funded') {
            const instant = challenge.phases[0]
            next.instant = instant?.rules.map((rule: any) => `${rule.label}: ${rule.value}`) ?? []
            return
          }

          if (challenge.key === 'ngn_standard') {
            next.ngnStandard = buildMergedRules(challenge.phases)
            return
          }

          if (challenge.key === 'ngn_flexi') {
            next.ngnFlexi = buildMergedRules(challenge.phases)
          }
        })
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
      : activeTab.key === 'instant'
        ? 'instant_funded'
        : activeTab.key === 'ngnStandard'
          ? 'ngn_standard'
          : activeTab.key === 'ngnFlexi'
            ? 'ngn_flexi'
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
      const phase = activeTab.key === 'instant'
        ? 'funded'
        : 'phase_1'
      const fee = matchedPlan?.price ? `${matchedPlan.price}` : (tier.discountPrice ?? tier.price)
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
        challenge_type: challengeType,
        phase,
      }
    })
  }, [activeTab, effectiveRules, planPrices])

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
                  {effectiveRules.map((rule) => (
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
                  onClick={() => navigate('/start-challenge', { state: accounts[index] })}
                >
                  Start Now
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
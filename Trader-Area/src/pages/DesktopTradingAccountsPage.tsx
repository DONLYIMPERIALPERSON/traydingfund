import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopTradingAccountsPage.css'

type PricingTier = {
  account: string
  price: string
  originalPrice?: string
  discountPrice?: string
  discountBadge?: string
}

type PricingTab = {
  key: 'twoPhase' | 'onePhase' | 'instant'
  label: string
  tiers: PricingTier[]
  rules: string[]
}

type AccountView = {
  size: string
  drawdown: string
  target: string
  phases: string
  days: string
  payout: string
  fee: string
  status: 'available' | 'paused'
  profit_split: string
}

const pricingTabs: PricingTab[] = [
  {
    key: 'twoPhase',
    label: '2 Step',
    tiers: [
      { account: '$2K', price: '$12', originalPrice: '$12', discountPrice: '$5', discountBadge: '58% OFF' },
      { account: '$10K', price: '$81' },
      { account: '$30K', price: '$163' },
      { account: '$50K', price: '$203' },
      { account: '$100K', price: '$354' },
      { account: '$200K', price: '$681' },
    ],
    rules: [
      'Max Drawdown: 15%',
      'Phase 1 Target: 10%',
      'Phase 2 Target: 5%',
      'Profit Split: 80%',
      'Withdrawals: Weekly',
      'Minimum Trade Duration Rule: Closing any trade in under 5 minutes is a breach',
    ],
  },
  {
    key: 'onePhase',
    label: '1 Step',
    tiers: [
      { account: '$2K', price: '$26', originalPrice: '$26', discountPrice: '$11', discountBadge: '58% OFF' },
      { account: '$10K', price: '$108' },
      { account: '$30K', price: '$203' },
      { account: '$50K', price: '$299' },
      { account: '$100K', price: '$450' },
      { account: '$200K', price: '$885' },
    ],
    rules: [
      'Max Drawdown: 15%',
      'Profit Target: 10%',
      'Profit Split: 80%',
      'Withdrawals: Weekly',
      'Minimum Trade Duration Rule: Closing any trade in under 5 minutes is a breach',
    ],
  },
  {
    key: 'instant',
    label: 'Instant Funded',
    tiers: [
      { account: '$2K', price: '$53', originalPrice: '$53', discountPrice: '$22', discountBadge: '58% OFF' },
      { account: '$10K', price: '$163' },
      { account: '$30K', price: '$381' },
      { account: '$50K', price: '$612' },
      { account: '$100K', price: '$1091' },
      { account: '$200K', price: '$1910' },
    ],
    rules: [
      'Daily Drawdown: 2%',
      'Max Drawdown: 5%',
      'Profit Split: 50%',
      'Withdrawals: Every 14 days',
      'Minimum Trade Duration Rule: Closing any trade in under 5 minutes is a breach',
    ],
  },
]

const formatAccountSize = (label: string) => {
  const normalized = label.replace(/[^0-9km]/gi, '').toLowerCase()
  if (!normalized) return label

  const multiplier = normalized.includes('m') ? 1_000_000 : normalized.includes('k') ? 1_000 : 1
  const number = parseFloat(normalized.replace(/[km]/g, '')) * multiplier

  if (Number.isNaN(number)) return label
  return `$${number.toLocaleString('en-US')}`
}

const DesktopTradingAccountsPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<PricingTab>(pricingTabs[0])

  const accounts = useMemo(() => {
    const getRuleValue = (prefixes: string[]) => {
      const rule = activeTab.rules.find((item) =>
        prefixes.some((prefix) => item.toLowerCase().startsWith(prefix.toLowerCase()))
      )
      return rule ? rule.split(':').slice(1).join(':').trim() : 'N/A'
    }

    return activeTab.tiers.map((tier) => ({
      size: tier.account,
      drawdown: getRuleValue(['Max Drawdown', 'Daily Drawdown']),
      target: getRuleValue(['Phase 1 Target', 'Profit Target']),
      phases: activeTab.label,
      days: 'N/A',
      payout: getRuleValue(['Withdrawals']),
      fee: tier.discountPrice ?? tier.price,
      status: 'available' as const,
      profit_split: getRuleValue(['Profit Split']),
    }))
  }, [activeTab])

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
                  {activeTab.rules.map((rule) => (
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
                    <span className="pricing-price-current">{tier.price}</span>
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
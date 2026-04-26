import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import '../styles/MobileAffiliatePage.css'
import {
  fetchAffiliateDashboard,
  requestAffiliatePayout,
} from '../lib/affiliateApi'
import { formatReadableDateTime } from '../lib/dateFormat'
import type { AffiliateDashboard } from '../lib/affiliateApi'

const MobileAffiliatePage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'payouts' | 'transactions' | 'request'>('payouts')
  const [dashboardData, setDashboardData] = useState<AffiliateDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestingPayout, setRequestingPayout] = useState(false)

  useEffect(() => {
    void loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAffiliateDashboard()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load affiliate data')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyReferralLink = async () => {
    if (dashboardData?.referral_link) {
      await navigator.clipboard.writeText(dashboardData.referral_link)
    }
  }

  const handleRequestPayout = async () => {
    if (!dashboardData?.stats.available_balance || dashboardData.stats.available_balance <= 0) {
      window.alert('No available balance to withdraw')
      return
    }

    try {
      setRequestingPayout(true)
      await requestAffiliatePayout()
      window.alert('Payout requested successfully!')
      await loadDashboardData()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to request payout')
    } finally {
      setRequestingPayout(false)
    }
  }

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) {
    return (
      <div className="mobile-affiliate-page">
        <div className="mobile-affiliate-shell">
          <div className="mobile-affiliate-empty">Loading affiliate data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mobile-affiliate-page">
        <div className="mobile-affiliate-shell">
          <ServiceUnavailableState onRetry={() => void loadDashboardData()} />
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-affiliate-page">
      <div className="mobile-affiliate-shell">
        <header className="mobile-affiliate-header">
          <button type="button" className="mobile-affiliate-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-affiliate-header__text">
            <h1>Affiliate</h1>
            <p>Earn commissions by referring traders to MacheFunded.</p>
          </div>
          <button type="button" className="mobile-affiliate-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-affiliate-card">
          <h2>Your Referral Link</h2>
          <div className="mobile-affiliate-referral-box">
            <input type="text" value={dashboardData?.referral_link || 'Loading...'} readOnly />
            <button type="button" onClick={() => void handleCopyReferralLink()}>Copy</button>
          </div>
        </section>

        <section className="mobile-affiliate-stats-grid">
          <article className="mobile-affiliate-stat-card">
            <span>Available Balance</span>
            <strong>{formatCurrency(dashboardData?.stats.available_balance || 0)}</strong>
          </article>
          <article className="mobile-affiliate-stat-card">
            <span>Total Earned</span>
            <strong>{formatCurrency(dashboardData?.stats.total_earned || 0)}</strong>
          </article>
          <article className="mobile-affiliate-stat-card">
            <span>Referrals</span>
            <strong>{dashboardData?.stats.referrals || 0}</strong>
          </article>
        </section>

        <section className="mobile-affiliate-card">
          <div className="mobile-affiliate-tabs">
            <button type="button" className={activeTab === 'payouts' ? 'is-active' : ''} onClick={() => setActiveTab('payouts')}>Payouts</button>
            <button type="button" className={activeTab === 'transactions' ? 'is-active' : ''} onClick={() => setActiveTab('transactions')}>Transactions</button>
            <button type="button" className={activeTab === 'request' ? 'is-active' : ''} onClick={() => setActiveTab('request')}>Request</button>
          </div>

          {activeTab === 'transactions' ? (
            <div className="mobile-affiliate-list">
              {dashboardData?.recent_transactions.length ? dashboardData.recent_transactions.map((transaction, index) => (
                <article key={index} className="mobile-affiliate-list-item">
                  <div>
                    <strong>{transaction.type}</strong>
                    <p>{formatReadableDateTime(transaction.date)}</p>
                  </div>
                  <span>{formatCurrency(transaction.commission)}</span>
                </article>
              )) : <div className="mobile-affiliate-empty-inline">No transactions yet</div>}
            </div>
          ) : null}

          {activeTab === 'payouts' ? (
            <div className="mobile-affiliate-list">
              {dashboardData?.recent_payouts.length ? dashboardData.recent_payouts.map((payout, index) => (
                <article key={index} className="mobile-affiliate-list-item">
                  <div>
                    <strong>{formatReadableDateTime(payout.date)}</strong>
                    <p>{payout.status}</p>
                  </div>
                  <span>{formatCurrency(payout.amount)}</span>
                </article>
              )) : <div className="mobile-affiliate-empty-inline">No payouts yet</div>}
            </div>
          ) : null}

          {activeTab === 'request' ? (
            <div className="mobile-affiliate-request-box">
              <p>
                {dashboardData?.bank_details
                  ? `Saved payout method: ${dashboardData.bank_details.account_name} — ${dashboardData.bank_details.bank_name} (${dashboardData.bank_details.account_number})`
                  : dashboardData?.payout_method_type === 'crypto'
                    ? 'Saved payout method: Crypto wallet configured. See Settings for details.'
                    : 'No payout method saved. Please configure your payout details in Settings before requesting payouts.'}
              </p>
              <button type="button" onClick={() => void handleRequestPayout()} disabled={requestingPayout || !dashboardData?.stats.available_balance}>
                {requestingPayout ? 'Requesting...' : 'Withdraw Now'}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default MobileAffiliatePage
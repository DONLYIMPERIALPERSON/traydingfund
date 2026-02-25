import { useEffect, useState } from 'react'
import { fetchDashboardStats } from '../lib/adminAuth'
import './DashboardPage.css'

interface DashboardPageProps {
  onNavigate: (page: 'coupons' | 'sendAnnouncement') => void
}

interface DashboardData {
  kpis: {
    totalRevenue: string
    totalRevenueChange: number
    todaySales: string
    todaySalesChange: number
    totalPayouts: string
    totalPayoutsChange: number
    newSignups: number
    newSignupsChange: number
    activeChallengeAccounts: number
    activeChallengeAccountsChange: number
    passRate: string
    passRateChange: number
    pendingPayoutRequests: string
    pendingPayoutRequestsChange: number
    todayApprovedPayouts: string
    todayApprovedPayoutsChange: number
  }
  operationsQueues: {
    payoutsPendingReview: number
    payoutsOldestHours: number
    supportTicketsOpen: number
    supportTicketsOldestHours: number
    provisioningFailures: number
    webhookFailures: number
  }
  challengeOutcomes: {
    passed: number
    failed: number
    expired: number
  }
  accountCounts: {
    ready: number
    phase1: number
    phase2: number
    funded: number
  }
  supportOverview: {
    openTickets: number
    avgFirstResponse: string
    avgResolution: string
  }
  systemHealth: {
    brokerBridge: string
    tradeIngestionLag: string
    webhooksSuccess: string
    emailBounce: string
    kycProvider: string
  }
}

const DashboardPage = ({ onNavigate }: DashboardPageProps) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchDashboardStats()
        setDashboardData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        console.error('Dashboard data loading error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const getChangeClass = (change: number) => {
    if (change > 0) return 'up'
    if (change < 0) return 'down'
    return ''
  }

  const getChangeText = (change: number) => {
    if (change === 0) return 'No change'
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  const getSLAStatus = (hours: number) => {
    if (hours <= 12) return { status: 'on-track', text: 'On Track' }
    if (hours <= 24) return { status: 'at-risk', text: 'At Risk' }
    return { status: 'overdue', text: 'Overdue' }
  }

  const getSystemHealthStatus = (value: string) => {
    if (value.includes('Connected') || value.includes('Up') || value.includes('98') || value.includes('99')) {
      return 'ok'
    }
    if (value.includes('Warn') || value.includes('2.') || value.includes('3.') || value.includes('4m')) {
      return 'warn'
    }
    return 'error'
  }

  if (loading) {
    return (
      <section className="analysis-dashboard admin-page-stack">
        <div className="admin-dashboard-card">
          <h2>Dashboard</h2>
          <p>Loading dashboard data...</p>
        </div>
      </section>
    )
  }

  if (error || !dashboardData) {
    return (
      <section className="analysis-dashboard admin-page-stack">
        <div className="admin-dashboard-card">
          <h2>Dashboard</h2>
          <p className="error">Error: {error || 'Failed to load dashboard data'}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </section>
    )
  }

  const { kpis, operationsQueues, challengeOutcomes, accountCounts, supportOverview, systemHealth } = dashboardData

  return (
    <section className="analysis-dashboard admin-page-stack">
      <header className="analysis-topbar admin-dashboard-card">
        <div className="analysis-topbar-filters">
          <label>
            Date Range
            <select>
              <option>Today</option>
              <option>7d</option>
              <option>30d</option>
              <option>Custom</option>
            </select>
          </label>
          <label>
            Segment
            <select>
              <option>All</option>
              <option>Challenge Phase 1</option>
              <option>Challenge Phase 2</option>
              <option>Funded</option>
            </select>
          </label>
          <label>
            Plan
            <select>
              <option>All Plans</option>
              <option>$10k 1-Step</option>
              <option>$50k 2-Step</option>
              <option>$100k 2-Step</option>
            </select>
          </label>
          <label>
            Server
            <select>
              <option>All Servers</option>
              <option>MT5-Live-01</option>
              <option>MT5-Live-02</option>
              <option>cTrader-Live</option>
            </select>
          </label>
        </div>

        <div className="analysis-topbar-actions">
          <button type="button" onClick={() => onNavigate('coupons')}>Create Coupon</button>
          <button type="button" onClick={() => onNavigate('sendAnnouncement')}>Send Announcement</button>
        </div>
      </header>

      <div className="admin-kpi-grid analysis-kpi-grid">
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Total Revenue</h3>
          <strong>{kpis.totalRevenue}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.totalRevenueChange)}`}>
            {getChangeText(kpis.totalRevenueChange)} vs prev
          </p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Today's Sales</h3>
          <strong>{kpis.todaySales}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.todaySalesChange)}`}>
            {getChangeText(kpis.todaySalesChange)} vs yesterday
          </p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Total Payouts</h3>
          <strong>{kpis.totalPayouts}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.totalPayoutsChange)}`}>
            {getChangeText(kpis.totalPayoutsChange)} vs prev
          </p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>New Signups</h3>
          <strong>{kpis.newSignups.toLocaleString()}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.newSignupsChange)}`}>
            {getChangeText(kpis.newSignupsChange)} vs prev
          </p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Active Challenge Accounts</h3>
          <strong>{kpis.activeChallengeAccounts.toLocaleString()}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.activeChallengeAccountsChange)}`}>
            {getChangeText(kpis.activeChallengeAccountsChange)} vs prev
          </p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Pass Rate</h3>
          <strong>{kpis.passRate}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.passRateChange)}`}>
            {getChangeText(kpis.passRateChange)} vs prev
          </p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Pending Payout Requests</h3>
          <strong>{kpis.pendingPayoutRequests}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.pendingPayoutRequestsChange)}`}>
            {getChangeText(kpis.pendingPayoutRequestsChange)} vs prev
          </p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Today's Approved Payouts</h3>
          <strong>{kpis.todayApprovedPayouts}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.todayApprovedPayoutsChange)}`}>
            {getChangeText(kpis.todayApprovedPayoutsChange)} vs prev
          </p>
          <span className="kpi-sparkline" />
        </article>
      </div>

      <div className="admin-dashboard-card">
        <h3>Operations Queues</h3>
        <div className="ops-queue-grid">
<article className="ops-tile">
  <h4>Payouts Pending Review</h4>
  <strong>{operationsQueues.payoutsPendingReview}</strong>
  <p>Oldest: {operationsQueues.payoutsOldestHours}h</p>
  <span className={`sla ${getSLAStatus(operationsQueues.payoutsOldestHours).status}`}>
    {getSLAStatus(operationsQueues.payoutsOldestHours).text}
  </span>
</article>
<article className="ops-tile">
  <h4>Support Tickets Open</h4>
  <strong>{operationsQueues.supportTicketsOpen}</strong>
  <p>Oldest: {operationsQueues.supportTicketsOldestHours}h</p>
  <span className={`sla ${getSLAStatus(operationsQueues.supportTicketsOldestHours).status}`}>
    {getSLAStatus(operationsQueues.supportTicketsOldestHours).text}
  </span>
</article>
        </div>
      </div>

      <div className="analysis-two-col">
        <div className="admin-dashboard-card">
          <h3>Top Performing Traders</h3>
          <p className="analysis-note">Real trader data will be available once trading data is integrated</p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Trader</th>
                <th>Account ID</th>
                <th>Profit (30d)</th>
                <th>Win Rate</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  Trading performance data not yet available
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="admin-dashboard-card">
          <h3>Rule Breach Summary</h3>
          <p className="analysis-note">Breach data will be available once trading rules are implemented</p>
          <ul className="analysis-rule-list">
            <li><span>Max DD Breaches</span><strong>0</strong></li>
            <li><span>5 Mins Rule Breaches</span><strong>0</strong></li>
            <li><span>Other Rule Breaches</span><strong>0</strong></li>
          </ul>
        </div>
      </div>

      <div className="admin-dashboard-card">
        <h3>Challenge Outcomes</h3>
        <ul className="analysis-rule-list">
          <li><span>Passed</span><strong>{challengeOutcomes.passed}</strong></li>
          <li><span>Failed</span><strong>{challengeOutcomes.failed}</strong></li>
          <li><span>Expired</span><strong>{challengeOutcomes.expired}</strong></li>
        </ul>
      </div>

      <div className="admin-dashboard-card">
        <h3>Account Counts by Stage</h3>
        <ul className="analysis-rule-list">
          <li><span>Ready</span><strong>{accountCounts.ready}</strong></li>
          <li><span>Phase 1</span><strong>{accountCounts.phase1}</strong></li>
          <li><span>Phase 2</span><strong>{accountCounts.phase2}</strong></li>
          <li><span>Funded</span><strong>{accountCounts.funded}</strong></li>
        </ul>
      </div>

      <div className="analysis-two-col">
        <div className="admin-dashboard-card">
          <h3>Support Overview</h3>
          <ul className="analysis-rule-list">
            <li><span>Open Tickets</span><strong>{supportOverview.openTickets}</strong></li>
            <li><span>Avg First Response</span><strong>{supportOverview.avgFirstResponse}</strong></li>
            <li><span>Avg Resolution</span><strong>{supportOverview.avgResolution}</strong></li>
          </ul>
        </div>

        <div className="admin-dashboard-card">
          <h3>System Health</h3>
          <div className="status-grid">
            <span className={`status-chip ${getSystemHealthStatus(systemHealth.brokerBridge)}`}>
              Broker Bridge: {systemHealth.brokerBridge}
            </span>
            <span className={`status-chip ${getSystemHealthStatus(systemHealth.tradeIngestionLag)}`}>
              Trade Ingestion Lag: {systemHealth.tradeIngestionLag}
            </span>
            <span className={`status-chip ${getSystemHealthStatus(systemHealth.webhooksSuccess)}`}>
              Webhooks Success: {systemHealth.webhooksSuccess}
            </span>
            <span className={`status-chip ${getSystemHealthStatus(systemHealth.emailBounce)}`}>
              Email Bounce: {systemHealth.emailBounce}
            </span>
            <span className={`status-chip ${getSystemHealthStatus(systemHealth.kycProvider)}`}>
              KYC Provider: {systemHealth.kycProvider}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-dashboard-card">
        <h3>Recent System Events</h3>
        <p className="analysis-note">System event logs will be available once logging is fully implemented</p>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Service</th>
              <th>Severity</th>
              <th>Message</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No recent system events
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default DashboardPage

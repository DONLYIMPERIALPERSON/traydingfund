import { useEffect, useState } from 'react'
import { fetchDashboardStats } from '../lib/adminMock'
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

  const { kpis } = dashboardData

  return (
    <section className="analysis-dashboard admin-page-stack">
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
          <h3>Total Payouts</h3>
          <strong>{kpis.totalPayouts}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.totalPayoutsChange)}`}>
            {getChangeText(kpis.totalPayoutsChange)} vs prev
          </p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Today's Revenue</h3>
          <strong>{kpis.todaySales}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.todaySalesChange)}`}>
            {getChangeText(kpis.todaySalesChange)} vs yesterday
          </p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Today's Payout</h3>
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
          <h3>Active Funded Accounts</h3>
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
          <h3>Today's Breached Account</h3>
          <strong>{kpis.todayApprovedPayouts}</strong>
          <p className={`kpi-meta ${getChangeClass(kpis.todayApprovedPayoutsChange)}`}>
            {getChangeText(kpis.todayApprovedPayoutsChange)} vs prev
          </p>
          <span className="kpi-sparkline" />
        </article>
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

    </section>
  )
}

export default DashboardPage

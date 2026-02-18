import type { AdminUser } from './UsersPage'
import './ReferralsPage.css'

const referralKpis = [
  { label: 'Total Affiliates', value: '4,218' },
  { label: 'Active Affiliates (30d)', value: '1,096' },
  { label: 'Total Referred Users', value: '18,442' },
  { label: 'Converted Traders', value: '6,804' },
  { label: 'Conversion Rate', value: '36.9%' },
  { label: 'Total Commission Paid', value: '₦84,220,000' },
  { label: 'Pending Commission', value: '₦5,740,000' },
  { label: 'Fraud / Self-referral Flags', value: '27' },
]

const topAffiliates: Array<{
  id: string
  name: string
  email: string
  code: string
  referred: number
  converted: number
  conversion: string
  commissionEarned: string
  pendingPayout: string
  lastActivity: string
  risk: string
  user: AdminUser
}> = [
  {
    id: 'AFF-1022',
    name: 'Favour M.',
    email: 'favour@mail.com',
    code: 'FAVOUR22',
    referred: 123,
    converted: 48,
    conversion: '39.0%',
    commissionEarned: '₦2,820,000',
    pendingPayout: '₦240,000',
    lastActivity: '2h ago',
    risk: 'Low',
    user: { name: 'Favour M.', email: 'favour@mail.com', accounts: '2 / 1', revenue: '₦1,280,000', orders: '6', payouts: '₦280,000' },
  },
  {
    id: 'AFF-1184',
    name: 'Chinedu A.',
    email: 'chinedu@mail.com',
    code: 'CHI-TRADES',
    referred: 96,
    converted: 32,
    conversion: '33.3%',
    commissionEarned: '₦1,940,000',
    pendingPayout: '₦180,000',
    lastActivity: '5h ago',
    risk: 'Medium',
    user: { name: 'Chinedu A.', email: 'chinedu@mail.com', accounts: '3 / 1', revenue: '₦2,940,000', orders: '11', payouts: '₦620,000' },
  },
  {
    id: 'AFF-1230',
    name: 'Grace O.',
    email: 'grace@mail.com',
    code: 'GRACEFX',
    referred: 84,
    converted: 27,
    conversion: '32.1%',
    commissionEarned: '₦1,420,000',
    pendingPayout: '₦120,000',
    lastActivity: '1d ago',
    risk: 'Low',
    user: { name: 'Grace O.', email: 'grace@mail.com', accounts: '1 / 0', revenue: '₦490,000', orders: '2', payouts: '₦0' },
  },
]

interface ReferralsPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const ReferralsPage = ({ onOpenProfile }: ReferralsPageProps) => {
  return (
    <section className="admin-page-stack referrals-page">
      <div className="admin-dashboard-card">
        <h2>Referrals / Affiliates</h2>
        <p>Commission performance, conversion quality, payout liabilities, and referral abuse monitoring.</p>
      </div>

      <div className="admin-kpi-grid referrals-kpi-grid">
        {referralKpis.map((kpi) => (
          <article key={kpi.label} className="admin-kpi-card">
            <h3>{kpi.label}</h3>
            <strong>{kpi.value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-dashboard-card">
        <h3>Top Affiliates (Performance + Risk)</h3>
        <div className="admin-table-card referrals-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Affiliate</th>
                <th>Code</th>
                <th>Referred</th>
                <th>Converted</th>
                <th>CVR</th>
                <th>Commission Earned</th>
                <th>Pending Payout</th>
                <th>Last Activity</th>
                <th>Risk</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {topAffiliates.map((affiliate) => (
                <tr key={affiliate.id}>
                  <td>
                    <div className="ref-aff-name">{affiliate.name}</div>
                    <div className="ref-aff-email">{affiliate.email}</div>
                  </td>
                  <td>{affiliate.code}</td>
                  <td>{affiliate.referred}</td>
                  <td>{affiliate.converted}</td>
                  <td>{affiliate.conversion}</td>
                  <td>{affiliate.commissionEarned}</td>
                  <td>{affiliate.pendingPayout}</td>
                  <td>{affiliate.lastActivity}</td>
                  <td>
                    <span className={`ref-risk-chip ${affiliate.risk.toLowerCase()}`}>{affiliate.risk}</span>
                  </td>
                  <td>
                    <button type="button" className="ref-view-btn" onClick={() => onOpenProfile(affiliate.user)}>
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-dashboard-card">
        <h3>Admin Checks Needed</h3>
        <ul className="admin-list">
          <li>Watch for self-referrals (same device / IP / payment instrument matches).</li>
          <li>Review unusually high conversion spikes in short windows.</li>
          <li>Confirm payout eligibility vs refund/chargeback exposure before approval.</li>
          <li>Track inactive affiliates with high pending commissions.</li>
        </ul>
      </div>
    </section>
  )
}

export default ReferralsPage

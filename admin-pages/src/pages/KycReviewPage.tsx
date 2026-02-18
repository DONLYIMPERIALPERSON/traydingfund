import './KycReviewPage.css'
import type { AdminUser } from './UsersPage'

const kycRows = [
  {
    accountNumber: '10293847',
    accountSize: '200k',
    datePassed: '2026-02-04',
    profitMilestone: 'Passed',
    status: 'Auto Approved',
    user: { name: 'Favour M.', email: 'favour@mail.com', accounts: '2 / 1', revenue: '₦1,280,000', orders: '6', payouts: '₦280,000' },
  },
  {
    accountNumber: '10293855',
    accountSize: '100k',
    datePassed: '2026-02-10',
    profitMilestone: 'Passed',
    status: 'Auto Approved',
    user: { name: 'Chinedu A.', email: 'chinedu@mail.com', accounts: '3 / 1', revenue: '₦2,940,000', orders: '11', payouts: '₦620,000' },
  },
  {
    accountNumber: '10300661',
    accountSize: '50k',
    datePassed: '2026-02-12',
    profitMilestone: 'Passed',
    status: 'Auto Approved',
    user: { name: 'Grace O.', email: 'grace@mail.com', accounts: '1 / 0', revenue: '₦490,000', orders: '2', payouts: '₦0' },
  },
]

interface KycReviewPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const KycReviewPage = ({ onOpenProfile }: KycReviewPageProps) => {
  const allTimeSubmissions = 24892
  const todaySubmissions = 1284

  return (
    <section className="admin-page-stack kyc-review-page">
      <div className="admin-dashboard-card">
        <h2>KYC Review</h2>
        <p>Accounts that have passed KYC and crossed 10% profit milestone.</p>
      </div>

      <div className="kyc-review-stats">
        <article className="admin-dashboard-card">
          <span>All-time Submissions</span>
          <strong>{allTimeSubmissions.toLocaleString()}</strong>
        </article>
        <article className="admin-dashboard-card">
          <span>Today's Submissions</span>
          <strong>{todaySubmissions.toLocaleString()}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account Number</th>
              <th>Account Size</th>
              <th>Date Passed</th>
              <th>10% Profit Made</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {kycRows.map((row) => (
              <tr key={row.accountNumber}>
                <td>{row.accountNumber}</td>
                <td>{row.accountSize}</td>
                <td>{row.datePassed}</td>
                <td>{row.profitMilestone}</td>
                <td>
                  <span className="kyc-status-pill">{row.status}</span>
                </td>
                <td>
                  <button type="button" className="kyc-view-profile-btn" onClick={() => onOpenProfile(row.user)}>
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default KycReviewPage

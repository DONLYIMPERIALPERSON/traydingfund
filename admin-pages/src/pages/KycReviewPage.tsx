import { useEffect, useState } from 'react'
import { fetchAdminKycProfiles, type AdminKycProfileItem } from '../lib/adminMock'
import './KycReviewPage.css'
import type { AdminUser } from './UsersPage'

interface KycReviewPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const KycReviewPage = ({ onOpenProfile }: KycReviewPageProps) => {
  const [profiles, setProfiles] = useState<AdminKycProfileItem[]>([])
  const [eligibleProfiles, setEligibleProfiles] = useState(0)
  const [todayEligible, setTodayEligible] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetchAdminKycProfiles()
        setProfiles(response.profiles)
        setEligibleProfiles(response.stats.eligible_profiles)
        setTodayEligible(response.stats.today_eligible)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load KYC profiles')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <section className="admin-page-stack kyc-review-page">
      <div className="admin-dashboard-card">
        <h2>KYC Review</h2>
        <p>Profile-level KYC queue. A user becomes eligible once they own at least one funded account.</p>
      </div>

      <div className="kyc-review-stats">
        <article className="admin-dashboard-card">
          <span>Eligible Profiles</span>
          <strong>{eligibleProfiles.toLocaleString()}</strong>
        </article>
        <article className="admin-dashboard-card">
          <span>Became Eligible Today</span>
          <strong>{todayEligible.toLocaleString()}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        {loading && <p style={{ color: '#9ca3af', padding: '10px 16px', margin: 0 }}>Loading KYC profiles...</p>}
        {!loading && error && <p style={{ color: '#fca5a5', padding: '10px 16px', margin: 0 }}>{error}</p>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Profile</th>
              <th>Email</th>
              <th>Eligible Since</th>
              <th>Funded Accounts</th>
              <th>Total Challenge Accounts</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af' }}>No KYC-eligible profiles yet.</td>
              </tr>
            ) : (
              profiles.map((row) => (
                <tr key={row.user_id}>
                  <td>{row.name}</td>
                  <td>{row.email}</td>
                  <td>{row.eligible_since ? new Date(row.eligible_since).toLocaleDateString() : '-'}</td>
                  <td>{row.funded_accounts}</td>
                  <td>{row.total_challenge_accounts}</td>
                  <td>
                    <span className="kyc-status-pill">{row.status}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="kyc-view-profile-btn"
                      onClick={() =>
                        onOpenProfile({
                          user_id: row.user_id,
                          name: row.name,
                          email: row.email,
                          accounts: `${row.total_challenge_accounts} / ${row.funded_accounts}`,
                          revenue: '$0',
                          orders: String(row.total_challenge_accounts),
                          payouts: '$0',
                        })
                      }
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default KycReviewPage

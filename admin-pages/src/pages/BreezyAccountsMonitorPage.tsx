import { useEffect, useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'
import { fetchBreezyAccounts, type BreezyAccountListItem } from '../lib/adminApi'
import { formatAccountSize } from '../lib/formatters'

interface BreezyAccountsMonitorPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

const BreezyAccountsMonitorPage = ({ onOpenProfile }: BreezyAccountsMonitorPageProps) => {
  const [accounts, setAccounts] = useState<BreezyAccountListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetchBreezyAccounts()
        setAccounts(response.accounts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Breezy accounts')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return accounts
    return accounts.filter((account) => {
      const values = [
        account.challenge_id,
        account.account_number,
        account.trader_email ?? '',
        account.trader_name ?? '',
        account.risk_score_band ?? '',
      ].map((value) => value.toLowerCase())
      return values.some((value) => value.includes(query))
    })
  }, [accounts, search])

  const openProfile = (account: BreezyAccountListItem) => {
    onOpenProfile({
      user_id: account.id,
      name: account.trader_name ?? account.trader_email ?? 'Trader',
      email: account.trader_email ?? '',
      accounts: '1',
      revenue: '',
      orders: '',
      payouts: '',
    })
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Breezy Accounts Monitor</h2>
        <p>Monitor Breezy accounts, risk score, protection level, subscription state, and latest engine update.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Total Breezy Accounts</h3>
          <strong>{accounts.length}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Withdrawal Eligible</h3>
          <strong>{accounts.filter((account) => account.withdrawal_eligible).length}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: '#fff', margin: 0 }}>Breezy Risk Overview</h3>
            <p style={{ color: '#9ca3af', margin: '4px 0 0' }}>Search by trader, challenge ID, account number, or risk band.</p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Breezy accounts"
            style={{
              border: '1px solid #2a2f3a',
              background: '#0f172a',
              color: '#e5e7eb',
              borderRadius: 10,
              padding: '8px 12px',
              minWidth: 240,
            }}
          />
        </div>

        {loading && <p style={{ color: '#9ca3af', margin: 0, padding: '2px 16px 10px' }}>Loading Breezy accounts...</p>}
        {!loading && error && <p style={{ color: '#fca5a5', margin: 0, padding: '2px 16px 10px' }}>{error}</p>}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Trader</th>
              <th>Account</th>
              <th>Risk Score</th>
              <th>Risk Band</th>
              <th>Capital Protection</th>
              <th>Status</th>
              <th>Last Update</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af' }}>
                  No Breezy accounts found.
                </td>
              </tr>
            ) : filteredAccounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <strong>{account.trader_name ?? '—'}</strong>
                    <span>{account.trader_email ?? '—'}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <strong>{account.account_number}</strong>
                    <span>{formatAccountSize(account.account_size, account.currency)}</span>
                  </div>
                </td>
                <td>{account.risk_score != null ? account.risk_score.toFixed(2) : '—'}</td>
                <td>{account.risk_score_band ?? '—'}</td>
                <td>{account.capital_protection_level != null ? `${account.capital_protection_level.toFixed(2)}%` : '—'}</td>
                <td>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <strong>{account.account_status ?? account.status}</strong>
                    <span>{account.subscription_status ?? '—'}</span>
                  </div>
                </td>
                <td>{formatDateTime(account.last_update_at)}</td>
                <td>
                  <button type="button" onClick={() => openProfile(account)}>
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

export default BreezyAccountsMonitorPage
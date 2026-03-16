import { useEffect, useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'
import { fetchBreachedChallengeAccounts, type ChallengeBreachListItem } from '../lib/adminMock'

interface BreachesPageProps {
  onOpenProfile: (user: AdminUser) => void
}

type StatsWindow = 'today' | 'week' | 'month'

const BreachesPage = ({ onOpenProfile }: BreachesPageProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [rows, setRows] = useState<ChallengeBreachListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statsWindow, setStatsWindow] = useState<StatsWindow>('today')
  const [searchQuery, setSearchQuery] = useState('')
  const rowsPerPage = 10

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetchBreachedChallengeAccounts()
        setRows(response.accounts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load breached accounts')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => {
      const email = row.trader_email?.toLowerCase() || ''
      const accountNumber = row.mt5_account?.toLowerCase() || ''
      return email.includes(query) || accountNumber.includes(query)
    })
  }, [rows, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const paginatedBreaches = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredRows.slice(start, start + rowsPerPage)
  }, [filteredRows, currentPage])

  const statsRows = useMemo(() => {
    const now = new Date()

    return filteredRows.filter((row) => {
      if (!row.breached_at) return false
      const breachedDate = new Date(row.breached_at)
      if (Number.isNaN(breachedDate.getTime())) return false

      if (statsWindow === 'today') {
        return breachedDate.toDateString() === now.toDateString()
      }

      if (statsWindow === 'week') {
        const day = now.getDay()
        const mondayOffset = day === 0 ? -6 : 1 - day
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() + mondayOffset)
        startOfWeek.setHours(0, 0, 0, 0)
        return breachedDate >= startOfWeek
      }

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return breachedDate >= startOfMonth
    })
  }, [filteredRows, statsWindow])

  const maxDDBreaches = statsRows.filter((row) => row.breach_reason === 'drawdown_limit').length
  const scalpingBreaches = statsRows.filter((row) => row.breach_reason === 'scalping_rule').length

  const formatBreachReason = (value: string | null) => {
    if (value === 'drawdown_limit') return 'Max DD'
    if (value === 'scalping_rule') return 'Scalping rule'
    return value || '-'
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '-'
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    return date.toLocaleString()
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ marginBottom: 8 }}>Breaches</h2>
            <p style={{ margin: 0 }}>Monitor accounts that have breached challenge rules and review the exact breach reason.</p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setStatsWindow('today')}
              style={{
                border: '1px solid #2a2f3a',
                borderRadius: 10,
                padding: '8px 12px',
                fontWeight: 700,
                color: statsWindow === 'today' ? '#111827' : '#d1d5db',
                background: statsWindow === 'today' ? '#f59e0b' : '#111827',
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setStatsWindow('week')}
              style={{
                border: '1px solid #2a2f3a',
                borderRadius: 10,
                padding: '8px 12px',
                fontWeight: 700,
                color: statsWindow === 'week' ? '#111827' : '#d1d5db',
                background: statsWindow === 'week' ? '#f59e0b' : '#111827',
                cursor: 'pointer',
              }}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setStatsWindow('month')}
              style={{
                border: '1px solid #2a2f3a',
                borderRadius: 10,
                padding: '8px 12px',
                fontWeight: 700,
                color: statsWindow === 'month' ? '#111827' : '#d1d5db',
                background: statsWindow === 'month' ? '#f59e0b' : '#111827',
                cursor: 'pointer',
              }}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Total Breaches ({statsWindow === 'today' ? 'Today' : statsWindow === 'week' ? 'This Week' : 'This Month'})</h3>
          <strong>{statsRows.length}</strong>
        </article>
<article className="admin-kpi-card">
  <h3>Scalping rule</h3>
  <strong>{scalpingBreaches}</strong>
</article>
        <article className="admin-kpi-card">
          <h3>Max DD</h3>
          <strong>{maxDDBreaches}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: '#fff', margin: 0 }}>Breached Accounts</h3>
            <p style={{ color: '#9ca3af', margin: '4px 0 0' }}>Search by trader email or MT5 account number.</p>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search by email or MT5 account"
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
        {loading && <p style={{ color: '#9ca3af', margin: 0, padding: '2px 16px 12px' }}>Loading breached accounts...</p>}
        {!loading && error && <p style={{ color: '#fca5a5', margin: 0, padding: '2px 16px 12px' }}>{error}</p>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account ID</th>
              <th>Trader</th>
              <th>Account Size</th>
              <th>Phase</th>
              <th>Breach Reason</th>
              <th>Breached At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBreaches.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af' }}>
                  No breached accounts found.
                </td>
              </tr>
            ) : (
              paginatedBreaches.map((row) => (
                <tr key={row.challenge_id}>
                  <td>{row.challenge_id}</td>
                  <td>{row.trader_name ?? `User ${row.user_id}`}</td>
                  <td>{row.account_size}</td>
                  <td>{row.phase}</td>
                  <td>{formatBreachReason(row.breach_reason)}</td>
                  <td>{formatDate(row.breached_at)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenProfile({
                          user_id: row.user_id,
                          name: row.trader_name ?? `User ${row.user_id}`,
                          email: row.trader_email ?? '',
                          accounts: '',
                          revenue: '',
                          orders: '',
                          payouts: '',
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '0 16px 16px', gap: 12 }}>
          <small style={{ color: '#fff' }}>
            Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length}
          </small>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BreachesPage

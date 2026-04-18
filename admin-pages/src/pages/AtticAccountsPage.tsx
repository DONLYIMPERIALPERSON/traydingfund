import { useEffect, useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'
import { fetchAtticChallengeAccounts, type ChallengeAccountListItem } from '../lib/adminApi'
import { formatAccountSize, formatCurrencyValue } from '../lib/formatters'

interface AtticAccountsPageProps {
  onOpenProfile: (user: AdminUser) => void
}

type StatsPeriod = 'today' | 'week' | 'month'

const statusLabel = (status?: string | null) => {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'breached') return 'Breached'
  if (['passed', 'funded', 'completed'].includes(normalized)) return 'Passed'
  return 'Active'
}

const resolveRelevantDate = (account: ChallengeAccountListItem) =>
  account.breached_at ?? account.passed_at ?? account.assigned_at ?? account.created_at ?? null

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const AtticAccountsPage = ({ onOpenProfile }: AtticAccountsPageProps) => {
  const pageSize = 10
  const [period, setPeriod] = useState<StatsPeriod>('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [rows, setRows] = useState<ChallengeAccountListItem[]>([])
  const [summary, setSummary] = useState({ total: 0, active: 0, passed: 0, breached: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const debounce = window.setTimeout(() => {
      const load = async () => {
        setLoading(true)
        setError('')
        try {
          const response = await fetchAtticChallengeAccounts(currentPage, pageSize, period, searchQuery)
          setRows(response.accounts)
          setSummary(response.summary)
          setTotalPages(response.pagination.pages)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load attic accounts')
        } finally {
          setLoading(false)
        }
      }

      void load()
    }, 300)

    return () => window.clearTimeout(debounce)
  }, [currentPage, pageSize, period, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [period])

  const pageLabel = useMemo(() => {
    if (period === 'today') return 'Today'
    if (period === 'week') return 'This Week'
    return 'This Month'
  }, [period])

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <div className="page-header-row">
          <div>
            <h2>Attic Accounts</h2>
            <p>Monitor all Attic accounts with filtered summaries for active, passed, and breached accounts.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search trader, email, challenge ID, or account"
              className="period-selector-large"
              style={{ minWidth: '280px' }}
            />
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as StatsPeriod)}
              className="period-selector-large"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Total ({pageLabel})</h3>
          <strong>{summary.total}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Active</h3>
          <strong>{summary.active}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Passed</h3>
          <strong>{summary.passed}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Breached</h3>
          <strong>{summary.breached}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <h3>Attic Account List</h3>
        </div>

        {loading && <div className="loading-state">Loading attic accounts...</div>}
        {!loading && error && <p style={{ color: '#fca5a5', padding: '0 16px 16px', margin: 0 }}>{error}</p>}

        {!loading && !error && (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Challenge ID</th>
                  <th>Trader</th>
                  <th>Account Size</th>
                  <th>Account Number</th>
                  <th>Phase</th>
                  <th>Status</th>
                  <th>Current PNL</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af' }}>
                      No attic accounts found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.challenge_id}>
                      <td>{row.challenge_id}</td>
                      <td>
                        <div className="user-info">
                          <div className="user-name">{row.trader_name ?? `User ${row.user_id ?? 'Unknown'}`}</div>
                          <div className="user-email">{row.trader_email ?? '-'}</div>
                        </div>
                      </td>
                      <td>{formatAccountSize(row.account_size, row.currency)}</td>
                      <td>{row.mt5_account ?? '-'}</td>
                      <td>{row.phase ?? '-'}</td>
                      <td>{statusLabel(row.objective_status)}</td>
                      <td>{formatCurrencyValue(row.current_pnl, row.currency, '+$0')}</td>
                      <td>{formatDateTime(resolveRelevantDate(row))}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => onOpenProfile({
                            user_id: row.user_id ?? undefined,
                            name: row.trader_name ?? `User ${row.user_id ?? 'Unknown'}`,
                            email: row.trader_email ?? '',
                            accounts: '',
                            revenue: '',
                            orders: '',
                            payouts: '',
                          })}
                        >
                          View User Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '0 16px 16px', gap: 12 }}>
              <small style={{ color: '#fff' }}>
                Showing {rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, summary.total)} of {summary.total}
              </small>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                  Prev
                </button>
                <button type="button" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default AtticAccountsPage
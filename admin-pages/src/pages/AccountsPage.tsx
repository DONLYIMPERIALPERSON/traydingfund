import { useEffect, useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'
import { fetchActiveChallengeAccounts, type ChallengeAccountListItem } from '../lib/adminApi'
import { formatAccountSize, formatCurrencyValue } from '../lib/formatters'

interface AccountsPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const AccountsPage = ({ onOpenProfile }: AccountsPageProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [rows, setRows] = useState<ChallengeAccountListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const rowsPerPage = 10

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetchActiveChallengeAccounts()
        setRows(response.accounts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load active challenge accounts')
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
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredRows.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredRows, currentPage])

  const activeChallengesCount = filteredRows.length // All rows are active since we filter by active status
  const phase1Count = filteredRows.filter((row) => row.phase === 'Phase 1').length
  const phase2Count = filteredRows.filter((row) => row.phase === 'Phase 2').length

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Active Challenges</h2>
        <p>Track active Phase 1 and Phase 2 challenge performance, account details, and trader progress for each ongoing challenge account.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Active Challenges</h3>
          <strong>{activeChallengesCount}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Phase 1</h3>
          <strong>{phase1Count}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Phase 2</h3>
          <strong>{phase2Count}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 0', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: '#fff', margin: 0 }}>Active Challenge Accounts</h3>
            <p style={{ color: '#9ca3af', margin: '4px 0 0' }}>Search by trader email or account number.</p>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search by email or account number"
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
        {loading && <p style={{ color: '#9ca3af', padding: '12px 16px 10px', margin: 0 }}>Loading challenge accounts...</p>}
        {!loading && error && <p style={{ color: '#fca5a5', padding: '12px 16px 10px', margin: 0 }}>{error}</p>}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Trader</th>
              <th>Account Size</th>
              <th>Account Number</th>
              <th>cTrader ID</th>
              <th>Phase</th>
              <th>Current PNL</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={row.challenge_id}>
                <td>{row.challenge_id}</td>
                <td>{row.trader_name ?? `User ${row.user_id}`}</td>
                <td>{formatAccountSize(row.account_size, row.currency)}</td>
                <td>{row.mt5_account ?? '-'}</td>
                <td>{row.mt5_server ?? '-'}</td>
                <td>{row.phase}</td>
                <td>{formatCurrencyValue(row.current_pnl, row.currency, '+$0')}</td>
                <td>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenProfile({
                        user_id: row.user_id ?? undefined,
                        name: row.trader_name ?? `User ${row.user_id ?? 'Unknown'}`,
                        email: row.trader_email ?? '',
                        accounts: '',
                        revenue: '',
                        orders: '',
                        payouts: '',
                      })
                    }
                  >
                    View User Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
            padding: '0 16px 16px',
            gap: 12,
          }}
        >
          <small style={{ color: '#d1d5db', fontWeight: 600 }}>
            Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length}
          </small>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                border: '1px solid #2a2f3a',
                background: '#151a22',
                color: '#e5e7eb',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }).map((_, index) => {
              const page = index + 1
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  disabled={currentPage === page}
                  style={{
                    minWidth: 34,
                    border: currentPage === page ? '1px solid #f59e0b' : '1px solid #2a2f3a',
                    background: currentPage === page ? 'rgba(245,158,11,0.15)' : '#11151d',
                    color: currentPage === page ? '#fcd34d' : '#d1d5db',
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontWeight: 700,
                    cursor: currentPage === page ? 'default' : 'pointer',
                  }}
                >
                  {page}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                border: '1px solid #2a2f3a',
                background: '#151a22',
                color: '#e5e7eb',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AccountsPage

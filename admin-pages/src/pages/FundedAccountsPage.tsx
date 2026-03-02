import { useEffect, useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'
import { fetchFundedChallengeAccounts, fetchProfitableFundedAccounts, type ChallengeAccountListItem } from '../lib/adminAuth'

interface FundedAccountsPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const FundedAccountsPage = ({ onOpenProfile }: FundedAccountsPageProps) => {
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [fundedListPage, setFundedListPage] = useState(1)
  const [fundedAccounts, setFundedAccounts] = useState<ChallengeAccountListItem[]>([])
  const [topTraders, setTopTraders] = useState<ChallengeAccountListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const leaderboardPageSize = 3
  const fundedListPageSize = 10

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [fundedResponse, profitableResponse] = await Promise.all([
          fetchFundedChallengeAccounts(),
          fetchProfitableFundedAccounts()
        ])
        setFundedAccounts(fundedResponse.accounts)
        setTopTraders(profitableResponse.accounts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load funded accounts')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const openProfileFromRow = (row: ChallengeAccountListItem) => {
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

  const filteredLeaderboard = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return topTraders
    return topTraders.filter((row) => {
      const email = row.trader_email?.toLowerCase() || ''
      const accountNumber = row.mt5_account?.toLowerCase() || ''
      return email.includes(query) || accountNumber.includes(query)
    })
  }, [topTraders, searchQuery])

  const filteredFundedAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return fundedAccounts
    return fundedAccounts.filter((row) => {
      const email = row.trader_email?.toLowerCase() || ''
      const accountNumber = row.mt5_account?.toLowerCase() || ''
      return email.includes(query) || accountNumber.includes(query)
    })
  }, [fundedAccounts, searchQuery])

  const totalLeaderboardPages = Math.ceil(filteredLeaderboard.length / leaderboardPageSize)
  const paginatedLeaderboard = useMemo(() => {
    const start = (leaderboardPage - 1) * leaderboardPageSize
    return filteredLeaderboard.slice(start, start + leaderboardPageSize)
  }, [filteredLeaderboard, leaderboardPage])

  const totalFundedPages = Math.max(1, Math.ceil(filteredFundedAccounts.length / fundedListPageSize))
  const paginatedFundedAccounts = useMemo(() => {
    const start = (fundedListPage - 1) * fundedListPageSize
    return filteredFundedAccounts.slice(start, start + fundedListPageSize)
  }, [filteredFundedAccounts, fundedListPage])

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Funded Accounts</h2>
        <p>View funded traders, monitor performance, and quickly open trader profiles.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Total Funded Accounts</h3>
          <strong>{fundedAccounts.length}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: '#fff', margin: 0 }}>Top 10 Profitable Traders</h3>
            <p style={{ color: '#9ca3af', margin: '4px 0 0' }}>Search by trader email or MT5 account number.</p>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setLeaderboardPage(1)
              setFundedListPage(1)
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
        <table className="admin-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Trader</th>
              <th>Account Size</th>
              <th>Profit</th>
              <th>Win Rate</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeaderboard.map((row, index) => (
              <tr key={row.challenge_id}>
                <td>#{(leaderboardPage - 1) * leaderboardPageSize + index + 1}</td>
                <td>{row.trader_name ?? `User ${row.user_id}`}</td>
                <td>{row.account_size}</td>
                <td>{row.profit ?? '₦0'}</td>
                <td>{row.win_rate ?? '0%'}</td>
                <td>
                  <button type="button" onClick={() => openProfileFromRow(row)}>
                    View Profile
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
            Showing {filteredLeaderboard.length === 0 ? 0 : (leaderboardPage - 1) * leaderboardPageSize + 1} - {Math.min(leaderboardPage * leaderboardPageSize, filteredLeaderboard.length)} of {filteredLeaderboard.length}
          </small>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setLeaderboardPage((prev) => Math.max(prev - 1, 1))}
              disabled={leaderboardPage === 1}
              style={{
                border: '1px solid #2a2f3a',
                background: '#151a22',
                color: '#e5e7eb',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                cursor: leaderboardPage === 1 ? 'not-allowed' : 'pointer',
                opacity: leaderboardPage === 1 ? 0.5 : 1,
              }}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardPage((prev) => Math.min(prev + 1, totalLeaderboardPages))}
              disabled={leaderboardPage === totalLeaderboardPages}
              style={{
                border: '1px solid #2a2f3a',
                background: '#151a22',
                color: '#e5e7eb',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                cursor: leaderboardPage === totalLeaderboardPages ? 'not-allowed' : 'pointer',
                opacity: leaderboardPage === totalLeaderboardPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="admin-table-card">
        <h3 style={{ color: '#fff', margin: 0, padding: '14px 16px 8px' }}>Funded Accounts List</h3>
        {loading && <p style={{ color: '#9ca3af', margin: 0, padding: '2px 16px 10px' }}>Loading funded accounts...</p>}
        {!loading && error && <p style={{ color: '#fca5a5', margin: 0, padding: '2px 16px 10px' }}>{error}</p>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account ID</th>
              <th>Trader</th>
              <th>Account Size</th>
              <th>MT5 Account</th>
              <th>Phase</th>
              <th>Current PNL</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFundedAccounts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af' }}>
                  No funded accounts yet.
                </td>
              </tr>
            ) : (
              paginatedFundedAccounts.map((row) => (
                <tr key={row.challenge_id}>
                  <td>{row.challenge_id}</td>
                  <td>{row.trader_name ?? `User ${row.user_id}`}</td>
                  <td>{row.account_size}</td>
                  <td>{row.mt5_account ?? '-'}</td>
                  <td>{row.phase}</td>
                  <td>{row.current_pnl ?? '₦0'}</td>
                  <td>
                    <button type="button" onClick={() => openProfileFromRow(row)}>
                      View Profile
                    </button>
                  </td>
                </tr>
              ))
            )}
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
            Showing {filteredFundedAccounts.length === 0 ? 0 : (fundedListPage - 1) * fundedListPageSize + 1} - {Math.min(fundedListPage * fundedListPageSize, filteredFundedAccounts.length)} of {filteredFundedAccounts.length}
          </small>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setFundedListPage((prev) => Math.max(prev - 1, 1))}
              disabled={fundedListPage === 1}
              style={{
                border: '1px solid #2a2f3a',
                background: '#151a22',
                color: '#e5e7eb',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                cursor: fundedListPage === 1 ? 'not-allowed' : 'pointer',
                opacity: fundedListPage === 1 ? 0.5 : 1,
              }}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setFundedListPage((prev) => Math.min(prev + 1, totalFundedPages))}
              disabled={fundedListPage === totalFundedPages}
              style={{
                border: '1px solid #2a2f3a',
                background: '#151a22',
                color: '#e5e7eb',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                cursor: fundedListPage === totalFundedPages ? 'not-allowed' : 'pointer',
                opacity: fundedListPage === totalFundedPages ? 0.5 : 1,
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

export default FundedAccountsPage

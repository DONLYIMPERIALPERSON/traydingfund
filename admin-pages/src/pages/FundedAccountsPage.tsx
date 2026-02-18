import { useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'

interface FundedAccountsPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const FundedAccountsPage = ({ onOpenProfile }: FundedAccountsPageProps) => {
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [fundedListPage, setFundedListPage] = useState(1)
  const leaderboardPageSize = 3
  const fundedListPageSize = 10

  const fundedAccounts = [
    { accountId: 'FD-10422', trader: 'Chinedu A.', size: '₦1.5m', mt5: '20481200', phase: 'Funded', pnl: '+₦2,480,000' },
    { accountId: 'FD-10407', trader: 'Fatima S.', size: '₦800k', mt5: '20480842', phase: 'Funded', pnl: '+₦2,120,000' },
    { accountId: 'FD-10398', trader: 'Tunde O.', size: '₦1.5m', mt5: '20480210', phase: 'Funded', pnl: '+₦1,920,000' },
    { accountId: 'FD-10384', trader: 'Grace O.', size: '₦600k', mt5: '20479908', phase: 'Funded', pnl: '+₦1,540,000' },
    { accountId: 'FD-10370', trader: 'Favour M.', size: '₦400k', mt5: '20479241', phase: 'Funded', pnl: '+₦1,120,000' },
  ]

  const topTraders = [
    { rank: 1, trader: 'Chinedu A.', accountSize: '₦1.5m', profit: '+₦2,480,000', winRate: '74%' },
    { rank: 2, trader: 'Fatima S.', accountSize: '₦800k', profit: '+₦2,120,000', winRate: '71%' },
    { rank: 3, trader: 'Tunde O.', accountSize: '₦1.5m', profit: '+₦1,920,000', winRate: '69%' },
    { rank: 4, trader: 'Grace O.', accountSize: '₦600k', profit: '+₦1,540,000', winRate: '67%' },
    { rank: 5, trader: 'Favour M.', accountSize: '₦400k', profit: '+₦1,120,000', winRate: '66%' },
    { rank: 6, trader: 'Rasheed T.', accountSize: '₦800k', profit: '+₦990,000', winRate: '64%' },
    { rank: 7, trader: 'Amina Y.', accountSize: '₦600k', profit: '+₦860,000', winRate: '63%' },
    { rank: 8, trader: 'Samuel P.', accountSize: '₦400k', profit: '+₦790,000', winRate: '61%' },
    { rank: 9, trader: 'Kelvin D.', accountSize: '₦800k', profit: '+₦710,000', winRate: '60%' },
    { rank: 10, trader: 'Ngozi R.', accountSize: '₦600k', profit: '+₦680,000', winRate: '59%' },
  ]

  const openProfileFromName = (name: string, revenue: string) => {
    onOpenProfile({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')}@mail.com`,
      accounts: '1 / 1',
      revenue,
      orders: '5',
      payouts: '₦280,000',
    })
  }

  const totalLeaderboardPages = Math.ceil(topTraders.length / leaderboardPageSize)
  const paginatedLeaderboard = useMemo(() => {
    const start = (leaderboardPage - 1) * leaderboardPageSize
    return topTraders.slice(start, start + leaderboardPageSize)
  }, [topTraders, leaderboardPage])

  const totalFundedPages = Math.ceil(fundedAccounts.length / fundedListPageSize)
  const paginatedFundedAccounts = useMemo(() => {
    const start = (fundedListPage - 1) * fundedListPageSize
    return fundedAccounts.slice(start, start + fundedListPageSize)
  }, [fundedAccounts, fundedListPage])

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
        <h3 style={{ color: '#fff' }}>Top 10 Profitable Traders</h3>
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
            {paginatedLeaderboard.map((row) => (
              <tr key={row.rank}>
                <td>#{row.rank}</td>
                <td>{row.trader}</td>
                <td>{row.accountSize}</td>
                <td>{row.profit}</td>
                <td>{row.winRate}</td>
                <td>
                  <button type="button" onClick={() => openProfileFromName(row.trader, row.profit)}>
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <small style={{ color: '#fff' }}>
            Showing {(leaderboardPage - 1) * leaderboardPageSize + 1} - {Math.min(leaderboardPage * leaderboardPageSize, topTraders.length)} of {topTraders.length}
          </small>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setLeaderboardPage((prev) => Math.max(prev - 1, 1))}
              disabled={leaderboardPage === 1}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardPage((prev) => Math.min(prev + 1, totalLeaderboardPages))}
              disabled={leaderboardPage === totalLeaderboardPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="admin-table-card">
        <h3 style={{ color: '#fff' }}>Funded Accounts List</h3>
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
            {paginatedFundedAccounts.map((row) => (
              <tr key={row.accountId}>
                <td>{row.accountId}</td>
                <td>{row.trader}</td>
                <td>{row.size}</td>
                <td>{row.mt5}</td>
                <td>{row.phase}</td>
                <td>{row.pnl}</td>
                <td>
                  <button type="button" onClick={() => openProfileFromName(row.trader, row.pnl)}>
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <small style={{ color: '#fff' }}>
            Showing {(fundedListPage - 1) * fundedListPageSize + 1} - {Math.min(fundedListPage * fundedListPageSize, fundedAccounts.length)} of {fundedAccounts.length}
          </small>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setFundedListPage((prev) => Math.max(prev - 1, 1))}
              disabled={fundedListPage === 1}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setFundedListPage((prev) => Math.min(prev + 1, totalFundedPages))}
              disabled={fundedListPage === totalFundedPages}
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

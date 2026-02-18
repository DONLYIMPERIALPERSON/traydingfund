import { useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'

interface AccountsPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const AccountsPage = ({ onOpenProfile }: AccountsPageProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const challengeRows = [
    {
      challengeId: 'CH-92811',
      trader: 'Favour M.',
      accountSize: '₦200k',
      mt5Account: '10293847',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'FV@4471',
      phase: 'Phase 1',
      currentPnl: '+₦320,000',
    },
    {
      challengeId: 'CH-93220',
      trader: 'Chinedu A.',
      accountSize: '₦400k',
      mt5Account: '10293855',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'CN@7722',
      phase: 'Phase 2',
      currentPnl: '+₦112,000',
    },
    {
      challengeId: 'CH-93602',
      trader: 'Grace O.',
      accountSize: '₦600k',
      mt5Account: '10300661',
      mt5Server: 'MT5-Live-02',
      mt5Password: 'GR@1198',
      phase: 'Phase 2',
      currentPnl: '+₦540,000',
    },
    {
      challengeId: 'CH-94041',
      trader: 'David E.',
      accountSize: '₦800k',
      mt5Account: '10311409',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'DV@9001',
      phase: 'Phase 1',
      currentPnl: '+₦76,000',
    },
    {
      challengeId: 'CH-94122',
      trader: 'Joy K.',
      accountSize: '₦1.5m',
      mt5Account: '10311872',
      mt5Server: 'MT5-Live-02',
      mt5Password: 'JY@5512',
      phase: 'Phase 2',
      currentPnl: '+₦280,000',
    },
    {
      challengeId: 'CH-94211',
      trader: 'Ibrahim L.',
      accountSize: '₦200k',
      mt5Account: '10312230',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'IB@7410',
      phase: 'Phase 1',
      currentPnl: '+₦40,000',
    },
    {
      challengeId: 'CH-94308',
      trader: 'Amina Y.',
      accountSize: '₦400k',
      mt5Account: '10312848',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'AM@2228',
      phase: 'Phase 2',
      currentPnl: '+₦199,000',
    },
    {
      challengeId: 'CH-94410',
      trader: 'Samuel P.',
      accountSize: '₦600k',
      mt5Account: '10313284',
      mt5Server: 'MT5-Live-02',
      mt5Password: 'SM@6642',
      phase: 'Phase 1',
      currentPnl: '+₦61,500',
    },
    {
      challengeId: 'CH-94551',
      trader: 'Ngozi R.',
      accountSize: '₦800k',
      mt5Account: '10313941',
      mt5Server: 'MT5-Live-02',
      mt5Password: 'NG@1704',
      phase: 'Phase 1',
      currentPnl: '+₦143,000',
    },
    {
      challengeId: 'CH-94677',
      trader: 'Tunde O.',
      accountSize: '₦1.5m',
      mt5Account: '10314521',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'TD@1881',
      phase: 'Phase 2',
      currentPnl: '+₦390,000',
    },
    {
      challengeId: 'CH-94763',
      trader: 'Blessing N.',
      accountSize: '₦200k',
      mt5Account: '10315104',
      mt5Server: 'MT5-Live-02',
      mt5Password: 'BL@6033',
      phase: 'Phase 1',
      currentPnl: '+₦84,000',
    },
    {
      challengeId: 'CH-94801',
      trader: 'Kelvin D.',
      accountSize: '₦400k',
      mt5Account: '10315672',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'KV@3200',
      phase: 'Phase 2',
      currentPnl: '+₦255,000',
    },
    {
      challengeId: 'CH-94952',
      trader: 'Ruth S.',
      accountSize: '₦600k',
      mt5Account: '10316210',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'RT@7880',
      phase: 'Phase 1',
      currentPnl: '+₦92,500',
    },
  ]

  const totalPages = Math.ceil(challengeRows.length / rowsPerPage)
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return challengeRows.slice(startIndex, startIndex + rowsPerPage)
  }, [challengeRows, currentPage])

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Challenges</h2>
        <p>Track challenge performance, breaches, passes, and MT5 details for each challenge account.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Active Challenges</h3>
          <strong>1,392</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Breached Today</h3>
          <strong>12</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Breached This Week</h3>
          <strong>61</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Breached This Month</h3>
          <strong>214</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Passed Today</h3>
          <strong>8</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Passed This Week</h3>
          <strong>37</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Passed This Month</h3>
          <strong>146</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Trader</th>
              <th>Account Size</th>
              <th>MT5 Account</th>
              <th>MT5 Server</th>
              <th>MT5 Password</th>
              <th>Phase</th>
              <th>Current PNL</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={row.challengeId}>
                <td>{row.challengeId}</td>
                <td>{row.trader}</td>
                <td>{row.accountSize}</td>
                <td>{row.mt5Account}</td>
                <td>{row.mt5Server}</td>
                <td>{row.mt5Password}</td>
                <td>{row.phase}</td>
                <td>{row.currentPnl}</td>
                <td>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenProfile({
                        name: row.trader,
                        email: `${row.trader.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')}@mail.com`,
                        accounts: '1 / 0',
                        revenue: row.currentPnl,
                        orders: '1',
                        payouts: '₦0',
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <small style={{ color: '#fff' }}>
            Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, challengeRows.length)} of {challengeRows.length}
          </small>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
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
                >
                  {page}
                </button>
              )
            })}
            <button type="button" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AccountsPage

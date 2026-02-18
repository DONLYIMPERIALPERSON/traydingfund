import { useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'

interface BreachesPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const BreachesPage = ({ onOpenProfile }: BreachesPageProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const breachedAccounts = [
    { id: 'CH-93220', trader: 'Chinedu A.', accountSize: '₦400k', phase: 'Phase 2', reason: 'Max DD', breachedAt: '2026-02-17 10:42' },
    { id: 'CH-92811', trader: 'Favour M.', accountSize: '₦200k', phase: 'Phase 1', reason: '5 mins rule', breachedAt: '2026-02-17 09:18' },
    { id: 'FD-94763', trader: 'Blessing N.', accountSize: '₦200k', phase: 'Funded', reason: 'Max DD', breachedAt: '2026-02-16 21:03' },
    { id: 'CH-94122', trader: 'Joy K.', accountSize: '₦1.5m', phase: 'Phase 2', reason: '5 mins rule', breachedAt: '2026-02-16 19:27' },
    { id: 'FD-94551', trader: 'Ngozi R.', accountSize: '₦800k', phase: 'Funded', reason: 'Max DD', breachedAt: '2026-02-15 16:12' },
    { id: 'CH-95011', trader: 'Ibrahim L.', accountSize: '₦600k', phase: 'Phase 1', reason: '5 mins rule', breachedAt: '2026-02-15 12:09' },
    { id: 'CH-95039', trader: 'Amina Y.', accountSize: '₦400k', phase: 'Phase 2', reason: 'Max DD', breachedAt: '2026-02-15 10:17' },
    { id: 'FD-95104', trader: 'Samuel P.', accountSize: '₦800k', phase: 'Funded', reason: 'Max DD', breachedAt: '2026-02-14 23:11' },
    { id: 'CH-95128', trader: 'Kelvin D.', accountSize: '₦1.5m', phase: 'Phase 2', reason: '5 mins rule', breachedAt: '2026-02-14 20:42' },
    { id: 'CH-95177', trader: 'Ruth S.', accountSize: '₦200k', phase: 'Phase 1', reason: 'Max DD', breachedAt: '2026-02-14 18:30' },
    { id: 'FD-95210', trader: 'David E.', accountSize: '₦600k', phase: 'Funded', reason: '5 mins rule', breachedAt: '2026-02-14 14:54' },
    { id: 'CH-95244', trader: 'Joyce T.', accountSize: '₦400k', phase: 'Phase 1', reason: 'Max DD', breachedAt: '2026-02-14 11:26' },
  ]

  const totalPages = Math.ceil(breachedAccounts.length / rowsPerPage)
  const paginatedBreaches = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return breachedAccounts.slice(start, start + rowsPerPage)
  }, [breachedAccounts, currentPage])

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Breaches</h2>
        <p>Monitor accounts that have breached challenge rules and review the exact breach reason.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Total Breaches (Today)</h3>
          <strong>12</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Total Breaches (This Week)</h3>
          <strong>61</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>5 mins rule</h3>
          <strong>24</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Max DD</h3>
          <strong>37</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <h3 style={{ color: '#fff' }}>Breached Accounts</h3>
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
            {paginatedBreaches.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.trader}</td>
                <td>{row.accountSize}</td>
                <td>{row.phase}</td>
                <td>{row.reason}</td>
                <td>{row.breachedAt}</td>
                <td>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenProfile({
                        name: row.trader,
                        email: `${row.trader.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')}@mail.com`,
                        accounts: row.phase === 'Funded' ? '0 / 1' : '1 / 0',
                        revenue: '₦0',
                        orders: '1',
                        payouts: row.phase === 'Funded' ? '₦120,000' : '₦0',
                      })
                    }
                  >
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <small style={{ color: '#fff' }}>
            Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, breachedAccounts.length)} of {breachedAccounts.length}
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

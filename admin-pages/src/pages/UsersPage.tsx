import { useMemo, useState, useEffect } from 'react'
import { fetchAdminUsers, type AdminUsersListItem } from '../lib/adminApi'
import './UsersPage.css'

export interface AdminUser {
  user_id?: number
  name: string
  email: string
  accounts: string
  revenue: string
  orders: string
  payouts: string
}

interface UsersPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const UsersPage = ({ onOpenProfile }: UsersPageProps) => {
  const pageSize = 10
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tradingFilter, setTradingFilter] = useState('All')
  const [rows, setRows] = useState<AdminUsersListItem[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [fundedUsers, setFundedUsers] = useState(0)
  const [breachedUsers, setBreachedUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetchAdminUsers()
        setRows(response.users)
        setTotalUsers(response.stats.total_users)
        setFundedUsers(response.stats.funded_users)
        setBreachedUsers(response.stats.breached_users)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = search.trim().toLowerCase()
      const searchMatch =
        q.length === 0 ||
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        String(row.user_id).includes(q)

      const statusMatch = statusFilter === 'All' || row.status.toLowerCase() === statusFilter.toLowerCase()
      const tradingMatch = tradingFilter === 'All' || row.trading === tradingFilter

      return searchMatch && statusMatch && tradingMatch
    })
  }, [rows, search, statusFilter, tradingFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredRows.length)
  const paginatedUsers = filteredRows.slice(startIndex, endIndex)

  return (
    <section className="admin-page-stack users-page">
      <div className="admin-dashboard-card users-header-card">
        <div>
          <h2>All Users</h2>
          <p>Unified customer operations view for user lifecycle, risk, and trading status.</p>
        </div>
        <div className="users-quick-stats">
          <article>
            <span>Total Users</span>
            <strong>{totalUsers}</strong>
          </article>
          <article>
            <span>Funded / Breached</span>
            <strong>{fundedUsers} / {breachedUsers}</strong>
          </article>
        </div>
      </div>

      <div className="admin-dashboard-card users-filters-card">
        <h3>Filters</h3>

        <div className="users-filters-minimal">
          <label className="users-search-field">
            Search
            <input
              type="text"
              placeholder="Name, email, user ID"
              value={search}
              onChange={(event) => {
                setCurrentPage(1)
                setSearch(event.target.value)
              }}
            />
          </label>

          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) => {
                setCurrentPage(1)
                setStatusFilter(event.target.value)
              }}
            >
              <option>All</option>
              <option>Active</option>
              <option>Suspended</option>
              <option>Banned</option>
            </select>
          </label>

          <label>
            Trading
            <select
              value={tradingFilter}
              onChange={(event) => {
                setCurrentPage(1)
                setTradingFilter(event.target.value)
              }}
            >
              <option>All</option>
              <option>Challenge Active</option>
              <option>Funded</option>
              <option>Breached</option>
            </select>
          </label>

          <button
            type="button"
            className="users-more-filters-btn"
            onClick={() => {
              setSearch('')
              setStatusFilter('All')
              setTradingFilter('All')
              setCurrentPage(1)
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        {loading && <p style={{ color: '#9ca3af', padding: '10px 16px', margin: 0 }}>Loading users...</p>}
        {!loading && error && <p style={{ color: '#fca5a5', padding: '10px 16px', margin: 0 }}>{error}</p>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Accounts (Challenge/Funded)</th>
              <th>Revenue</th>
              <th>Orders</th>
              <th>Payouts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af' }}>No users found.</td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.user_id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.accounts}</td>
                  <td>{user.revenue}</td>
                  <td>{user.orders}</td>
                  <td>{user.payouts}</td>
                  <td>
                    <button
                      type="button"
                      className="users-action-btn"
                      onClick={() =>
                        onOpenProfile({
                          user_id: user.user_id,
                          name: user.name,
                          email: user.email,
                          accounts: user.accounts,
                          revenue: user.revenue,
                          orders: user.orders,
                          payouts: user.payouts,
                        })
                      }
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="users-table-footer">
          <p>{filteredRows.length === 0 ? 0 : startIndex + 1}–{endIndex} of {filteredRows.length}</p>
          <div className="users-pagination-actions">
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}>Prev</button>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}>Next</button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default UsersPage

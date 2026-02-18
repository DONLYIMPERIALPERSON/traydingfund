import { useState } from 'react'
import './UsersPage.css'

export interface AdminUser {
  name: string
  email: string
  accounts: string
  revenue: string
  orders: string
  payouts: string
}

const users: AdminUser[] = [
  { name: 'Favour M.', email: 'favour@mail.com', accounts: '2 / 1', revenue: '₦1,280,000', orders: '6', payouts: '₦280,000' },
  { name: 'Chinedu A.', email: 'chinedu@mail.com', accounts: '3 / 1', revenue: '₦2,940,000', orders: '11', payouts: '₦620,000' },
  { name: 'Grace O.', email: 'grace@mail.com', accounts: '1 / 0', revenue: '₦490,000', orders: '2', payouts: '₦0' },
  { name: 'Kemi T.', email: 'kemi@mail.com', accounts: '2 / 0', revenue: '₦760,000', orders: '4', payouts: '₦120,000' },
  { name: 'Ibrahim U.', email: 'ibrahim@mail.com', accounts: '4 / 2', revenue: '₦3,120,000', orders: '12', payouts: '₦740,000' },
  { name: 'Amaka E.', email: 'amaka@mail.com', accounts: '2 / 1', revenue: '₦1,860,000', orders: '7', payouts: '₦310,000' },
  { name: 'Tunde B.', email: 'tunde@mail.com', accounts: '1 / 0', revenue: '₦540,000', orders: '3', payouts: '₦90,000' },
  { name: 'Zainab R.', email: 'zainab@mail.com', accounts: '3 / 1', revenue: '₦2,300,000', orders: '9', payouts: '₦430,000' },
  { name: 'David N.', email: 'david@mail.com', accounts: '2 / 1', revenue: '₦1,470,000', orders: '5', payouts: '₦260,000' },
  { name: 'Halima S.', email: 'halima@mail.com', accounts: '3 / 2', revenue: '₦2,780,000', orders: '10', payouts: '₦590,000' },
  { name: 'Samuel P.', email: 'samuel@mail.com', accounts: '2 / 1', revenue: '₦1,120,000', orders: '6', payouts: '₦210,000' },
  { name: 'Bisi L.', email: 'bisi@mail.com', accounts: '1 / 0', revenue: '₦630,000', orders: '3', payouts: '₦80,000' },
  { name: 'Musa K.', email: 'musa@mail.com', accounts: '3 / 1', revenue: '₦2,050,000', orders: '8', payouts: '₦360,000' },
  { name: 'Ngozi J.', email: 'ngozi@mail.com', accounts: '2 / 1', revenue: '₦1,390,000', orders: '5', payouts: '₦240,000' },
  { name: 'Yusuf D.', email: 'yusuf@mail.com', accounts: '4 / 2', revenue: '₦3,440,000', orders: '13', payouts: '₦790,000' },
]

interface UsersPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const UsersPage = ({ onOpenProfile }: UsersPageProps) => {
  const pageSize = 10
  const [currentPage, setCurrentPage] = useState(1)

  const totalUsers = users.length
  const totalPages = Math.ceil(totalUsers / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalUsers)
  const paginatedUsers = users.slice(startIndex, endIndex)

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
            <strong>24,892</strong>
          </article>
          <article>
            <span>Joined Today</span>
            <strong>1,284</strong>
          </article>
        </div>
      </div>

      <div className="admin-dashboard-card users-filters-card">
        <h3>Filters</h3>

        <div className="users-filters-minimal">
          <label className="users-search-field">
            Search
            <input type="text" placeholder="Name, email, phone, user ID" />
          </label>

          <label>
            Status
            <select>
              <option>All</option>
              <option>Active</option>
              <option>Suspended</option>
              <option>Banned</option>
            </select>
          </label>

          <label>
            Trading
            <select>
              <option>All</option>
              <option>Challenge Active</option>
              <option>Funded</option>
              <option>Breached</option>
            </select>
          </label>

          <button type="button" className="users-more-filters-btn">More Filters</button>
        </div>
      </div>

      <div className="admin-table-card">
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
            {paginatedUsers.map((user) => (
              <tr key={user.email}>
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
                    onClick={() => onOpenProfile(user)}
                  >
                    ⋯
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="users-table-footer">
          <p>{startIndex + 1}–{endIndex} of {totalUsers}</p>
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

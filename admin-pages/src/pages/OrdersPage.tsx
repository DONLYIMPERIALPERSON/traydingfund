import type { AdminUser } from './UsersPage'

interface OrdersPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const orderRows: Array<{
  id: string
  userName: string
  accountSize: string
  status: string
  amount: string
  user: AdminUser
}> = [
  {
    id: '#NT-12081',
    userName: 'Favour M.',
    accountSize: '₦50k',
    status: 'Paid',
    amount: '₦289,000',
    user: { name: 'Favour M.', email: 'favour@mail.com', accounts: '2 / 1', revenue: '₦1,280,000', orders: '6', payouts: '₦280,000' },
  },
  {
    id: '#NT-12082',
    userName: 'Rasheed T.',
    accountSize: '₦10k',
    status: 'Pending',
    amount: '₦99,000',
    user: { name: 'Rasheed T.', email: 'rasheed@mail.com', accounts: '1 / 0', revenue: '₦390,000', orders: '3', payouts: '₦0' },
  },
  {
    id: '#NT-12078',
    userName: 'Grace O.',
    accountSize: '₦100k',
    status: 'Paid',
    amount: '₦499,000',
    user: { name: 'Grace O.', email: 'grace@mail.com', accounts: '1 / 0', revenue: '₦490,000', orders: '2', payouts: '₦0' },
  },
]

const OrdersPage = ({ onOpenProfile }: OrdersPageProps) => {
  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Orders</h2>
        <p>Track plan purchases and payment processing status.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Paid Orders (24h)</h3>
          <strong>183</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Pending Payments</h3>
          <strong>27</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Paid Volume (7d)</h3>
          <strong>₦48,200,000</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Successful Payments</h3>
          <strong>96.8%</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>User</th>
              <th>Account Size</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orderRows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.userName}</td>
                <td>{row.accountSize}</td>
                <td>{row.status}</td>
                <td>{row.amount}</td>
                <td>
                  <button type="button" onClick={() => onOpenProfile(row.user)}>
                    View User Profile
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

export default OrdersPage

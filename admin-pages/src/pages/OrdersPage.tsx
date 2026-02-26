import { useState, useEffect } from 'react'
import type { AdminUser } from './UsersPage'
import { fetchOrderStats, fetchOrders, type OrderStats, type Order } from '../lib/adminAuth'

interface OrdersPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const OrdersPage = ({ onOpenProfile }: OrdersPageProps) => {
  const pageSize = 10
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month'>('week')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadStats = async (period: 'today' | 'week' | 'month') => {
    try {
      setStatsLoading(true)
      const data = await fetchOrderStats(period)
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadOrders = async (page: number = 1, period: 'today' | 'week' | 'month' = statsPeriod, statusFilterParam: string = statusFilter) => {
    try {
      setLoading(true)
      const data = await fetchOrders(page, pageSize, period, statusFilterParam || undefined)
      setOrders(data.orders)
      setTotalPages(data.pagination.pages)
      setCurrentPage(data.pagination.page)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStats(statsPeriod)
    void loadOrders(1, statsPeriod)
  }, [statsPeriod])

  useEffect(() => {
    void loadOrders(1, statsPeriod, statusFilter)
  }, [statusFilter])

  useEffect(() => {
    void loadOrders(1)
  }, [])

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'status-paid'
      case 'pending':
      case 'created':
        return 'status-pending'
      case 'failed':
      case 'expired':
        return 'status-failed'
      default:
        return 'status-default'
    }
  }

  const formatStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'Paid'
      case 'pending':
        return 'Pending'
      case 'created':
        return 'Created'
      case 'failed':
        return 'Failed'
      case 'expired':
        return 'Expired'
      default:
        return status
    }
  }

  const handlePageChange = (page: number) => {
    void loadOrders(page)
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <div className="page-header-row">
          <div>
            <h2>Orders</h2>
            <p>Track plan purchases and payment processing status.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="period-selector-large"
              style={{ minWidth: '120px' }}
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
              <option value="created">Created</option>
            </select>
            <select
              value={statsPeriod}
              onChange={(e) => setStatsPeriod(e.target.value as 'today' | 'week' | 'month')}
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
          <h3>Total Orders</h3>
          <strong>{statsLoading ? '...' : stats?.total_orders ?? 0}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Paid Orders</h3>
          <strong>{statsLoading ? '...' : stats?.paid_orders ?? 0}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Pending Orders</h3>
          <strong>{statsLoading ? '...' : stats?.pending_orders ?? 0}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Failed Orders</h3>
          <strong>{statsLoading ? '...' : stats?.failed_orders ?? 0}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Total Volume</h3>
          <strong>{statsLoading ? '...' : stats?.total_volume_formatted ?? '₦0'}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Success Rate</h3>
          <strong>{statsLoading ? '...' : stats?.success_rate_formatted ?? '0%'}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <h3>Recent Orders</h3>
        </div>
        {loading ? (
          <div className="loading-state">Loading orders...</div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>User</th>
                  <th>Account Size</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="order-id">{order.provider_order_id}</span>
                    </td>
                    <td>
                      <div className="user-info">
                        <div className="user-name">{order.user.name}</div>
                        <div className="user-email">{order.user.email}</div>
                      </div>
                    </td>
                    <td>{order.account_size}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td>{order.net_amount_formatted}</td>
                    <td>
                      {order.created_at ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {new Date(order.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onOpenProfile({
                          user_id: Number(order.user.id),
                          name: order.user.name,
                          email: order.user.email,
                          accounts: 'N/A', // This would need to be fetched separately
                          revenue: 'N/A', // This would need to be fetched separately
                          orders: 'N/A', // This would need to be fetched separately
                          payouts: 'N/A', // This would need to be fetched separately
                        })}
                      >
                        View User
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default OrdersPage

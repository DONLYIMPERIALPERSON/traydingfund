import { useState, useEffect } from 'react'
import type { AdminUser } from './UsersPage'
import {
  fetchOrderStats,
  fetchOrders,
  queryOrderStatus,
  approveCryptoOrder,
  declineCryptoOrder,
  type OrderStats,
  type Order,
} from '../lib/adminMock'

interface OrdersPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const OrdersPage = ({ onOpenProfile, isSuperAdmin }: OrdersPageProps & { isSuperAdmin: boolean }) => {
  const pageSize = 10
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month'>('week')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [todayStats, setTodayStats] = useState<OrderStats | null>(null)
  const [todayStatsLoading, setTodayStatsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [queryingOrderId, setQueryingOrderId] = useState<number | null>(null)
  const [searchEmail, setSearchEmail] = useState('')
  const [actioningOrderId, setActioningOrderId] = useState<number | null>(null)

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

  const loadTodayStats = async () => {
    try {
      setTodayStatsLoading(true)
      const data = await fetchOrderStats('today')
      setTodayStats(data)
    } catch (error) {
      console.error('Failed to fetch today stats:', error)
    } finally {
      setTodayStatsLoading(false)
    }
  }

  const loadOrders = async (
    page: number = 1,
    period: 'today' | 'week' | 'month' = statsPeriod,
    statusFilterParam: string = statusFilter,
    searchEmailParam: string = searchEmail,
  ) => {
    try {
      setLoading(true)
      const data = await fetchOrders(page, pageSize, period, statusFilterParam || undefined, searchEmailParam || undefined)
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
    if (isSuperAdmin) {
      void loadStats(statsPeriod)
      void loadTodayStats()
    }
    void loadOrders(1, statsPeriod)
  }, [statsPeriod, isSuperAdmin])

  useEffect(() => {
    void loadOrders(1, statsPeriod, statusFilter)
  }, [statusFilter])

  useEffect(() => {
    const debounce = window.setTimeout(() => {
      void loadOrders(1, statsPeriod, statusFilter, searchEmail)
    }, 400)

    return () => window.clearTimeout(debounce)
  }, [searchEmail, statsPeriod, statusFilter])

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

  const handleQueryStatus = async (order: Order) => {
    setQueryingOrderId(order.id)
    try {
      const result = await queryOrderStatus(order.id)
      if (result.error) {
        alert(`PalmPay query failed: ${result.error}`)
      } else {
        alert(`Order updated from ${result.previous_status ?? 'unknown'} to ${result.status}.`)
      }
      if (isSuperAdmin) {
        await loadStats(statsPeriod)
      }
      await loadOrders(currentPage)
    } finally {
      setQueryingOrderId(null)
    }
  }

  const handleCryptoAction = async (order: Order, action: 'approve' | 'decline') => {
    setActioningOrderId(order.id)
    try {
      if (action === 'approve') {
        await approveCryptoOrder(order.id)
      } else {
        await declineCryptoOrder(order.id)
      }
      await loadOrders(currentPage)
    } finally {
      setActioningOrderId(null)
    }
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
            <input
              type="search"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search user email"
              className="period-selector-large"
              style={{ minWidth: '220px' }}
            />
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

      {isSuperAdmin && (
        <div className="admin-kpi-grid">
          <article className="admin-kpi-card">
            <h3>Today's Orders</h3>
            <strong>{todayStatsLoading ? '...' : todayStats?.total_orders ?? 0}</strong>
            <p className="kpi-meta">Amount: {todayStatsLoading ? '...' : todayStats?.total_volume_formatted ?? '$0'}</p>
          </article>
          <article className="admin-kpi-card">
            <h3>Total Orders</h3>
            <strong>{statsLoading ? '...' : stats?.total_orders ?? 0}</strong>
            <p className="kpi-meta">Amount: {statsLoading ? '...' : stats?.total_volume_formatted ?? '$0'}</p>
          </article>
        </div>
      )}

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
                  <th>Payment</th>
                  <th>Action</th>
                  <th>Query</th>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>{order.payment_method ?? '—'}</span>
                        {order.crypto_currency && (
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{order.crypto_currency}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                        {order.payment_method === 'crypto' && order.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleCryptoAction(order, 'approve')}
                              disabled={actioningOrderId === order.id}
                            >
                              {actioningOrderId === order.id ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCryptoAction(order, 'decline')}
                              disabled={actioningOrderId === order.id}
                            >
                              {actioningOrderId === order.id ? 'Declining...' : 'Decline'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void handleQueryStatus(order)}
                        disabled={queryingOrderId === order.id}
                      >
                        {queryingOrderId === order.id ? 'Querying...' : 'Query Status'}
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

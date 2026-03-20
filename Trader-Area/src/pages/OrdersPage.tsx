import React, { useEffect, useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchOrders, type TraderOrder } from '../mocks/auth'
import '../styles/DesktopOrdersPage.css'

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<TraderOrder[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrders = async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await fetchOrders(page, 5)
      setOrders(response.orders)
      setCurrentPage(response.pagination.page)
      setTotalPages(response.pagination.pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders(1)
  }, [])

  return (
    <div className="desktop-orders-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="desktop-orders-content">
        <div className="orders-header">
          <h1>Orders</h1>
          <p>Track your account purchases and payment status.</p>
        </div>

        {loading ? (
          <div className="orders-card">Loading orders...</div>
        ) : error ? (
          <div className="orders-card orders-error">{error}</div>
        ) : orders.length === 0 ? (
          <div className="orders-card">No orders yet.</div>
        ) : (
          <div className="orders-table-card">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Account Size</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="order-id">{order.provider_order_id}</div>
                    </td>
                    <td>{order.account_size}</td>
                    <td>
                      <div className="order-payment">
                        <span>{order.payment_method}</span>
                        <small>PASTEAZA CHECKOUT</small>
                      </div>
                    </td>
                    <td>
                      <span className={`order-status status-${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.net_amount_formatted}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {new Date(order.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="orders-pagination">
                <button
                  type="button"
                  onClick={() => void loadOrders(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => void loadOrders(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <DesktopFooter />
    </div>
  )
}

export default OrdersPage
import React, { useEffect, useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchOrders, type TraderOrder } from '../mocks/auth'
import '../styles/DesktopOrdersPage.css'

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<TraderOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true)
        const response = await fetchOrders()
        setOrders(response.orders)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    }

    void loadOrders()
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
                        {order.payment_provider && (
                          <small>{order.payment_provider}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`order-status status-${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.net_amount_formatted}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <DesktopFooter />
    </div>
  )
}

export default OrdersPage
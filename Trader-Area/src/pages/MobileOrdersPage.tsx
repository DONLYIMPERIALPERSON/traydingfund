import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import { fetchOrders, type TraderOrder } from '../lib/traderAuth'
import '../styles/MobileOrdersPage.css'

const MobileOrdersPage: React.FC = () => {
  const navigate = useNavigate()
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
    <div className="mobile-orders-page">
      <div className="mobile-orders-shell">
        <header className="mobile-orders-header">
          <button type="button" className="mobile-orders-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-orders-header__text">
            <h1>Orders</h1>
            <p>Track your account purchases and payment status.</p>
          </div>
          <button type="button" className="mobile-orders-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        {loading ? (
          <div className="mobile-orders-empty">Loading orders...</div>
        ) : error ? (
          <ServiceUnavailableState onRetry={() => void loadOrders(currentPage)} />
        ) : orders.length === 0 ? (
          <div className="mobile-orders-empty">No orders yet.</div>
        ) : (
          <section className="mobile-orders-list">
            {orders.map((order) => (
              <article key={order.id} className="mobile-order-card">
                <div className="mobile-order-card__row mobile-order-card__row--top">
                  <div>
                    <span className="mobile-order-card__label">Order</span>
                    <strong>{order.provider_order_id}</strong>
                  </div>
                  <span className={`mobile-order-card__status status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>

                <div className="mobile-order-card__row">
                  <span>Account Size</span>
                  <strong>{order.account_size}</strong>
                </div>

                <div className="mobile-order-card__row">
                  <span>Payment</span>
                  <strong>{order.payment_method}</strong>
                </div>

                <div className="mobile-order-card__row">
                  <span>Amount</span>
                  <strong>{order.net_amount_formatted}</strong>
                </div>

                <div className="mobile-order-card__row">
                  <span>Date</span>
                  <div className="mobile-order-card__date">
                    <strong>{new Date(order.created_at).toLocaleDateString()}</strong>
                    <small>{new Date(order.created_at).toLocaleTimeString()}</small>
                  </div>
                </div>
              </article>
            ))}

            {totalPages > 1 ? (
              <div className="mobile-orders-pagination">
                <button type="button" onClick={() => void loadOrders(currentPage - 1)} disabled={currentPage <= 1}>
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button type="button" onClick={() => void loadOrders(currentPage + 1)} disabled={currentPage >= totalPages}>
                  Next
                </button>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </div>
  )
}

export default MobileOrdersPage
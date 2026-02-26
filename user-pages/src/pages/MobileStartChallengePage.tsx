import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PaymentDetailsModal from '../components/PaymentDetailsModal'
import {
  initPalmPayBankTransfer,
  previewCheckoutCoupon,
  refreshPaymentOrderStatus,
  type CheckoutCouponPreviewResponse,
  type PaymentOrderResponse,
} from '../lib/auth'
import '../styles/MobileStartChallengePage.css'

interface AccountData {
  id?: string;
  size: string;
  drawdown: string;
  target: string;
  phases: string;
  days: string;
  payout: string;
  fee: string;
  status: string;
}

const MobileStartChallengePage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const accountData = location.state as AccountData

  const [agreements, setAgreements] = useState({
    terms: false
  })

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('bank-transfer')
  const [promoCode, setPromoCode] = useState<string>('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [couponPreview, setCouponPreview] = useState<CheckoutCouponPreviewResponse | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<PaymentOrderResponse | null>(null)

  const inferPlanId = (account: AccountData): string => {
    if (account.id) return account.id
    const normalized = account.size.toLowerCase().replace(/\s+/g, '')
    if (normalized.includes('200k')) return '200k'
    if (normalized.includes('400k')) return '400k'
    if (normalized.includes('600k')) return '600k'
    if (normalized.includes('800k')) return '800k'
    if (normalized.includes('1.5m')) return '1.5m'
    if (normalized.includes('3m')) return '3m'
    return ''
  }

  const handleBack = () => {
    navigate(-1)
  }

  const handleAgreementChange = (type: 'terms') => {
    setAgreements(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const handleContinue = () => {
    if (!selectedPaymentMethod) return
    if (selectedPaymentMethod !== 'bank-transfer') return

    const planId = inferPlanId(accountData)
    if (!planId) {
      setPaymentStatus('Unable to determine account size for payment')
      return
    }

    setPaymentLoading(true)
    setPaymentStatus('Initializing bank transfer...')

    initPalmPayBankTransfer({
      plan_id: planId,
      coupon_code: couponPreview?.code ?? (promoCode.trim() || null),
    })
      .then((order) => {
        setCurrentOrder(order)
        setShowPaymentModal(true)
        setPaymentStatus('')

      })
      .catch((err: unknown) => {
        setPaymentStatus(err instanceof Error ? err.message : 'Failed to initialize payment')
      })
      .finally(() => {
        setPaymentLoading(false)
      })
  }

  const applyCoupon = async () => {
    if (!promoCode.trim()) return
    const planId = inferPlanId(accountData)
    if (!planId) {
      setCouponError('Unable to determine account size for coupon check')
      return
    }

    setCouponLoading(true)
    setCouponError('')
    try {
      const preview = await previewCheckoutCoupon({
        code: promoCode.trim().toUpperCase(),
        plan_id: planId,
      })
      setCouponPreview(preview)
    } catch (err: unknown) {
      setCouponPreview(null)
      setCouponError(err instanceof Error ? err.message : 'Failed to apply coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleProceedToPayment = async () => {
    if (!currentOrder) return

    setShowPaymentModal(false)
    setPaymentStatus('Waiting for transfer confirmation...')

    for (let i = 0; i < 12; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      const refreshed = await refreshPaymentOrderStatus(currentOrder.provider_order_id)
      if (refreshed.status === 'paid' && refreshed.assignment_status === 'assigned' && refreshed.challenge_id) {
        setPaymentStatus('Payment successful and account assigned. Redirecting...')
        navigate('/')
        return
      }
      if (refreshed.status === 'failed' || refreshed.status === 'expired') {
        setPaymentStatus(`Payment ${refreshed.status}. Please try again.`)
        return
      }
      setPaymentStatus(refreshed.message)
    }
  }

  const handleCloseModal = () => {
    setShowPaymentModal(false)
    setCurrentOrder(null)
  }

  if (!accountData) {
    return <div>Account data not found</div>
  }

  return (
    <div className="mobile-start-challenge-page">
      <div className="fixed-header">
        <div className="mobile-start-header-shell">
          <div className="mobile-start-header-row">
            <div className="mobile-start-header-left">
              <div className="mobile-start-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-start-header-center">
              <span className="mobile-start-header-title">Start Challenge</span>
            </div>
            <div className="mobile-start-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="content-container">
        <div className="content-padding">
          {/* Hero Section */}
          <div className="hero-section">
            <div className="account-balance-card">
              <div className="balance-row">
                <span className="balance-label">Account Balance:</span>
                <span className="balance-value">{accountData.size}</span>
              </div>
              <div className="currency-row">
                <span className="currency-label">Leverage:</span>
                <span className="currency-value">1:100</span>
              </div>
            </div>
          </div>

          {/* Promo Code */}
          <div className="mobile-start-account-card">
            <div className="mobile-start-section-card">
              <h3 className="promo-title">Promo Code</h3>
              <div className="promo-input-group">
                <input
                  type="text"
                  placeholder="Enter discount code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="promo-input"
                />
                <button className="apply-button" onClick={() => void applyCoupon()} disabled={couponLoading}>
                  {couponLoading ? 'Applying...' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="mobile-coupon-error">{couponError}</p>}
              {couponPreview && (
                <p className="mobile-coupon-success">
                  Applied {couponPreview.code}: -{couponPreview.formatted_discount_amount}
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="mobile-start-account-card">
            <div className="mobile-start-section-card">
              <h3 className="summary-title">Summary</h3>

              <div className="summary-card">
                <div className="summary-row">
                  <span className="summary-label">NairaTrader Challenge:</span>
                  <span className="summary-value">{accountData.phases}-Step</span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Currency:</span>
                  <span className="summary-value">Naira</span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Platform:</span>
                  <span className="summary-value">MetaTrader 5</span>
                </div>

                <div className="summary-row price-row">
                  <span className="summary-label">Price:</span>
                  <span className="summary-value">{accountData.fee}</span>
                </div>
              </div>

              <div className="total-section">
                <span className="total-label">Total:</span>
                <div className="total-amount">
                  {couponPreview && <div className="total-subtract">-{couponPreview.formatted_discount_amount}</div>}
                  <div className="total-value">{couponPreview?.formatted_final_amount ?? accountData.fee}</div>
                  <div className="total-vat">incl. VAT</div>
                </div>
              </div>
            </div>
          </div>



          {/* Agreements */}
          <div className="mobile-start-account-card">
            <div className="mobile-start-section-card">
              <div className="agreements">
                <div className="agreement-item">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreements.terms}
                    onChange={() => handleAgreementChange('terms')}
                    className="agreement-checkbox"
                  />
                  <label htmlFor="terms" className="agreement-label">
                    I agree to the <a href="https://nairatrader.com/rules" target="_blank" rel="noopener noreferrer" style={{color: '#FFD700'}}>Rules and Conditions</a>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!agreements.terms || !selectedPaymentMethod || paymentLoading}
            className="continue-button"
          >
            {paymentLoading ? 'Processing...' : 'Continue to Payment'}
          </button>
          {paymentStatus && <p className="mobile-coupon-success">{paymentStatus}</p>}
        </div>
      </div>

      {showPaymentModal && currentOrder && (
        <PaymentDetailsModal
          isOpen={showPaymentModal}
          onClose={handleCloseModal}
          paymentDetails={{
            bankName: currentOrder.payer_bank_name || '',
            accountName: currentOrder.payer_account_name || '',
            accountNumber: currentOrder.payer_virtual_acc_no || '',
            amount: `₦${(currentOrder.net_amount_kobo / 100).toLocaleString()}`,
          }}
          onProceedToPayment={handleProceedToPayment}
          isProcessing={false}
        />
      )}
    </div>
  )
}

export default MobileStartChallengePage

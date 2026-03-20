import React, { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import PaymentDetailsModal from '../components/PaymentDetailsModal'
import {
  initPalmPayBankTransfer,
  initCryptoOrder,
  previewCheckoutCoupon,
  refreshPaymentOrderStatus,
  type CheckoutCouponPreviewResponse,
  type PaymentOrderResponse,
} from '../mocks/auth'
import '../styles/DesktopChallengeCheckoutPage.css'

interface AccountData {
  id?: string
  size: string
  drawdown: string
  target: string
  phases: string
  days: string
  payout: string
  fee: string
  status: string
}

const DesktopStartChallengePage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const accountData = location.state as AccountData | undefined

  const [agreements, setAgreements] = useState({ terms: false })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('bank-transfer')
  const [selectedCrypto, setSelectedCrypto] = useState('USDT')
  const [selectedNetwork, setSelectedNetwork] = useState<'ERC20' | 'TRC20' | 'SOL'>('ERC20')
  const [promoCode, setPromoCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [couponPreview, setCouponPreview] = useState<CheckoutCouponPreviewResponse | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<PaymentOrderResponse | null>(null)
  const [modalStatus, setModalStatus] = useState<'waiting' | 'confirming' | 'success'>('waiting')
  const pollingActiveRef = useRef(false)

  const inferPlanId = (account: AccountData | undefined): string => {
    if (!account) return ''
    if (account.id) return account.id
    const normalized = account.size.toLowerCase().replace(/\s+/g, '')
    const match = normalized.match(/([0-9.]+)(k|m)/)
    if (!match) return ''
    const amount = match[1]
    const unit = match[2]
    return `${amount}${unit}`
  }

  const handleAgreementChange = (type: 'terms') => {
    setAgreements(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const handleContinue = () => {
    if (!selectedPaymentMethod || !agreements.terms || !accountData) return
    const planId = inferPlanId(accountData)
    if (!planId) {
      setPaymentStatus('Unable to determine account size for payment')
      return
    }

    const amountNumeric = couponPreview?.final_amount ?? Number(accountData.fee.replace(/[^0-9.]/g, ''))
    const amountKobo = Math.round(amountNumeric * 100)

    if (selectedPaymentMethod === 'crypto') {
      setPaymentLoading(true)
      setPaymentStatus('Generating crypto payment details...')
      initCryptoOrder({
        plan_id: planId,
        account_size: accountData.size,
        amount_kobo: amountKobo + 100,
        coupon_code: couponPreview?.code ?? (promoCode.trim() || null),
        crypto_currency: 'USDT',
        challenge_type: (accountData as any).challenge_type,
        phase: (accountData as any).phase,
      })
        .then((order) => {
          setCurrentOrder(order)
          setShowPaymentModal(true)
          setPaymentStatus('')
        })
        .catch((err: unknown) => {
          setPaymentStatus(err instanceof Error ? err.message : 'Failed to initialize crypto order')
        })
        .finally(() => {
          setPaymentLoading(false)
        })
      return
    }
    if (selectedPaymentMethod !== 'bank-transfer') return
    setPaymentLoading(true)
    setPaymentStatus('Initializing bank transfer...')

    initPalmPayBankTransfer({
      plan_id: planId,
      account_size: accountData.size,
      amount_kobo: amountKobo,
      coupon_code: couponPreview?.code ?? (promoCode.trim() || null),
      challenge_type: (accountData as any).challenge_type,
      phase: (accountData as any).phase,
    })
      .then((order) => {
        setCurrentOrder(order)
        setShowPaymentModal(true)
        setPaymentStatus('')
        void startPaymentPolling(order.provider_order_id)

      })
      .catch((err: unknown) => {
        setPaymentStatus(err instanceof Error ? err.message : 'Failed to initialize payment')
      })
      .finally(() => {
        setPaymentLoading(false)
      })
  }

  const applyCoupon = async () => {
    if (!promoCode.trim() || !accountData) return
    const planId = inferPlanId(accountData)
    if (!planId) {
      setCouponError('Unable to determine account size for coupon check')
      return
    }

    setCouponLoading(true)
    setCouponError('')
    try {
      const amountKobo = Math.round(Number(accountData.fee.replace(/[^0-9.]/g, '')) * 100)
      const preview = await previewCheckoutCoupon({
        code: promoCode.trim().toUpperCase(),
        plan_id: planId,
        amount_kobo: amountKobo,
      })
      setCouponPreview(preview)
    } catch (err: unknown) {
      setCouponPreview(null)
      setCouponError(err instanceof Error ? err.message : 'Failed to apply coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const startPaymentPolling = async (orderId: string) => {
    pollingActiveRef.current = true
    setModalStatus('confirming')
    for (let i = 0; i < 24; i += 1) {
      if (!pollingActiveRef.current) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 5000))
      try {
        if (!pollingActiveRef.current) {
          return
        }
        const refreshed = await refreshPaymentOrderStatus(orderId)
        if (refreshed.status === 'completed' && refreshed.assignment_status === 'assigned') {
          if (!pollingActiveRef.current) {
            return
          }
          setModalStatus('success')
          setTimeout(() => {
            navigate('/')
          }, 3000)
          return
        }
        if (refreshed.status === 'completed') {
          if (!pollingActiveRef.current) {
            return
          }
          setModalStatus('success')
          setTimeout(() => {
            navigate('/')
          }, 3000)
          return
        }
        if (refreshed.status === 'failed' || refreshed.status === 'expired') {
          if (!pollingActiveRef.current) {
            return
          }
          setModalStatus('waiting')
          setPaymentStatus(`Payment ${refreshed.status}. Please try again.`)
          setShowPaymentModal(false)
          return
        }
      } catch (error) {
        console.error('Payment status check failed:', error)
      }
    }

    if (!pollingActiveRef.current) {
      return
    }

    setModalStatus('waiting')
    setPaymentStatus('Payment confirmation timed out. Please check your payment status.')
    setShowPaymentModal(false)
  }

  const handleCloseModal = () => {
    pollingActiveRef.current = false
    setModalStatus('waiting')
    setShowPaymentModal(false)
    setCurrentOrder(null)
  }

  return (
    <div className="desktop-challenge-checkout-page">
      <DesktopHeader />
      <DesktopSidebar />

      <div className="desktop-challenge-content">
        <div className="desktop-checkout-back">
          <button onClick={() => navigate('/trading-accounts')}>
            <i className="fas fa-arrow-left"></i>
            Back to Trading Accounts
          </button>
        </div>

        <div className="desktop-checkout-header">
          <h1>Start Challenge</h1>
          <p>Complete checkout to start your selected account challenge.</p>
        </div>

        {!accountData ? (
          <div className="desktop-checkout-empty">
            No account selected. Please go back and choose an account type.
          </div>
        ) : (
          <>
            <div className="desktop-checkout-grid">
              <div className="desktop-checkout-column">
                <div className="desktop-checkout-panel">
                  <h3>Account Details</h3>
                  <div className="desktop-summary-row"><span>Account Balance</span><strong>{accountData.size}</strong></div>
                  <div className="desktop-summary-row"><span>Leverage</span><strong>1:100</strong></div>
                  <div className="desktop-summary-row"><span>Trading Account Currency</span><strong>USD</strong></div>
                  <div className="desktop-summary-row"><span>Platform</span><strong>MetaTrader 5</strong></div>
                </div>

                <div className="desktop-checkout-panel">
                  <h3>Promo Code</h3>
                  <div className="desktop-promo-row">
                    <input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter discount code"
                    />
                    <button type="button" onClick={() => void applyCoupon()} disabled={couponLoading}>
                      {couponLoading ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="desktop-coupon-error">{couponError}</p>}
                  {couponPreview && (
                    <p className="desktop-coupon-success">
                      Applied {couponPreview.code}: -{couponPreview.formatted_discount_amount}
                    </p>
                  )}
                </div>


              </div>

              <div className="desktop-checkout-column">
                <div className="desktop-checkout-panel">
                  <h3>Summary</h3>
                  <div className="desktop-summary-row"><span>Account Balance</span><strong>{accountData.size}</strong></div>
                  <div className="desktop-summary-row"><span>Challenge Type</span><strong>{accountData.phases}-Step</strong></div>
                  <div className="desktop-summary-row"><span>Target</span><strong>{accountData.target}</strong></div>
                  <div className="desktop-summary-row"><span>Max Drawdown</span><strong>{accountData.drawdown}</strong></div>
                  {couponPreview && (
                    <>
                      <div className="desktop-summary-row"><span>Original Amount</span><strong>{couponPreview.formatted_original_amount}</strong></div>
                      <div className="desktop-summary-row"><span>Discount ({couponPreview.code})</span><strong>-{couponPreview.formatted_discount_amount}</strong></div>
                    </>
                  )}
                  <div className="desktop-summary-row desktop-summary-total" style={{color: 'black'}}><span>Total</span><strong style={{color: 'black'}}>{couponPreview?.formatted_final_amount ?? accountData.fee}</strong></div>
                  {selectedPaymentMethod === 'crypto' && (
                    <div className="desktop-summary-row">
                      <span>Crypto Fee</span>
                      <strong>$1</strong>
                    </div>
                  )}

                  <div className="desktop-payment-method-block">
                    <h4>Payment Method</h4>
                    <div className="desktop-checkout-methods">
                      <label className={`desktop-method-option ${selectedPaymentMethod === 'bank-transfer' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="payment-method"
                          value="bank-transfer"
                          checked={selectedPaymentMethod === 'bank-transfer'}
                          onChange={() => setSelectedPaymentMethod('bank-transfer')}
                        />
                        <span>NGN Bank Transfer</span>
                      </label>
                      <label className={`desktop-method-option ${selectedPaymentMethod === 'crypto' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="payment-method"
                          value="crypto"
                          checked={selectedPaymentMethod === 'crypto'}
                          onChange={() => setSelectedPaymentMethod('crypto')}
                        />
                        <span>Crypto</span>
                      </label>
                    </div>
                    {selectedPaymentMethod === 'crypto' && (
                      <div className="desktop-crypto-picker">
                        <p>Crypto: <strong>USDT</strong></p>
                        <div className="desktop-crypto-options">
                          {(['ERC20', 'TRC20', 'SOL'] as const).map((network) => (
                            <button
                              key={network}
                              type="button"
                              className={selectedNetwork === network ? 'active' : ''}
                              onClick={() => setSelectedNetwork(network)}
                            >
                              {network}
                            </button>
                          ))}
                        </div>
                        <p style={{ marginTop: '8px' }}>Select network to pay with</p>
                      </div>
                    )}
                  </div>

                  <label className="desktop-check-row" style={{marginTop: '16px', marginBottom: '16px'}}>
                    <input type="checkbox" checked={agreements.terms} onChange={() => handleAgreementChange('terms')} />
                    I agree to the <a href="https://nairatrader.com/rules" target="_blank" rel="noopener noreferrer" style={{color: 'black', fontWeight: 'bold'}}>Rules and Conditions</a>
                  </label>

                  <button
                    className="desktop-checkout-continue"
                    onClick={handleContinue}
                    disabled={!agreements.terms || paymentLoading}
                  >
                    {paymentLoading ? 'Processing...' : 'Proceed to Payment'}
                  </button>
                  {paymentStatus && <p className="desktop-coupon-success">{paymentStatus}</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <DesktopFooter />

      {showPaymentModal && currentOrder && (
        <PaymentDetailsModal
          isOpen={showPaymentModal}
          onClose={handleCloseModal}
          status={modalStatus}
          paymentDetails={{
            bankName: currentOrder.payer_bank_name || '',
            accountName: currentOrder.payer_account_name || '',
            accountNumber: currentOrder.payer_virtual_acc_no || '',
            amount: currentOrder.bank_transfer_amount_ngn
              ? `₦${currentOrder.bank_transfer_amount_ngn.toLocaleString('en-NG')}`
              : `$${(currentOrder.net_amount_kobo / 100).toLocaleString('en-US')}`,
            cryptoCurrency: currentOrder.crypto_currency ?? selectedCrypto,
            cryptoAddress: currentOrder.crypto_address ?? null,
            cryptoNetworks: currentOrder.crypto_networks ?? null,
            cryptoNetwork: selectedNetwork,
          }}
        />
      )}
    </div>
  )
}

export default DesktopStartChallengePage

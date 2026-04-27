import React, { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MobilePaymentSheet from '../components/MobilePaymentSheet'
import {
  createBreezyRenewalOrder,
  initPalmPayBankTransfer,
  initCryptoOrder,
  initFreeOrder,
  previewCheckoutCoupon,
  refreshPaymentOrderStatus,
  type CheckoutCouponPreviewResponse,
  type PaymentOrderResponse,
} from '../lib/traderAuth'
import '../styles/MobileStartChallengePage.css'

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
  challenge_type?: string
  phase?: string
}

const normalizeDisplayPrice = (value: string | number | null | undefined, currency: 'USD' | 'NGN') => {
  if (value == null) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (raw.startsWith('$') || raw.startsWith('₦')) return raw

  const numeric = Number(raw.replace(/[^0-9.\-]/g, ''))
  if (!Number.isFinite(numeric)) return raw

  return currency === 'NGN'
    ? `₦${numeric.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : `$${numeric.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const MobileStartChallengePage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const accountData = location.state as AccountData | undefined
  const [agreements, setAgreements] = useState({ terms: false })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('bank-transfer')
  const [selectedPlatform, setSelectedPlatform] = useState<'ctrader' | 'mt5'>('mt5')
  const [selectedCrypto] = useState('USDT')
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

  const isNgnAccount = Boolean(
    accountData?.size?.trim().startsWith('₦')
    || String(accountData?.challenge_type ?? '').toLowerCase().startsWith('ngn'),
  )
  const checkoutCurrency: 'USD' | 'NGN' = isNgnAccount ? 'NGN' : 'USD'
  const isFreeCheckout = Boolean(couponPreview && couponPreview.final_amount === 0)
  const isBreezyAccount = String(accountData?.challenge_type ?? '').toLowerCase() === 'breezy'

  React.useEffect(() => {
    if (isBreezyAccount) {
      setSelectedPaymentMethod('bank-transfer')
      setSelectedPlatform('mt5')
    }
  }, [isBreezyAccount])

  const inferPlanId = (account: AccountData | undefined): string => {
    if (!account) return ''
    if (account.id) return account.id
    const normalized = account.size.toLowerCase().replace(/\s+/g, '')
    const match = normalized.match(/([0-9.]+)(k|m)/)
    if (!match) return ''
    return `${match[1]}${match[2]}`
  }

  const summaryRows = useMemo(() => {
    if (!accountData) return []
    return [
      { label: 'Account Balance', value: accountData.size },
        { label: 'Challenge Type', value: isBreezyAccount ? 'Breezy Weekly Subscription' : `${accountData.phases}-Step` },
      { label: 'Target', value: accountData.target },
      { label: 'Max Drawdown', value: accountData.drawdown },
    ]
  }, [accountData])

  const handleAgreementChange = () => {
    setAgreements((prev) => ({ ...prev, terms: !prev.terms }))
  }

  const normalizeCouponError = (error: unknown) => {
    if (!error) return 'Failed to apply coupon'
    if (typeof error === 'string') return error.trim() || 'Failed to apply coupon'
    if (error instanceof Error) return error.message || 'Failed to apply coupon'
    return 'Failed to apply coupon'
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
        ...(accountData.challenge_type ? { challenge_type: accountData.challenge_type } : {}),
      })
      setCouponPreview(preview)
    } catch (err: unknown) {
      setCouponPreview(null)
      setCouponError(normalizeCouponError(err))
    } finally {
      setCouponLoading(false)
    }
  }

  const startPaymentPolling = async (orderId: string) => {
    pollingActiveRef.current = true
    for (let i = 0; i < 24; i += 1) {
      if (!pollingActiveRef.current) return
      await new Promise((resolve) => setTimeout(resolve, 5000))
      try {
        if (!pollingActiveRef.current) return
        const refreshed = await refreshPaymentOrderStatus(orderId)
        if (refreshed.status === 'completed') {
          if (!pollingActiveRef.current) return
          setModalStatus('success')
          setTimeout(() => navigate('/'), 3000)
          return
        }
        if (refreshed.status === 'failed' || refreshed.status === 'expired') {
          if (!pollingActiveRef.current) return
          setModalStatus('waiting')
          setPaymentStatus(`Payment ${refreshed.status}. Please try again.`)
          setShowPaymentModal(false)
          return
        }
      } catch (error) {
        console.error('Payment status check failed:', error)
      }
    }
    if (!pollingActiveRef.current) return
    setModalStatus('waiting')
    setPaymentStatus('Payment confirmation timed out. Please check your payment status.')
    setShowPaymentModal(false)
  }

  const handleContinue = () => {
    if (!selectedPaymentMethod || !agreements.terms || !accountData) return
    const planId = inferPlanId(accountData)
    if (!planId) {
      setPaymentStatus('Unable to determine account size for payment')
      return
    }

    const baseAmountNumeric = Number(accountData.fee.replace(/[^0-9.]/g, ''))
    const baseAmountKobo = Math.round(baseAmountNumeric * 100)

    if (isFreeCheckout) {
      setPaymentLoading(true)
      setPaymentStatus('Activating free challenge...')
      initFreeOrder({
        plan_id: planId,
        account_size: accountData.size,
        amount_kobo: baseAmountKobo,
        coupon_code: couponPreview?.code ?? (promoCode.trim() || null),
        challenge_type: accountData.challenge_type || 'two_step',
        phase: accountData.phase || 'phase_1',
        platform: selectedPlatform,
      })
        .then(() => {
          setPaymentStatus('Challenge activated! Redirecting...')
          setTimeout(() => navigate('/'), 2500)
        })
        .catch((err: unknown) => setPaymentStatus(err instanceof Error ? err.message : 'Failed to activate free challenge'))
        .finally(() => setPaymentLoading(false))
      return
    }

    if (selectedPaymentMethod === 'crypto') {
      if (isNgnAccount) {
        setPaymentStatus('Crypto payments are not available for NGN accounts.')
        return
      }
      setPaymentLoading(true)
      setPaymentStatus('Generating crypto payment details...')
      initCryptoOrder({
        plan_id: planId,
        account_size: accountData.size,
        amount_kobo: baseAmountKobo + 100,
        coupon_code: couponPreview?.code ?? (promoCode.trim() || null),
        crypto_currency: 'USDT',
        challenge_type: accountData.challenge_type || 'two_step',
        phase: accountData.phase || 'phase_1',
        platform: selectedPlatform,
      })
        .then((order) => {
          setCurrentOrder(order)
          setShowPaymentModal(true)
          setPaymentStatus('')
        })
        .catch((err: unknown) => setPaymentStatus(err instanceof Error ? err.message : 'Failed to initialize crypto order'))
        .finally(() => setPaymentLoading(false))
      return
    }

    setPaymentLoading(true)
    setPaymentStatus('Initializing bank transfer...')
    initPalmPayBankTransfer({
      plan_id: planId,
      account_size: accountData.size,
      amount_kobo: baseAmountKobo,
      coupon_code: couponPreview?.code ?? (promoCode.trim() || null),
      challenge_type: accountData.challenge_type || 'two_step',
      phase: accountData.phase || 'phase_1',
      platform: selectedPlatform,
    })
      .then((order) => {
        setCurrentOrder(order)
        setShowPaymentModal(true)
        setPaymentStatus('')
        void startPaymentPolling(order.provider_order_id)
      })
      .catch((err: unknown) => setPaymentStatus(err instanceof Error ? err.message : 'Failed to initialize payment'))
      .finally(() => setPaymentLoading(false))
  }

  const handleCloseModal = () => {
    pollingActiveRef.current = false
    setModalStatus('waiting')
    setShowPaymentModal(false)
    setCurrentOrder(null)
  }

  if (!accountData) {
    return (
      <div className="mobile-start-challenge-page">
        <div className="mobile-start-challenge-shell">
          <div className="mobile-start-challenge-empty">
            No account selected. Please go back and choose an account type.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-start-challenge-page">
      <div className="mobile-start-challenge-shell">
        <header className="mobile-start-challenge-header">
          <button type="button" className="mobile-start-challenge-header__icon" onClick={() => navigate('/trading-accounts')}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-start-challenge-header__text">
            <h1>Start Challenge</h1>
            <p>Complete checkout to start your selected account challenge.</p>
          </div>
          <button type="button" className="mobile-start-challenge-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-start-challenge-card">
          <h2>Account Details</h2>
          <div className="mobile-start-challenge-summary-list">
            <div className="mobile-start-challenge-summary-row"><span>Account Balance</span><strong>{accountData.size}</strong></div>
            <div className="mobile-start-challenge-summary-row"><span>Leverage</span><strong>1:100</strong></div>
            <div className="mobile-start-challenge-summary-row"><span>Trading Currency</span><strong>{checkoutCurrency}</strong></div>
            <div className="mobile-start-challenge-summary-row"><span>Platform</span><strong>{selectedPlatform === 'ctrader' ? 'cTrader' : 'MT5'}</strong></div>
          </div>
        </section>

        <section className="mobile-start-challenge-card">
          <h2>Select Platform</h2>
          <div className="mobile-start-challenge-platform-options">
            <button type="button" className={`mobile-start-challenge-platform ${selectedPlatform === 'ctrader' ? 'is-active' : ''}`} disabled>
              cTrader (Unavailable)
            </button>
            <button type="button" className={`mobile-start-challenge-platform ${selectedPlatform === 'mt5' ? 'is-active' : ''}`} onClick={() => setSelectedPlatform('mt5')}>
              MT5
            </button>
          </div>
        </section>

        {!isBreezyAccount ? (
          <section className="mobile-start-challenge-card">
            <h2>Promo Code</h2>
            <div className="mobile-start-challenge-promo-row">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter discount code"
              />
              <button type="button" onClick={() => void applyCoupon()} disabled={couponLoading}>
                {couponLoading ? 'Applying...' : 'Apply'}
              </button>
            </div>
            {couponError ? <p className="mobile-start-challenge-error">{couponError}</p> : null}
            {couponPreview ? <p className="mobile-start-challenge-success">Applied {couponPreview.code}: -{couponPreview.formatted_discount_amount}</p> : null}
          </section>
        ) : null}

        <section className="mobile-start-challenge-card">
          <h2>Summary</h2>
          <div className="mobile-start-challenge-summary-list">
            {summaryRows.map((row) => (
              <div key={row.label} className="mobile-start-challenge-summary-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
            {couponPreview ? (
              <>
                <div className="mobile-start-challenge-summary-row">
                  <span>Original Amount</span>
                  <strong>{couponPreview.formatted_original_amount}</strong>
                </div>
                <div className="mobile-start-challenge-summary-row">
                  <span>Discount ({couponPreview.code})</span>
                  <strong>-{couponPreview.formatted_discount_amount}</strong>
                </div>
              </>
            ) : null}
            <div className="mobile-start-challenge-summary-row mobile-start-challenge-summary-row--total">
              <span>Total</span>
              <strong>{normalizeDisplayPrice(couponPreview?.formatted_final_amount ?? accountData.fee, checkoutCurrency)}</strong>
            </div>
            {selectedPaymentMethod === 'crypto' && !isFreeCheckout ? (
              <div className="mobile-start-challenge-summary-row">
                <span>Crypto Fee</span>
                <strong>$1</strong>
              </div>
            ) : null}
          </div>

          {!isFreeCheckout ? (
            <div className="mobile-start-challenge-payment-block">
              <h3>Payment Method</h3>
              <div className="mobile-start-challenge-payment-options">
                <button
                  type="button"
                  className={selectedPaymentMethod === 'bank-transfer' ? 'is-active' : ''}
                  onClick={() => setSelectedPaymentMethod('bank-transfer')}
                >
                  NGN Bank Transfer
                </button>
                {!isNgnAccount && !isBreezyAccount ? (
                  <button
                    type="button"
                    className={selectedPaymentMethod === 'crypto' ? 'is-active' : ''}
                    onClick={() => setSelectedPaymentMethod('crypto')}
                  >
                    Crypto
                  </button>
                ) : null}
              </div>

              {selectedPaymentMethod === 'crypto' ? (
                <div className="mobile-start-challenge-crypto-picker">
                  <p>Crypto: <strong>USDT</strong></p>
                  <div className="mobile-start-challenge-network-options">
                    {(['ERC20', 'TRC20', 'SOL'] as const).map((network) => (
                      <button
                        key={network}
                        type="button"
                        className={selectedNetwork === network ? 'is-active' : ''}
                        onClick={() => setSelectedNetwork(network)}
                      >
                        {network}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <label className="mobile-start-challenge-checkbox">
            <input type="checkbox" checked={agreements.terms} onChange={handleAgreementChange} />
            <span>
              I agree to the <a href="https://machefunded.com/rules" target="_blank" rel="noopener noreferrer">Rules and Conditions</a>
            </span>
          </label>

          <button
            className="mobile-start-challenge-continue"
            onClick={handleContinue}
            disabled={!agreements.terms || paymentLoading}
          >
            {paymentLoading
              ? 'Processing...'
              : isFreeCheckout
                ? 'Activate Free Challenge'
                : 'Proceed to Payment'}
          </button>

          {paymentStatus ? <p className="mobile-start-challenge-success">{paymentStatus}</p> : null}
        </section>
      </div>

      {showPaymentModal && currentOrder ? (
        <MobilePaymentSheet
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
      ) : null}
    </div>
  )
}

export default MobileStartChallengePage
import React, { useState, useEffect } from 'react'
import '../styles/PaymentDetailsModal.css'

interface PaymentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  paymentDetails: {
    bankName: string
    accountName: string
    accountNumber: string
    amount: string
    cryptoCurrency?: string | null
    cryptoAddress?: string | null
    cryptoNetworks?: {
      ERC20?: string | null
      SOL?: string | null
      TRC20?: string | null
    } | null
    cryptoNetwork?: 'ERC20' | 'SOL' | 'TRC20'
  }
  status?: 'waiting' | 'confirming' | 'success'
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  isOpen,
  onClose,
  paymentDetails,
  status = 'waiting',
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutes in seconds
  const [currentStatus, setCurrentStatus] = useState(status)

  useEffect(() => {
    setCurrentStatus(status)
  }, [status])

  useEffect(() => {
    if (!isOpen || currentStatus !== 'waiting') return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, currentStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const isCrypto = Boolean(paymentDetails.cryptoCurrency && paymentDetails.cryptoAddress)
  const networks = paymentDetails.cryptoNetworks

  if (!isOpen) return null

  const networkAddress = paymentDetails.cryptoNetwork
    ? networks?.[paymentDetails.cryptoNetwork] || paymentDetails.cryptoAddress
    : paymentDetails.cryptoAddress

  const renderStatusContent = () => {
    switch (currentStatus) {
      case 'waiting':
        return (
          <>
            <div className="payment-modal-header">
              <h2>{isCrypto ? 'Crypto Payment Details' : 'Bank Transfer Details'}</h2>
              <button className="payment-modal-close" onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="payment-modal-body">
              <div className="payment-status-message">
                <i className="fas fa-clock"></i>
                <span>Waiting for payment... Time remaining: {formatTime(timeLeft)}</span>
              </div>

              <p className="payment-instruction">
                {isCrypto
                  ? 'Send the exact crypto amount to the wallet below. An admin will confirm your payment.'
                  : 'Please make a bank transfer using the details below. The system will automatically confirm your payment.'}
              </p>

              <div className="payment-details-grid">
                {isCrypto ? (
                  <>
                    <div className="payment-detail-row">
                      <label>Crypto:</label>
                      <div className="payment-detail-value">
                        <span>{paymentDetails.cryptoCurrency}</span>
                        <button
                          className="copy-button"
                          onClick={() => void copyToClipboard(paymentDetails.cryptoCurrency || '', 'crypto')}
                          title="Copy crypto"
                        >
                          <i className="fas fa-copy"></i>
                          {copiedField === 'crypto' && <span className="copied-text">Copied!</span>}
                        </button>
                      </div>
                    </div>
                    <div className="payment-detail-row">
                      <label>Wallet Address:</label>
                      <div className="payment-detail-value">
                        <span className="account-number">{networkAddress}</span>
                        <button
                          className="copy-button"
                          onClick={() => void copyToClipboard(networkAddress || '', 'wallet')}
                          title="Copy wallet address"
                        >
                          <i className="fas fa-copy"></i>
                          {copiedField === 'wallet' && <span className="copied-text">Copied!</span>}
                        </button>
                      </div>
                    </div>
                    <div className="payment-detail-row payment-qr-row">
                      <label>QR Code:</label>
                      <div className="payment-detail-value">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(networkAddress || '')}`}
                          alt="Payment QR"
                        />
                      </div>
                    </div>
                    <div className="payment-detail-row payment-amount-row">
                      <label>Amount (USD):</label>
                      <div className="payment-detail-value">
                        <span className="payment-amount">{paymentDetails.amount}</span>
                        <button
                          className="copy-button"
                          onClick={() => void copyToClipboard(paymentDetails.amount.replace('$', '').replace(',', ''), 'amount')}
                          title="Copy amount"
                        >
                          <i className="fas fa-copy"></i>
                          {copiedField === 'amount' && <span className="copied-text">Copied!</span>}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                <div className="payment-detail-row">
                  <label>Bank Name:</label>
                  <div className="payment-detail-value">
                    <span>{paymentDetails.bankName}</span>
                    <button
                      className="copy-button"
                      onClick={() => void copyToClipboard(paymentDetails.bankName, 'bank')}
                      title="Copy bank name"
                    >
                      <i className="fas fa-copy"></i>
                      {copiedField === 'bank' && <span className="copied-text">Copied!</span>}
                    </button>
                  </div>
                </div>

                <div className="payment-detail-row">
                  <label>Account Name:</label>
                  <div className="payment-detail-value">
                    <span>{paymentDetails.accountName}</span>
                    <button
                      className="copy-button"
                      onClick={() => void copyToClipboard(paymentDetails.accountName, 'account')}
                      title="Copy account name"
                    >
                      <i className="fas fa-copy"></i>
                      {copiedField === 'account' && <span className="copied-text">Copied!</span>}
                    </button>
                  </div>
                </div>

                <div className="payment-detail-row">
                  <label>Account Number:</label>
                  <div className="payment-detail-value">
                    <span className="account-number">{paymentDetails.accountNumber}</span>
                    <button
                      className="copy-button"
                      onClick={() => void copyToClipboard(paymentDetails.accountNumber, 'number')}
                      title="Copy account number"
                    >
                      <i className="fas fa-copy"></i>
                      {copiedField === 'number' && <span className="copied-text">Copied!</span>}
                    </button>
                  </div>
                </div>

                <div className="payment-detail-row payment-amount-row">
                  <label>Amount:</label>
                  <div className="payment-detail-value">
                    <span className="payment-amount">{paymentDetails.amount}</span>
                    <button
                      className="copy-button"
                      onClick={() => void copyToClipboard(paymentDetails.amount.replace('$', '').replace(',', ''), 'amount')}
                      title="Copy amount"
                    >
                      <i className="fas fa-copy"></i>
                      {copiedField === 'amount' && <span className="copied-text">Copied!</span>}
                    </button>
                  </div>
                </div>
                  </>
                )}
              </div>

              <div className="payment-warning">
                <i className="fas fa-exclamation-triangle"></i>
                <span>
                  Important: Please ensure you transfer the exact amount to avoid payment processing delays.
                </span>
              </div>
            </div>

            {isCrypto && (
              <div className="payment-modal-footer">
                <button className="payment-proceed-button" onClick={onClose}>
                  <i className="fas fa-paper-plane"></i>
                  I have sent it
                </button>
              </div>
            )}
          </>
        )

      case 'confirming':
        return (
          <>
            <div className="payment-modal-header">
              <h2>Confirming Payment</h2>
              <button className="payment-modal-close" onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="payment-modal-body">
              <div className="payment-status-message confirming">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Confirming your payment... Please wait.</span>
              </div>

              {isCrypto ? (
                <div className="payment-details-grid confirming">
                  <div className="payment-detail-row">
                    <label>Crypto:</label>
                    <span>{paymentDetails.cryptoCurrency}</span>
                  </div>
                  <div className="payment-detail-row">
                    <label>Wallet Address:</label>
                    <span className="account-number">{networkAddress}</span>
                  </div>
                  <div className="payment-detail-row payment-amount-row">
                    <label>Amount (USD):</label>
                    <span className="payment-amount">{paymentDetails.amount}</span>
                  </div>
                </div>
              ) : (
                <div className="payment-details-grid confirming">
                  <div className="payment-detail-row">
                    <label>Bank Name:</label>
                    <span>{paymentDetails.bankName}</span>
                  </div>

                  <div className="payment-detail-row">
                    <label>Account Name:</label>
                    <span>{paymentDetails.accountName}</span>
                  </div>

                  <div className="payment-detail-row">
                    <label>Account Number:</label>
                    <div className="payment-detail-value">
                      <span className="account-number">{paymentDetails.accountNumber}</span>
                      <button
                        className="copy-button"
                        onClick={() => void copyToClipboard(paymentDetails.accountNumber, 'number')}
                        title="Copy account number"
                      >
                        <i className="fas fa-copy"></i>
                        {copiedField === 'number' && <span className="copied-text">Copied!</span>}
                      </button>
                    </div>
                  </div>

                  <div className="payment-detail-row payment-amount-row">
                    <label>Amount:</label>
                    <span className="payment-amount">{paymentDetails.amount}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="payment-modal-footer">
              <div className="payment-spinner">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Processing payment...</span>
              </div>
            </div>
          </>
        )

      case 'success':
        return (
          <>
            <div className="payment-modal-header">
              <h2>Payment Successful!</h2>
            </div>

            <div className="payment-modal-body">
              <div className="payment-status-message success">
                <i className="fas fa-check-circle"></i>
                <span>Your payment has been confirmed and your trading account is ready!</span>
              </div>

              <div className="payment-success-details">
                <div className="success-item">
                  <i className="fas fa-user-check"></i>
                  <span>Account assigned successfully</span>
                </div>
                <div className="success-item">
                  <i className="fas fa-chart-line"></i>
                  <span>Ready to start trading</span>
                </div>
                <div className="success-item">
                  <i className="fas fa-trophy"></i>
                  <span>Challenge objectives initialized</span>
                </div>
              </div>
            </div>

            <div className="payment-modal-footer">
              <button
                className="payment-proceed-button success"
                onClick={() => window.location.href = '/'}
              >
                <i className="fas fa-home"></i>
                Go to Dashboard
              </button>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
        {renderStatusContent()}
      </div>
    </div>
  )
}

export default PaymentDetailsModal
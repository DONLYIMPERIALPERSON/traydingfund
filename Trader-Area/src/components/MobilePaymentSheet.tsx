import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobilePaymentSheet.css'

interface MobilePaymentSheetProps {
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

const MobilePaymentSheet: React.FC<MobilePaymentSheetProps> = ({
  isOpen,
  onClose,
  paymentDetails,
  status = 'waiting',
}) => {
  const navigate = useNavigate()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(30 * 60)
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
      setTimeout(() => setCopiedField(null), 1800)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  if (!isOpen) return null

  const isCrypto = Boolean(paymentDetails.cryptoCurrency && paymentDetails.cryptoAddress)
  const networkAddress = paymentDetails.cryptoNetwork
    ? paymentDetails.cryptoNetworks?.[paymentDetails.cryptoNetwork] || paymentDetails.cryptoAddress
    : paymentDetails.cryptoAddress

  const handleCryptoPaid = () => {
    onClose()
    navigate('/orders')
  }

  const renderWaiting = () => (
    <>
      <div className="mobile-payment-sheet__grabber" />
      <div className="mobile-payment-sheet__header">
        <div>
          <h2>{isCrypto ? 'Crypto Payment' : 'Bank Transfer'}</h2>
          <p>{isCrypto ? 'Send the exact amount below.' : 'Use these transfer details to pay.'}</p>
        </div>
        <button className="mobile-payment-sheet__close" onClick={onClose}>
          <i className="fas fa-times" />
        </button>
      </div>

      <div className="mobile-payment-sheet__status">
        <i className="fas fa-clock" />
        <span>Waiting for payment • {formatTime(timeLeft)}</span>
      </div>

      <div className="mobile-payment-sheet__list">
        {isCrypto ? (
          <>
            <div className="mobile-payment-sheet__item">
              <label>Crypto</label>
              <div className="mobile-payment-sheet__value-row">
                <strong>{paymentDetails.cryptoCurrency}</strong>
                <button onClick={() => void copyToClipboard(paymentDetails.cryptoCurrency || '', 'crypto')}>
                  <i className="fas fa-copy" />
                </button>
              </div>
            </div>
            <div className="mobile-payment-sheet__item">
              <label>Wallet Address</label>
              <div className="mobile-payment-sheet__value-row is-column">
                <strong className="is-code">{networkAddress}</strong>
                <button onClick={() => void copyToClipboard(networkAddress || '', 'wallet')}>
                  <i className="fas fa-copy" />
                  Copy address
                </button>
              </div>
            </div>
            <div className="mobile-payment-sheet__item mobile-payment-sheet__item--amount">
              <label>Amount (USD)</label>
              <div className="mobile-payment-sheet__value-row">
                <strong className="is-amount">{paymentDetails.amount}</strong>
                <button onClick={() => void copyToClipboard(paymentDetails.amount.replace('$', '').replace(',', ''), 'amount')}>
                  <i className="fas fa-copy" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mobile-payment-sheet__item">
              <label>Bank Name</label>
              <div className="mobile-payment-sheet__value-row">
                <strong>{paymentDetails.bankName}</strong>
                <button onClick={() => void copyToClipboard(paymentDetails.bankName, 'bank')}>
                  <i className="fas fa-copy" />
                </button>
              </div>
            </div>
            <div className="mobile-payment-sheet__item">
              <label>Account Name</label>
              <div className="mobile-payment-sheet__value-row">
                <strong>{paymentDetails.accountName}</strong>
                <button onClick={() => void copyToClipboard(paymentDetails.accountName, 'account')}>
                  <i className="fas fa-copy" />
                </button>
              </div>
            </div>
            <div className="mobile-payment-sheet__item">
              <label>Account Number</label>
              <div className="mobile-payment-sheet__value-row">
                <strong className="is-code">{paymentDetails.accountNumber}</strong>
                <button onClick={() => void copyToClipboard(paymentDetails.accountNumber, 'number')}>
                  <i className="fas fa-copy" />
                </button>
              </div>
            </div>
            <div className="mobile-payment-sheet__item mobile-payment-sheet__item--amount">
              <label>Amount</label>
              <div className="mobile-payment-sheet__value-row">
                <strong className="is-amount">{paymentDetails.amount}</strong>
                <button onClick={() => void copyToClipboard(paymentDetails.amount.replace('$', '').replace(',', ''), 'amount')}>
                  <i className="fas fa-copy" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mobile-payment-sheet__notice">
        <i className="fas fa-exclamation-triangle" />
        <span>Please transfer the exact amount to avoid payment delays.</span>
      </div>

      {copiedField ? <div className="mobile-payment-sheet__copied">Copied!</div> : null}

      {isCrypto ? (
        <div className="mobile-payment-sheet__footer">
          <button className="mobile-payment-sheet__primary" onClick={handleCryptoPaid}>
            I have sent it
          </button>
        </div>
      ) : null}
    </>
  )

  const renderConfirming = () => (
    <>
      <div className="mobile-payment-sheet__grabber" />
      <div className="mobile-payment-sheet__header">
        <div>
          <h2>{isCrypto ? 'Crypto Payment' : 'Bank Transfer'}</h2>
          <p>{isCrypto ? 'Send the exact amount below.' : 'Make the payment with the details below.'}</p>
        </div>
        <button className="mobile-payment-sheet__close" onClick={onClose}>
          <i className="fas fa-times" />
        </button>
      </div>
      <div className="mobile-payment-sheet__status">
        <i className="fas fa-clock" />
        <span>Waiting for payment • {formatTime(timeLeft)}</span>
      </div>

      <div className="mobile-payment-sheet__list">
        {isCrypto ? (
          <>
            <div className="mobile-payment-sheet__item">
              <label>Crypto</label>
              <div className="mobile-payment-sheet__value-row">
                <strong>{paymentDetails.cryptoCurrency}</strong>
              </div>
            </div>
            <div className="mobile-payment-sheet__item">
              <label>Wallet Address</label>
              <div className="mobile-payment-sheet__value-row is-column">
                <strong className="is-code">{networkAddress}</strong>
              </div>
            </div>
            <div className="mobile-payment-sheet__item mobile-payment-sheet__item--amount">
              <label>Amount (USD)</label>
              <div className="mobile-payment-sheet__value-row">
                <strong className="is-amount">{paymentDetails.amount}</strong>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mobile-payment-sheet__item">
              <label>Bank Name</label>
              <div className="mobile-payment-sheet__value-row">
                <strong>{paymentDetails.bankName}</strong>
              </div>
            </div>
            <div className="mobile-payment-sheet__item">
              <label>Account Name</label>
              <div className="mobile-payment-sheet__value-row">
                <strong>{paymentDetails.accountName}</strong>
              </div>
            </div>
            <div className="mobile-payment-sheet__item">
              <label>Account Number</label>
              <div className="mobile-payment-sheet__value-row">
                <strong className="is-code">{paymentDetails.accountNumber}</strong>
                <button onClick={() => void copyToClipboard(paymentDetails.accountNumber, 'number-confirming')}>
                  <i className="fas fa-copy" />
                </button>
              </div>
            </div>
            <div className="mobile-payment-sheet__item mobile-payment-sheet__item--amount">
              <label>Amount</label>
              <div className="mobile-payment-sheet__value-row">
                <strong className="is-amount">{paymentDetails.amount}</strong>
                <button onClick={() => void copyToClipboard(paymentDetails.amount.replace('$', '').replace(',', ''), 'amount-confirming')}>
                  <i className="fas fa-copy" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )

  const renderSuccess = () => (
    <>
      <div className="mobile-payment-sheet__grabber" />
      <div className="mobile-payment-sheet__big-status is-success">
        <i className="fas fa-check-circle" />
        <strong>Payment Successful!</strong>
        <span>Your trading account is ready.</span>
      </div>
      <div className="mobile-payment-sheet__footer">
        <button className="mobile-payment-sheet__primary" onClick={() => { onClose(); navigate('/') }}>
          Go to Dashboard
        </button>
      </div>
    </>
  )

  return (
    <div className="mobile-payment-sheet-overlay" onClick={onClose}>
      <div className="mobile-payment-sheet" onClick={(e) => e.stopPropagation()}>
        {currentStatus === 'waiting' ? renderWaiting() : currentStatus === 'confirming' ? renderConfirming() : renderSuccess()}
      </div>
    </div>
  )
}

export default MobilePaymentSheet
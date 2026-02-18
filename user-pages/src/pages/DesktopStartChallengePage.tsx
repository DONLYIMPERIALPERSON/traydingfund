import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopChallengeCheckoutPage.css'

interface AccountData {
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

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    street: '',
    postalCode: '',
    country: 'Nigeria'
  })
  const [agreements, setAgreements] = useState({ terms: false, refund: false })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [promoCode, setPromoCode] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAgreementChange = (type: 'terms' | 'refund') => {
    setAgreements(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const handleContinue = () => {
    if (selectedPaymentMethod && agreements.terms && agreements.refund) {
      console.log('Proceed to payment', { accountData, formData, selectedPaymentMethod })
    }
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
            <div className="desktop-checkout-hero-panel">
              <div className="desktop-checkout-hero-content">
                <h2>Start Challenge</h2>
                <p>Show us your trading skills. Pass the Evaluation Process and receive a funded Account.</p>
                <span>If you sabi Trade, We Sabi Pay</span>
              </div>
              <div className="desktop-checkout-hero-stats">
                <div className="desktop-summary-row"><span>Account Balance</span><strong>{accountData.size}</strong></div>
                <div className="desktop-summary-row"><span>Trading Account Currency</span><strong>Naira</strong></div>
                <div className="desktop-summary-row"><span>Platform</span><strong>MetaTrader 5</strong></div>
              </div>
            </div>

            <div className="desktop-checkout-grid">
              <div className="desktop-checkout-column">
                <div className="desktop-checkout-panel">
                  <h3>Billing Info</h3>
                  <div className="desktop-checkout-form-grid">
                    <input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First name" />
                    <input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last name" />
                    <input name="email" value={formData.email} onChange={handleInputChange} placeholder="Email" />
                    <input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone Number" />
                    <input name="address" value={formData.address} onChange={handleInputChange} placeholder="Address" />
                    <input name="street" value={formData.street} onChange={handleInputChange} placeholder="Street" />
                    <input name="postalCode" value={formData.postalCode} onChange={handleInputChange} placeholder="Postal Code" />
                    <select name="country" value={formData.country} onChange={handleInputChange}>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                    </select>
                  </div>
                </div>

                <div className="desktop-checkout-panel">
                  <h3>Promo Code</h3>
                  <div className="desktop-promo-row">
                    <input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter promo code"
                    />
                    <button type="button">Apply</button>
                  </div>
                </div>

                <div className="desktop-checkout-panel">
                  <h3>Terms & Conditions</h3>
                  <div className="desktop-terms-placeholder">PDF Placeholder - Terms & Conditions</div>
                </div>

                <div className="desktop-checkout-panel">
                  <h3>Agreements</h3>
                  <label className="desktop-check-row">
                    <input type="checkbox" checked={agreements.terms} onChange={() => handleAgreementChange('terms')} />
                    I agree to the Terms and Conditions
                  </label>
                  <label className="desktop-check-row">
                    <input type="checkbox" checked={agreements.refund} onChange={() => handleAgreementChange('refund')} />
                    I agree to the Refund Policy
                  </label>
                </div>
              </div>

              <div className="desktop-checkout-column">
                <div className="desktop-checkout-panel">
                  <h3>Summary</h3>
                  <div className="desktop-summary-row"><span>Account Balance</span><strong>{accountData.size}</strong></div>
                  <div className="desktop-summary-row"><span>Challenge Type</span><strong>{accountData.phases}-Step</strong></div>
                  <div className="desktop-summary-row"><span>Target</span><strong>{accountData.target}</strong></div>
                  <div className="desktop-summary-row"><span>Max Drawdown</span><strong>{accountData.drawdown}</strong></div>
                  <div className="desktop-summary-row desktop-summary-total"><span>Total</span><strong>{accountData.fee}</strong></div>

                  <h4 className="desktop-payment-title">Select Payment Method</h4>
                  <label className="desktop-radio-row">
                    <input
                      type="radio"
                      name="payment"
                      value="bank-transfer"
                      checked={selectedPaymentMethod === 'bank-transfer'}
                      onChange={() => setSelectedPaymentMethod('bank-transfer')}
                    />
                    <span className="desktop-method-logo-placeholder">Logo</span>
                    <span>Bank Transfer</span>
                  </label>
                  <label className="desktop-radio-row">
                    <input
                      type="radio"
                      name="payment"
                      value="atm-cards"
                      checked={selectedPaymentMethod === 'atm-cards'}
                      onChange={() => setSelectedPaymentMethod('atm-cards')}
                    />
                    <span className="desktop-method-logo-placeholder">Logo</span>
                    <span>ATM Cards & USSD</span>
                  </label>

                  <button
                    className="desktop-checkout-continue"
                    onClick={handleContinue}
                    disabled={!selectedPaymentMethod || !agreements.terms || !agreements.refund}
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <DesktopFooter />
    </div>
  )
}

export default DesktopStartChallengePage

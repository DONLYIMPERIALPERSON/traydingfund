import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/MobileStartChallengePage.css'

interface AccountData {
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

  const [agreements, setAgreements] = useState({
    terms: false,
    refund: false
  })

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [promoCode, setPromoCode] = useState<string>('')

  const handleBack = () => {
    navigate(-1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAgreementChange = (type: 'terms' | 'refund') => {
    setAgreements(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const handleContinue = () => {
    if (selectedPaymentMethod) {
      // Initialize payment SDK here
      console.log('Proceeding with payment method:', selectedPaymentMethod, { accountData, formData, agreements })
    }
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
            <div className="hero-content">
              <h2 className="hero-title">Start Challenge</h2>
              <p className="hero-description">
                Show us your trading skills. Pass the Evaluation Process and receive a funded Account!
              </p>
              <p className="hero-tagline">
                If you sabi Trade, We Sabi Pay
              </p>
            </div>

            <div className="account-balance-card">
              <div className="balance-row">
                <span className="balance-label">Account Balance:</span>
                <span className="balance-value">{accountData.size}</span>
              </div>
              <div className="currency-row">
                <span className="currency-label">Trading Account Currency:</span>
                <span className="currency-value">Naira</span>
              </div>
            </div>

            <div className="platform-info">
              <span className="platform-label">Platform:</span>
              <span className="platform-value">MetaTrader 5</span>
            </div>
          </div>

          {/* Billing Info */}
          <div className="mobile-start-account-card">
            <div className="mobile-start-section-card">
              <h3 className="billing-title">Billing info</h3>
              <p className="billing-description">
                Before you get started, we need some basic information about you.
              </p>

              <div className="form-grid">
                <div className="name-row">
                  <div className="name-input">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="name-input">
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                />

                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                />

                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="form-input"
                />

                <input
                  type="text"
                  name="street"
                  placeholder="Ikorodu Street"
                  value={formData.street}
                  onChange={handleInputChange}
                  className="form-input"
                />

                <div className="postal-row">
                  <div className="postal-input">
                    <input
                      type="text"
                      name="postalCode"
                      placeholder="Postal Code"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="country-select">
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="country-select"
                    >
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                    </select>
                  </div>
                </div>
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
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="promo-input"
                />
                <button className="apply-button">Apply</button>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="mobile-start-account-card">
            <div className="mobile-start-section-card">
              <h3 className="terms-title">Terms & Conditions</h3>
              <div className="terms-placeholder">
                PDF Placeholder - Terms & Conditions
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mobile-start-account-card">
            <div className="mobile-start-section-card">
              <h3 className="summary-title">Summary</h3>

              <div className="summary-card">
                <div className="challenge-title">NairaTrader Challenge</div>
                <div className="account-size">{accountData.size} account</div>

                <div className="summary-row">
                  <span className="summary-label">NairaTrader Challenge:</span>
                  <span className="summary-value">{accountData.phases}-Step</span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Trading Account Currency:</span>
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
                  <div className="total-value">{accountData.fee}</div>
                  <div className="total-vat">incl. VAT</div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mobile-start-account-card">
            <div className="mobile-start-section-card">
              <h3 className="payment-title">Select Payment Method</h3>

              <div className="payment-methods">
                <div
                  onClick={() => setSelectedPaymentMethod('bank-transfer')}
                  className={`payment-method ${selectedPaymentMethod === 'bank-transfer' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="bank-transfer"
                    checked={selectedPaymentMethod === 'bank-transfer'}
                    onChange={() => setSelectedPaymentMethod('bank-transfer')}
                    className="payment-radio"
                  />
                  <div className="payment-logo">
                    <span className="logo-text">Logo Placeholder</span>
                  </div>
                  <div className="payment-info">
                    <div className="payment-name">Bank Transfer</div>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedPaymentMethod('atm-cards')}
                  className={`payment-method ${selectedPaymentMethod === 'atm-cards' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="atm-cards"
                    checked={selectedPaymentMethod === 'atm-cards'}
                    onChange={() => setSelectedPaymentMethod('atm-cards')}
                    className="payment-radio"
                  />
                  <div className="payment-logo">
                    <span className="logo-text">Logo Placeholder</span>
                  </div>
                  <div className="payment-info">
                    <div className="payment-name">ATM Cards & USSD</div>
                  </div>
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
                    I have read and agreed to the <span className="agreement-link">Terms and Conditions</span>
                  </label>
                </div>

                <div className="agreement-item">
                  <input
                    type="checkbox"
                    id="refund"
                    checked={agreements.refund}
                    onChange={() => handleAgreementChange('refund')}
                    className="agreement-checkbox"
                  />
                  <label htmlFor="refund" className="agreement-label">
                    I have read and agreed to the <span className="agreement-link">Refund Policy</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!agreements.terms || !agreements.refund || !selectedPaymentMethod}
            className="continue-button"
          >
            Continue to Payment
          </button>
        </div>
      </div>


    </div>
  )
}

export default MobileStartChallengePage
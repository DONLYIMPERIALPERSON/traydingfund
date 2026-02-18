import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobilePayoutDetailsPage.css'

const MobilePayoutDetailsPage: React.FC = () => {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

  // Mock KYC-verified payout data
  const payoutDetails = {
    bankName: 'Kuda Microfinance Bank',
    accountName: 'Lucky Chi',
    accountNumber: '3000469725',
    verified: true,
    verificationDate: '15 Jan 2026'
  }

  return (
    <div className="mobile-payout-details-page">
      <div className="mobile-payout-details-fixed-header">
        <div className="mobile-payout-details-header-shell">
          <div className="mobile-payout-details-header-row">
            <div className="mobile-payout-details-header-left">
              <div className="mobile-payout-details-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-payout-details-header-center">
              <span className="mobile-payout-details-header-title">Payout Details</span>
            </div>
            <div className="mobile-payout-details-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-payout-details-content-container">
        <div style={{padding: '24px 12px'}}>

          {/* Verification Status */}
          <div className="mobile-payout-details-card" style={{
            background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%)',
            border: '1px solid rgba(40, 167, 69, 0.3)',
            marginBottom: '20px'
          }}>
            <div className="mobile-payout-details-card-inner">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#28a745',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-check" style={{color: 'white', fontSize: '16px'}}></i>
                </div>
                <div>
                  <div style={{fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '2px'}}>
                    KYC Verified
                  </div>
                  <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)'}}>
                    Verified on {payoutDetails.verificationDate}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="mobile-payout-details-card" style={{marginBottom: '20px'}}>
            <div className="mobile-payout-details-card-inner">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                <i className="fas fa-university" style={{color: '#FFD700', fontSize: '20px'}}></i>
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', margin: '0'}}>
                  Bank Details
                </h3>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {/* Bank Name */}
                <div>
                  <div style={{fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '4px'}}>
                    Bank Name
                  </div>
                  <div style={{fontSize: '16px', fontWeight: '600', color: 'white', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                    {payoutDetails.bankName}
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <div style={{fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '4px'}}>
                    Account Name
                  </div>
                  <div style={{fontSize: '16px', fontWeight: '600', color: 'white', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                    {payoutDetails.accountName}
                  </div>
                </div>

                {/* Account Number */}
                <div>
                  <div style={{fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '4px'}}>
                    Account Number
                  </div>
                  <div style={{fontSize: '16px', fontWeight: '600', color: 'white', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontFamily: 'monospace'}}>
                    {payoutDetails.accountNumber}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mobile-payout-details-card" style={{background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)'}}>
            <div className="mobile-payout-details-card-inner">
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                <i className="fas fa-shield-alt" style={{color: '#FFD700', marginTop: '2px'}}></i>
                <div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px'}}>
                    Security & Privacy
                  </div>
                  <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4'}}>
                    Your payout details are securely stored and KYC verified. This information is read-only and can only be updated through our support team for security reasons.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default MobilePayoutDetailsPage
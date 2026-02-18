import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileKYCPage.css'

type KYCStatus = 'pending' | 'approved' | 'declined'

type KYCRecord = {
  id: number
  mt5AccountNumber: string
  date: string
  bankAccountNumber: string
  bankName: string
  accountName: string
  status: KYCStatus
}

const MobileKYCPage: React.FC = () => {
  const navigate = useNavigate()
  const fundedMt5Accounts = ['10293847', '10293855', '10300661']
  const [kycRecords, setKycRecords] = useState<KYCRecord[]>([
    {
      id: 1,
      mt5AccountNumber: '10293847',
      date: '2026-02-04',
      bankAccountNumber: '3000469725',
      bankName: 'Kuda Microfinance Bank',
      accountName: 'Lucky Chi',
      status: 'approved'
    },
    {
      id: 2,
      mt5AccountNumber: '10293855',
      date: '2026-02-10',
      bankAccountNumber: '0210048943',
      bankName: 'GTBank',
      accountName: 'Lucky Chi',
      status: 'pending'
    },
    {
      id: 3,
      mt5AccountNumber: '10300661',
      date: '2026-02-12',
      bankAccountNumber: '0112294783',
      bankName: 'UBA',
      accountName: 'Lucky Chi',
      status: 'declined'
    }
  ])

  const [selectedMt5Account, setSelectedMt5Account] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [formError, setFormError] = useState('')

  const handleBack = () => {
    navigate(-1)
  }

  const getStatusText = (status: KYCStatus) => {
    if (status === 'pending') return 'Pending'
    if (status === 'approved') return 'Approved'
    return 'Declined'
  }

  const handleSubmitKyc = () => {
    if (!selectedMt5Account || !bankAccountNumber || !bankName || !accountName) {
      setFormError('Please fill all KYC fields.')
      return
    }

    const newRecord: KYCRecord = {
      id: Date.now(),
      mt5AccountNumber: selectedMt5Account,
      date: new Date().toISOString().slice(0, 10),
      bankAccountNumber,
      bankName,
      accountName,
      status: 'pending'
    }

    setKycRecords(prev => [newRecord, ...prev])
    setSelectedMt5Account('')
    setBankAccountNumber('')
    setBankName('')
    setAccountName('')
    setFormError('')
  }

  return (
    <div className="mobile-kyc-page">
      <div className="mobile-kyc-fixed-header">
        <div className="mobile-kyc-header-shell">
          <div className="mobile-kyc-header-row">
            <div className="mobile-kyc-header-left">
              <div className="mobile-kyc-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-kyc-header-center">
              <span className="mobile-kyc-header-title">KYC Verification</span>
            </div>
            <div className="mobile-kyc-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-kyc-content-container">
        <div className="mobile-kyc-content-padding">

          {/* KYC Records */}
          <div className="mobile-kyc-card" style={{ marginBottom: '20px' }}>
            <div className="mobile-kyc-card-inner">
              <div className="mobile-kyc-title-row">
                <i className="fas fa-folder-open"></i>
                <h3>KYC Records</h3>
              </div>

              <div className="mobile-kyc-record-list">
                {kycRecords.map(record => (
                  <div className="mobile-kyc-record-item" key={record.id}>
                    <div className="mobile-kyc-record-top">
                      <span>MT5 {record.mt5AccountNumber}</span>
                      <span className={`mobile-kyc-status-badge ${record.status}`}>{getStatusText(record.status)}</span>
                    </div>
                    <div className="mobile-kyc-record-grid">
                      <div><label>Date</label><p>{record.date}</p></div>
                      <div><label>Bank Account</label><p>{record.bankAccountNumber}</p></div>
                      <div><label>Bank Name</label><p>{record.bankName}</p></div>
                      <div><label>Account Name</label><p>{record.accountName}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New KYC Form */}
          <div className="mobile-kyc-card" style={{ marginBottom: '20px' }}>
            <div className="mobile-kyc-card-inner">
              <div className="mobile-kyc-title-row">
                <i className="fas fa-plus"></i>
                <h3>Submit KYC for New Account</h3>
              </div>

              <div className="mobile-kyc-form-grid">
                <div>
                  <label>Funded MT5 Account</label>
                  <select
                    value={selectedMt5Account}
                    onChange={(e) => {
                      setSelectedMt5Account(e.target.value)
                      if (formError) setFormError('')
                    }}
                  >
                    <option value="">Select funded account</option>
                    {fundedMt5Accounts.map((acc) => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Bank Account Number</label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => {
                      setBankAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                      if (formError) setFormError('')
                    }}
                    placeholder="Enter bank account number"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label>Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value)
                      if (formError) setFormError('')
                    }}
                    placeholder="Enter bank name"
                  />
                </div>

                <div>
                  <label>Account Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => {
                      setAccountName(e.target.value)
                      if (formError) setFormError('')
                    }}
                    placeholder="Enter account name"
                  />
                </div>
              </div>

              {formError && <div className="mobile-kyc-form-error">{formError}</div>}

              <button className="mobile-kyc-submit-btn" onClick={handleSubmitKyc}>
                Submit KYC
              </button>
            </div>
          </div>

          {/* Warnings and Information */}
          <div className="mobile-kyc-card" style={{background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', marginBottom: '20px'}}>
            <div className="mobile-kyc-card-inner">
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                <i className="fas fa-exclamation-triangle" style={{color: '#FFD700', marginTop: '2px'}}></i>
                <div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px'}}>
                    Important Information
                  </div>
                  <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5'}}>
                    <div style={{marginBottom: '8px'}}>
                      • Please ensure all bank details are entered correctly and match your account exactly.
                    </div>
                    <div>• Only funded MT5 accounts with 10% profits can be submitted for KYC records.</div>
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

export default MobileKYCPage
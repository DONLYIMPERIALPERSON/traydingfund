import React, { useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopKYCPage.css'

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

const DesktopKYCPage: React.FC = () => {
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

  const getStatusText = (status: KYCStatus) => {
    if (status === 'pending') return 'Pending'
    if (status === 'approved') return 'Approved'
    return 'Declined'
  }

  const handleSubmitKYC = () => {
    if (!selectedMt5Account || !bankAccountNumber || !bankName || !accountName) {
      setFormError('Please complete all KYC fields before submitting.')
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
    <div className="kyc-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div style={{
        marginLeft: '280px', // Account for sidebar
        padding: '24px',
        paddingTop: '80px', // Add top padding to avoid header overlap
        minHeight: '100vh'
      }}>
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="back-button"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Accounts Overview
        </button>

        {/* Page Header */}
        <div className="page-header">
          <h1>KYC Verification</h1>
          <p>Verify your identity and bank details for secure trading</p>
        </div>

        {/* KYC Content */}
        <div className="kyc-content">
          {/* KYC Records */}
          <div className="kyc-records-section">
            <div className="section-header">
              <i className="fas fa-folder-open section-icon"></i>
              <h3 className="section-title">KYC Records</h3>
            </div>

            <div className="kyc-records-table-wrap">
              <table className="kyc-records-table">
                <thead>
                  <tr>
                    <th>MT5 Account Number</th>
                    <th>Date</th>
                    <th>Bank Account Number</th>
                    <th>Bank Name</th>
                    <th>Account Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {kycRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.mt5AccountNumber}</td>
                      <td>{record.date}</td>
                      <td className="account-number">{record.bankAccountNumber}</td>
                      <td>{record.bankName}</td>
                      <td>{record.accountName}</td>
                      <td>
                        <span className={`kyc-status-badge ${record.status}`}>
                          {getStatusText(record.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* New KYC Form */}
          <div className="kyc-form-section">
            <div className="section-header">
              <div className="status-icon">
                <i className="fas fa-plus"></i>
              </div>
              <div>
                <h2 className="status-title">Submit KYC for New Account</h2>
                <p className="status-subtitle">Select a funded MT5 account and enter bank details.</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-item">
                <label className="form-label">Funded MT5 Account</label>
                <select
                  className="form-input"
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

              <div className="form-item">
                <label className="form-label">Bank Account Number</label>
                <input
                  type="text"
                  className="form-input account-number-input"
                  value={bankAccountNumber}
                  onChange={(e) => {
                    setBankAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                    if (formError) setFormError('')
                  }}
                  placeholder="Enter bank account number"
                  maxLength={10}
                />
              </div>

              <div className="form-item">
                <label className="form-label">Bank Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value)
                    if (formError) setFormError('')
                  }}
                  placeholder="Enter bank name"
                />
              </div>

              <div className="form-item">
                <label className="form-label">Account Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value)
                    if (formError) setFormError('')
                  }}
                  placeholder="Enter account name"
                />
              </div>
            </div>

            {formError && <div className="kyc-form-error">{formError}</div>}

            <button
              onClick={handleSubmitKYC}
              className="submit-button"
            >
              Submit KYC
            </button>
          </div>

          {/* Important Information */}
          <div className="info-card warning">
            <div className="info-header">
              <i className="fas fa-exclamation-triangle info-icon"></i>
              <h4 className="info-title">Important Information</h4>
            </div>
            <div className="info-content">
              <div>• Please ensure all bank details are entered correctly and match your account exactly.</div>
              <div>• Only funded MT5 accounts with 10% profits can be submitted for KYC records.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopKYCPage

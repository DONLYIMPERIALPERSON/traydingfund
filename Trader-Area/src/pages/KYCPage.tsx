import React, { useEffect, useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopKYCPage.css'
import {
  fetchKycEligibility,
  fetchKycHistory,
  fetchProfile,
  persistAuthUser,
  uploadKycDocument,
  submitKyc,
  type KycRequestItem,
} from '../mocks/auth'

type UploadStatus = 'idle' | 'ready' | 'uploading'

const KYCPage: React.FC = () => {
  const [kycStatus, setKycStatus] = useState<string>('not_started')
  const [eligibleForKyc, setEligibleForKyc] = useState(false)
  const [eligibilityMessage, setEligibilityMessage] = useState('Checking KYC eligibility...')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [documentType, setDocumentType] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack] = useState<File | null>(null)
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null)
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [kycHistory, setKycHistory] = useState<KycRequestItem[]>([])

  const isKycApproved = kycStatus === 'approved' || kycStatus === 'verified'
  const isKycPending = ['pending', 'in_review', 'processing', 'submitted'].includes(kycStatus)
  const canResubmit = kycStatus === 'declined' || kycStatus === 'rejected'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setFormError('')
      try {
        const [eligibility, profileRes, historyRes] = await Promise.all([
          fetchKycEligibility(),
          fetchProfile(),
          fetchKycHistory(),
        ])
        setEligibleForKyc(eligibility.eligible)
        setEligibilityMessage(eligibility.message)
        const historyItems = historyRes.requests ?? []
        const latestRequestStatus = historyItems[0]?.status?.toLowerCase()
        const profileStatus = (profileRes.kyc_status || 'not_started').toLowerCase()
        const resolvedStatus = latestRequestStatus || profileStatus
        setKycStatus(resolvedStatus)
        setKycHistory(historyItems)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load KYC data'
        setFormError(message)
        setEligibleForKyc(false)
        setEligibilityMessage('Unable to confirm KYC eligibility right now. Please try again shortly.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    setPreview: (preview: string | null) => void,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setFormError('Please upload a valid image file (JPG, PNG, or WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('File size must be less than 5MB.')
      return
    }

    setFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const clearFile = (setFile: (file: File | null) => void, setPreview: (preview: string | null) => void) => {
    setFile(null)
    setPreview(null)
  }

  const uploadToR2 = async (file: File, documentSide: 'front' | 'back') => {
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result?.toString() ?? ''
        const base64 = result.includes('base64,') ? result.split('base64,')[1] : result
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Failed to read file.'))
      reader.readAsDataURL(file)
    })

    const uploadMeta = await uploadKycDocument({
      filename: file.name,
      content_type: file.type,
      document_side: documentSide,
      file_base64: fileBase64,
    })

    if (!uploadMeta.public_url) {
      throw new Error('Upload completed, but public URL is missing.')
    }

    return uploadMeta.public_url
  }

  const handleSubmitKYC = async () => {
    if (!eligibleForKyc) {
      setFormError(eligibilityMessage || 'You are not eligible for KYC yet.')
      return
    }

    if (!documentType || !documentNumber || !idFront) {
      setFormError('Please complete all required fields and upload your ID images.')
      return
    }

    setSubmitting(true)
    setUploadStatus('uploading')
    setFormError('')
    setFormSuccess('')

    try {
      const [idFrontUrl, idBackUrl] = await Promise.all([
        uploadToR2(idFront, 'front'),
        idBack ? uploadToR2(idBack, 'back') : Promise.resolve(null),
      ])

      const response = await submitKyc({
        document_type: documentType,
        document_number: documentNumber,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
        selfie_url: null,
      })
      setKycStatus((response.kyc_status || 'pending').toLowerCase())
      setFormSuccess(response.message)
      const updated = await fetchProfile()
      persistAuthUser(updated)
      setUploadStatus('ready')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'KYC submission failed'
      setFormError(message)
      setUploadStatus('ready')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="kyc-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="kyc-content-wrapper">
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
          <p>Verify your identity by uploading a valid government-issued ID.</p>
        </div>

        {/* KYC Content */}
        <div className="kyc-content">
          {!eligibleForKyc ? (
            <div className="kyc-form-section">
              <div className="section-header">
                <div className="status-icon status-icon--locked">
                  <i className="fas fa-lock"></i>
                </div>
                <div>
                  <h2 className="status-title">KYC Not Eligible Yet</h2>
                  <p className="status-subtitle status-subtitle--muted">
                    {eligibilityMessage || 'You need at least one funded account before KYC becomes available.'}
                  </p>
                </div>
              </div>
            </div>
          ) : isKycApproved ? (
            <div className="kyc-records-section">
              <div className="section-header">
                <i className="fas fa-id-card section-icon"></i>
                <h3 className="section-title">Your KYC is Verified</h3>
              </div>
              <p className="kyc-verified-text">Your identity has been verified successfully. No further action is required.</p>
              <div className="kyc-status-pill approved">Status: Approved</div>
            </div>
          ) : isKycPending ? (
            <div className="kyc-records-section">
              <div className="section-header">
                <i className="fas fa-hourglass-half section-icon"></i>
                <h3 className="section-title">KYC Under Review</h3>
              </div>
              <p className="kyc-verified-text">Your documents are being reviewed. We’ll notify you once the review is complete.</p>
              <div className="kyc-status-pill pending">Status: Pending Review</div>
            </div>
          ) : (
            <>
              {kycHistory.length > 0 && (
                <div className="kyc-records-section">
                  <div className="section-header">
                    <i className="fas fa-history section-icon"></i>
                    <h3 className="section-title">KYC Request History</h3>
                  </div>
                  <div className="kyc-records-table-wrap">
                    <table className="kyc-records-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Document</th>
                          <th>Submitted</th>
                          <th>Reviewed</th>
                          <th>Reviewer</th>
                          <th>Decline Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kycHistory.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <span className={`kyc-status-badge ${item.status}`}>
                                {item.status}
                              </span>
                            </td>
                            <td>{item.document_type.replace('_', ' ')} • {item.document_number}</td>
                            <td>{new Date(item.submitted_at).toLocaleDateString()}</td>
                            <td>{item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : '-'}</td>
                            <td>{item.reviewed_by ?? '-'}</td>
                            <td>{item.decline_reason ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {canResubmit && (
                <div className="kyc-form-section">
                <div className="section-header">
                  <div className="status-icon">
                    <i className="fas fa-upload"></i>
                  </div>
                  <div>
                    <h2 className="status-title">Upload Identification</h2>
                    <p className="status-subtitle">Upload your ID documents to verify your identity.</p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-item">
                    <label className="form-label">Document Type</label>
                    <select
                      className="form-input"
                      value={documentType}
                      onChange={(e) => {
                        setDocumentType(e.target.value)
                        if (formError) setFormError('')
                      }}
                    >
                      <option value="">Select document type</option>
                      <option value="passport">International Passport</option>
                      <option value="drivers_license">Driver’s License</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>

                  <div className="form-item">
                    <label className="form-label">Document Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={documentNumber}
                      onChange={(e) => {
                        setDocumentNumber(e.target.value)
                        if (formError) setFormError('')
                      }}
                      placeholder="Enter document number"
                    />
                  </div>
                </div>

                <div className="upload-grid">
                  <div className="upload-card">
                    <div className="upload-header">
                      <h4>Front of ID</h4>
                      <span className="upload-hint">Required</span>
                    </div>
                    <div className="upload-preview">
                      {idFrontPreview ? (
                        <img src={idFrontPreview} alt="ID front preview" />
                      ) : (
                        <div className="upload-placeholder">
                          <i className="fas fa-id-card"></i>
                          <p>Upload front of ID</p>
                        </div>
                      )}
                    </div>
                    <div className="upload-actions">
                      <label className="upload-button">
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, setIdFront, setIdFrontPreview)}
                          hidden
                        />
                      </label>
                      {idFront && (
                        <button
                          type="button"
                          className="upload-remove"
                          onClick={() => clearFile(setIdFront, setIdFrontPreview)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="upload-card">
                    <div className="upload-header">
                      <h4>Back of ID</h4>
                      <span className="upload-hint">Optional</span>
                    </div>
                    <div className="upload-preview">
                      {idBackPreview ? (
                        <img src={idBackPreview} alt="ID back preview" />
                      ) : (
                        <div className="upload-placeholder">
                          <i className="fas fa-id-card"></i>
                          <p>Upload back of ID</p>
                        </div>
                      )}
                    </div>
                    <div className="upload-actions">
                      <label className="upload-button">
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, setIdBack, setIdBackPreview)}
                          hidden
                        />
                      </label>
                      {idBack && (
                        <button
                          type="button"
                          className="upload-remove"
                          onClick={() => clearFile(setIdBack, setIdBackPreview)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {formError && <div className="kyc-form-error">{formError}</div>}
                {formSuccess && <div className="kyc-form-success">{formSuccess}</div>}

                <button
                  onClick={handleSubmitKYC}
                  className="submit-button"
                  disabled={loading || submitting || !eligibleForKyc}
                >
                  {submitting ? 'Submitting...' : 'Submit KYC'}
                </button>
                </div>
              )}

              <div className="info-card warning">
                <div className="info-header">
                  <i className="fas fa-exclamation-triangle info-icon"></i>
                  <h4 className="info-title">Important</h4>
                </div>
                <div className="info-content">
                  <div>• Ensure the ID photo is clear and all corners are visible.</div>
                  <div>• Use a government-issued ID that matches your profile details.</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default KYCPage

import React, { useEffect, useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopKYCPage.css'
import {
  fetchKycEligibility,
  fetchProfile,
  persistAuthUser,
  submitKyc,
} from '../lib/auth'

type UploadStatus = 'idle' | 'ready' | 'uploading'

const DesktopKYCPage: React.FC = () => {
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
  const [selfie, setSelfie] = useState<File | null>(null)
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null)
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setFormError('')
      try {
        const eligibility = await fetchKycEligibility()
        setEligibleForKyc(eligibility.eligible)
        setEligibilityMessage(eligibility.message)

        const profileRes = await fetchProfile()
        setKycStatus((profileRes.kyc_status || 'not_started').toLowerCase())
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

  const handleSubmitKYC = async () => {
    if (!eligibleForKyc) {
      setFormError(eligibilityMessage || 'You are not eligible for KYC yet.')
      return
    }

    if (!documentType || !documentNumber || !idFront || !selfie) {
      setFormError('Please complete all required fields and upload your ID images.')
      return
    }

    setSubmitting(true)
    setUploadStatus('uploading')
    setFormError('')
    setFormSuccess('')

    try {
      const response = await submitKyc({
        document_type: documentType,
        document_number: documentNumber,
        id_front: idFront,
        id_back: idBack,
        selfie,
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
          ) : kycStatus === 'approved' ? (
            <div className="kyc-records-section">
              <div className="section-header">
                <i className="fas fa-id-card section-icon"></i>
                <h3 className="section-title">Your KYC is Verified</h3>
              </div>
              <p className="kyc-verified-text">Your identity has been verified successfully. No further action is required.</p>
              <div className="kyc-status-pill approved">Status: Approved</div>
            </div>
          ) : (
            <>
              <div className="kyc-form-section">
                <div className="section-header">
                  <div className="status-icon">
                    <i className="fas fa-upload"></i>
                  </div>
                  <div>
                    <h2 className="status-title">Upload Identification</h2>
                    <p className="status-subtitle">Upload your ID and a selfie to verify your identity.</p>
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

                  <div className="upload-card">
                    <div className="upload-header">
                      <h4>Selfie</h4>
                      <span className="upload-hint">Required</span>
                    </div>
                    <div className="upload-preview">
                      {selfiePreview ? (
                        <img src={selfiePreview} alt="Selfie preview" />
                      ) : (
                        <div className="upload-placeholder">
                          <i className="fas fa-user"></i>
                          <p>Upload a selfie</p>
                        </div>
                      )}
                    </div>
                    <div className="upload-actions">
                      <label className="upload-button">
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, setSelfie, setSelfiePreview)}
                          hidden
                        />
                      </label>
                      {selfie && (
                        <button
                          type="button"
                          className="upload-remove"
                          onClick={() => clearFile(setSelfie, setSelfiePreview)}
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

              <div className="info-card warning">
                <div className="info-header">
                  <i className="fas fa-exclamation-triangle info-icon"></i>
                  <h4 className="info-title">Important</h4>
                </div>
                <div className="info-content">
                  <div>• Ensure the ID photo is clear and all corners are visible.</div>
                  <div>• Your selfie must be well-lit with no filters or obstructions.</div>
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

export default DesktopKYCPage

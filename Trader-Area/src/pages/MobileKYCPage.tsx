import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createKycUploadUrl,
  fetchKycEligibility,
  fetchKycHistory,
  fetchProfile,
  persistAuthUser,
  uploadKycDocument,
  submitKyc,
  type KycRequestItem,
} from '../lib/traderAuth'
import '../styles/MobileKYCPage.css'

type UploadStatus = 'idle' | 'ready' | 'uploading'

const MobileKYCPage: React.FC = () => {
  const navigate = useNavigate()
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
  const canShowForm = eligibleForKyc && !isKycApproved && !isKycPending

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
        const resolvedStatus = historyItems.length > 0 ? (latestRequestStatus || profileStatus) : profileStatus
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
    reader.onload = (e) => setPreview(e.target?.result as string)
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
        resolve(base64 ?? '')
      }
      reader.onerror = () => reject(new Error('Failed to read file.'))
      reader.readAsDataURL(file)
    })

    const uploadMeta = await createKycUploadUrl({
      filename: file.name,
      content_type: file.type,
      document_side: documentSide,
    })

    try {
      const uploadResponse = await fetch(uploadMeta.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadResponse.ok) {
        if (uploadResponse.status === 413) throw new Error('Upload failed: file too large. Please reduce the file size and try again.')
        throw new Error('Direct upload failed.')
      }
    } catch {
      const fallbackUpload = await uploadKycDocument({
        filename: file.name,
        content_type: file.type,
        document_side: documentSide,
        file_base64: fileBase64,
      })

      if (!fallbackUpload.public_url) throw new Error('Upload failed. Please check your connection and try again.')
      return fallbackUpload.public_url
    }

    if (!uploadMeta.public_url) throw new Error('Upload completed, but public URL is missing.')
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
    <div className="mobile-kyc-page">
      <div className="mobile-kyc-shell">
        <header className="mobile-kyc-header">
          <button type="button" className="mobile-kyc-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-kyc-header__text">
            <h1>KYC</h1>
            <p>Verify your identity by uploading a valid ID.</p>
          </div>
          <button type="button" className="mobile-kyc-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        {loading ? (
          <div className="mobile-kyc-card">Loading KYC...</div>
        ) : !eligibleForKyc ? (
          <div className="mobile-kyc-card mobile-kyc-card--status">
            <h2>KYC Not Eligible Yet</h2>
            <p>{eligibilityMessage || 'You need at least one funded or active Breezy account before KYC becomes available.'}</p>
          </div>
        ) : isKycApproved ? (
          <div className="mobile-kyc-card mobile-kyc-card--status">
            <h2>Your KYC is Verified</h2>
            <p>Your identity has been verified successfully. No further action is required.</p>
            <span className="mobile-kyc-status-pill approved">Approved</span>
          </div>
        ) : isKycPending ? (
          <div className="mobile-kyc-card mobile-kyc-card--status">
            <h2>KYC Under Review</h2>
            <p>Your documents are being reviewed. We’ll notify you once the review is complete.</p>
            <span className="mobile-kyc-status-pill pending">Pending Review</span>
          </div>
        ) : (
          <>
            {kycHistory.length > 0 ? (
              <section className="mobile-kyc-card">
                <h2>KYC Request History</h2>
                <div className="mobile-kyc-history-list">
                  {kycHistory.map((item) => (
                    <article key={item.id} className="mobile-kyc-history-item">
                      <div className="mobile-kyc-history-item__top">
                        <span className={`mobile-kyc-status-pill ${item.status}`}>{item.status}</span>
                        <strong>{item.document_type.replace('_', ' ')} • {item.document_number}</strong>
                      </div>
                      <p>Submitted: {new Date(item.submitted_at).toLocaleDateString()}</p>
                      {item.decline_reason ? <p>Reason: {item.decline_reason}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {canShowForm ? (
              <section className="mobile-kyc-card">
                <h2>Upload Identification</h2>
                <p className="mobile-kyc-subtext">Upload your ID documents to verify your identity.</p>

                <div className="mobile-kyc-form-grid">
                  <label>
                    <span>Document Type</span>
                    <select value={documentType} onChange={(e) => { setDocumentType(e.target.value); if (formError) setFormError('') }}>
                      <option value="">Select document type</option>
                      <option value="passport">International Passport</option>
                      <option value="drivers_license">Driver’s License</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </label>

                  <label>
                    <span>Document Number</span>
                    <input value={documentNumber} onChange={(e) => { setDocumentNumber(e.target.value); if (formError) setFormError('') }} placeholder="Enter document number" />
                  </label>
                </div>

                <div className="mobile-kyc-upload-grid">
                  <div className="mobile-kyc-upload-card">
                    <div className="mobile-kyc-upload-card__header">
                      <h4>Front of ID</h4>
                      <span>Required</span>
                    </div>
                    <div className="mobile-kyc-upload-card__preview">
                      {idFrontPreview ? <img src={idFrontPreview} alt="ID front preview" /> : <div className="mobile-kyc-upload-placeholder"><i className="fas fa-id-card" /><p>Upload front of ID</p></div>}
                    </div>
                    <div className="mobile-kyc-upload-card__actions">
                      <label className="mobile-kyc-upload-button">
                        Choose File
                        <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, setIdFront, setIdFrontPreview)} hidden />
                      </label>
                      {idFront ? <button type="button" className="mobile-kyc-upload-remove" onClick={() => clearFile(setIdFront, setIdFrontPreview)}>Remove</button> : null}
                    </div>
                  </div>

                  <div className="mobile-kyc-upload-card">
                    <div className="mobile-kyc-upload-card__header">
                      <h4>Back of ID</h4>
                      <span>Optional</span>
                    </div>
                    <div className="mobile-kyc-upload-card__preview">
                      {idBackPreview ? <img src={idBackPreview} alt="ID back preview" /> : <div className="mobile-kyc-upload-placeholder"><i className="fas fa-id-card" /><p>Upload back of ID</p></div>}
                    </div>
                    <div className="mobile-kyc-upload-card__actions">
                      <label className="mobile-kyc-upload-button">
                        Choose File
                        <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, setIdBack, setIdBackPreview)} hidden />
                      </label>
                      {idBack ? <button type="button" className="mobile-kyc-upload-remove" onClick={() => clearFile(setIdBack, setIdBackPreview)}>Remove</button> : null}
                    </div>
                  </div>
                </div>

                {formError ? <div className="mobile-kyc-error">{formError}</div> : null}
                {formSuccess ? <div className="mobile-kyc-success">{formSuccess}</div> : null}

                <button type="button" className="mobile-kyc-submit" onClick={() => void handleSubmitKYC()} disabled={loading || submitting || !eligibleForKyc}>
                  {submitting ? 'Submitting...' : uploadStatus === 'uploading' ? 'Uploading...' : 'Submit KYC'}
                </button>
              </section>
            ) : null}

            <section className="mobile-kyc-card mobile-kyc-card--warning">
              <h2>Important</h2>
              <div className="mobile-kyc-warning-list">
                <div>• Ensure the ID photo is clear and all corners are visible.</div>
                <div>• Use a government-issued ID that matches your profile details.</div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default MobileKYCPage
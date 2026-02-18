import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileProfilePage.css'

const MobileProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('John Doe')
  const [nickName, setNickName] = useState('Gold Emperor')
  const [editingField, setEditingField] = useState<'fullName' | 'nickName' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editPin, setEditPin] = useState('')
  const [editError, setEditError] = useState('')

  const handleBack = () => {
    navigate(-1)
  }

  const handleEditName = () => {
    setEditingField('fullName')
    setEditValue(fullName)
    setEditPin('')
    setEditError('')
  }

  const handleEditNickName = () => {
    setEditingField('nickName')
    setEditValue(nickName)
    setEditPin('')
    setEditError('')
  }

  const handleCloseEditModal = () => {
    setEditingField(null)
    setEditPin('')
    setEditError('')
  }

  const handleSaveEditedValue = () => {
    const cleaned = editValue.trim()
    if (!cleaned) {
      setEditError(editingField === 'fullName' ? 'Full name is required' : 'Nickname is required')
      return
    }

    if (!/^\d{4}$/.test(editPin)) {
      setEditError(`Enter your 4-digit PIN to change ${editingField === 'fullName' ? 'full name' : 'nickname'}`)
      return
    }

    if (editingField === 'fullName') {
      setFullName(cleaned)
    } else {
      setNickName(cleaned)
    }

    handleCloseEditModal()
  }

  return (
    <div className="mobile-profile-page">
      <div className="mobile-profile-fixed-header">
        <div className="mobile-profile-header-shell">
          <div className="mobile-profile-header-row">
            <div className="mobile-profile-header-left">
              <div className="mobile-profile-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-profile-header-center">
              <span className="mobile-profile-header-title">Profile</span>
            </div>
            <div className="mobile-profile-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-profile-content-container">
        <div className="mobile-profile-content-padding">

          {/* Profile Avatar Section */}
          <div style={{textAlign: 'center', marginBottom: '32px'}}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
            }}>
              <i className="fas fa-user" style={{fontSize: '32px', color: '#000'}}></i>
            </div>
            <div style={{fontSize: '20px', fontWeight: '600', color: 'white'}}>
              {fullName}
            </div>
            <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)'}}>
              john.doe@email.com
            </div>
          </div>

          {/* Nick Name */}
          <div className="mobile-profile-card" style={{marginBottom: '16px'}}>
            <div className="mobile-profile-card-inner">
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: '4px'}}>
                    Nick Name
                  </div>
                  <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>
                    {nickName}
                  </div>
                </div>
                <button
                  onClick={handleEditNickName}
                  style={{
                    background: 'rgba(255,215,0,0.1)',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '6px',
                    padding: '8px',
                    color: '#FFD700',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-edit"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="mobile-profile-card" style={{marginBottom: '16px'}}>
            <div className="mobile-profile-card-inner">
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: '4px'}}>
                    Full Name
                  </div>
                  <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>
                    {fullName}
                  </div>
                </div>
                <button
                  onClick={handleEditName}
                  style={{
                    background: 'rgba(255,215,0,0.1)',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '6px',
                    padding: '8px',
                    color: '#FFD700',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-edit"></i>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {editingField && (
        <div className="mobile-nickname-modal-overlay" onClick={handleCloseEditModal}>
          <div className="mobile-nickname-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nickname-modal-header">
              <h3>{editingField === 'fullName' ? 'Edit Full Name' : 'Edit Nick Name'}</h3>
              <button onClick={handleCloseEditModal} className="mobile-nickname-modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p className="mobile-nickname-modal-subtitle">
              Enter your new {editingField === 'fullName' ? 'full name' : 'nickname'} and transaction PIN.
            </p>

            <div className="mobile-nickname-modal-fields">
              <input
                type="text"
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value)
                  if (editError) setEditError('')
                }}
                placeholder={editingField === 'fullName' ? 'Enter full name' : 'Enter nickname'}
              />
              <input
                type="password"
                value={editPin}
                onChange={(e) => {
                  setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                  if (editError) setEditError('')
                }}
                placeholder="Enter 4-digit PIN"
              />
            </div>

            {editError && <div className="mobile-nickname-modal-error">{editError}</div>}

            <div className="mobile-nickname-modal-actions">
              <button onClick={handleCloseEditModal} className="mobile-nickname-cancel-btn">Cancel</button>
              <button onClick={handleSaveEditedValue} className="mobile-nickname-save-btn">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileProfilePage
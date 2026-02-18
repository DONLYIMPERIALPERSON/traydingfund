import React, { useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopProfilePage.css'

const DesktopProfilePage: React.FC = () => {
  const [showEditNameModal, setShowEditNameModal] = useState(false)
  const [editingField, setEditingField] = useState<'fullName' | 'nickName'>('fullName')
  const [fullName, setFullName] = useState('John Doe')
  const [nickName, setNickName] = useState('Gold Emperor')
  const [newFullName, setNewFullName] = useState('John Doe')
  const [editPin, setEditPin] = useState('')
  const [editError, setEditError] = useState('')

  const handleEditName = () => {
    setEditingField('fullName')
    setNewFullName(fullName)
    setEditPin('')
    setEditError('')
    setShowEditNameModal(true)
  }

  const handleEditNickName = () => {
    setEditingField('nickName')
    setNewFullName(nickName)
    setEditPin('')
    setEditError('')
    setShowEditNameModal(true)
  }

  const handleCloseEditNameModal = () => {
    setShowEditNameModal(false)
    setEditPin('')
    setEditError('')
  }

  const handleSaveName = () => {
    const cleaned = newFullName.trim()
    if (!cleaned) {
      setEditError('This field is required')
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

    setEditError('')
    setShowEditNameModal(false)
  }

  return (
    <div className="profile-page">
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
          <h1>My Profile</h1>
          <p>Manage your account information and settings</p>
        </div>

        {/* Profile Content */}
        <div className="profile-content">
          {/* Profile Sidebar */}
          <div className="profile-sidebar">
            <div className="profile-avatar">
              <i className="fas fa-user profile-avatar-icon"></i>
            </div>
            <div className="profile-name">{fullName}</div>
            <div className="profile-email">john.doe@email.com</div>
          </div>

          {/* Profile Main Content */}
          <div className="profile-main">
            {/* Nick Name */}
            <div className="profile-section">
              <div className="section-header">
                <h3 className="section-title">Nick Name</h3>
                <button
                  onClick={handleEditNickName}
                  className="edit-button"
                >
                  <i className="fas fa-edit"></i>
                </button>
              </div>
              <div className="section-content">{nickName}</div>
              <div className="section-subtitle">Your unique nickname</div>
            </div>

            {/* Full Name */}
            <div className="profile-section">
              <div className="section-header">
                <h3 className="section-title">Full Name</h3>
                <button
                  onClick={handleEditName}
                  className="edit-button"
                >
                  <i className="fas fa-edit"></i>
                </button>
              </div>
              <div className="section-content">{fullName}</div>
              <div className="section-subtitle">Your display name</div>
            </div>

          </div>
        </div>
      </div>

      {showEditNameModal && (
        <div className="desktop-edit-name-modal-overlay" onClick={handleCloseEditNameModal}>
          <div className="desktop-edit-name-modal" onClick={(e) => e.stopPropagation()}>
            <div className="desktop-edit-name-modal-header">
              <h3>{editingField === 'fullName' ? 'Edit Full Name' : 'Edit Nick Name'}</h3>
              <button onClick={handleCloseEditNameModal} className="desktop-edit-name-close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p className="desktop-edit-name-modal-subtitle">
              {editingField === 'fullName'
                ? 'Update your display name for your profile.'
                : 'Update your nickname used across your profile and certificates.'}
            </p>

            <div className="desktop-edit-name-field">
              <label>{editingField === 'fullName' ? 'Full Name' : 'Nick Name'}</label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => {
                  setNewFullName(e.target.value)
                  if (editError) setEditError('')
                }}
                placeholder={editingField === 'fullName' ? 'Enter full name' : 'Enter nick name'}
              />
            </div>

            <div className="desktop-edit-name-field" style={{ marginTop: '10px' }}>
              <label>Transaction PIN</label>
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

            {editError && <div className="desktop-edit-name-error">{editError}</div>}

            <div className="desktop-edit-name-modal-actions">
              <button onClick={handleCloseEditNameModal} className="desktop-edit-name-cancel">Cancel</button>
              <button onClick={handleSaveName} className="desktop-edit-name-save">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopProfilePage

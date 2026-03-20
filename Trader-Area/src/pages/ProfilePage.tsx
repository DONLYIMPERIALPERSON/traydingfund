import React, { useEffect, useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopProfilePage.css'
import { fetchProfile, getPersistedAuthUser, persistAuthUser, updateProfile } from '../mocks/auth'

const persistedUser = getPersistedAuthUser()

const ProfilePage: React.FC = () => {
  const [showEditNameModal, setShowEditNameModal] = useState(false)
  const [fullName, setFullName] = useState(persistedUser?.full_name || '')
  const [firstName, setFirstName] = useState(persistedUser?.first_name || '')
  const [lastName, setLastName] = useState(persistedUser?.last_name || '')
  const [nickName, setNickName] = useState(persistedUser?.nick_name || '')
  const [newNickName, setNewNickName] = useState(persistedUser?.nick_name || '')
  const [editPin, setEditPin] = useState('')
  const [editError, setEditError] = useState('')
  const [email, setEmail] = useState(persistedUser?.email || '')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchProfile()
        setFullName(profile.full_name || '')
        setFirstName(profile.first_name || '')
        setLastName(profile.last_name || '')
        setNickName(profile.nick_name || '')
        setEmail(profile.email || '')
      } catch (error) {
        console.warn('Failed to load profile:', error)
      }
    }

    loadProfile()
  }, [])

  const handleEditName = () => {
    setNewNickName(nickName)
    setEditPin('')
    setEditError('')
    setShowEditNameModal(true)
  }

  const handleCloseEditNameModal = () => {
    setShowEditNameModal(false)
    setEditPin('')
    setEditError('')
  }

  const handleSaveName = async () => {
    const cleaned = newNickName.trim()
    if (!cleaned) {
      setEditError('Nickname is required')
      return
    }

    if (!/^\d{4}$/.test(editPin)) {
      setEditError('Enter your 4-digit PIN to change nickname')
      return
    }

    try {
      const updated = await updateProfile({ nick_name: cleaned })
      setFullName(updated.full_name || '')
      setFirstName(updated.first_name || '')
      setLastName(updated.last_name || '')
      setNickName(updated.nick_name || '')
      setEmail(updated.email || '')
      persistAuthUser(updated)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile'
      setEditError(message)
      return
    }

    setEditError('')
    setShowEditNameModal(false)
  }

  return (
    <div className="profile-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="profile-content-wrapper">
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
            <div className="profile-email">{email}</div>
          </div>

          {/* Profile Main Content */}
          <div className="profile-main">
            {/* Nick Name */}
            <div className="profile-section">
              <div className="section-header">
                <h3 className="section-title">Nick Name</h3>
                <button
                  onClick={handleEditName}
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
              </div>
              <div className="section-content">{fullName || `${firstName} ${lastName}`.trim()}</div>
              <div className="section-subtitle">Your display name</div>
            </div>

          </div>
        </div>
      </div>

      {showEditNameModal && (
        <div className="desktop-edit-name-modal-overlay" onClick={handleCloseEditNameModal}>
          <div className="desktop-edit-name-modal" onClick={(e) => e.stopPropagation()}>
            <div className="desktop-edit-name-modal-header">
              <h3>Edit Nick Name</h3>
              <button onClick={handleCloseEditNameModal} className="desktop-edit-name-close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p className="desktop-edit-name-modal-subtitle">
              Update your nickname used across your profile and certificates.
            </p>

            <div className="desktop-edit-name-field">
              <label>Nick Name</label>
              <input
                type="text"
                value={newNickName}
                onChange={(e) => {
                  setNewNickName(e.target.value)
                  if (editError) setEditError('')
                }}
                placeholder="Enter nick name"
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

export default ProfilePage

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProfile, getPersistedAuthUser, persistAuthUser, updateProfile, logoutFromBackend } from '../lib/traderAuth'
import '../styles/MobileProfilePage.css'

const persistedUser = getPersistedAuthUser()

const MobileProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const [showEditNameModal, setShowEditNameModal] = useState(false)
  const [fullName, setFullName] = useState(persistedUser?.full_name || '')
  const [firstName, setFirstName] = useState(persistedUser?.first_name || '')
  const [lastName, setLastName] = useState(persistedUser?.last_name || '')
  const [nickName, setNickName] = useState(persistedUser?.nick_name || '')
  const [newNickName, setNewNickName] = useState(persistedUser?.nick_name || '')
  const [editError, setEditError] = useState('')
  const [email, setEmail] = useState(persistedUser?.email || '')
  const [loggingOut, setLoggingOut] = useState(false)

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

    void loadProfile()
  }, [])

  const handleEditName = () => {
    setNewNickName(nickName)
    setEditError('')
    setShowEditNameModal(true)
  }

  const handleCloseEditNameModal = () => {
    setShowEditNameModal(false)
    setEditError('')
  }

  const handleSaveName = async () => {
    const cleaned = newNickName.trim()
    if (!cleaned) {
      setEditError('Nickname is required')
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

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await logoutFromBackend()
      navigate('/login')
    } catch (error) {
      console.error('Failed to logout:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="mobile-profile-page">
      <div className="mobile-profile-shell">
        <header className="mobile-profile-header">
          <button type="button" className="mobile-profile-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-profile-header__text">
            <h1>My Profile</h1>
            <p>Manage your account information and profile settings.</p>
          </div>
          <button type="button" className="mobile-profile-header__icon" onClick={() => navigate('/settings')}>
            <i className="fas fa-gear" />
          </button>
        </header>

        <section className="mobile-profile-card mobile-profile-card--hero">
          <div className="mobile-profile-avatar">
            <i className="fas fa-user" />
          </div>
          <strong>{fullName || `${firstName} ${lastName}`.trim() || 'Profile'}</strong>
          <p>{email}</p>
        </section>

        <section className="mobile-profile-card">
          <div className="mobile-profile-item">
            <div>
              <span>Nick Name</span>
              <strong>{nickName || 'Not set'}</strong>
            </div>
            <button type="button" className="mobile-profile-edit" onClick={handleEditName}>
              <i className="fas fa-edit" />
            </button>
          </div>

          <div className="mobile-profile-item">
            <div>
              <span>Full Name</span>
              <strong>{fullName || `${firstName} ${lastName}`.trim() || 'Not set'}</strong>
            </div>
          </div>

          <div className="mobile-profile-item">
            <div>
              <span>Email</span>
              <strong>{email || 'Not available'}</strong>
            </div>
          </div>
        </section>

        <button type="button" className="mobile-profile-logout" onClick={() => void handleLogout()} disabled={loggingOut}>
          <i className={`fas ${loggingOut ? 'fa-spinner fa-spin' : 'fa-right-from-bracket'}`} />
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {showEditNameModal ? (
        <div className="mobile-profile-modal-overlay" onClick={handleCloseEditNameModal}>
          <div className="mobile-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-profile-modal__handle" />
            <h3>Edit Nick Name</h3>
            <p>Update your nickname used across your profile and certificates.</p>
            <label>
              <span>Nick Name</span>
              <input
                type="text"
                value={newNickName}
                onChange={(e) => {
                  setNewNickName(e.target.value)
                  if (editError) setEditError('')
                }}
                placeholder="Enter nick name"
              />
            </label>
            {editError ? <div className="mobile-profile-error">{editError}</div> : null}
            <div className="mobile-profile-modal__actions">
              <button type="button" className="mobile-profile-modal__secondary" onClick={handleCloseEditNameModal}>Cancel</button>
              <button type="button" className="mobile-profile-modal__primary" onClick={() => void handleSaveName()}>Save Changes</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default MobileProfilePage
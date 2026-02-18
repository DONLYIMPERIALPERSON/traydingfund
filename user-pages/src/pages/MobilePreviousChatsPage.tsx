import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobilePreviousChatsPage.css'

const MobilePreviousChatsPage: React.FC = () => {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

  const chats = [
    { id: 1, date: 'Today', time: '2:30 PM', lastMessage: 'Thank you for your help!', status: 'Resolved' },
    { id: 2, date: 'Yesterday', time: '4:15 PM', lastMessage: 'Account verification completed', status: 'Resolved' },
    { id: 3, date: '2 days ago', time: '11:45 AM', lastMessage: 'Password reset successful', status: 'Resolved' },
    { id: 4, date: '3 days ago', time: '9:20 AM', lastMessage: 'Trading platform issue', status: 'Pending' },
    { id: 5, date: '1 week ago', time: '3:10 PM', lastMessage: 'Deposit confirmation', status: 'Resolved' },
  ]

  return (
    <div className="mobile-previous-chats-page">
      <div className="mobile-previous-chats-fixed-header">
        <div className="mobile-previous-chats-header-shell">
          <div className="mobile-previous-chats-header-row">
            <div className="mobile-previous-chats-header-left">
              <div className="mobile-previous-chats-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-previous-chats-header-center">
              <span className="mobile-previous-chats-header-title">Previous Chats</span>
            </div>
            <div className="mobile-previous-chats-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-previous-chats-content-container">
        <div style={{padding: '24px 20px'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {chats.map((chat) => (
              <div key={chat.id} style={{background: 'rgba(255,215,0,0.05)', borderRadius: '16px', padding: '16px', border: '0.5px solid rgba(255,215,0,0.1)', cursor: 'pointer'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                  <div>
                    <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>{chat.date}</div>
                    <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)'}}>{chat.time}</div>
                  </div>
                  <div style={{background: chat.status === 'Resolved' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 193, 7, 0.15)', color: chat.status === 'Resolved' ? '#2ecc71' : '#ffc107', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'}}>
                    {chat.status}
                  </div>
                </div>
                <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)'}}>{chat.lastMessage}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobilePreviousChatsPage
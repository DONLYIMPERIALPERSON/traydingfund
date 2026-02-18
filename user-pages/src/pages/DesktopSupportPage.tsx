import React, { useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopSupportPage.css'

const DesktopSupportPage: React.FC = () => {
  const [message, setMessage] = useState('')

  const handleSendMessage = () => {
    if (message.trim()) {
      // Handle sending message
      console.log('Sending message:', message)
      setMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickHelpItems = [
    {
      icon: 'fas fa-user-lock',
      title: 'Account Access',
      description: 'Help with login, password reset, and account security'
    },
    {
      icon: 'fas fa-chart-line',
      title: 'Trading Issues',
      description: 'Problems with trades, orders, or platform functionality'
    },
    {
      icon: 'fas fa-credit-card',
      title: 'Payout Problems',
      description: 'Issues with withdrawals, payments, or payout methods'
    },
    {
      icon: 'fas fa-file-alt',
      title: 'Documentation',
      description: 'Help with challenges, rules, and trading guidelines'
    },
    {
      icon: 'fas fa-cog',
      title: 'Technical Support',
      description: 'Platform bugs, errors, or technical difficulties'
    },
    {
      icon: 'fas fa-question-circle',
      title: 'General Questions',
      description: 'Any other questions or concerns you may have'
    }
  ]

  return (
    <div className="support-page">
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
          <h1>Support Center</h1>
          <p>Get help with your trading account and platform questions</p>
        </div>

        {/* Support Content */}
        <div className="support-content">
          {/* Chat Section */}
          <div className="chat-section">
            {/* Chat Header */}
            <div className="chat-header">
              <div className="support-avatar">
                <i className="fas fa-headset support-avatar-icon"></i>
              </div>
              <div className="support-info">
                <h3>NairaTrader Support</h3>
                <p>Typically replies instantly</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="chat-messages">
              <div className="message support">
                <div className="message-bubble">
                  <div className="message-text">
                    Hello! How can I help you with your trading account today?
                  </div>
                  <div className="message-time">10:30 AM</div>
                </div>
              </div>

              <div className="message user">
                <div className="message-bubble">
                  <div className="message-text">
                    I'm having trouble accessing my account details.
                  </div>
                  <div className="message-time">10:32 AM</div>
                </div>
              </div>

              <div className="message support">
                <div className="message-bubble">
                  <div className="message-text">
                    I understand. Let me help you with that. Can you please provide your account number?
                  </div>
                  <div className="message-time">10:33 AM</div>
                </div>
              </div>

              <div className="message user">
                <div className="message-bubble">
                  <div className="message-text">
                    Sure, it's 81054239
                  </div>
                  <div className="message-time">10:34 AM</div>
                </div>
              </div>

              <div className="message support">
                <div className="message-bubble">
                  <div className="message-text">
                    Thank you. I've verified your account. The issue seems to be with your login credentials. Let me reset your password.
                  </div>
                  <div className="message-time">10:35 AM</div>
                </div>
              </div>
            </div>

            {/* Chat Input Area */}
            <div className="chat-input-area">
              <div className="chat-input-container">
                <button className="attach-button">
                  <i className="fas fa-plus attach-icon"></i>
                </button>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Enter your question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button
                  className="send-button"
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                >
                  <i className="fas fa-paper-plane send-icon"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Help Section */}
          <div className="quick-help-section">
            <div className="quick-help-header">
              <h2 className="quick-help-title">Quick Help</h2>
              <p className="quick-help-subtitle">Common topics and solutions</p>
            </div>

            <div className="quick-help-list">
              {quickHelpItems.map((item, index) => (
                <div key={index} className="quick-help-item">
                  <i className={`${item.icon} quick-help-icon`}></i>
                  <h3 className="quick-help-item-title">{item.title}</h3>
                  <p className="quick-help-item-desc">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopSupportPage

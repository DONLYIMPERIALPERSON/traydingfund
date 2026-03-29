import { useState } from 'react'
import { sendAnnouncement, sendTestAnnouncement, type SendAnnouncementResponse } from '../lib/adminApi'
import './SendAnnouncementPage.css'

const SendAnnouncementPage = () => {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [response, setResponse] = useState<SendAnnouncementResponse | null>(null)
  const [error, setError] = useState('')

  const handleSendAnnouncement = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required')
      return
    }

    try {
      setLoading(true)
      setError('')
      setResponse(null)

      const result = await sendAnnouncement({
        subject: subject.trim(),
        message: message.trim(),
      })

      setResponse(result)
      // Clear form on success
      setSubject('')
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send announcement')
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required')
      return
    }

    try {
      setTestLoading(true)
      setError('')
      setResponse(null)

      const result = await sendTestAnnouncement({
        subject: subject.trim(),
        message: message.trim(),
      })

      setResponse(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test announcement')
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card announcement-hero">
        <h2>Send Announcement</h2>
        <p>Create and broadcast platform announcements to all active users.</p>
        {error && <p style={{ color: '#fca5a5', marginTop: 8 }}>{error}</p>}
        {response && (
          <div style={{
            marginTop: 8,
            padding: 12,
            backgroundColor: '#d1fae5',
            border: '1px solid #10b981',
            borderRadius: 4,
            color: '#065f46'
          }}>
            <strong>Success:</strong> {response.message}
            {response.recipient_count && (
              <div style={{ marginTop: 4 }}>
                <strong>Recipients:</strong> {response.recipient_count} users
              </div>
            )}
          </div>
        )}
      </div>

      <div className="announcement-layout">
        <div className="admin-dashboard-card announcement-form-card">
          <div className="announcement-form-head">
            <h3>Compose Announcement</h3>
            <span className="announcement-badge">Broadcast to All Users</span>
          </div>

          <label className="announcement-label">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Weekend maintenance update"
            />
          </label>

          <label className="announcement-label">
            Message
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write announcement message..."
            />
          </label>

          <div className="announcement-actions">
            <button
              type="button"
              className="announcement-test-btn"
              onClick={handleSendTest}
              disabled={testLoading || loading}
            >
              {testLoading ? 'Sending Test...' : 'Send Test Email'}
            </button>
            <button
              type="button"
              className="announcement-send-btn"
              onClick={handleSendAnnouncement}
              disabled={loading || testLoading}
            >
              {loading ? 'Sending...' : 'Send to All Users'}
            </button>
          </div>
        </div>

        <div className="admin-dashboard-card announcement-side-card">
          <h4>Announcement Guidelines</h4>
          <ul>
            <li><strong>Test First:</strong> Always send a test email to yourself before broadcasting.</li>
            <li><strong>Clear Subject:</strong> Keep the subject short and descriptive.</li>
            <li><strong>Professional Tone:</strong> Use clear, professional language.</li>
            <li><strong>Timing:</strong> Consider user time zones for important announcements.</li>
            <li><strong>Frequency:</strong> Avoid sending too many announcements to prevent spam fatigue.</li>
          </ul>

          <h4 style={{ marginTop: 20 }}>Email Template</h4>
          <div style={{
            fontSize: '12px',
            color: '#666',
            backgroundColor: '#f9f9f9',
            padding: 8,
            borderRadius: 4,
            marginTop: 8
          }}>
            <strong>From:</strong> Machefunded Team<br/>
            <strong>Subject:</strong> 📢 [Your Subject]<br/>
            <strong>Template:</strong> Professional Machefunded branded email
          </div>
        </div>
      </div>

      <div className="admin-dashboard-card">
        <h3>Announcement History</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Announcement history will be available in a future update. For now, announcements are sent directly to all active users.
        </p>
      </div>
    </section>
  )
}

export default SendAnnouncementPage

import { useEffect, useState } from 'react'
import { fetchEmailLogs, type EmailLogItem } from '../lib/adminAuth'
import './EmailLogsPage.css'

const PAGE_SIZE = 10

const EmailLogsPage = () => {
  const [emails, setEmails] = useState<EmailLogItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEmails = async (nextPage: number) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchEmailLogs(nextPage, PAGE_SIZE)
      setEmails(response.emails)
      setPage(response.pagination.page)
      setTotalPages(response.pagination.pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmails(page)
  }, [page])

  const handlePrevious = () => {
    if (page > 1) setPage(page - 1)
  }

  const handleNext = () => {
    if (page < totalPages) setPage(page + 1)
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <div className="email-logs-header">
          <div>
            <h2>Email Logs</h2>
            <p>Tracking email deliveries across the system.</p>
          </div>
          <div className="email-logs-pagination">
            <button type="button" onClick={handlePrevious} disabled={page <= 1 || loading}>
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" onClick={handleNext} disabled={page >= totalPages || loading}>
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="admin-table-card">
        {loading && <p>Loading email logs...</p>}
        {error && <p className="email-logs-error">{error}</p>}

        {!loading && !error && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sent At</th>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {emails.length === 0 && (
                <tr>
                  <td colSpan={4} className="email-logs-empty">No email logs yet.</td>
                </tr>
              )}
              {emails.map((email) => (
                <tr key={email.id}>
                  <td>{email.created_at ? new Date(email.created_at).toLocaleString() : '—'}</td>
                  <td>{email.to_email}</td>
                  <td>{email.subject}</td>
                  <td>
                    <span className={`email-status email-status-${email.status}`}>
                      {email.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default EmailLogsPage
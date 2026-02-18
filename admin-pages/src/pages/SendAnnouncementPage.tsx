import './SendAnnouncementPage.css'

const sentAnnouncements = [
  {
    id: 'ANN-1001',
    title: 'Maintenance Notice',
    audience: 'All Users',
    sentAt: '2026-02-17 11:10',
    status: 'Sent',
  },
  {
    id: 'ANN-1002',
    title: 'New Coupon Campaign',
    audience: 'Challenge Traders',
    sentAt: '2026-02-16 18:35',
    status: 'Sent',
  },
]

const SendAnnouncementPage = () => {
  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card announcement-hero">
        <h2>Send Announcement</h2>
        <p>Create and broadcast platform announcements to users.</p>
      </div>

      <div className="announcement-layout">
        <div className="admin-dashboard-card announcement-form-card">
          <div className="announcement-form-head">
            <h3>Compose Announcement</h3>
            <span className="announcement-badge">Broadcast</span>
          </div>

          <label className="announcement-label">
          Title
          <input placeholder="e.g. Weekend maintenance update" />
          </label>

          <label className="announcement-label">
          Audience
          <select>
            <option>All Users</option>
            <option>Challenge Traders</option>
            <option>Funded Traders</option>
            <option>Affiliates</option>
          </select>
          </label>

          <label className="announcement-label">
          Message
          <textarea rows={5} placeholder="Write announcement message..." />
          </label>

          <div className="announcement-actions">
            <button type="button" className="announcement-send-btn">Send Announcement</button>
          </div>
        </div>

        <div className="admin-dashboard-card announcement-side-card">
          <h4>Delivery Tips</h4>
          <ul>
            <li>Keep title short and clear.</li>
            <li>Select the right audience segment.</li>
            <li>Add exact date/time for maintenance notices.</li>
            <li>Avoid sending duplicate announcements.</li>
          </ul>
        </div>
      </div>

      <div className="admin-table-card">
        <h3 className="announcement-table-title">Recent Announcements</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Audience</th>
              <th>Sent At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sentAnnouncements.map((announcement) => (
              <tr key={announcement.id}>
                <td>{announcement.id}</td>
                <td>{announcement.title}</td>
                <td>{announcement.audience}</td>
                <td>{announcement.sentAt}</td>
                <td>
                  <span className="announcement-status-chip">{announcement.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default SendAnnouncementPage

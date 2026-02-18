const adminWorkData = [
  {
    name: 'Support Agent',
    role: 'Support',
    ticketsResolved: 38,
    avgResponse: '6m',
    reviewsProcessed: 4,
    score: 95,
  },
  {
    name: 'Finance Reviewer',
    role: 'Finance',
    ticketsResolved: 12,
    avgResponse: '15m',
    reviewsProcessed: 26,
    score: 88,
  },
  {
    name: 'Ops Coordinator',
    role: 'Operations',
    ticketsResolved: 20,
    avgResponse: '11m',
    reviewsProcessed: 15,
    score: 84,
  },
]

const sortedAdmins = [...adminWorkData].sort((a, b) => b.score - a.score)
const hardestWorker = sortedAdmins[0]

const WorkBoardPage = () => {
  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Work Board</h2>
        <p>Track admin productivity, response performance, and identify top-performing team members.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Top Performer</h3>
          <strong>{hardestWorker.name}</strong>
          <p>{hardestWorker.score} score</p>
        </article>
        <article className="admin-kpi-card">
          <h3>Total Tickets Resolved</h3>
          <strong>{adminWorkData.reduce((sum, admin) => sum + admin.ticketsResolved, 0)}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Fastest Responder</h3>
          <strong>{[...adminWorkData].sort((a, b) => Number.parseInt(a.avgResponse) - Number.parseInt(b.avgResponse))[0].name}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <h3 style={{ color: '#fff' }}>Admin Performance Board</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Admin</th>
              <th>Role</th>
              <th>Tickets Resolved</th>
              <th>Avg. Response</th>
              <th>Reviews Processed</th>
              <th>Performance Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedAdmins.map((admin, index) => (
              <tr key={admin.name}>
                <td>{index + 1}</td>
                <td>{admin.name}</td>
                <td>{admin.role}</td>
                <td>{admin.ticketsResolved}</td>
                <td>{admin.avgResponse}</td>
                <td>{admin.reviewsProcessed}</td>
                <td>{admin.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default WorkBoardPage

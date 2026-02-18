import './DashboardPage.css'

interface DashboardPageProps {
  onNavigate: (page: 'coupons' | 'sendAnnouncement') => void
}

const DashboardPage = ({ onNavigate }: DashboardPageProps) => {
  return (
    <section className="analysis-dashboard admin-page-stack">
      <header className="analysis-topbar admin-dashboard-card">
        <div className="analysis-topbar-filters">
          <label>
            Date Range
            <select>
              <option>Today</option>
              <option>7d</option>
              <option>30d</option>
              <option>Custom</option>
            </select>
          </label>
          <label>
            Segment
            <select>
              <option>All</option>
              <option>Challenge Phase 1</option>
              <option>Challenge Phase 2</option>
              <option>Funded</option>
            </select>
          </label>
          <label>
            Plan
            <select>
              <option>All Plans</option>
              <option>$10k 1-Step</option>
              <option>$50k 2-Step</option>
              <option>$100k 2-Step</option>
            </select>
          </label>
          <label>
            Server
            <select>
              <option>All Servers</option>
              <option>MT5-Live-01</option>
              <option>MT5-Live-02</option>
              <option>cTrader-Live</option>
            </select>
          </label>
        </div>

        <div className="analysis-topbar-actions">
          <button type="button" onClick={() => onNavigate('coupons')}>Create Coupon</button>
          <button type="button" onClick={() => onNavigate('sendAnnouncement')}>Send Announcement</button>
        </div>
      </header>

      <div className="admin-kpi-grid analysis-kpi-grid">
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Total Revenue</h3>
          <strong>₦128,420</strong>
          <p className="kpi-meta up">+12.4% vs prev</p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Today's Sales</h3>
          <strong>₦89,760</strong>
          <p className="kpi-meta up">+6.8% vs yesterday</p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Total Payouts</h3>
          <strong>₦18,900</strong>
          <p className="kpi-meta up">+6.3% vs prev</p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>New Signups</h3>
          <strong>1,284</strong>
          <p className="kpi-meta up">+5.7% vs prev</p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Active Challenge Accounts</h3>
          <strong>2,108</strong>
          <p className="kpi-meta down">-2.0% vs prev</p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Pass Rate</h3>
          <strong>17.4%</strong>
          <p className="kpi-meta up">+1.9% vs prev</p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Pending Payout Request</h3>
          <strong>36 (₦41,200)</strong>
          <p className="kpi-meta up">+4.6% vs prev</p>
          <span className="kpi-sparkline" />
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Today's Approved Payout Request</h3>
          <strong>14 (₦18,900)</strong>
          <p className="kpi-meta up">+6.3% vs prev</p>
          <span className="kpi-sparkline" />
        </article>
      </div>

      <div className="admin-dashboard-card">
        <h3>Operations Queues</h3>
        <div className="ops-queue-grid">
          <article className="ops-tile">
            <h4>Payouts Pending Review</h4>
            <strong>36</strong>
            <p>Oldest: 9h</p>
            <span className="sla on-track">On Track</span>
          </article>
          <article className="ops-tile">
            <h4>Support Tickets Open</h4>
            <strong>48</strong>
            <p>Oldest: 26h</p>
            <span className="sla at-risk">At Risk</span>
          </article>
          <article className="ops-tile">
            <h4>Provisioning Failures</h4>
            <strong>7</strong>
            <p>Oldest: 3h</p>
            <span className="sla on-track">On Track</span>
          </article>
          <article className="ops-tile">
            <h4>Webhook Failures</h4>
            <strong>11</strong>
            <p>Oldest: 2h</p>
            <span className="sla at-risk">At Risk</span>
          </article>
        </div>
      </div>

      <div className="analysis-two-col">
        <div className="admin-dashboard-card">
          <h3>Top 10 Highest Performing Traders</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Trader</th>
                <th>Account ID</th>
                <th>Profit (30d)</th>
                <th>Win Rate</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Chinedu A.</td>
                <td>FD-10422</td>
                <td>₦2,480,000</td>
                <td>74%</td>
                <td><button type="button">View Account</button></td>
              </tr>
              <tr>
                <td>Fatima S.</td>
                <td>FD-10407</td>
                <td>₦2,120,000</td>
                <td>71%</td>
                <td><button type="button">View Account</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="admin-dashboard-card">
          <h3>Rule Breach Heatmap</h3>
          <ul className="analysis-rule-list">
            <li><span>Max DD</span><strong>61</strong></li>
            <li><span>5 Mins Rule</span><strong>34</strong></li>
          </ul>
        </div>
      </div>

      <div className="admin-dashboard-card">
        <h3>Challenge Outcomes</h3>
        <ul className="analysis-rule-list">
          <li><span>Passed</span><strong>186</strong></li>
          <li><span>Failed</span><strong>704</strong></li>
          <li><span>Expired</span><strong>53</strong></li>
        </ul>
      </div>

      <div className="admin-dashboard-card">
        <h3>Account Counts</h3>
        <ul className="analysis-rule-list">
          <li><span>Ready</span><strong>128</strong></li>
          <li><span>Phase 1</span><strong>1,420</strong></li>
          <li><span>Phase 2</span><strong>486</strong></li>
          <li><span>Funded</span><strong>214</strong></li>
        </ul>
      </div>

      <div className="analysis-two-col">
        <div className="admin-dashboard-card">
          <h3>Support Overview</h3>
          <ul className="analysis-rule-list">
            <li><span>Open Tickets</span><strong>48</strong></li>
            <li><span>Avg First Response</span><strong>1h 28m</strong></li>
            <li><span>Avg Resolution</span><strong>9h 14m</strong></li>
          </ul>
        </div>

        <div className="admin-dashboard-card">
          <h3>System Health</h3>
          <div className="status-grid">
            <span className="status-chip ok">Broker Bridge: Connected</span>
            <span className="status-chip warn">Trade Ingestion Lag: 4m</span>
            <span className="status-chip ok">Webhooks Success: 98.6%</span>
            <span className="status-chip warn">Email Bounce: 2.8%</span>
            <span className="status-chip ok">KYC Provider: Up</span>
          </div>
        </div>
      </div>

      <div className="admin-dashboard-card">
        <h3>Error Log Preview (Last 10)</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Service</th>
              <th>Severity</th>
              <th>Message</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-02-17 13:42</td>
              <td>Broker Sync</td>
              <td>Warning</td>
              <td>Delayed trade ingestion on MT5-Live-02</td>
              <td><button type="button">View Logs</button></td>
            </tr>
            <tr>
              <td>2026-02-17 12:58</td>
              <td>Payments</td>
              <td>Error</td>
              <td>Webhook signature mismatch from gateway</td>
              <td><button type="button">View Logs</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default DashboardPage

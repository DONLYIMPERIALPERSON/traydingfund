const mt5Accounts = [
  {
    server: 'MT5-Live-01',
    password: 'Tr@de#8721',
    accountNumber: '10314521',
    investorPassword: 'Inv@2210',
    status: 'Ready',
  },
  {
    server: 'MT5-Live-01',
    password: 'Tr@de#8722',
    accountNumber: '10314522',
    investorPassword: 'Inv@2211',
    status: 'Ready',
  },
  {
    server: 'MT5-Live-02',
    password: 'Tr@de#8723',
    accountNumber: '10314523',
    investorPassword: 'Inv@2212',
    status: 'Ready',
  },
]

const MT5Page = () => {
  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2>MT5</h2>
          <p>Available Accounts: {mt5Accounts.length}</p>
        </div>

        <button
          type="button"
          style={{
            border: '1px solid #f59e0b',
            background: '#f59e0b',
            color: '#111827',
            borderRadius: 10,
            padding: '10px 14px',
            fontWeight: 700,
          }}
        >
          + Upload Accounts
        </button>
      </div>

      <div className="admin-table-card">
        <h3 style={{ color: '#fff' }}>MT5 Accounts</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Server</th>
              <th>Account Number</th>
              <th>Password</th>
              <th>Investor Password</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {mt5Accounts.map((account) => (
              <tr key={account.accountNumber}>
                <td>{account.server}</td>
                <td>{account.accountNumber}</td>
                <td>{account.password}</td>
                <td>{account.investorPassword}</td>
                <td>
                  <span
                    style={{
                      border: '1px solid rgba(34,197,94,0.5)',
                      background: 'rgba(34,197,94,0.16)',
                      color: '#86efac',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {account.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default MT5Page

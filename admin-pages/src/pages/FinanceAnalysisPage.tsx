import { useMemo, useState } from 'react'
import './FinanceAnalysisPage.css'

type SettingKey = 'accountPrice' | 'payoutPercent' | 'withdrawalFrequencyHours'

type FinanceSettings = {
  accountPrice: string
  payoutPercent: string
  withdrawalFrequencyHours: string
}

const settingMeta: Record<SettingKey, { title: string; unit?: string }> = {
  accountPrice: { title: 'Default Account Price' },
  payoutPercent: { title: 'Payout %', unit: '%' },
  withdrawalFrequencyHours: { title: 'Withdrawal Frequency', unit: 'hours' },
}

type AccountPriceItem = {
  id: string
  accountSize: string
  price: string
  enabled: boolean
}

const FinanceAnalysisPage = () => {
  const monthlyFinance = [
    { month: 'Jan 2026', totalPurchase: '₦142,800,000', totalPayouts: '₦29,400,000' },
    { month: 'Feb 2026', totalPurchase: '₦128,420,000', totalPayouts: '₦18,900,000' },
    { month: 'Mar 2026', totalPurchase: '₦151,260,000', totalPayouts: '₦34,180,000' },
  ]

  const [selectedMonth, setSelectedMonth] = useState(monthlyFinance[1].month)
  const [settings, setSettings] = useState<FinanceSettings>({
    accountPrice: '₦299,000',
    payoutPercent: '80',
    withdrawalFrequencyHours: '24',
  })
  const [accountPricing, setAccountPricing] = useState<AccountPriceItem[]>([
    { id: '200k', accountSize: '₦200k Account', price: '₦8,900', enabled: true },
    { id: '400k', accountSize: '₦400k Account', price: '₦18,500', enabled: true },
    { id: '600k', accountSize: '₦600k Account', price: '₦28,000', enabled: true },
    { id: '800k', accountSize: '₦800k Account', price: '₦38,000', enabled: true },
    { id: '1.5m', accountSize: '₦1.5m Account', price: '₦99,000', enabled: true },
    { id: '3m', accountSize: '₦3m Account', price: '₦180,000', enabled: false },
  ])
  const [editingKey, setEditingKey] = useState<SettingKey | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [authError, setAuthError] = useState('')

  const selectedMonthFinance = useMemo(
    () => monthlyFinance.find((entry) => entry.month === selectedMonth) ?? monthlyFinance[0],
    [selectedMonth],
  )

  const openEditModal = (key: SettingKey) => {
    setEditingKey(key)
    setEditValue(settings[key])
    setAuthCode('')
    setAuthError('')
  }

  const closeEditModal = () => {
    setEditingKey(null)
    setEditingAccountId(null)
    setEditValue('')
    setAuthCode('')
    setAuthError('')
  }

  const openAccountPriceModal = (accountId: string) => {
    const account = accountPricing.find((entry) => entry.id === accountId)
    if (!account) return

    setEditingKey(null)
    setEditingAccountId(accountId)
    setEditValue(account.price)
    setAuthCode('')
    setAuthError('')
  }

  const saveSettingUpdate = () => {
    if (!editingKey && !editingAccountId) return

    if (authCode !== '123456') {
      setAuthError('Invalid authentication code')
      return
    }

    if (editingKey) {
      setSettings((prev) => ({ ...prev, [editingKey]: editValue }))
    }

    if (editingAccountId) {
      setAccountPricing((prev) =>
        prev.map((entry) =>
          entry.id === editingAccountId ? { ...entry, price: editValue } : entry,
        ),
      )
    }

    closeEditModal()
  }

  const toggleAccountEnabled = (accountId: string) => {
    setAccountPricing((prev) =>
      prev.map((entry) =>
        entry.id === accountId ? { ...entry, enabled: !entry.enabled } : entry,
      ),
    )
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Finance Analysis</h2>
        <p>Month-to-month finance insights for purchases and payouts.</p>
      </div>

      <div className="admin-dashboard-card">
        <div className="analysis-topbar-filters">
          <label>
            Month
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {monthlyFinance.map((entry) => (
                <option key={entry.month} value={entry.month}>{entry.month}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="admin-kpi-grid analysis-kpi-grid">
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Total Purchase ({selectedMonth})</h3>
          <strong>{selectedMonthFinance.totalPurchase}</strong>
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Total Payouts ({selectedMonth})</h3>
          <strong>{selectedMonthFinance.totalPayouts}</strong>
        </article>
      </div>

      <div className="admin-dashboard-card">
        <h3>Settings</h3>
        <p className="finance-settings-note">Current saved values are shown below. Use edit icon to update each setting.</p>

        <div className="finance-account-price-section">
          <h4>Account Size Pricing</h4>
          <div className="finance-account-price-list">
            {accountPricing.map((account) => (
              <article key={account.id} className="finance-account-price-row">
                <div>
                  <strong>{account.accountSize}</strong>
                  <p>{account.price}</p>
                </div>

                <div className="finance-account-price-actions">
                  <button type="button" className="finance-setting-edit-btn" onClick={() => openAccountPriceModal(account.id)}>
                    ✎ Edit Price
                  </button>
                  <button
                    type="button"
                    className={`finance-toggle-btn ${account.enabled ? 'disable' : 'enable'}`}
                    onClick={() => toggleAccountEnabled(account.id)}
                  >
                    {account.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="finance-settings-grid">
          {(Object.keys(settingMeta) as SettingKey[])
            .filter((key) => key !== 'accountPrice')
            .map((key) => (
            <article key={key} className="finance-setting-card">
              <div>
                <h4>{settingMeta[key].title}</h4>
                <strong>
                  {settings[key]}
                  {settingMeta[key].unit ? ` ${settingMeta[key].unit}` : ''}
                </strong>
              </div>
              <button type="button" className="finance-setting-edit-btn" onClick={() => openEditModal(key)}>
                ✎ Edit
              </button>
            </article>
            ))}
        </div>
      </div>

      {(editingKey || editingAccountId) && (
        <div className="finance-settings-modal-backdrop" onClick={closeEditModal}>
          <div className="finance-settings-modal" onClick={(event) => event.stopPropagation()}>
            <h3>
              Edit{' '}
              {editingKey
                ? settingMeta[editingKey].title
                : accountPricing.find((entry) => entry.id === editingAccountId)?.accountSize}
            </h3>

            <label>
              New Value
              <input value={editValue} onChange={(event) => setEditValue(event.target.value)} />
            </label>

            <label>
              Security Verification (Authentication Code)
              <input
                value={authCode}
                onChange={(event) => setAuthCode(event.target.value)}
                placeholder="Enter 6-digit code"
              />
            </label>

            {authError && <p className="finance-auth-error">{authError}</p>}

            <div className="finance-settings-modal-actions">
              <button type="button" onClick={closeEditModal}>Cancel</button>
              <button type="button" className="primary" onClick={saveSettingUpdate}>Save Update</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default FinanceAnalysisPage

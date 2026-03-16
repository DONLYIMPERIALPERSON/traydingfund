import { useEffect, useMemo, useState } from 'react'
import { fetchMonthlyFinanceStats } from '../lib/adminMock'

const FinanceAnalysisPage = () => {
  const [monthlyFinance, setMonthlyFinance] = useState<Array<{ month: string; totalPurchase: string; totalPayouts: string }>>([])
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => {
    let mounted = true

    const loadConfig = async () => {
      try {
        const financeResponse = await fetchMonthlyFinanceStats()
        if (!mounted) return
        setMonthlyFinance(financeResponse.monthlyFinance)
        // Set the most recent month as selected by default
        if (financeResponse.monthlyFinance.length > 0) {
          setSelectedMonth(financeResponse.monthlyFinance[0].month)
        }
      } catch {
        if (!mounted) return
      } finally {
      }
    }

    void loadConfig()
    return () => {
      mounted = false
    }
  }, [])

  const selectedMonthFinance = useMemo(
    () => monthlyFinance.find((entry) => entry.month === selectedMonth) ?? (monthlyFinance.length > 0 ? monthlyFinance[0] : { month: '', totalPurchase: '$0', totalPayouts: '$0' }),
    [selectedMonth, monthlyFinance],
  )


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
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} disabled={monthlyFinance.length === 0}>
              {monthlyFinance.length === 0 ? (
                <option value="">Loading...</option>
              ) : (
                monthlyFinance.map((entry) => (
                  <option key={entry.month} value={entry.month}>{entry.month}</option>
                ))
              )}
            </select>
          </label>
        </div>
      </div>

      <div className="admin-kpi-grid analysis-kpi-grid">
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Total Purchase ({selectedMonth || 'Loading...'})</h3>
          <strong>{selectedMonthFinance.totalPurchase}</strong>
        </article>
        <article className="admin-kpi-card analysis-kpi-card">
          <h3>Total Payouts ({selectedMonth || 'Loading...'})</h3>
          <strong>{selectedMonthFinance.totalPayouts}</strong>
        </article>
      </div>

    </section>
  )
}

export default FinanceAnalysisPage

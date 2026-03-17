import { useEffect, useMemo, useState } from 'react'
import {
  assignMT5Account,
  downloadMT5Template,
  fetchAssignedMT5Accounts,
  fetchAwaitingNextStageAccounts,
  fetchMT5Accounts,
  fetchNextChallengeId,
  fetchMT5Summary,
  fetchPendingAssignments,
  type ChallengeAccountListItem,
  deleteMT5Account,
  type MT5Account,
  type Order,
  uploadMT5AccountsTxt,
} from '../lib/adminMock'

type TabMode = 'ready' | 'assigned' | 'pending-assign' | 'awaiting-next-stage'

const publicAccountSizes = [
  { value: '$2,000', label: '$2,000 Account' },
  { value: '$10,000', label: '$10,000 Account' },
  { value: '$30,000', label: '$30,000 Account' },
  { value: '$50,000', label: '$50,000 Account' },
  { value: '$100,000', label: '$100,000 Account' },
  { value: '$200,000', label: '$200,000 Account' },
]

const normalizeAccountSize = (size: string) => size.replace(/\s*Account$/i, '').trim()

const CTraderPage = ({ isSuperAdmin, canAssignMt5 }: { isSuperAdmin: boolean; canAssignMt5: boolean }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('ready')
  const [readyAccounts, setReadyAccounts] = useState<MT5Account[]>([])
  const [assignedAccounts, setAssignedAccounts] = useState<MT5Account[]>([])
  const [awaitingNextStageAccounts, setAwaitingNextStageAccounts] = useState<ChallengeAccountListItem[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<Order[]>([])
  const [summary, setSummary] = useState({ total: 0, ready: 0, assigned: 0, disabled: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readySearch, setReadySearch] = useState('')
  const [assignedSearch, setAssignedSearch] = useState('')
  const [readySizeFilter, setReadySizeFilter] = useState('')
  const [assignedSizeFilter, setAssignedSizeFilter] = useState('')
  const [awaitingSizeFilter, setAwaitingSizeFilter] = useState('')
  const [pendingSizeFilter, setPendingSizeFilter] = useState('')
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null)

  const [selectedAccount, setSelectedAccount] = useState<MT5Account | null>(null)
  const [assignmentStage, setAssignmentStage] = useState<'Phase 1' | 'Phase 2' | 'Funded'>('Phase 1')
  const [assignedUserEmailInput, setAssignedUserEmailInput] = useState('')
  const [challengeIdInput, setChallengeIdInput] = useState('')
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loadingChallengeId, setLoadingChallengeId] = useState(false)
  const [useCustomChallengeId, setUseCustomChallengeId] = useState(false)

  const loadNextManualChallengeId = async () => {
    setLoadingChallengeId(true)
    try {
      const response = await fetchNextChallengeId('manual')
      setChallengeIdInput(response.challenge_id)
    } catch {
      setChallengeIdInput('')
    } finally {
      setLoadingChallengeId(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [summaryRes, readyRes, assignedRes, awaitingRes, pendingRes] = await Promise.all([
        fetchMT5Summary(),
        fetchMT5Accounts('Ready'),
        fetchAssignedMT5Accounts(),
        fetchAwaitingNextStageAccounts(),
        fetchPendingAssignments(),
      ])

      setSummary(summaryRes)
      setReadyAccounts(readyRes.accounts)
      setAssignedAccounts(assignedRes.accounts)
      setAwaitingNextStageAccounts(awaitingRes.accounts)
      setPendingAssignments(pendingRes.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cTrader data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const accountSizeCounts = useMemo(() => {
    return readyAccounts.reduce<Record<string, number>>((acc, account) => {
      const normalized = normalizeAccountSize(account.account_size)
      acc[normalized] = (acc[normalized] ?? 0) + 1
      return acc
    }, {})
  }, [readyAccounts])

  const filteredReadyAccounts = useMemo(() => {
    const query = readySearch.trim().toLowerCase()
    return readyAccounts.filter((account) => {
      const matchesQuery = !query || account.account_number.toLowerCase().includes(query)
      const matchesSize = !readySizeFilter || account.account_size === readySizeFilter
      return matchesQuery && matchesSize
    })
  }, [readyAccounts, readySearch, readySizeFilter])

  const filteredAssignedAccounts = useMemo(() => {
    const query = assignedSearch.trim().toLowerCase()
    return assignedAccounts.filter((account) => {
      const matchesQuery = !query || account.account_number.toLowerCase().includes(query)
      const matchesSize = !assignedSizeFilter || account.account_size === assignedSizeFilter
      return matchesQuery && matchesSize
    })
  }, [assignedAccounts, assignedSearch, assignedSizeFilter])

  const filteredAwaitingNextStageAccounts = useMemo(() => {
    return awaitingNextStageAccounts.filter((account) => {
      return !awaitingSizeFilter || account.account_size === awaitingSizeFilter
    })
  }, [awaitingNextStageAccounts, awaitingSizeFilter])

  const filteredPendingAssignments = useMemo(() => {
    return pendingAssignments.filter((order) => {
      return !pendingSizeFilter || order.account_size === pendingSizeFilter
    })
  }, [pendingAssignments, pendingSizeFilter])

  const activeSizes = useMemo(
    () => publicAccountSizes.filter((size) => (accountSizeCounts[size.value] ?? 0) > 0).length,
    [accountSizeCounts],
  )

  const resetAssignModal = () => {
    setSelectedAccount(null)
    setAssignmentStage('Phase 1')
    setAssignedUserEmailInput('')
    setChallengeIdInput('')
    setUseCustomChallengeId(false)
    setSavingAssignment(false)
    setFormError('')
  }

  useEffect(() => {
    if (!selectedAccount) return
    if (useCustomChallengeId) return
    // Auto-generate challenge ID for all stages when not using custom ID
    void loadNextManualChallengeId()
  }, [selectedAccount, useCustomChallengeId])

  const handleAssignAccount = async () => {
    if (!selectedAccount) return
    setSavingAssignment(true)
    setFormError('')
    setFormSuccess('')

    try {
      const trimmedEmail = assignedUserEmailInput.trim().toLowerCase()
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        setFormError('Assigned user email is required and must be a valid email.')
        return
      }

      const trimmedChallengeId = challengeIdInput.trim()
      if (!trimmedChallengeId) {
        setFormError('Challenge ID is required. Please wait for auto-generation or enter a custom ID.')
        return
      }

      await assignMT5Account(selectedAccount.id, {
        stage: assignmentStage,
        assigned_user_email: trimmedEmail,
        challenge_id: trimmedChallengeId || undefined,
      })

      setFormSuccess(`Account ${selectedAccount.account_number} assigned to ${assignmentStage}.`)
      resetAssignModal()
      await loadData()
      setActiveTab('assigned')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to assign account')
    } finally {
      setSavingAssignment(false)
    }
  }

  const renderAssignedBy = (account: MT5Account) => {
    if (account.assignment_mode === 'automatic') return 'Auto'
    if (account.assignment_mode === 'manual') return `Manual (${account.assigned_by_admin_name ?? 'Admin'})`
    return '-'
  }

  const handleDownloadTemplate = async () => {
    try {
      const template = await downloadMT5Template()
      const blob = new Blob([template], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'ctrader_accounts_template.txt'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download template')
    }
  }

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const content = await file.text()
      await uploadMT5AccountsTxt(content)
      await loadData()
      setActiveTab('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload accounts')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }


  const handleDeleteAccount = async (account: MT5Account, isAssigned?: boolean) => {
    const confirmDelete = window.confirm(
      isAssigned
        ? `Delete assigned cTrader account ${account.account_number}? This will unassign the user and mark their challenge as awaiting next stage.`
        : `Delete cTrader account ${account.account_number}? This cannot be undone.`,
    )
    if (!confirmDelete) return

    setDeletingAccountId(account.id)
    setError('')
    try {
      await deleteMT5Account(account.id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cTrader account')
    } finally {
      setDeletingAccountId(null)
    }
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2>cTrader</h2>
            <p style={{ margin: 0, color: '#fff' }}>Ready inventory and stage-assigned account tracking</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                border: '1px solid #2a2f3a',
                background: '#111827',
                color: '#d1d5db',
                borderRadius: 10,
                padding: '10px 14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Download Template
            </button>

            {isSuperAdmin && (
              <label
                style={{
                  border: '1px solid #f59e0b',
                  background: '#f59e0b',
                  color: '#111827',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 700,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.7 : 1,
                }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept=".txt,.csv,text/plain"
                  onChange={handleUploadFile}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div style={{ border: '1px solid #2a2f3a', borderRadius: 12, padding: 12, background: '#141821' }}>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Total Accounts</p>
            <p style={{ margin: '6px 0 0', color: '#fff', fontWeight: 800, fontSize: 20 }}>{summary.total}</p>
          </div>
          <div style={{ border: '1px solid #2a2f3a', borderRadius: 12, padding: 12, background: '#141821' }}>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Ready</p>
            <p style={{ margin: '6px 0 0', color: '#86efac', fontWeight: 800, fontSize: 20 }}>{summary.ready}</p>
          </div>
          <div style={{ border: '1px solid #2a2f3a', borderRadius: 12, padding: 12, background: '#141821' }}>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Assigned (Phase 1 / Phase 2 / Funded)</p>
            <p style={{ margin: '6px 0 0', color: '#fcd34d', fontWeight: 800, fontSize: 20 }}>{summary.assigned}</p>
          </div>
          <div style={{ border: '1px solid #2a2f3a', borderRadius: 12, padding: 12, background: '#141821' }}>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Active Sizes (Ready)</p>
            <p style={{ margin: '6px 0 0', color: '#fff', fontWeight: 800, fontSize: 20 }}>{activeSizes}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {publicAccountSizes.map((size) => {
            const count = accountSizeCounts[size.value] ?? 0
            return (
              <div key={size.value} style={{ border: '1px solid #2a2f3a', borderRadius: 12, padding: 12, background: count > 0 ? 'rgba(245,158,11,0.08)' : '#11151d' }}>
                <p style={{ margin: 0, color: '#d1d5db', fontSize: 12 }}>{size.label}</p>
                <p style={{ margin: '6px 0 0', color: '#fff', fontWeight: 800, fontSize: 18 }}>{count}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="admin-table-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 6px', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>cTrader Accounts</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab('ready')}
              style={{
                border: '1px solid #2a2f3a',
                background: activeTab === 'ready' ? 'rgba(34,197,94,0.16)' : 'transparent',
                color: activeTab === 'ready' ? '#86efac' : '#d1d5db',
                borderRadius: 10,
                padding: '7px 10px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Ready
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assigned')}
              style={{
                border: '1px solid #2a2f3a',
                background: activeTab === 'assigned' ? 'rgba(245,158,11,0.12)' : 'transparent',
                color: activeTab === 'assigned' ? '#fcd34d' : '#d1d5db',
                borderRadius: 10,
                padding: '7px 10px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Assigned
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('awaiting-next-stage')}
              style={{
                border: '1px solid #2a2f3a',
                background: activeTab === 'awaiting-next-stage' ? 'rgba(168,85,247,0.16)' : 'transparent',
                color: activeTab === 'awaiting-next-stage' ? '#c084fc' : '#d1d5db',
                borderRadius: 10,
                padding: '7px 10px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Awaiting Next Stage ({awaitingNextStageAccounts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending-assign')}
              style={{
                border: '1px solid #2a2f3a',
                background: activeTab === 'pending-assign' ? 'rgba(239,68,68,0.16)' : 'transparent',
                color: activeTab === 'pending-assign' ? '#fca5a5' : '#d1d5db',
                borderRadius: 10,
                padding: '7px 10px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Pending Assign ({pendingAssignments.length})
            </button>
          </div>
        </div>

        {activeTab === 'assigned' && (
          <div style={{ padding: '0 16px 12px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              type="search"
              value={assignedSearch}
              onChange={(event) => setAssignedSearch(event.target.value)}
              placeholder="Search assigned account number"
              style={{
                width: 'min(320px, 100%)',
                borderRadius: 10,
                border: '1px solid #2a2f3a',
                background: '#0f131b',
                color: '#e5e7eb',
                padding: '8px 12px',
                outline: 'none',
              }}
            />
            <select
              value={assignedSizeFilter}
              onChange={(event) => setAssignedSizeFilter(event.target.value)}
              style={{
                borderRadius: 10,
                border: '1px solid #2a2f3a',
                background: '#0f131b',
                color: '#e5e7eb',
                padding: '8px 12px',
                outline: 'none',
                minWidth: 160,
              }}
            >
              <option value="">All Sizes</option>
              {publicAccountSizes.map((size) => (
                <option key={`assigned-${size.value}`} value={size.value}>{size.label}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'ready' && (
          <div style={{ padding: '0 16px 12px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              type="search"
              value={readySearch}
              onChange={(event) => setReadySearch(event.target.value)}
              placeholder="Search ready account number"
              style={{
                width: 'min(320px, 100%)',
                borderRadius: 10,
                border: '1px solid #2a2f3a',
                background: '#0f131b',
                color: '#e5e7eb',
                padding: '8px 12px',
                outline: 'none',
              }}
            />
            <select
              value={readySizeFilter}
              onChange={(event) => setReadySizeFilter(event.target.value)}
              style={{
                borderRadius: 10,
                border: '1px solid #2a2f3a',
                background: '#0f131b',
                color: '#e5e7eb',
                padding: '8px 12px',
                outline: 'none',
                minWidth: 160,
              }}
            >
              <option value="">All Sizes</option>
              {publicAccountSizes.map((size) => (
                <option key={`ready-${size.value}`} value={size.value}>{size.label}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'awaiting-next-stage' && (
          <div style={{ padding: '0 16px 12px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select
              value={awaitingSizeFilter}
              onChange={(event) => setAwaitingSizeFilter(event.target.value)}
              style={{
                borderRadius: 10,
                border: '1px solid #2a2f3a',
                background: '#0f131b',
                color: '#e5e7eb',
                padding: '8px 12px',
                outline: 'none',
                minWidth: 160,
              }}
            >
              <option value="">All Sizes</option>
              {publicAccountSizes.map((size) => (
                <option key={`awaiting-${size.value}`} value={size.value}>{size.label}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'pending-assign' && (
          <div style={{ padding: '0 16px 12px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select
              value={pendingSizeFilter}
              onChange={(event) => setPendingSizeFilter(event.target.value)}
              style={{
                borderRadius: 10,
                border: '1px solid #2a2f3a',
                background: '#0f131b',
                color: '#e5e7eb',
                padding: '8px 12px',
                outline: 'none',
                minWidth: 160,
              }}
            >
              <option value="">All Sizes</option>
              {publicAccountSizes.map((size) => (
                <option key={`pending-${size.value}`} value={size.value}>{size.label}</option>
              ))}
            </select>
          </div>
        )}

        {loading && <p style={{ color: '#9ca3af', padding: '0 16px 16px' }}>Loading cTrader inventory...</p>}
        {!loading && error && <p style={{ color: '#fca5a5', padding: '0 16px 16px' }}>{error}</p>}

        {!loading && !error && activeTab === 'ready' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Broker</th>
                <th>Account Size</th>
                <th>Status</th>
                {(isSuperAdmin || canAssignMt5) && <th>Action</th>}
                {isSuperAdmin && <th>Delete</th>}
              </tr>
            </thead>
            <tbody>
              {filteredReadyAccounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.account_number}</td>
                  <td>{account.server}</td>
                  <td>{account.account_size}</td>
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
                  {(isSuperAdmin || canAssignMt5) && (
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAccount(account)
                          setFormError('')
                          setFormSuccess('')
                        }}
                        style={{
                          border: '1px solid #f59e0b',
                          background: 'rgba(245,158,11,0.12)',
                          color: '#fcd34d',
                          borderRadius: 10,
                          padding: '7px 10px',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Assign Stage
                      </button>
                    </td>
                  )}
                  {isSuperAdmin && (
                    <td>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAccount(account)}
                        disabled={deletingAccountId === account.id}
                        style={{
                          border: '1px solid rgba(239,68,68,0.5)',
                          background: 'rgba(239,68,68,0.12)',
                          color: '#fca5a5',
                          borderRadius: 10,
                          padding: '7px 10px',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: deletingAccountId === account.id ? 'not-allowed' : 'pointer',
                          opacity: deletingAccountId === account.id ? 0.7 : 1,
                        }}
                      >
                        {deletingAccountId === account.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && activeTab === 'assigned' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Assigned State</th>
                <th>Assigned By</th>
                <th>Assigned At</th>
                <th>User ID</th>
                <th>Account Number</th>
                <th>cTrader ID</th>
                <th>Account Size</th>
                {(isSuperAdmin || canAssignMt5) && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredAssignedAccounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <span
                      style={{
                        border: '1px solid rgba(245,158,11,0.5)',
                        background: 'rgba(245,158,11,0.16)',
                        color: '#fcd34d',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {account.status}
                    </span>
                  </td>
                  <td>{renderAssignedBy(account)}</td>
                  <td>{account.assigned_at ? new Date(account.assigned_at).toLocaleString() : '-'}</td>
                  <td>{account.assigned_user_id ?? '-'}</td>
                  <td>{account.account_number}</td>
                  <td>{account.server}</td>
                  <td>{account.account_size}</td>
                  {(isSuperAdmin || canAssignMt5) && (
                    <td>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAccount(account, true)}
                        disabled={deletingAccountId === account.id}
                        style={{
                          border: '1px solid rgba(239,68,68,0.5)',
                          background: 'rgba(239,68,68,0.12)',
                          color: '#fca5a5',
                          borderRadius: 10,
                          padding: '7px 10px',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: deletingAccountId === account.id ? 'not-allowed' : 'pointer',
                          opacity: deletingAccountId === account.id ? 0.7 : 1,
                        }}
                      >
                        {deletingAccountId === account.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && activeTab === 'awaiting-next-stage' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Challenge ID</th>
                <th>User</th>
                <th>Account Size</th>
                <th>Current Stage</th>
                <th>Account Number</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAwaitingNextStageAccounts.map((account) => (
                <tr key={account.challenge_id}>
                  <td>{account.challenge_id}</td>
                  <td>{account.trader_name || `User ${account.user_id}`}</td>
                  <td>{account.account_size}</td>
                  <td>{account.phase}</td>
                  <td>{account.mt5_account || '-'}</td>
                  <td>
                    <span
                      style={{
                        border: '1px solid rgba(168,85,247,0.5)',
                        background: 'rgba(168,85,247,0.16)',
                        color: '#c084fc',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Awaiting Next Stage
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && activeTab === 'pending-assign' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>User</th>
                <th>Email</th>
                <th>Account Size</th>
                <th>Amount</th>
                <th>Paid At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPendingAssignments.map((order) => (
                <tr key={order.id}>
                  <td>{order.provider_order_id}</td>
                  <td>{order.user.name}</td>
                  <td>{order.user.email}</td>
                  <td>{order.account_size}</td>
                  <td>{order.net_amount_formatted}</td>
                  <td>{new Date(order.paid_at || '').toLocaleDateString()}</td>
                  <td>
                    <span
                      style={{
                        border: '1px solid rgba(239,68,68,0.5)',
                        background: 'rgba(239,68,68,0.16)',
                        color: '#fca5a5',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {order.assignment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedAccount && (isSuperAdmin || canAssignMt5) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 60,
            padding: 16,
          }}
        >
          <div
            style={{
              width: 'min(100%, 500px)',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.15)',
              background: '#0f131b',
              padding: 16,
              color: '#fff',
              display: 'grid',
              gap: 10,
            }}
          >
            <h3 style={{ margin: 0, color: '#fff' }}>Assign Ready cTrader Account</h3>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 13 }}>
              Account <strong>{selectedAccount.account_number}</strong> ({selectedAccount.account_size})
            </p>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#d1d5db' }}>Assign To Stage</span>
              <select
                value={assignmentStage}
                onChange={(event) => setAssignmentStage(event.target.value as 'Phase 1' | 'Phase 2' | 'Funded')}
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: '#111827',
                  color: '#fff',
                  padding: '10px 12px',
                  outline: 'none',
                }}
              >
                <option value="Phase 1">Phase 1</option>
                <option value="Phase 2">Phase 2</option>
                <option value="Funded">Funded</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#d1d5db' }}>Assigned User Email</span>
              <input
                type="text"
                value={assignedUserEmailInput}
                onChange={(event) => setAssignedUserEmailInput(event.target.value)}
                placeholder="e.g trader@email.com"
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: '#111827',
                  color: '#fff',
                  padding: '10px 12px',
                  outline: 'none',
                }}
              />
            </label>

            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={useCustomChallengeId}
                    onChange={(event) => {
                      setUseCustomChallengeId(event.target.checked)
                      if (!event.target.checked && assignmentStage === 'Phase 1') {
                        void loadNextManualChallengeId()
                      } else if (!event.target.checked) {
                        setChallengeIdInput('')
                      }
                    }}
                    style={{ accentColor: '#f59e0b' }}
                  />
                  <span style={{ fontSize: 13, color: '#d1d5db' }}>Use custom Challenge ID</span>
                </label>
                {!useCustomChallengeId && assignmentStage === 'Phase 1' && (
                  <button
                    type="button"
                    onClick={() => void loadNextManualChallengeId()}
                    disabled={loadingChallengeId}
                    style={{
                      border: '1px solid #6b7280',
                      background: 'transparent',
                      color: '#d1d5db',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: loadingChallengeId ? 0.6 : 1,
                    }}
                  >
                    {loadingChallengeId ? 'Generating...' : 'Generate New'}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={challengeIdInput}
                onChange={(event) => setChallengeIdInput(event.target.value)}
                readOnly={!useCustomChallengeId && assignmentStage === 'Phase 1'}
                placeholder={
                  useCustomChallengeId
                    ? 'Enter custom challenge ID (e.g. CH-00012)'
                    : assignmentStage === 'Phase 1'
                    ? 'Auto-generated ID will appear here...'
                    : 'Enter existing challenge ID (e.g. CH-00012)'
                }
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: (!useCustomChallengeId && assignmentStage === 'Phase 1') ? '#0f172a' : '#111827',
                  color: '#fff',
                  padding: '10px 12px',
                  outline: 'none',
                  opacity: (!useCustomChallengeId && assignmentStage === 'Phase 1' && loadingChallengeId) ? 0.8 : 1,
                }}
              />
            </div>

            {formError && <p style={{ margin: 0, color: '#fca5a5', fontSize: 13 }}>{formError}</p>}
            {formSuccess && <p style={{ margin: 0, color: '#86efac', fontSize: 13 }}>{formSuccess}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={resetAssignModal}
                style={{
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '9px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignAccount}
                disabled={savingAssignment}
                style={{
                  border: '1px solid #22c55e',
                  background: '#22c55e',
                  color: '#052e16',
                  borderRadius: 10,
                  padding: '9px 12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  opacity: savingAssignment ? 0.75 : 1,
                }}
              >
                {savingAssignment ? 'Assigning...' : 'Confirm Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default CTraderPage

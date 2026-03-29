import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createSalaryStaff,
  deleteSalaryStaff,
  disburseSalaries,
  fetchSalaryBanks,
  fetchSalaryStaff,
  previewSalaryDisbursement,
  resolveSalaryAccountName,
  sendSalaryDisbursementOtp,
  updateSalaryStaff,
  type SalaryBank,
  type SalaryDisbursementPreview,
  type SalaryDisbursementResponse,
  type SalaryStaff,
} from '../lib/adminApi'
import './SalaryPage.css'

type SalaryTab = 'add' | 'list' | 'profitSplit'

type ProfitSplitHistoryItem = {
  id: number
  created_at: string
  total_amount: number
  admin_one_amount: number
  admin_two_amount: number
  status: 'Completed' | 'Pending'
}

const SalaryPage = () => {
  const [activeTab, setActiveTab] = useState<SalaryTab>('add')
  const [banks, setBanks] = useState<SalaryBank[]>([])
  const [staffList, setStaffList] = useState<SalaryStaff[]>([])
  const [totalSalary, setTotalSalary] = useState(0)
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [listError, setListError] = useState('')
  const [selectedBankCode, setSelectedBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [resolving, setResolving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [otpModalOpen, setOtpModalOpen] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpFeedback, setOtpFeedback] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpSubmitting, setOtpSubmitting] = useState(false)
  const [preview, setPreview] = useState<SalaryDisbursementPreview | null>(null)
  const [disbursementResult, setDisbursementResult] = useState<SalaryDisbursementResponse | null>(null)
  const [profitAmount, setProfitAmount] = useState('')
  const [profitSplitHistory, setProfitSplitHistory] = useState<ProfitSplitHistoryItem[]>([
    {
      id: 1,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      total_amount: 200000,
      admin_one_amount: 100000,
      admin_two_amount: 100000,
      status: 'Completed',
    },
    {
      id: 2,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      total_amount: 150000,
      admin_one_amount: 75000,
      admin_two_amount: 75000,
      status: 'Completed',
    },
  ])

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.bank_code === selectedBankCode) || null,
    [banks, selectedBankCode],
  )

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const data = await fetchSalaryBanks()
        setBanks(data.banks)
      } catch (error) {
        console.error('Failed to load salary banks', error)
      }
    }

    void loadBanks()
  }, [])

  const loadStaff = async () => {
    try {
      setLoadingStaff(true)
      setListError('')
      const data = await fetchSalaryStaff()
      setStaffList(data.staff)
      setTotalSalary(data.total_salary)
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Failed to load salary staff')
    } finally {
      setLoadingStaff(false)
    }
  }

  useEffect(() => {
    void loadStaff()
  }, [])

  const handleResolveAccount = useCallback(async () => {
    if (!selectedBankCode || accountNumber.length !== 10) {
      setFormError('Select bank and enter a 10-digit account number before verification.')
      return
    }

    setResolving(true)
    setFormError('')
    try {
      const result = await resolveSalaryAccountName({
        bank_code: selectedBankCode,
        bank_account_number: accountNumber,
      })
      setAccountName(result.account_name)
    } catch (error) {
      setAccountName('')
      setFormError(error instanceof Error ? error.message : 'Failed to resolve account name')
    } finally {
      setResolving(false)
    }
  }, [accountNumber, selectedBankCode])

  useEffect(() => {
    if (selectedBankCode && accountNumber.length === 10 && !accountName) {
      void handleResolveAccount()
    }
  }, [accountName, accountNumber, handleResolveAccount, selectedBankCode])

  const resetForm = () => {
    setSelectedBankCode('')
    setAccountNumber('')
    setAccountName('')
    setSalaryAmount('')
  }

  const handleCreateStaff = async () => {
    if (!selectedBankCode || accountNumber.length !== 10 || !accountName) {
      setFormError('Complete bank selection, account number, and account name verification.')
      return
    }

    const amountValue = Number(salaryAmount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFormError('Enter a valid salary amount.')
      return
    }

    setSaving(true)
    setFormError('')
    setFormSuccess('')
    try {
      await createSalaryStaff({
        bank_code: selectedBankCode,
        bank_account_number: accountNumber,
        staff_name: accountName,
        salary_amount: amountValue,
      })
      setFormSuccess('Staff salary saved successfully.')
      resetForm()
      await loadStaff()
      setActiveTab('list')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create staff salary')
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (staff: SalaryStaff) => {
    setEditingId(staff.id)
    setEditName(staff.staff_name)
    setEditAmount(String(staff.salary_amount))
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName('')
    setEditAmount('')
  }

  const submitEdit = async (staffId: number) => {
    const amountValue = Number(editAmount)
    if (!editName.trim() || !Number.isFinite(amountValue) || amountValue <= 0) {
      setListError('Provide a valid staff name and salary amount.')
      return
    }

    try {
      setListError('')
      await updateSalaryStaff(staffId, { staff_name: editName.trim(), salary_amount: amountValue })
      await loadStaff()
      cancelEditing()
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Failed to update staff salary')
    }
  }

  const handleDelete = async (staffId: number) => {
    if (!window.confirm('Delete this staff salary entry?')) return
    try {
      await deleteSalaryStaff(staffId)
      await loadStaff()
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Failed to delete staff salary')
    }
  }

  const openOtpModal = async () => {
    try {
      setOtpModalOpen(true)
      setOtpError('')
      setOtpFeedback('')
      setOtpCode('')
      setDisbursementResult(null)
      const data = await previewSalaryDisbursement()
      setPreview(data)
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Failed to load disbursement preview')
    }
  }

  const handleSendOtp = async () => {
    try {
      setOtpSending(true)
      setOtpError('')
      setOtpFeedback('')
      const response = await sendSalaryDisbursementOtp()
      setOtpFeedback(response.message || 'OTP sent. Check your admin email.')
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Failed to send OTP')
    } finally {
      setOtpSending(false)
    }
  }

  const handleDisburse = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError('OTP must be 6 digits')
      return
    }

    try {
      setOtpSubmitting(true)
      setOtpError('')
      const result = await disburseSalaries()
      setDisbursementResult(result)
      await loadStaff()
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Failed to disburse salaries')
    } finally {
      setOtpSubmitting(false)
    }
  }

  const parsedProfitAmount = Number(profitAmount)
  const isProfitAmountValid = Number.isFinite(parsedProfitAmount) && parsedProfitAmount > 0
  const adminSplitAmount = isProfitAmountValid ? parsedProfitAmount / 2 : 0

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`

  const handleProfitWithdraw = () => {
    if (!isProfitAmountValid) {
      setFormError('Enter a valid amount for admin profit split.')
      return
    }

    setFormError('')
    const newEntry: ProfitSplitHistoryItem = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      total_amount: parsedProfitAmount,
      admin_one_amount: adminSplitAmount,
      admin_two_amount: adminSplitAmount,
      status: 'Pending',
    }
    setProfitSplitHistory((prev) => [newEntry, ...prev])
    setProfitAmount('')
  }

  return (
    <section className="admin-page-stack salary-page">
      <div className="admin-dashboard-card">
        <h2>Salary Management</h2>
        <p>Verify staff bank accounts, configure salary amounts, and disburse payments in bulk.</p>
      </div>

      <div className="admin-dashboard-card salary-tabs">
        <button type="button" className={activeTab === 'add' ? 'active' : ''} onClick={() => setActiveTab('add')}>
          Add Staff
        </button>
        <button type="button" className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>
          Staff List
        </button>
        <button
          type="button"
          className={activeTab === 'profitSplit' ? 'active' : ''}
          onClick={() => setActiveTab('profitSplit')}
        >
          Admin Profit Split
        </button>
      </div>

      {activeTab === 'add' && (
        <div className="admin-dashboard-card salary-form-card">
          <h3>Add Staff Salary</h3>
          <div className="salary-form-grid">
            <label>
              Bank
              <select
                value={selectedBankCode}
                onChange={(event) => {
                  setSelectedBankCode(event.target.value)
                  setAccountName('')
                  if (formError) setFormError('')
                }}
              >
                <option value="">Select bank</option>
                {banks.map((bank) => (
                  <option key={bank.bank_code} value={bank.bank_code}>{bank.bank_name}</option>
                ))}
              </select>
            </label>
            <label>
              Account Number
              <input
                type="text"
                value={accountNumber}
                maxLength={10}
                onChange={(event) => {
                  setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))
                  if (formError) setFormError('')
                }}
                placeholder="10-digit account number"
              />
            </label>
            <label>
              Account Name
              <input type="text" value={accountName} readOnly placeholder="Verified account name" />
            </label>
            <label>
              Salary Amount ($)
              <input
                type="number"
                value={salaryAmount}
                onChange={(event) => setSalaryAmount(event.target.value)}
                placeholder="e.g. 50000"
              />
            </label>
          </div>
          {resolving && <p className="salary-helper">Verifying account name for {selectedBank?.bank_name || 'bank'}...</p>}
          {formError && <p className="salary-error">{formError}</p>}
          {formSuccess && <p className="salary-success">{formSuccess}</p>}
          <div className="salary-form-actions">
            <button type="button" onClick={handleResolveAccount} disabled={resolving || !selectedBankCode}>
              {resolving ? 'Verifying...' : 'Verify Account'}
            </button>
            <button type="button" className="primary" onClick={handleCreateStaff} disabled={saving}>
              {saving ? 'Saving...' : 'Save Staff Salary'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="admin-dashboard-card salary-list-card">
          <div className="salary-list-header">
            <div>
              <h3>Staff Salaries</h3>
              <p>Total monthly payroll: ${totalSalary.toLocaleString()}</p>
            </div>
            <button type="button" className="primary" onClick={openOtpModal}>
              Disburse Salary
            </button>
          </div>
          {loadingStaff && <p>Loading staff salaries...</p>}
          {listError && <p className="salary-error">{listError}</p>}
          {!loadingStaff && staffList.length === 0 && <p>No staff salaries added yet.</p>}
          {!loadingStaff && staffList.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Bank</th>
                  <th>Account Number</th>
                  <th>Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.id}>
                    <td>
                      {editingId === staff.id ? (
                        <input value={editName} onChange={(event) => setEditName(event.target.value)} />
                      ) : (
                        staff.staff_name
                      )}
                    </td>
                    <td>{staff.bank_name}</td>
                    <td>{staff.bank_account_number}</td>
                    <td>
                      {editingId === staff.id ? (
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(event) => setEditAmount(event.target.value)}
                        />
                      ) : (
                        `$${staff.salary_amount.toLocaleString()}`
                      )}
                    </td>
                    <td>
                      {editingId === staff.id ? (
                        <div className="salary-actions">
                          <button type="button" onClick={() => submitEdit(staff.id)}>Save</button>
                          <button type="button" className="ghost" onClick={cancelEditing}>Cancel</button>
                        </div>
                      ) : (
                        <div className="salary-actions">
                          <button type="button" onClick={() => startEditing(staff)}>Edit</button>
                          <button type="button" className="danger" onClick={() => handleDelete(staff.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'profitSplit' && (
        <div className="admin-dashboard-card salary-split-card">
          <h3>Admin Profit Split</h3>
          <p className="salary-helper">Split withdrawals evenly between Admin 1 and Admin 2 (50/50).</p>

          <div className="salary-split-grid">
            <label>
              Amount ($)
              <input
                type="number"
                value={profitAmount}
                onChange={(event) => {
                  setProfitAmount(event.target.value)
                  if (formError) setFormError('')
                }}
                placeholder="Enter amount"
              />
            </label>
            <label>
              Admin 1 Split (50%)
              <input value={isProfitAmountValid ? formatCurrency(adminSplitAmount) : '$0'} readOnly />
            </label>
            <label>
              Admin 2 Split (50%)
              <input value={isProfitAmountValid ? formatCurrency(adminSplitAmount) : '$0'} readOnly />
            </label>
          </div>

          {formError && <p className="salary-error">{formError}</p>}

          <div className="salary-form-actions">
            <button type="button" className="primary" onClick={handleProfitWithdraw}>
              Withdraw
            </button>
          </div>

          <div className="salary-history">
            <div className="salary-history-header">
              <h4>Previous Withdrawals</h4>
              <p>History of admin profit split withdrawals.</p>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Admin 1 (50%)</th>
                  <th>Admin 2 (50%)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {profitSplitHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.created_at).toLocaleDateString()}</td>
                    <td>{formatCurrency(entry.total_amount)}</td>
                    <td>{formatCurrency(entry.admin_one_amount)}</td>
                    <td>{formatCurrency(entry.admin_two_amount)}</td>
                    <td>{entry.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {otpModalOpen && (
        <div className="salary-modal-backdrop" onClick={() => setOtpModalOpen(false)}>
          <div className="salary-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Disburse Salaries</h3>
            {preview && (
              <p className="salary-warning">
                You are about to pay a total of ${preview.summary.total_amount.toLocaleString()} to {preview.summary.total_staff} staff.
              </p>
            )}
            <label>
              OTP Code (Super Admin)
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
              />
            </label>
            {otpError && <p className="salary-error">{otpError}</p>}
            {otpFeedback && <p className="salary-success">{otpFeedback}</p>}
            <div className="salary-modal-actions">
              <button type="button" onClick={handleSendOtp} disabled={otpSending}>
                {otpSending ? 'Sending...' : 'Send OTP'}
              </button>
              <button type="button" className="primary" onClick={handleDisburse} disabled={otpSubmitting}>
                {otpSubmitting ? 'Disbursing...' : 'Confirm Disbursement'}
              </button>
              <button type="button" className="ghost" onClick={() => setOtpModalOpen(false)}>
                Close
              </button>
            </div>

            {disbursementResult && (
              <div className="salary-disbursement-results">
                <h4>Disbursement Results</h4>
                <ul>
                  {disbursementResult.transfers.map((transfer: SalaryDisbursementResponse['transfers'][number]) => (
                    <li key={transfer.staff_id} className={transfer.status === 'success' ? 'success' : 'failed'}>
                      <strong>{transfer.staff_name}</strong> — ${transfer.amount.toLocaleString()} ({transfer.status})
                      {transfer.reference && <span> • Ref: {transfer.reference}</span>}
                      {transfer.message && <span> • {transfer.message}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default SalaryPage
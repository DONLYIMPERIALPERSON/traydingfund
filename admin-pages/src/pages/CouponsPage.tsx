import { useEffect, useMemo, useState } from 'react'
import {
  createAdminCoupon,
  deleteAdminCoupon,
  fetchAdminChallengeConfig,
  fetchAdminCoupons,
  toggleAdminCouponChallengeType,
  toggleAdminCouponPlan,
  updateAdminCouponStatus,
  type AdminCoupon,
  type ChallengePlanConfig,
} from '../lib/adminApi'
import './CouponsPage.css'

type CouponStatus = 'Active' | 'Expired'
type CouponValidation = 'Expiry Date' | 'Usage Limit'

const CouponsPage = () => {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [plans, setPlans] = useState<ChallengePlanConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [validationType, setValidationType] = useState<CouponValidation>('Expiry Date')
  const [expiresOn, setExpiresOn] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [applyAllPlans, setApplyAllPlans] = useState(true)
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([])
  const [applyAllChallengeTypes, setApplyAllChallengeTypes] = useState(true)
  const [selectedChallengeTypes, setSelectedChallengeTypes] = useState<string[]>([])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [couponRes, challengeConfigRes] = await Promise.all([
        fetchAdminCoupons(),
        fetchAdminChallengeConfig(),
      ])
      setCoupons(Array.isArray(couponRes.coupons) ? couponRes.coupons : [])
      setPlans(Array.isArray(challengeConfigRes.plans) ? challengeConfigRes.plans : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const getCouponStatus = (coupon: AdminCoupon): CouponStatus => {
    if (!coupon?.is_active) return 'Expired'
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) return 'Expired'
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return 'Expired'
    return 'Active'
  }

  const formatDiscount = (coupon: AdminCoupon): string => {
    const value = Number(coupon?.discount_value ?? 0)
    if (!Number.isFinite(value)) {
      return '—'
    }
    if (coupon.discount_type === 'percent') {
      return `${value}%`
    }
    return `$${value.toLocaleString()}`
  }

  const safeCoupons = useMemo(() => (
    Array.isArray(coupons)
      ? coupons.filter((coupon): coupon is AdminCoupon => Boolean(coupon))
      : []
  ), [coupons])
  const activeCount = useMemo(() => safeCoupons.filter((c) => getCouponStatus(c) === 'Active').length, [safeCoupons])
  const expiredCount = useMemo(() => safeCoupons.filter((c) => getCouponStatus(c) === 'Expired').length, [safeCoupons])

  const createCoupon = async () => {
    if (!code.trim() || !discountValue.trim()) return
    if (validationType === 'Expiry Date' && !expiresOn.trim()) return
    if (validationType === 'Usage Limit' && (!maxUses.trim() || Number(maxUses) <= 0)) return
    if (!applyAllPlans && selectedPlanIds.length === 0) return
    if (!applyAllChallengeTypes && selectedChallengeTypes.length === 0) return

    setSubmitting(true)
    setError('')

    try {
      const created = await createAdminCoupon({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_uses: validationType === 'Usage Limit' ? Number(maxUses) : null,
        expires_at: validationType === 'Expiry Date' ? `${expiresOn}T23:59:59Z` : null,
        apply_all_plans: applyAllPlans,
        applicable_plan_ids: applyAllPlans ? [] : selectedPlanIds,
        apply_all_challenge_types: applyAllChallengeTypes,
        applicable_challenge_types: applyAllChallengeTypes ? [] : selectedChallengeTypes,
      })

      setCoupons((prev) => [created, ...(Array.isArray(prev) ? prev : [])])
      setCode('')
      setDiscountType('percent')
      setDiscountValue('')
      setValidationType('Expiry Date')
      setExpiresOn('')
      setMaxUses('')
      setApplyAllPlans(true)
      setSelectedPlanIds([])
      setApplyAllChallengeTypes(true)
      setSelectedChallengeTypes([])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create coupon')
    } finally {
      setSubmitting(false)
    }
  }

  const togglePlanSelection = (planId: string) => {
    setSelectedPlanIds((prev) => (
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    ))
  }

  const toggleChallengeTypeSelection = (challengeType: string) => {
    setSelectedChallengeTypes((prev) => (
      prev.includes(challengeType)
        ? prev.filter((type) => type !== challengeType)
        : [...prev, challengeType]
    ))
  }

  const toggleCouponStatus = async (coupon: AdminCoupon) => {
    try {
      const updated = await updateAdminCouponStatus(coupon.id, !coupon.is_active)
      setCoupons((prev) => prev.map((item) => (item.id === coupon.id ? updated : item)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update coupon status')
    }
  }

  const handleDeleteCoupon = async (coupon: AdminCoupon) => {
    const confirmed = window.confirm(`Delete coupon ${coupon.code ?? ''}? This cannot be undone.`)
    if (!confirmed) return
    try {
      await deleteAdminCoupon(coupon.id)
      setCoupons((prev) => (Array.isArray(prev) ? prev.filter((item) => item.id !== coupon.id) : []))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete coupon')
    }
  }

  const isPlanEnabledForCoupon = (coupon: AdminCoupon, planId: string) => {
    if (coupon.applies_to_all_plans) return true
    const planIds = Array.isArray(coupon.applicable_plan_ids) ? coupon.applicable_plan_ids : []
    return planIds.includes(planId)
  }

  const toggleCouponPlan = async (coupon: AdminCoupon, planId: string) => {
    try {
      const nextEnabled = !isPlanEnabledForCoupon(coupon, planId)
      const updated = await toggleAdminCouponPlan(coupon.id, { plan_id: planId, enabled: nextEnabled })
      setCoupons((prev) => prev.map((item) => (item.id === coupon.id ? updated : item)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle coupon account size')
    }
  }

  const isChallengeTypeEnabledForCoupon = (coupon: AdminCoupon, challengeType: string) => {
    if (coupon.applies_to_all_challenge_types) return true
    const types = Array.isArray(coupon.applicable_challenge_types) ? coupon.applicable_challenge_types : []
    return types.includes(challengeType)
  }

  const toggleCouponChallengeType = async (coupon: AdminCoupon, challengeType: string) => {
    try {
      const nextEnabled = !isChallengeTypeEnabledForCoupon(coupon, challengeType)
      const updated = await toggleAdminCouponChallengeType(coupon.id, { challenge_type: challengeType, enabled: nextEnabled })
      setCoupons((prev) => prev.map((item) => (item.id === coupon.id ? updated : item)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle coupon challenge type')
    }
  }

  const fallbackPlans = useMemo<ChallengePlanConfig[]>(() => ([
    { id: '2k', name: '$2K', account_size: '$2K', currency: 'USD', challenge_type: 'two_step' },
    { id: '10k', name: '$10K', account_size: '$10K', currency: 'USD', challenge_type: 'two_step' },
    { id: '30k', name: '$30K', account_size: '$30K', currency: 'USD', challenge_type: 'two_step' },
    { id: '50k', name: '$50K', account_size: '$50K', currency: 'USD', challenge_type: 'two_step' },
    { id: '100k', name: '$100K', account_size: '$100K', currency: 'USD', challenge_type: 'two_step' },
    { id: '200k', name: '$200K', account_size: '$200K', currency: 'USD', challenge_type: 'two_step' },
    { id: '200000', name: '₦200,000', account_size: '₦200,000', currency: 'NGN', challenge_type: 'ngn_standard' },
    { id: '500000', name: '₦500,000', account_size: '₦500,000', currency: 'NGN', challenge_type: 'ngn_standard' },
    { id: '800000', name: '₦800,000', account_size: '₦800,000', currency: 'NGN', challenge_type: 'ngn_standard' },
  ]), [])

  const planList = useMemo(() => {
    const normalized = Array.isArray(plans)
      ? plans.filter((plan): plan is ChallengePlanConfig =>
        Boolean(plan && typeof (plan as ChallengePlanConfig).id === 'string'))
      : []
    return normalized.length ? normalized : fallbackPlans
  }, [plans, fallbackPlans])

  const challengeTypes = useMemo(() => {
    const fromPlans = planList
      .map((plan) => plan.challenge_type)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase())

    const fallbackTypes = ['one_step', 'two_step', 'instant_funded', 'ngn']
    return Array.from(new Set([...fromPlans, ...fallbackTypes])).filter(Boolean)
  }, [planList])

  return (
    <section className="admin-page-stack coupons-page">
      <div className="admin-dashboard-card">
        <h2>Coupons</h2>
        <p>Create coupon codes, control eligible account sizes, and apply discounts at checkout.</p>
        {error && <p style={{ color: '#fca5a5', marginTop: 8 }}>{error}</p>}
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Total Coupons</h3>
          <strong>{safeCoupons.length}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Active Coupons</h3>
          <strong>{activeCount}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Expired Coupons</h3>
          <strong>{expiredCount}</strong>
        </article>
      </div>

      <div className="admin-dashboard-card coupon-create-card">
        <h3>Create Coupon</h3>
        <div className="coupon-create-grid">
          <label>
            Coupon Code
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. EASTER20" />
          </label>
          <label>
            Discount
            <div className="coupon-inline-controls">
              <select value={discountType} onChange={(event) => setDiscountType(event.target.value as 'percent' | 'fixed')}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
              <input
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                placeholder={discountType === 'percent' ? 'e.g. 20' : 'e.g. 25000'}
              />
            </div>
          </label>
          <label>
            Validation Type
            <select value={validationType} onChange={(event) => setValidationType(event.target.value as CouponValidation)}>
              <option value="Expiry Date">Expiry Date</option>
              <option value="Usage Limit">Usage Limit</option>
            </select>
          </label>
          {validationType === 'Expiry Date' ? (
            <label>
              Expiry Date
              <input type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
            </label>
          ) : (
            <label>
              Max Uses
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(event) => setMaxUses(event.target.value)}
                placeholder="e.g. 50"
              />
            </label>
          )}
        </div>

        <div className="coupon-plan-scope">
          <label className="coupon-scope-check">
            <input
              type="checkbox"
              checked={applyAllPlans}
              onChange={(event) => setApplyAllPlans(event.target.checked)}
            />
            Apply to all account sizes
          </label>
          {!applyAllPlans && (
            <div className="coupon-plan-toggle-list">
              {planList.length ? (
                planList.map((plan) => (
                  <label key={plan.id} className="coupon-plan-toggle-item">
                    <input
                      type="checkbox"
                      checked={selectedPlanIds.includes(plan.id)}
                      onChange={() => togglePlanSelection(plan.id)}
                    />
                    {plan.name ?? plan.id}
                  </label>
                ))
              ) : (
                <span className="coupon-scope-empty">No account sizes available yet.</span>
              )}
            </div>
          )}
        </div>

        <div className="coupon-plan-scope">
          <label className="coupon-scope-check">
            <input
              type="checkbox"
              checked={applyAllChallengeTypes}
              onChange={(event) => setApplyAllChallengeTypes(event.target.checked)}
            />
            Apply to all challenge types
          </label>
          {!applyAllChallengeTypes && (
            <div className="coupon-plan-toggle-list">
              {challengeTypes.length ? (
                challengeTypes.map((type) => (
                  <label key={type} className="coupon-plan-toggle-item">
                    <input
                      type="checkbox"
                      checked={selectedChallengeTypes.includes(type)}
                      onChange={() => toggleChallengeTypeSelection(type)}
                    />
                    {type.replace(/_/g, ' ')}
                  </label>
                ))
              ) : (
                <span className="coupon-scope-empty">No challenge types available yet.</span>
              )}
            </div>
          )}
        </div>

        <button type="button" className="coupon-create-btn" onClick={createCoupon} disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Coupon'}
        </button>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <p>Loading coupons...</p>
        ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Type</th>
              <th>Expires On</th>
              <th>Max Uses</th>
              <th>Usage</th>
              <th>Account Sizes</th>
              <th>Challenge Types</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeCoupons.map((coupon) => (
              (() => {
                const status = getCouponStatus(coupon)
                return (
              <tr key={coupon.code ?? String(coupon.id)}>
                <td>{coupon.code ?? '—'}</td>
                <td>{formatDiscount(coupon)}</td>
                <td>{coupon.discount_type === 'percent' ? 'Percent' : 'Fixed'}</td>
                <td>{coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : '—'}</td>
                <td>{coupon.max_uses ?? '—'}</td>
                <td>{coupon.used_count} / {coupon.max_uses ?? '∞'}</td>
                <td>
                  <div className="coupon-plan-toggle-list coupon-plan-toggle-list-inline">
                    {planList.map((plan) => (
                      <label key={`${coupon.id}-${plan.id}`} className="coupon-plan-toggle-item">
                        <input
                          type="checkbox"
                          checked={isPlanEnabledForCoupon(coupon, plan.id)}
                          onChange={() => toggleCouponPlan(coupon, plan.id)}
                        />
                        {plan.id}
                      </label>
                    ))}
                    {!planList.length && (
                      <span className="coupon-scope-empty">No sizes</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="coupon-plan-toggle-list coupon-plan-toggle-list-inline">
                    {challengeTypes.map((type) => (
                      <label key={`${coupon.id}-${type}`} className="coupon-plan-toggle-item">
                        <input
                          type="checkbox"
                          checked={isChallengeTypeEnabledForCoupon(coupon, type)}
                          onChange={() => toggleCouponChallengeType(coupon, type)}
                        />
                        {type.replace(/_/g, ' ')}
                      </label>
                    ))}
                    {!challengeTypes.length && (
                      <span className="coupon-scope-empty">No types</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`coupon-status ${status === 'Active' ? 'active' : 'expired'}`}>
                    {status}
                  </span>
                </td>
                <td>
                  <div className="coupon-action-stack">
                    {status === 'Expired' ? (
                      <button type="button" className="coupon-action-btn reactivate" onClick={() => void toggleCouponStatus(coupon)}>
                        Activate
                      </button>
                    ) : (
                      <button type="button" className="coupon-action-btn expire" onClick={() => void toggleCouponStatus(coupon)}>
                        Deactivate
                      </button>
                    )}
                    <button type="button" className="coupon-action-btn delete" onClick={() => void handleDeleteCoupon(coupon)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
                )
              })()
            ))}
          </tbody>
        </table>
        )}
      </div>
    </section>
  )
}

export default CouponsPage

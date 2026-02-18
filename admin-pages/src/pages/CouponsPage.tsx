import { useMemo, useState } from 'react'
import './CouponsPage.css'

type CouponStatus = 'Active' | 'Expired'
type CouponValidation = 'Expiry Date' | 'Usage Limit'

type Coupon = {
  code: string
  discount: string
  validationType: CouponValidation
  expiresOn?: string
  maxUses?: number
  used: number
  status: CouponStatus
}

const initialCoupons: Coupon[] = [
  { code: 'WELCOME10', discount: '10%', validationType: 'Expiry Date', expiresOn: '2026-03-30', maxUses: 500, used: 182, status: 'Active' },
  { code: 'NAIRA50K', discount: '₦50,000', validationType: 'Usage Limit', maxUses: 420, used: 420, status: 'Expired' },
  { code: 'MARCHBOOST', discount: '15%', validationType: 'Expiry Date', expiresOn: '2026-03-15', maxUses: 300, used: 51, status: 'Active' },
]

const CouponsPage = () => {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState('')
  const [validationType, setValidationType] = useState<CouponValidation>('Expiry Date')
  const [expiresOn, setExpiresOn] = useState('')
  const [maxUses, setMaxUses] = useState('')

  const getCouponStatus = (coupon: Coupon): CouponStatus => {
    if (coupon.validationType === 'Usage Limit' && coupon.maxUses && coupon.used >= coupon.maxUses) {
      return 'Expired'
    }

    return coupon.status
  }

  const activeCount = useMemo(() => coupons.filter((c) => getCouponStatus(c) === 'Active').length, [coupons])
  const expiredCount = useMemo(() => coupons.filter((c) => getCouponStatus(c) === 'Expired').length, [coupons])

  const createCoupon = () => {
    if (!code.trim() || !discount.trim()) return
    if (validationType === 'Expiry Date' && !expiresOn.trim()) return
    if (validationType === 'Usage Limit' && (!maxUses.trim() || Number(maxUses) <= 0)) return

    const newCoupon: Coupon = {
      code: code.trim().toUpperCase(),
      discount: discount.trim(),
      validationType,
      expiresOn: validationType === 'Expiry Date' ? expiresOn : undefined,
      maxUses: validationType === 'Usage Limit' ? Number(maxUses) : 500,
      used: 0,
      status: 'Active',
    }

    setCoupons((prev) => [newCoupon, ...prev])
    setCode('')
    setDiscount('')
    setValidationType('Expiry Date')
    setExpiresOn('')
    setMaxUses('')
  }

  const reactivateCoupon = (couponCode: string) => {
    setCoupons((prev) =>
      prev.map((coupon) =>
        coupon.code === couponCode
          ? {
              ...coupon,
              status: 'Active',
              expiresOn: coupon.validationType === 'Expiry Date' ? '2026-12-31' : coupon.expiresOn,
              used: coupon.validationType === 'Usage Limit' ? 0 : coupon.used,
            }
          : coupon,
      ),
    )
  }

  const expireCoupon = (couponCode: string) => {
    setCoupons((prev) =>
      prev.map((coupon) => (coupon.code === couponCode ? { ...coupon, status: 'Expired' } : coupon)),
    )
  }

  return (
    <section className="admin-page-stack coupons-page">
      <div className="admin-dashboard-card">
        <h2>Coupons</h2>
        <p>Create coupon codes, view active/expired coupons, and reactivate when needed.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Total Coupons</h3>
          <strong>{coupons.length}</strong>
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
            <input value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="e.g. 20% or ₦25,000" />
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
        <button type="button" className="coupon-create-btn" onClick={createCoupon}>Create Coupon</button>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Validation</th>
              <th>Expires On</th>
              <th>Max Uses</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              (() => {
                const status = getCouponStatus(coupon)
                return (
              <tr key={coupon.code}>
                <td>{coupon.code}</td>
                <td>{coupon.discount}</td>
                <td>{coupon.validationType}</td>
                <td>{coupon.expiresOn ?? '—'}</td>
                <td>{coupon.maxUses ?? '—'}</td>
                <td>{coupon.used} / {coupon.maxUses ?? '∞'}</td>
                <td>
                  <span className={`coupon-status ${status === 'Active' ? 'active' : 'expired'}`}>
                    {status}
                  </span>
                </td>
                <td>
                  {status === 'Expired' ? (
                    <button type="button" className="coupon-action-btn reactivate" onClick={() => reactivateCoupon(coupon.code)}>
                      Reactivate
                    </button>
                  ) : (
                    <button type="button" className="coupon-action-btn expire" onClick={() => expireCoupon(coupon.code)}>
                      Expire
                    </button>
                  )}
                </td>
              </tr>
                )
              })()
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default CouponsPage

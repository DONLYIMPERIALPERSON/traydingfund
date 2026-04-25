import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import {
  downloadBreachReport,
  fetchUserChallengeAccountDetail,
  fetchUserChallengeAccounts,
  type UserChallengeAccountListItem,
} from '../lib/traderAuth'
import '../styles/MobileOverviewPage.css'

const HIDDEN_BREACHED_ACCOUNTS_KEY = 'trader_area_hidden_breached_accounts'

const bottomNavItems = [
  { label: 'Accounts', icon: 'fa-wallet', href: '/mobile-overview' },
  { label: 'Rewards', icon: 'fa-gift', href: '/payout' },
  { label: 'Calendar', icon: 'fa-calendar-alt', href: '/economic-calendar' },
  { label: 'Affiliate', icon: 'fa-users', href: '/affiliate' },
  { label: 'Profile', icon: 'fa-user', href: '/profile' },
]

const quickActionItems = [
  { label: 'Start Challenge', icon: 'fa-plus', href: '/trading-accounts' },
  { label: 'History', icon: 'fa-clock-rotate-left', href: '/mobile-history' },
  { label: 'Orders', icon: 'fa-receipt', href: '/orders' },
  { label: 'Certificates', icon: 'fa-certificate', href: '/certificates' },
  { label: 'Settings', icon: 'fa-gear', href: '/settings' },
  { label: 'KYC', icon: 'fa-id-card', href: '/kyc' },
  { label: 'Support', icon: 'fa-headset', href: '/support' },
  { label: 'Contact', icon: 'fa-envelope', href: '/contact' },
  { label: 'More', icon: 'fa-ellipsis', href: '#' },
]

const formatChallengeType = (value?: string) => {
  if (!value) return 'Challenge'
  const normalized = value.replace(/-/g, '_').toLowerCase()
  switch (normalized) {
    case 'two_step':
    case 'challenge':
      return '2 Step Challenge'
    case 'one_step':
      return '1 Step Challenge'
    case 'instant_funded':
      return 'Instant Funded'
    case 'funded':
      return 'Funded'
    case 'assigned_pending_access':
      return '2 Step Challenge'
    default:
      return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }
}

const formatPhase = (value?: string) => {
  if (!value) return ''
  const normalized = value.replace(/-/g, '_').toLowerCase()
  if (normalized === 'phase_1' || normalized === 'phase1') return 'Phase 1'
  if (normalized === 'phase_2' || normalized === 'phase2') return 'Phase 2'
  if (normalized === 'funded') return 'Funded'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatAmount = (amount: string, currency?: string) => {
  if (!currency) return amount
  const numeric = Number(amount.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(numeric)) return amount

  try {
    if (currency.toUpperCase() === 'NGN') {
      return `₦${numeric.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numeric)
  } catch {
    return amount
  }
}

const getStatusTone = (status: string) => {
  switch (status) {
    case 'Active':
      return 'is-success'
    case 'Passed':
      return 'is-success'
    case 'Ready':
      return 'is-warning'
    case 'Failed':
      return 'is-danger'
    default:
      return 'is-neutral'
  }
}

const formatPlatform = (value?: string) => {
  const normalized = value?.toLowerCase()
  if (normalized === 'mt5') return 'MT5'
  if (normalized === 'ctrader') return 'cTrader'
  if (!value) return 'Platform'
  return value.replace(/\b\w/g, (char) => char.toUpperCase())
}

const isHideEligibleAccount = (account: UserChallengeAccountListItem) => {
  const normalizedStatus = String(account.display_status ?? account.objective_status ?? '').trim().toLowerCase()
  return normalizedStatus !== 'active' && normalizedStatus !== 'awaiting reset'
}

type SlideCardProps = {
  account: UserChallengeAccountListItem
  onHideBreached?: (challengeId: string) => void
}

const SlideCard: React.FC<SlideCardProps> = ({ account, onHideBreached }) => {
  const navigate = useNavigate()
  const isBreachedAccount = ['breached', 'failed'].includes(String(account.objective_status ?? account.display_status ?? '').toLowerCase())
  const isHideEligible = isHideEligibleAccount(account)

  const handleOpenOverview = () => {
    navigate(`/account-overview?challenge_id=${encodeURIComponent(account.challenge_id)}`)
  }

  const handleOpenCredentials = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    navigate(`/credentials?challenge_id=${encodeURIComponent(account.challenge_id)}`)
  }

  const handleOpenCalendar = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    navigate(`/calendar?challenge_id=${encodeURIComponent(account.challenge_id)}`)
  }

  const handleOpenStats = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    navigate(`/statistics?challenge_id=${encodeURIComponent(account.challenge_id)}`)
  }

  const handleHideBreached = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onHideBreached?.(account.challenge_id)
  }

  return (
    <article className="mobile-overview-slide-card" onClick={handleOpenOverview}>
      <div className="mobile-overview-slide-card__top">
        <div className="mobile-overview-slide-card__identity">
          <span className="mobile-overview-slide-card__challenge-type">
            {formatChallengeType(account.challenge_type)}
          </span>
          <span className="mobile-overview-slide-card__account-line">
            {formatPhase(account.phase)} · {account.mt5_account ?? 'Pending'}
          </span>
        </div>
        <div className="mobile-overview-slide-card__status-wrap">
          <span className={`mobile-overview-status-pill ${getStatusTone(account.display_status)}`}>
            {account.display_status}
          </span>
          {isHideEligible ? (
            <button
              type="button"
              className="mobile-overview-slide-card__hide-button"
              onClick={handleHideBreached}
            >
              Hide
            </button>
          ) : null}
        </div>
      </div>

      <div className="mobile-overview-slide-card__balance-wrap">
        <span className="mobile-overview-slide-card__balance-label">Account Size</span>
        <div className="mobile-overview-slide-card__balance-row">
          <strong>{formatAmount(account.account_size, account.currency)}</strong>
          <span className="mobile-overview-slide-card__platform-tag">{formatPlatform(account.platform)}</span>
        </div>
      </div>

      <div className="mobile-overview-slide-card__actions">
        <button type="button" className="mobile-overview-slide-card__action-item" onClick={handleOpenCredentials}>
          <span className="mobile-overview-slide-card__action-icon">
            <i className="fas fa-key" />
          </span>
          <span className="mobile-overview-slide-card__action-label">Credentials</span>
        </button>
        <button type="button" className="mobile-overview-slide-card__action-item" onClick={handleOpenOverview}>
          <span className="mobile-overview-slide-card__action-icon">
            <i className="fas fa-chart-bar" />
          </span>
          <span className="mobile-overview-slide-card__action-label">Metrics</span>
        </button>
        <button type="button" className="mobile-overview-slide-card__action-item" onClick={handleOpenCalendar}>
          <span className="mobile-overview-slide-card__action-icon">
            <i className="fas fa-calendar-alt" />
          </span>
          <span className="mobile-overview-slide-card__action-label">Calendar</span>
        </button>
        <button type="button" className="mobile-overview-slide-card__action-item" onClick={handleOpenStats}>
          <span className="mobile-overview-slide-card__action-icon">
            <i className="fas fa-chart-pie" />
          </span>
          <span className="mobile-overview-slide-card__action-label">Stats</span>
        </button>
      </div>
    </article>
  )
}

const MobileOverviewPage: React.FC = () => {
  const navigate = useNavigate()
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [accountLoadError, setAccountLoadError] = useState('')
  const [activeAccounts, setActiveAccounts] = useState<UserChallengeAccountListItem[]>([])
  const [historyAccounts, setHistoryAccounts] = useState<UserChallengeAccountListItem[]>([])
  const [hasAnyAccounts, setHasAnyAccounts] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [hiddenBreachedAccounts, setHiddenBreachedAccounts] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_BREACHED_ACCOUNTS_KEY)
      return raw ? JSON.parse(raw) as string[] : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    setLoadingAccounts(true)
    setAccountLoadError('')

    fetchUserChallengeAccounts()
      .then((res) => {
        setActiveAccounts(res.active_accounts)
        setHistoryAccounts(res.history_accounts)
        setHasAnyAccounts(res.has_any_accounts)
      })
      .catch((err: unknown) => {
        setAccountLoadError(err instanceof Error ? err.message : 'Unable to load accounts')
      })
      .finally(() => setLoadingAccounts(false))
  }, [])

  useEffect(() => {
    const slider = sliderRef.current
    if (!slider || activeAccounts.length === 0) return

    const handleScroll = () => {
      const firstSlide = slider.querySelector<HTMLElement>('.mobile-overview-slide')
      if (!firstSlide) return
      const slideWidth = firstSlide.getBoundingClientRect().width + 16
      if (!slideWidth) return
      const nextIndex = Math.round(slider.scrollLeft / slideWidth)
      setActiveIndex(Math.min(Math.max(nextIndex, 0), activeAccounts.length - 1))
    }

    slider.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => slider.removeEventListener('scroll', handleScroll)
  }, [activeAccounts.length])

  const scrollToIndex = (index: number) => {
    const slider = sliderRef.current
    if (!slider) return
    const firstSlide = slider.querySelector<HTMLElement>('.mobile-overview-slide')
    if (!firstSlide) return
    const slideWidth = firstSlide.getBoundingClientRect().width + 16
    slider.scrollTo({ left: slideWidth * index, behavior: 'smooth' })
    setActiveIndex(index)
  }

  const allAccounts = useMemo(
    () => [...activeAccounts, ...historyAccounts].filter(
      (account) => !hiddenBreachedAccounts.includes(account.challenge_id),
    ),
    [activeAccounts, hiddenBreachedAccounts, historyAccounts],
  )

  const handleHideBreachedAccount = (challengeId: string) => {
    setHiddenBreachedAccounts((current) => {
      if (current.includes(challengeId)) return current
      const next = [...current, challengeId]
      localStorage.setItem(HIDDEN_BREACHED_ACCOUNTS_KEY, JSON.stringify(next))
      return next
    })
    setActiveIndex((current) => Math.max(0, current - (current > 0 ? 1 : 0)))
  }

  const handleSlidePrevious = () => {
    if (allAccounts.length === 0) return
    scrollToIndex(Math.max(activeIndex - 1, 0))
  }

  const handleSlideNext = () => {
    if (allAccounts.length === 0) return
    scrollToIndex(Math.min(activeIndex + 1, allAccounts.length - 1))
  }

  const hasSingleVisibleAccount = hasAnyAccounts && allAccounts.length === 1

  return (
    <div className="mobile-overview-page">
      <header className="mobile-overview-header">
        <div className="mobile-overview-header__title-wrap">
          <h1>Accounts</h1>
        </div>

        <div className="mobile-overview-header__actions">
          <button
            type="button"
            className="mobile-overview-header__icon-button"
            onClick={() => navigate('/support')}
            aria-label="Support"
          >
            <i className="fas fa-headset" />
          </button>

          <button
            type="button"
            className="mobile-overview-header__icon-button"
            onClick={() => navigate('/trading-accounts')}
            aria-label="Buy account"
          >
            <i className="fas fa-plus" />
          </button>
        </div>
      </header>

      {loadingAccounts ? (
        <section className="mobile-overview-panel">
          <p>Loading accounts...</p>
        </section>
      ) : accountLoadError ? (
        <ServiceUnavailableState onRetry={() => window.location.reload()} />
      ) : !hasAnyAccounts ? (
        <div className="mobile-overview-slider mobile-overview-slider--standalone mobile-overview-slider--empty-state">
          <div className="mobile-overview-slide">
            <article className="mobile-overview-slide-card mobile-overview-slide-card--empty-state">
              <div className="mobile-overview-slide-card__top">
                <div className="mobile-overview-slide-card__identity">
                  <span className="mobile-overview-slide-card__challenge-type">
                    No challenge account yet
                  </span>
                  <span className="mobile-overview-slide-card__account-line">
                    Your dashboard is ready when you are
                  </span>
                </div>
              </div>

              <div className="mobile-overview-slide-card__balance-wrap mobile-overview-slide-card__balance-wrap--empty-state">
                <span className="mobile-overview-slide-card__balance-label">Account Status</span>
                <div className="mobile-overview-slide-card__balance-row">
                  <strong>No active account</strong>
                </div>
              </div>

              <div className="mobile-overview-slide-card__empty-copy">
                Buy your first account to unlock trading metrics, credentials, rewards, and the rest of your dashboard.
              </div>
            </article>
          </div>
        </div>
      ) : (
        <>
          {allAccounts.length > 0 ? (
            <>
              <div className={`mobile-overview-slider mobile-overview-slider--standalone${hasSingleVisibleAccount ? ' mobile-overview-slider--single' : ''}`} ref={sliderRef}>
                {allAccounts.map((account) => (
                  <div key={account.challenge_id} className="mobile-overview-slide">
                    <SlideCard account={account} onHideBreached={handleHideBreachedAccount} />
                  </div>
                ))}
              </div>

              {allAccounts.length > 1 ? (
                <div className="mobile-overview-slider-controls">
                  <button
                    type="button"
                    className="mobile-overview-slider-arrow"
                    onClick={handleSlidePrevious}
                    aria-label="Previous account"
                    disabled={activeIndex === 0}
                  >
                    <i className="fas fa-chevron-left" />
                  </button>

                  <div className="mobile-overview-dots mobile-overview-dots--standalone">
                    {allAccounts.map((_, index) => (
                      <button
                        key={`mobile-slide-dot-${index}`}
                        type="button"
                        className={index === activeIndex ? 'is-active' : ''}
                        onClick={() => scrollToIndex(index)}
                        aria-label={`Go to account ${index + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="mobile-overview-slider-arrow"
                    onClick={handleSlideNext}
                    aria-label="Next account"
                    disabled={activeIndex === allAccounts.length - 1}
                  >
                    <i className="fas fa-chevron-right" />
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <section className="mobile-overview-inline-empty">
              <div className="mobile-overview-inline-empty__icon">
                <i className="fas fa-wallet" />
              </div>
              <strong>No visible account right now</strong>
              <p>Your current account list is empty. Start a new challenge account to see cards here.</p>
              <button type="button" onClick={() => navigate('/trading-accounts')}>
                Buy Account
              </button>
            </section>
          )}
        </>
      )}

      {!loadingAccounts && !accountLoadError ? (
        <section className="mobile-overview-quick-actions">
          {quickActionItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className="mobile-overview-quick-action"
              onClick={() => {
                if (item.label === 'More') {
                  setShowMoreMenu(true)
                  return
                }
                navigate(item.href)
              }}
            >
              <span className="mobile-overview-quick-action__icon">
                <i className={`fas ${item.icon}`} />
              </span>
              <span className="mobile-overview-quick-action__label">{item.label}</span>
            </button>
          ))}
        </section>
      ) : null}

      <nav className="mobile-overview-bottom-nav" aria-label="Mobile overview navigation">
        {bottomNavItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => navigate(item.href)}
            className={item.label === 'Accounts' ? 'is-active' : ''}
          >
            <i className={`fas ${item.icon}`} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {showMoreMenu ? (
        <div className="mobile-overview-more-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="mobile-overview-more-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-overview-more-menu__handle" />
            <h3>More</h3>
            <button
              type="button"
              className="mobile-overview-more-menu__item"
              onClick={() => {
                setShowMoreMenu(false)
                navigate('/account-recovery')
              }}
            >
              <span className="mobile-overview-more-menu__item-icon">
                <i className="fas fa-life-ring" />
              </span>
              <span>Account Recovery</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default MobileOverviewPage
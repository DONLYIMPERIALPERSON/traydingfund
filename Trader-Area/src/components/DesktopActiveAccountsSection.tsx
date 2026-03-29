import React, { useEffect, useRef, useState } from 'react'
import DesktopAccountCard from './DesktopAccountCard'
import type { UserChallengeAccountListItem } from '../lib/traderAuth'
import '../styles/DesktopActiveAccountsSection.css'

type DesktopActiveAccountsSectionProps = {
  accounts: UserChallengeAccountListItem[]
}

const DesktopActiveAccountsSection: React.FC<DesktopActiveAccountsSectionProps> = ({ accounts }) => {
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const slider = sliderRef.current
    if (!slider) return

    const handleScroll = () => {
      const firstSlide = slider.querySelector<HTMLElement>('.active-account-slide')
      if (!firstSlide) return
      const slideWidth = firstSlide.getBoundingClientRect().width
      if (!slideWidth) return
      const nextIndex = Math.round(slider.scrollLeft / slideWidth)
      setActiveIndex(Math.min(Math.max(nextIndex, 0), accounts.length - 1))
    }

    slider.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => slider.removeEventListener('scroll', handleScroll)
  }, [accounts.length])

  const scrollToIndex = (index: number) => {
    const slider = sliderRef.current
    if (!slider) return
    const firstSlide = slider.querySelector<HTMLElement>('.active-account-slide')
    if (!firstSlide) return
    const slideWidth = firstSlide.getBoundingClientRect().width
    slider.scrollTo({ left: slideWidth * index, behavior: 'smooth' })
    setActiveIndex(index)
  }

  return (
    <div style={{
      marginBottom: '48px'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px'
      }}>
        Active Accounts
      </h2>
      <div className="active-accounts-list" ref={sliderRef}>
        {accounts.length === 0 ? (
          <div className="active-accounts-empty">
            No active account yet.
          </div>
        ) : accounts.map((account) => (
          <div key={account.challenge_id} className="active-account-slide">
              <DesktopAccountCard
                challengeId={account.challenge_id}
                challengeType={account.challenge_type}
                phase={account.phase}
                accountNumber={account.mt5_account ?? 'Pending'}
                startDate={account.started_at ? new Date(account.started_at).toLocaleDateString() : '-'}
                amount={account.account_size}
                currency={account.currency}
                status={(account.display_status as 'Active' | 'Ready' | 'Passed' | 'Failed')}
                hasPendingWithdrawal={account.has_pending_withdrawal}
              />
          </div>
        ))}
      </div>
      {accounts.length > 1 && (
        <div className="active-accounts-dots">
          {accounts.map((_, index) => (
            <button
              key={`active-dot-${index}`}
              type="button"
              className={`active-accounts-dot ${index === activeIndex ? 'active' : ''}`}
              onClick={() => scrollToIndex(index)}
              aria-label={`Go to account ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default DesktopActiveAccountsSection
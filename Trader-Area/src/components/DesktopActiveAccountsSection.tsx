import React from 'react'
import DesktopAccountCard from './DesktopAccountCard'
import type { UserChallengeAccountListItem } from '../mocks/auth'

type DesktopActiveAccountsSectionProps = {
  accounts: UserChallengeAccountListItem[]
}

const DesktopActiveAccountsSection: React.FC<DesktopActiveAccountsSectionProps> = ({ accounts }) => {
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {accounts.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', color: '#666' }}>
            No active account yet.
          </div>
        ) : accounts.map((account) => (
          <DesktopAccountCard
            key={account.challenge_id}
            challengeId={account.challenge_id}
            phase={account.phase}
            accountNumber={account.mt5_account ?? 'Pending'}
            startDate={account.started_at ? new Date(account.started_at).toLocaleDateString() : '-'}
            amount={account.account_size}
            status={(account.display_status as 'Active' | 'Ready' | 'Passed' | 'Failed')}
          />
        ))}
      </div>
    </div>
  )
}

export default DesktopActiveAccountsSection
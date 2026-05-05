import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchProfile,
  updateCertificateNameSetting,
  updateOverallRewardCurrency,
  fetchBankList,
  fetchBankAccountProfile,
  resolveKycAccountName,
  saveCryptoPayout,
  fetchCryptoPayoutProfile,
  persistAuthUser,
  getAffiliateEarningsCurrencyPreference,
  setAffiliateEarningsCurrencyPreference,
  type BankListItem,
  type BankAccountProfile,
  type CryptoPayoutProfile,
} from '../lib/traderAuth'
import '../styles/MobileSettingsPage.css'

const MobileSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [useNickNameForCertificates, setUseNickNameForCertificates] = useState(false)
  const [overallRewardCurrency, setOverallRewardCurrency] = useState<'USD' | 'NGN'>('USD')
  const [savingRewardCurrency, setSavingRewardCurrency] = useState(false)
  const [affiliateEarningsCurrency, setAffiliateEarningsCurrency] = useState<'USD' | 'NGN'>('USD')
  const [banks, setBanks] = useState<BankListItem[]>([])
  const [bankCode, setBankCode] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankVerified, setBankVerified] = useState(false)
  const [bankProfile, setBankProfile] = useState<BankAccountProfile | null>(null)
  const [cryptoProfile, setCryptoProfile] = useState<CryptoPayoutProfile | null>(null)
  const [cryptoAddress, setCryptoAddress] = useState('')
  const [cryptoFirstName, setCryptoFirstName] = useState('')
  const [cryptoLastName, setCryptoLastName] = useState('')
  const [payoutMethodSelection, setPayoutMethodSelection] = useState<'bank' | 'crypto' | null>(null)
  const [activePayoutForm, setActivePayoutForm] = useState<'bank' | 'crypto' | null>(null)
  const [savingBank, setSavingBank] = useState(false)
  const [savingCrypto, setSavingCrypto] = useState(false)
  const [payoutError, setPayoutError] = useState('')
  const [payoutSuccess, setPayoutSuccess] = useState('')
  const lastResolvedKey = useRef<string | null>(null)

  const bankIsSet = payoutMethodSelection === 'bank'
  const cryptoIsSet = payoutMethodSelection === 'crypto'

  const bankLabel = bankProfile
    ? banks.find((bank) => bank.bank_code === bankProfile.bank_code)?.bank_name ?? bankProfile.bank_code
    : bankCode
      ? banks.find((bank) => bank.bank_code === bankCode)?.bank_name ?? bankCode
      : ''

  const bankSummary = bankProfile
    ? `${bankLabel} • ****${bankProfile.bank_account_number.slice(-4)}`
    : bankAccountNumber
      ? `${bankLabel || 'Bank'} • ****${bankAccountNumber.slice(-4)}`
      : 'No bank details set'

  const cryptoSummary = cryptoAddress
    ? `${cryptoAddress.slice(0, 6)}...${cryptoAddress.slice(-4)}`
    : 'No wallet set'

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profile, banksRes, bankProfileRes, cryptoProfileRes] = await Promise.all([
          fetchProfile(),
          fetchBankList(),
          fetchBankAccountProfile(),
          fetchCryptoPayoutProfile(),
        ])
        setUseNickNameForCertificates(profile.use_nickname_for_certificates || false)
        setOverallRewardCurrency((profile.overall_reward_currency?.toUpperCase() === 'NGN' ? 'NGN' : 'USD'))
        setAffiliateEarningsCurrency(getAffiliateEarningsCurrencyPreference())
        setBanks(banksRes.banks ?? [])
        setBankProfile(bankProfileRes)
        setCryptoProfile(cryptoProfileRes)

        if (bankProfileRes) {
          setBankCode(bankProfileRes.bank_code)
          setBankAccountNumber(bankProfileRes.bank_account_number)
          setBankAccountName(bankProfileRes.account_name)
          setBankVerified(bankProfileRes.is_verified)
          setPayoutMethodSelection('bank')
          setActivePayoutForm(null)
        }

        if (profile.payout_method_type === 'crypto') {
          setPayoutMethodSelection('crypto')
          setActivePayoutForm(null)
          setCryptoAddress(profile.payout_crypto_address ?? '')
          setCryptoFirstName(cryptoProfileRes?.first_name ?? '')
          setCryptoLastName(cryptoProfileRes?.last_name ?? '')
        } else if (!bankProfileRes && cryptoProfileRes) {
          setPayoutMethodSelection('crypto')
          setActivePayoutForm(null)
        }
      } catch {
        setUseNickNameForCertificates(false)
      }
    }

    void loadProfile()
  }, [])

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleNickNameToggle = async () => {
    const newValue = !useNickNameForCertificates
    try {
      await updateCertificateNameSetting(newValue)
      setUseNickNameForCertificates(newValue)
    } catch (error) {
      console.error('Failed to update certificate name setting:', error)
      setUseNickNameForCertificates(useNickNameForCertificates)
    }
  }

  const handleOverallRewardCurrencyChange = async (currency: 'USD' | 'NGN') => {
    if (currency === overallRewardCurrency) return
    try {
      setSavingRewardCurrency(true)
      await updateOverallRewardCurrency(currency)
      setOverallRewardCurrency(currency)
    } catch (error) {
      console.error('Failed to update overall reward currency:', error)
    } finally {
      setSavingRewardCurrency(false)
    }
  }

  const handleAffiliateEarningsCurrencyChange = (currency: 'USD' | 'NGN') => {
    if (currency === affiliateEarningsCurrency) return
    setAffiliateEarningsCurrency(currency)
    setAffiliateEarningsCurrencyPreference(currency)
  }

  const resolveAndSaveBank = async (showSuccess = true) => {
    if (!bankCode || bankAccountNumber.length !== 10) {
      setPayoutError('Select a bank and enter a 10-digit account number.')
      return
    }
    setSavingBank(true)
    setPayoutError('')
    if (showSuccess) setPayoutSuccess('')
    try {
      const response = await resolveKycAccountName({
        bank_code: bankCode,
        bank_account_number: bankAccountNumber,
      })
      setBankAccountName(response.account_name)
      setBankVerified(true)
      if (showSuccess) setPayoutSuccess('Bank details saved.')
      const refreshed = await fetchProfile()
      persistAuthUser(refreshed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify bank account.'
      setPayoutError(message)
      setBankVerified(false)
      setBankAccountName('')
    } finally {
      setSavingBank(false)
    }
  }

  const handleSaveBank = async () => {
    if (!bankCode || bankAccountNumber.length !== 10) {
      setPayoutError('Select a bank and enter a 10-digit account number.')
      return
    }

    if (!bankVerified) {
      await resolveAndSaveBank(true)
      return
    }

    setPayoutSuccess('Bank details saved.')
    const refreshed = await fetchProfile()
    persistAuthUser(refreshed)
  }

  useEffect(() => {
    if (!bankCode || bankAccountNumber.length !== 10) {
      lastResolvedKey.current = null
      setBankVerified(false)
      setBankAccountName('')
      return
    }

    const key = `${bankCode}-${bankAccountNumber}`
    if (lastResolvedKey.current === key) return
    lastResolvedKey.current = key
    void resolveAndSaveBank(false)
  }, [bankCode, bankAccountNumber])

  const handleSaveCrypto = async () => {
    if (!cryptoAddress || !cryptoFirstName || !cryptoLastName) {
      setPayoutError('Enter your first name, last name, and USDT (TRC20) wallet address.')
      return
    }
    setSavingCrypto(true)
    setPayoutError('')
    setPayoutSuccess('')
    try {
      await saveCryptoPayout({
        crypto_currency: 'USDT-TRC20',
        crypto_address: cryptoAddress,
        first_name: cryptoFirstName,
        last_name: cryptoLastName,
      })
      setPayoutSuccess('Crypto wallet saved successfully.')
      const refreshed = await fetchProfile()
      persistAuthUser(refreshed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save crypto wallet.'
      setPayoutError(message)
    } finally {
      setSavingCrypto(false)
    }
  }

  return (
    <div className="mobile-settings-page">
      <div className="mobile-settings-shell">
        <header className="mobile-settings-header">
          <button type="button" className="mobile-settings-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-settings-header__text">
            <h1>Settings</h1>
            <p>Manage your preferences and payout details.</p>
          </div>
          <button type="button" className="mobile-settings-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-settings-card">
          <h2>Appearance</h2>

          <div className="mobile-settings-item">
            <div>
              <strong>Theme</strong>
              <p>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</p>
            </div>
            <button type="button" className={`mobile-settings-switch ${isDarkMode ? 'is-on' : ''}`} onClick={handleThemeToggle}><span /></button>
          </div>

          <div className="mobile-settings-item">
            <div>
              <strong>Use Nick Name for Certificates</strong>
              <p>{useNickNameForCertificates ? 'Enabled' : 'Disabled'}</p>
            </div>
            <button type="button" className={`mobile-settings-switch ${useNickNameForCertificates ? 'is-on' : ''}`} onClick={() => void handleNickNameToggle()}><span /></button>
          </div>

          <div className="mobile-settings-item mobile-settings-item--stacked">
            <div>
              <strong>Overall Reward Currency</strong>
              <p>{overallRewardCurrency === 'NGN' ? 'Show in NGN' : 'Show in USD'}</p>
            </div>
            <div className="mobile-settings-currency-toggle">
              <button type="button" className={overallRewardCurrency === 'USD' ? 'is-active' : ''} onClick={() => void handleOverallRewardCurrencyChange('USD')} disabled={savingRewardCurrency}>USD</button>
              <button type="button" className={overallRewardCurrency === 'NGN' ? 'is-active' : ''} onClick={() => void handleOverallRewardCurrencyChange('NGN')} disabled={savingRewardCurrency}>NGN</button>
            </div>
          </div>

          <div className="mobile-settings-item mobile-settings-item--stacked">
            <div>
              <strong>Affiliate Earnings Currency</strong>
              <p>{affiliateEarningsCurrency === 'NGN' ? 'Show in NGN' : 'Show in USD'}</p>
            </div>
            <div className="mobile-settings-currency-toggle">
              <button type="button" className={affiliateEarningsCurrency === 'USD' ? 'is-active' : ''} onClick={() => handleAffiliateEarningsCurrencyChange('USD')}>USD</button>
              <button type="button" className={affiliateEarningsCurrency === 'NGN' ? 'is-active' : ''} onClick={() => handleAffiliateEarningsCurrencyChange('NGN')}>NGN</button>
            </div>
          </div>
        </section>

        <section className="mobile-settings-card">
          <h2>Payout Method</h2>

          <div className="mobile-settings-payout-list">
            <button type="button" className={`mobile-settings-payout-item ${bankIsSet ? 'is-set' : ''}`} onClick={() => {
              if (bankIsSet || cryptoIsSet) return
              setActivePayoutForm('bank')
              setPayoutError('')
              setPayoutSuccess('')
            }}>
              <div>
                <strong>Bank Transfer</strong>
                <p>{bankIsSet ? bankSummary : 'Not set'}</p>
              </div>
              <span>{bankIsSet ? 'Set' : 'Not set'}</span>
            </button>

            <button type="button" className={`mobile-settings-payout-item ${cryptoIsSet ? 'is-set' : ''} ${bankIsSet ? 'is-disabled' : ''}`} onClick={() => {
              if (bankIsSet || cryptoIsSet) return
              setActivePayoutForm('crypto')
              setPayoutError('')
              setPayoutSuccess('')
            }}>
              <div>
                <strong>Crypto Wallet</strong>
                <p>{cryptoIsSet ? cryptoSummary : 'Not set'}</p>
              </div>
              <span>{cryptoIsSet ? 'Set' : bankIsSet ? 'Locked' : 'Not set'}</span>
            </button>
          </div>

          {payoutMethodSelection ? <div className="mobile-settings-note">Only one payout method can be active at a time. To switch methods, contact support.</div> : null}

          {!payoutMethodSelection && activePayoutForm === 'bank' ? (
            <div className="mobile-settings-form-grid">
              <label>
                <span>Bank</span>
                <select value={bankCode} onChange={(e) => {
                  setBankCode(e.target.value)
                  setPayoutError('')
                  setBankVerified(false)
                  setBankAccountName('')
                  lastResolvedKey.current = null
                }}>
                  <option value="">Select bank</option>
                  {banks.map((bank) => <option key={bank.bank_code} value={bank.bank_code}>{bank.bank_name}</option>)}
                </select>
              </label>
              <label>
                <span>Account Number</span>
                <input value={bankAccountNumber} onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setBankAccountNumber(digitsOnly)
                  setPayoutError('')
                }} placeholder="Enter account number" />
              </label>
              <label>
                <span>Account Name</span>
                <input value={bankAccountName} readOnly placeholder="Verify to load name" />
              </label>
              <button type="button" className="mobile-settings-primary-button" onClick={() => void handleSaveBank()} disabled={savingBank}>{savingBank ? 'Checking...' : 'Save Bank'}</button>
            </div>
          ) : null}

          {!payoutMethodSelection && activePayoutForm === 'crypto' ? (
            <div className="mobile-settings-form-grid">
              <label><span>First Name</span><input value={cryptoFirstName} onChange={(e) => setCryptoFirstName(e.target.value)} placeholder="Enter first name" /></label>
              <label><span>Last Name</span><input value={cryptoLastName} onChange={(e) => setCryptoLastName(e.target.value)} placeholder="Enter last name" /></label>
              <label><span>Crypto Network</span><input value="USDT (TRC20)" readOnly /></label>
              <label><span>Wallet Address</span><input value={cryptoAddress} onChange={(e) => setCryptoAddress(e.target.value)} placeholder="Enter wallet address" /></label>
              <button type="button" className="mobile-settings-primary-button" onClick={() => void handleSaveCrypto()} disabled={savingCrypto}>{savingCrypto ? 'Saving...' : 'Save Crypto Wallet'}</button>
            </div>
          ) : null}

          {payoutError ? <div className="mobile-settings-error">{payoutError}</div> : null}
          {payoutSuccess ? <div className="mobile-settings-success">{payoutSuccess}</div> : null}
        </section>
      </div>
    </div>
  )
}

export default MobileSettingsPage
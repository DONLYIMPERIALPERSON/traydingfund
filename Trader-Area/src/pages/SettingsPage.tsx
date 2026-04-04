import React, { useEffect, useRef, useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopSettingsPage.css'
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
  type BankListItem,
  type BankAccountProfile,
  type CryptoPayoutProfile,
} from '../lib/traderAuth'

const SettingsPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [useNickNameForCertificates, setUseNickNameForCertificates] = useState(false)
  const [overallRewardCurrency, setOverallRewardCurrency] = useState<'USD' | 'NGN'>('USD')
  const [savingRewardCurrency, setSavingRewardCurrency] = useState(false)
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
    // Here you would typically save the preference to localStorage
    // and apply the theme change to the entire app
  }

  const handleNickNameToggle = async () => {
    const newValue = !useNickNameForCertificates
    try {
      await updateCertificateNameSetting(newValue)
      setUseNickNameForCertificates(newValue)
    } catch (error) {
      console.error('Failed to update certificate name setting:', error)
      // Revert the UI change on error
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
      if (showSuccess) {
        setPayoutSuccess('Bank details saved.')
      }
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
    if (lastResolvedKey.current === key) {
      return
    }

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
    <div className="settings-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="settings-content-wrapper">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="back-button"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Accounts Overview
        </button>

        {/* Page Header */}
        <div className="page-header">
          <h1>Settings</h1>
          <p>Customize your account preferences and manage your session</p>
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {/* Appearance Section */}
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">Appearance</h2>
            </div>

            {/* Theme Toggle */}
            <div className="theme-toggle">
              <div className="theme-left">
                <i className={`fas ${isDarkMode ? 'fa-moon' : 'fa-sun'} theme-icon`}></i>
                <div className="theme-text">
                  <h3 className="theme-title">Theme</h3>
                  <p className="theme-subtitle">
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleThemeToggle}
                className={`toggle-switch ${isDarkMode ? 'active' : ''}`}
              >
                <div className="toggle-slider">
                  <i className={`fas ${isDarkMode ? 'fa-moon' : 'fa-sun'} toggle-icon`}></i>
                </div>
              </button>
            </div>

            <div className="theme-toggle">
              <div className="theme-left">
                <i className="fas fa-certificate theme-icon"></i>
                <div className="theme-text">
                  <h3 className="theme-title">Use Nick Name for Certificates</h3>
                  <p className="theme-subtitle">
                    {useNickNameForCertificates ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleNickNameToggle}
                className={`toggle-switch ${useNickNameForCertificates ? 'active' : ''}`}
              >
                <div className="toggle-slider">
                  <i className={`fas ${useNickNameForCertificates ? 'fa-user' : 'fa-id-card'} toggle-icon`}></i>
                </div>
              </button>
            </div>

            <div className="theme-toggle">
              <div className="theme-left">
                <i className="fas fa-money-bill-wave theme-icon"></i>
                <div className="theme-text">
                  <h3 className="theme-title">Overall Reward Currency</h3>
                  <p className="theme-subtitle">
                    {overallRewardCurrency === 'NGN' ? 'Show in NGN' : 'Show in USD'}
                  </p>
                </div>
              </div>
              <div className="settings-currency-toggle">
                <button
                  type="button"
                  className={`settings-currency-option ${overallRewardCurrency === 'USD' ? 'active' : ''}`}
                  onClick={() => handleOverallRewardCurrencyChange('USD')}
                  disabled={savingRewardCurrency}
                >
                  USD
                </button>
                <button
                  type="button"
                  className={`settings-currency-option ${overallRewardCurrency === 'NGN' ? 'active' : ''}`}
                  onClick={() => handleOverallRewardCurrencyChange('NGN')}
                  disabled={savingRewardCurrency}
                >
                  NGN
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">Payout Method</h2>
            </div>

            <div className="settings-payout-list">
              <button
                type="button"
                className={`settings-payout-item ${bankIsSet ? 'is-set' : ''}`}
                onClick={() => {
                  if (bankIsSet || cryptoIsSet) return
                  setActivePayoutForm('bank')
                  setPayoutError('')
                  setPayoutSuccess('')
                }}
              >
                <div className="settings-payout-item-left">
                  <div className="settings-payout-icon">
                    <i className="fas fa-university"></i>
                  </div>
                  <div>
                    <h3>Bank Transfer</h3>
                    <p>{bankIsSet ? 'Set' : 'Not set'}</p>
                  </div>
                </div>
                <div className={`settings-payout-status ${bankIsSet ? 'set' : 'not-set'}`}>
                  {bankIsSet ? 'Set' : 'Not set'}
                </div>
              </button>

              <button
                type="button"
                className={`settings-payout-item ${cryptoIsSet ? 'is-set' : ''} ${bankIsSet ? 'is-disabled' : ''}`}
                onClick={() => {
                  if (bankIsSet || cryptoIsSet) return
                  setActivePayoutForm('crypto')
                  setPayoutError('')
                  setPayoutSuccess('')
                }}
              >
                <div className="settings-payout-item-left">
                  <div className="settings-payout-icon">
                    <i className="fas fa-wallet"></i>
                  </div>
                  <div>
                    <h3>Crypto Wallet</h3>
                    <p>{cryptoIsSet ? 'Set' : 'Not set'}</p>
                  </div>
                </div>
                <div className={`settings-payout-status ${cryptoIsSet ? 'set' : 'not-set'}`}>
                  {cryptoIsSet ? 'Set' : bankIsSet ? 'Locked' : 'Not set'}
                </div>
              </button>
            </div>

            {payoutMethodSelection && (
              <div className="settings-payout-note">
                Only one payout method can be active at a time. To switch methods, please contact support.
              </div>
            )}

            {bankIsSet && (
              <div className="settings-payout-summary">
                <div>
                  <h4>Bank transfer configured</h4>
                  <p>{bankSummary}</p>
                </div>
              </div>
            )}

            {cryptoIsSet && (
              <div className="settings-payout-summary">
                <div>
                  <h4>Crypto wallet configured</h4>
                  <p>{cryptoSummary}</p>
                </div>
              </div>
            )}

            {!payoutMethodSelection && activePayoutForm === 'bank' ? (
              <>
                <div className="settings-payout-grid">
                  <div className="settings-form-item">
                    <label className="settings-form-label">Bank</label>
                    <select
                      className="settings-form-input"
                      value={bankCode}
                      onChange={(e) => {
                        setBankCode(e.target.value)
                        setPayoutError('')
                        setBankVerified(false)
                        setBankAccountName('')
                        lastResolvedKey.current = null
                      }}
                    >
                      <option value="">Select bank</option>
                      {banks.map((bank) => (
                        <option key={bank.bank_code} value={bank.bank_code}>
                          {bank.bank_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="settings-form-item">
                    <label className="settings-form-label">Account Number</label>
                    <input
                      className="settings-form-input"
                      value={bankAccountNumber}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setBankAccountNumber(digitsOnly)
                        setPayoutError('')
                      }}
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="settings-form-item">
                    <label className="settings-form-label">Account Name</label>
                    <input
                      className="settings-form-input"
                      value={bankAccountName}
                      readOnly
                      placeholder="Verify to load name"
                    />
                  </div>
                </div>
                <button
                  className="settings-primary-button"
                  type="button"
                  onClick={handleSaveBank}
                  disabled={savingBank}
                >
                  {savingBank ? 'Checking...' : 'Save Bank'}
                </button>
              </>
            ) : !payoutMethodSelection && activePayoutForm === 'crypto' ? (
              <>
                <div className="settings-payout-grid">
                  <div className="settings-form-item">
                    <label className="settings-form-label">First Name</label>
                    <input
                      className="settings-form-input"
                      value={cryptoFirstName}
                      onChange={(e) => setCryptoFirstName(e.target.value)}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="settings-form-item">
                    <label className="settings-form-label">Last Name</label>
                    <input
                      className="settings-form-input"
                      value={cryptoLastName}
                      onChange={(e) => setCryptoLastName(e.target.value)}
                      placeholder="Enter last name"
                    />
                  </div>
                  <div className="settings-form-item">
                    <label className="settings-form-label">Crypto Network</label>
                    <input
                      className="settings-form-input"
                      value="USDT (TRC20)"
                      readOnly
                    />
                  </div>
                  <div className="settings-form-item">
                    <label className="settings-form-label">Wallet Address</label>
                    <input
                      className="settings-form-input"
                      value={cryptoAddress}
                      onChange={(e) => setCryptoAddress(e.target.value)}
                      placeholder="Enter wallet address"
                    />
                  </div>
                </div>
                <button
                  className="settings-primary-button"
                  type="button"
                  onClick={handleSaveCrypto}
                  disabled={savingCrypto}
                >
                  {savingCrypto ? 'Saving...' : 'Save Crypto Wallet'}
                </button>
              </>
            ) : null}

            {payoutError && <div className="settings-form-error">{payoutError}</div>}
            {payoutSuccess && <div className="settings-form-success">{payoutSuccess}</div>}
          </div>


        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default SettingsPage

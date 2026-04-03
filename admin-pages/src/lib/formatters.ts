export const formatAccountSize = (size: string, currency?: string | null) => {
  if (!size) return size

  const normalizedCurrency = (currency ?? '').toUpperCase()
  if (size.includes('₦') || size.includes('$')) {
    if (normalizedCurrency === 'NGN') {
      return `₦${size.replace(/[^0-9.]/g, '')}`
    }
    if (normalizedCurrency === 'USD') {
      return `$${size.replace(/[^0-9.]/g, '')}`
    }
    return size
  }

  const numeric = Number(size.replace(/[^0-9.]/g, ''))
  if (!numeric) return size

  if (normalizedCurrency === 'NGN') {
    return `₦${numeric.toLocaleString('en-NG')}`
  }

  return `$${numeric.toLocaleString('en-US')}`
}

export const formatCurrencyValue = (
  value: string | number | null | undefined,
  currency?: string | null,
  fallbackValue?: string,
) => {
  if (value === null || value === undefined || value === '') {
    return fallbackValue ?? (currency?.toUpperCase() === 'NGN' ? '₦0' : '$0')
  }

  const raw = String(value).trim()
  const sign = raw.startsWith('-') ? '-' : raw.startsWith('+') ? '+' : ''
  const numeric = Number(raw.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(numeric)) {
    return fallbackValue ?? raw
  }

  const formatted = numeric.toLocaleString(currency?.toUpperCase() === 'NGN' ? 'en-NG' : 'en-US')
  const prefix = currency?.toUpperCase() === 'NGN' ? '₦' : '$'
  return `${sign}${prefix}${formatted}`
}
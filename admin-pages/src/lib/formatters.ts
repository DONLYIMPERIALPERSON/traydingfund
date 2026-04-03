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
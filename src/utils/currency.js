export const CURRENCIES = [
  { code: 'USD', symbol: '$',   flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€',   flag: '🇪🇺', name: 'Euro' },
  { code: 'INR', symbol: '₹',   flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'GBP', symbol: '£',   flag: '🇬🇧', name: 'British Pound' },
  { code: 'JPY', symbol: '¥',   flag: '🇯🇵', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$',  flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr',  flag: '🇨🇭', name: 'Swiss Franc' },
  { code: 'SGD', symbol: 'S$',  flag: '🇸🇬', name: 'Singapore Dollar' },
  { code: 'AED', symbol: '﷼',   flag: '🇦🇪', name: 'UAE Dirham' },
]

export function getCurrency(code) {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0]
}

export function formatAmount(amount, currencyCode) {
  const cur = getCurrency(currencyCode)
  const num = parseFloat(amount) || 0
  return `${cur.symbol}${num.toFixed(currencyCode === 'JPY' ? 0 : 2)}`
}

export function getInitials(name = '') {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function avatarColor(name = '') {
  const colors = [
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-orange-100 text-orange-600',
    'bg-teal-100 text-teal-600',
    'bg-pink-100 text-pink-600',
    'bg-indigo-100 text-indigo-600',
    'bg-green-100 text-green-600',
    'bg-red-100 text-red-600',
  ]
  let hash = 0
  for (const ch of name) hash += ch.charCodeAt(0)
  return colors[hash % colors.length]
}

export function groupColor(name = '') {
  const colors = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#6366f1']
  let hash = 0
  for (const ch of name) hash += ch.charCodeAt(0)
  return colors[hash % colors.length]
}

export function shortDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function expenseIcon(description = '') {
  const d = description.toLowerCase()
  if (/food|dinner|lunch|breakfast|restaurant|cafe|pizza|sushi/.test(d)) return '🍽️'
  if (/rent|house|flat|apartment/.test(d)) return '🏠'
  if (/uber|taxi|cab|transport|bus|train|metro/.test(d)) return '🚗'
  if (/grocery|supermarket|shopping|market/.test(d)) return '🛒'
  if (/movie|netflix|cinema|entertainment|spotify/.test(d)) return '🎬'
  if (/flight|hotel|trip|travel|holiday/.test(d)) return '✈️'
  if (/drink|beer|bar|pub/.test(d)) return '🍺'
  if (/gym|sport|fitness/.test(d)) return '💪'
  return '💳'
}

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useGroups } from '../contexts/GroupContext'
import { CURRENCIES, formatAmount } from '../utils/currency'

const SPLIT_TYPES = [
  { value: 'equal',      label: 'Equally', icon: '⚖️' },
  { value: 'percentage', label: 'Percent', icon: '%'  },
  { value: 'exact',      label: 'Amounts', icon: '#'  },
]

export default function AddExpenseModal({ group, onClose }) {
  const { profile }  = useAuth()
  const { addExpense, allMembers } = useGroups()

  const members = allMembers(group.id)   // unified real + guest list

  const [description, setDescription] = useState('')
  const [amountStr,   setAmountStr]   = useState('')
  const [currency,    setCurrency]    = useState(group.currency || 'EUR')
  const [paidBy,      setPaidBy]      = useState(profile?.id || '')
  const [splitType,   setSplitType]   = useState('equal')
  const [selected,    setSelected]    = useState(() => new Set(members.map(m => m.id)))
  const [pctValues,   setPctValues]   = useState({})
  const [exactValues, setExactValues] = useState({})
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const amount          = parseFloat(amountStr.replace(',', '.')) || 0
  const selectedMembers = members.filter(m => selected.has(m.id))
  const realSelected    = selectedMembers.filter(m => !m.isGuest)
  const pctTotal        = selectedMembers.reduce((s, m) => s + (parseFloat(pctValues[m.id]) || 0), 0)
  const exactTotal      = selectedMembers.reduce((s, m) => s + (parseFloat(exactValues[m.id]?.replace(',', '.')) || 0), 0)

  const validationError = (() => {
    if (!description.trim() || amount <= 0) return null
    if (!selectedMembers.length) return 'Select at least one person'
    if (splitType === 'percentage' && Math.abs(pctTotal - 100) > 0.5)
      return `Percentages must total 100% (currently ${pctTotal.toFixed(1)}%)`
    if (splitType === 'exact' && Math.abs(exactTotal - amount) > 0.01)
      return `Amounts must total ${formatAmount(amount, currency)} (currently ${formatAmount(exactTotal, currency)})`
    return null
  })()

  const isValid = description.trim() && amount > 0 && paidBy && selectedMembers.length && !validationError

  function toggleMember(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')

    const splitValues = {}
    for (const m of selectedMembers) {
      if (splitType === 'percentage') splitValues[m.id] = parseFloat(pctValues[m.id]) || 0
      else if (splitType === 'exact')  splitValues[m.id] = parseFloat(exactValues[m.id]?.replace(',', '.')) || 0
    }

    try {
      await addExpense({
        groupId:    group.id,
        description: description.trim(),
        amount,
        currency,
        paidBy,
        splitType,
        members:    selectedMembers,
        splitValues,
        createdBy:  profile.id,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Only real members can be "paid by"
  const realMembers = members.filter(m => !m.isGuest)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-y-auto" style={{ maxHeight: '92vh', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Add Expense</h2>
            <button onClick={onClose} className="text-gray-400 p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount */}
            <div className="bg-gray-50 rounded-2xl p-5 text-center">
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-2xl text-gray-400 font-medium">
                  {CURRENCIES.find(c => c.code === currency)?.symbol}
                </span>
                <input
                  type="number" inputMode="decimal"
                  value={amountStr} onChange={e => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="text-5xl font-bold bg-transparent text-center w-40 focus:outline-none placeholder-gray-200"
                  step="0.01" min="0"
                />
              </div>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full focus:outline-none">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Description *</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Dinner, Rent, Taxi…"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required />
            </div>

            {/* Paid by — real members only */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Paid by</label>
              <select value={paidBy} onChange={e => setPaidBy(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 appearance-none">
                {realMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id === profile?.id ? `You (${m.full_name})` : m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Split type */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">How to split</label>
              <div className="grid grid-cols-3 gap-2">
                {SPLIT_TYPES.map(st => (
                  <button key={st.value} type="button" onClick={() => setSplitType(st.value)}
                    className={`py-3 rounded-xl text-sm font-semibold flex flex-col items-center gap-1 transition-all ${
                      splitType === st.value ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <span className="text-lg">{st.icon}</span>{st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Members — real + guest */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Split between
                <span className="font-normal text-gray-400 ml-1">({members.length} member{members.length !== 1 ? 's' : ''})</span>
              </label>
              <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100">
                {members.map(member => {
                  const isSelected = selected.has(member.id)
                  const isMe       = member.id === profile?.id

                  return (
                    <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                      <button type="button" onClick={() => toggleMember(member.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {isMe ? 'You' : member.full_name}
                        </span>
                        {member.isGuest && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                            Guest
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <>
                          {splitType === 'equal' && amount > 0 && (
                            <span className="text-sm font-semibold text-gray-500">
                              {formatAmount(amount / selectedMembers.length, currency)}
                            </span>
                          )}
                          {splitType === 'percentage' && (
                            <div className="flex items-center gap-1">
                              <input type="number" inputMode="decimal"
                                value={pctValues[member.id] || ''}
                                onChange={e => setPctValues(p => ({ ...p, [member.id]: e.target.value }))}
                                placeholder="0"
                                className="w-14 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-400" />
                              <span className="text-gray-400 text-sm">%</span>
                            </div>
                          )}
                          {splitType === 'exact' && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 text-sm">{CURRENCIES.find(c => c.code === currency)?.symbol}</span>
                              <input type="number" inputMode="decimal"
                                value={exactValues[member.id] || ''}
                                onChange={e => setExactValues(p => ({ ...p, [member.id]: e.target.value }))}
                                placeholder="0.00"
                                className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-400"
                                step="0.01" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {validationError && (
              <div className="text-orange-600 text-sm bg-orange-50 px-4 py-3 rounded-xl">⚠️ {validationError}</div>
            )}
            {error && (
              <div className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</div>
            )}

            <button type="submit" disabled={!isValid || loading}
              className="w-full py-4 rounded-xl font-semibold text-white bg-green-500 active:bg-green-600 disabled:opacity-40 transition-all">
              {loading ? 'Saving…' : 'Add Expense'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

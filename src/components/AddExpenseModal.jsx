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

  const members = allMembers(group.id)

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
  const realMembers     = members.filter(m => !m.isGuest)
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
    setLoading(true); setError('')

    const splitValues = {}
    for (const m of selectedMembers) {
      if (splitType === 'percentage') splitValues[m.id] = parseFloat(pctValues[m.id]) || 0
      else if (splitType === 'exact') splitValues[m.id] = parseFloat(exactValues[m.id]?.replace(',', '.')) || 0
    }

    try {
      await addExpense({
        groupId: group.id, description: description.trim(),
        amount, currency, paidBy, splitType,
        members: selectedMembers, splitValues, createdBy: profile.id,
      })
      onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: '92vh', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Add Expense</h2>
            <button onClick={onClose} className="text-zinc-500 p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 text-center">
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-2xl text-zinc-500 font-medium">
                  {CURRENCIES.find(c => c.code === currency)?.symbol}
                </span>
                <input type="number" inputMode="decimal" value={amountStr}
                  onChange={e => setAmountStr(e.target.value)} placeholder="0.00"
                  className="text-5xl font-bold bg-transparent text-white text-center w-40 focus:outline-none placeholder-zinc-700"
                  step="0.01" min="0" />
              </div>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="text-sm font-semibold text-zinc-300 bg-zinc-700 border border-zinc-600 px-3 py-1.5 rounded-full focus:outline-none">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Description *</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Dinner, Rent, Taxi…"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
                required />
            </div>

            {/* Paid by */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Paid by</label>
              <select value={paidBy} onChange={e => setPaidBy(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl text-sm focus:outline-none focus:border-zinc-500 appearance-none">
                {realMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id === profile?.id ? `You (${m.full_name})` : m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Split type */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">How to split</label>
              <div className="grid grid-cols-3 gap-2">
                {SPLIT_TYPES.map(st => (
                  <button key={st.value} type="button" onClick={() => setSplitType(st.value)}
                    className={`py-3 rounded-xl text-sm font-semibold flex flex-col items-center gap-1 transition-all border ${
                      splitType === st.value
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    <span className="text-lg">{st.icon}</span>{st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Members — include/exclude */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-400">
                  Split between
                  <span className="text-zinc-600 font-normal ml-1">
                    ({selectedMembers.length} of {members.length} included)
                  </span>
                </label>
                {selectedMembers.length < members.length && (
                  <button type="button"
                    onClick={() => setSelected(new Set(members.map(m => m.id)))}
                    className="text-xs text-zinc-400 underline">Include all</button>
                )}
              </div>
              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden divide-y divide-zinc-700">
                {members.map(member => {
                  const isSelected = selected.has(member.id)
                  const isMe       = member.id === profile?.id

                  return (
                    <div key={member.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${!isSelected ? 'opacity-40' : ''}`}>
                      <button type="button" onClick={() => toggleMember(member.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'bg-white border-white' : 'border-zinc-600'}`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-white truncate">
                          {isMe ? 'You' : member.full_name}
                        </span>
                        {member.isGuest && (
                          <span className="text-xs bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-full flex-shrink-0">Guest</span>
                        )}
                      </div>

                      {isSelected && (
                        <>
                          {splitType === 'equal' && amount > 0 && (
                            <span className="text-sm font-semibold text-zinc-400">
                              {formatAmount(amount / selectedMembers.length, currency)}
                            </span>
                          )}
                          {splitType === 'percentage' && (
                            <div className="flex items-center gap-1">
                              <input type="number" inputMode="decimal"
                                value={pctValues[member.id] || ''}
                                onChange={e => setPctValues(p => ({ ...p, [member.id]: e.target.value }))}
                                placeholder="0"
                                className="w-14 px-2 py-1 bg-zinc-700 border border-zinc-600 text-white rounded-lg text-sm text-right focus:outline-none" />
                              <span className="text-zinc-500 text-sm">%</span>
                            </div>
                          )}
                          {splitType === 'exact' && (
                            <div className="flex items-center gap-1">
                              <span className="text-zinc-500 text-sm">{CURRENCIES.find(c => c.code === currency)?.symbol}</span>
                              <input type="number" inputMode="decimal"
                                value={exactValues[member.id] || ''}
                                onChange={e => setExactValues(p => ({ ...p, [member.id]: e.target.value }))}
                                placeholder="0.00"
                                className="w-20 px-2 py-1 bg-zinc-700 border border-zinc-600 text-white rounded-lg text-sm text-right focus:outline-none"
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
              <div className="text-yellow-400 text-sm bg-yellow-950 border border-yellow-900 px-4 py-3 rounded-xl">⚠️ {validationError}</div>
            )}
            {error && (
              <div className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-xl">{error}</div>
            )}

            <button type="submit" disabled={!isValid || loading}
              className="w-full py-4 rounded-xl font-semibold text-black bg-white active:bg-zinc-200 disabled:opacity-30">
              {loading ? 'Saving…' : 'Add Expense'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

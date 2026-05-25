import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useGroups } from '../contexts/GroupContext'
import { formatAmount } from '../utils/currency'
import Avatar from './Avatar'

export default function SettleUpModal({ group, balance, onClose }) {
  const { profile } = useAuth()
  const { settleUp } = useGroups()

  const net        = balance.net
  const iOweThemn  = net < 0
  const suggested  = Math.abs(net)

  const [amountStr, setAmountStr] = useState(suggested.toFixed(2))
  const [note,      setNote]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  const amount = parseFloat(amountStr.replace(',', '.')) || 0

  async function handleConfirm() {
    if (!amount) return
    setLoading(true); setError('')
    try {
      await settleUp({
        groupId:  group.id,
        fromUser: iOweThemn ? profile.id : balance.userId,
        toUser:   iOweThemn ? balance.userId : profile.id,
        amount, currency: group.currency,
        note: note.trim() || null
      })
      setDone(true)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-t-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Settle Up</h2>
            <button onClick={onClose} className="text-zinc-500 p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {done ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Settlement Recorded!</h3>
              <p className="text-zinc-500 text-sm mb-6">The payment has been marked as settled.</p>
              <button onClick={onClose} className="w-full py-4 rounded-xl font-semibold text-black bg-white">Done</button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Direction */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="text-center">
                    <Avatar name={iOweThemn ? profile?.full_name : balance.name} size="lg" />
                    <p className="text-xs text-zinc-500 mt-1">{iOweThemn ? 'You' : balance.name}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-xs text-zinc-600">pays</span>
                  </div>
                  <div className="text-center">
                    <Avatar name={iOweThemn ? balance.name : profile?.full_name} size="lg" />
                    <p className="text-xs text-zinc-500 mt-1">{iOweThemn ? balance.name : 'You'}</p>
                  </div>
                </div>
                <p className="text-center text-sm text-zinc-500">
                  Suggested: <span className="font-semibold text-white">{formatAmount(suggested, group.currency)}</span>
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Amount</label>
                <div className="flex items-center gap-3">
                  <input type="number" inputMode="decimal" value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl text-lg font-bold focus:outline-none focus:border-zinc-500"
                    step="0.01" min="0" />
                  <button type="button" onClick={() => setAmountStr(suggested.toFixed(2))}
                    className="text-xs text-zinc-400 font-semibold bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-lg whitespace-nowrap">
                    Full amount
                  </button>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Note (optional)</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Bank transfer, Cash…"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
              </div>

              {error && <div className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-xl">{error}</div>}

              <p className="text-xs text-center text-zinc-600">
                Records the payment in SplitMate only — no real money is transferred.
              </p>

              <button onClick={handleConfirm} disabled={!amount || loading}
                className="w-full py-4 rounded-xl font-semibold text-black bg-white active:bg-zinc-200 disabled:opacity-40">
                {loading ? 'Recording…' : 'Record Settlement'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

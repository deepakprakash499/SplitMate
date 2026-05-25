import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useGroups } from '../contexts/GroupContext'
import { CURRENCIES, groupColor } from '../utils/currency'
import { supabase } from '../lib/supabase'

const MAX_GUESTS = 12

export default function CreateGroupModal({ onClose }) {
  const { profile }  = useAuth()
  const { createGroup, fetchRecentGuests } = useGroups()

  // Step 1
  const [step,        setStep]        = useState(1)
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [currency,    setCurrency]    = useState('EUR')

  // Step 2 — real members
  const [emailInput,   setEmailInput]   = useState('')
  const [realMembers,  setRealMembers]  = useState([])
  const [addingEmail,  setAddingEmail]  = useState(false)
  const [emailError,   setEmailError]   = useState('')

  // Step 2 — guest members
  const [guestInput,     setGuestInput]     = useState('')
  const [guestMembers,   setGuestMembers]   = useState([])
  const [guestError,     setGuestError]     = useState('')
  const [recentGuests,   setRecentGuests]   = useState([])
  const [showGuestForm,  setShowGuestForm]  = useState(false)

  // Warning + final
  const [showNoMemberWarning, setShowNoMemberWarning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const preview = name.trim().charAt(0).toUpperCase() || 'G'
  const color   = groupColor(name || 'G')

  // Load recent guests when step 2 opens
  useEffect(() => {
    if (step === 2 && profile?.id) {
      fetchRecentGuests(profile.id).then(setRecentGuests)
    }
  }, [step, profile?.id])

  // ── Step 1 ──
  function handleNext(e) {
    e.preventDefault()
    if (!name.trim()) return
    setStep(2)
  }

  // ── Add real member ──
  async function handleAddEmail(e) {
    e.preventDefault()
    if (!emailInput.trim()) return
    if (emailInput.toLowerCase().trim() === profile?.email?.toLowerCase()) {
      setEmailError('You are already the group creator.')
      return
    }
    if (realMembers.some(m => m.email.toLowerCase() === emailInput.toLowerCase().trim())) {
      setEmailError('Already added.')
      return
    }
    setAddingEmail(true); setEmailError('')
    try {
      const { data } = await supabase
        .from('profiles').select('id, email, full_name')
        .eq('email', emailInput.toLowerCase().trim())
      if (!data?.length) throw new Error(`No user found with email: ${emailInput}`)
      setRealMembers(prev => [...prev, data[0]])
      setEmailInput('')
      setShowNoMemberWarning(false)
    } catch (err) { setEmailError(err.message) }
    finally { setAddingEmail(false) }
  }

  // ── Add guest ──
  function handleAddGuest(e) {
    e.preventDefault()
    if (!guestInput.trim()) return
    if (guestMembers.length >= MAX_GUESTS) {
      setGuestError(`Max ${MAX_GUESTS} guests allowed.`)
      return
    }
    if (guestMembers.some(g => g.name.toLowerCase() === guestInput.toLowerCase().trim())) {
      setGuestError('Guest already added.')
      return
    }
    setGuestMembers(prev => [...prev, { id: `temp_${Date.now()}`, name: guestInput.trim() }])
    setGuestInput('')
    setGuestError('')
    setShowNoMemberWarning(false)
  }

  function addRecentGuest(guest) {
    if (guestMembers.length >= MAX_GUESTS) { setGuestError(`Max ${MAX_GUESTS} guests.`); return }
    if (guestMembers.some(g => g.name.toLowerCase() === guest.name.toLowerCase())) return
    setGuestMembers(prev => [...prev, { id: `temp_${Date.now()}`, name: guest.name }])
    setShowNoMemberWarning(false)
  }

  // ── Create group ──
  async function handleCreate() {
    const totalMembers = realMembers.length + guestMembers.length
    if (totalMembers === 0 && !showNoMemberWarning) {
      setShowNoMemberWarning(true)
      return
    }
    setLoading(true); setError('')
    try {
      const group = await createGroup(name.trim(), description.trim(), currency, profile.id)

      // Add real members
      for (const member of realMembers) {
        await supabase.from('group_members').insert({ group_id: group.id, user_id: member.id })
      }

      // Add guest members
      for (const guest of guestMembers) {
        await supabase.from('guest_members')
          .insert({ group_id: group.id, name: guest.name, created_by: profile.id })
      }

      onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const totalCount = realMembers.length + guestMembers.length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: '92vh', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <div className="px-6 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button onClick={() => setStep(1)} className="text-zinc-500 p-1 -ml-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
              )}
              <h2 className="text-xl font-bold text-white">
                {step === 1 ? 'New Group' : 'Add Members'}
              </h2>
            </div>
            <button onClick={onClose} className="text-zinc-500 p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-zinc-800'}`} />
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-zinc-800'}`} />
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold text-white"
                  style={{ background: color }}>{preview}</div>
              </div>

              <form onSubmit={handleNext} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Group Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Goa Trip, Flatmates"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
                    required autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Description (optional)</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What is this group for?"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Default Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl text-sm focus:outline-none focus:border-zinc-500 appearance-none">
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={!name.trim()}
                  className="w-full py-4 rounded-xl font-semibold text-black bg-white active:bg-zinc-200 disabled:opacity-30">
                  Next — Add Members
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">

              {/* ── Real Members ── */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Add by Email (SplitMate users)</label>
                <form onSubmit={handleAddEmail} className="flex gap-2">
                  <input type="email" value={emailInput}
                    onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                    placeholder="friend@email.com"
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
                    autoCapitalize="none" />
                  <button type="submit" disabled={addingEmail || !emailInput.trim()}
                    className="px-4 py-3 bg-white text-black text-sm font-semibold rounded-xl disabled:opacity-30">
                    {addingEmail ? '…' : 'Add'}
                  </button>
                </form>
                {emailError && <p className="text-red-400 text-xs mt-2">{emailError}</p>}
              </div>

              {/* Real members list */}
              {realMembers.length > 0 && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden divide-y divide-zinc-700">
                  {realMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {m.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{m.full_name}</p>
                        <p className="text-xs text-zinc-500 truncate">{m.email}</p>
                      </div>
                      <button onClick={() => setRealMembers(prev => prev.filter(x => x.id !== m.id))}
                        className="text-red-400 p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Divider ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600 font-medium">GUEST MEMBERS</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Guest count indicator */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  No SplitMate account needed · Max {MAX_GUESTS}
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  guestMembers.length >= MAX_GUESTS
                    ? 'bg-red-950 text-red-400'
                    : 'bg-zinc-800 text-zinc-400'}`}>
                  {guestMembers.length}/{MAX_GUESTS}
                </span>
              </div>

              {/* Recent guests quick-select */}
              {recentGuests.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Recently added by you:</p>
                  <div className="flex flex-wrap gap-2">
                    {recentGuests.map(g => {
                      const alreadyAdded = guestMembers.some(
                        gm => gm.name.toLowerCase() === g.name.toLowerCase()
                      )
                      return (
                        <button key={g.id}
                          onClick={() => !alreadyAdded && addRecentGuest(g)}
                          disabled={alreadyAdded || guestMembers.length >= MAX_GUESTS}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            alreadyAdded
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-600 cursor-default'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300 active:bg-zinc-700'
                          }`}>
                          {alreadyAdded ? '✓ ' : '+ '}{g.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Add guest form */}
              <form onSubmit={handleAddGuest} className="flex gap-2">
                <input type="text" value={guestInput}
                  onChange={e => { setGuestInput(e.target.value); setGuestError('') }}
                  placeholder="Guest name (e.g. Shwetha)"
                  disabled={guestMembers.length >= MAX_GUESTS}
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-40"
                  autoCapitalize="words" />
                <button type="submit"
                  disabled={!guestInput.trim() || guestMembers.length >= MAX_GUESTS}
                  className="px-4 py-3 bg-zinc-700 text-white text-sm font-semibold rounded-xl disabled:opacity-30">
                  Add
                </button>
              </form>
              {guestError && <p className="text-red-400 text-xs">{guestError}</p>}

              {/* Guest members list */}
              {guestMembers.length > 0 && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden divide-y divide-zinc-700">
                  {guestMembers.map(g => (
                    <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-zinc-300 text-xs font-bold flex-shrink-0">
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{g.name}</p>
                        <p className="text-xs text-zinc-500">Guest · cash settlement</p>
                      </div>
                      <button onClick={() => setGuestMembers(prev => prev.filter(x => x.id !== g.id))}
                        className="text-red-400 p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* No member warning */}
              {showNoMemberWarning && totalCount === 0 && (
                <div className="bg-yellow-950 border border-yellow-900 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-yellow-400 mb-1">⚠️ No members added</p>
                  <p className="text-xs text-yellow-600">
                    Expenses cannot be split without other members. You can add members later, but splitting won't work until then.
                  </p>
                  <p className="text-xs text-yellow-500 mt-2 font-medium">Tap "Create Anyway" to continue.</p>
                </div>
              )}

              {error && <div className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-xl">{error}</div>}

              <button onClick={handleCreate} disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-black bg-white active:bg-zinc-200 disabled:opacity-40">
                {loading
                  ? 'Creating…'
                  : totalCount === 0
                    ? (showNoMemberWarning ? 'Create Anyway' : 'Create Group')
                    : `Create Group with ${totalCount} member${totalCount > 1 ? 's' : ''}`
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

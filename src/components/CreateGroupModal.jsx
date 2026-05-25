import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useGroups } from '../contexts/GroupContext'
import { CURRENCIES, groupColor } from '../utils/currency'

export default function CreateGroupModal({ onClose }) {
  const { profile } = useAuth()
  const { createGroup, addMember } = useGroups()

  // Step 1 state
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('EUR')

  // Step 2 state
  const [emailInput, setEmailInput] = useState('')
  const [members, setMembers] = useState([])
  const [addingEmail, setAddingEmail] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [showNoMemberWarning, setShowNoMemberWarning] = useState(false)

  // Final creation state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const preview = name.trim().charAt(0).toUpperCase() || 'G'
  const color = groupColor(name || 'G')

  // ── Step 1: validate and move to step 2 ──
  function handleNext(e) {
    e.preventDefault()
    if (!name.trim()) return
    setStep(2)
  }

  // ── Step 2: add a member by email ──
  async function handleAddEmail(e) {
    e.preventDefault()
    if (!emailInput.trim()) return
    if (emailInput.toLowerCase().trim() === profile?.email?.toLowerCase()) {
      setEmailError('You are already the group creator — no need to add yourself.')
      return
    }
    if (members.some(m => m.email.toLowerCase() === emailInput.toLowerCase().trim())) {
      setEmailError('This email has already been added.')
      return
    }
    setAddingEmail(true)
    setEmailError('')
    try {
      // Verify the user exists in Supabase before adding
      const { supabase } = await import('../lib/supabase')
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', emailInput.toLowerCase().trim())
      if (!profiles?.length) throw new Error(`No user found with email: ${emailInput}`)
      const found = profiles[0]
      setMembers(prev => [...prev, found])
      setEmailInput('')
      setShowNoMemberWarning(false)
    } catch (err) {
      setEmailError(err.message)
    } finally {
      setAddingEmail(false)
    }
  }

  function removeMemberFromList(id) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  // ── Final: create group then add members ──
  async function handleCreate() {
    if (members.length === 0 && !showNoMemberWarning) {
      setShowNoMemberWarning(true)
      return
    }
    setLoading(true)
    setError('')
    try {
      const group = await createGroup(
        name.trim(),
        description.trim(),
        currency,
        profile.id
      )
      // Add each member
      for (const member of members) {
        const { supabase } = await import('../lib/supabase')
        await supabase
          .from('group_members')
          .insert({ group_id: group.id, user_id: member.id })
      }
      // Refresh members in context
      const { useGroups: _useGroups } = await import('../contexts/GroupContext')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-y-auto" style={{ maxHeight: '92vh', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-6 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button onClick={() => setStep(1)} className="text-gray-400 p-1 -ml-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
              )}
              <h2 className="text-xl font-bold">
                {step === 1 ? 'New Group' : 'Add Members'}
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-green-500' : 'bg-gray-100'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-green-500' : 'bg-gray-100'}`} />
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              {/* Preview icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold text-white"
                  style={{ background: color }}>
                  {preview}
                </div>
              </div>

              <form onSubmit={handleNext} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Group Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Goa Trip, Flatmates, Dinner Club"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Description (optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What is this group for?"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Default Currency</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 appearance-none"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full py-4 rounded-xl font-semibold text-white bg-green-500 active:bg-green-600 disabled:opacity-40 transition-all"
                >
                  Next — Add Members
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Add by email */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Add Member by Email</label>
                <form onSubmit={handleAddEmail} className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                    placeholder="friend@email.com"
                    className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    autoCapitalize="none"
                  />
                  <button
                    type="submit"
                    disabled={addingEmail || !emailInput.trim()}
                    className="px-4 py-3 bg-green-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
                  >
                    {addingEmail ? '…' : 'Add'}
                  </button>
                </form>
                {emailError && (
                  <p className="text-red-500 text-xs mt-2">{emailError}</p>
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  The person must have already signed up in SplitMate.
                </p>
              </div>

              {/* Members list */}
              {members.length > 0 && (
                <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">
                        {m.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{m.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{m.email}</p>
                      </div>
                      <button
                        onClick={() => removeMemberFromList(m.id)}
                        className="text-red-400 p-1 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* No member warning */}
              {showNoMemberWarning && members.length === 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-orange-700 mb-1">⚠️ No members added</p>
                  <p className="text-xs text-orange-600">
                    Expenses cannot be split without other members. You can add members later from the group screen, but splitting won't work until you do.
                  </p>
                  <p className="text-xs text-orange-600 mt-2 font-medium">
                    Tap "Create Anyway" to continue without members.
                  </p>
                </div>
              )}

              {error && (
                <div className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</div>
              )}

              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-white bg-green-500 active:bg-green-600 disabled:opacity-40 transition-all"
              >
                {loading
                  ? 'Creating…'
                  : members.length === 0
                    ? showNoMemberWarning ? 'Create Anyway' : 'Create Group'
                    : `Create Group with ${members.length} member${members.length > 1 ? 's' : ''}`
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

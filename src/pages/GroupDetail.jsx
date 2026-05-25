import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useGroups } from '../contexts/GroupContext'
import { formatAmount, expenseIcon, shortDate } from '../utils/currency'
import AddExpenseModal  from '../components/AddExpenseModal'
import EditExpenseModal from '../components/EditExpenseModal'
import SettleUpModal    from '../components/SettleUpModal'
import Avatar           from '../components/Avatar'

const TABS = ['Expenses', 'Balances', 'Members']
const MAX_GUESTS = 12

export default function GroupDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { profile } = useAuth()
  const {
    groups, groupMembers, guestMembers, expenses, splits,
    fetchExpenses, fetchMembers, fetchGuestMembers, fetchRecentGuests,
    addMember, removeMember, addGuestMember, removeGuestMember,
    deleteExpense, deleteGroup, calculateBalances, settleGuest, loading
  } = useGroups()

  const [tab,             setTab]             = useState('Expenses')
  const [showAddExpense,  setShowAddExpense]  = useState(false)
  const [editingExpense,  setEditingExpense]  = useState(null)
  const [settleBalance,   setSettleBalance]   = useState(null)
  const [expandedExpense, setExpandedExpense] = useState(null)
  const [newEmail,        setNewEmail]        = useState('')
  const [addingMember,    setAddingMember]    = useState(false)
  const [memberError,     setMemberError]     = useState('')
  const [guestName,       setGuestName]       = useState('')
  const [addingGuest,     setAddingGuest]     = useState(false)
  const [guestError,      setGuestError]      = useState('')
  const [showGuestForm,   setShowGuestForm]   = useState(false)
  const [recentGuests,    setRecentGuests]    = useState([])
  const [showDeleteGroup, setShowDeleteGroup] = useState(false)
  const [deletingGroup,   setDeletingGroup]   = useState(false)
  const [guestSettle,     setGuestSettle]     = useState(null)
  const [settlingGuest,   setSettlingGuest]   = useState(false)

  const group         = groups.find(g => g.id === id)
  const members       = groupMembers[id] || []
  const guests        = guestMembers[id] || []
  const groupExpenses = expenses.filter(e => e.group_id === id)
  const balances      = profile?.id ? calculateBalances(id, profile.id) : []
  const totalNet      = balances.reduce((s, b) => s + b.net, 0)
  const isCreator     = group?.created_by === profile?.id

  // Show delete if no expenses OR all expenses settled
  const canSmartDelete = groupExpenses.length === 0 ||
    groupExpenses.every(e => {
      const s = splits[e.id] || []
      return s.length > 0 && s.every(sp => sp.is_settled)
    })

  useEffect(() => {
    if (id) {
      fetchExpenses(id)
      fetchMembers(id)
      fetchGuestMembers(id)
    }
  }, [id])

  useEffect(() => {
    if (tab === 'Members' && profile?.id) {
      fetchRecentGuests(profile.id).then(setRecentGuests)
    }
  }, [tab, profile?.id])

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-black">
        <p className="text-zinc-500">Group not found.</p>
        <button onClick={() => navigate('/groups')} className="text-white font-semibold">Go back</button>
      </div>
    )
  }

  function isExpenseFullySettled(expenseId) {
    const s = splits[expenseId] || []
    return s.length > 0 && s.every(sp => sp.is_settled)
  }

  async function handleAddMember(e) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setAddingMember(true); setMemberError('')
    try { await addMember(id, newEmail); setNewEmail('') }
    catch (err) { setMemberError(err.message) }
    finally { setAddingMember(false) }
  }

  async function handleAddGuest(e) {
    e.preventDefault()
    if (!guestName.trim()) return
    setAddingGuest(true); setGuestError('')
    try {
      await addGuestMember(id, guestName, profile.id)
      setGuestName('')
      setShowGuestForm(false)
      fetchRecentGuests(profile.id).then(setRecentGuests)
    } catch (err) { setGuestError(err.message) }
    finally { setAddingGuest(false) }
  }

  async function addRecentGuestToGroup(guest) {
    if (guests.length >= MAX_GUESTS) { setGuestError(`Max ${MAX_GUESTS} guests.`); return }
    if (guests.some(g => g.name.toLowerCase() === guest.name.toLowerCase())) return
    try { await addGuestMember(id, guest.name, profile.id) }
    catch (err) { setGuestError(err.message) }
  }

  async function handleDeleteExpense(expId) {
    if (!confirm('Delete this expense?')) return
    try { await deleteExpense(expId) } catch (e) { alert(e.message) }
  }

  async function handleDeleteGroup() {
    setDeletingGroup(true)
    try { await deleteGroup(id); navigate('/groups') }
    catch (e) { alert(e.message); setDeletingGroup(false) }
  }

  async function handleGuestSettle() {
    if (!guestSettle) return
    setSettlingGuest(true)
    try { await settleGuest(id, guestSettle.userId); setGuestSettle(null) }
    catch (e) { alert(e.message) }
    finally { setSettlingGuest(false) }
  }

  const bannerBg = totalNet >= 0 ? 'bg-zinc-900' : 'bg-zinc-900'

  return (
    <div className="flex flex-col h-full bg-black">

      {/* Header */}
      <div className={`${bannerBg} border-b border-zinc-800 px-5`}
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center gap-3 pb-3">
          <button onClick={() => navigate('/groups')} className="text-zinc-500 p-1 -ml-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{group.name}</h1>
            <p className="text-zinc-500 text-xs mt-0.5">
              {members.length} member{members.length !== 1 ? 's' : ''}
              {guests.length > 0 && ` · ${guests.length} guest${guests.length !== 1 ? 's' : ''}`}
              {' · '}{group.currency}
            </p>
          </div>
          <button onClick={() => setShowAddExpense(true)}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center active:bg-zinc-200">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* Balance bar */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <p className="text-zinc-600 text-xs mb-1">Your balance</p>
            {balances.length === 0
              ? <p className="text-white font-semibold">All settled up ✓</p>
              : totalNet > 0
                ? <p className="text-green-400 font-semibold">You are owed {formatAmount(totalNet, group.currency)}</p>
                : <p className="text-red-400 font-semibold">You owe {formatAmount(Math.abs(totalNet), group.currency)}</p>
            }
          </div>
          {balances.some(b => !b.isGuest) && (
            <button
              onClick={() => setSettleBalance(balances.find(b => b.iOwe > 0 && !b.isGuest) || balances.find(b => !b.isGuest))}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white text-sm font-semibold rounded-full">
              Settle Up
            </button>
          )}
        </div>
      </div>

      {/* Smart Delete Banner — no expenses OR all settled */}
      {canSmartDelete && (
        <div className="bg-zinc-900 border-b border-zinc-800 px-5 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">
              {groupExpenses.length === 0 ? '📂 No expenses yet' : '🎉 All expenses settled!'}
            </p>
            <p className="text-xs text-zinc-500">
              {groupExpenses.length === 0
                ? 'This group has no expenses. Delete it if it\'s not needed.'
                : 'Would you like to close and delete this group?'}
            </p>
          </div>
          <button onClick={() => setShowDeleteGroup(true)}
            className="px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl flex-shrink-0">
            Delete Group
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-black border-b border-zinc-900 px-4">
        <div className="flex">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === t ? 'text-white border-b-2 border-white' : 'text-zinc-600'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-black">

        {/* EXPENSES */}
        {tab === 'Expenses' && (
          <div className="px-4 py-4 space-y-2">
            {loading && groupExpenses.length === 0 ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-white border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
              </div>
            ) : groupExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="text-5xl">🧾</div>
                <p className="text-zinc-500 font-medium">No expenses yet</p>
                <button onClick={() => setShowAddExpense(true)} className="text-white text-sm font-semibold">Add first expense →</button>
              </div>
            ) : (
              groupExpenses.map(expense => {
                const paidByMe      = expense.paid_by === profile?.id
                const mySplit       = (splits[expense.id] || []).find(s => s.user_id === profile?.id)
                const paidByProfile = members.find(m => m.id === expense.paid_by)
                const isExpanded    = expandedExpense === expense.id
                const expSplits     = splits[expense.id] || []
                const fullySettled  = isExpenseFullySettled(expense.id)
                const isMyExpense   = expense.created_by === profile?.id

                let amountLabel = '', amountColor = 'text-zinc-500'
                if (paidByMe) {
                  amountLabel = `+${formatAmount(expense.amount, expense.currency)}`
                  amountColor = 'text-green-400'
                } else if (mySplit) {
                  amountLabel = mySplit.is_settled ? 'settled' : `-${formatAmount(mySplit.amount, expense.currency)}`
                  amountColor = mySplit.is_settled ? 'text-zinc-600' : 'text-red-400'
                }

                return (
                  <div key={expense.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <button className="w-full px-4 py-4 flex items-center gap-3 text-left"
                      onClick={() => setExpandedExpense(isExpanded ? null : expense.id)}>
                      <div className="w-11 h-11 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {expenseIcon(expense.description)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{expense.description}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {paidByMe ? 'You' : paidByProfile?.full_name?.split(' ')[0] || 'Someone'} paid {formatAmount(expense.amount, expense.currency)} · {shortDate(expense.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {fullySettled && <span className="text-xs bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full">✓</span>}
                        <span className={`text-sm font-bold ${amountColor}`}>{amountLabel}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-800 px-4 pb-4">
                        <div className="pt-3 space-y-2 mb-3">
                          {expSplits.map(split => {
                            const isGuest      = !!split.guest_member_id
                            const isMe         = split.user_id === profile?.id
                            const guestProfile = isGuest ? guests.find(g => g.id === split.guest_member_id) : null
                            const realProfile  = !isGuest ? members.find(m => m.id === split.user_id) : null
                            const displayName  = isGuest
                              ? `${guestProfile?.name || 'Guest'} (Guest)`
                              : isMe ? 'You' : realProfile?.full_name || 'Unknown'

                            return (
                              <div key={split.id} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                  {displayName.charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 text-sm text-zinc-400">{displayName}</span>
                                <span className={`text-sm font-semibold ${split.is_settled ? 'text-zinc-700' : 'text-white'}`}>
                                  {formatAmount(split.amount, expense.currency)}
                                </span>
                                {split.is_settled
                                  ? <span className="text-xs text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">settled</span>
                                  : <span className="text-xs text-yellow-600 bg-yellow-950 border border-yellow-900 px-2 py-0.5 rounded-full">pending</span>
                                }
                              </div>
                            )
                          })}
                        </div>

                        {isMyExpense && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => { if (!fullySettled) setEditingExpense(expense) }}
                              disabled={fullySettled}
                              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border transition-all ${
                                fullySettled
                                  ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed'
                                  : 'bg-zinc-800 border-zinc-700 text-white active:bg-zinc-700'}`}>
                              ✏️ {fullySettled ? 'Settled — locked' : 'Edit'}
                            </button>
                            <button onClick={() => handleDeleteExpense(expense.id)}
                              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-zinc-800 border border-zinc-700 text-red-400 active:bg-zinc-700 flex items-center justify-center gap-1.5">
                              🗑 Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* BALANCES */}
        {tab === 'Balances' && (
          <div className="px-4 py-4 space-y-3">
            {balances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-white">All settled up!</p>
                <p className="text-sm text-zinc-500 text-center">No outstanding balances.</p>
              </div>
            ) : (
              balances.map(balance => (
                <div key={balance.userId} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                    {balance.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{balance.name}</p>
                      {balance.isGuest && (
                        <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-500 px-1.5 py-0.5 rounded-full">Guest</span>
                      )}
                    </div>
                    {balance.net > 0
                      ? <p className="text-sm text-green-400">owes you {formatAmount(balance.net, group.currency)}</p>
                      : <p className="text-sm text-red-400">you owe {formatAmount(Math.abs(balance.net), group.currency)}</p>
                    }
                  </div>
                  <button
                    onClick={() => balance.isGuest ? setGuestSettle(balance) : setSettleBalance(balance)}
                    className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-xl active:bg-zinc-200">
                    Settle
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* MEMBERS */}
        {tab === 'Members' && (
          <div className="px-4 py-4 space-y-4">
            {/* Real members */}
            <div>
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide px-1 mb-2">Members</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
                    <Avatar name={member.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white truncate">
                          {member.id === profile?.id ? 'You' : member.full_name}
                        </p>
                        {member.id === group.created_by && (
                          <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-500 px-2 py-0.5 rounded-full">creator</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 truncate">{member.email}</p>
                    </div>
                    {isCreator && member.id !== profile?.id && (
                      <button onClick={() => { if (confirm(`Remove ${member.full_name}?`)) removeMember(id, member.id) }}
                        className="text-red-500 p-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Guests */}
            {guests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide px-1 mb-2">Guests</p>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
                  {guests.map(guest => (
                    <div key={guest.id} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-sm flex-shrink-0">
                        {guest.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{guest.name}</p>
                        <p className="text-xs text-zinc-600">Guest · cash settlement</p>
                      </div>
                      {isCreator && (
                        <button onClick={() => { if (confirm(`Remove ${guest.name}?`)) removeGuestMember(id, guest.id) }}
                          className="text-red-500 p-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add members (creator only) */}
            {isCreator && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-5">
                {/* Add real member */}
                <div>
                  <p className="text-sm font-semibold text-white mb-3">Add Member by Email</p>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="friend@email.com"
                      className="flex-1 px-3 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:border-zinc-600"
                      autoCapitalize="none" />
                    <button type="submit" disabled={addingMember || !newEmail.trim()}
                      className="px-4 py-2.5 bg-white text-black text-sm font-semibold rounded-xl disabled:opacity-30">
                      {addingMember ? '…' : 'Add'}
                    </button>
                  </form>
                  {memberError && <p className="text-red-400 text-xs mt-2">{memberError}</p>}
                  <p className="text-xs text-zinc-600 mt-1.5">Must have signed up in SplitMate.</p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-xs text-zinc-600 font-medium">GUESTS</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                {/* Guest count */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-600">No account needed · Max {MAX_GUESTS}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    guests.length >= MAX_GUESTS
                      ? 'bg-red-950 border-red-900 text-red-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                    {guests.length}/{MAX_GUESTS}
                  </span>
                </div>

                {/* Recent guests quick-select */}
                {recentGuests.filter(g => !guests.some(eg => eg.name.toLowerCase() === g.name.toLowerCase())).length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-600 mb-2">Recently added by you:</p>
                    <div className="flex flex-wrap gap-2">
                      {recentGuests.map(g => {
                        const alreadyIn = guests.some(eg => eg.name.toLowerCase() === g.name.toLowerCase())
                        if (alreadyIn) return null
                        return (
                          <button key={g.id}
                            onClick={() => addRecentGuestToGroup(g)}
                            disabled={guests.length >= MAX_GUESTS}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 active:bg-zinc-700 disabled:opacity-30">
                            + {g.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Add guest form toggle */}
                <div>
                  <button onClick={() => setShowGuestForm(p => !p)}
                    disabled={guests.length >= MAX_GUESTS}
                    className="text-sm text-zinc-400 font-medium underline disabled:opacity-30">
                    {showGuestForm ? 'Cancel' : '+ Add new guest'}
                  </button>
                  {showGuestForm && (
                    <form onSubmit={handleAddGuest} className="flex gap-2 mt-3">
                      <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                        placeholder="Guest name (e.g. Shwetha)"
                        className="flex-1 px-3 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:border-zinc-600"
                        autoCapitalize="words" autoFocus />
                      <button type="submit" disabled={addingGuest || !guestName.trim()}
                        className="px-4 py-2.5 bg-zinc-700 border border-zinc-600 text-white text-sm font-semibold rounded-xl disabled:opacity-30">
                        {addingGuest ? '…' : 'Add'}
                      </button>
                    </form>
                  )}
                  {guestError && <p className="text-red-400 text-xs mt-2">{guestError}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddExpense  && <AddExpenseModal  group={group} onClose={() => setShowAddExpense(false)} />}
      {editingExpense  && <EditExpenseModal group={group} expense={editingExpense} onClose={() => setEditingExpense(null)} />}
      {settleBalance   && <SettleUpModal   group={group} balance={settleBalance}  onClose={() => setSettleBalance(null)} />}

      {/* Guest Settle */}
      {guestSettle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-t-3xl p-6"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
            <div className="w-14 h-14 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💵</span>
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-1">
              Settle {guestSettle.name.replace(' (Guest)', '')}?
            </h3>
            <p className="text-zinc-500 text-sm text-center mb-1">
              Outstanding: <span className="font-bold text-white">{formatAmount(Math.abs(guestSettle.net), group.currency)}</span>
            </p>
            <p className="text-xs text-center text-zinc-600 mb-6">
              Mark as settled once you have collected their cash share.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setGuestSettle(null)}
                className="flex-1 py-3.5 bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold rounded-xl">Cancel</button>
              <button onClick={handleGuestSettle} disabled={settlingGuest}
                className="flex-1 py-3.5 bg-white text-black font-semibold rounded-xl disabled:opacity-50">
                {settlingGuest ? 'Settling…' : 'Cash Received ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group */}
      {showDeleteGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-t-3xl p-6"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
            <h3 className="text-lg font-bold text-white mb-1">Delete "{group.name}"?</h3>
            <p className="text-zinc-500 text-sm mb-2">
              Permanently deletes the group and all expenses, splits, and settlements from the database.
            </p>
            <p className="text-red-500 text-xs mb-6 font-medium">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteGroup(false)}
                className="flex-1 py-3.5 bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold rounded-xl">Cancel</button>
              <button onClick={handleDeleteGroup} disabled={deletingGroup}
                className="flex-1 py-3.5 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50">
                {deletingGroup ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

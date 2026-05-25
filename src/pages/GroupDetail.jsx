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

export default function GroupDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { profile }  = useAuth()
  const {
    groups, groupMembers, guestMembers, expenses, splits,
    fetchExpenses, fetchMembers, fetchGuestMembers,
    addMember, removeMember,
    addGuestMember, removeGuestMember,
    deleteExpense, deleteGroup, calculateBalances,
    settleGuest, loading
  } = useGroups()

  const [tab,             setTab]             = useState('Expenses')
  const [showAddExpense,  setShowAddExpense]  = useState(false)
  const [editingExpense,  setEditingExpense]  = useState(null)
  const [settleBalance,   setSettleBalance]   = useState(null)
  const [expandedExpense, setExpandedExpense] = useState(null)

  // Members tab state
  const [newEmail,      setNewEmail]      = useState('')
  const [addingMember,  setAddingMember]  = useState(false)
  const [memberError,   setMemberError]   = useState('')
  const [guestName,     setGuestName]     = useState('')
  const [addingGuest,   setAddingGuest]   = useState(false)
  const [guestError,    setGuestError]    = useState('')
  const [showAddGuest,  setShowAddGuest]  = useState(false)

  // Group delete state
  const [showDeleteGroup, setShowDeleteGroup] = useState(false)
  const [deletingGroup,   setDeletingGroup]   = useState(false)

  // Guest settle confirmation
  const [guestSettleTarget, setGuestSettleTarget] = useState(null)
  const [settlingGuest,     setSettlingGuest]     = useState(false)

  const group         = groups.find(g => g.id === id)
  const members       = groupMembers[id] || []
  const guests        = guestMembers[id] || []
  const groupExpenses = expenses.filter(e => e.group_id === id)
  const balances      = profile?.id ? calculateBalances(id, profile.id) : []
  const totalNet      = balances.reduce((s, b) => s + b.net, 0)
  const isCreator     = group?.created_by === profile?.id

  const allExpensesSettled =
    groupExpenses.length > 0 &&
    groupExpenses.every(expense => {
      const s = splits[expense.id] || []
      return s.length > 0 && s.every(sp => sp.is_settled)
    })

  useEffect(() => {
    if (id) {
      fetchExpenses(id)
      fetchMembers(id)
      fetchGuestMembers(id)
    }
  }, [id])

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-gray-500">Group not found.</p>
        <button onClick={() => navigate('/groups')} className="text-green-600 font-semibold">Go back</button>
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
    try {
      await addMember(id, newEmail)
      setNewEmail('')
    } catch (err) { setMemberError(err.message) }
    finally { setAddingMember(false) }
  }

  async function handleAddGuest(e) {
    e.preventDefault()
    if (!guestName.trim()) return
    setAddingGuest(true); setGuestError('')
    try {
      await addGuestMember(id, guestName, profile.id)
      setGuestName('')
      setShowAddGuest(false)
    } catch (err) { setGuestError(err.message) }
    finally { setAddingGuest(false) }
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
    if (!guestSettleTarget) return
    setSettlingGuest(true)
    try {
      await settleGuest(id, guestSettleTarget.userId)
      setGuestSettleTarget(null)
    } catch (e) { alert(e.message) }
    finally { setSettlingGuest(false) }
  }

  const bannerGradient = totalNet >= 0
    ? 'from-green-500 to-emerald-500'
    : 'from-orange-500 to-red-400'

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className={`bg-gradient-to-r ${bannerGradient} px-5`}
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center gap-3 pb-3">
          <button onClick={() => navigate('/groups')} className="text-white/80 p-1 -ml-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{group.name}</h1>
            <p className="text-white/70 text-xs mt-0.5">
              {members.length} member{members.length !== 1 ? 's' : ''}
              {guests.length > 0 && ` · ${guests.length} guest${guests.length !== 1 ? 's' : ''}`}
              {' · '}{group.currency}
            </p>
          </div>
          <button onClick={() => setShowAddExpense(true)}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between pb-5">
          <div>
            <p className="text-white/70 text-xs mb-1">Your balance</p>
            {balances.length === 0
              ? <p className="text-white font-semibold">All settled up ✓</p>
              : totalNet > 0
                ? <p className="text-white font-semibold">You are owed {formatAmount(totalNet, group.currency)}</p>
                : <p className="text-white font-semibold">You owe {formatAmount(Math.abs(totalNet), group.currency)}</p>
            }
          </div>
          {balances.some(b => !b.isGuest) && (
            <button
              onClick={() => setSettleBalance(balances.find(b => b.iOwe > 0 && !b.isGuest) || balances.find(b => !b.isGuest))}
              className="px-4 py-2 bg-white/20 rounded-full text-white text-sm font-semibold border border-white/30">
              Settle Up
            </button>
          )}
        </div>
      </div>

      {/* Smart Delete Banner */}
      {allExpensesSettled && (
        <div className="bg-green-50 border-b border-green-100 px-5 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-green-800">🎉 All expenses settled!</p>
            <p className="text-xs text-green-600">Would you like to close and delete this group?</p>
          </div>
          <button onClick={() => setShowDeleteGroup(true)}
            className="px-3 py-2 bg-red-500 text-white text-xs font-semibold rounded-xl flex-shrink-0">
            Delete Group
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === t ? 'text-green-600 border-b-2 border-green-500' : 'text-gray-400'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* EXPENSES TAB */}
        {tab === 'Expenses' && (
          <div className="px-4 py-4 space-y-2">
            {loading && groupExpenses.length === 0 ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-green-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
              </div>
            ) : groupExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="text-5xl">🧾</div>
                <p className="text-gray-500 font-medium">No expenses yet</p>
                <button onClick={() => setShowAddExpense(true)} className="text-green-600 text-sm font-semibold">Add first expense →</button>
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

                let amountLabel = ''
                let amountColor = 'text-gray-500'
                if (paidByMe) {
                  amountLabel = `+${formatAmount(expense.amount, expense.currency)}`
                  amountColor = 'text-green-600'
                } else if (mySplit) {
                  amountLabel = mySplit.is_settled ? 'settled' : `-${formatAmount(mySplit.amount, expense.currency)}`
                  amountColor = mySplit.is_settled ? 'text-gray-400' : 'text-red-500'
                }

                return (
                  <div key={expense.id} className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
                    <button className="w-full px-4 py-4 flex items-center gap-3 text-left"
                      onClick={() => setExpandedExpense(isExpanded ? null : expense.id)}>
                      <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {expenseIcon(expense.description)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{expense.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {paidByMe ? 'You' : paidByProfile?.full_name?.split(' ')[0] || 'Someone'} paid {formatAmount(expense.amount, expense.currency)} · {shortDate(expense.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {fullySettled && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">✓ settled</span>}
                        <span className={`text-sm font-bold ${amountColor}`}>{amountLabel}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-50 px-4 pb-4">
                        <div className="pt-3 space-y-2 mb-3">
                          {expSplits.map(split => {
                            const isGuest      = !!split.guest_member_id
                            const isMe         = split.user_id === profile?.id
                            const guestProfile = isGuest
                              ? guests.find(g => g.id === split.guest_member_id)
                              : null
                            const realProfile  = !isGuest
                              ? members.find(m => m.id === split.user_id)
                              : null
                            const displayName  = isGuest
                              ? `${guestProfile?.name || 'Guest'} (Guest)`
                              : isMe ? 'You' : realProfile?.full_name || 'Unknown'

                            return (
                              <div key={split.id} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  isGuest ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                                  {displayName.charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 text-sm text-gray-600">{displayName}</span>
                                <span className={`text-sm font-semibold ${split.is_settled ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {formatAmount(split.amount, expense.currency)}
                                </span>
                                {split.is_settled
                                  ? <span className="text-xs text-green-500 bg-green-50 px-2 py-0.5 rounded-full">✓ settled</span>
                                  : <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">pending</span>
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
                              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                                fullySettled
                                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                  : 'bg-blue-50 text-blue-600 active:bg-blue-100'}`}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                              </svg>
                              {fullySettled ? 'Settled — cannot edit' : 'Edit'}
                            </button>
                            <button onClick={() => handleDeleteExpense(expense.id)}
                              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-500 active:bg-red-100 flex items-center justify-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Delete
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

        {/* BALANCES TAB */}
        {tab === 'Balances' && (
          <div className="px-4 py-4 space-y-3">
            {balances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-800">All settled up!</p>
                <p className="text-sm text-gray-500 text-center">No outstanding balances.</p>
              </div>
            ) : (
              balances.map(balance => (
                <div key={balance.userId} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    balance.isGuest ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                    {balance.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{balance.name}</p>
                      {balance.isGuest && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">Guest</span>
                      )}
                    </div>
                    {balance.net > 0
                      ? <p className="text-sm text-green-600">owes you {formatAmount(balance.net, group.currency)}</p>
                      : <p className="text-sm text-red-500">you owe {formatAmount(Math.abs(balance.net), group.currency)}</p>
                    }
                  </div>
                  <button
                    onClick={() => balance.isGuest
                      ? setGuestSettleTarget(balance)
                      : setSettleBalance(balance)
                    }
                    className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl active:bg-green-600">
                    Settle
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {tab === 'Members' && (
          <div className="px-4 py-4 space-y-4">

            {/* Real members */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">Members</p>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden divide-y divide-gray-50">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
                    <Avatar name={member.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {member.id === profile?.id ? 'You' : member.full_name}
                        </p>
                        {member.id === group.created_by && (
                          <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">creator</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    </div>
                    {isCreator && member.id !== profile?.id && (
                      <button onClick={() => { if (confirm(`Remove ${member.full_name}?`)) removeMember(id, member.id) }}
                        className="text-red-400 p-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Guest members */}
            {guests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">Guests</p>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden divide-y divide-gray-50">
                  {guests.map(guest => (
                    <div key={guest.id} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
                        {guest.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{guest.name}</p>
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Guest</span>
                        </div>
                        <p className="text-xs text-gray-400">No account — cash settlement</p>
                      </div>
                      {isCreator && (
                        <button onClick={() => { if (confirm(`Remove ${guest.name}?`)) removeGuestMember(id, guest.id) }}
                          className="text-red-400 p-1.5">
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

            {/* Add real member */}
            {isCreator && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Add Member by Email</p>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="friend@email.com"
                      className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      autoCapitalize="none" />
                    <button type="submit" disabled={addingMember || !newEmail.trim()}
                      className="px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40">
                      {addingMember ? '…' : 'Add'}
                    </button>
                  </form>
                  {memberError && <p className="text-red-500 text-xs mt-2">{memberError}</p>}
                  <p className="text-xs text-gray-400 mt-1.5">Person must have signed up in SplitMate.</p>
                </div>

                {/* Add guest member */}
                <div className="border-t border-gray-50 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Add Guest Member</p>
                    <button onClick={() => setShowAddGuest(p => !p)}
                      className="text-xs text-purple-600 font-semibold bg-purple-50 px-3 py-1.5 rounded-full">
                      {showAddGuest ? 'Cancel' : '+ Add Guest'}
                    </button>
                  </div>

                  {showAddGuest && (
                    <form onSubmit={handleAddGuest} className="space-y-2">
                      <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                        placeholder="Guest name (e.g. Shwetha)"
                        className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        autoCapitalize="words" />
                      {guestError && <p className="text-red-500 text-xs">{guestError}</p>}
                      <p className="text-xs text-gray-400">
                        Guests have no account. Any group member can mark their share as settled.
                      </p>
                      <button type="submit" disabled={addingGuest || !guestName.trim()}
                        className="w-full py-2.5 bg-purple-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40">
                        {addingGuest ? 'Adding…' : 'Add Guest'}
                      </button>
                    </form>
                  )}
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

      {/* Guest Settle Confirmation */}
      {guestSettleTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💵</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
              Settle {guestSettleTarget.name.replace(' (Guest)', '')}?
            </h3>
            <p className="text-gray-500 text-sm text-center mb-1">
              Outstanding amount: <span className="font-bold text-gray-800">{formatAmount(Math.abs(guestSettleTarget.net), group.currency)}</span>
            </p>
            <p className="text-xs text-center text-gray-400 mb-6">
              Mark as settled once you have collected their cash share.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setGuestSettleTarget(null)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl">
                Cancel
              </button>
              <button onClick={handleGuestSettle} disabled={settlingGuest}
                className="flex-1 py-3.5 bg-green-500 text-white font-semibold rounded-xl disabled:opacity-50">
                {settlingGuest ? 'Settling…' : 'Cash Received ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation */}
      {showDeleteGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete "{group.name}"?</h3>
            <p className="text-gray-500 text-sm mb-2">
              Permanently deletes the group and all expenses, splits, and settlements from the database.
            </p>
            <p className="text-red-500 text-xs mb-6 font-medium">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteGroup(false)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
              <button onClick={handleDeleteGroup} disabled={deletingGroup}
                className="flex-1 py-3.5 bg-red-500 text-white font-semibold rounded-xl disabled:opacity-50">
                {deletingGroup ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

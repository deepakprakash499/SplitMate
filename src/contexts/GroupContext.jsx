// @refresh reset
import { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MAX_GUESTS_PER_GROUP = 12
const GroupContext = createContext(null)

export function GroupProvider({ children }) {
  const [groups, setGroups] = useState([])
  const [groupMembers, setGroupMembers] = useState({})
  const [guestMembers, setGuestMembers] = useState({})
  const [expenses, setExpenses] = useState([])
  const [splits, setSplits] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Unified real + guest list for a group
  const allMembers = useCallback((groupId) => {
    const real = (groupMembers[groupId] || []).map(m => ({ ...m, isGuest: false }))
    const guest = (guestMembers[groupId] || []).map(g => ({
      id: g.id, full_name: g.name, isGuest: true
    }))
    return [...real, ...guest]
  }, [groupMembers, guestMembers])

  // ─── Groups ───────────────────────────────────────────────

  const fetchGroups = useCallback(async (userId) => {
    setLoading(true)
    setError(null)
    try {
      const { data: memberRows, error: mErr } = await supabase
        .from('group_members').select('group_id').eq('user_id', userId)
      if (mErr) throw mErr

      const groupIds = (memberRows || []).map(r => r.group_id)
      if (!groupIds.length) { setGroups([]); setLoading(false); return }

      const { data, error: gErr } = await supabase
        .from('expense_groups').select('*').in('id', groupIds)
        .order('created_at', { ascending: false })
      if (gErr) throw gErr

      setGroups(data || [])
      for (const g of data || []) {
        fetchMembers(g.id)
        fetchGuestMembers(g.id)
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  const createGroup = useCallback(async (name, description, currency, createdBy) => {
    setError(null)
    const { data, error: gErr } = await supabase
      .from('expense_groups')
      .insert({ name, description: description || null, currency, created_by: createdBy })
      .select().single()
    if (gErr) throw gErr

    const { error: mErr } = await supabase
      .from('group_members').insert({ group_id: data.id, user_id: createdBy })
    if (mErr) throw mErr

    setGroups(prev => [data, ...prev])
    await fetchMembers(data.id)
    await fetchGuestMembers(data.id)
    return data
  }, [])

  const deleteGroup = useCallback(async (groupId) => {
    const { error } = await supabase.from('expense_groups').delete().eq('id', groupId)
    if (error) throw error
    setGroups(prev => prev.filter(g => g.id !== groupId))
    setGroupMembers(prev => { const n = { ...prev }; delete n[groupId]; return n })
    setGuestMembers(prev => { const n = { ...prev }; delete n[groupId]; return n })
    setExpenses(prev => prev.filter(e => e.group_id !== groupId))
  }, [])

  // ─── Real Members ─────────────────────────────────────────

  const fetchMembers = useCallback(async (groupId) => {
    try {
      const { data: rows } = await supabase
        .from('group_members').select('user_id').eq('group_id', groupId)
      const userIds = (rows || []).map(r => r.user_id)
      if (!userIds.length) { setGroupMembers(prev => ({ ...prev, [groupId]: [] })); return }
      const { data: profiles } = await supabase
        .from('profiles').select('id, email, full_name').in('id', userIds)
      setGroupMembers(prev => ({ ...prev, [groupId]: profiles || [] }))
    } catch (e) { setError(e.message) }
  }, [])

  const addMember = useCallback(async (groupId, email) => {
    const { data: profiles } = await supabase
      .from('profiles').select('id, email, full_name').eq('email', email.toLowerCase().trim())
    if (!profiles?.length) throw new Error(`No user found with email: ${email}`)
    const profile = profiles[0]
    const existing = groupMembers[groupId] || []
    if (existing.some(m => m.id === profile.id))
      throw new Error(`${profile.full_name} is already in this group.`)
    const { error } = await supabase
      .from('group_members').insert({ group_id: groupId, user_id: profile.id })
    if (error) throw error
    setGroupMembers(prev => ({ ...prev, [groupId]: [...(prev[groupId] || []), profile] }))
    return profile
  }, [groupMembers])

  const removeMember = useCallback(async (groupId, userId) => {
    const { error } = await supabase
      .from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    if (error) throw error
    setGroupMembers(prev => ({
      ...prev, [groupId]: (prev[groupId] || []).filter(m => m.id !== userId)
    }))
  }, [])

  // ─── Guest Members ────────────────────────────────────────

  const fetchGuestMembers = useCallback(async (groupId) => {
    try {
      const { data } = await supabase
        .from('guest_members').select('*').eq('group_id', groupId)
        .order('created_at', { ascending: true })
      setGuestMembers(prev => ({ ...prev, [groupId]: data || [] }))
    } catch (e) { setError(e.message) }
  }, [])

  // Fetch recent guests created by current user across ALL groups (for quick-select)
  const fetchRecentGuests = useCallback(async (createdBy, excludeGroupId = null) => {
    try {
      let query = supabase
        .from('guest_members').select('id, name, group_id')
        .eq('created_by', createdBy)
        .order('created_at', { ascending: false })
        .limit(20)
      const { data } = await query
      if (!data) return []

      // Deduplicate by name (case-insensitive), keep most recent
      const seen = new Set()
      return data.filter(g => {
        const key = g.name.toLowerCase().trim()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).slice(0, 8)
    } catch (e) { return [] }
  }, [])

  const addGuestMember = useCallback(async (groupId, name, createdBy) => {
    // Enforce max 12 guests per group
    const existing = guestMembers[groupId] || []
    if (existing.length >= MAX_GUESTS_PER_GROUP)
      throw new Error(`Maximum ${MAX_GUESTS_PER_GROUP} guest members allowed per group.`)

    const { data, error } = await supabase
      .from('guest_members')
      .insert({ group_id: groupId, name: name.trim(), created_by: createdBy })
      .select().single()
    if (error) throw error
    setGuestMembers(prev => ({ ...prev, [groupId]: [...(prev[groupId] || []), data] }))
    return data
  }, [guestMembers])

  const removeGuestMember = useCallback(async (groupId, guestId) => {
    const { error } = await supabase.from('guest_members').delete().eq('id', guestId)
    if (error) throw error
    setGuestMembers(prev => ({
      ...prev, [groupId]: (prev[groupId] || []).filter(g => g.id !== guestId)
    }))
  }, [])

  // ─── Expenses ─────────────────────────────────────────────

  const fetchExpenses = useCallback(async (groupId) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses').select('*').eq('group_id', groupId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setExpenses(data || [])
      await Promise.all((data || []).map(e => fetchSplits(e.id)))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  function buildSplitInserts(expenseId, members, amount, splitType, splitValues, paidBy) {
    // Determine if the payer is a guest by checking if any member with that ID is a guest
    const paidByIsGuest = members.some(m => m.id === paidBy && m.isGuest)

    return members.map(member => {
      let splitAmount = 0
      if (splitType === 'equal') splitAmount = parseFloat((amount / members.length).toFixed(2))
      else if (splitType === 'percentage') splitAmount = parseFloat((amount * (splitValues[member.id] || 0) / 100).toFixed(2))
      else splitAmount = parseFloat(splitValues[member.id] || 0)

      if (member.isGuest) {
        return {
          expense_id: expenseId,
          user_id: null,
          guest_member_id: member.id,
          amount: splitAmount,
          is_settled: member.id === paidBy
        }
      } else {
        return {
          expense_id: expenseId,
          user_id: member.id,
          guest_member_id: null,
          amount: splitAmount,
          is_settled: !paidByIsGuest && member.id === paidBy
        }
      }
    })
  }

  const addExpense = useCallback(async ({
    groupId, description, amount, currency,
    paidBy, splitType, members, splitValues, createdBy
  }) => {
    setError(null)
    const { data: expense, error: eErr } = await supabase
      .from('expenses')
      .insert({ group_id: groupId, description, amount, currency, paid_by: paidBy, split_type: splitType, created_by: createdBy })
      .select().single()
    if (eErr) throw eErr

    const splitInserts = buildSplitInserts(expense.id, members, amount, splitType, splitValues, paidBy)
    const { error: sErr } = await supabase.from('expense_splits').insert(splitInserts)
    if (sErr) throw sErr

    setExpenses(prev => [expense, ...prev])
    await fetchSplits(expense.id)
    return expense
  }, [])

  const editExpense = useCallback(async ({
    expenseId, description, amount, currency, paidBy, splitType, members, splitValues
  }) => {
    setError(null)
    const { data: updatedExpense, error: uErr } = await supabase
      .from('expenses')
      .update({ description, amount, currency, paid_by: paidBy, split_type: splitType })
      .eq('id', expenseId).select().single()
    if (uErr) throw uErr

    const { error: dErr } = await supabase.from('expense_splits').delete().eq('expense_id', expenseId)
    if (dErr) throw dErr

    const splitInserts = buildSplitInserts(expenseId, members, amount, splitType, splitValues, paidBy)
    const { error: sErr } = await supabase.from('expense_splits').insert(splitInserts)
    if (sErr) throw sErr

    setExpenses(prev => prev.map(e => e.id === expenseId ? updatedExpense : e))
    await fetchSplits(expenseId)
  }, [])

  const deleteExpense = useCallback(async (expenseId) => {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (error) throw error
    setExpenses(prev => prev.filter(e => e.id !== expenseId))
    setSplits(prev => { const n = { ...prev }; delete n[expenseId]; return n })
  }, [])

  // ─── Splits ───────────────────────────────────────────────

  const fetchSplits = useCallback(async (expenseId) => {
    const { data, error } = await supabase.from('expense_splits').select('*').eq('expense_id', expenseId)
    if (!error) setSplits(prev => ({ ...prev, [expenseId]: data || [] }))
  }, [])

  // ─── Settle Up ────────────────────────────────────────────

  const settleUp = useCallback(async ({ groupId, fromUser, toUser, amount, currency, note }) => {
    setError(null)
    const { error: sErr } = await supabase
      .from('settlements')
      .insert({ group_id: groupId, from_user: fromUser, to_user: toUser, amount, currency, note: note || null })
    if (sErr) throw sErr

    const groupExpenses = expenses.filter(e => e.group_id === groupId)
    for (const expense of groupExpenses) {
      const expSplits = splits[expense.id] || []
      const targets = expense.paid_by === toUser
        ? expSplits.filter(s => s.user_id === fromUser && !s.is_settled)
        : expense.paid_by === fromUser
          ? expSplits.filter(s => s.user_id === toUser && !s.is_settled)
          : []
      for (const s of targets) {
        await supabase.from('expense_splits')
          .update({ is_settled: true, settled_at: new Date().toISOString() }).eq('id', s.id)
      }
    }
    for (const expense of groupExpenses) await fetchSplits(expense.id)
  }, [expenses, splits])

  const settleGuest = useCallback(async (groupId, guestMemberId) => {
    setError(null)
    const groupExpenses = expenses.filter(e => e.group_id === groupId)
    for (const expense of groupExpenses) {
      const expSplits = splits[expense.id] || []

      // Case 1: Guest owes — guest_member_id matches (guest was a recipient of split)
      const guestOwes = expSplits.filter(s => s.guest_member_id === guestMemberId && !s.is_settled)

      // Case 2: Guest paid — paid_by matches guest, settle all real member splits
      const guestPaid = expense.paid_by === guestMemberId
        ? expSplits.filter(s => s.user_id !== null && !s.is_settled)
        : []

      const toSettle = [...guestOwes, ...guestPaid]
      for (const s of toSettle) {
        await supabase.from('expense_splits')
          .update({ is_settled: true, settled_at: new Date().toISOString() }).eq('id', s.id)
      }
    }
    for (const expense of groupExpenses) await fetchSplits(expense.id)
  }, [expenses, splits])

  // ─── Balance Calculation ──────────────────────────────────

  const calculateBalances = useCallback((groupId, currentUserId) => {
    const realMembers = groupMembers[groupId] || []
    const guests = guestMembers[groupId] || []
    const balanceMap = {}

    for (const m of realMembers) {
      if (m.id !== currentUserId)
        balanceMap[`real_${m.id}`] = { userId: m.id, name: m.full_name, owesMe: 0, iOwe: 0, isGuest: false }
    }
    for (const g of guests)
      balanceMap[`guest_${g.id}`] = { userId: g.id, name: `${g.name} (Guest)`, owesMe: 0, iOwe: 0, isGuest: true }

    for (const expense of expenses.filter(e => e.group_id === groupId)) {
      const expSplits = splits[expense.id] || []
      if (expense.paid_by === currentUserId) {
        for (const split of expSplits) {
          if (!split.is_settled) {
            if (split.guest_member_id && balanceMap[`guest_${split.guest_member_id}`])
              balanceMap[`guest_${split.guest_member_id}`].owesMe += split.amount
            else if (split.user_id && split.user_id !== currentUserId && balanceMap[`real_${split.user_id}`])
              balanceMap[`real_${split.user_id}`].owesMe += split.amount
          }
        }
      } else {
        const mySplit = expSplits.find(s => s.user_id === currentUserId)
        if (mySplit && !mySplit.is_settled && balanceMap[`real_${expense.paid_by}`])
          balanceMap[`real_${expense.paid_by}`].iOwe += mySplit.amount
      }
    }

    return Object.values(balanceMap)
      .filter(b => Math.abs(b.owesMe - b.iOwe) > 0.005)
      .map(b => ({ ...b, net: b.owesMe - b.iOwe }))
  }, [groupMembers, guestMembers, expenses, splits])

  return (
    <GroupContext.Provider value={{
      groups, groupMembers, guestMembers, expenses, splits, loading, error,
      allMembers,
      fetchGroups, createGroup, deleteGroup,
      fetchMembers, addMember, removeMember,
      fetchGuestMembers, fetchRecentGuests, addGuestMember, removeGuestMember,
      fetchExpenses, addExpense, editExpense, deleteExpense,
      fetchSplits, settleUp, settleGuest, calculateBalances,
      setError
    }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroups() {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroups must be used within GroupProvider')
  return ctx
}

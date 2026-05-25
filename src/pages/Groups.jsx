import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useGroups } from '../contexts/GroupContext'
import { groupColor, shortDate } from '../utils/currency'
import CreateGroupModal from '../components/CreateGroupModal'

export default function Groups() {
  const { profile }  = useAuth()
  const { groups, groupMembers, guestMembers, fetchGroups, deleteGroup, loading } = useGroups()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId,   setDeleteId]   = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (profile?.id) fetchGroups(profile.id)
  }, [profile?.id])

  async function handleDelete(groupId) {
    try { await deleteGroup(groupId); setDeleteId(null) }
    catch (e) { alert(e.message) }
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="bg-black border-b border-zinc-900 px-5"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center justify-between pb-4">
          <h1 className="text-2xl font-bold text-white">SplitMate</h1>
          <button onClick={() => setShowCreate(true)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center active:bg-zinc-200">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-8 h-8 border-white border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
            <p className="text-sm text-zinc-500">Loading groups…</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-4 px-8">
            <div className="text-6xl">👥</div>
            <h3 className="text-lg font-semibold text-white">No groups yet</h3>
            <p className="text-sm text-zinc-500">Create a group to start tracking shared expenses.</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-2 px-6 py-3 bg-white text-black font-semibold rounded-xl text-sm">
              Create your first group
            </button>
          </div>
        ) : (
          groups.map(group => {
            const members   = groupMembers[group.id] || []
            const guests    = guestMembers[group.id] || []
            const color     = groupColor(group.name)
            const isCreator = group.created_by === profile?.id

            return (
              <div key={group.id} className="relative">
                <button
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 active:bg-zinc-800 text-left">
                  <div className="w-13 h-13 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                    style={{ width: 52, height: 52, background: color }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{group.name}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                      {guests.length > 0 && ` · ${guests.length} guest${guests.length !== 1 ? 's' : ''}`}
                      {' · '}{group.currency}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-zinc-600">{shortDate(group.created_at)}</p>
                    <svg className="w-4 h-4 text-zinc-700 mt-1.5 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>

                {/* Delete */}
                {isCreator && deleteId === group.id ? (
                  <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-2 z-10">
                    <button onClick={() => setDeleteId(null)}
                      className="px-3 py-2 text-xs text-zinc-400 bg-zinc-800 rounded-lg">Cancel</button>
                    <button onClick={() => handleDelete(group.id)}
                      className="px-3 py-2 text-xs text-white bg-red-600 rounded-lg">Delete</button>
                  </div>
                ) : isCreator ? (
                  <button onClick={e => { e.stopPropagation(); setDeleteId(group.id) }}
                    className="absolute right-3 top-3 w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
      {deleteId && <div className="fixed inset-0 z-40" onClick={() => setDeleteId(null)} />}
    </div>
  )
}

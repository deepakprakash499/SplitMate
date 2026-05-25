import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { CURRENCIES } from '../utils/currency'
import Avatar from '../components/Avatar'

export default function Profile() {
  const { profile, signOut } = useAuth()
  const [showSignOut, setShowSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  const rows = [
    { label: 'Full Name', value: profile?.full_name },
    { label: 'Email', value: profile?.email },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-5" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <h1 className="text-2xl font-bold text-gray-900 pb-4">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 flex items-center gap-4">
          <Avatar name={profile?.full_name || ''} size="lg" />
          <div>
            <p className="font-bold text-gray-900 text-lg">{profile?.full_name}</p>
            <p className="text-sm text-gray-400">{profile?.email}</p>
          </div>
        </div>

        {/* Supported currencies */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Supported Currencies</p>
          <div className="divide-y divide-gray-50">
            {CURRENCIES.map(c => (
              <div key={c.code} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{c.flag}</span>
                <span className="font-semibold text-sm text-gray-700 w-10">{c.code}</span>
                <span className="text-sm text-gray-400">{c.name}</span>
                <span className="ml-auto text-sm font-bold text-gray-500">{c.symbol}</span>
              </div>
            ))}
          </div>
        </div>

        {/* App info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">App Info</p>
          <div className="divide-y divide-gray-50">
            {[['Version', '1.0.0'], ['Backend', 'Supabase'], ['Platform', 'PWA (iOS)']].map(([k, v]) => (
              <div key={k} className="flex items-center px-4 py-3">
                <span className="text-sm text-gray-600">{k}</span>
                <span className="ml-auto text-sm text-gray-400">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => setShowSignOut(true)}
          className="w-full bg-red-50 text-red-500 font-semibold py-4 rounded-2xl text-sm"
        >
          Sign Out
        </button>
      </div>

      {/* Sign out confirmation */}
      {showSignOut && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Sign Out</h3>
            <p className="text-gray-500 text-sm mb-6">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSignOut(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
              <button onClick={handleSignOut} disabled={signingOut} className="flex-1 py-3.5 bg-red-500 text-white font-semibold rounded-xl disabled:opacity-50">
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

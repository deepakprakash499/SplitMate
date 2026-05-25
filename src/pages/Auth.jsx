import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [isSignUp,  setIsSignUp]  = useState(false)
  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (isSignUp) {
        if (!fullName.trim()) throw new Error('Please enter your full name.')
        if (password.length < 6) throw new Error('Password must be at least 6 characters.')
        await signUp(email, password, fullName.trim())
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      const msg = err.message?.toLowerCase() || ''
      if (msg.includes('invalid') || msg.includes('credentials')) setError('Incorrect email or password.')
      else if (msg.includes('already')) setError('This email is already registered. Try signing in.')
      else setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-black"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">SplitMate</h1>
          <p className="text-zinc-500 text-sm mt-1">Track shared expenses with friends</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-white mb-5">
            {isSignUp ? 'Create Account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-4 py-3.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
                autoCapitalize="words" required={isSignUp} />
            )}

            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full px-4 py-3.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
              autoCapitalize="none" autoCorrect="off" required />

            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Password"
                className="w-full px-4 py-3.5 pr-12 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl text-sm focus:outline-none focus:border-zinc-500"
                required />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 p-1">
                {showPass
                  ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                }
              </button>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-950 border border-red-900 px-4 py-3 rounded-xl flex items-start gap-2">
                <span className="mt-0.5">⚠️</span><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-4 mt-1 rounded-xl font-semibold text-black bg-white active:bg-zinc-200 disabled:opacity-40 transition-all">
              {loading
                ? (isSignUp ? 'Creating account…' : 'Signing in…')
                : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <button onClick={() => { setIsSignUp(p => !p); setError(''); setPassword('') }}
            className="mt-5 w-full text-center text-sm text-zinc-500">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span className="text-white font-semibold">{isSignUp ? 'Sign In' : 'Sign Up'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

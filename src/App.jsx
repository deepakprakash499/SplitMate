import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { GroupProvider } from './contexts/GroupContext'
import Auth from './pages/Auth'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-green-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <GroupProvider>
      <div
        className="flex flex-col bg-gray-50"
        style={{ height: '100dvh' }}
      >
        <div className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/groups" replace />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/groups" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </GroupProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  const base = 'flex flex-col items-center gap-1 text-xs font-medium transition-colors pt-2'
  const active = 'text-green-600'
  const inactive = 'text-gray-400'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
    >
      <NavLink to="/groups" className={({ isActive }) => `flex-1 ${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => (
          <>
            <svg className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isActive ? 0 : 1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <span>Groups</span>
          </>
        )}
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `flex-1 ${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => (
          <>
            <svg className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isActive ? 0 : 1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Profile</span>
          </>
        )}
      </NavLink>
    </nav>
  )
}

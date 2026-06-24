import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, ClipboardCheck, Car, LogOut, Menu, X, Bell, User,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/anagrafiche', icon: Users, label: 'Anagrafiche' },
  { to: '/turni', icon: CalendarDays, label: 'Turni' },
  { to: '/presenze', icon: ClipboardCheck, label: 'Presenze' },
  { to: '/veicoli', icon: Car, label: 'Veicoli' },
]

const navGradients: Record<string, string> = {
  '/dashboard': 'from-blue-500 to-cyan-400',
  '/anagrafiche': 'from-violet-500 to-purple-400',
  '/turni': 'from-emerald-500 to-green-400',
  '/presenze': 'from-orange-500 to-amber-400',
  '/veicoli': 'from-rose-500 to-pink-400',
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100/50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 transform transition-all duration-300 ease-out
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">Logistica</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${navGradients[item.to]} opacity-90`} />
                  )}
                  <div className={`relative z-10 flex items-center gap-3 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
                    <item.icon className={`w-5 h-5 ${isActive ? 'drop-shadow-sm' : ''}`} />
                    {item.label}
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm min-w-0">
              <p className="font-medium text-gray-800 truncate">{profile?.first_name} {profile?.last_name}</p>
              <p className="text-gray-400 text-xs capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 w-full px-3 py-2 rounded-lg hover:bg-red-50/50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Esci
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-500" />
          </button>
          <div className="flex-1" />
          <button className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-red-500 to-rose-400 rounded-full ring-2 ring-white" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

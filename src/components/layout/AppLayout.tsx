import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Car, LogOut, Menu, X, Bell, User, Package,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Notification } from '../../types/database'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/anagrafiche', icon: Users, label: 'Anagrafiche' },
  { to: '/turni', icon: CalendarDays, label: 'Turni' },
  { to: '/veicoli', icon: Car, label: 'Veicoli' },
  { to: '/inventario', icon: Package, label: 'Inventario' },
]

const navGradients: Record<string, string> = {
  '/dashboard': 'from-blue-500 to-cyan-400',
  '/anagrafiche': 'from-violet-500 to-purple-400',
  '/turni': 'from-emerald-500 to-green-400',
  '/veicoli': 'from-rose-500 to-pink-400',
  '/inventario': 'from-violet-500 to-purple-400',
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (isAdmin && profile?.organization_id) loadNotifications()
  }, [isAdmin, profile?.organization_id])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadNotifications() {
    if (!profile?.organization_id) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    loadNotifications()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100/50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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
            <X className="w-5 h-5 text-gray-500" />
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-500" />
          </button>
          <div className="flex-1" />
          <div className="relative" ref={notifRef}>
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-gradient-to-r from-red-500 to-rose-400 rounded-full ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Notifiche</span>
                  <span className="text-xs text-gray-400">{unreadCount} non lette</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-300 text-sm">Nessuna notifica</div>
                ) : (
                  notifications.map(n => (
                    <button key={n.id} onClick={() => { if (!n.is_read) markRead(n.id) }}
                      className={`w-full text-left p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${n.is_read ? 'opacity-60' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-gray-300 mt-1">{format(parseISO(n.created_at), "d MMM HH:mm", { locale: it })}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

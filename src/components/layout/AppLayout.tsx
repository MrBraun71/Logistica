import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Notification } from '../../types/database'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/turni', icon: 'calendar_month', label: 'Turni' },
  { to: '/veicoli', icon: 'local_shipping', label: 'Veicoli' },
  { to: '/inventario', icon: 'inventory_2', label: 'Inventario' },
  { to: '/contatti', icon: 'contact_page', label: 'Contatti' },
]

const mobileNavItems = navItems.slice(0, 4)

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!isAdmin || !profile?.organization_id) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 15000)
    return () => clearInterval(interval)
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
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-[260px] h-screen fixed left-0 top-0 bg-surface-container-lowest flex-col py-6 px-4 z-50 shadow-[0_0_20px_rgba(29,53,128,0.06)] transition-transform duration-300 ${sidebarOpen ? 'flex' : 'hidden'} lg:flex`}>
        <div className="mb-8 px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary">
              <Icon name="volunteer_activism" />
            </div>
            <div>
              <h1 className="font-headline text-headline-md font-bold text-primary leading-tight">Croce Rossa Italiana</h1>
              <p className="text-on-surface-variant text-label-caps">Comitato di Molfetta</p>
            </div>
          </div>
          <button className="lg:hidden p-2 text-on-surface-variant hover:text-primary" onClick={() => setSidebarOpen(false)}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex-grow space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary font-semibold bg-primary-container/10 border-r-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`
              }
            >
              <Icon name={item.icon} />
              <span className="text-body-md">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="pt-6 mt-auto border-t border-outline-variant">
          <button
            onClick={() => { navigate('/turni') }}
            className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl text-body-md font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 mb-4 shadow-sm"
          >
            <Icon name="add" /> Nuovo Turno
          </button>
          <span className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-default">
            <Icon name="help" />
            <span className="text-body-md">Supporto</span>
          </span>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        {/* Top bar — glass-header */}
        <header className="top-0 sticky z-40 glass-header flex justify-between items-center h-16 px-container-padding border-b border-surface-container-low">
          <div className="flex items-center gap-6 flex-1">
            <button className="lg:hidden p-2 text-on-surface-variant hover:text-primary" onClick={() => setSidebarOpen(true)}>
              <Icon name="menu" />
            </button>
            <div className="relative w-full max-w-md hidden md:block">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
              <input
                className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary text-body-md placeholder:text-on-surface-variant/60"
                placeholder="Cerca..."
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotif(!showNotif)} className="p-2 text-on-surface-variant hover:text-primary transition-all active:scale-95 relative">
                <Icon name="notifications" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-error text-on-error rounded-full ring-2 ring-surface flex items-center justify-center text-[9px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl soft-card-shadow z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                    <span className="text-body-md font-semibold text-on-surface">Notifiche</span>
                    <span className="text-label-caps text-on-surface-variant">{unreadCount} non lette</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-on-surface-variant text-body-md">Nessuna notifica</div>
                  ) : (
                    notifications.map(n => (
                      <button key={n.id} onClick={() => { if (!n.is_read) markRead(n.id) }}
                        className={`w-full text-left p-4 flex items-start gap-3 hover:bg-surface-container transition-colors border-b border-outline-variant last:border-0 ${n.is_read ? 'opacity-60' : ''}`}>
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-primary'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-body-md font-medium text-on-surface truncate">{n.title}</p>
                          <p className="text-label-caps text-on-surface-variant mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-outline mt-1">{format(parseISO(n.created_at), "d MMM HH:mm", { locale: it })}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button className="p-2 text-on-surface-variant hover:text-primary transition-all active:scale-95">
              <Icon name="history" />
            </button>
            <div className="h-8 w-px bg-outline-variant mx-2 hidden sm:block" />
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleSignOut}>
              <div className="text-right hidden sm:block">
                <p className="text-body-md font-semibold text-on-surface">{profile?.first_name}</p>
                <p className="text-label-caps text-on-surface-variant">{isAdmin ? 'Amministratore' : 'Utente'}</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-primary-container bg-primary-fixed flex items-center justify-center text-primary font-bold text-body-md">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-container-padding min-h-screen">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation (Mobile) — redesigned */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface-container-lowest/90 backdrop-blur-lg rounded-t-xl shadow-[0_-4px_12px_rgba(29,53,128,0.08)] lg:hidden">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <Icon name={item.icon} />
            <span className="text-label-caps">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* FAB for Mobile */}
      {!location.pathname.endsWith('/dashboard') && (
        <button
          onClick={() => {
            if (location.pathname.endsWith('/turni')) navigate('/turni?nuovo')
            else if (location.pathname.endsWith('/veicoli')) navigate('/veicoli?nuovo')
            else if (location.pathname.endsWith('/inventario')) navigate('/inventario?nuovo')
          }}
          className="fixed right-6 bottom-20 w-14 h-14 bg-primary text-on-primary rounded-full shadow-xl flex items-center justify-center lg:hidden active:scale-90 transition-all"
        >
          <Icon name="add" className="text-3xl" />
        </button>
      )}
    </div>
  )
}

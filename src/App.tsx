import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { AppLayout } from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TurniPage from './pages/turni/TurniPage'
import VeicoliPage from './pages/veicoli/VeicoliPage'
import InventarioPage from './pages/inventario/InventarioPage'
import ContactsPage from './pages/ContactsPage'
import SupportPage from './pages/SupportPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function ConfigCheck({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-5 shadow-sm">
            <span className="material-symbols-outlined text-on-primary text-3xl">warning</span>
          </div>
          <h1 className="text-headline-md text-on-surface mb-2">Configurazione mancante</h1>
          <p className="text-body-md text-on-surface-variant mb-6">
            Imposta le variabili <code className="text-label-xs bg-surface-container-high px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> e{' '}
            <code className="text-label-xs bg-surface-container-high px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> nel workflow GitHub.
          </p>
          <p className="text-label-caps text-on-surface-variant">
            Vedi il README per le istruzioni di configurazione.
          </p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  return (
    <ConfigCheck>
    <BrowserRouter basename="/Logistica">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/turni" element={<TurniPage />} />
            <Route path="/veicoli" element={<VeicoliPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/contatti" element={<ContactsPage />} />
            <Route path="/supporto" element={<SupportPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ConfigCheck>
  )
}

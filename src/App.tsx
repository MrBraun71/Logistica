import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { AppLayout } from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AnagrafichePage from './pages/anagrafiche/AnagrafichePage'
import TurniPage from './pages/turni/TurniPage'
import PresenzePage from './pages/presenze/PresenzePage'
import VeicoliPage from './pages/veicoli/VeicoliPage'
import InventarioPage from './pages/inventario/InventarioPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function ConfigCheck({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" /></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Configurazione mancante</h1>
          <p className="text-sm text-gray-400 mb-6">
            Imposta le variabili <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> e{' '}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> nel workflow GitHub.
          </p>
          <p className="text-xs text-gray-400">
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
            <Route path="/anagrafiche" element={<AnagrafichePage />} />
            <Route path="/turni" element={<TurniPage />} />
            <Route path="/presenze" element={<PresenzePage />} />
            <Route path="/veicoli" element={<VeicoliPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ConfigCheck>
  )
}

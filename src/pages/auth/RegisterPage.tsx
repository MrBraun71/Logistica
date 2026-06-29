import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signUp(email, password, { first_name: firstName, last_name: lastName })
    if (error) setError(error)
    else navigate('/login')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-container-padding">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="material-symbols-outlined text-on-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
          </div>
          <h1 className="text-headline-lg text-on-surface">Croce Rossa Italiana</h1>
          <p className="text-on-surface-variant text-body-lg mt-1">Comitato di Molfetta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl soft-card-shadow p-6 space-y-4">
          <h2 className="text-headline-md text-on-surface">Registrazione</h2>

          {error && (
            <div className="bg-error-container text-on-error-container text-body-md p-3 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Nome</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all" required />
            </div>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-1">Cognome</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all" required />
            </div>
          </div>

          <div>
            <label className="block text-label-caps text-on-surface-variant mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 bg-white border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all" required />
          </div>

          <div>
            <label className="block text-label-caps text-on-surface-variant mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 bg-white border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all" required minLength={6} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full h-[52px] bg-primary text-on-primary text-body-md font-semibold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm">
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>

          <p className="text-center text-body-md text-on-surface-variant">
            Hai già un account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">Accedi</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

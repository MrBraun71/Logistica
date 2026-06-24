import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, data: Partial<Profile>) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) ensureProfile(u)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) ensureProfile(u)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function ensureProfile(u: User) {
    setLoading(true)

    // Try to find profile by id (works with both schema versions)
    const { data: existing, error: selectErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle()

    if (existing) {
      setProfile(existing)
      setLoading(false)
      return
    }

    if (selectErr) {
      console.warn('Profile SELECT failed, will try INSERT:', selectErr.message)
    }

    // Try to create profile with id = auth user id
    const meta = u.user_metadata || {}
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: u.id,
      organization_id: null,
      first_name: meta.first_name ?? meta.name ?? u.email?.split('@')[0] ?? '',
      last_name: meta.last_name ?? '',
      email: u.email,
      role: 'volunteer',
      is_active: true,
    })

    if (insertErr) {
      console.error('Profile INSERT failed:', insertErr)
      setLoading(false)
      return
    }

    // Re-read after insert
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle()

    if (newProfile) setProfile(newProfile)
    setLoading(false)
  }

  async function refreshProfile() {
    if (!user) return
    await ensureProfile(user)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string, data: Partial<Profile>) {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: data.first_name, last_name: data.last_name } },
    })
    return { error: signUpError?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

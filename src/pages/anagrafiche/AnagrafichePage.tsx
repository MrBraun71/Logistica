import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Profile } from '../../types/database'
import { Search, Pencil, Trash2, UserPlus, Building2, X } from 'lucide-react'

const roleGradients: Record<string, string> = {
  admin: 'from-red-500 to-rose-400',
  director: 'from-purple-500 to-violet-400',
  employee: 'from-emerald-500 to-green-400',
  operator: 'from-orange-500 to-amber-400',
  volunteer: 'from-blue-500 to-cyan-400',
}

const roleLabels: Record<string, string> = {
  admin: 'Admin', director: 'Direttivo', employee: 'Dipendente', operator: 'Operatore', volunteer: 'Volontario',
}

export default function AnagrafichePage() {
  const { profile: currentUser, loading, refreshProfile } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showOrgSetup, setShowOrgSetup] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<'cri' | 'public_assistance' | 'other'>('cri')

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', role: 'volunteer' as Profile['role'],
  })

  useEffect(() => { if (currentUser?.organization_id) loadMembers() }, [currentUser?.organization_id])

  async function loadMembers() {
    if (!currentUser?.organization_id) return
    const { data } = await supabase.from('profiles').select('*').eq('organization_id', currentUser.organization_id).order('last_name')
    if (data) setMembers(data)
  }

  const filtered = members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()))

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('create_organization', { org_name: orgName, org_type: orgType })
      if (rpcErr) throw rpcErr
      if (data?.error) throw new Error(data.error)
      setShowOrgSetup(false); await refreshProfile()
    } catch (err: any) { setError(err.message || 'Errore durante la creazione') }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!currentUser?.organization_id) { setError('Nessuna organizzazione'); return }
    try {
      if (editing) {
        const { error: err } = await supabase.from('profiles').update(form).eq('id', editing.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('profiles').insert({ ...form, organization_id: currentUser.organization_id, is_active: true })
        if (err) throw err
      }
      setShowForm(false); setEditing(null)
      setForm({ first_name: '', last_name: '', email: '', phone: '', role: 'volunteer' })
      loadMembers()
    } catch (err: any) { setError(err.message || 'Errore durante il salvataggio') }
  }

  function startEdit(m: Profile) {
    setEditing(m); setForm({ first_name: m.first_name, last_name: m.last_name, email: m.email ?? '', phone: m.phone ?? '', role: m.role }); setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (confirm('Confermi di voler eliminare questo profilo?')) {
      await supabase.from('profiles').update({ is_active: false }).eq('id', id)
      loadMembers()
    }
  }

  if (loading) return <div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" /><p className="text-sm text-gray-400">Caricamento...</p></div>
  if (!currentUser) return <div className="text-center py-16 text-gray-400"><p>Errore di connessione.</p></div>

  if (!currentUser.organization_id) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Benvenuto su Logistica</h2>
          <p className="text-sm text-gray-400 mb-6">Crea la tua organizzazione per iniziare</p>
          <button onClick={() => setShowOrgSetup(true)} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all">
            Crea Organizzazione
          </button>
        </div>

        {showOrgSetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Crea Organizzazione</h2>
              {error && <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
                  <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                  <select value={orgType} onChange={e => setOrgType(e.target.value as any)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all">
                    <option value="cri">Croce Rossa</option>
                    <option value="public_assistance">Pubblica Assistenza</option>
                    <option value="other">Altro</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 transition-all">Crea</button>
                  <button type="button" onClick={() => { setShowOrgSetup(false); setError(null) }} className="flex-1 py-2.5 bg-white text-gray-600 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 transition-all">Annulla</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Anagrafiche</h1><p className="text-gray-400 text-sm mt-0.5">Gestione volontari e personale</p></div>
        <button onClick={() => { setEditing(null); setError(null); setForm({ first_name: '', last_name: '', email: '', phone: '', role: 'volunteer' }); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200">
          <UserPlus className="w-4 h-4" /> Nuovo
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input type="text" placeholder="Cerca volontari..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm" />
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Modifica' : 'Nuovo'} Volontario</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome</label>
                  <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Cognome</label>
                  <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Telefono</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Ruolo</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Profile['role'] })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <option value="volunteer">Volontario</option>
                  <option value="employee">Dipendente</option>
                  <option value="operator">Operatore</option>
                  <option value="director">Direttivo</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 transition-all">{editing ? 'Salva' : 'Crea'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="flex-1 py-2.5 bg-white text-gray-600 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 transition-all">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider hidden md:table-cell">Telefono</th>
                <th className="text-left px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider">Ruolo</th>
                <th className="text-right px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleGradients[m.role]} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                        {m.first_name?.[0]}{m.last_name?.[0]}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{m.first_name} {m.last_name}</span>
                        {!m.is_active && <span className="ml-2 text-[10px] text-red-400">(Inattivo)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-400 hidden sm:table-cell">{m.email || '—'}</td>
                  <td className="px-4 py-3.5 text-gray-400 hidden md:table-cell">{m.phone || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block text-[11px] px-2.5 py-1 rounded-lg font-medium text-white bg-gradient-to-r ${roleGradients[m.role]}`}>
                      {roleLabels[m.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button onClick={() => startEdit(m)} className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-300">Nessun volontario trovato</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

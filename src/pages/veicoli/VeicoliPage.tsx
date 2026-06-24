import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Vehicle } from '../../types/database'
import { Search, Pencil, Car, Plus, X, Circle } from 'lucide-react'

const typeGradients: Record<string, string> = {
  Ambulanza: 'from-red-500 to-rose-400',
  Auto: 'from-blue-500 to-cyan-400',
  Furgone: 'from-orange-500 to-amber-400',
}

export default function VeicoliPage() {
  const { profile: currentUser } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', license_plate: '', type: '' })

  useEffect(() => { if (currentUser?.organization_id) loadVehicles() }, [currentUser?.organization_id])

  async function loadVehicles() {
    if (!currentUser?.organization_id) return
    const { data } = await supabase.from('vehicles').select('*').eq('organization_id', currentUser.organization_id).order('name')
    if (data) setVehicles(data)
  }

  const filtered = vehicles.filter(v => `${v.name} ${v.license_plate}`.toLowerCase().includes(search.toLowerCase()))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!currentUser?.organization_id) { setError('Nessuna organizzazione'); return }
    try {
      if (editing) {
        await supabase.from('vehicles').update(form).eq('id', editing.id)
      } else {
        await supabase.from('vehicles').insert({ ...form, organization_id: currentUser.organization_id, is_active: true })
      }
      setShowForm(false); setEditing(null); setForm({ name: '', license_plate: '', type: '' }); loadVehicles()
    } catch (err: any) { setError(err.message || 'Errore') }
  }

  function startEdit(v: Vehicle) { setEditing(v); setForm({ name: v.name, license_plate: v.license_plate, type: v.type ?? '' }); setShowForm(true) }

  async function handleToggleActive(v: Vehicle) {
    await supabase.from('vehicles').update({ is_active: !v.is_active }).eq('id', v.id)
    loadVehicles()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Veicoli</h1><p className="text-gray-400 text-sm mt-0.5">Gestione mezzi e automezzi</p></div>
        <button onClick={() => { setEditing(null); setError(null); setForm({ name: '', license_plate: '', type: '' }); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-medium shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-0.5 transition-all duration-200">
          <Plus className="w-4 h-4" /> Nuovo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input type="text" placeholder="Cerca veicoli..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all shadow-sm" />
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Modifica' : 'Nuovo'} Veicolo</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Targa</label>
                <input type="text" value={form.license_plate} onChange={e => setForm({ ...form, license_plate: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo</label>
                <input type="text" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="es. Ambulanza, Auto, Furgone" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-400 text-white rounded-xl text-sm font-medium shadow-lg shadow-rose-200 transition-all">{editing ? 'Salva' : 'Crea'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="flex-1 py-2.5 bg-white text-gray-600 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 transition-all">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((v) => (
          <div key={v.id} className={`group bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 ${v.is_active ? 'border-gray-100' : 'border-red-100 bg-red-50/30'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${typeGradients[v.type as keyof typeof typeGradients] || 'from-gray-400 to-gray-300'} flex items-center justify-center shadow-sm`}>
                <Car className="w-6 h-6 text-white" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(v)} className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleToggleActive(v)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                  <Circle className={`w-4 h-4 ${v.is_active ? '' : 'fill-red-400 text-red-400'}`} />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900">{v.name}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{v.license_plate}{v.type ? ` • ${v.type}` : ''}</p>
            <div className="mt-3">
              <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${v.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {v.is_active ? 'Attivo' : 'Inattivo'}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-300 bg-white rounded-2xl border border-gray-100">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nessun veicolo trovato</p>
          </div>
        )}
      </div>
    </div>
  )
}

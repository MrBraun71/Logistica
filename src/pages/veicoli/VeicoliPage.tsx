import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Vehicle } from '../../types/database'

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const typeIcone: Record<string, string> = {
  Ambulanza: 'local_hospital',
  Auto: 'directions_car',
  Furgone: 'local_shipping',
}

export default function VeicoliPage() {
  const { profile: currentUser } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', license_plate: '', type: '' })

  useEffect(() => {
    if (searchParams.has('nuovo')) {
      setEditing(null); setError(null); setForm({ name: '', license_plate: '', type: '' }); setShowForm(true)
      navigate('/veicoli', { replace: true })
    }
  }, [searchParams, navigate])

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

  async function handleDeleteVehicle(id: string) {
    if (!confirm('Eliminare questo veicolo? L\'operazione è irreversibile.')) return
    await supabase.from('shift_vehicles').delete().eq('vehicle_id', id)
    await supabase.from('vehicles').delete().eq('id', id)
    loadVehicles()
  }

  return (
    <div className="max-w-[1080px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-lg text-on-surface">Veicoli</h2>
          <p className="text-on-surface-variant text-body-lg">Gestione mezzi e automezzi</p>
        </div>
        <button onClick={() => { setEditing(null); setError(null); setForm({ name: '', license_plate: '', type: '' }); setShowForm(true) }}
          className="bg-primary text-on-primary py-3 px-6 rounded-xl text-body-md font-semibold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-sm">
          <Icon name="add" /> Nuovo
        </button>
      </div>

      <div className="relative">
        <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
        <input type="text" placeholder="Cerca veicoli..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all soft-card-shadow" />
      </div>

      {error && <div className="bg-error-container text-on-error-container text-body-md p-3 rounded-xl">{error}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-md text-on-surface">{editing ? 'Modifica' : 'Nuovo'} Veicolo</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors"><Icon name="close" className="text-on-surface-variant" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-label-caps text-on-surface-variant mb-1.5">Nome</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" required />
              </div>
              <div>
                <label className="block text-label-caps text-on-surface-variant mb-1.5">Targa</label>
                <input type="text" value={form.license_plate} onChange={e => setForm({ ...form, license_plate: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" required />
              </div>
              <div>
                <label className="block text-label-caps text-on-surface-variant mb-1.5">Tipo</label>
                <input type="text" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="es. Ambulanza, Auto, Furgone" className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 h-[52px] bg-primary text-on-primary text-body-md font-semibold rounded-xl hover:brightness-110 transition-all active:scale-[0.98] shadow-sm">{editing ? 'Salva' : 'Crea'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="flex-1 h-[52px] bg-white text-on-surface-variant text-body-md font-semibold rounded-xl border border-outline-variant hover:bg-surface-container transition-all">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((v) => (
          <div key={v.id} className={`group bg-surface-container-lowest rounded-2xl p-5 soft-card-shadow border transition-all ${v.is_active ? 'border-surface-container-low' : 'border-error-container bg-error-container/10'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-container/10 flex items-center justify-center">
                <Icon name={typeIcone[v.type as keyof typeof typeIcone] || 'directions_car'} className="text-primary text-2xl" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(v)} className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><Icon name="edit" className="text-[18px]" /></button>
                <button onClick={() => handleToggleActive(v)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors">
                  <Icon name={v.is_active ? 'toggle_off' : 'toggle_on'} className="text-[18px]" />
                </button>
                <button onClick={() => handleDeleteVehicle(v.id)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors" title="Elimina">
                  <Icon name="delete" className="text-[18px]" />
                </button>
              </div>
            </div>
            <h3 className="text-body-md font-semibold text-on-surface">{v.name}</h3>
            <p className="text-body-md text-on-surface-variant mt-0.5">{v.license_plate}{v.type ? ` • ${v.type}` : ''}</p>
            <div className="mt-3">
              <span className={`text-status-label px-2.5 py-1 rounded-lg font-semibold ${v.is_active ? 'status-disponibile' : 'bg-error-container text-on-error-container'}`}>
                {v.is_active ? 'Attivo' : 'Inattivo'}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl soft-card-shadow border border-surface-container-low">
            <Icon name="local_shipping" className="text-4xl opacity-50 mb-3" />
            <p className="text-body-md">Nessun veicolo trovato</p>
          </div>
        )}
      </div>
    </div>
  )
}

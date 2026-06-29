import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Shift, ShiftAssignment, Vehicle, Profile, Equipment, ShiftEquipment, ShiftVehicle } from '../../types/database'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface ShiftFull extends Shift {
  vehicles?: Vehicle
  shift_vehicles?: (ShiftVehicle & { vehicles?: Vehicle })[]
  shift_assignments?: (ShiftAssignment & { profiles?: Profile })[]
  shift_equipment?: (ShiftEquipment & { equipment?: Equipment })[]
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const categoriaIcone: Record<string, string> = {
  DAE: 'medical_services',
  Borsone: 'backpack',
  Gazebo: 'tent',
  Computer: 'computer',
  Rollup: 'flag',
}

export default function TurniPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [shifts, setShifts] = useState<ShiftFull[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [equipmentItems, setEquipmentItems] = useState<Equipment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ShiftFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tutti')
  const [equipSearch, setEquipSearch] = useState('')
  const [equipSearchMode, setEquipSearchMode] = useState<'tutti' | 'id' | 'categoria'>('tutti')
  const [form, setForm] = useState({
    title: '', description: '', start_time: '', end_time: '',
    type: 'ordinario' as Shift['type'], max_volunteers: 1,
  })
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({})

  useEffect(() => {
    if (searchParams.has('nuovo')) {
      setEditing(null); setError(null)
      setForm({ title: '', description: '', start_time: '', end_time: '', type: 'ordinario', max_volunteers: 1 })
      setSelectedVehicles([]); setSelectedEquipment({}); setShowForm(true)
      navigate('/turni', { replace: true })
    }
  }, [searchParams, navigate])

  useEffect(() => {
    if (profile?.organization_id) { loadShifts(); loadVehicles(); loadEquipment() }
  }, [profile?.organization_id])

  async function loadShifts() {
    if (!profile?.organization_id) return
    const { data } = await supabase
      .from('shifts')
      .select('*, shift_vehicles(*, vehicles:vehicle_id(*)), shift_assignments(*, profiles:profile_id(*)), shift_equipment(*, equipment:equipment_id(*))')
      .eq('organization_id', profile.organization_id)
      .order('start_time', { ascending: false })
    if (data) setShifts(data)
  }

  async function loadVehicles() {
    if (!profile?.organization_id) return
    const { data } = await supabase.from('vehicles').select('*').eq('organization_id', profile.organization_id).eq('is_active', true)
    if (data) setVehicles(data)
  }

  async function loadEquipment() {
    if (!profile?.organization_id) return
    const { data } = await supabase.from('equipment').select('*').eq('organization_id', profile.organization_id).eq('is_active', true).order('articolo')
    if (data) setEquipmentItems(data)
  }

  const filtered = (filter === 'tutti' ? shifts : shifts.filter(s => s.status === filter)).filter(s =>
    !search || `${s.title} ${s.type} ${s.description || ''} ${s.start_time.slice(0, 10)}`.toLowerCase().includes(search.toLowerCase())
  )

  const equipFiltered = equipmentItems.filter(e => {
    if (!equipSearch) return true
    const q = equipSearch.toLowerCase()
    if (equipSearchMode === 'id') return e.id_numero.toLowerCase().includes(q)
    if (equipSearchMode === 'categoria') return e.categoria.toLowerCase().includes(q)
    return `${e.articolo} ${e.id_numero} ${e.categoria}`.toLowerCase().includes(q)
  })

  function toggleVehicle(id: string) {
    setSelectedVehicles(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!profile?.id || !profile?.organization_id) { setError('Profilo non trovato'); return }
    try {
      const shiftData = {
        title: form.title, description: form.description,
        start_time: form.start_time, end_time: form.end_time, type: form.type,
        max_volunteers: form.max_volunteers,
      }

      if (editing) {
        const { error: err } = await supabase.from('shifts').update(shiftData).eq('id', editing.id)
        if (err) throw err
        await supabase.from('shift_vehicles').delete().eq('shift_id', editing.id)
        await supabase.from('shift_equipment').delete().eq('shift_id', editing.id)
        if (selectedVehicles.length > 0) {
          await supabase.from('shift_vehicles').insert(selectedVehicles.map(v => ({ shift_id: editing.id, vehicle_id: v })))
        }
        const seEntries = Object.entries(selectedEquipment).filter(([, qty]) => qty > 0)
        if (seEntries.length > 0) {
          const { error: seErr } = await supabase.from('shift_equipment').insert(
            seEntries.map(([eqId, qty]) => ({ shift_id: editing.id, equipment_id: eqId, quantity: qty }))
          )
          if (seErr) throw seErr
        }
      } else {
        const { data: newShift, error: err } = await supabase.from('shifts').insert({
          ...shiftData, organization_id: profile.organization_id, status: 'aperto', created_by: profile.id,
        }).select()
        if (err) throw err

        if (newShift?.[0]?.id) {
          const sid = newShift[0].id
          if (selectedVehicles.length > 0) {
            await supabase.from('shift_vehicles').insert(selectedVehicles.map(v => ({ shift_id: sid, vehicle_id: v })))
          }
          const seEntries = Object.entries(selectedEquipment).filter(([, qty]) => qty > 0)
          if (seEntries.length > 0) {
            const { error: seErr } = await supabase.from('shift_equipment').insert(
              seEntries.map(([eqId, qty]) => ({ shift_id: sid, equipment_id: eqId, quantity: qty }))
            )
            if (seErr) throw seErr
          }
          if (!isAdmin) {
            await supabase.from('notifications').insert({
              organization_id: profile.organization_id,
              type: 'new_shift',
              title: `Nuovo turno da ${profile.first_name} ${profile.last_name}`,
              message: `${form.title} — ${form.start_time.slice(0, 10)}`,
              created_by: profile.id,
            })
          }
        }
      }

      setShowForm(false); setEditing(null)
      setForm({ title: '', description: '', start_time: '', end_time: '', type: 'ordinario', max_volunteers: 1 })
      setSelectedVehicles([])
      setSelectedEquipment({})
      loadShifts()
    } catch (err: any) { setError(err.message || 'Errore durante il salvataggio del turno') }
  }

  async function handleStatusChange(id: string, status: Shift['status']) {
    await supabase.from('shifts').update({ status }).eq('id', id)
    loadShifts()
  }

  async function handleDeleteShift(id: string) {
    if (!confirm('Eliminare questo turno? L\'operazione è irreversibile.')) return
    await supabase.from('shift_vehicles').delete().eq('shift_id', id)
    await supabase.from('shift_equipment').delete().eq('shift_id', id)
    await supabase.from('shifts').delete().eq('id', id)
    loadShifts()
  }

  function toggleEquipment(id: string) {
    setSelectedEquipment(prev => prev[id] ? { ...prev, [id]: prev[id] + 1 } : { ...prev, [id]: 1 })
  }

  function removeEquipment(id: string) {
    setSelectedEquipment(prev => {
      const next = { ...prev }
      if (next[id] <= 1) delete next[id]
      else next[id]--
      return next
    })
  }

  const selectedCount = Object.values(selectedEquipment).reduce((a, b) => a + b, 0)

  const statusStyles: Record<string, string> = {
    aperto: 'status-aperto',
    chiuso: 'status-manutenzione',
    completato: 'bg-surface-container text-on-surface-variant',
    cancellato: 'bg-error-container text-on-error-container',
  }

  // FORM VIEW
  if (showForm) {
    return (
      <div className="max-w-[1080px] mx-auto pb-24">
        {/* Breadcrumb */}
        <nav className="flex gap-2 text-label-xs text-on-surface-variant mb-2">
          <button onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="hover:text-primary transition-colors">Turni</button>
          <span>/</span>
          <span className="text-primary font-bold">{editing ? 'Modifica Turno' : 'Nuovo Turno'}</span>
        </nav>
        <h2 className="text-headline-md text-headline-md text-on-background mb-xl">
          {editing ? 'Modifica Turno' : 'Programma Nuovo Turno'}
        </h2>

        {error && <div className="bg-error-container text-on-error-container text-body-sm p-3 rounded-lg border border-outline-variant mb-xl">{error}</div>}

        {!isAdmin && (
          <div className="bg-amber-50 text-amber-800 text-body-sm p-3 rounded-lg border border-amber-200 flex items-center gap-2 mb-xl">
            <Icon name="info" />
            Stai creando un turno come utente — l'amministratore riceverà una notifica.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left column: Main Details + Equipment */}
            <div className="lg:col-span-8 space-y-3">
              {/* Main Details */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 soft-card-shadow overflow-hidden">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary">
                    <Icon name="edit_note" />
                  </div>
                  <h3 className="text-title-sm">Dettagli Principali</h3>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div className="group">
                    <label className="block text-label-xs text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors">Titolo del turno</label>
                      <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all" placeholder="es. Emergenza Sanitaria Mattutina" required />
                  </div>
                  <div className="group">
                    <label className="block text-label-xs text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors">Descrizione</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-4 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none" placeholder="Inserisci note operative, istruzioni per i volontari o dettagli logistici particolari..." rows={4} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group min-w-0">
                      <label className="block text-label-xs text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors">Inizio</label>
                      <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="w-full h-11 px-2 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all min-w-0" required />
                    </div>
                    <div className="group min-w-0">
                      <label className="block text-label-xs text-on-surface-variant mb-1 group-focus-within:text-primary transition-colors">Fine</label>
                      <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="w-full h-11 px-2 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all min-w-0" required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipment Inventory Search */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden soft-card-shadow">
                <div className="p-6 border-b border-outline-variant bg-surface-container-low">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-tertiary-container/10 flex items-center justify-center text-tertiary">
                        <Icon name="inventory_2" />
                      </div>
                      <h3 className="text-title-sm">Attrezzatura da Inventario</h3>
                    </div>
                    <div className="flex gap-2 p-1 bg-surface-variant rounded-lg">
                      {(['tutti', 'id', 'categoria'] as const).map(mode => (
                        <button key={mode} type="button" onClick={() => setEquipSearchMode(mode)}
                          className={`px-3 py-1.5 text-label-xs font-bold rounded-md transition-colors ${
                            equipSearchMode === mode
                              ? 'bg-white text-primary shadow-sm'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}>
                          {mode === 'tutti' ? 'Tutto' : mode === 'id' ? 'ID' : 'Categoria'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 relative">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
                    <input value={equipSearch} onChange={e => setEquipSearch(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary transition-all" placeholder="Cerca attrezzatura per nome o codice..." type="text" />
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 p-3 gap-2">
                    {equipFiltered.map(eq => {
                      const qty = selectedEquipment[eq.id] || 0
                      const iconName = categoriaIcone[eq.categoria] || 'inventory_2'
                      return (
                        <div key={eq.id} className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-outline-variant hover:bg-surface-container transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded flex items-center justify-center bg-on-secondary-container/10 text-secondary">
                              <Icon name={iconName} className="text-[20px]" />
                            </div>
                            <div>
                              <p className="text-body-sm font-medium">{eq.articolo}</p>
                              <p className="text-label-xs text-on-surface-variant">{eq.id_numero}</p>
                              <p className="text-label-xs text-on-surface-variant">{eq.marca}{eq.modello ? ` / ${eq.modello}` : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {qty > 0 && (
                              <>
                                <button type="button" onClick={() => removeEquipment(eq.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 text-on-surface-variant hover:bg-red-100 hover:text-error transition-all">
                                  <Icon name="remove" className="text-[18px]" />
                                </button>
                                <span className="text-label-xs font-bold text-on-surface w-5 text-center">{qty}</span>
                              </>
                            )}
                            <button type="button" onClick={() => toggleEquipment(eq.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-primary text-on-primary hover:scale-110 active:scale-90 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100">
                              <Icon name="add" className="text-[18px]" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {equipmentItems.length === 0 && (
                      <div className="col-span-full text-center py-8 text-on-surface-variant text-body-sm">
                        <Icon name="inventory_2" className="text-3xl opacity-50 mb-2" />
                        <p>Nessuna attrezzatura in inventario.</p>
                      </div>
                    )}
                  </div>
                </div>
                {selectedCount > 0 && (
                  <div className="px-6 py-3 border-t border-outline-variant bg-surface-container-low">
                    <p className="text-label-xs text-on-surface-variant">{selectedCount} pezzi selezionati</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Configuration */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6 soft-card-shadow overflow-hidden">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary">
                    <Icon name="settings_suggest" />
                  </div>
                  <h3 className="text-title-sm">Configurazione</h3>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-label-xs text-on-surface-variant mb-1">Tipo di Turno</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Shift['type'] })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary transition-all">
                      <option value="ordinario">Ordinario</option>
                      <option value="straordinario">Straordinario</option>
                      <option value="rappresentanza">Rappresentanza</option>
                      <option value="evento">Evento</option>
                      <option value="sanitario">Sanitario</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-xs text-on-surface-variant mb-1">Veicoli Assegnati</label>
                    <div className="flex flex-wrap gap-2">
                      {vehicles.map(v => (
                        <button key={v.id} type="button" onClick={() => toggleVehicle(v.id)}
                          className={`px-3 py-2 rounded-lg text-label-xs font-medium border transition-all ${
                            selectedVehicles.includes(v.id)
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-white text-on-surface-variant border-outline-variant hover:border-primary'
                          }`}>
                          {v.name}
                        </button>
                      ))}
                      {vehicles.length === 0 && <span className="text-label-xs text-on-surface-variant">Nessun veicolo disponibile</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-label-xs text-on-surface-variant mb-1">Max Volontari</label>
                    <div className="flex items-center gap-4">
                      <input type="number" value={form.max_volunteers} onChange={e => setForm({ ...form, max_volunteers: parseInt(e.target.value) || 1 })} className="w-24 h-11 px-4 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary transition-all text-center font-bold" min={1} />
                      <div className="text-label-xs text-on-surface-variant">
                        <p>Capacità massima</p>
                        <p>per questo turno.</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button type="submit" className="h-[52px] bg-primary-container text-on-primary font-bold text-body-md rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <Icon name="save" /> {editing ? 'Salva Turno' : 'Crea Turno'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="h-[52px] bg-surface text-on-surface-variant border border-outline-variant font-bold text-body-md rounded-xl hover:bg-surface-container transition-all">
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // LIST VIEW
  return (
    <div className="max-w-[1080px] mx-auto space-y-8">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface">Turni</h2>
          <p className="text-body-md text-on-surface-variant">Gestione turni, mezzi e attrezzatura</p>
        </div>
        <button onClick={() => { setEditing(null); setError(null); setForm({ title: '', description: '', start_time: '', end_time: '', type: 'ordinario', max_volunteers: 1 }); setSelectedVehicles([]); setSelectedEquipment({}); setShowForm(true) }}
          className="bg-primary text-on-primary py-3 px-6 rounded-xl text-body-md font-semibold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-sm">
          <Icon name="add" /> Nuovo Turno
        </button>
      </section>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
          <input type="text" placeholder="Cerca per titolo, tipo, data..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary transition-all text-body-md" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['tutti', 'aperto', 'chiuso', 'completato', 'cancellato'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-label-xs font-medium whitespace-nowrap transition-all ${
              filter === f ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}>
            {f === 'tutti' ? 'Tutti' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Shift list */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden soft-card-shadow">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icon name="list_alt" className="text-primary" />
            <h3 className="text-title-sm text-on-surface">Elenco Turni</h3>
          </div>
          <span className="text-label-xs text-on-surface-variant">{filtered.length} turni</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <Icon name="calendar_month" className="text-4xl opacity-50 mb-2" />
            <p className="text-body-sm">Nessun turno trovato</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Data</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Nome Turno</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Orario</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Mezzo</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Stato</th>
                  <th className="px-6 py-4 text-label-caps text-on-surface-variant">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-primary-container/10 rounded-lg border border-primary-container/20">
                        <span className="text-primary font-bold text-lg leading-none">{format(parseISO(s.start_time), "d")}</span>
                        <span className="text-primary text-label-xs text-[10px] uppercase">{format(parseISO(s.start_time), "MMM", { locale: it })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-body-md text-on-surface font-medium">{s.title}</p>
                      <p className="text-label-xs text-on-surface-variant">{s.type}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-on-surface-variant text-body-sm">
                        <Icon name="schedule" className="text-sm" />
                        {format(parseISO(s.start_time), "HH:mm")} — {format(parseISO(s.end_time), "HH:mm")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {s.shift_vehicles && s.shift_vehicles.length > 0 ? (
                          s.shift_vehicles.map(sv => (
                            <span key={sv.id} className="inline-flex items-center gap-1 text-label-xs bg-surface-container-high px-2 py-0.5 rounded whitespace-nowrap">
                              <Icon name="local_shipping" className="text-[14px]" />
                              {sv.vehicles?.name || 'Veicolo'}
                            </span>
                          ))
                        ) : (
                          <span className="text-label-xs text-on-surface-variant">Nessuno</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-label-xs font-semibold uppercase tracking-wide ${statusStyles[s.status] || ''}`}>{s.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {isAdmin && (
                          <button onClick={() => {
                            setEditing(s)
                            setForm({
                              title: s.title, description: s.description || '',
                              start_time: s.start_time.slice(0, 16), end_time: s.end_time.slice(0, 16),
                              type: s.type, max_volunteers: s.max_volunteers,
                            })
                            setSelectedVehicles(s.shift_vehicles?.map(sv => sv.vehicle_id) || [])
                            const eqMap: Record<string, number> = {}
                            s.shift_equipment?.forEach(se => { eqMap[se.equipment_id] = se.quantity })
                            setSelectedEquipment(eqMap)
                            setShowForm(true)
                          }} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
                            <Icon name="edit" className="text-[20px]" />
                          </button>
                        )}
                        {s.status === 'aperto' && (
                          <button onClick={() => handleStatusChange(s.id, 'chiuso')} className="px-3 py-1 text-status-label font-bold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors">
                            Chiudi
                          </button>
                        )}
                        {s.status === 'chiuso' && isAdmin && (
                          <button onClick={() => handleStatusChange(s.id, 'completato')} className="px-3 py-1 text-status-label font-bold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors">
                            Completa
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDeleteShift(s.id)} className="p-2 hover:bg-error-container rounded-full transition-colors text-on-surface-variant hover:text-error" title="Elimina">
                            <Icon name="delete" className="text-[20px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
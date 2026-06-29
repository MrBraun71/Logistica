import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Shift, ShiftAssignment, Vehicle, Profile, Equipment, ShiftEquipment } from '../../types/database'
import { Plus, Calendar, Clock, Users, Car, Briefcase, Heart, Monitor, Table2, Tent, X, ArrowRight, Pencil, Package, Minus, Search, ShieldBan } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface ShiftFull extends Shift {
  vehicles?: Vehicle
  shift_assignments?: (ShiftAssignment & { profiles?: Profile })[]
  shift_equipment?: (ShiftEquipment & { equipment?: Equipment })[]
}

const typeMeta: Record<string, { label: string; from: string; to: string }> = {
  ordinario: { label: 'Ordinario', from: 'from-blue-500', to: 'to-cyan-400' },
  straordinario: { label: 'Straordinario', from: 'from-orange-500', to: 'to-amber-400' },
  emergenza: { label: 'Emergenza', from: 'from-red-500', to: 'to-rose-400' },
  evento: { label: 'Evento', from: 'from-emerald-500', to: 'to-green-400' },
}

const categoriaIcone: Record<string, any> = {
  DAE: Heart,
  Borsone: Briefcase,
  Gazebo: Tent,
  Computer: Monitor,
  Rollup: Table2,
}

export default function TurniPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [shifts, setShifts] = useState<ShiftFull[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [volunteers, setVolunteers] = useState<Profile[]>([])
  const [equipmentItems, setEquipmentItems] = useState<Equipment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ShiftFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('tutti')
  const [equipSearch, setEquipSearch] = useState('')
  const [equipSearchMode, setEquipSearchMode] = useState<'tutti' | 'id' | 'categoria'>('tutti')
  const [form, setForm] = useState({
    title: '', description: '', start_time: '', end_time: '',
    type: 'ordinario' as Shift['type'], max_volunteers: 1,
    vehicle_id: '', equipment_notes: '',
  })
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({})
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([])

  useEffect(() => {
    if (profile?.organization_id) { loadShifts(); loadVehicles(); loadVolunteers(); loadEquipment() }
  }, [profile?.organization_id])

  async function loadShifts() {
    if (!profile?.organization_id) return
    const { data } = await supabase
      .from('shifts')
      .select('*, vehicles!vehicle_id(*), shift_assignments(*, profiles:profile_id(*)), shift_equipment(*, equipment:equipment_id(*))')
      .eq('organization_id', profile.organization_id)
      .order('start_time', { ascending: false })
    if (data) setShifts(data)
  }

  async function loadVehicles() {
    if (!profile?.organization_id) return
    const { data } = await supabase.from('vehicles').select('*').eq('organization_id', profile.organization_id).eq('is_active', true)
    if (data) setVehicles(data)
  }

  async function loadVolunteers() {
    if (!profile?.organization_id) return
    const { data } = await supabase.from('profiles').select('*').eq('organization_id', profile.organization_id).eq('is_active', true)
    if (data) setVolunteers(data)
  }

  async function loadEquipment() {
    if (!profile?.organization_id) return
    const { data } = await supabase.from('equipment').select('*').eq('organization_id', profile.organization_id).eq('is_active', true).order('articolo')
    if (data) setEquipmentItems(data)
  }

  const filtered = filter === 'tutti' ? shifts : shifts.filter(s => s.status === filter)

  const equipFiltered = equipmentItems.filter(e => {
    if (!equipSearch) return true
    const q = equipSearch.toLowerCase()
    if (equipSearchMode === 'id') return e.id_numero.toLowerCase().includes(q)
    if (equipSearchMode === 'categoria') return e.categoria.toLowerCase().includes(q)
    return `${e.articolo} ${e.id_numero} ${e.categoria} ${e.marca} ${e.modello} ${e.sede}`.toLowerCase().includes(q)
  })

  const equipGrouped = equipFiltered.reduce<Record<string, Equipment[]>>((acc, e) => {
    const cat = e.categoria || 'Altro'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(e)
    return acc
  }, {})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!profile?.id || !profile?.organization_id) { setError('Profilo non trovato'); return }
    try {
      const shiftData = {
        title: form.title, description: form.description,
        start_time: form.start_time, end_time: form.end_time, type: form.type,
        max_volunteers: form.max_volunteers, vehicle_id: form.vehicle_id || null,
        equipment_notes: form.equipment_notes || null,
      }

      if (editing) {
        const { error: err } = await supabase.from('shifts').update(shiftData).eq('id', editing.id)
        if (err) throw err

        await supabase.from('shift_equipment').delete().eq('shift_id', editing.id)
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
          const shiftId = newShift[0].id

          const seEntries = Object.entries(selectedEquipment).filter(([, qty]) => qty > 0)
          if (seEntries.length > 0) {
            const { error: seErr } = await supabase.from('shift_equipment').insert(
              seEntries.map(([eqId, qty]) => ({ shift_id: shiftId, equipment_id: eqId, quantity: qty }))
            )
            if (seErr) throw seErr
          }

          if (selectedVolunteers.length > 0) {
            const { error: aErr } = await supabase.from('shift_assignments').insert(
              selectedVolunteers.map(vId => ({ shift_id: shiftId, profile_id: vId, status: 'assegnato' as const }))
            )
            if (aErr) throw aErr
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
      setForm({ title: '', description: '', start_time: '', end_time: '', type: 'ordinario', max_volunteers: 1, vehicle_id: '', equipment_notes: '' })
      setSelectedEquipment({})
      setSelectedVolunteers([])
      loadShifts()
    } catch (err: any) { setError(err.message || 'Errore durante il salvataggio del turno') }
  }

  async function handleStatusChange(id: string, status: Shift['status']) {
    await supabase.from('shifts').update({ status }).eq('id', id)
    loadShifts()
  }

  function toggleVolunteer(id: string) {
    setSelectedVolunteers(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])
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

  function handleEdit(shift: ShiftFull) {
    setEditing(shift)
    setForm({
      title: shift.title, description: shift.description || '',
      start_time: shift.start_time.slice(0, 16), end_time: shift.end_time.slice(0, 16),
      type: shift.type, max_volunteers: shift.max_volunteers,
      vehicle_id: shift.vehicle_id || '',
      equipment_notes: shift.equipment_notes || '',
    })
    setSelectedVolunteers(shift.shift_assignments?.map(a => a.profile_id) || [])

    const eqMap: Record<string, number> = {}
    shift.shift_equipment?.forEach(se => {
      eqMap[se.equipment_id] = se.quantity
    })
    setSelectedEquipment(eqMap)
    setShowForm(true)
  }

  const statusStyles: Record<string, string> = {
    aperto: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    chiuso: 'bg-amber-50 text-amber-600 border-amber-200',
    completato: 'bg-gray-50 text-gray-500 border-gray-200',
    cancellato: 'bg-red-50 text-red-600 border-red-200',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turni</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gestione turni, mezzi e attrezzatura</p>
        </div>
        {(!isAdmin || isAdmin) && (
          <button onClick={() => { setEditing(null); setError(null); setForm({ title: '', description: '', start_time: '', end_time: '', type: 'ordinario', max_volunteers: 1, vehicle_id: '', equipment_notes: '' }); setSelectedEquipment({}); setSelectedVolunteers([]); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200">
            <Plus className="w-4 h-4" /> Nuovo Turno
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-xl border border-amber-100 flex items-center gap-2">
          <ShieldBan className="w-4 h-4 flex-shrink-0" />
          Stai creando un turno come utente — l'amministratore riceverà una notifica.
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['tutti', 'aperto', 'chiuso', 'completato', 'cancellato'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              filter === f ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200 hover:text-gray-700'
            }`}>
            {f === 'tutti' ? 'Tutti' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Modifica' : 'Nuovo'} Turno</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Titolo del turno" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
              <textarea placeholder="Descrizione (opzionale)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Inizio</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Fine</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Shift['type'] })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all">
                    <option value="ordinario">Ordinario</option>
                    <option value="straordinario">Straordinario</option>
                    <option value="emergenza">Emergenza</option>
                    <option value="evento">Evento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Veicolo</label>
                  <select value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all">
                    <option value="">Nessuno</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}
                  </select>
                </div>
              </div>

              {/* Equipment from inventory */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Attrezzatura da Inventario</label>
                <div className="relative mb-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                  <input type="text" placeholder="Cerca attrezzatura..." value={equipSearch} onChange={e => setEquipSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                </div>
                <div className="flex gap-1 mb-2">
                  {(['tutti', 'id', 'categoria'] as const).map(mode => (
                    <button key={mode} type="button" onClick={() => setEquipSearchMode(mode)}
                      className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
                        equipSearchMode === mode
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-50 text-gray-400 hover:text-gray-600'
                      }`}>
                      {mode === 'tutti' ? 'Tutto' : mode === 'id' ? 'ID' : 'Categoria'}
                    </button>
                  ))}
                </div>
                <div className="border border-gray-100 rounded-xl p-3 max-h-48 overflow-y-auto bg-gray-50/50 space-y-2">
                  {Object.entries(equipGrouped).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{cat}</p>
                      <div className="space-y-1">
                        {items.map(eq => {
                          const qty = selectedEquipment[eq.id] || 0
                          const Icon = categoriaIcone[cat] || Package
                          return (
                            <div key={eq.id} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="text-xs text-gray-700 truncate">{eq.articolo}</span>
                                <span className="text-[10px] text-gray-400">{eq.id_numero}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {qty > 0 && (
                                  <>
                                    <button type="button" onClick={() => removeEquipment(eq.id)}
                                      className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-medium text-gray-700 w-4 text-center">{qty}</span>
                                  </>
                                )}
                                <button type="button" onClick={() => toggleEquipment(eq.id)}
                                  className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-colors">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {equipmentItems.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Nessuna attrezzatura in inventario. Aggiungila dalla sezione Inventario.</p>
                  )}
                </div>
                {Object.keys(selectedEquipment).length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{Object.values(selectedEquipment).reduce((a, b) => a + b, 0)} pezzi selezionati</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Max Volontari</label>
                  <input type="number" value={form.max_volunteers} onChange={e => setForm({ ...form, max_volunteers: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" min={1} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Note attrezzatura</label>
                  <input type="text" value={form.equipment_notes} onChange={e => setForm({ ...form, equipment_notes: e.target.value })} placeholder="es. DAE training..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Assegna Volontari</label>
                <div className="flex flex-wrap gap-1.5 border border-gray-100 rounded-xl p-3 max-h-32 overflow-y-auto bg-gray-50/50">
                  {volunteers.map(v => (
                    <button key={v.id} type="button" onClick={() => toggleVolunteer(v.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        selectedVolunteers.includes(v.id)
                          ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {v.first_name} {v.last_name}
                    </button>
                  ))}
                  {volunteers.length === 0 && <p className="text-xs text-gray-400 p-1">Nessun volontario disponibile</p>}
                </div>
                {selectedVolunteers.length > 0 && <p className="text-xs text-gray-400 mt-1">{selectedVolunteers.length} selezionati</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all">{editing ? 'Salva' : 'Crea Turno'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="flex-1 py-2.5 bg-white text-gray-600 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 transition-all">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((shift) => (
          <div key={shift.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{shift.title}</h3>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium text-white bg-gradient-to-r ${typeMeta[shift.type].from} ${typeMeta[shift.type].to} shadow-sm`}>
                    {typeMeta[shift.type].label}
                  </span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${statusStyles[shift.status] || ''}`}>
                    {shift.status}
                  </span>
                </div>

                {shift.description && <p className="text-sm text-gray-400">{shift.description}</p>}

                <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-300" />{format(parseISO(shift.start_time), "d MMM yyyy", { locale: it })}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-300" />{format(parseISO(shift.start_time), "HH:mm")} — {format(parseISO(shift.end_time), "HH:mm")}</span>
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-300" />Max {shift.max_volunteers}</span>
                </div>

                {shift.vehicles && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl px-3 py-1.5 w-fit border border-rose-100/50">
                    <Car className="w-4 h-4 text-rose-400" />
                    {shift.vehicles.name} ({shift.vehicles.license_plate})
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {shift.shift_equipment?.map(se => se.equipment ? (
                    <span key={se.id} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1 border border-gray-100">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      {se.equipment.articolo}{se.quantity > 1 ? ` x${se.quantity}` : ''}
                    </span>
                  ) : null)}
                  {(!shift.shift_equipment || shift.shift_equipment.length === 0) && (
                    <>
                      {['borsoni', 'dae', 'rollup', 'desk', 'gazebo'].map(key => {
                        const count = (shift as any)[key]
                        if (!count || count === 0) return null
                        const eqMeta: Record<string, { label: string; icon: any }> = {
                          borsoni: { label: 'Borsoni', icon: Briefcase },
                          dae: { label: 'DAE', icon: Heart },
                          rollup: { label: 'Rollup', icon: Monitor },
                          desk: { label: 'Desk', icon: Table2 },
                          gazebo: { label: 'Gazebo', icon: Tent },
                        }
                        const meta = eqMeta[key]
                        if (!meta) return null
                        const Icon = meta.icon
                        return (
                          <span key={key} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1 border border-gray-100">
                            <Icon className="w-3.5 h-3.5 text-gray-400" />
                            {count}x
                          </span>
                        )
                      })}
                    </>
                  )}
                  {shift.equipment_notes && <span className="text-xs text-gray-400 italic px-1 py-1">Note: {shift.equipment_notes}</span>}
                </div>

                {shift.shift_assignments && shift.shift_assignments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{shift.shift_assignments.length} volontari</span>
                    <div className="flex -space-x-2">
                      {shift.shift_assignments.slice(0, 5).map((a) => (
                        <div key={a.id} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-medium shadow-sm ${
                          a.status === 'confermato' ? 'bg-emerald-100 text-emerald-600' :
                          a.status === 'rifiutato' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {a.profiles?.first_name?.[0]}{a.profiles?.last_name?.[0]}
                        </div>
                      ))}
                      {shift.shift_assignments.length > 5 && (
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-500 shadow-sm">
                          +{shift.shift_assignments.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                {isAdmin && <button onClick={() => handleEdit(shift)} className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"><Pencil className="w-4 h-4" /></button>}
                {shift.status === 'aperto' && (
                  <button onClick={() => handleStatusChange(shift.id, 'chiuso')} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors">
                    Chiudi <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {shift.status === 'chiuso' && isAdmin && (
                  <button onClick={() => handleStatusChange(shift.id, 'completato')} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors">
                    Completa <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-300 bg-white rounded-2xl border border-gray-100">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nessun turno trovato</p>
          </div>
        )}
      </div>
    </div>
  )
}
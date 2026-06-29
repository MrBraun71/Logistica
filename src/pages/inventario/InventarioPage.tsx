import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Equipment } from '../../types/database'

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const categorie = ['Sanitario', 'Logistica', 'Comunicazione', 'Altro']

const categoriaIcone: Record<string, string> = {
  Sanitario: 'monitor_heart',
  Logistica: 'inventory_2',
  Comunicazione: 'cell_tower',
}

export default function InventarioPage() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [items, setItems] = useState<Equipment[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    id_numero: '', articolo: '', marca: '', modello: '',
    categoria: '', inventario_interno: '', sede: '', note: '',
  })

  useEffect(() => {
    if (searchParams.has('nuovo')) {
      setEditing(null); setError(null)
      setForm({ id_numero: '', articolo: '', marca: '', modello: '', categoria: '', inventario_interno: '', sede: '', note: '' })
      setShowForm(true)
      navigate('/inventario', { replace: true })
    }
  }, [searchParams, navigate])

  useEffect(() => { if (profile?.organization_id) loadItems() }, [profile?.organization_id])

  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  async function loadItems() {
    if (!profile?.organization_id) return
    const { data } = await supabase.from('equipment').select('*').eq('organization_id', profile.organization_id).order('articolo')
    if (data) setItems(data)
  }

  const filtered = items.filter(i =>
    `${i.id_numero} ${i.articolo} ${i.marca} ${i.modello} ${i.categoria} ${i.sede}`
      .toLowerCase().includes(search.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!profile?.organization_id) { setError('Nessuna organizzazione'); return }
    try {
      if (editing) {
        const { error: err } = await supabase.from('equipment').update(form).eq('id', editing.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('equipment').insert({
          ...form, organization_id: profile.organization_id,
        })
        if (err) throw err
      }
      setShowForm(false); setEditing(null)
      setForm({ id_numero: '', articolo: '', marca: '', modello: '', categoria: '', inventario_interno: '', sede: '', note: '' })
      loadItems()
    } catch (err: any) { setError(err.message || 'Errore') }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Eliminare questo articolo? L\'operazione è irreversibile.')) return
    await supabase.from('equipment').delete().eq('id', id)
    loadItems()
  }

  function startEdit(item: Equipment) {
    setEditing(item)
    setForm({
      id_numero: item.id_numero, articolo: item.articolo, marca: item.marca, modello: item.modello,
      categoria: item.categoria, inventario_interno: item.inventario_interno, sede: item.sede, note: item.note,
    })
    setShowForm(true)
  }

  async function handleToggleActive(item: Equipment) {
    await supabase.from('equipment').update({ is_active: !item.is_active }).eq('id', item.id)
    loadItems()
  }

  return (
    <div className="max-w-[1080px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-lg text-on-surface">Inventario</h2>
          <p className="text-on-surface-variant text-body-lg">Gestione materiale e attrezzature</p>
        </div>
        <button onClick={() => { setEditing(null); setError(null); setForm({ id_numero: '', articolo: '', marca: '', modello: '', categoria: '', inventario_interno: '', sede: '', note: '' }); setShowForm(true) }}
          className="bg-primary text-on-primary py-3 px-6 rounded-xl text-body-md font-semibold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-sm">
          <Icon name="add" /> Nuovo
        </button>
      </div>

      <div className="relative">
        <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
        <input type="text" placeholder="Cerca per ID, articolo, marca, categoria..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all soft-card-shadow" />
      </div>

      {error && <div className="bg-error-container text-on-error-container text-body-md p-3 rounded-xl">{error}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-headline-md text-on-surface">{editing ? 'Modifica' : 'Nuovo'} Materiale</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors"><Icon name="close" className="text-on-surface-variant" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-caps text-on-surface-variant mb-1.5">ID Numero *</label>
                  <input type="text" value={form.id_numero} onChange={e => setForm({ ...form, id_numero: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" required />
                </div>
                <div>
                  <label className="block text-label-caps text-on-surface-variant mb-1.5">Categoria *</label>
                  <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" required>
                    <option value="">Seleziona...</option>
                    {categorie.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-label-caps text-on-surface-variant mb-1.5">Articolo *</label>
                <input type="text" value={form.articolo} onChange={e => setForm({ ...form, articolo: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-caps text-on-surface-variant mb-1.5">Marca</label>
                  <input type="text" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" />
                </div>
                <div>
                  <label className="block text-label-caps text-on-surface-variant mb-1.5">Modello</label>
                  <input type="text" value={form.modello} onChange={e => setForm({ ...form, modello: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-caps text-on-surface-variant mb-1.5">Inventario Interno</label>
                  <input type="text" value={form.inventario_interno} onChange={e => setForm({ ...form, inventario_interno: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" />
                </div>
                <div>
                  <label className="block text-label-caps text-on-surface-variant mb-1.5">Sede</label>
                  <input type="text" value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value })} className="w-full h-11 px-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-label-caps text-on-surface-variant mb-1.5">Note</label>
                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full p-4 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary transition-all" rows={2} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 h-[52px] bg-primary text-on-primary text-body-md font-semibold rounded-xl hover:brightness-110 transition-all active:scale-[0.98] shadow-sm">{editing ? 'Salva' : 'Crea'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="flex-1 h-[52px] bg-white text-on-surface-variant text-body-md font-semibold rounded-xl border border-outline-variant hover:bg-surface-container transition-all">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl soft-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-container-low bg-surface-container-low">
                <th className="px-4 py-3 text-label-caps text-on-surface-variant">ID Numero</th>
                <th className="px-4 py-3 text-label-caps text-on-surface-variant">Articolo</th>
                <th className="px-4 py-3 text-label-caps text-on-surface-variant">Marca/Modello</th>
                <th className="px-4 py-3 text-label-caps text-on-surface-variant">Categoria</th>
                <th className="px-4 py-3 text-label-caps text-on-surface-variant">Inv. Interno</th>
                <th className="px-4 py-3 text-label-caps text-on-surface-variant">Sede</th>
                <th className="px-4 py-3 text-label-caps text-on-surface-variant text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {filtered.map(item => (
                <tr key={item.id} className={`hover:bg-surface-container transition-colors ${!item.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-body-md font-medium text-on-surface">{item.id_numero}</td>
                  <td className="px-4 py-3 text-body-md text-on-surface">{item.articolo}</td>
                  <td className="px-4 py-3 text-body-md text-on-surface-variant">{item.marca}{item.modello ? ` / ${item.modello}` : ''}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-label-xs bg-secondary-container/20 text-secondary px-2.5 py-1 rounded-lg font-medium">
                      <Icon name={categoriaIcone[item.categoria] || 'inventory_2'} className="text-[14px]" />
                      {item.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body-md text-on-surface-variant">{item.inventario_interno || '-'}</td>
                  <td className="px-4 py-3 text-body-md text-on-surface-variant">{item.sede || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(item)} className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><Icon name="edit" className="text-[18px]" /></button>
                      <button onClick={() => handleToggleActive(item)} className={`p-1.5 transition-colors ${item.is_active ? 'text-on-surface-variant hover:text-amber-500' : 'text-amber-400 hover:text-primary'}`}>
                        <Icon name={item.is_active ? 'toggle_off' : 'toggle_on'} className="text-[18px]" />
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors" title="Elimina">
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <Icon name="inventory_2" className="text-4xl opacity-50 mb-3" />
              <p className="text-body-md">Nessun materiale trovato</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-label-caps text-on-surface-variant">{items.length} elementi in inventario</p>
    </div>
  )
}

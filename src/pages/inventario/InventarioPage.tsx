import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Equipment } from '../../types/database'
import { Plus, Pencil, X, Search, ShieldAlert } from 'lucide-react'
import { Navigate } from 'react-router-dom'

const categorie = ['DAE', 'Borsone', 'Gazebo', 'Computer', 'Rollup', 'Altro']

export default function InventarioPage() {
  const { profile } = useAuth()
  const [items, setItems] = useState<Equipment[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    id_numero: '', articolo: '', marca: '', modello: '',
    categoria: '', inventario_interno: '', sede: '', note: '',
  })

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gestione materiale e attrezzature</p>
        </div>
        <button onClick={() => { setEditing(null); setError(null); setForm({ id_numero: '', articolo: '', marca: '', modello: '', categoria: '', inventario_interno: '', sede: '', note: '' }); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-400 text-white rounded-xl text-sm font-medium shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all duration-200">
          <Plus className="w-4 h-4" /> Nuovo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input type="text" placeholder="Cerca per ID, articolo, marca, categoria..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all shadow-sm" />
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Modifica' : 'Nuovo'} Materiale</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ID Numero *</label>
                  <input type="text" value={form.id_numero} onChange={e => setForm({ ...form, id_numero: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Categoria *</label>
                  <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all" required>
                    <option value="">Seleziona...</option>
                    {categorie.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Articolo *</label>
                <input type="text" value={form.articolo} onChange={e => setForm({ ...form, articolo: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Marca</label>
                  <input type="text" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Modello</label>
                  <input type="text" value={form.modello} onChange={e => setForm({ ...form, modello: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Inventario Interno</label>
                  <input type="text" value={form.inventario_interno} onChange={e => setForm({ ...form, inventario_interno: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Sede</label>
                  <input type="text" value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Note</label>
                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all" rows={2} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-purple-400 text-white rounded-xl text-sm font-medium shadow-lg shadow-violet-200 transition-all">{editing ? 'Salva' : 'Crea'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setError(null) }} className="flex-1 py-2.5 bg-white text-gray-600 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 transition-all">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">ID Numero</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Articolo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Marca/Modello</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Inv. Interno</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Sede</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${!item.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.id_numero}</td>
                  <td className="px-4 py-3 text-gray-700">{item.articolo}</td>
                  <td className="px-4 py-3 text-gray-500">{item.marca}{item.modello ? ` / ${item.modello}` : ''}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2.5 py-1 rounded-lg font-medium bg-violet-50 text-violet-600">{item.categoria}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.inventario_interno || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.sede || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(item)} className="p-1.5 text-gray-300 hover:text-violet-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleActive(item)} className={`p-1.5 transition-colors ${item.is_active ? 'text-gray-300 hover:text-amber-500' : 'text-amber-400 hover:text-green-500'}`}>
                        <X className={`w-4 h-4 ${!item.is_active ? 'rotate-45' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-300">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nessun materiale trovato</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400">{items.length} elementi in inventario</p>
    </div>
  )
}
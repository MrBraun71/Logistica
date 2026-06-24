import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Attendance, Shift, ShiftAssignment } from '../../types/database'
import { format, parseISO } from 'date-fns'
import { Clock, MapPin, Smartphone, BadgeCheck, LogIn, LogOut, CalendarDays, ChevronRight } from 'lucide-react'

interface TodayShift extends Shift { shift_assignments?: ShiftAssignment[] }

export default function PresenzePage() {
  const { profile } = useAuth()
  const [records, setRecords] = useState<any[]>([])
  const [activeCheck, setActiveCheck] = useState<Attendance | null>(null)
  const [todayShifts, setTodayShifts] = useState<TodayShift[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (profile?.organization_id && profile?.id) { loadAll() } }, [profile?.organization_id, profile?.id])

  async function loadAll() { await Promise.all([loadRecords(), checkActiveSession(), loadTodayShifts()]) }

  async function loadRecords() {
    if (!profile?.organization_id) return
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('attendance')
      .select('*, profiles!profile_id(first_name, last_name), shifts!shift_id(title)')
      .eq('organization_id', profile.organization_id).gte('check_in_time', today).order('check_in_time', { ascending: false })
    if (data) setRecords(data)
  }

  async function checkActiveSession() {
    if (!profile?.id) return
    const { data } = await supabase.from('attendance').select('*').eq('profile_id', profile.id).is('check_out_time', null).maybeSingle()
    if (data) setActiveCheck(data)
  }

  async function loadTodayShifts() {
    if (!profile?.id) return
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const { data } = await supabase.from('shifts')
      .select('*, shift_assignments!inner(*)').gte('start_time', today).lt('start_time', tomorrow)
      .eq('shift_assignments.profile_id', profile.id).order('start_time')
    if (data) setTodayShifts(data)
  }

  async function handleCheckIn() {
    if (!profile?.id || !profile?.organization_id) { setError('Profilo non trovato'); return }
    if (!selectedShiftId) { setError('Seleziona un turno'); return }
    setLoading(true); setError(null)
    try {
      const position = await getCurrentPosition()
      const { error: err } = await supabase.from('attendance').insert({
        profile_id: profile.id, organization_id: profile.organization_id, shift_id: selectedShiftId, method: 'app',
        check_in_time: new Date().toISOString(),
        check_in_location: position ? { lat: position.lat, lng: position.lng } : null,
      })
      if (err) throw err
      setSelectedShiftId(''); await loadAll()
    } catch (err: any) { setError(err.message || 'Errore check-in') } finally { setLoading(false) }
  }

  async function handleCheckOut() {
    if (!activeCheck?.id) return
    setLoading(true); setError(null)
    try {
      const position = await getCurrentPosition()
      await supabase.from('attendance').update({
        check_out_time: new Date().toISOString(),
        check_out_location: position ? { lat: position.lat, lng: position.lng } : null,
      }).eq('id', activeCheck.id)
      setActiveCheck(null); await loadRecords()
    } catch (err: any) { setError(err.message || 'Errore check-out') } finally { setLoading(false) }
  }

  async function getCurrentPosition() {
    if (!navigator.geolocation) return null
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      )
      return { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch { return null }
  }

  const methodIcons: Record<string, React.ComponentType<{ className?: string }>> = { app: Smartphone, badge: BadgeCheck, manual: LogIn }

  if (!profile) return <div className="text-center py-16 text-gray-400"><p>Profilo non trovato.</p></div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Presenze</h1><p className="text-gray-400 text-sm mt-0.5">Check-in/out collegato ai turni del giorno</p></div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      {/* Check-in/out card */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-500 ${activeCheck ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${
            activeCheck ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-200' : 'bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-200'
          }`}>
            {activeCheck ? <LogOut className="w-9 h-9 text-white" /> : <LogIn className="w-9 h-9 text-white" />}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-lg text-gray-900">{activeCheck ? 'Sei in servizio' : 'Non sei in servizio'}</p>
            <p className="text-sm text-gray-400 mt-0.5">
              {activeCheck ? (
                <>Check-in: {format(parseISO(activeCheck.check_in_time!), "HH:mm")}</>
              ) : (
                'Seleziona un turno ed effettua il check-in'
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
            {!activeCheck && todayShifts.length > 0 && (
              <select value={selectedShiftId} onChange={e => setSelectedShiftId(e.target.value)}
                className="w-full sm:w-56 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                <option value="">Seleziona turno...</option>
                {todayShifts.map(s => (
                  <option key={s.id} value={s.id}>{s.title} ({format(parseISO(s.start_time), "HH:mm")})</option>
                ))}
              </select>
            )}
            {!activeCheck && todayShifts.length === 0 && (
              <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">Nessun turno oggi</p>
            )}
            <button onClick={activeCheck ? handleCheckOut : handleCheckIn} disabled={loading || (!activeCheck && !selectedShiftId)}
              className={`w-full sm:w-auto px-8 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 shadow-lg ${
                activeCheck
                  ? 'bg-gradient-to-r from-red-500 to-rose-400 shadow-red-200 hover:shadow-red-300 hover:-translate-y-0.5'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5'
              } disabled:opacity-50 disabled:hover:translate-y-0`}>
              {loading ? '...' : activeCheck ? 'Check-out' : 'Check-in'}
            </button>
          </div>
        </div>
      </div>

      {/* Today's attendance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Presenze di oggi</h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{records.length} registrazioni</span>
        </div>
        <div className="space-y-2">
          {records.map((r) => {
            const Icon = methodIcons[r.method as keyof typeof methodIcons] || LogIn
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-50 flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{r.profiles?.first_name} {r.profiles?.last_name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.check_in_time ? format(parseISO(r.check_in_time), "HH:mm") : '--'}</span>
                      <ChevronRight className="w-3 h-3 text-gray-200" />
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.check_out_time ? format(parseISO(r.check_out_time), "HH:mm") : <span className="text-emerald-500 font-medium">In corso</span>}</span>
                      {r.shifts?.title && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{r.shifts.title}</span>}
                      {r.check_in_location && <MapPin className="w-3 h-3 text-gray-300" />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {records.length === 0 && (
            <div className="text-center py-12 text-gray-300 bg-white rounded-2xl border border-gray-100">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessuna presenza oggi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

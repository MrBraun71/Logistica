import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CalendarDays, Car, Calendar } from 'lucide-react'
import type { Shift } from '../types/database'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

const gradientCards = [
  { label: 'Prossimi Turni', icon: CalendarDays, from: 'from-emerald-500', to: 'to-green-400' },
  { label: 'Mezzi Attivi', icon: Car, from: 'from-rose-500', to: 'to-pink-400' },
]

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ shifts: 0, vehicles: 0 })
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([])

  useEffect(() => {
    if (!profile?.organization_id) return
    const orgId = profile.organization_id

    async function load() {
      const [sc, vc, sr] = await Promise.all([
        supabase.from('shifts').select('id', { count: 'exact' }).eq('organization_id', orgId).gte('start_time', new Date().toISOString()),
        supabase.from('vehicles').select('id', { count: 'exact' }).eq('organization_id', orgId).eq('is_active', true),
        supabase.from('shifts').select('*').eq('organization_id', orgId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
      ])

      setStats({
        shifts: sc.count ?? 0,
        vehicles: vc.count ?? 0,
      })
      setUpcomingShifts(sr.data ?? [])
    }
    load()
  }, [profile?.organization_id])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Benvenuto, {profile?.first_name}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-100 text-sm text-gray-500 shadow-sm">
          <Calendar className="w-4 h-4" />
          {format(new Date(), "d MMM yyyy", { locale: it })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {gradientCards.map((c, i) => (
          <div key={c.label} className="group relative bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.from} ${c.to} flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{Object.values(stats)[i]}</p>
            <p className="text-sm text-gray-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Prossimi Turni</h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{upcomingShifts.length} in programma</span>
        </div>
        {upcomingShifts.length === 0 ? (
          <div className="text-center py-8 text-gray-300">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nessun turno imminente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingShifts.map((s) => (
              <div key={s.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center flex-shrink-0 border border-gray-50">
                  <span className="text-lg font-bold text-gray-700 leading-none">{format(parseISO(s.start_time), "d")}</span>
                  <span className="text-[10px] text-gray-400 uppercase">{format(parseISO(s.start_time), "MMM", { locale: it })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(parseISO(s.start_time), "HH:mm")} — {format(parseISO(s.end_time), "HH:mm")}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  s.status === 'aperto' ? 'bg-emerald-50 text-emerald-600' :
                  s.status === 'chiuso' ? 'bg-amber-50 text-amber-600' :
                  'bg-gray-50 text-gray-500'
                }`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
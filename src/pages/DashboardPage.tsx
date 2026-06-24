import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Users, CalendarDays, ClipboardCheck, Car, Clock, Calendar, MapPin } from 'lucide-react'
import type { Shift, Attendance, Profile } from '../types/database'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface ShiftWithProfiles extends Shift {
  shift_assignments?: { profile_id: string; profiles?: Profile }[]
}

const gradientCards = [
  { label: 'Volontari', icon: Users, from: 'from-blue-500', to: 'to-cyan-400', dark: 'text-blue-600' },
  { label: 'Prossimi Turni', icon: CalendarDays, from: 'from-emerald-500', to: 'to-green-400', dark: 'text-emerald-600' },
  { label: 'Presenze Oggi', icon: ClipboardCheck, from: 'from-orange-500', to: 'to-amber-400', dark: 'text-orange-600' },
  { label: 'Mezzi Attivi', icon: Car, from: 'from-rose-500', to: 'to-pink-400', dark: 'text-rose-600' },
]

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ volunteers: 0, shifts: 0, attendances: 0, vehicles: 0 })
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftWithProfiles[]>([])
  const [recentActivity, setRecentActivity] = useState<(Attendance & { profiles?: Profile })[]>([])

  useEffect(() => {
    if (!profile?.organization_id) return
    const orgId = profile.organization_id

    async function load() {
      const [p, sc, ac, vc, sr, ra] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('organization_id', orgId),
        supabase.from('shifts').select('id', { count: 'exact' }).eq('organization_id', orgId).gte('start_time', new Date().toISOString()),
        supabase.from('attendance').select('id', { count: 'exact' }).eq('organization_id', orgId).gte('check_in_time', new Date().toISOString().slice(0, 10)),
        supabase.from('vehicles').select('id', { count: 'exact' }).eq('organization_id', orgId).eq('is_active', true),
        supabase.from('shifts').select('*, shift_assignments(*, profiles!profile_id(first_name, last_name))').eq('organization_id', orgId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
        supabase.from('attendance').select('*, profiles!profile_id(first_name, last_name)').eq('organization_id', orgId).not('check_in_time', 'is', null).order('check_in_time', { ascending: false }).limit(5),
      ])

      setStats({
        volunteers: p.count ?? 0, shifts: sc.count ?? 0,
        attendances: ac.count ?? 0, vehicles: vc.count ?? 0,
      })
      setUpcomingShifts(sr.data ?? [])
      setRecentActivity(ra.data ?? [])
    }
    load()
  }, [profile?.organization_id])

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Bento grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Bottom section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prossimi Turni */}
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

        {/* Attività Recenti */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Attività Recenti</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">Ultime {recentActivity.length}</span>
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessuna attività recente</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <UserIcon />
                    </div>
                    {i > 0 && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-px h-3 bg-gray-100" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {a.profiles?.first_name} {a.profiles?.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.check_in_time && format(parseISO(a.check_in_time), "HH:mm")}
                      {a.check_out_time && <span> → {format(parseISO(a.check_out_time), "HH:mm")}</span>}
                    </p>
                  </div>
                  {!!a.check_in_location && (
                    <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UserIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
    </svg>
  )
}

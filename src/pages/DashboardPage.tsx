import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Shift, Vehicle } from '../types/database'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface ShiftWithVehicle extends Shift {
  vehicles?: Vehicle
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [shifts, setShifts] = useState<ShiftWithVehicle[]>([])
  const [shiftCount, setShiftCount] = useState(0)
  const [vehicleCount, setVehicleCount] = useState(0)

  useEffect(() => {
    if (!profile?.organization_id) return
    const orgId = profile.organization_id

    async function load() {
      const [sc, vc, sr] = await Promise.all([
        supabase.from('shifts').select('id', { count: 'exact' }).eq('organization_id', orgId).gte('start_time', new Date().toISOString()),
        supabase.from('vehicles').select('id', { count: 'exact' }).eq('organization_id', orgId).eq('is_active', true),
        supabase.from('shifts').select('*, vehicles!vehicle_id(*)').eq('organization_id', orgId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(10),
      ])

      setShiftCount(sc.count ?? 0)
      setVehicleCount(vc.count ?? 0)
      if (sr.data) setShifts(sr.data)
    }
    load()
  }, [profile?.organization_id])

  return (
    <div className="max-w-container-max mx-auto space-y-xl">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="text-display-lg text-display-lg text-on-surface">Bentornato, {profile?.first_name}</h2>
          <p className="text-body-md text-on-surface-variant">Ecco una panoramica della flotta e dei turni per oggi.</p>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex items-center gap-lg">
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
            <Icon name="calendar_month" className="text-3xl" />
          </div>
          <div>
            <p className="text-on-surface-variant text-label-xs uppercase tracking-wider">Turni Imminenti</p>
            <h3 className="text-headline-md text-on-surface">{shiftCount} Prossimi Turni</h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex items-center gap-lg">
          <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
            <Icon name="local_shipping" className="text-3xl" />
          </div>
          <div>
            <p className="text-on-surface-variant text-label-xs uppercase tracking-wider">Operatività Mezzi</p>
            <h3 className="text-headline-md text-on-surface">{vehicleCount} Mezzi Attivi</h3>
          </div>
        </div>

        <div className="md:col-span-2 relative bg-primary overflow-hidden rounded-xl p-lg flex flex-col justify-between text-on-primary">
          <div className="relative z-10">
            <h3 className="text-headline-md mb-xs">Stato Logistica</h3>
            <p className="text-on-primary/80 text-body-sm">Efficienza operativa al 94% questa settimana.</p>
          </div>
          <div className="relative z-10 mt-xl flex items-center gap-4">
            <div className="flex -space-x-2">
              {['a', 'b', 'c'].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-primary bg-on-primary/20 flex items-center justify-center text-xs">
                  {profile?.first_name?.[i] || '?'}
                </div>
              ))}
            </div>
            <span className="text-label-xs">+12 operatori in linea</span>
          </div>
        </div>
      </section>

      {/* Upcoming Shifts Table */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-lg border-b border-outline-variant flex justify-between items-center">
          <div className="flex items-center gap-sm">
            <Icon name="list_alt" className="text-primary" />
            <h3 className="text-title-sm text-on-surface">Prossimi Turni</h3>
          </div>
          <span className="text-label-xs text-on-surface-variant">{shifts.length} in programma</span>
        </div>

        {shifts.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <Icon name="calendar_month" className="text-4xl opacity-50 mb-2" />
            <p className="text-body-sm">Nessun turno imminente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-lg py-4 text-label-xs text-outline uppercase tracking-wider">Data</th>
                  <th className="px-lg py-4 text-label-xs text-outline uppercase tracking-wider">Nome Turno</th>
                  <th className="px-lg py-4 text-label-xs text-outline uppercase tracking-wider">Orario</th>
                  <th className="px-lg py-4 text-label-xs text-outline uppercase tracking-wider">Mezzo</th>
                  <th className="px-lg py-4 text-label-xs text-outline uppercase tracking-wider">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-lg py-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-primary-container/10 rounded-lg border border-primary-container/20">
                        <span className="text-primary font-bold text-lg leading-none">{format(parseISO(s.start_time), "d")}</span>
                        <span className="text-primary text-label-xs text-[10px] uppercase">{format(parseISO(s.start_time), "MMM", { locale: it })}</span>
                      </div>
                    </td>
                    <td className="px-lg py-4">
                      <p className="text-body-md text-on-surface font-medium">{s.title}</p>
                      <p className="text-label-xs text-on-surface-variant">{s.type}</p>
                    </td>
                    <td className="px-lg py-4">
                      <div className="flex items-center gap-1 text-on-surface-variant text-body-sm">
                        <Icon name="schedule" className="text-sm" />
                        {format(parseISO(s.start_time), "HH:mm")} — {format(parseISO(s.end_time), "HH:mm")}
                      </div>
                    </td>
                    <td className="px-lg py-4">
                      <div className="flex items-center gap-2">
                        <Icon name="local_shipping" className="text-on-surface-variant" />
                        <span className="text-body-sm font-medium">{s.vehicles?.name || 'Nessuno'}</span>
                      </div>
                    </td>
                    <td className="px-lg py-4">
                      <span className={`px-3 py-1 rounded-full text-label-xs font-semibold uppercase tracking-wide ${
                        s.status === 'aperto' ? 'bg-emerald-50 text-emerald-700' :
                        s.status === 'chiuso' ? 'bg-amber-50 text-amber-700' :
                        s.status === 'completato' ? 'bg-gray-50 text-gray-500' :
                        'bg-red-50 text-red-600'
                      }`}>{s.status}</span>
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
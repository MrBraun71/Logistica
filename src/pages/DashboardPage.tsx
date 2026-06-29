import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Shift, Vehicle, Equipment, ShiftEquipment, ShiftVehicle } from '../types/database'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface ShiftWithVehicle extends Shift {
  vehicles?: Vehicle
  shift_vehicles?: (ShiftVehicle & { vehicles?: Vehicle })[]
  shift_equipment?: (ShiftEquipment & { equipment?: Equipment })[]
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [shifts, setShifts] = useState<ShiftWithVehicle[]>([])
  const [stats, setStats] = useState({ programmati: 0, chiusi: 0, completati: 0, cancellati: 0 })

  useEffect(() => {
    if (!profile?.organization_id) return
    const orgId = profile.organization_id

    async function load() {
      const [sr, programmati, chiusi, completati, cancellati] = await Promise.all([
        supabase.from('shifts').select('*, shift_vehicles(*, vehicles:vehicle_id(*)), shift_equipment(*, equipment:equipment_id(*))').eq('organization_id', orgId).order('start_time', { ascending: false }).limit(20),
        supabase.from('shifts').select('id', { count: 'exact' }).eq('organization_id', orgId).eq('status', 'aperto'),
        supabase.from('shifts').select('id', { count: 'exact' }).eq('organization_id', orgId).eq('status', 'chiuso'),
        supabase.from('shifts').select('id', { count: 'exact' }).eq('organization_id', orgId).eq('status', 'completato'),
        supabase.from('shifts').select('id', { count: 'exact' }).eq('organization_id', orgId).eq('status', 'cancellato'),
      ])

      setStats({
        programmati: programmati.count ?? 0,
        chiusi: chiusi.count ?? 0,
        completati: completati.count ?? 0,
        cancellati: cancellati.count ?? 0,
      })
      if (sr.data) setShifts(sr.data)
    }
    load()
  }, [profile?.organization_id])

  const isPast = (start: string) => new Date(start) < new Date()

  return (
    <div className="max-w-[1080px] mx-auto space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface leading-tight">
            Buongiorno, {profile?.first_name}
          </h2>
          <p className="text-on-surface-variant text-body-lg mt-1.5">Panoramica turni, mezzi e attrezzature</p>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest soft-card-shadow p-5 rounded-xl">
          <p className="text-label-caps text-on-surface-variant flex items-center gap-1.5"><Icon name="event_available" className="text-lg" />Programmati</p>
          <p className="text-headline-lg text-on-surface tracking-tight mt-1">{stats.programmati}</p>
        </div>
        <div className="bg-surface-container-lowest soft-card-shadow p-5 rounded-xl">
          <p className="text-label-caps text-on-surface-variant flex items-center gap-1.5"><Icon name="check_circle" className="text-lg" />Chiusi</p>
          <p className="text-headline-lg text-on-surface tracking-tight mt-1">{stats.chiusi}</p>
        </div>
        <div className="bg-surface-container-lowest soft-card-shadow p-5 rounded-xl">
          <p className="text-label-caps text-on-surface-variant flex items-center gap-1.5"><Icon name="task_alt" className="text-lg" />Completati</p>
          <p className="text-headline-lg text-on-surface tracking-tight mt-1">{stats.completati}</p>
        </div>
        <div className="bg-surface-container-lowest soft-card-shadow p-5 rounded-xl">
          <p className="text-label-caps text-on-surface-variant flex items-center gap-1.5"><Icon name="cancel" className="text-lg" />Cancellati</p>
          <p className="text-headline-lg text-on-surface tracking-tight mt-1">{stats.cancellati}</p>
        </div>
      </section>

      {/* Shifts Table */}
      <section className="bg-surface-container-lowest soft-card-shadow rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-container-low flex justify-between items-center">
          <h3 className="text-body-md font-semibold text-on-surface">Elenco Turni</h3>
          <span className="text-label-caps text-on-surface-variant">{shifts.length} turni</span>
        </div>

        {shifts.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <Icon name="calendar_month" className="text-3xl opacity-30 mb-2" />
            <p className="text-body-md">Nessun turno presente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-6 py-3.5 text-label-caps text-on-surface-variant">Data</th>
                  <th className="px-6 py-3.5 text-label-caps text-on-surface-variant">Turno</th>
                  <th className="px-6 py-3.5 text-label-caps text-on-surface-variant">Orario</th>
                  <th className="px-6 py-3.5 text-label-caps text-on-surface-variant">Mezzo</th>
                  <th className="px-6 py-3.5 text-label-caps text-on-surface-variant">Attrezzatura</th>
                  <th className="px-6 py-3.5 text-label-caps text-on-surface-variant">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-6 py-4">
                      <span className={`text-body-md font-medium ${isPast(s.start_time) ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                        {format(parseISO(s.start_time), "d MMM", { locale: it })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-body-md font-medium ${isPast(s.start_time) ? 'text-on-surface-variant' : 'text-on-surface'}`}>{s.title}</p>
                      <p className="text-status-label text-on-surface-variant mt-0.5">{s.type}</p>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">
                      {format(parseISO(s.start_time), "HH:mm")} — {format(parseISO(s.end_time), "HH:mm")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {s.shift_vehicles && s.shift_vehicles.length > 0 ? (
                          s.shift_vehicles.map(sv => (
                            <span key={sv.id} className="inline-flex items-center gap-1 text-status-label font-medium bg-surface-container-high text-on-surface px-2 py-1 rounded-md">
                              {sv.vehicles?.name || 'Veicolo'}
                            </span>
                          ))
                        ) : (
                          <span className="text-body-md text-on-surface-variant">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {s.shift_equipment && s.shift_equipment.length > 0 ? (
                          s.shift_equipment.map(se => (
                            <span key={se.id} className="inline-flex items-center gap-1 text-status-label font-medium bg-surface-container-high text-on-surface px-2 py-1 rounded-md">
                              {se.equipment?.articolo || se.equipment_id.slice(0, 6)}{se.quantity > 1 ? ` x${se.quantity}` : ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-body-md text-on-surface-variant">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-status-label font-semibold px-2.5 py-1 rounded-full ${
                        s.status === 'aperto' ? 'status-aperto' :
                        s.status === 'chiuso' ? 'status-manutenzione' :
                        s.status === 'completato' ? 'bg-surface-container text-on-surface-variant' :
                        'bg-error-container text-on-error-container'
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

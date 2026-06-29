import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Shift, Vehicle, Equipment, ShiftEquipment } from '../types/database'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface ShiftWithVehicle extends Shift {
  vehicles?: Vehicle
  shift_equipment?: (ShiftEquipment & { equipment?: Equipment })[]
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
        supabase.from('shifts').select('*, vehicles!vehicle_id(*), shift_equipment(*, equipment:equipment_id(*))').eq('organization_id', orgId).order('start_time', { ascending: false }).limit(20),
      ])

      setShiftCount(sc.count ?? 0)
      setVehicleCount(vc.count ?? 0)
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
          <h2 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-[#1d1d1f] leading-tight">
            Buongiorno, {profile?.first_name}
          </h2>
          <p className="text-[#6e6e73] text-[15px] mt-1.5">Panoramica turni, mezzi e attrezzature</p>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 rounded-xl">
          <p className="text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.05em]">Turni in programma</p>
          <p className="text-[44px] font-semibold text-[#1d1d1f] tracking-tight mt-1.5">{shiftCount}</p>
        </div>
        <div className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 rounded-xl">
          <p className="text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.05em]">Mezzi attivi</p>
          <p className="text-[44px] font-semibold text-[#1d1d1f] tracking-tight mt-1.5">{vehicleCount}</p>
        </div>
      </section>

      {/* Shifts Table */}
      <section className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#f2f2f7] flex justify-between items-center">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Elenco Turni</h3>
          <span className="text-[12px] text-[#6e6e73] font-medium">{shifts.length} turni</span>
        </div>

        {shifts.length === 0 ? (
          <div className="text-center py-16 text-[#6e6e73]">
            <Icon name="calendar_month" className="text-3xl opacity-30 mb-2" />
            <p className="text-sm">Nessun turno presente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.05em]">Data</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.05em]">Turno</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.05em]">Orario</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.05em]">Mezzo</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.05em]">Attrezzatura</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.05em]">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f7]">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-[#fafafa] transition-colors">
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${isPast(s.start_time) ? 'text-[#6e6e73]' : 'text-[#1d1d1f]'}`}>
                        {format(parseISO(s.start_time), "d MMM", { locale: it })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-sm font-medium ${isPast(s.start_time) ? 'text-[#6e6e73]' : 'text-[#1d1d1f]'}`}>{s.title}</p>
                      <p className="text-[11px] text-[#6e6e73] mt-0.5">{s.type}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6e6e73]">
                      {format(parseISO(s.start_time), "HH:mm")} — {format(parseISO(s.end_time), "HH:mm")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#6e6e73]">{s.vehicles?.name || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {s.shift_equipment && s.shift_equipment.length > 0 ? (
                          s.shift_equipment.map(se => (
                            <span key={se.id} className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#f5f5f7] text-[#1d1d1f] px-2 py-1 rounded-md">
                              {se.equipment?.articolo || se.equipment_id.slice(0, 6)}{se.quantity > 1 ? ` x${se.quantity}` : ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[#6e6e73]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        s.status === 'aperto' ? 'bg-[#f0fdf4] text-[#166534]' :
                        s.status === 'chiuso' ? 'bg-[#fffbeb] text-[#92400e]' :
                        s.status === 'completato' ? 'bg-[#f8fafc] text-[#64748b]' :
                        'bg-[#fef2f2] text-[#991b1b]'
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

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
        supabase.from('shifts').select('*, vehicles!vehicle_id(*), shift_equipment(*, equipment:equipment_id(*))').eq('organization_id', orgId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(10),
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
        <div className="flex gap-sm">
          <button className="px-md py-2 border border-outline-variant rounded-lg text-body-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors">
            <Icon name="download" /> Report PDF
          </button>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg flex items-center gap-lg">
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
            <Icon name="calendar_month" className="text-3xl" />
          </div>
          <div>
            <p className="text-on-surface-variant text-label-xs uppercase tracking-wider">Turni Imminenti</p>
            <h3 className="text-headline-md text-on-surface">{shiftCount} Prossimi Turni</h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg flex items-center gap-lg">
          <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
            <Icon name="local_shipping" className="text-3xl" />
          </div>
          <div>
            <p className="text-on-surface-variant text-label-xs uppercase tracking-wider">Operatività Mezzi</p>
            <h3 className="text-headline-md text-on-surface">{vehicleCount} Mezzi Attivi</h3>
          </div>
        </div>
      </section>

      {/* Upcoming Shifts Table */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div className="p-lg border-b border-outline-variant flex justify-between items-center">
          <div className="flex items-center gap-sm">
            <Icon name="list_alt" className="text-primary" />
            <h3 className="text-title-sm text-on-surface">Prossimi Turni</h3>
          </div>
          <button className="text-primary text-body-sm hover:underline">Vedi tutti</button>
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
                  <th className="px-lg py-4 text-label-xs text-outline uppercase tracking-wider">Attrezzatura</th>
                  <th className="px-lg py-4 text-label-xs text-outline uppercase tracking-wider">Stato</th>
                  <th className="px-lg py-4 text-label-xs text-outline uppercase tracking-wider">Azioni</th>
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
                      <div className="flex flex-wrap gap-1">
                        {s.shift_equipment && s.shift_equipment.length > 0 ? (
                          s.shift_equipment.map(se => (
                            <span key={se.id} className="inline-flex items-center gap-1 text-label-xs bg-surface-container-high px-2 py-0.5 rounded whitespace-nowrap">
                              <Icon name="inventory_2" className="text-[14px]" />
                              {se.equipment?.articolo || se.equipment_id.slice(0, 6)}{se.quantity > 1 ? ` x${se.quantity}` : ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-label-xs text-on-surface-variant">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-lg py-4">
                      <span className={`px-3 py-1 rounded-full text-label-xs font-semibold uppercase tracking-wide ${
                        s.status === 'aperto' ? 'shift-status-aperto' :
                        s.status === 'chiuso' ? 'bg-amber-50 text-amber-700' :
                        s.status === 'completato' ? 'bg-gray-50 text-gray-500' :
                        'bg-red-50 text-red-600'
                      }`}>{s.status}</span>
                    </td>
                    <td className="px-lg py-4">
                      <button className="p-2 hover:bg-surface-container-highest rounded-full transition-colors opacity-0 group-hover:opacity-100">
                        <Icon name="more_vert" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Mappa Operativa Real-Time e Promemoria Flotta */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant p-lg rounded-lg">
          <h3 className="text-title-sm text-on-surface mb-md">Mappa Operativa Real-Time</h3>
          <div className="relative h-[300px] w-full rounded bg-surface-container-high overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high via-primary-container/20 to-surface-container-high flex items-center justify-center">
              <div className="text-center text-on-surface-variant">
                <Icon name="map" className="text-5xl mb-2 opacity-40" />
                <p className="text-body-sm opacity-60">Mappa Hub Principale — Milano Nord</p>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div className="bg-white/90 backdrop-blur-md p-3 rounded shadow-lg text-on-surface">
                <p className="text-label-xs font-bold uppercase mb-1">Hub Principale</p>
                <p className="text-body-sm">Milano Nord - Terminal A</p>
              </div>
              <div className="flex flex-col gap-2">
                <button className="w-10 h-10 rounded bg-white shadow-md flex items-center justify-center text-primary"><Icon name="add" /></button>
                <button className="w-10 h-10 rounded bg-white shadow-md flex items-center justify-center text-primary"><Icon name="remove" /></button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg">
          <h3 className="text-title-sm text-on-surface mb-md">Promemoria Flotta</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-md p-3 rounded hover:bg-surface-container-high transition-colors">
              <div className="mt-1 w-2 h-2 rounded-full bg-error"></div>
              <div>
                <p className="text-body-sm font-medium text-on-surface">Scadenza Assicurazione</p>
                <p className="text-label-xs text-on-surface-variant">Veicolo in scadenza tra 2 giorni.</p>
              </div>
            </div>
            <div className="flex items-start gap-md p-3 rounded hover:bg-surface-container-high transition-colors">
              <div className="mt-1 w-2 h-2 rounded-full bg-primary"></div>
              <div>
                <p className="text-body-sm font-medium text-on-surface">Revisione Veicoli</p>
                <p className="text-label-xs text-on-surface-variant">Pianificare revisione entro venerdì.</p>
              </div>
            </div>
            <div className="flex items-start gap-md p-3 rounded hover:bg-surface-container-high transition-colors">
              <div className="mt-1 w-2 h-2 rounded-full bg-tertiary"></div>
              <div>
                <p className="text-body-sm font-medium text-on-surface">Aggiornamento Documenti</p>
                <p className="text-label-xs text-on-surface-variant">Caricare documenti nuovi assunti.</p>
              </div>
            </div>
          </div>
          <button className="w-full mt-lg py-2 text-primary text-title-sm border border-primary/20 rounded hover:bg-primary/5 transition-colors">
            Gestisci Promemoria
          </button>
        </div>
      </section>
    </div>
  )
}
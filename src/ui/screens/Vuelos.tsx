// src/ui/screens/Vuelos.tsx
// Lista completa, en orden cronologico inverso.
//
// Sin paginacion ni scroll virtual: con menos de 100 registros no compran
// nada y añaden un modo de fallo. Ver el spec §6.
import { useState } from 'preact/hooks'
import { logbookTotals } from '../../domain/totals'
import { flightDurationMin } from '../../domain/flight'
import type { PilotFunction } from '../../domain/types'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { Screen } from '../components/Screen'
import { formatDateShort, formatHm, labelFunction } from '../format'
import { balloonById, filterFlights, flightTitle, flightYears, sortedFlights } from '../select'
import { hrefOf } from '../router'
import { useDoc } from '../state'
import { hoy } from '../today'

const FUNCIONES: PilotFunction[] = ['PIC', 'PIC_SOLO_SUPERVISED', 'DUAL', 'FI_B', 'FE_B']

const CHIP = `
  font: inherit; font-size: 13px; padding: 7px 13px; border-radius: 15px;
  border: 1px solid var(--border); background: var(--bg); color: var(--muted);
  width: auto; appearance: none; -webkit-appearance: none;
`
const CHIP_ACTIVO = `${CHIP} border-color: var(--accent); color: var(--text);`

/** Aviso de estado de la tarjeta. Uno solo, el mas urgente. */
function Estado({ completo, firma }: { completo: boolean; firma: string }) {
  if (!completo) {
    return (
      <span style="font-size: 12px; color: var(--warn); display: flex; align-items: center; gap: 4px;">
        <Icon name="aviso" size={12} color="var(--warn)" width={2.4} />
        Sin rematar
      </span>
    )
  }
  if (firma === 'pending') {
    return (
      <span style="font-size: 12px; color: var(--warn); display: flex; align-items: center; gap: 4px;">
        <Icon name="aviso" size={12} color="var(--warn)" width={2.4} />
        Falta la firma
      </span>
    )
  }
  if (firma === 'signed') {
    return (
      <span style="font-size: 12px; color: var(--ok); display: flex; align-items: center; gap: 4px;">
        <Icon name="check" size={12} color="var(--ok)" width={2.6} />
        Firmado
      </span>
    )
  }
  return null
}

export function Vuelos() {
  const doc = useDoc()
  const [year, setYear] = useState('')
  const [balloonId, setBalloonId] = useState('')
  const [pf, setPf] = useState('')

  const total = logbookTotals(doc, hoy())
  const años = flightYears(doc.flights)

  const lista = sortedFlights(filterFlights(doc.flights, {
    year: year === '' ? undefined : year,
    balloonId: balloonId === '' ? undefined : balloonId,
    pilotFunction: pf === '' ? undefined : (pf as PilotFunction),
  }))

  return (
    <Screen
      title="Vuelos"
      tab="vuelos"
      right={
        <span class="num dim" style="font-size: 13px;">
          {total.flights} {total.flights === 1 ? 'vuelo' : 'vuelos'} · {formatHm(total.minutes)}
        </span>
      }
    >
      <div style="display: flex; gap: 8px; padding: 4px 20px 14px 20px; overflow-x: auto;">
        <select
          style={year === '' ? CHIP : CHIP_ACTIVO}
          value={year}
          onChange={e => setYear((e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">Todos los años</option>
          {años.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          style={balloonId === '' ? CHIP : CHIP_ACTIVO}
          value={balloonId}
          onChange={e => setBalloonId((e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">Todos los globos</option>
          {doc.balloons.map(b => (
            <option key={b.id} value={b.id}>{b.registration || 'Sin matricula'}</option>
          ))}
        </select>
        <select
          style={pf === '' ? CHIP : CHIP_ACTIVO}
          value={pf}
          onChange={e => setPf((e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">Todas las funciones</option>
          {FUNCIONES.map(f => <option key={f} value={f}>{labelFunction(f)}</option>)}
        </select>
      </div>

      <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 9px;">
        {doc.flights.length === 0 && (
          <Notice tone="info" title="Todavia no hay ningun vuelo">
            El boton de cerrar vuelo de Inicio crea el primero en diez segundos, y se
            remata en casa.
          </Notice>
        )}

        {doc.flights.length > 0 && lista.length === 0 && (
          <Notice tone="info" title="Ningun vuelo con esos filtros" />
        )}

        {lista.map(f => {
          const globo = balloonById(doc, f.balloonId)
          return (
            <a
              key={f.id}
              href={hrefOf({ name: 'detalle', flightId: f.id })}
              class="card"
              style={`
                text-decoration: none; color: inherit; display: block;
                ${f.complete ? '' : 'border-left: 3px solid var(--warn);'}
              `}
            >
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 10px;">
                <span class="num dim" style="font-size: 13px;">{formatDateShort(f.date)}</span>
                <Estado completo={f.complete} firma={f.signatureStatus} />
              </div>
              <div style="font-size: 16px; margin-top: 4px;">{flightTitle(doc, f)}</div>
              <div class="muted" style="display: flex; gap: 14px; margin-top: 6px; font-size: 13px;">
                <span class="num">{formatHm(flightDurationMin(f))}</span>
                <span>{labelFunction(f.pilotFunction)}</span>
                <span class="num">{globo === null ? 'Sin globo' : globo.registration}</span>
              </div>
            </a>
          )
        })}
      </div>
    </Screen>
  )
}

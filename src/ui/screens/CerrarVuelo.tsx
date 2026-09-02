// src/ui/screens/CerrarVuelo.tsx
// El camino de entrada de despues de aterrizar.
//
// Con el globo en el suelo y el equipo plegando, nadie rellena veinte campos.
// Si el unico camino fuera el formulario entero, la app se abandonaria en tres
// semanas. Por eso aqui van cuatro campos y nada mas. Ver el spec §6.
import { useEffect, useState } from 'preact/hooks'
import { Stepper, TextArea } from '../components/Field'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { Sheet } from '../components/Screen'
import { balloonById, personName } from '../select'
import { formatCoords, labelFunction } from '../format'
import { flightFromQuickClose, heredado } from '../newFlight'
import { newId } from '../ids'
import { navigate } from '../router'
import { useDoc, useStore } from '../state'
import { hoy } from '../today'
import type { Coords } from '../../domain/types'

function ahoraHhmm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Posicion =
  | { estado: 'pidiendo' }
  | { estado: 'ok'; coords: Coords; precisionM: number }
  | { estado: 'no'; motivo: string }

export function CerrarVuelo() {
  const doc = useDoc()
  const { update } = useStore()

  const [hora, setHora] = useState(ahoraHhmm())
  const [landings, setLandings] = useState(1)
  const [nota, setNota] = useState('')
  const [siteId, setSiteId] = useState<string | null>(null)
  const [pos, setPos] = useState<Posicion>({ estado: 'pidiendo' })

  // Se pide la posicion al abrir, no al pulsar: para cuando el piloto llegue al
  // campo "donde", el GPS ya ha fijado. Si la deniega, se sigue sin ella: nada
  // depende de tener GPS. Ver el spec §8.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPos({ estado: 'no', motivo: 'Este navegador no da la posicion' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      p => setPos({
        estado: 'ok',
        coords: { lat: p.coords.latitude, lon: p.coords.longitude },
        precisionM: Math.round(p.coords.accuracy),
      }),
      err => setPos({ estado: 'no', motivo: err.message }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }, [])

  const h = heredado(doc)
  const globo = balloonById(doc, h.balloonId)
  const coords = pos.estado === 'ok' ? pos.coords : null

  const guardar = () => {
    const id = newId()
    update(d => ({
      ...d,
      flights: [
        ...d.flights,
        flightFromQuickClose(d, id, {
          date: hoy(),
          landingTime: hora,
          coords,
          siteId,
          landings,
          notes: nota,
        }),
      ],
    }))
    navigate({ name: 'detalle', flightId: id })
  }

  return (
    <Sheet
      title="Cerrar vuelo"
      overline="Cuatro campos. El resto se completa en casa."
      footer={
        <>
          <button class="primary" onClick={guardar}>Guardar</button>
          <div class="lbl dim" style="text-align: center; margin-top: 10px;">
            Quedara marcado como incompleto
          </div>
        </>
      }
    >
      <div style="padding: 8px 20px 24px 20px;">
        {/* Hora nativa y no dos botones de mas y menos: corregir veinte minutos
            a pulsaciones de uno en uno serian veinte toques, y el selector del
            iPhone lo hace en dos. */}
        <div style="margin-bottom: 24px;">
          <div class="cap" style="margin-bottom: 8px;">Hora de aterrizaje</div>
          <input
            type="time"
            value={hora}
            onInput={e => setHora((e.currentTarget as HTMLInputElement).value)}
            class="num"
            style="font-size: 32px; text-align: center; padding: 12px;"
          />
        </div>

        <div style="margin-bottom: 24px;">
          <div class="cap" style="margin-bottom: 8px;">Donde</div>

          <div class="outline" style="display: flex; align-items: center; gap: 11px; margin-bottom: 10px;">
            <Icon name="pin" size={19} color="var(--accent)" />
            <div style="flex-grow: 1; min-width: 0;">
              {pos.estado === 'pidiendo' && <div class="dim">Buscando la posicion...</div>}
              {pos.estado === 'ok' && (
                <>
                  <div class="num" style="font-size: 16px;">{formatCoords(pos.coords)}</div>
                  <div class="dim" style="font-size: 12px;">
                    Posicion actual, ±{pos.precisionM} m
                  </div>
                </>
              )}
              {pos.estado === 'no' && (
                <>
                  <div class="dim">Sin posicion</div>
                  <div class="dim" style="font-size: 12px;">{pos.motivo}</div>
                </>
              )}
            </div>
          </div>

          <select
            value={siteId ?? ''}
            onChange={e => {
              const v = (e.currentTarget as HTMLSelectElement).value
              setSiteId(v === '' ? null : v)
            }}
          >
            <option value="">Campo abierto, con las coordenadas de arriba</option>
            {doc.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {siteId === null && coords === null && (
            <div style="margin-top: 10px;">
              <Notice tone="warn" title="Sin posicion y sin campo elegido">
                El vuelo se guardara sin lugar de aterrizaje. Lo puedes poner en casa desde
                el detalle.
              </Notice>
            </div>
          )}
        </div>

        <Stepper label="Aterrizajes en este vuelo" value={landings} onChange={setLandings} min={0} />

        <TextArea
          label="Nota"
          value={nota}
          placeholder="Como fue, quien firmo, lo que no quieras olvidar"
          onChange={setNota}
        />

        <div class="card">
          <div class="cap" style="margin-bottom: 6px;">Se copia del ultimo vuelo</div>
          <div class="muted" style="font-size: 13px; line-height: 1.5;">
            Globo {globo === null ? 'sin asignar' : globo.registration},
            {' '}funcion {labelFunction(h.pilotFunction).toLowerCase()},
            {' '}instructor {personName(doc, h.instructorId).toLowerCase()}.
          </div>
          <div class="dim" style="font-size: 13px; margin-top: 6px;">
            Ni la hora de despegue ni los inflados se adivinan. Se piden al rematar.
          </div>
        </div>
      </div>
    </Sheet>
  )
}

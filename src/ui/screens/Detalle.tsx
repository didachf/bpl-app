// src/ui/screens/Detalle.tsx
// El formulario completo del vuelo, en los dos bloques del spec §4.
//
// Los cambios se aplican al documento en cuanto se tocan, sin boton de
// guardar: el contexto ya agrupa los guardados con rebote, y un boton de
// guardar en un telefono es una forma de perder datos al salir de la app.
//
// La validacion AVISA y NO BLOQUEA. Una llegada anterior a la salida se señala
// y se guarda igual, porque el cuaderno tiene que poder reflejar lo que se
// anoto de verdad, y porque `hasConsistentTimes` ya se encarga de que ese
// vuelo no reste horas del acumulado.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { flightDurationMin, hasConsistentTimes } from '../../domain/flight'
import type {
  CheckType, Flight, PilotFunction, SignatureStatus, Uuid,
} from '../../domain/types'
import {
  NumberField, SelectField, Stepper, TextArea, TextField, Toggle,
} from '../components/Field'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { Sheet } from '../components/Screen'
import { formatDateLong, formatHm, labelFunction, labelSignature } from '../format'
import { hhmmFrom, localTimestamp } from '../newFlight'
import { missingFields } from '../incomplete'
import { navigate } from '../router'
import { balloonLabel, flightTitle } from '../select'
import { useDoc, useStore } from '../state'

const FUNCIONES: PilotFunction[] = ['PIC', 'PIC_SOLO_SUPERVISED', 'DUAL', 'FI_B', 'FE_B']
const FIRMAS: SignatureStatus[] = ['not_required', 'pending', 'signed']

function Bloque(
  { titulo, abierto, onToggle, children }: {
    titulo: string; abierto: boolean; onToggle: () => void; children: ComponentChildren
  },
) {
  return (
    <section style="margin-bottom: 8px;">
      <button
        class="linkish"
        onClick={onToggle}
        style="
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 12px 0; color: var(--dim);
        "
      >
        <span class="cap">{titulo}</span>
        <Icon name={abierto ? 'arriba' : 'abajo'} size={16} color="var(--dim)" width={2.4} />
      </button>
      {abierto && <div>{children}</div>}
    </section>
  )
}

export function Detalle({ flightId }: { flightId: string }) {
  const doc = useDoc()
  const { update } = useStore()
  const [verReglamentario, setVerReglamentario] = useState(true)
  const [verOperacional, setVerOperacional] = useState(false)

  const f = doc.flights.find(x => x.id === flightId)

  if (f === undefined) {
    return (
      <Sheet title="Vuelo">
        <div style="padding: 8px 20px;">
          <Notice tone="warn" title="Ese vuelo ya no existe">
            Puede que lo borraras desde otro dispositivo y la copia se haya restaurado.
          </Notice>
        </div>
      </Sheet>
    )
  }

  /** Aplica un cambio al vuelo. Documento nuevo, vuelo nuevo, nada mutado. */
  const set = (campo: Partial<Flight>) => update(d => ({
    ...d,
    flights: d.flights.map(x => (x.id === flightId ? { ...x, ...campo } : x)),
  }))

  const faltan = missingFields(doc, f)
  const horasIncoherentes = !hasConsistentTimes(f)
  const duracion = flightDurationMin(f)

  const personas = doc.people.map(p => ({
    value: p.id,
    label: p.name === '' ? 'Sin nombre' : p.name,
  }))
  const instructores = doc.people
    .filter(p => p.roles.includes('instructor'))
    .map(p => ({ value: p.id, label: p.name === '' ? 'Sin nombre' : p.name }))
  const examinadores = doc.people
    .filter(p => p.roles.includes('examiner'))
    .map(p => ({ value: p.id, label: p.name === '' ? 'Sin nombre' : p.name }))

  const campos = doc.sites.map(s => ({ value: s.id, label: s.name || 'Campo sin nombre' }))

  return (
    <Sheet
      title={flightTitle(doc, f)}
      overline={formatDateLong(f.date)}
      footer={
        <>
          {faltan.length > 0 ? (
            <>
              <div class="lbl dim" style="margin-bottom: 10px; line-height: 1.45;">
                Faltan {faltan.length} campos: {faltan.join(', ').toLowerCase()}.
              </div>
              <button class="secondary" disabled>Marcar como completo</button>
            </>
          ) : (
            <button
              class={f.complete ? 'secondary' : 'primary'}
              onClick={() => set({ complete: !f.complete })}
            >
              {f.complete ? 'Volver a marcarlo como incompleto' : 'Marcar como completo'}
            </button>
          )}
        </>
      }
    >
      <div style="padding: 0 20px 24px 20px;">
        {!f.complete && (
          <div style="margin-bottom: 14px;">
            <Notice tone="warn" title="Vuelo sin rematar">
              Cuenta como vuelo en el acumulado, pero lo marca como parcial hasta que estos
              campos esten metidos.
            </Notice>
          </div>
        )}

        {horasIncoherentes && (
          <div style="margin-bottom: 14px;">
            <Notice tone="warn" title="Las horas no cuadran">
              La llegada es anterior a la salida, o falta alguna de las dos. El vuelo aporta
              0 minutos al acumulado y queda señalado, pero se guarda igual.
            </Notice>
          </div>
        )}

        <Bloque
          titulo="Reglamentario"
          abierto={verReglamentario}
          onToggle={() => setVerReglamentario(!verReglamentario)}
        >
          <TextField
            label="Fecha" type="date" value={f.date}
            onChange={v => set({ date: v })}
          />
          <SelectField
            label="Piloto al mando" value={f.picId} options={personas}
            empty="Sin asignar"
            onChange={v => set({ picId: v ?? '' })}
          />
          <SelectField
            label="Funcion" value={f.pilotFunction}
            options={FUNCIONES.map(x => ({ value: x, label: labelFunction(x) }))}
            onChange={v => set({ pilotFunction: (v ?? 'DUAL') as PilotFunction })}
          />
          <SelectField
            label="Globo" value={f.balloonId}
            options={doc.balloons.map(b => ({ value: b.id, label: balloonLabel(b) }))}
            empty="Sin asignar"
            onChange={v => set({ balloonId: v ?? '' })}
          />

          <SelectField
            label="Campo de despegue" value={f.departure.siteId} options={campos}
            empty="Fuera del catalogo"
            onChange={v => set({ departure: { ...f.departure, siteId: v } })}
          />
          <TextField
            label="Hora de despegue" type="time" value={hhmmFrom(f.departure.timestamp)}
            onChange={v => set({
              departure: { ...f.departure, timestamp: localTimestamp(f.date, v) },
            })}
          />
          <SelectField
            label="Lugar de aterrizaje" value={f.arrival.siteId} options={campos}
            empty="Campo abierto"
            hint={
              f.arrival.coords === null
                ? undefined
                : `Coordenadas guardadas: ${f.arrival.coords.lat.toFixed(4)}, ${f.arrival.coords.lon.toFixed(4)}`
            }
            onChange={v => set({ arrival: { ...f.arrival, siteId: v } })}
          />
          <TextField
            label="Hora de aterrizaje" type="time" value={hhmmFrom(f.arrival.timestamp)}
            onChange={v => set({
              arrival: { ...f.arrival, timestamp: localTimestamp(f.date, v) },
            })}
          />

          <div style="margin-bottom: 18px;">
            <div class="cap" style="margin-bottom: 7px;">Duracion</div>
            <div class="num" style="font-size: 28px;">{formatHm(duracion)}</div>
            <div class="lbl dim" style="margin-top: 4px;">
              {f.durationOverrideMin === null
                ? 'Calculada de las dos horas.'
                : 'Puesta a mano. Manda sobre las dos horas.'}
            </div>
          </div>
          <NumberField
            label="Duracion a mano" unit="min" value={f.durationOverrideMin}
            hint={
              'Solo si la hora de despegue real y la de puesta en marcha difieren. '
              + 'Dejalo vacio para que se calcule.'
            }
            onChange={v => set({ durationOverrideMin: v })}
          />

          <Stepper label="Inflados" value={f.inflations} onChange={v => set({ inflations: v })} />
          <Stepper label="Despegues" value={f.takeoffs} onChange={v => set({ takeoffs: v })} />
          <Stepper label="Aterrizajes" value={f.landings} onChange={v => set({ landings: v })} />

          <SelectField
            label="Momento del dia" value={f.dayNight}
            options={[{ value: 'day', label: 'Dia' }, { value: 'night', label: 'Noche' }]}
            onChange={v => set({ dayNight: v === 'night' ? 'night' : 'day' })}
            hint="Volar de noche exige la habilitacion de BFCL.210, que esta app no comprueba."
          />
          <SelectField
            label="Tipo de vuelo" value={f.tether}
            options={[{ value: 'free', label: 'Vuelo libre' }, { value: 'tethered', label: 'Cautivo' }]}
            onChange={v => set({ tether: v === 'tethered' ? 'tethered' : 'free' })}
          />

          <SelectField
            label="Instructor" value={f.instructorId} options={instructores}
            empty="Ninguno"
            hint={
              instructores.length === 0
                ? 'Ninguna persona tiene el rol de instructor. Se pone en Ajustes, Personas.'
                : 'BFCL.160(e) exige su firma en los dobles mando y en los supervisados.'
            }
            onChange={v => set({ instructorId: v })}
          />
          <SelectField
            label="Firma del instructor" value={f.signatureStatus}
            options={FIRMAS.map(x => ({ value: x, label: labelSignature(x) }))}
            onChange={v => set({ signatureStatus: (v ?? 'not_required') as SignatureStatus })}
          />

          <Toggle
            label="Vuelo de instruccion que cuenta para la vigencia"
            checked={f.recencyTrainingFlight}
            hint={
              'Marcalo solo si siguio el contenido del examen practico y fue uno a uno con '
              + 'el instructor, sin otro piloto a bordo que se acredite el vuelo. Es lo que '
              + 'pide AMC1 BFCL.160(a)(1)(ii)(a) y es un juicio del instructor, no algo que '
              + 'la app pueda deducir.'
            }
            onChange={v => set({ recencyTrainingFlight: v })}
          />

          <SelectField
            label="Verificacion"
            value={f.check === null ? '' : f.check.type}
            options={[
              { value: 'skill_test', label: 'Examen practico' },
              { value: 'proficiency_check', label: 'Verificacion de competencia' },
            ]}
            empty="Ninguna"
            hint={
              examinadores.length === 0
                ? 'Ninguna persona tiene el rol de examinador. Sin un FE(B), BFCL.160(c) no se cumple.'
                : undefined
            }
            onChange={v => {
              if (v === null) { set({ check: null }); return }
              set({
                check: {
                  type: v as CheckType,
                  examinerId: f.check?.examinerId ?? '',
                  result: f.check?.result ?? 'passed',
                },
              })
            }}
          />
          {f.check !== null && (
            <>
              <SelectField
                label="Examinador" value={f.check.examinerId === '' ? null : f.check.examinerId}
                options={examinadores} empty="Sin asignar"
                onChange={v => set({
                  check: f.check === null ? null : { ...f.check, examinerId: (v ?? '') as Uuid },
                })}
              />
              <SelectField
                label="Resultado" value={f.check.result}
                options={[
                  { value: 'passed', label: 'Aprobada' },
                  { value: 'failed', label: 'No aprobada' },
                ]}
                onChange={v => set({
                  check: f.check === null
                    ? null
                    : { ...f.check, result: v === 'failed' ? 'failed' : 'passed' },
                })}
              />
            </>
          )}
        </Bloque>

        <Bloque
          titulo="Operacional"
          abierto={verOperacional}
          onToggle={() => setVerOperacional(!verOperacional)}
        >
          <div class="cap" style="margin-bottom: 4px;">Equipo de tierra</div>
          {doc.people.map(p => (
            <Toggle
              key={`crew-${p.id}`}
              label={p.name === '' ? 'Sin nombre' : p.name}
              checked={f.crewIds.includes(p.id)}
              onChange={m => set({
                crewIds: m ? [...f.crewIds, p.id] : f.crewIds.filter(x => x !== p.id),
              })}
            />
          ))}

          <div class="cap" style="margin: 18px 0 4px 0;">Pasajeros</div>
          {doc.people.map(p => (
            <Toggle
              key={`pax-${p.id}`}
              label={p.name === '' ? 'Sin nombre' : p.name}
              checked={f.passengerIds.includes(p.id)}
              onChange={m => set({
                passengerIds: m ? [...f.passengerIds, p.id] : f.passengerIds.filter(x => x !== p.id),
              })}
            />
          ))}

          <div style="height: 18px;"></div>

          <TextArea
            label="Meteo que hubo de verdad"
            value={f.observedWeather}
            placeholder="Viento en superficie, inversion, visibilidad, lo que difirio del pronostico"
            hint="Con el tiempo, contrastarla con la pronosticada calibra las previsiones."
            onChange={v => set({ observedWeather: v })}
          />
          <NumberField
            label="Altitud maxima" unit="m" value={f.maxAltitudeM}
            onChange={v => set({ maxAltitudeM: v })}
          />
          <NumberField
            label="Distancia" unit="km" step="0.1" value={f.distanceKm}
            onChange={v => set({ distanceKm: v })}
          />
          <TextArea label="Notas" value={f.notes} onChange={v => set({ notes: v })} />
        </Bloque>

        <button
          class="linkish"
          style="color: var(--danger); display: flex; align-items: center; gap: 6px; margin-top: 20px;"
          onClick={() => {
            if (!confirm('Borrar este vuelo del cuaderno? No se puede deshacer desde la app.')) return
            update(d => ({ ...d, flights: d.flights.filter(x => x.id !== flightId) }))
            navigate({ name: 'vuelos' })
          }}
        >
          <Icon name="papelera" size={15} color="var(--danger)" />
          Borrar este vuelo
        </button>
      </div>
    </Sheet>
  )
}

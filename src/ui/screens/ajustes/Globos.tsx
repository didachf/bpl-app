// src/ui/screens/ajustes/Globos.tsx
import { useState } from 'preact/hooks'
import { groupFromVolume } from '../../../domain/balloon'
import type { Balloon, BalloonClass } from '../../../domain/types'
import { NumberField, SelectField, TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { Notice } from '../../components/Notice'
import { Sheet } from '../../components/Screen'
import { labelClass, labelGroup } from '../../format'
import { newId } from '../../ids'
import { useDoc, useStore } from '../../state'
import { LIMITE_FM04_KT, PRACTICA_FAA_KT } from '../../windLimits'

const CLASES: BalloonClass[] = ['hot_air', 'gas', 'mixed', 'hot_air_airship']

function nuevoGlobo(): Balloon {
  return {
    id: newId(),
    registration: '',
    manufacturer: '',
    model: '',
    balloonClass: 'hot_air',
    envelopeVolumeM3: 0,
    // 15 kt del FM04 §2.2 de Ultramagic como sugerencia, porque es el globo
    // que vuela Didac. Se sugiere aqui y NO en la migracion: al crear un globo
    // el campo esta delante y se puede corregir, y la pista de al lado avisa
    // de que el Suplemento 34 baja a 12 kt para la N-500.
    maxSurfaceWindKt: LIMITE_FM04_KT,
  }
}

/**
 * El grupo, derivado y nunca guardado.
 *
 * `groupFromVolume` lanza con un volumen que no sea positivo, asi que un globo
 * a medio meter no puede pasar por ahi. Se dice que falta el volumen en lugar
 * de enseñar un grupo inventado.
 */
function Grupo({ m3, clase }: { m3: number; clase: BalloonClass }) {
  if (clase !== 'hot_air') {
    return <span class="dim">Los grupos A a D solo aplican al aire caliente</span>
  }
  if (!(m3 > 0)) return <span class="dim">Falta el volumen de envolvente</span>
  return <span>Grupo {labelGroup(groupFromVolume(m3))}</span>
}

function Editor({ balloon, onChange, onDelete }: {
  balloon: Balloon
  onChange: (b: Balloon) => void
  onDelete: () => void
}) {
  return (
    <div class="outline" style="margin-bottom: 14px;">
      <TextField
        label="Matricula"
        value={balloon.registration}
        placeholder="EC-KMU"
        onChange={v => onChange({ ...balloon, registration: v.toUpperCase() })}
      />
      <TextField
        label="Fabricante"
        value={balloon.manufacturer}
        placeholder="Ultramagic"
        onChange={v => onChange({ ...balloon, manufacturer: v })}
      />
      <TextField
        label="Modelo"
        value={balloon.model}
        placeholder="M-105"
        onChange={v => onChange({ ...balloon, model: v })}
      />
      <SelectField
        label="Clase"
        value={balloon.balloonClass}
        options={CLASES.map(c => ({ value: c, label: labelClass(c) }))}
        onChange={v => onChange({ ...balloon, balloonClass: (v ?? 'hot_air') as BalloonClass })}
        hint="BFCL.010 define cuatro. Un dirigible de aire caliente NO es un globo de aire caliente."
      />
      <NumberField
        label="Volumen de envolvente"
        unit="m³"
        value={balloon.envelopeVolumeM3 === 0 ? null : balloon.envelopeVolumeM3}
        onChange={v => onChange({ ...balloon, envelopeVolumeM3: v ?? 0 })}
      />
      <div class="lbl" style="margin: -8px 0 14px 0;">
        <Grupo m3={balloon.envelopeVolumeM3} clase={balloon.balloonClass} />
      </div>
      <NumberField
        label="Viento maximo de despegue"
        unit="kt"
        value={balloon.maxSurfaceWindKt}
        hint={
          `Del Manual de Vuelo de ESTE globo, no del reglamento: Part-BFCL no tiene ninguna `
          + `cifra de viento. El FM04 de Ultramagic dice ${LIMITE_FM04_KT} kt en §2.2, pero el `
          + `Suplemento 34 baja a 12 kt para la envolvente N-500 y a 10 en cautivo. `
          + `Comprueba cual es la de este globo. La practica habitual que cita el FAA esta muy `
          + `por debajo, en menos de ${PRACTICA_FAA_KT} kt.`
        }
        onChange={v => onChange({ ...balloon, maxSurfaceWindKt: v })}
      />
      <button
        class="linkish"
        style="color: var(--danger); display: flex; align-items: center; gap: 6px;"
        onClick={onDelete}
      >
        <Icon name="papelera" size={15} color="var(--danger)" />
        Borrar este globo
      </button>
    </div>
  )
}

export function Globos() {
  const doc = useDoc()
  const { update } = useStore()
  const [abierto, setAbierto] = useState<string | null>(null)

  const usados = new Set(doc.flights.map(f => f.balloonId))

  return (
    <Sheet
      title="Globos"
      action={
        <button
          class="linkish"
          onClick={() => {
            const b = nuevoGlobo()
            update(d => ({ ...d, balloons: [...d.balloons, b] }))
            setAbierto(b.id)
          }}
        >
          Añadir
        </button>
      }
    >
      <div style="padding: 8px 20px 32px 20px;">
        {doc.balloons.length === 0 && (
          <Notice tone="info" title="Ningun globo todavia">
            Sin globo no se puede anotar un vuelo: el cuaderno exige fabricante, modelo y
            matricula por AMC1 BFCL.050(a)(2).
          </Notice>
        )}

        {doc.balloons.map(b => (
          <div key={b.id}>
            <button
              class="linkish"
              style="
                display: flex; align-items: center; gap: 10px; width: 100%;
                padding: 13px 0; border-bottom: 1px solid var(--border); color: var(--text);
              "
              onClick={() => setAbierto(abierto === b.id ? null : b.id)}
            >
              <span class="num" style="font-size: 16px;">
                {b.registration === '' ? 'Sin matricula' : b.registration}
              </span>
              <span class="dim" style="flex-grow: 1; text-align: left; font-size: 14px;">
                {b.model}
              </span>
              <Icon name={abierto === b.id ? 'arriba' : 'abajo'} size={16} color="var(--dim)" width={2.4} />
            </button>

            {abierto === b.id && (
              <div style="padding-top: 14px;">
                <Editor
                  balloon={b}
                  onChange={nuevo => update(d => ({
                    ...d,
                    balloons: d.balloons.map(x => (x.id === nuevo.id ? nuevo : x)),
                  }))}
                  onDelete={() => {
                    if (usados.has(b.id)) {
                      alert(
                        'Este globo figura en algun vuelo. Borrarlo dejaria esos vuelos sin '
                        + 'globo, y la vigencia los excluiria. Cambia el globo de esos vuelos '
                        + 'antes de borrarlo.',
                      )
                      return
                    }
                    if (!confirm(`Borrar ${b.registration || 'este globo'}?`)) return
                    update(d => ({ ...d, balloons: d.balloons.filter(x => x.id !== b.id) }))
                    setAbierto(null)
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  )
}

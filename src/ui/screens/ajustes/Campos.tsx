// src/ui/screens/ajustes/Campos.tsx
import { useState } from 'preact/hooks'
import type { PermitStatus, Site } from '../../../domain/types'
import { NumberField, SelectField, TextArea, TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { Sheet } from '../../components/Screen'
import { formatCoords, labelPermit } from '../../format'
import { newId } from '../../ids'
import { useDoc, useStore } from '../../state'

const PERMISOS: PermitStatus[] = ['unknown', 'granted', 'denied', 'not_needed']

function nuevoCampo(): Site {
  return {
    id: newId(), name: '', lat: 0, lon: 0, elevationM: null,
    permitStatus: 'unknown', accessNotes: '',
  }
}

function Editor({ site, onChange, onDelete }: {
  site: Site; onChange: (s: Site) => void; onDelete: () => void
}) {
  return (
    <div class="outline" style="margin-bottom: 14px;">
      <TextField label="Nombre" value={site.name} onChange={v => onChange({ ...site, name: v })} />
      <NumberField
        label="Latitud" step="0.0001" value={site.lat}
        onChange={v => onChange({ ...site, lat: v ?? 0 })}
      />
      <NumberField
        label="Longitud" step="0.0001" value={site.lon}
        onChange={v => onChange({ ...site, lon: v ?? 0 })}
      />
      <NumberField
        label="Elevacion" unit="m" value={site.elevationM}
        onChange={v => onChange({ ...site, elevationM: v })}
      />
      <SelectField
        label="Permiso del propietario"
        value={site.permitStatus}
        options={PERMISOS.map(p => ({ value: p, label: labelPermit(p) }))}
        onChange={v => onChange({ ...site, permitStatus: (v ?? 'unknown') as PermitStatus })}
      />
      <TextArea
        label="Notas de acceso"
        value={site.accessNotes}
        placeholder="Por donde entra el coche de recuperacion, cancelas, estado del camino"
        onChange={v => onChange({ ...site, accessNotes: v })}
      />
      <button
        class="linkish"
        style="color: var(--danger); display: flex; align-items: center; gap: 6px;"
        onClick={onDelete}
      >
        <Icon name="papelera" size={15} color="var(--danger)" />
        Borrar este campo
      </button>
    </div>
  )
}

export function Campos() {
  const doc = useDoc()
  const { update } = useStore()
  const [abierto, setAbierto] = useState<string | null>(null)

  // Un campo referido por un vuelo no se borra: el vuelo se quedaria sin sitio
  // de despegue y el titulo de la tarjeta pasaria a "Sin indicar".
  const usados = new Set<string>()
  for (const f of doc.flights) {
    if (f.departure.siteId !== null) usados.add(f.departure.siteId)
    if (f.arrival.siteId !== null) usados.add(f.arrival.siteId)
  }

  return (
    <Sheet
      title="Campos"
      action={
        <button
          class="linkish"
          onClick={() => {
            const s = nuevoCampo()
            update(d => ({ ...d, sites: [...d.sites, s] }))
            setAbierto(s.id)
          }}
        >
          Añadir
        </button>
      }
    >
      <div style="padding: 8px 20px 32px 20px;">
        {doc.sites.map(s => (
          <div key={s.id}>
            <button
              class="linkish"
              style="
                display: flex; align-items: center; gap: 10px; width: 100%;
                padding: 13px 0; border-bottom: 1px solid var(--border); color: var(--text);
              "
              onClick={() => setAbierto(abierto === s.id ? null : s.id)}
            >
              <span style="font-size: 16px;">{s.name === '' ? 'Campo sin nombre' : s.name}</span>
              <span class="num dim" style="flex-grow: 1; text-align: left; font-size: 13px;">
                {formatCoords({ lat: s.lat, lon: s.lon })}
              </span>
              <Icon name={abierto === s.id ? 'arriba' : 'abajo'} size={16} color="var(--dim)" width={2.4} />
            </button>

            {abierto === s.id && (
              <div style="padding-top: 14px;">
                <Editor
                  site={s}
                  onChange={nuevo => update(d => ({
                    ...d, sites: d.sites.map(x => (x.id === nuevo.id ? nuevo : x)),
                  }))}
                  onDelete={() => {
                    if (usados.has(s.id)) {
                      alert('Este campo figura en algun vuelo. Cambia esos vuelos antes de borrarlo.')
                      return
                    }
                    if (!confirm(`Borrar ${s.name || 'este campo'}?`)) return
                    update(d => ({ ...d, sites: d.sites.filter(x => x.id !== s.id) }))
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

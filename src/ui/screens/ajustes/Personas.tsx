// src/ui/screens/ajustes/Personas.tsx
import { useState } from 'preact/hooks'
import type { Person, PersonRole } from '../../../domain/types'
import { TextField, Toggle } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { Notice } from '../../components/Notice'
import { Sheet } from '../../components/Screen'
import { labelRole } from '../../format'
import { newId } from '../../ids'
import { useDoc, useStore } from '../../state'

const ROLES: PersonRole[] = ['instructor', 'examiner', 'pilot', 'crew', 'passenger']

const PISTA: Partial<Record<PersonRole, string>> = {
  instructor: 'Sin este rol, un vuelo de instruccion no cuenta para la vigencia de 48 meses.',
  examiner: 'Sin este rol, una verificacion de competencia no cuenta. BFCL.160(c) exige un FE(B).',
}

function nuevaPersona(): Person {
  return { id: newId(), name: '', roles: [], licenceNumber: null }
}

export function Personas() {
  const doc = useDoc()
  const { update } = useStore()
  const [abierto, setAbierto] = useState<string | null>(null)

  const usadas = new Set<string>()
  for (const f of doc.flights) {
    usadas.add(f.picId)
    if (f.instructorId !== null) usadas.add(f.instructorId)
    if (f.check !== null) usadas.add(f.check.examinerId)
    for (const id of f.crewIds) usadas.add(id)
    for (const id of f.passengerIds) usadas.add(id)
  }

  return (
    <Sheet
      title="Personas"
      action={
        <button
          class="linkish"
          onClick={() => {
            const p = nuevaPersona()
            update(d => ({ ...d, people: [...d.people, p] }))
            setAbierto(p.id)
          }}
        >
          Añadir
        </button>
      }
    >
      <div style="padding: 8px 20px 32px 20px;">
        <div style="margin-bottom: 16px;">
          <Notice tone="info" title="Los roles deciden que cuenta">
            La app comprueba quien firma y quien examina, no solo que haya un nombre. Un
            examinador sin el rol de examinador no valida una verificacion de competencia.
          </Notice>
        </div>

        {doc.people.map(p => {
          const esElTitular = p.id === doc.pilot.personId
          return (
            <div key={p.id}>
              <button
                class="linkish"
                style="
                  display: flex; align-items: center; gap: 10px; width: 100%;
                  padding: 13px 0; border-bottom: 1px solid var(--border); color: var(--text);
                "
                onClick={() => setAbierto(abierto === p.id ? null : p.id)}
              >
                <span style="font-size: 16px;">
                  {p.name === '' ? 'Sin nombre' : p.name}
                  {esElTitular && <span class="dim" style="font-size: 13px;"> · tu</span>}
                </span>
                <span class="dim" style="flex-grow: 1; text-align: left; font-size: 13px;">
                  {p.roles.map(labelRole).join(', ')}
                </span>
                <Icon name={abierto === p.id ? 'arriba' : 'abajo'} size={16} color="var(--dim)" width={2.4} />
              </button>

              {abierto === p.id && (
                <div class="outline" style="margin: 14px 0;">
                  <TextField
                    label="Nombre"
                    value={p.name}
                    onChange={v => update(d => ({
                      ...d,
                      people: d.people.map(x => (x.id === p.id ? { ...x, name: v } : x)),
                      pilot: esElTitular ? { ...d.pilot, name: v } : d.pilot,
                    }))}
                  />
                  <TextField
                    label="Numero de licencia"
                    value={p.licenceNumber ?? ''}
                    onChange={v => update(d => ({
                      ...d,
                      people: d.people.map(x => (
                        x.id === p.id ? { ...x, licenceNumber: v.trim() === '' ? null : v } : x
                      )),
                    }))}
                  />
                  <div class="cap" style="margin-bottom: 4px;">Roles</div>
                  {ROLES.map(r => (
                    <Toggle
                      key={r}
                      label={labelRole(r)}
                      hint={PISTA[r]}
                      checked={p.roles.includes(r)}
                      onChange={marcado => update(d => ({
                        ...d,
                        people: d.people.map(x => (
                          x.id === p.id
                            ? {
                              ...x,
                              roles: marcado
                                ? [...x.roles, r]
                                : x.roles.filter(y => y !== r),
                            }
                            : x
                        )),
                      }))}
                    />
                  ))}

                  {esElTitular ? (
                    <div class="lbl dim" style="margin-top: 14px; line-height: 1.4;">
                      Esta persona eres tu. No se puede borrar: el documento la necesita para
                      poder decir que un examinador NO eres tu mismo.
                    </div>
                  ) : (
                    <button
                      class="linkish"
                      style="color: var(--danger); display: flex; align-items: center; gap: 6px; margin-top: 14px;"
                      onClick={() => {
                        if (usadas.has(p.id)) {
                          alert('Esta persona figura en algun vuelo. Cambia esos vuelos antes de borrarla.')
                          return
                        }
                        if (!confirm(`Borrar a ${p.name || 'esta persona'}?`)) return
                        update(d => ({ ...d, people: d.people.filter(x => x.id !== p.id) }))
                        setAbierto(null)
                      }}
                    >
                      <Icon name="papelera" size={15} color="var(--danger)" />
                      Borrar
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

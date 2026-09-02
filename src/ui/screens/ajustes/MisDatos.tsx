// src/ui/screens/ajustes/MisDatos.tsx
import { Notice } from '../../components/Notice'
import { Sheet } from '../../components/Screen'
import { TextField } from '../../components/Field'
import { useDoc, useStore } from '../../state'
import { hoy } from '../../today'
import type { LogbookDoc, Pilot } from '../../../domain/types'

/**
 * Cambia un campo del piloto.
 *
 * El nombre se copia ademas a la Person del titular. Van juntos porque
 * `pilot.personId` apunta a esa persona, y es la que `hasRoleAndIsNotThePilot`
 * usa para impedir que uno se autoexamine. Si se quedan descolgados, la lista
 * de personas enseña "Sin nombre" para el dueño del cuaderno.
 */
function cambiar(doc: LogbookDoc, campo: Partial<Pilot>): LogbookDoc {
  const pilot = { ...doc.pilot, ...campo }
  const people = campo.name === undefined
    ? doc.people
    : doc.people.map(p => (p.id === pilot.personId ? { ...p, name: campo.name as string } : p))
  return { ...doc, pilot, people }
}

export function MisDatos() {
  const doc = useDoc()
  const { update } = useStore()
  const p = doc.pilot
  const medicoCaducado = p.medicalExpiry !== null && p.medicalExpiry < hoy()

  return (
    <Sheet title="Mis datos y licencia">
      <div style="padding: 8px 20px 32px 20px;">
        <TextField
          label="Nombre"
          value={p.name}
          onChange={v => update(d => cambiar(d, { name: v }))}
        />
        <TextField
          label="Direccion"
          value={p.address}
          hint="AMC1 BFCL.050(a)(1) la exige en el cuaderno, por raro que parezca."
          onChange={v => update(d => cambiar(d, { address: v }))}
        />
        <TextField
          label="Numero de licencia"
          value={p.licenceNumber ?? ''}
          placeholder="Sin licencia todavia"
          onChange={v => update(d => cambiar(d, { licenceNumber: v.trim() === '' ? null : v }))}
        />
        <TextField
          label="Caducidad del reconocimiento medico"
          type="date"
          value={p.medicalExpiry ?? ''}
          onChange={v => update(d => cambiar(d, { medicalExpiry: v === '' ? null : v }))}
        />
        {medicoCaducado && (
          <div style="margin: -8px 0 18px 0;">
            <Notice tone="warn" title="El reconocimiento medico ha caducado">
              BFCL.045(a)(2) exige llevar un certificado medico valido para ejercer las
              atribuciones.
            </Notice>
          </div>
        )}
        <TextField
          label="Fecha de emision de la licencia"
          type="date"
          value={p.licenceIssued ?? ''}
          hint={
            'Mientras este vacio eres alumno y la vigencia de BFCL.160 no te aplica, asi '
            + 'que Inicio no enseña ningun contador reglamentario. Al rellenarla aparece '
            + 'el panel de vigencia.'
          }
          onChange={v => update(d => cambiar(d, { licenceIssued: v === '' ? null : v }))}
        />
      </div>
    </Sheet>
  )
}

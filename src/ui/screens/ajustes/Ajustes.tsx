// src/ui/screens/ajustes/Ajustes.tsx
import { currency } from '../../../domain/currency'
import { Icon } from '../../components/Icon'
import { NavRow } from '../../components/Field'
import { Screen, SectionTitle } from '../../components/Screen'
import { hrefOf } from '../../router'
import { useDoc, useStore } from '../../state'
import { hoy } from '../../today'

/**
 * Los requisitos que la app NO evalua nunca.
 *
 * Se leen del propio dominio y no se reescriben aqui. Si algun dia se modela
 * uno, desaparece de esta pantalla solo, sin que nadie se acuerde de venir a
 * borrarlo. La clase da igual: `notModelled` es la misma lista siempre.
 */
function NoComprobado() {
  const doc = useDoc()
  const lista = currency(doc, hoy(), 'hot_air').notModelled
  return (
    <div class="card" style="margin: 0 20px;">
      <ul class="muted" style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.55;">
        {lista.map(t => <li key={t} style="margin-bottom: 6px;">{t}</li>)}
      </ul>
      <div class="dim" style="font-size: 13px; margin-top: 8px;">Compruebalo tu.</div>
    </div>
  )
}

const RESUMEN: Record<string, string> = {
  sin_configurar: 'Sin configurar',
  al_dia: 'Al dia',
  pendiente: 'Cambios sin subir',
  subiendo: 'Subiendo...',
  conflicto: 'Conflicto sin resolver',
  error: 'Con error',
}

export function Ajustes() {
  const doc = useDoc()
  const { sync, cfg } = useStore()

  return (
    <Screen title="Ajustes" tab="ajustes">
      <SectionTitle>Copia de seguridad</SectionTitle>
      <div style="padding: 0 20px;">
        <a href={hrefOf({ name: 'ajustesCopia' })} style="text-decoration: none; color: inherit;">
          <div class="card" style="display: flex; align-items: center; gap: 11px;">
            <Icon
              name={sync.kind === 'al_dia' ? 'check' : 'nube'}
              size={17}
              color={sync.kind === 'al_dia' ? 'var(--ok)' : 'var(--dim)'}
              width={2.4}
            />
            <div style="flex-grow: 1; min-width: 0;">
              <div style="font-size: 15px;">
                {cfg === null ? 'Sin repositorio' : `${cfg.owner}/${cfg.repo}`}
              </div>
              <div class="dim" style="font-size: 13px; margin-top: 3px;">
                {RESUMEN[sync.kind]}
              </div>
            </div>
            <Icon name="derecha" size={16} color="var(--dim)" width={2.4} />
          </div>
        </a>
      </div>

      <SectionTitle>Catalogos</SectionTitle>
      <div style="padding: 0 20px;">
        <NavRow
          icon={<Icon name="globo" size={18} color="var(--dim)" width={2} />}
          label="Globos"
          value={String(doc.balloons.length)}
          href={hrefOf({ name: 'ajustesGlobos' })}
        />
        <NavRow
          icon={<Icon name="pin" size={18} color="var(--dim)" width={2} />}
          label="Campos"
          value={String(doc.sites.length)}
          href={hrefOf({ name: 'ajustesCampos' })}
        />
        <NavRow
          icon={<Icon name="persona" size={18} color="var(--dim)" width={2} />}
          label="Personas"
          value={String(doc.people.length)}
          href={hrefOf({ name: 'ajustesPersonas' })}
        />
        <NavRow
          icon={<Icon name="lapiz" size={18} color="var(--dim)" width={2} />}
          label="Mis datos y licencia"
          href={hrefOf({ name: 'ajustesPiloto' })}
        />
      </div>

      <SectionTitle>Lo que esta app no comprueba</SectionTitle>
      <NoComprobado />
      <div style="height: 24px;"></div>
    </Screen>
  )
}

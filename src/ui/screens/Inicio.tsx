// src/ui/screens/Inicio.tsx
// El acumulado del cuaderno como numero protagonista, los incompletos
// pendientes de rematar, y el boton de cerrar vuelo.
//
// NO hay panel de progreso hacia el BPL. Se retiro con el resto del
// seguimiento del curso, y con el `domain/progress.ts` entero. Durante la fase
// de alumno esta pantalla no lleva ningun contador reglamentario a proposito:
// el acumulado es un dato llano. Ver el spec §5.
import { logbookTotals } from '../../domain/totals'
import type { BalloonClass } from '../../domain/types'
import { Icon } from '../components/Icon'
import { AvisoInstalar } from '../components/Instalar'
import { Notice } from '../components/Notice'
import { PanelVigencia } from '../components/PanelVigencia'
import { Screen } from '../components/Screen'
import { formatDateShort, formatHm } from '../format'
import { missingFields } from '../incomplete'
import { hrefOf } from '../router'
import { flightTitle, sortedFlights } from '../select'
import { useDoc, useStore } from '../state'
import { hoy } from '../today'

const SYNC: Record<string, { texto: string; color: string; icono: 'check' | 'nube' | 'alerta' }> = {
  sin_configurar: { texto: 'Solo en el telefono', color: 'var(--dim)', icono: 'nube' },
  al_dia: { texto: 'Al dia', color: 'var(--ok)', icono: 'check' },
  pendiente: { texto: 'Sin subir', color: 'var(--dim)', icono: 'nube' },
  subiendo: { texto: 'Subiendo...', color: 'var(--dim)', icono: 'nube' },
  conflicto: { texto: 'Conflicto', color: 'var(--warn)', icono: 'alerta' },
  error: { texto: 'Fallo al subir', color: 'var(--warn)', icono: 'alerta' },
}

/**
 * Las clases de globo realmente voladas.
 *
 * La vigencia es POR CLASE, asi que se enseña un panel por cada clase que
 * aparezca en el cuaderno. Sin vuelos todavia, se enseña la de aire caliente,
 * que es la del curso.
 */
function clasesVoladas(
  balloons: { id: string; balloonClass: BalloonClass }[],
  flights: { balloonId: string }[],
): BalloonClass[] {
  const ids = new Set(flights.map(f => f.balloonId))
  const clases = new Set<BalloonClass>()
  for (const b of balloons) if (ids.has(b.id)) clases.add(b.balloonClass)
  return clases.size === 0 ? ['hot_air'] : [...clases]
}

export function Inicio() {
  const doc = useDoc()
  const { sync } = useStore()
  const asOf = hoy()

  const total = logbookTotals(doc, asOf)
  const incompletos = sortedFlights(doc.flights.filter(f => !f.complete))
  const s = SYNC[sync.kind]

  return (
    <Screen title="" tab="inicio">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 20px;">
        <div class="cap" style="letter-spacing: .06em;">Logbook BPL</div>
        <a
          href={hrefOf({ name: 'ajustesCopia' })}
          style="display: flex; align-items: center; gap: 6px; text-decoration: none;"
        >
          <Icon name={s.icono} size={14} color={s.color} width={2.4} />
          <span class="lbl" style={`color: ${s.color};`}>{s.texto}</span>
        </a>
      </div>

      <div style="padding: 26px 20px 0 20px;">
        <div class="cap">Acumulado del cuaderno</div>
        <div
          class="num"
          style="font-size: 76px; line-height: 1; font-weight: 500; letter-spacing: -.03em; margin-top: 10px;"
        >
          {formatHm(total.minutes)}
        </div>
        <div class="lbl muted" style="margin-top: 8px;">horas de vuelo</div>
      </div>

      <div style="
        margin: 30px 20px 0 20px; padding: 16px 0;
        border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
        display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
      ">
        {[
          { n: total.flights, l: 'vuelos' },
          { n: total.landings, l: 'aterrizajes' },
          { n: total.inflations, l: 'inflados' },
        ].map(c => (
          <div key={c.l}>
            <div class="num" style="font-size: 26px; font-weight: 500;">{c.n}</div>
            <div class="lbl dim" style="font-size: 12px; margin-top: 2px;">{c.l}</div>
          </div>
        ))}
      </div>

      {total.partial && (
        <div class="lbl dim" style="padding: 10px 20px 0 20px; line-height: 1.45;">
          El acumulado se apoya en algun vuelo incompleto o con las horas incoherentes.
        </div>
      )}

      <div style="padding: 22px 20px 0 20px; display: flex; flex-direction: column; gap: 10px;">
        <AvisoInstalar />

        {(sync.kind === 'error' || sync.kind === 'conflicto') && (
          <Notice
            tone="warn"
            title={sync.kind === 'conflicto' ? 'Conflicto sin resolver' : 'La copia de seguridad falla'}
          >
            {sync.kind === 'error' ? sync.mensaje : 'Alguien ha escrito el cuaderno desde otro sitio.'}
            {' '}El cuaderno sigue funcionando entero en este telefono. Entra en Ajustes,
            copia de seguridad.
          </Notice>
        )}

        {incompletos.map(f => (
          <a
            key={f.id}
            href={hrefOf({ name: 'detalle', flightId: f.id })}
            class="card"
            style="display: flex; align-items: center; gap: 11px; text-decoration: none; color: inherit;"
          >
            <Icon name="alerta" size={16} color="var(--warn)" />
            <div style="flex-grow: 1; min-width: 0;">
              <div class="lbl" style="font-weight: 500;">Vuelo sin rematar</div>
              <div class="lbl dim" style="font-size: 12px;">
                {formatDateShort(f.date)}, {flightTitle(doc, f)}.
                {' '}Faltan {missingFields(doc, f).length} campos
              </div>
            </div>
            <Icon name="derecha" size={16} color="var(--dim)" width={2.2} />
          </a>
        ))}

        {clasesVoladas(doc.balloons, doc.flights).map(c => (
          <PanelVigencia key={c} doc={doc} asOf={asOf} forClass={c} />
        ))}
      </div>

      <div style="padding: 22px 20px 24px 20px;">
        <a href={hrefOf({ name: 'cerrar' })} class="primary" style="text-decoration: none;">
          <Icon name="mas" size={18} width={2.4} />
          Cerrar vuelo
        </a>
      </div>
    </Screen>
  )
}

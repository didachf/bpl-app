// src/ui/components/PanelVigencia.tsx
import { currency } from '../../domain/currency'
import type { BalloonClass, IsoDate, LogbookDoc } from '../../domain/types'
import { describeCurrency } from '../currencyView'
import { formatDateShort, labelClass, labelGroup } from '../format'
import { Icon } from './Icon'
import { Notice } from './Notice'

/**
 * El panel de vigencia, por clase de globo.
 *
 * `forClass` es obligatorio: BFCL.160(a) exige el cumplimiento "in the relevant
 * balloon class" y no existe una vigencia global. Quien llama decide de que
 * clase pregunta.
 */
export function PanelVigencia(
  { doc, asOf, forClass }: { doc: LogbookDoc; asOf: IsoDate; forClass: BalloonClass },
) {
  const vista = describeCurrency(currency(doc, asOf, forClass))

  if (vista.kind === 'no_aplica') {
    return (
      <div class="outline" style="display: flex; align-items: center; gap: 11px;">
        <Icon name="reloj" size={16} color="var(--dim)" width={2} />
        <div style="flex-grow: 1;">
          <div class="lbl muted">Vigencia</div>
          <div class="lbl dim" style="font-size: 12px; line-height: 1.4;">{vista.motivo}</div>
        </div>
      </div>
    )
  }

  return (
    <div class="card">
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 7px;">
          <Icon
            name={vista.met ? 'check' : 'alerta'}
            size={15}
            color={vista.met ? 'var(--ok)' : 'var(--warn)'}
            width={2.4}
          />
          <span style={`font-size: 15px; font-weight: 500; color: ${vista.met ? 'var(--ok)' : 'var(--warn)'};`}>
            {vista.titular}
          </span>
        </div>
        <span class="dim" style="font-size: 12px;">{labelClass(forClass)}</span>
      </div>

      {vista.currentUntil !== null && (
        <div class="lbl muted" style="margin-top: 6px;">
          Hasta el <span class="num">{formatDateShort(vista.currentUntil)}</span>
        </div>
      )}

      {vista.viaProficiencyCheck && (
        <div class="lbl dim" style="margin-top: 4px; line-height: 1.4;">
          La sostiene una verificacion de competencia de BFCL.160(a)(2), que es una via
          alternativa y no un rescate.
        </div>
      )}

      <div style="margin-top: 12px;">
        {vista.items.map(i => (
          <div
            key={i.key}
            style="display: flex; align-items: baseline; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border);"
          >
            <Icon
              name={i.met ? 'check' : 'aviso'}
              size={13}
              color={i.met ? 'var(--ok)' : 'var(--warn)'}
              width={2.4}
            />
            <span class="lbl" style="flex-grow: 1; min-width: 0;">{i.label}</span>
            <span class="num lbl muted">{i.valor}</span>
          </div>
        ))}
      </div>

      <div style="margin-top: 8px;">
        {vista.items.filter(i => i.expiresOn !== null || i.partial).map(i => (
          <div key={`n-${i.key}`} class="lbl dim" style="font-size: 12px; line-height: 1.5;">
            {i.label}
            {i.expiresOn !== null && <> caduca el <span class="num">{formatDateShort(i.expiresOn)}</span></>}
            {i.partial && <> · se apoya en algun vuelo incompleto</>}
          </div>
        ))}
      </div>

      {/* BFCL.160(d). La escalera entera y no solo el tramo de hoy: publicar el
          grupo de hoy junto a currentUntil miente, y ese fue el hallazgo
          bloqueante de la cuarta auditoria del dominio. */}
      {vista.grupos.length > 0 && (
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border);">
          <div class="cap" style="margin-bottom: 6px;">Grupo maximo, BFCL.160(d)</div>
          {vista.grupos.map(g => (
            <div key={g.until} class="lbl muted" style="line-height: 1.6;">
              Hasta el <span class="num">{formatDateShort(g.until)}</span>, grupo {labelGroup(g.maxGroup)}
            </div>
          ))}
        </div>
      )}

      {vista.excluidos.length > 0 && (
        <div style="margin-top: 14px;">
          <Notice tone="warn" title="Vuelos fuera del recuento">
            {vista.excluidos.map(t => <div key={t} style="margin-bottom: 3px;">{t}</div>)}
          </Notice>
        </div>
      )}

      {vista.avisos.length > 0 && (
        <div style="margin-top: 10px;">
          <Notice tone="warn" title="Avisos de este cuaderno">
            {vista.avisos.map(t => <div key={t} style="margin-bottom: 5px;">{t}</div>)}
          </Notice>
        </div>
      )}

      <details style="margin-top: 12px;">
        <summary class="lbl dim" style="cursor: pointer;">
          Lo que este panel no comprueba, {vista.noModelado.length} cosas
        </summary>
        <ul class="muted" style="margin: 8px 0 0 0; padding-left: 18px; font-size: 12px; line-height: 1.5;">
          {vista.noModelado.map(t => <li key={t} style="margin-bottom: 5px;">{t}</li>)}
        </ul>
      </details>
    </div>
  )
}

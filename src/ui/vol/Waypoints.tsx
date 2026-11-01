// src/ui/vol/Waypoints.tsx
// La lista de waypoints en vuelo (maqueta TauletaWaypoints, ESPEC_TAULETA.md
// §2.4): rumbo y distancia desde el globo, solo uno activo (spec 10/10 §6.6).
import { useState } from 'preact/hooks'
import type { Punto } from '../../services/nav/tipos'
import { formatDecimal } from '../../services/vuelo/coordenadas'
import { distanciaM, formatDistancia, rumboDirecto } from '../../services/vuelo/rumbo'
import { activar, esborrarWaypoint } from '../../domain/waypoints'
import type { Waypoint } from '../../domain/types'
import { Icon } from '../components/Icon'
import { useDoc, useStore } from '../state'
import { graus, textObjectiu } from './presentacio'

export interface PropsWaypoints {
  pos: Punto
  actiu: Waypoint | null
  onTancar: () => void
  onMarcar: () => void
  onEditar: (w: Waypoint) => void
  onCoordenades: () => void
}

const boto = (vora: string, fons = 'transparent', color = 'var(--text)') => `
  height: 44px; border-radius: 8px; border: 1px solid ${vora}; background: ${fons}; color: ${color};
  font: inherit; font-size: 14px; cursor: pointer;
`

export function Waypoints({ pos, actiu, onTancar, onMarcar, onEditar, onCoordenades }: PropsWaypoints) {
  const doc = useDoc()
  const { update } = useStore()
  const [esborrant, setEsborrant] = useState<string | null>(null)
  // El activo arriba, el resto por distancia.
  const llista = [...doc.waypoints].sort((a, b) =>
    (a.id === actiu?.id ? -1 : 0) - (b.id === actiu?.id ? -1 : 0) || distanciaM(pos, a) - distanciaM(pos, b))

  return (
    <>
      <div style="display: flex; align-items: center; gap: 10px; padding: 14px 12px 4px 18px;">
        <span style="font-size: 20px; font-weight: 600; flex-grow: 1;">Waypoints</span>
        <button type="button" aria-label="Tancar la llista" onClick={onTancar} style="width: 44px; height: 44px; border-radius: 10px; border: 0; background: none; color: var(--muted); cursor: pointer;">
          <Icon name="tancar" size={22} />
        </button>
      </div>
      <div class="dim" style="font-size: 12px; padding: 0 18px 10px 18px;">Rumb i distància des d'on ets ara. Només un pot estar actiu.</div>
      <div style="flex-grow: 1; overflow-y: auto; padding: 0 14px; display: flex; flex-direction: column; gap: 8px;">
        {llista.length === 0 && <div class="dim" style="font-size: 14px; padding: 8px 4px;">Encara no n'hi ha cap.</div>}
        {llista.map(w => {
          const esActiu = w.id === actiu?.id
          const vora = esActiu ? 'var(--nav-border)' : 'var(--border)'
          return (
            <div key={w.id} style={`
              border-radius: 10px; padding: 11px 12px; display: flex; flex-direction: column; gap: 8px;
              border: ${esActiu ? '2px solid var(--nav)' : '1px solid var(--border)'}; ${esActiu ? 'background: var(--nav-bg);' : ''}
            `}>
              <div style="display: flex; gap: 10px;">
                <div style="flex-grow: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px; font-weight: 600;">{w.nom}</span>
                    {esActiu && <span style="font-size: 10px; font-weight: 600; letter-spacing: .06em; color: #0b0b0b; background: var(--nav); border-radius: 8px; padding: 2px 7px;">ACTIU</span>}
                  </div>
                  <div class="muted" style="font-size: 12px; margin-top: 2px;">
                    {textObjectiu(w.objectiu)[0].toUpperCase() + textObjectiu(w.objectiu).slice(1)} · <span class="num">{formatDecimal(w.lat, w.lon)}</span>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div class="num" style="font-size: 21px; font-weight: 500;">{graus(rumboDirecto(pos, w))}</div>
                  <div class="num muted" style="font-size: 13px;">{formatDistancia(distanciaM(pos, w))}</div>
                </div>
              </div>
              {esborrant === w.id ? (
                <div style="display: flex; gap: 8px; align-items: center;">
                  <span style="flex-grow: 1; font-size: 14px;">Esborrar {w.nom}?</span>
                  <button type="button" style={`${boto(vora)} width: 76px;`} onClick={() => setEsborrant(null)}>No</button>
                  <button type="button" style={`${boto('transparent', 'var(--danger)', '#fff')} width: 82px;`}
                    onClick={() => { update(d => esborrarWaypoint(d, w.id)); setEsborrant(null) }}>Sí</button>
                </div>
              ) : (
                <div style="display: flex; gap: 8px;">
                  {esActiu
                    ? <button type="button" style={`${boto(vora)} flex-grow: 1;`} onClick={() => update(d => activar(d, null))}>Desactivar</button>
                    : <button type="button" style={`${boto('transparent', 'var(--accent)', 'var(--accent-text)')} flex-grow: 1; font-weight: 500;`} onClick={() => update(d => activar(d, w.id))}>Activar</button>}
                  <button type="button" style={`${boto(vora)} width: 76px;`} onClick={() => onEditar(w)}>Editar</button>
                  <button type="button" style={`${boto(vora)} width: 82px;`} onClick={() => setEsborrant(w.id)}>Esborrar</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 14px 14px 14px;">
        {([['marcar', 'Marcar al mapa', onMarcar], ['coordenades', 'Per coordenades', onCoordenades]] as const).map(([ic, t, f]) => (
          <button key={t} type="button" onClick={f} style="
            height: 52px; border-radius: 8px; border: 0; background: var(--accent); color: var(--accent-text);
            font: inherit; font-size: 15px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
          "><Icon name={ic} size={20} />{t}</button>
        ))}
      </div>
    </>
  )
}

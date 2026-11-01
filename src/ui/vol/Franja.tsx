// src/ui/vol/Franja.tsx
// La franja de cifras de abajo (ESPEC_TAULETA.md §1.7 y §1.7b, spec 10/10
// §7.1). Con waypoint activo, la variante A: cifras, waypoint y orden. Sin el,
// la B: solo cifras, mas grandes, y nada del waypoint (§6.9).
import type { ComponentChildren } from 'preact'
import { miles, PIE_M } from '../../services/nav/campo'
import { sueloGeo } from '../../services/nav/relieve'
import type { Relieve } from '../../services/nav/tipos'
import { rumboVelocidad, vario as varioGps } from '../../services/vuelo/gps'
import type { PlanVigent } from '../../services/vuelo/navegacio'
import { distanciaM, formatDistancia, horaLlegada, rumboDirecto } from '../../services/vuelo/rumbo'
import type { Sessio } from '../../services/vuelo/sessio'
import type { Waypoint } from '../../domain/types'
import { Icon } from '../components/Icon'
import { altFt, etiquetaObjectiu, graus, horaLocal, kt, ordreCurta, pasEnCurs, tempsVol, vario } from './presentacio'

/** Por debajo de esto, la altura sobre el terreno va en ambar. */
const AGL_AVIS_M = 300 * PIE_M

const XIFRA = /(\d[\d   ]*(?:,\d+)?\s?(?:ft|km|m|kt|min)\b|\d{2}:\d{2}|\d{3}°)/g

/** Las cifras de un texto del motor en Mono, como en las maquetas. */
export function ambXifres(text: string, color?: string): ComponentChildren {
  return text.split(XIFRA).map((t, i) => (i % 2 === 1
    ? <span key={i} class="num" style={`font-weight: 600; white-space: nowrap;${color === undefined ? '' : ` color: ${color};`}`}>{t}</span>
    : t))
}

const Lab = ({ children, color }: { children: ComponentChildren; color?: string }) =>
  <div class="lab" style={color === undefined ? '' : `color: ${color};`}>{children}</div>

function Casella({ ample, children, fons }: { ample?: number; children: ComponentChildren; fons?: string }) {
  return (
    <div style={`
      box-sizing: border-box; padding: 16px 18px; border-right: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 4px; min-width: 0;
      ${ample === undefined ? 'flex: 1 1 0;' : `width: ${ample}px; flex-shrink: 0;`}
      ${fons === undefined ? '' : `background: ${fons};`}
    `}>{children}</div>
  )
}

const Gran = ({ children, mida = 50 }: { children: ComponentChildren; mida?: number }) =>
  <span class="num" style={`font-size: ${mida}px; font-weight: 500; line-height: 1.05; white-space: nowrap;`}>{children}</span>

export interface PropsFranja {
  sessio: Sessio
  actiu: Waypoint | null
  vigent: PlanVigent | null
  relieve: Relieve | null
  ara: number
  onMes: () => void
  /** En la lista y al marcar, «Mapa» vuelve al mapa. */
  onMapa: () => void
}

export function Franja({ sessio, actiu, vigent, relieve, ara, onMes, onMapa }: PropsFranja) {
  const tr = sessio.traza
  const pos = tr[tr.length - 1] ?? { ...sessio.despegue, altM: sessio.despegue.elevM, t: ara }
  const rv = rumboVelocidad(tr)
  const v = varioGps(tr)
  const font = sessio.correccioM !== null ? 'GPS, calibrat a terra' : 'GPS sense calibrar, pot sortir uns 50 m alta'
  const suelo = relieve === null ? NaN : sueloGeo(relieve, pos.lat, pos.lon)
  const agl = pos.altM - suelo
  const temps = tempsVol(ara - (sessio.enlairatA ?? sessio.iniciadaA))

  const linia4 = Number.isFinite(agl)
    ? <span class="num" style={`font-size: 13px; color: ${agl < AGL_AVIS_M ? 'var(--warn)' : 'var(--muted)'};`}>{miles(Math.round(agl / PIE_M / 10) * 10)} ft sobre el terreny</span>
    : <span class="num dim" style="font-size: 13px;">{Math.round(pos.altM)} m</span>

  const vistes = (
    <div style="box-sizing: border-box; width: 119px; flex-shrink: 0; padding: 12px; display: flex; flex-direction: column; gap: 10px;">
      <button type="button" aria-pressed="true" onClick={onMapa} style="
        flex-grow: 1; border-radius: 10px; border: 2px solid var(--accent); background: var(--nav-pressed);
        color: var(--text); font: inherit; font-size: 16px; font-weight: 600;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
      "><Icon name="mapa" size={22} width={2} />Mapa</button>
      <button type="button" disabled title="Aviat" style="
        flex-grow: 1; border-radius: 10px; border: 1px solid var(--border); background: transparent;
        color: var(--dim); font: inherit; font-size: 16px; font-weight: 500;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      "><Icon name="vent" size={22} width={2} />Vent<span style="font-size: 11px;">Aviat</span></button>
      <button type="button" onClick={onMes} style="
        height: 44px; flex-shrink: 0; border-radius: 10px; border: 1px solid var(--border); background: transparent;
        color: var(--muted); font: inherit; font-size: 15px; font-weight: 500;
        display: flex; align-items: center; justify-content: center; gap: 6px;
      "><Icon name="mes" size={18} width={4} />Més</button>
    </div>
  )

  const marc = 'position: absolute; left: 0; right: 0; bottom: 0; height: 200px; display: flex; border-top: 1px solid var(--border); background: var(--bg);'

  if (actiu === null) {
    return (
      <div style={marc}>
        <Casella>
          <Lab>Altitud</Lab>
          <div style="display: flex; align-items: baseline; gap: 8px;"><Gran mida={64}>{altFt(pos.altM)}</Gran><span class="num muted" style="font-size: 22px;">ft</span></div>
          <div class="muted" style="font-size: 14px;">{font}</div>
          {linia4}
        </Casella>
        <Casella>
          <Lab>Vario</Lab>
          <Gran mida={64}>{vario(v)}</Gran>
          <span class="num muted" style="font-size: 14px;">m/s, GPS</span>
        </Casella>
        <Casella>
          <Lab>Rumb i velocitat</Lab>
          <div style="display: flex; align-items: baseline; gap: 16px;">
            <Gran mida={64}>{rv === null ? '–' : graus(rv.rumbo)}</Gran>
            <span class="num" style="font-size: 30px; white-space: nowrap;">{rv === null ? '–' : kt(rv.velMs)}<span class="muted" style="font-size: 18px;"> kt</span></span>
          </div>
        </Casella>
        <Casella>
          <Lab>Temps de vol</Lab>
          <Gran mida={64}>{temps}</Gran>
          <span class="num muted" style="font-size: 14px;">ara {horaLocal(ara)}</span>
        </Casella>
        {vistes}
      </div>
    )
  }

  const dist = distanciaM(pos, actiu)
  const [dNum, dUnitat] = formatDistancia(dist).split(' ')
  const eta = rv === null ? null : horaLlegada(dist, rv.velMs, ara)
  const et = etiquetaObjectiu(actiu.objectiu)
  const r = vigent?.r ?? null
  const ordres = r === null ? [] : r.ordenes.slice(0, r.plan.length)
  const resum = r === null ? [] : r.ordenes.slice(r.plan.length)
  const pas = r === null || r.plan.length === 0 ? -1 : pasEnCurs(r.plan, Date.parse(r.calculadoA), ara)
  const seguent = pas >= 0 && pas + 1 < ordres.length ? ordreCurta(ordres[pas + 1]) : null
  const noArriba = resum[0]?.startsWith("No s'hi arriba") === true

  return (
    <div style={marc}>
      <Casella ample={193}>
        <Lab>Altitud</Lab>
        <div style="display: flex; align-items: baseline; gap: 6px;"><Gran>{altFt(pos.altM)}</Gran><span class="num muted" style="font-size: 18px;">ft</span></div>
        <div class="muted" style="font-size: 13px;">{sessio.correccioM !== null ? font : 'GPS sense calibrar'}</div>
        {linia4}
      </Casella>
      <Casella ample={157}>
        <Lab>Vario</Lab>
        <Gran>{vario(v)}</Gran>
        <span class="num muted" style="font-size: 13px;">m/s, GPS</span>
      </Casella>
      <Casella ample={181}>
        <Lab>Rumb i velocitat</Lab>
        <Gran>{rv === null ? '–' : graus(rv.rumbo)}</Gran>
        <span class="num" style="font-size: 22px; white-space: nowrap;">{rv === null ? '–' : kt(rv.velMs)}<span class="muted" style="font-size: 15px;"> kt</span></span>
      </Casella>
      <Casella ample={157}>
        <Lab>Temps de vol</Lab>
        <Gran>{temps}</Gran>
        <span class="num muted" style="font-size: 13px;">ara {horaLocal(ara)}</span>
      </Casella>
      <Casella ample={218}>
        <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--nav)" stroke-width="2" /><circle cx="6" cy="6" r="1.6" fill="var(--nav)" /></svg>
          <span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; color: var(--nav);">{actiu.nom}</span>
          {et !== null && <span style="font-size: 11px; font-weight: 600; letter-spacing: .06em; color: #1a1a19; background: var(--nav); border-radius: 4px; padding: 2px 6px;">{et}</span>}
        </div>
        <Gran>{graus(rumboDirecto(pos, actiu))}</Gran>
        <span class="num" style="font-size: 22px; white-space: nowrap;">{dNum}<span class="muted" style="font-size: 15px;"> {dUnitat}</span></span>
        <span class="num muted" style="font-size: 13px; white-space: nowrap;">
          {rv === null ? '' : `a ${kt(rv.velMs)} kt`}{eta === null ? '' : `, a les ${horaLocal(eta)}`}
        </span>
      </Casella>
      <Casella fons="var(--nav-bg)">
        <Lab color="var(--nav-lab)">Ordre</Lab>
        {pas >= 0 && <div style="font-size: 24px; font-weight: 600; line-height: 1.2;">{ambXifres(ordreCurta(ordres[pas]))}</div>}
        {seguent !== null && <div class="muted" style="font-size: 17px; line-height: 1.3;">Després {seguent[0].toLowerCase()}{seguent.slice(1)}</div>}
        {r === null && <div class="muted" style="font-size: 17px;">Calculant…</div>}
        {r !== null && pas < 0 && <div class="muted" style="font-size: 17px; line-height: 1.3;">{r.avisos[r.avisos.length - 1] ?? 'Sense pla.'}</div>}
        <div style="flex-grow: 1;"></div>
        {resum.length > 0 && (
          <div style="font-size: 16px; line-height: 1.3;">
            {noArriba && <span style="color: var(--warn); font-weight: 600;">No s'hi arriba. </span>}
            {ambXifres(noArriba ? resum[1] ?? '' : resum[0], 'var(--nav)')}
          </div>
        )}
      </Casella>
      {vistes}
    </div>
  )
}

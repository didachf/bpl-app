// src/ui/vol/Coordenades.tsx
// Un waypoint nuevo por coordenadas (maquetas TauletaCoordenades y
// MobilCoordenades, ESPEC_TAULETA.md §2.5; spec 10/10 §6.6): decimal, grados
// minutos y segundos, o UTM en ETRS89. Antes de guardar se ve el punto en el
// mapa y en los otros formatos.
import { useEffect, useState } from 'preact/hooks'
import type { Punto } from '../../services/nav/tipos'
import { formatDecimal, formatDms, formatUtm, llegirDecimal, llegirDms, llegirUtm, type Lectura } from '../../services/vuelo/coordenadas'
import { distanciaM, formatDistancia, rumboDirecto } from '../../services/vuelo/rumbo'
import { afegirWaypoint, nomNou } from '../../domain/waypoints'
import { Icon } from '../components/Icon'
import { newId } from '../ids'
import { useDoc, useStore } from '../state'
import { graus } from './presentacio'

type Format = 'decimal' | 'dms' | 'utm'

export interface PropsCoordenades {
  pos: Punto
  onPunt: (p: { p: Punto; nom: string } | null) => void
  onTancar: () => void
  onDesat: () => void
}

const camp = 'height: 44px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); padding: 0 10px; font-size: 16px; min-width: 0; width: 100%; box-sizing: border-box;'

export function Coordenades({ pos, onPunt, onTancar, onDesat }: PropsCoordenades) {
  const doc = useDoc()
  const { update } = useStore()
  const [nom, setNom] = useState(() => nomNou(doc))
  const [format, setFormat] = useState<Format>('decimal')
  const [dec, setDec] = useState({ lat: '', lon: '' })
  const [dms, setDms] = useState({ lg: '', lm: '', ls: '', lh: 'N', og: '', om: '', os: '', oh: 'E' })
  const [utm, setUtm] = useState({ fus: 31, x: '', y: '' })

  const lectura: Lectura | null = (() => {
    if (format === 'decimal') return dec.lat.trim() === '' ? null : llegirDecimal(dec.lat, dec.lon)
    if (format === 'dms') {
      if (dms.lg.trim() === '' || dms.og.trim() === '') return null
      return llegirDms(`${dms.lg} ${dms.lm || 0} ${dms.ls || 0} ${dms.lh}`, `${dms.og} ${dms.om || 0} ${dms.os || 0} ${dms.oh}`)
    }
    return utm.x.trim() === '' && utm.y.trim() === '' ? null : llegirUtm(utm.fus, utm.x, utm.y)
  })()
  const punt = lectura?.ok === true ? { lat: lectura.lat, lon: lectura.lon } : null

  useEffect(() => { onPunt(punt === null ? null : { p: punt, nom }) }, [punt?.lat, punt?.lon, nom])
  useEffect(() => () => onPunt(null), [])

  const errorDe = (...camps: string[]) =>
    lectura !== null && !lectura.ok && camps.includes(lectura.camp)
      ? <span style="color: var(--warn); font-size: 12px; grid-column: 1 / -1;">{lectura.error}</span> : null

  const desar = (activarlo: boolean) => {
    if (punt === null) return
    update(d => afegirWaypoint(d, { id: newId(), nom: nom.trim() || nomNou(d), lat: punt.lat, lon: punt.lon, objectiu: { tipo: 'aterrar' }, nota: '' }, activarlo))
    onDesat()
  }

  const seg = (v: Format, t: string) => (
    <button key={v} type="button" aria-pressed={format === v} onClick={() => setFormat(v)} style={`
      height: 42px; border-radius: 7px; border: 0; font: inherit; font-size: 14px; cursor: pointer;
      background: ${format === v ? 'var(--accent)' : 'transparent'}; color: ${format === v ? 'var(--accent-text)' : 'var(--muted)'};
      font-weight: ${format === v ? 600 : 400};
    `}>{t}</button>
  )
  const hemi = (valor: string, opcions: [string, string], f: (v: string) => void) => (
    <button type="button" onClick={() => f(valor === opcions[0] ? opcions[1] : opcions[0])} class="num"
      style="height: 44px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 16px; cursor: pointer;">{valor}</button>
  )
  const inp = (v: string, f: (s: string) => void, placeholder = '') => (
    <input inputMode="decimal" value={v} placeholder={placeholder} onInput={e => f((e.target as HTMLInputElement).value)} class="num" style={`${camp} text-align: center;`} />
  )

  return (
    <div style="flex-grow: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <button type="button" aria-label="Tornar a la llista" onClick={onTancar} style="width: 40px; height: 40px; margin-left: -8px; border: 0; background: none; color: var(--muted); cursor: pointer;">
          <Icon name="enrere" size={22} />
        </button>
        <span style="font-size: 20px; font-weight: 600;">Nou waypoint</span>
      </div>
      <label style="display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: center;">
        <span class="lab">Nom</span>
        <input value={nom} onInput={e => setNom((e.target as HTMLInputElement).value)} style={camp} />
      </label>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: var(--surface); border-radius: 10px; padding: 4px;">
        {seg('decimal', 'Decimal')}{seg('dms', 'Graus min s')}{seg('utm', 'UTM')}
      </div>

      {format === 'decimal' && (
        <div style="display: grid; grid-template-columns: 110px 1fr; gap: 8px 10px; align-items: center;">
          <span class="lab">Latitud N</span>{inp(dec.lat, v => setDec({ ...dec, lat: v }), '41,6857')}{errorDe('lat')}
          <span class="lab">Longitud E</span>{inp(dec.lon, v => setDec({ ...dec, lon: v }), '1,2115')}{errorDe('lon')}
          <span class="dim" style="font-size: 12px; grid-column: 1 / -1;">També s'hi pot enganxar «41.6857, 1.2115» de Google Maps, tot al camp de latitud.</span>
        </div>
      )}
      {format === 'dms' && (
        <div style="display: grid; grid-template-columns: 74px 56px 56px 78px 52px; gap: 8px 6px; align-items: center;">
          <span class="lab">Latitud</span>{inp(dms.lg, v => setDms({ ...dms, lg: v }), '°')}{inp(dms.lm, v => setDms({ ...dms, lm: v }), "'")}{inp(dms.ls, v => setDms({ ...dms, ls: v }), '"')}{hemi(dms.lh, ['N', 'S'], v => setDms({ ...dms, lh: v }))}
          {errorDe('lat')}
          <span class="lab">Longitud</span>{inp(dms.og, v => setDms({ ...dms, og: v }), '°')}{inp(dms.om, v => setDms({ ...dms, om: v }), "'")}{inp(dms.os, v => setDms({ ...dms, os: v }), '"')}{hemi(dms.oh, ['E', 'W'], v => setDms({ ...dms, oh: v }))}
          {errorDe('lon')}
        </div>
      )}
      {format === 'utm' && (
        <div style="display: grid; grid-template-columns: 110px 1fr; gap: 8px 10px; align-items: center;">
          <span class="lab">Fus</span>
          <div style="display: flex; gap: 6px;">
            {[31, 30].map(f => (
              <button key={f} type="button" aria-pressed={utm.fus === f} onClick={() => setUtm({ ...utm, fus: f })} class="num" style={`
                height: 44px; flex: 1 1 0; border-radius: 8px; border: 1px solid ${utm.fus === f ? 'var(--accent)' : 'var(--border)'};
                background: ${utm.fus === f ? 'var(--accent)' : 'var(--surface)'}; color: ${utm.fus === f ? 'var(--accent-text)' : 'var(--text)'}; font-size: 16px; cursor: pointer;
              `}>{f}</button>
            ))}
          </div>
          <span class="lab">X, est</span>{inp(utm.x, v => setUtm({ ...utm, x: v }), '351 155')}{errorDe('x')}
          <span class="lab">Y, nord</span>{inp(utm.y, v => setUtm({ ...utm, y: v }), '4 616 431')}{errorDe('y')}
          <span class="dim" style="font-size: 12px; grid-column: 1 / -1;">ETRS89, com als mapes de l'ICGC</span>
        </div>
      )}

      {punt !== null && (
        <div style="background: var(--surface); border-radius: 10px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
          <span class="lab">És el mateix punt que</span>
          {[
            ...(format === 'decimal' ? [] : [['Decimal', formatDecimal(punt.lat, punt.lon)]]),
            ...(format === 'dms' ? [] : [['Graus min s', formatDms(punt.lat, punt.lon)]]),
            ...(format === 'utm' ? [] : [['UTM 31', formatUtm(punt.lat, punt.lon, 31).replace(/^31 /, '')]]),
            ["Des d'on ets", `${graus(rumboDirecto(pos, punt))} · ${formatDistancia(distanciaM(pos, punt))}`],
          ].map(([l, v]) => (
            <div key={l} style="display: flex; justify-content: space-between; gap: 10px;">
              <span class="dim" style="font-size: 13px;">{l}</span><span class="num" style="font-size: 14px;">{v}</span>
            </div>
          ))}
        </div>
      )}

      <div style="flex-grow: 1;"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <button type="button" disabled={punt === null} onClick={() => desar(false)} style="height: 52px; border-radius: 8px; border: 1px solid var(--border); background: none; color: var(--text); font: inherit; font-size: 15px; cursor: pointer;">Desar</button>
        <button type="button" disabled={punt === null} onClick={() => desar(true)} style="height: 52px; border-radius: 8px; border: 0; background: var(--accent); color: var(--accent-text); font: inherit; font-size: 15px; font-weight: 500; cursor: pointer;">Desar i activar</button>
      </div>
    </div>
  )
}

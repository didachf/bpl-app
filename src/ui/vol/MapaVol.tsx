// src/ui/vol/MapaVol.tsx
// El mapa de la pantalla de vuelo (ESPEC_TAULETA.md §1.1 a §1.6 y §2): la
// ortofoto guardada y encima, en este orden, la zona alcanzable, el plan por
// tramos, el punto mas cercano, los waypoints, la traza, el despegue, la
// proyeccion y el globo. Un solo mapa de Leaflet para todos los paneles: al
// abrir uno cambia el ancho y no se rehace.
import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import L from 'leaflet'
import { aGeo } from '../../services/nav/geo'
import type { Punto } from '../../services/nav/tipos'
import { proyeccion, rumboVelocidad } from '../../services/vuelo/gps'
import type { PlanVigent } from '../../services/vuelo/navegacio'
import type { Sessio } from '../../services/vuelo/sessio'
import type { Waypoint } from '../../domain/types'
import { Icon } from '../components/Icon'
import { colorAltitud, horaLocal, marquesCadaCinc, trossosCami } from './presentacio'
import { useLeaflet } from './useLeaflet'

export type ModeMapa = 'vol' | 'llista' | 'marcar' | 'coordenades'

const BLANC = '#ffffff'
const NEGRE = '#0b0b0b'
const CIAN = '#35d0ff'
const VERD = '#3ad16b'
const SOBRE = 'rgba(26,26,25,.88)'

const icona = (html: string, w: number, h: number, ax = w / 2, ay = h / 2) =>
  L.divIcon({ html, className: 'vol-icona', iconSize: [w, h], iconAnchor: [ax, ay] })

const etiqueta = (text: string, color = BLANC, mida = 14) => icona(
  `<span style="white-space:nowrap;font:600 ${mida}px var(--sans);color:${color};text-shadow:0 0 3px ${NEGRE},0 0 2px ${NEGRE},0 0 1px ${NEGRE};">${text}</span>`,
  0, 0, -14, 9,
)

const marca = (min: number, color: string, r: number, fons: string, mida: number) => icona(
  `<svg width="${2 * r + 4}" height="${2 * r + 4}"><circle cx="${r + 2}" cy="${r + 2}" r="${r}" fill="${fons}" stroke="${color}" stroke-width="2"/>`
  + `<text x="${r + 2}" y="${r + 2 + mida * 0.38}" text-anchor="middle" font-family="IBM Plex Mono" font-size="${mida}" font-weight="600" fill="${color}">${min}</text></svg>`,
  2 * r + 4, 2 * r + 4,
)

const globus = (rumbo: number) => icona(
  `<svg width="44" height="44" viewBox="-22 -22 44 44"><g transform="rotate(${Math.round(rumbo)})">`
  + `<circle r="20" fill="${BLANC}" opacity=".18"/><path d="M0,-15 L10,11 L0,5 L-10,11 Z" fill="${BLANC}" stroke="${NEGRE}" stroke-width="2" stroke-linejoin="round"/></g></svg>`,
  44, 44,
)

const desti = icona(
  `<svg width="34" height="34" viewBox="-17 -17 34 34"><circle r="13" fill="none" stroke="${NEGRE}" stroke-opacity=".6" stroke-width="6"/>`
  + `<circle r="13" fill="none" stroke="${CIAN}" stroke-width="3"/><circle r="4" fill="${CIAN}"/></svg>`,
  34, 34,
)

const anella = icona(
  `<svg width="26" height="26" viewBox="-13 -13 26 26"><circle r="9" fill="none" stroke="${NEGRE}" stroke-opacity=".6" stroke-width="5"/>`
  + `<circle r="9" fill="none" stroke="${BLANC}" stroke-width="2"/></svg>`,
  26, 26,
)

const xinxeta = icona(
  `<svg width="40" height="40" viewBox="-20 -36 40 40"><path d="M0,0 c0,0 -19,-19 -19,-33 c0,-11 8,-19 19,-19 s19,8 19,19 c0,14 -19,33 -19,33 z" transform="translate(0,0) scale(1)" fill="${CIAN}" stroke="${NEGRE}" stroke-width="2"/><circle cy="-20" r="6" fill="${NEGRE}"/></svg>`,
  40, 40, 20, 36,
)

const ESCALES = [100, 200, 500, 1000, 2000, 5000, 10000]

function Escala({ mapa }: { mapa: L.Map }) {
  const [, refer] = useState(0)
  useEffect(() => {
    const f = () => refer(n => n + 1)
    mapa.on('zoomend moveend', f)
    return () => { mapa.off('zoomend moveend', f) }
  }, [mapa])
  const c = mapa.getCenter()
  const mPx = 40075016.686 * Math.cos(c.lat * Math.PI / 180) / 2 ** (mapa.getZoom() + 8)
  const m = [...ESCALES].reverse().find(d => d / mPx <= 120) ?? ESCALES[0]
  return (
    <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
      <span class="num" style="font-size: 11px; color: #fff; text-shadow: 0 0 3px #000;">{m >= 1000 ? `${m / 1000} km` : `${m} m`}</span>
      <span style={`display: block; width: ${Math.round(m / mPx)}px; height: 6px; border: 2px solid #fff; border-top: 0;`}></span>
    </div>
  )
}

export interface PropsMapa {
  sessio: Sessio
  waypoints: Waypoint[]
  actiu: Waypoint | null
  vigent: PlanVigent | null
  mode: ModeMapa
  /** Ancho del mapa en px: el resto lo ocupa el panel. */
  ample: number
  /** La zona alcanzable a pintar. En vuelo, la del plan vigente; al marcar, la del objetivo elegido. */
  zona: Punto[][]
  /** Al marcar: donde centrar el mapa al abrir. */
  centreInicial?: Punto | null
  /** Por coordenadas: el punto nuevo, antes de guardarlo. */
  puntNou?: { p: Punto; nom: string } | null
  onLlargPremut?: (p: Punto) => void
  onCentre?: (p: Punto) => void
  /** El boton de la lista de waypoints, el primero de la columna en vuelo. */
  onWaypoints?: () => void
  /** Lo que va encima del mapa en HTML, ademas de los botones. */
  children?: ComponentChildren
  /** Los textos de la leyenda de la zona alcanzable. */
  llegendaZona?: string | null
}

export function MapaVol(p: PropsMapa) {
  const nodo = useRef<HTMLDivElement>(null)
  const pos = p.sessio.traza[p.sessio.traza.length - 1] ?? { ...p.sessio.despegue, altM: p.sessio.despegue.elevM }
  const mapa = useLeaflet(nodo, p.centreInicial ?? pos, 14)
  const [seguir, setSeguir] = useState(p.mode === 'vol')
  const onCentre = useRef(p.onCentre)
  onCentre.current = p.onCentre
  const onLlarg = useRef(p.onLlargPremut)
  onLlarg.current = p.onLlargPremut

  // Paneles propios para el orden de pintado y para la opacidad de grupo de la zona.
  useEffect(() => {
    if (mapa === null) return
    mapa.createPane('zona').style.zIndex = '405'
    mapa.createPane('pla').style.zIndex = '410'
    mapa.on('dragstart', () => setSeguir(false))
    mapa.on('contextmenu', e => onLlarg.current?.({ lat: e.latlng.lat, lon: e.latlng.lng }))
    mapa.on('move', () => { const c = mapa.getCenter(); onCentre.current?.({ lat: c.lat, lon: c.lng }) })
  }, [mapa])

  useEffect(() => {
    if (mapa === null) return
    mapa.getPane('zona')!.style.opacity = p.mode === 'marcar' ? '.2' : '.26'
  }, [mapa, p.mode])

  useEffect(() => { mapa?.invalidateSize() }, [mapa, p.ample])
  useEffect(() => { if (p.mode !== 'vol') setSeguir(false) }, [p.mode])
  useEffect(() => {
    if (mapa !== null && p.centreInicial != null) mapa.setView([p.centreInicial.lat, p.centreInicial.lon], Math.max(mapa.getZoom(), 15))
  }, [mapa, p.centreInicial?.lat, p.centreInicial?.lon])
  useEffect(() => {
    if (mapa !== null && seguir) mapa.panTo([pos.lat, pos.lon], { animate: false })
  }, [mapa, seguir, pos.lat, pos.lon])

  // Las capas, rehechas cuando cambia lo que pintan.
  const r = p.vigent?.r ?? null
  const rv = rumboVelocidad(p.sessio.traza)
  useEffect(() => {
    if (mapa === null) return
    const g = L.layerGroup()
    for (const poli of p.zona) {
      if (poli.length > 2) L.polygon(poli.map(q => [q.lat, q.lon] as [number, number]), { pane: 'zona', stroke: false, fillColor: VERD, fillOpacity: 1, interactive: false }).addTo(g)
    }
    const ambDesti = p.actiu !== null && p.mode !== 'marcar'
    if (ambDesti && r !== null && r.camino.length > 1) {
      for (const t of trossosCami(r.camino)) {
        const ll = t.punts.map(q => [q.lat, q.lon] as [number, number])
        L.polyline(ll, { pane: 'pla', color: NEGRE, opacity: 0.55, weight: 8, lineCap: 'round', interactive: false }).addTo(g)
        L.polyline(ll, { pane: 'pla', color: t.aRas ? VERD : CIAN, weight: 4, dashArray: t.aRas ? '7 6' : undefined, lineCap: 'round', interactive: false }).addTo(g)
      }
      for (const m of marquesCadaCinc(r.camino)) L.marker([m.p.lat, m.p.lon], { icon: marca(m.min, CIAN, 9, NEGRE, 10), pane: 'pla', interactive: false }).addTo(g)
      if (r.estado !== 'llega' && r.masCerca !== null) {
        L.polyline([[r.masCerca.lat, r.masCerca.lon], [p.actiu!.lat, p.actiu!.lon]], { pane: 'pla', color: BLANC, weight: 2, dashArray: '3 4', interactive: false }).addTo(g)
        L.circleMarker([r.masCerca.lat, r.masCerca.lon], { pane: 'pla', radius: 7, color: BLANC, weight: 2.5, fillColor: '#1a1a19', fillOpacity: 1, interactive: false }).addTo(g)
      }
    } else if (ambDesti && p.mode === 'vol') {
      L.polyline([[pos.lat, pos.lon], [p.actiu!.lat, p.actiu!.lon]], { color: BLANC, weight: 2, dashArray: '6 6', interactive: false }).addTo(g)
    }
    for (const w of p.waypoints) {
      if (p.actiu !== null && w.id === p.actiu.id && p.mode !== 'marcar') {
        L.marker([w.lat, w.lon], { icon: desti, interactive: false }).addTo(g)
        if (p.mode === 'llista') L.marker([w.lat, w.lon], { icon: etiqueta(w.nom, CIAN, 15), interactive: false }).addTo(g)
      } else {
        L.marker([w.lat, w.lon], { icon: anella, interactive: false }).addTo(g)
        L.marker([w.lat, w.lon], { icon: etiqueta(w.nom), interactive: false }).addTo(g)
      }
    }
    // La traza, por tramos del mismo color.
    const tr = p.sessio.traza
    const sostre = p.sessio.sostreM
    let tros: [number, number][] = []
    let color = ''
    const tancar = () => {
      if (tros.length < 2) return
      L.polyline(tros, { color: NEGRE, opacity: 0.55, weight: 8, lineCap: 'round', interactive: false }).addTo(g)
      L.polyline(tros, { color, weight: 4, lineCap: 'round', interactive: false }).addTo(g)
    }
    for (const q of tr) {
      const c = colorAltitud(q.altM, p.sessio.despegue.elevM, sostre)
      if (c !== color && tros.length > 0) { tancar(); tros = [tros[tros.length - 1]] }
      color = c
      tros.push([q.lat, q.lon])
    }
    tancar()
    const d = p.sessio.despegue
    L.circleMarker([d.lat, d.lon], { radius: 7, color: NEGRE, weight: 2, fillColor: BLANC, fillOpacity: 1, interactive: false }).addTo(g)
    if (p.mode === 'vol') {
      L.marker([d.lat, d.lon], { icon: etiqueta(`Enlairament ${horaLocal(p.sessio.enlairatA ?? p.sessio.iniciadaA)}`, BLANC, 13), interactive: false }).addTo(g)
    }
    if (p.actiu === null && p.mode === 'vol' && rv !== null && rv.velMs > 0.3) {
      const ps = proyeccion({ lat: pos.lat, lon: pos.lon }, rv.rumbo, rv.velMs)
      const ll: [number, number][] = [[pos.lat, pos.lon], ...ps.map(q => [q.lat, q.lon] as [number, number])]
      L.polyline(ll, { color: NEGRE, opacity: 0.5, weight: 6, lineCap: 'round', interactive: false }).addTo(g)
      L.polyline(ll, { color: BLANC, weight: 3, lineCap: 'round', interactive: false }).addTo(g)
      ps.forEach((q, i) => L.marker([q.lat, q.lon], { icon: marca((i + 1) * 5, BLANC, 11, '#1a1a19', 11), interactive: false }).addTo(g))
    }
    if (p.puntNou != null) {
      L.polyline([[pos.lat, pos.lon], [p.puntNou.p.lat, p.puntNou.p.lon]], { color: CIAN, weight: 2, dashArray: '6 6', interactive: false }).addTo(g)
      L.marker([p.puntNou.p.lat, p.puntNou.p.lon], { icon: xinxeta, interactive: false }).addTo(g)
      L.marker([p.puntNou.p.lat, p.puntNou.p.lon], { icon: etiqueta(p.puntNou.nom, BLANC, 16), interactive: false }).addTo(g)
    }
    L.marker([pos.lat, pos.lon], { icon: globus(rv?.rumbo ?? 0), zIndexOffset: 1000, interactive: false }).addTo(g)
    g.addTo(mapa)
    return () => { g.remove() }
  }, [mapa, p.zona, r, p.waypoints, p.actiu, p.mode, p.puntNou?.p.lat, p.puntNou?.p.lon, p.puntNou?.nom, p.sessio.traza.length])

  const boto = (titol: string, fill: ComponentChildren, accio: () => void) => (
    <button type="button" aria-label={titol} onClick={accio} style={`
      width: 52px; height: 52px; border-radius: 10px; border: 0; background: ${SOBRE}; color: #fff;
      display: flex; align-items: center; justify-content: center; font: 26px var(--mono); cursor: pointer;
    `}>{fill}</button>
  )

  return (
    <div style={`position: absolute; left: 0; top: 0; width: ${p.ample}px; height: calc(100dvh - 200px); background: #3a3426; overflow: hidden;`}>
      <div ref={nodo} style="position: absolute; inset: 0;"></div>
      {p.mode === 'marcar' && (
        <svg width="64" height="64" viewBox="0 0 64 64" style="position: absolute; left: 50%; top: 50%; margin: -32px 0 0 -32px; z-index: 900; pointer-events: none;">
          <g fill="none" stroke-linecap="round">
            <circle cx="32" cy="32" r="16" stroke={NEGRE} stroke-opacity=".6" stroke-width="5" />
            <path d="M32 2v20M32 42v20M2 32h20M42 32h20" stroke={NEGRE} stroke-opacity=".6" stroke-width="5" />
            <circle cx="32" cy="32" r="16" stroke={BLANC} stroke-width="2.5" />
            <path d="M32 2v20M32 42v20M2 32h20M42 32h20" stroke={BLANC} stroke-width="2.5" />
          </g>
        </svg>
      )}
      {p.children}
      {mapa !== null && (p.mode === 'vol' || p.mode === 'marcar') && (
        <div style="position: absolute; right: 16px; top: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 1000;">
          {p.mode === 'vol' && p.onWaypoints !== undefined && boto('Waypoints', <Icon name="waypoint" size={24} width={2} />, p.onWaypoints)}
          {p.mode === 'vol' && boto('Centrar en el globus', <Icon name="centrar" size={24} width={2} />, () => { setSeguir(true); mapa.panTo([pos.lat, pos.lon]) })}
          {boto('Apropar', '+', () => mapa.zoomIn())}
          {boto('Allunyar', '−', () => mapa.zoomOut())}
        </div>
      )}
      {mapa !== null && p.mode === 'vol' && (
        <div style="position: absolute; right: 16px; bottom: 14px; display: flex; align-items: flex-end; gap: 12px; z-index: 1000;">
          <Escala mapa={mapa} />
          <span style="font-size: 11px; color: #fff; text-shadow: 0 0 3px #000;">Ortofoto ICGC, CC BY 4.0 · relleu AWS Terrain Tiles</span>
        </div>
      )}
      {p.mode === 'vol' && (
        <Llegenda
          zona={p.zona.length > 0 ? (p.llegendaZona ?? null) : null}
          pla={p.actiu !== null && r !== null && r.camino.length > 1}
          aRas={p.actiu !== null && r !== null && r.camino.some(c => c.aRas)}
          projeccio={p.actiu === null && rv !== null && rv.velMs > 0.3}
          sostreFt={p.sessio.sostreM}
          senseWaypoint={p.actiu === null}
        />
      )}
    </div>
  )
}

function Llegenda(p: { zona: string | null; pla: boolean; aRas: boolean; projeccio: boolean; sostreFt: number; senseWaypoint: boolean }) {
  const fila = (mostra: ComponentChildren, text: string) => (
    <div style="display: flex; align-items: center; gap: 10px;">{mostra}<span>{text}</span></div>
  )
  return (
    <div style={`position: absolute; left: 16px; bottom: 14px; z-index: 1000; background: ${SOBRE}; border-radius: 8px; padding: 9px 12px; display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #c3c2b7;`}>
      {p.zona !== null && fila(<span style={`width: 22px; height: 12px; border-radius: 3px; background: ${VERD}; opacity: .5;`}></span>, p.zona)}
      {p.pla && fila(<span style={`width: 22px; height: 4px; border-radius: 2px; background: ${CIAN};`}></span>, 'Pla en altura, marques cada 5 min')}
      {p.aRas && fila(<span style={`width: 22px; border-top: 4px dashed ${VERD};`}></span>, 'Pla a ras (terra)')}
      {p.projeccio && fila(<span style="width: 22px; height: 3px; border-radius: 2px; background: #fff;"></span>, "Projecció a l'altitud actual, 5 a 20 min")}
      {fila(<span style="width: 120px; height: 4px; border-radius: 2px; background: linear-gradient(90deg,#ffd400,#ff9f1a,#ff4fd8,#a77bff);"></span>, 'Traça per altitud')}
      {p.senseWaypoint && <span style="color: #898781;">Mantén premut el mapa per afegir un waypoint</span>}
    </div>
  )
}

/** Un punto desplazado en metros, para centrar el mapa con el panel abierto. */
export const desplacat = (q: Punto, x: number, y: number) => aGeo({ lat0: q.lat, lon0: q.lon }, x, y)

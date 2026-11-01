// src/ui/vol/Comencar.tsx
// «Començar vol», antes de despegar (maqueta TauletaComencar, ESPEC_TAULETA.md
// §2.6): el techo, lo que se baja para volar sin cobertura (spec 10/10 §8) y la
// calibracion de la altitud en tierra (§6.2). El despegue es donde esta la
// tablet, y su terreno sale del relieve (§12.1).
import type { ComponentChildren } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import L from 'leaflet'
import { PIE_M } from '../../services/nav/campo'
import { parsePrevision } from '../../services/nav/perfil'
import { sueloGeo } from '../../services/nav/relieve'
import type { Relieve } from '../../services/nav/tipos'
import type { Progreso } from '../../services/vuelo/bajarMosaicos'
import { calibracion, CALIBRACION_S } from '../../services/vuelo/gps'
import { RADIO_ORTO_DETALLE_M } from '../../services/vuelo/mapasDeVuelo'
import { prepararVol, type Fase, type Preparado } from '../../services/vuelo/preparar'
import type { Obtenida } from '../../services/vuelo/previsionGuardada'
import { waypointActiu } from '../../domain/waypoints'
import { desarSostre, ultimSostre } from '../aparell'
import { Icon } from '../components/Icon'
import { useDoc } from '../state'
import { altFt, horaLocal } from './presentacio'
import { retirar, useLeaflet } from './useLeaflet'
import { useVol } from './VolProvider'

const MENYS = '−'
const signe = (v: number) => `${v < 0 ? MENYS : '+'}${Math.abs(Math.round(v))}`

/** De que hora a que hora llega el pronostico, con «de demà» si acaba otro dia. */
function finestra(h0: number, h1: number): string {
  const altreDia = new Date(h0).toDateString() !== new Date(h1).toDateString()
  return `${horaLocal(h0)} a ${horaLocal(h1)}${altreDia ? ' de demà' : ''}`
}

function Tarja({ estat, titol, children }: { estat: 'fet' | 'encurs' | 'pendent'; titol: string; children?: ComponentChildren }) {
  return (
    <div style={`
      background: var(--surface); border-radius: 10px; padding: 14px 16px; display: flex; gap: 12px;
      border: 1px solid ${estat === 'encurs' ? 'var(--accent)' : 'transparent'};
    `}>
      <span style={`color: ${estat === 'fet' ? 'var(--ok)' : estat === 'encurs' ? 'var(--accent)' : 'var(--dim)'};`}>
        <Icon name={estat === 'fet' ? 'check' : 'reloj'} size={22} width={estat === 'fet' ? 2.6 : 2.2} />
      </span>
      <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 17px; font-weight: 500;">{titol}</div>
        {children}
      </div>
    </div>
  )
}

function Barra({ fraccio, color }: { fraccio: number; color: string }) {
  return (
    <div style="height: 6px; border-radius: 3px; background: var(--border); overflow: hidden;">
      <div style={`height: 100%; width: ${Math.round(Math.min(1, fraccio) * 100)}%; background: ${color};`}></div>
    </div>
  )
}

const Sub = ({ children }: { children: ComponentChildren }) =>
  <div class="muted" style="font-size: 14px;">{children}</div>

function MapaPreparacio({ lat, lon }: { lat: number; lon: number }) {
  const nodo = useRef<HTMLDivElement>(null)
  const mapa = useLeaflet(nodo, { lat, lon }, 13)
  useEffect(() => {
    if (mapa === null) return
    const capa = L.layerGroup([
      L.circle([lat, lon], { radius: RADIO_ORTO_DETALLE_M, color: '#ffffff', weight: 3, dashArray: '10 8', fillColor: '#ffffff', fillOpacity: 0.06 }),
      L.circleMarker([lat, lon], { radius: 10, color: '#0b0b0b', weight: 3, fillColor: '#ffffff', fillOpacity: 1 }),
    ]).addTo(mapa)
    return () => { retirar(mapa, capa) }
  }, [mapa, lat, lon])
  return (
    <div style="position: relative; width: 640px; height: 100%; background: #3a3426; flex-shrink: 0;">
      <div ref={nodo} style="position: absolute; inset: 0;"></div>
      <div class="sobre-mapa" style="position: absolute; left: 16px; top: 16px; right: 16px; border-radius: 10px; padding: 12px 14px; z-index: 500;">
        <div style="font-size: 15px; font-weight: 500;">Mapa per volar sense cobertura</div>
        <div class="muted" style="font-size: 13px; margin-top: 3px;">
          Ortofoto de <span class="num">15 km</span> al voltant de l'enlairament, i més detall a <span class="num">3 km</span>
        </div>
      </div>
      <div style="position: absolute; right: 16px; bottom: 14px; z-index: 500; font-size: 11px; color: #fff; text-shadow: 0 0 3px #000;">
        Ortofoto ICGC, CC BY 4.0
      </div>
    </div>
  )
}

export function Comencar() {
  const doc = useDoc()
  const { ultimGps, errorGps, mostres, escoltar, comencar } = useVol()
  const [sostreTxt, setSostreTxt] = useState(() => { const s = ultimSostre(); return s === null ? '' : String(s) })
  const [preparat, setPreparat] = useState<Preparado | null>(null)
  const [fase, setFase] = useState<{ f: Fase; p: Progreso | null } | null>(null)
  const [terrenyTxt, setTerrenyTxt] = useState('')
  const [iniciCal, setIniciCal] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ara, setAra] = useState(Date.now())

  useEffect(() => { escoltar(true); return () => escoltar(false) }, [])
  useEffect(() => { const r = setInterval(() => setAra(Date.now()), 1000); return () => clearInterval(r) }, [])

  // El despegue se fija al preparar: la cesta no se mueve.
  const [despegue, setDespegue] = useState<{ lat: number; lon: number } | null>(null)
  const posicio = despegue ?? (ultimGps === null ? null : { lat: ultimGps.lat, lon: ultimGps.lon })

  const sostreM = Number(sostreTxt.replace(',', '.'))
  const sostreValid = sostreTxt.trim() !== '' && Number.isFinite(sostreM) && sostreM > 0

  // Cada fase se ensena en cuanto acaba: la ortofoto puede seguir bajando mientras se calibra.
  const [obtinguda, setObtinguda] = useState<Obtenida | null>(null)
  const [relleu, setRelleu] = useState<Relieve | null | undefined>(undefined)
  const relieve: Relieve | null = relleu ?? null
  const terrenyRelleu = relieve !== null && despegue !== null ? sueloGeo(relieve, despegue.lat, despegue.lon) : NaN
  const terrenyM = Number.isFinite(terrenyRelleu) ? terrenyRelleu : Number(terrenyTxt.replace(',', '.'))
  const terrenyValid = Number.isFinite(terrenyM) && (Number.isFinite(terrenyRelleu) || terrenyTxt.trim() !== '')

  const mostresCal = iniciCal === null ? [] : mostres.filter(m => m.t >= iniciCal)
  const segonsCal = iniciCal === null ? 0 : Math.min(CALIBRACION_S, Math.floor((ara - iniciCal) / 1000))
  const cal = segonsCal >= CALIBRACION_S && terrenyValid ? calibracion(mostresCal, terrenyM) : null
  const gpsMitja = mostresCal.filter(m => m.altElipM !== null)
  const gpsM = gpsMitja.length === 0 ? null : gpsMitja.reduce((s, m) => s + m.altElipM!, 0) / gpsMitja.length

  const prev = useMemo(() => {
    const g = obtinguda?.guardada
    return g == null ? null : { p: parsePrevision(g.respuesta), pedidaEn: g.pedidaEn }
  }, [obtinguda])

  const actiu = waypointActiu(doc)

  async function preparar() {
    if (posicio === null || !sostreValid) return
    desarSostre(sostreM)
    setDespegue(posicio)
    setError(null)
    try {
      const r = await prepararVol(posicio.lat, posicio.lon, Date.now(), {
        alProgreso: (f, p) => setFase({ f, p }),
        alPrevisio: setObtinguda,
        alRelleu: rl => { setRelleu(rl); setIniciCal(Date.now()) },
      })
      setPreparat(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function obrir(correccioM: number | null) {
    if (despegue === null || !terrenyValid) return
    comencar({ lat: despegue.lat, lon: despegue.lon, elevM: terrenyM }, sostreM, correccioM)
  }

  const potObrir = prev !== null && cal !== null
  const potSenseCalibrar = prev !== null && terrenyValid
  const orto = preparat?.orto ?? (fase?.f === 'ortofoto' ? fase.p : null)

  return (
    <div style="display: flex; height: 100dvh; overflow: hidden; background: var(--bg);">
      {posicio === null
        ? <div style="width: 640px; flex-shrink: 0; background: #3a3426;"></div>
        : <MapaPreparacio lat={posicio.lat} lon={posicio.lon} />}

      <div style="flex-grow: 1; min-width: 0; overflow-y: auto; padding: 28px 36px; display: flex; flex-direction: column; gap: 12px;">
        <div>
          <h1 style="margin: 0; font-size: 30px; font-weight: 600; letter-spacing: -.02em;">Començar vol</h1>
          <div class="dim" style="font-size: 14px; margin-top: 4px;">Tot el que cal per volar sense cobertura, abans d'enlairar-te</div>
        </div>

        {errorGps !== null && <div style="color: var(--warn); font-size: 14px;">{errorGps}</div>}

        {fase === null && (
          <>
            <label style="display: flex; flex-direction: column; gap: 6px;">
              <span class="lab">Sostre</span>
              <div style="display: flex; align-items: center; gap: 10px;">
                <input
                  inputMode="decimal" value={sostreTxt} placeholder="p. ex. 1200"
                  onInput={e => setSostreTxt((e.target as HTMLInputElement).value)}
                  class="num"
                  style="height: 44px; width: 180px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); padding: 0 12px; font-size: 16px;"
                />
                <span class="muted num" style="font-size: 15px;">
                  {sostreValid ? `m · ${altFt(sostreM)} ft` : 'm'}
                </span>
              </div>
              <span class="dim" style="font-size: 13px;">El sostre del teu espai aeri per a aquest vol. L'optimitzador no hi passa.</span>
            </label>
            <button
              type="button" onClick={() => void preparar()} disabled={posicio === null || !sostreValid || fase !== null}
              style="height: 52px; border-radius: 8px; border: 0; background: var(--accent); color: var(--accent-text); font: inherit; font-size: 17px; font-weight: 500;"
            >
              {posicio === null ? 'Esperant el GPS…' : fase !== null ? 'Preparant…' : 'Preparar el vol aquí'}
            </button>
          </>
        )}

        {error !== null && <div style="color: var(--danger); font-size: 14px;">{error}</div>}

        {fase !== null && (
          <>
            <Tarja estat={prev !== null ? 'fet' : obtinguda === null ? 'encurs' : 'pendent'} titol="Pronòstic">
              {prev !== null
                ? <Sub>{prev.p.modelos.length} models, baixat a les <span class="num">{horaLocal(prev.pedidaEn)}</span> al punt d'enlairament</Sub>
                : obtinguda !== null ? <Sub>Sense pronòstic: {obtinguda.error}</Sub> : <Sub>Baixant…</Sub>}
            </Tarja>
            <Tarja estat={preparat !== null ? 'fet' : fase.f === 'previsio' ? 'pendent' : 'encurs'} titol="Mapa sense cobertura">
              {orto !== null && <Barra fraccio={orto.total === 0 ? 1 : orto.hechos / orto.total} color={preparat !== null ? 'var(--ok)' : 'var(--accent)'} />}
              {orto !== null && (
                <Sub>
                  <span class="num">{orto.hechos}</span> de <span class="num">{orto.total}</span> mosaics,{' '}
                  <span class="num">{Math.round(orto.bytes / 1e6)} MB</span> baixats
                  {orto.yaEstaban > 0 && <>, <span class="num">{orto.yaEstaban}</span> ja hi eren</>}
                </Sub>
              )}
              {fase.f === 'relleu' && <Sub>Baixant el relleu…</Sub>}
              {relleu === null && <Sub>Sense relleu: el pla no sabrà on és el terreny.</Sub>}
              {fase.f === 'ortofoto' && preparat === null && <Sub>Pots calibrar i obrir la pantalla mentre acaba.</Sub>}
            </Tarja>
            {relleu !== undefined && (
              <Tarja estat={cal !== null ? 'fet' : 'encurs'} titol="Calibrant l'altitud a terra">
                <Sub>Deixa la cistella quieta a terra. <span class="num">{segonsCal} s</span> de <span class="num">{CALIBRACION_S}</span></Sub>
                <Barra fraccio={segonsCal / CALIBRACION_S} color={cal !== null ? 'var(--ok)' : 'var(--accent)'} />
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                  <div><div class="lab" style="font-size: 11px;">GPS</div><div class="num" style="font-size: 18px;">{gpsM === null ? '–' : `${Math.round(gpsM)} m`}</div></div>
                  <div>
                    <div class="lab" style="font-size: 11px;">Terreny</div>
                    {Number.isFinite(terrenyRelleu)
                      ? <div class="num" style="font-size: 18px;">{Math.round(terrenyRelleu)} m</div>
                      : <input inputMode="decimal" value={terrenyTxt} placeholder="m" onInput={e => setTerrenyTxt((e.target as HTMLInputElement).value)}
                          class="num" style="height: 34px; width: 100px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--text); padding: 0 8px; font-size: 16px;" />}
                  </div>
                  <div><div class="lab" style="font-size: 11px;">Correcció</div><div class="num" style="font-size: 18px;">{cal === null ? '–' : `${signe(cal.correccionM)} m`}</div></div>
                </div>
              </Tarja>
            )}
            {preparat?.avisos.filter(a => a !== preparat.prevision.error && !a.startsWith('Sense relleu')).map(a => (
              <div key={a} style="color: var(--warn); font-size: 14px;">{a}</div>
            ))}
          </>
        )}

        {obtinguda !== null && relleu !== undefined && (
          <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px;">
            {[
              ['Finestra', prev === null ? '–' : finestra(prev.p.horas[0], prev.p.horas[prev.p.horas.length - 1])],
              ['Sostre', `${Math.round(sostreM)} m · ${altFt(sostreM)} ft`],
              ['Optimitzador', terrenyValid ? `${altFt(terrenyM + 250 * PIE_M)} a ${altFt(sostreM)} ft` : '–'],
              ...(actiu === null ? [] : [['Waypoint actiu', actiu.nom]]),
            ].map(([l, v]) => (
              <div key={l} style="display: flex; justify-content: space-between; padding: 11px 2px; border-bottom: 1px solid var(--border); font-size: 15px;">
                <span>{l}</span><span class="muted num">{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style="flex-grow: 1;"></div>
        {obtinguda !== null && relleu !== undefined && (
          <>
            <button
              type="button" disabled={!potObrir} onClick={() => obrir(cal!.correccionM)}
              style={`height: 64px; border-radius: 10px; border: 0; font: inherit; font-size: 19px; font-weight: 500;
                background: ${potObrir ? 'var(--accent)' : 'var(--surface)'}; color: ${potObrir ? 'var(--accent-text)' : 'var(--dim)'};`}
            >Obrir la pantalla de vol</button>
            {!potObrir && potSenseCalibrar && (
              <button type="button" class="linkish" onClick={() => obrir(null)} style="align-self: center;">
                Obrir sense calibrar (l'altitud pot sortir uns 50 m alta)
              </button>
            )}
            <div class="dim" style="font-size: 13px; text-align: center;">La pantalla es queda encesa mentre voles</div>
          </>
        )}
      </div>
    </div>
  )
}

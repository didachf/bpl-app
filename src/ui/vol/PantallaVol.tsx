// src/ui/vol/PantallaVol.tsx
// El vuelo en marcha (maquetas Main, TauletaSenseWaypoint, TauletaMapa*,
// TauletaVolMes, TauletaWaypoints, TauletaPunt* y TauletaCoordenades). Un solo
// mapa, y los paneles a la derecha cambian su ancho.
import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import type { Punto } from '../../services/nav/tipos'
import { waypointActiu } from '../../domain/waypoints'
import type { Waypoint } from '../../domain/types'
import { Icon } from '../components/Icon'
import { navigate } from '../router'
import { useDoc } from '../state'
import { Coordenades } from './Coordenades'
import { ambXifres, Franja } from './Franja'
import { MapaVol, type ModeMapa } from './MapaVol'
import { MarcarPunt } from './MarcarPunt'
import { horaLocal, tempsVol, textObjectiu } from './presentacio'
import { useNavegacio } from './useNavegacio'
import { useVol } from './VolProvider'
import { Waypoints } from './Waypoints'

const PANEL = 420
const SOBRE = 'rgba(26,26,25,.92)'

type Vista =
  | { v: 'mapa' }
  | { v: 'llista' }
  | { v: 'marcar'; centre: Punto; editant: Waypoint | null }
  | { v: 'coordenades' }

function Fitxa({ children, vora }: { children: ComponentChildren; vora?: string }) {
  return (
    <div style={`
      background: rgba(26,26,25,.88); border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #c3c2b7;
      display: flex; align-items: center; gap: 8px; ${vora === undefined ? '' : `border: 1px solid ${vora}; color: ${vora};`}
    `}>{children}</div>
  )
}

function Mes({ temps, onTancar, onWaypoints, onAcabar }: { temps: string; onTancar: () => void; onWaypoints: () => void; onAcabar: () => Promise<void> }) {
  const [confirmar, setConfirmar] = useState(false)
  const fila = (icona: ComponentChildren, titol: string, sub: string, fons: string, vora: string, accio: () => void) => (
    <button type="button" onClick={accio} style={`
      display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 12px; text-align: left;
      background: ${fons}; border: 1px solid ${vora}; color: #fff; font: inherit; cursor: pointer;
    `}>
      {icona}
      <span style="display: flex; flex-direction: column; gap: 2px;">
        <span style="font-size: 18px; font-weight: 600;">{titol}</span>
        <span style="font-size: 13px; color: #c3c2b7;">{sub}</span>
      </span>
    </button>
  )
  return (
    <>
      <div onClick={onTancar} style="position: absolute; inset: 0; background: rgba(10,10,10,.55); z-index: 2000;"></div>
      <div role="dialog" aria-label="Més opcions del vol" style="
        position: absolute; right: 16px; bottom: 212px; width: 420px; z-index: 2001; background: #1a1a19;
        border: 1px solid #2c2c2a; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
        box-shadow: 0 12px 40px rgba(0,0,0,.5); color: #fff;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="lab">Vol en marxa · <span class="num">{temps}</span></span>
          <button type="button" aria-label="Tancar" onClick={onTancar} style="width: 40px; height: 40px; border: 0; background: none; color: #c3c2b7; cursor: pointer;">
            <Icon name="tancar" size={22} />
          </button>
        </div>
        {confirmar ? (
          <div style="display: flex; flex-direction: column; gap: 10px; padding: 6px 2px;">
            <div style="font-size: 18px; font-weight: 600;">Acabar el vol?</div>
            <div style="font-size: 14px; color: #c3c2b7;">El GPS es para i la traça queda desada en aquest aparell.</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <button type="button" onClick={() => setConfirmar(false)} style="height: 52px; border-radius: 8px; border: 1px solid #2c2c2a; background: none; color: #fff; font: inherit; font-size: 16px;">Continuar volant</button>
              <button type="button" onClick={() => void onAcabar()} style="height: 52px; border-radius: 8px; border: 0; background: var(--danger); color: #fff; font: inherit; font-size: 16px; font-weight: 600;">Acabar</button>
            </div>
          </div>
        ) : (
          <>
            {fila(<Icon name="waypoint" size={28} width={2} />, 'Waypoints', 'Els del pla i afegir-ne', '#222220', '#2c2c2a', onWaypoints)}
            {fila(<Icon name="enrere" size={28} width={2} />, "Sortir a l'app", 'El vol i el GPS continuen. La barra de dalt hi torna', '#222220', '#2c2c2a', () => navigate({ name: 'inicio' }))}
            {fila(<span style="color: var(--danger);"><Icon name="parar" size={28} width={2} /></span>, 'Acabar vol', 'Para el GPS', '#2a1d1b', '#6b2a26', () => setConfirmar(true))}
          </>
        )}
      </div>
    </>
  )
}

export function PantallaVol() {
  const doc = useDoc()
  const { sessio, ultimGps, errorGps, acabar } = useVol()
  const s = sessio!
  const actiu = waypointActiu(doc)
  const nav = useNavegacio(s, actiu)
  const [vista, setVista] = useState<Vista>({ v: 'mapa' })
  const [mes, setMes] = useState(false)
  const [ara, setAra] = useState(Date.now())
  const [zonaMarcar, setZonaMarcar] = useState<Punto[][]>([])
  const [puntNou, setPuntNou] = useState<{ p: Punto; nom: string } | null>(null)
  const [centre, setCentre] = useState<Punto | null>(null)
  useEffect(() => { const r = setInterval(() => setAra(Date.now()), 1000); return () => clearInterval(r) }, [])

  const pos = s.traza[s.traza.length - 1] ?? { ...s.despegue, altM: s.despegue.elevM, t: ara }
  const mode: ModeMapa = vista.v === 'mapa' ? 'vol' : vista.v === 'llista' ? 'llista' : vista.v === 'marcar' ? 'marcar' : 'coordenades'
  const ample = vista.v === 'mapa' ? window.innerWidth : window.innerWidth - PANEL
  const r = nav.vigent?.r ?? null
  const zona = vista.v === 'marcar' ? zonaMarcar : (r?.zona ?? [])
  const fiZona = r === null ? null : horaLocal(Date.parse(r.calculadoA) + 60 * 60_000)
  const llegendaZona = actiu === null
    ? `On pots arribar, fins a les ${fiZona}`
    : actiu.objectiu.tipo === 'aterrar' ? `On pots aterrar, fins a les ${fiZona}`
      : actiu.objectiu.tipo === 'altitud' ? `On pots passar ${textObjectiu(actiu.objectiu)}, fins a les ${fiZona}`
        : `On pots arribar, fins a les ${fiZona}`
  const edatGps = ultimGps === null ? null : (ara - ultimGps.t) / 1000
  const gpsBe = edatGps !== null && edatGps < 10 && errorGps === null

  const obrirMarcar = (c: Punto, editant: Waypoint | null = null) => { setCentre(c); setVista({ v: 'marcar', centre: c, editant }) }

  return (
    <div style="position: relative; width: 100vw; height: 100dvh; overflow: hidden; background: var(--bg);">
      <MapaVol
        sessio={s} waypoints={doc.waypoints} actiu={actiu} vigent={nav.vigent} mode={mode} ample={ample}
        zona={zona} centreInicial={vista.v === 'marcar' ? vista.centre : null}
        puntNou={vista.v === 'coordenades' ? puntNou : null}
        onLlargPremut={q => obrirMarcar(q)} onCentre={setCentre} llegendaZona={llegendaZona}
        onWaypoints={() => setVista({ v: 'llista' })}
      >
        {vista.v === 'mapa' && (
          <div style="position: absolute; left: 16px; top: 16px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; max-width: 470px;">
            <div style="display: flex; gap: 8px;">
              <Fitxa>
                <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill={gpsBe ? '#0ca30c' : '#fab219'} /></svg>
                <span style="color: #fff;">GPS</span>
                <span class="num">{errorGps ?? (ultimGps === null ? '–' : `±${Math.round(ultimGps.precisionM)} m`)}</span>
              </Fitxa>
              {nav.guardada !== null && nav.previsio !== null && (
                <Fitxa>
                  Pronòstic de les <span class="num" style="color: #fff;">{horaLocal(nav.guardada.pedidaEn)}</span>, {nav.previsio.modelos.length} models{nav.relieve !== null ? ', amb relleu' : ''}
                </Fitxa>
              )}
              {nav.guardada === null && <Fitxa vora="#fab219">Sense pronòstic</Fitxa>}
            </div>
            {r?.avisos.map(a => (
              <Fitxa key={a} vora="#fab219"><Icon name="alerta" size={16} />{ambXifres(a)}</Fitxa>
            ))}
            {actiu !== null && r !== null && r.plan.length > 0 && (
              <div style={`width: 440px; box-sizing: border-box; background: ${SOBRE}; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; color: #fff;`}>
                <div class="lab" style="color: #8fd8f5;">Pla cap a {actiu.nom} · {textObjectiu(actiu.objectiu)}</div>
                <ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; font-size: 14px; line-height: 1.35;">
                  {r.ordenes.slice(0, r.plan.length).map((o, i) => (
                    <li key={i} style="display: grid; grid-template-columns: 22px 46px 1fr; gap: 8px; align-items: baseline;">
                      <span class="num" style="color: #898781;">{i + 1}</span>
                      <span class="num" style="color: #c3c2b7;">{r.plan[i].inicioMin === 0 ? 'ara' : horaLocal(Date.parse(r.calculadoA) + r.plan[i].inicioMin * 60_000)}</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ol>
                <div style="border-top: 1px solid #2c2c2a; padding-top: 7px; display: flex; flex-direction: column; gap: 3px; font-size: 13px;">
                  {r.ordenes.slice(r.plan.length).map((o, i) => (
                    <div key={i} style={i === 0 ? 'color: #fff;' : 'color: #c3c2b7;'}>{ambXifres(o)}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {(vista.v === 'llista' || vista.v === 'marcar') && (
          <div style="position: absolute; left: 16px; top: 16px; z-index: 1000;">
            <Fitxa>{vista.v === 'llista' ? 'Mantén premut el mapa per afegir un waypoint' : 'Mou el mapa fins que la creu caigui al punt'}</Fitxa>
          </div>
        )}
      </MapaVol>

      {vista.v !== 'mapa' && (
        <div style={`position: absolute; right: 0; top: 0; width: ${PANEL}px; height: calc(100dvh - 200px); box-sizing: border-box; background: var(--bg); border-left: 1px solid var(--border); display: flex; flex-direction: column;`}>
          {vista.v === 'llista' && (
            <Waypoints
              pos={pos} actiu={actiu}
              onTancar={() => setVista({ v: 'mapa' })}
              onMarcar={() => obrirMarcar({ lat: pos.lat, lon: pos.lon })}
              onEditar={w => obrirMarcar({ lat: w.lat, lon: w.lon }, w)}
              onCoordenades={() => setVista({ v: 'coordenades' })}
            />
          )}
          {vista.v === 'marcar' && (
            <MarcarPunt
              sessio={s} relieve={nav.relieve} previsio={nav.previsio} centre={centre ?? vista.centre} editant={vista.editant}
              onZona={setZonaMarcar}
              onTancar={() => setVista({ v: 'llista' })}
              onDesat={() => setVista({ v: 'mapa' })}
            />
          )}
          {vista.v === 'coordenades' && (
            <Coordenades pos={pos} onPunt={setPuntNou} onTancar={() => setVista({ v: 'llista' })} onDesat={() => setVista({ v: 'mapa' })} />
          )}
        </div>
      )}

      <Franja
        sessio={s} actiu={actiu} vigent={nav.vigent} relieve={nav.relieve} ara={ara}
        onMes={() => setMes(true)} onMapa={() => setVista({ v: 'mapa' })}
      />

      {mes && (
        <Mes
          temps={tempsVol(ara - (s.enlairatA ?? s.iniciadaA))}
          onTancar={() => setMes(false)}
          onWaypoints={() => { setMes(false); setVista({ v: 'llista' }) }}
          onAcabar={async () => { setMes(false); await acabar(); navigate({ name: 'operar' }) }}
        />
      )}
    </div>
  )
}

// src/ui/vol/MarcarPunt.tsx
// Marcar un punto al mapa con su objetivo (maquetas TauletaPuntAterrar y
// TauletaPuntPassar, ESPEC_TAULETA.md §2.7 y §2.8; spec 2026-11-01-objetivo):
// la cruz fija en el centro, el objetivo, y lo que da el motor con el viento de
// ahora, medio segundo despues de dejar de mover el mapa.
import { useEffect, useRef, useState } from 'preact/hooks'
import { PIE_M } from '../../services/nav/campo'
import type { Previsiones } from '../../services/nav/perfil'
import { sueloGeo } from '../../services/nav/relieve'
import type { Punto, Relieve, ResultadoNavegacion } from '../../services/nav/tipos'
import { crearCalculadorNavegador, type Calculador } from '../../services/vuelo/calculador'
import { formatDecimal } from '../../services/vuelo/coordenadas'
import { entradaDeVol } from '../../services/vuelo/navegacio'
import { distanciaM, formatDistancia, rumboDirecto } from '../../services/vuelo/rumbo'
import type { Sessio } from '../../services/vuelo/sessio'
import { afegirWaypoint, canviarNom, canviarObjectiu, canviarPosicio, nomNou } from '../../domain/waypoints'
import type { ObjectiuWaypoint, Waypoint } from '../../domain/types'
import { Icon } from '../components/Icon'
import { newId } from '../ids'
import { useDoc, useStore } from '../state'
import { ambXifres } from './Franja'
import { altFt, graus } from './presentacio'

const PAS_FT = 250

export interface PropsMarcar {
  sessio: Sessio
  relieve: Relieve | null
  previsio: Previsiones | null
  centre: Punto
  editant: Waypoint | null
  onZona: (z: Punto[][]) => void
  onTancar: () => void
  onDesat: () => void
}

function Segments<T extends string>({ opcions, valor, onTria, alt, etiqueta }: {
  opcions: { v: T; t: string; desactivat?: boolean }[]; valor: T; onTria: (v: T) => void; alt: number; etiqueta?: string
}) {
  return (
    <div role="group" aria-label={etiqueta} style={`display: grid; grid-template-columns: repeat(${opcions.length}, 1fr); gap: 6px; background: var(--surface); border-radius: 10px; padding: 4px;`}>
      {opcions.map(o => (
        <button key={o.v} type="button" aria-pressed={o.v === valor} disabled={o.desactivat} onClick={() => onTria(o.v)} style={`
          height: ${alt}px; border-radius: 7px; border: 0; font: inherit; font-size: 15px; cursor: pointer;
          background: ${o.v === valor ? 'var(--accent)' : 'transparent'};
          color: ${o.v === valor ? 'var(--accent-text)' : o.desactivat === true ? 'var(--dim)' : 'var(--muted)'};
          font-weight: ${o.v === valor ? 600 : 400};
        `}>{o.t}</button>
      ))}
    </div>
  )
}

export function MarcarPunt({ sessio, relieve, previsio, centre, editant, onZona, onTancar, onDesat }: PropsMarcar) {
  const doc = useDoc()
  const { update } = useStore()
  const [nom, setNom] = useState(editant?.nom ?? nomNou(doc))
  const [tipus, setTipus] = useState<ObjectiuWaypoint['tipo']>(editant?.objectiu.tipo ?? 'aterrar')
  const terreny = relieve === null ? NaN : sueloGeo(relieve, centre.lat, centre.lon)
  const ftDefecte = () => {
    if (editant?.objectiu.tipo === 'altitud') return Math.round(editant.objectiu.altM / PIE_M)
    const t = Number.isFinite(terreny) ? terreny / PIE_M : 1500
    return Math.ceil((t + 1000) / PAS_FT) * PAS_FT
  }
  const [ftTxt, setFtTxt] = useState(() => String(ftDefecte()))
  const ft = Number(ftTxt.replace(/\s/g, ''))
  const objectiu: ObjectiuWaypoint = tipus === 'altitud' ? { tipo: 'altitud', altM: (Number.isFinite(ft) ? ft : 0) * PIE_M } : { tipo: tipus } as ObjectiuWaypoint
  const [resultat, setResultat] = useState<ResultadoNavegacion | null>(null)
  const calc = useRef<Calculador | null>(null)

  useEffect(() => {
    calc.current = crearCalculadorNavegador()
    return () => { calc.current?.cerrar(); onZona([]) }
  }, [])

  useEffect(() => {
    setResultat(null)
    if (previsio === null || sessio.traza.length === 0) return
    const w: Waypoint = { id: 'nou', nom, lat: centre.lat, lon: centre.lon, objectiu, nota: '' }
    const t = setTimeout(() => {
      void calc.current?.calcular(entradaDeVol(sessio, previsio, relieve, w, Date.now())).then(r => {
        if (r === null) return
        setResultat(r.resultado)
        onZona(r.resultado.zona)
      }).catch(() => setResultat(null))
    }, 500)
    return () => clearTimeout(t)
  }, [centre.lat, centre.lon, tipus, ft, previsio, relieve])

  const pos = sessio.traza[sessio.traza.length - 1] ?? sessio.despegue
  const desar = () => {
    if (editant !== null) {
      update(d => canviarObjectiu(canviarNom(canviarPosicio(d, editant.id, centre.lat, centre.lon), editant.id, nom), editant.id, objectiu))
    } else {
      update(d => afegirWaypoint(d, { id: newId(), nom: nom.trim() || nomNou(d), lat: centre.lat, lon: centre.lon, objectiu, nota: '' }, true))
    }
    onDesat()
  }

  const camp = 'height: 44px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); padding: 0 12px; font: inherit; font-size: 16px; min-width: 0;'
  const resum = resultat === null ? null : resultat.ordenes.slice(resultat.plan.length)

  return (
    <div style="flex-grow: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <button type="button" aria-label="Cancel·lar" onClick={onTancar} style="width: 40px; height: 40px; margin-left: -8px; border: 0; background: none; color: var(--muted); cursor: pointer;">
          <Icon name="tancar" size={22} />
        </button>
        <span style="font-size: 20px; font-weight: 600;">{editant === null ? 'Marcar al mapa' : `Editar ${editant.nom}`}</span>
      </div>
      <Segments opcions={[{ v: 'punt', t: 'Punt' }, { v: 'zona', t: 'Zona (aviat)', desactivat: true }]} valor="punt" onTria={() => {}} alt={38} />
      <label style="display: grid; grid-template-columns: 70px 1fr; gap: 10px; align-items: center;">
        <span class="lab">Nom</span>
        <input value={nom} onInput={e => setNom((e.target as HTMLInputElement).value)} style={camp} />
      </label>
      <div style="background: var(--surface); border-radius: 10px; padding: 9px 12px; display: flex; flex-direction: column; gap: 3px;">
        <span class="lab">Sota la creu</span>
        <span class="num" style="font-size: 20px; font-weight: 500;">{formatDecimal(centre.lat, centre.lon)}</span>
        <span class="num muted" style="font-size: 13px;">
          {Number.isFinite(terreny) ? `terreny ${altFt(terreny)} ft · ` : ''}{graus(rumboDirecto(pos, centre))} a {formatDistancia(distanciaM(pos, centre))} del globus
        </span>
      </div>
      <span class="lab" style="margin-top: 2px;">Al punt</span>
      <Segments
        etiqueta="Objectiu al punt" alt={46} valor={tipus} onTria={setTipus}
        opcions={[{ v: 'aterrar', t: 'Aterrar' }, { v: 'altitud', t: 'Passar a…' }, { v: 'qualsevol', t: 'Qualsevol altura' }]}
      />
      {tipus === 'altitud' && (
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: grid; grid-template-columns: 52px 1fr 52px; gap: 8px; align-items: center;">
            <button type="button" aria-label="Baixar 250 ft" onClick={() => setFtTxt(String(Math.max(PAS_FT, ft - PAS_FT)))} style="height: 48px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font: 24px var(--mono); cursor: pointer;">{'−'}</button>
            <div style="display: flex; align-items: baseline; justify-content: center; gap: 6px;">
              <input aria-label="Altitud de pas, ft sobre el mar" inputMode="numeric" value={ftTxt} onInput={e => setFtTxt((e.target as HTMLInputElement).value)}
                class="num" style="width: 110px; text-align: right; background: transparent; border: 0; color: var(--text); font-size: 28px;" />
              <span class="muted" style="font-size: 16px;">ft</span>
            </div>
            <button type="button" aria-label="Pujar 250 ft" onClick={() => setFtTxt(String(ft + PAS_FT))} style="height: 48px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font: 24px var(--mono); cursor: pointer;">+</button>
          </div>
          <span class="num muted" style="font-size: 13px; text-align: center;">
            {Number.isFinite(terreny) ? `${altFt(ft * PIE_M - terreny)} ft sobre el terreny del punt · ` : ''}de 250 en 250
          </span>
        </div>
      )}
      <div class="muted" style="font-size: 13px; line-height: 1.45;">
        {tipus === 'aterrar' && "Compta arribar al punt a ras, a uns 10 m del terreny. Baixar abans i volar a ras, o baixar ràpid al final, ho tria el càlcul."}
        {tipus === 'altitud' && `Compta passar pel punt a ${altFt(ft * PIE_M)} ft, mantenint-la o creuant-la pujant o baixant.`}
        {tipus === 'qualsevol' && "Compta passar pel punt a l'altura que sigui, també pujant o baixant."}
      </div>
      <div style="background: var(--nav-bg); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px;">
        <span class="lab" style="color: var(--nav-lab);">Amb el vent d'ara</span>
        <span style="font-size: 15px;">
          {previsio === null ? 'Sense pronòstic.' : resum === null ? 'Calculant…' : ambXifres(resum[0] ?? resultat!.avisos[resultat!.avisos.length - 1] ?? '')}
        </span>
      </div>
      <div style="flex-grow: 1;"></div>
      <div style="position: sticky; bottom: -14px; background: var(--bg); padding: 8px 0 14px 0; margin-bottom: -14px;">
      <button type="button" onClick={desar} disabled={tipus === 'altitud' && !(ft > 0)} style="
        width: 100%; height: 52px; flex-shrink: 0; border-radius: 8px; border: 0; background: var(--accent); color: var(--accent-text);
        font: inherit; font-size: 17px; font-weight: 500; cursor: pointer;
      ">{editant === null ? 'Desar i navegar-hi' : 'Desar'}</button>
      </div>
    </div>
  )
}

// src/ui/vol/VolProvider.tsx
// El vuelo en curso, por encima de las rutas: la sesion y el GPS siguen aunque
// el piloto salga a otra pantalla («Sortir a l'app: el vol i el GPS continuen»).
// La traza se guarda cada 10 s y al ocultarse la app, no en cada punto (spec
// 10/10 §6.1), y la pantalla se mantiene encendida mientras hay vuelo (§7.4).
import { createContext } from 'preact'
import type { ComponentChildren } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { set } from 'idb-keyval'
import { CALIBRACION_S, type PuntoGps } from '../../services/vuelo/gps'
import {
  afegirPunt, desarSessio, esborrarSessio, llegirSessio, novaSessio, type Despegue, type Sessio,
} from '../../services/vuelo/sessio'
import { observarGps } from './fontGps'

const DESAR_MS = 10_000

export interface EstatVol {
  /** null mientras se lee de IndexedDB al arrancar. */
  carregat: boolean
  sessio: Sessio | null
  ultimGps: PuntoGps | null
  errorGps: string | null
  /** Los puntos de los ultimos 30 s tal cual, para calibrar en tierra. */
  mostres: PuntoGps[]
  /** El GPS en marcha sin sesion: en Començar vol, antes de despegar. */
  escoltar: (si: boolean) => void
  comencar: (despegue: Despegue, sostreM: number, correccioM: number | null) => void
  acabar: () => Promise<void>
}

const Ctx = createContext<EstatVol | null>(null)

export function useVol(): EstatVol {
  const v = useContext(Ctx)
  if (v === null) throw new Error('useVol fuera de <VolProvider>')
  return v
}

/** Pide que la pantalla no se apague, y lo vuelve a pedir al volver: Android lo suelta. */
function usePantallaEncesa(activa: boolean) {
  useEffect(() => {
    if (!activa || !('wakeLock' in navigator)) return
    let bloqueig: WakeLockSentinel | null = null
    const demanar = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock.request('screen').then(b => { bloqueig = b }).catch(() => {})
    }
    demanar()
    document.addEventListener('visibilitychange', demanar)
    return () => {
      document.removeEventListener('visibilitychange', demanar)
      void bloqueig?.release().catch(() => {})
    }
  }, [activa])
}

export function VolProvider({ children }: { children: ComponentChildren }) {
  const [carregat, setCarregat] = useState(false)
  const [sessio, setSessio] = useState<Sessio | null>(null)
  const [ultimGps, setUltimGps] = useState<PuntoGps | null>(null)
  const [errorGps, setErrorGps] = useState<string | null>(null)
  const [mostres, setMostres] = useState<PuntoGps[]>([])
  const [escoltant, setEscoltant] = useState(false)
  const actual = useRef<Sessio | null>(null)
  const brut = useRef(false)

  useEffect(() => {
    void llegirSessio().then(s => {
      actual.current = s
      setSessio(s)
      setCarregat(true)
    })
  }, [])

  const actiu = sessio !== null || escoltant
  useEffect(() => {
    if (!actiu) return
    return observarGps(p => {
      setUltimGps(p)
      setErrorGps(null)
      setMostres(m => [...m.filter(x => x.t >= p.t - CALIBRACION_S * 1000), p])
      const s = actual.current
      if (s === null) return
      const n = afegirPunt(s, p)
      if (n !== s) {
        actual.current = n
        brut.current = true
        setSessio(n)
      }
    }, setErrorGps)
  }, [actiu])

  const desar = useCallback(async () => {
    if (!brut.current || actual.current === null) return
    brut.current = false
    await desarSessio(actual.current)
  }, [])

  useEffect(() => {
    if (sessio === null) return
    const r = setInterval(() => { void desar() }, DESAR_MS)
    const amagar = () => { if (document.visibilityState === 'hidden') void desar() }
    document.addEventListener('visibilitychange', amagar)
    return () => { clearInterval(r); document.removeEventListener('visibilitychange', amagar) }
  }, [sessio !== null, desar])

  usePantallaEncesa(sessio !== null)

  const comencar = useCallback((despegue: Despegue, sostreM: number, correccioM: number | null) => {
    const s: Sessio = { ...novaSessio(despegue, sostreM, Date.now()), correccioM }
    actual.current = s
    setSessio(s)
    void desarSessio(s)
  }, [])

  const acabar = useCallback(async () => {
    const s = actual.current
    if (s !== null) await set('vol:darrer', s)
    await esborrarSessio()
    actual.current = null
    brut.current = false
    setSessio(null)
    setEscoltant(false)
  }, [])

  const valor = useMemo<EstatVol>(() => ({
    carregat, sessio, ultimGps, errorGps, mostres, escoltar: setEscoltant, comencar, acabar,
  }), [carregat, sessio, ultimGps, errorGps, mostres, comencar, acabar])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

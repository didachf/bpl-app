// src/ui/vol/useNavegacio.ts
// El motor en vuelo (spec 10/10 §6.8 y §6.9): en el worker, cada 15 s y al
// cambiar de waypoint o de objetivo, con el plan vigente que no salta. La
// prevision se refresca en la posicion del globo como mucho cada 30 min, y el
// relieve es el de la zona del despegue, de la cache.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { parsePrevision, type Previsiones } from '../../services/nav/perfil'
import type { Relieve } from '../../services/nav/tipos'
import { crearCalculadorNavegador, type Calculador } from '../../services/vuelo/calculador'
import { clauDe, entradaDeVol, RECALCULO_MS, triarPlan, type PlanVigent } from '../../services/vuelo/navegacio'
import { relieveDeZona } from '../../services/vuelo/preparar'
import { leerPrevision, obtenerPrevision, type PrevisionGuardada } from '../../services/vuelo/previsionGuardada'
import type { Sessio } from '../../services/vuelo/sessio'
import type { Waypoint } from '../../domain/types'

const REVISAR_PREVISIO_MS = 5 * 60_000

export interface Navegacio {
  vigent: PlanVigent | null
  ms: number | null
  error: string | null
  guardada: PrevisionGuardada | null
  previsio: Previsiones | null
  relieve: Relieve | null
}

export function useNavegacio(s: Sessio, actiu: Waypoint | null): Navegacio {
  const [guardada, setGuardada] = useState<PrevisionGuardada | null>(null)
  const [relieve, setRelieve] = useState<Relieve | null>(null)
  const [vigent, setVigent] = useState<PlanVigent | null>(null)
  const [ms, setMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const calc = useRef<Calculador | null>(null)
  const darrera = useRef(s)
  darrera.current = s

  useEffect(() => {
    calc.current = crearCalculadorNavegador()
    return () => { calc.current?.cerrar(); calc.current = null }
  }, [])

  useEffect(() => {
    void leerPrevision().then(setGuardada)
    relieveDeZona(s.despegue.lat, s.despegue.lon).then(setRelieve).catch(() => setRelieve(null))
    const revisar = () => {
      const p = darrera.current.traza[darrera.current.traza.length - 1] ?? darrera.current.despegue
      void obtenerPrevision(p.lat, p.lon, Date.now()).then(o => { if (o.guardada !== null) setGuardada(o.guardada) })
    }
    const r = setInterval(revisar, REVISAR_PREVISIO_MS)
    return () => clearInterval(r)
  }, [])

  const previsio = useMemo(() => (guardada === null ? null : parsePrevision(guardada.respuesta)), [guardada])
  const clau = clauDe(actiu)

  useEffect(() => {
    // Al cambiar de waypoint, el plan anterior se tira en el acto (§6.9).
    setVigent(null)
    if (previsio === null) return
    let viu = true
    const calcular = async () => {
      const c = calc.current
      const sessio = darrera.current
      if (c === null || sessio.traza.length === 0) return
      const ara = Date.now()
      try {
        const r = await c.calcular(entradaDeVol(sessio, previsio, relieve, actiu, ara))
        if (!viu || r === null) return
        setMs(r.ms)
        setError(null)
        setVigent(v => triarPlan(v, { clau, calculatA: ara, r: r.resultado }, ara))
      } catch (e) {
        if (viu) setError(e instanceof Error ? e.message : String(e))
      }
    }
    void calcular()
    const r = setInterval(() => { void calcular() }, RECALCULO_MS)
    return () => { viu = false; clearInterval(r) }
  }, [clau, previsio, relieve, darrera.current.traza.length > 0])

  return { vigent, ms, error, guardada, previsio, relieve }
}

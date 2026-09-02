// src/ui/state.tsx
// El dueño del documento.
//
// Un solo objeto en memoria, sin normalizar y sin indices, porque son menos de
// 100 vuelos. Cada cambio produce un documento NUEVO, nunca se muta el que
// tienen las pantallas: Preact compara por identidad para decidir si repinta.
import { createContext } from 'preact'
import type { ComponentChildren } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { loadDocument, makeDebouncedSaver, saveDocument } from '../db/store'
import { emptyDocument } from '../domain/empty'
import type { LogbookDoc } from '../domain/types'
import { ConflictError } from '../sync/github'
import type { GithubConfig } from '../sync/github'
import { clearConfig, loadConfig, loadSha, saveConfig, saveSha } from '../sync/config'
import { pushDocument, restoreDocument } from '../sync/logbook'

/**
 * En que punto del arranque estamos.
 *
 * `sin_documento` no es un error: es el primer uso, y tambien lo que queda tras
 * un desalojo de almacenamiento del navegador. La app ofrece empezar de cero o
 * restaurar de GitHub. Ver el spec §8.
 */
export type Arranque = 'cargando' | 'sin_documento' | 'listo'

/**
 * Estado de la copia en GitHub.
 *
 * `conflicto` no se resuelve solo nunca. El spec §7 lo dice y la cuarta
 * auditoria del dominio dejo claro por que: fusionar sin preguntar un cuaderno
 * de vuelo puede borrar horas voladas.
 */
export type SyncState =
  | { kind: 'sin_configurar' }
  | { kind: 'al_dia' }
  | { kind: 'pendiente' }
  | { kind: 'subiendo' }
  | { kind: 'conflicto' }
  | { kind: 'error'; mensaje: string }

export interface Store {
  doc: LogbookDoc | null
  arranque: Arranque
  /** Cambios locales aun sin guardar en IndexedDB. Cero significa a salvo. */
  sinGuardar: number
  /** Aplica un cambio. La funcion recibe el documento y devuelve uno nuevo. */
  update: (fn: (d: LogbookDoc) => LogbookDoc) => void
  /** Sustituye el documento entero: primer uso, restauracion, resolucion de conflicto. */
  replace: (doc: LogbookDoc) => void
  /** Fuerza el guardado pendiente. Se llama al ocultarse la app. */
  flush: () => Promise<void>
  sync: SyncState
  cfg: GithubConfig | null
  /** Guarda o borra el token y el repositorio. `null` desconecta. */
  setCfg: (cfg: GithubConfig | null) => void
  /** Empuja ahora, sin esperar al rebote. */
  pushNow: () => Promise<void>
  /** Trae el documento del repositorio y sustituye el local. */
  restaurar: () => Promise<void>
  /** Resuelve un conflicto quedandose con una de las dos versiones. */
  resolverConflicto: (cual: 'local' | 'remoto') => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(Ctx)
  if (s === null) throw new Error('useStore fuera de <StoreProvider>')
  return s
}

/**
 * El documento, ya cargado.
 *
 * Las pantallas se pintan solo cuando `arranque` es `listo`, asi que dentro de
 * ellas el documento nunca es null y no tiene sentido comprobarlo en cada una.
 */
export function useDoc(): LogbookDoc {
  const { doc } = useStore()
  if (doc === null) throw new Error('useDoc antes de que el documento este cargado')
  return doc
}

export function StoreProvider({ children }: { children: ComponentChildren }) {
  const [doc, setDoc] = useState<LogbookDoc | null>(null)
  const [arranque, setArranque] = useState<Arranque>('cargando')
  const [sinGuardar, setSinGuardar] = useState(0)

  // El guardador vive en una ref y no en un useMemo: useMemo puede
  // recalcularse cuando le apetezca, y perder el temporizador pendiente
  // significaria perder el ultimo cambio del usuario.
  const saverRef = useRef(
    makeDebouncedSaver(async (d: LogbookDoc) => {
      await saveDocument(d)
      setSinGuardar(0)
    }),
  )

  const [cfg, setCfgState] = useState<GithubConfig | null>(() => loadConfig())
  const [sync, setSync] = useState<SyncState>(
    () => (loadConfig() === null ? { kind: 'sin_configurar' } : { kind: 'al_dia' }),
  )

  // El documento y la configuracion vivos, para que el empujador rebotado no
  // se quede con los de hace cinco segundos.
  const docRef = useRef<LogbookDoc | null>(null)
  const cfgRef = useRef<GithubConfig | null>(cfg)
  cfgRef.current = cfg

  const empujar = useCallback(async (d: LogbookDoc) => {
    const c = cfgRef.current
    if (c === null) return
    setSync({ kind: 'subiendo' })
    try {
      const { sha } = await pushDocument(c, d, loadSha())
      saveSha(sha)
      setSync({ kind: 'al_dia' })
    } catch (e) {
      if (e instanceof ConflictError) { setSync({ kind: 'conflicto' }); return }
      setSync({ kind: 'error', mensaje: e instanceof Error ? e.message : String(e) })
    }
  }, [])

  // Cinco segundos, no ochocientos milisegundos: cada empuje es un commit, y
  // un commit por tecla convertiria el historial del repositorio en ruido.
  const pusherRef = useRef(makeDebouncedSaver(d => empujar(d), 5000))

  useEffect(() => {
    void (async () => {
      const cargado = await loadDocument()
      if (cargado === null) { setArranque('sin_documento'); return }
      docRef.current = cargado
      setDoc(cargado)
      setArranque('listo')
    })()
  }, [])

  // El navegador puede descargar la pagina al pasar a segundo plano sin previo
  // aviso, y un temporizador de 800 ms pendiente se pierde con ella.
  // `visibilitychange` es el unico aviso fiable en movil, y `pagehide` cubre el
  // cierre de la pestaña. `beforeunload` no vale: en movil no siempre dispara.
  useEffect(() => {
    const alSalir = () => {
      void saverRef.current.flush()
      void pusherRef.current.flush()
    }
    addEventListener('pagehide', alSalir)
    document.addEventListener('visibilitychange', alSalir)
    return () => {
      removeEventListener('pagehide', alSalir)
      document.removeEventListener('visibilitychange', alSalir)
    }
  }, [])

  const update = useCallback((fn: (d: LogbookDoc) => LogbookDoc) => {
    setDoc(anterior => {
      if (anterior === null) return anterior
      const nuevo = fn(anterior)
      docRef.current = nuevo
      saverRef.current(nuevo)
      if (cfgRef.current !== null) {
        setSync({ kind: 'pendiente' })
        pusherRef.current(nuevo)
      }
      return nuevo
    })
    setSinGuardar(n => n + 1)
  }, [])

  const replace = useCallback((nuevo: LogbookDoc) => {
    setDoc(nuevo)
    docRef.current = nuevo
    setArranque('listo')
    saverRef.current(nuevo)
    if (cfgRef.current !== null) {
      setSync({ kind: 'pendiente' })
      pusherRef.current(nuevo)
    }
    setSinGuardar(n => n + 1)
  }, [])

  const flush = useCallback(() => saverRef.current.flush(), [])

  const setCfg = useCallback((nueva: GithubConfig | null) => {
    if (nueva === null) { clearConfig(); setCfgState(null); setSync({ kind: 'sin_configurar' }) }
    else { saveConfig(nueva); setCfgState(nueva); setSync({ kind: 'pendiente' }) }
  }, [])

  const pushNow = useCallback(async () => {
    const d = docRef.current
    if (d === null || cfgRef.current === null) return
    await pusherRef.current.flush()
    await empujar(d)
  }, [empujar])

  const restaurar = useCallback(async () => {
    const c = cfgRef.current
    if (c === null) return
    setSync({ kind: 'subiendo' })
    try {
      const r = await restoreDocument(c)
      if (r === null) {
        setSync({ kind: 'error', mensaje: 'El repositorio todavia no tiene logbook.json' })
        return
      }
      saveSha(r.sha)
      docRef.current = r.doc
      setDoc(r.doc)
      setArranque('listo')
      await saveDocument(r.doc)
      setSinGuardar(0)
      setSync({ kind: 'al_dia' })
    } catch (e) {
      setSync({ kind: 'error', mensaje: e instanceof Error ? e.message : String(e) })
    }
  }, [])

  /**
   * Un conflicto solo lo resuelve el usuario, y solo eligiendo una de las dos
   * versiones enteras. No hay fusion, ni la habra.
   *
   * Quedarse con la local exige releer el sha remoto antes de escribir: es la
   * unica forma de que GitHub acepte el PUT, y es deliberadamente un
   * sobrescribir, no un fusionar.
   */
  const resolverConflicto = useCallback(async (cual: 'local' | 'remoto') => {
    const c = cfgRef.current
    if (c === null) return
    if (cual === 'remoto') { await restaurar(); return }

    const d = docRef.current
    if (d === null) return
    setSync({ kind: 'subiendo' })
    try {
      const r = await restoreDocument(c)
      const { sha } = await pushDocument(c, d, r === null ? null : r.sha)
      saveSha(sha)
      setSync({ kind: 'al_dia' })
    } catch (e) {
      setSync({ kind: 'error', mensaje: e instanceof Error ? e.message : String(e) })
    }
  }, [restaurar])

  const store = useMemo<Store>(
    () => ({
      doc, arranque, sinGuardar, update, replace, flush,
      sync, cfg, setCfg, pushNow, restaurar, resolverConflicto,
    }),
    [doc, arranque, sinGuardar, update, replace, flush,
      sync, cfg, setCfg, pushNow, restaurar, resolverConflicto],
  )

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

/** Documento de primer uso, con los tres campos sembrados. */
export function documentoNuevo(): LogbookDoc {
  return emptyDocument()
}

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

/**
 * En que punto del arranque estamos.
 *
 * `sin_documento` no es un error: es el primer uso, y tambien lo que queda tras
 * un borrado de almacenamiento de WebKit. La app ofrece empezar de cero o
 * restaurar de GitHub. Ver el spec §8.
 */
export type Arranque = 'cargando' | 'sin_documento' | 'listo'

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

  useEffect(() => {
    void (async () => {
      const cargado = await loadDocument()
      if (cargado === null) { setArranque('sin_documento'); return }
      setDoc(cargado)
      setArranque('listo')
    })()
  }, [])

  // Safari mata la app al pasar a segundo plano sin previo aviso, y un
  // temporizador de 800 ms pendiente se pierde con ella. `pagehide` y
  // `visibilitychange` son los dos unicos avisos fiables en iOS.
  useEffect(() => {
    const alSalir = () => { void saverRef.current.flush() }
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
      saverRef.current(nuevo)
      return nuevo
    })
    setSinGuardar(n => n + 1)
  }, [])

  const replace = useCallback((nuevo: LogbookDoc) => {
    setDoc(nuevo)
    setArranque('listo')
    saverRef.current(nuevo)
    setSinGuardar(n => n + 1)
  }, [])

  const flush = useCallback(() => saverRef.current.flush(), [])

  const store = useMemo<Store>(
    () => ({ doc, arranque, sinGuardar, update, replace, flush }),
    [doc, arranque, sinGuardar, update, replace, flush],
  )

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

/** Documento de primer uso, con los tres campos sembrados. */
export function documentoNuevo(): LogbookDoc {
  return emptyDocument()
}

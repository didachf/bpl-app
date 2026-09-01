// src/db/store.ts
import { del, get, set } from 'idb-keyval'
import { migrate, validate } from '../domain/schema'
import type { LogbookDoc } from '../domain/types'

const KEY = 'logbook'

/**
 * Carga el documento del almacenamiento local.
 *
 * Devuelve null en tres casos que la interfaz trata igual, ofreciendo restaurar
 * desde GitHub: no hay nada guardado, lo guardado no valida, o la migracion
 * falla. Nunca lanza.
 */
export async function loadDocument(): Promise<LogbookDoc | null> {
  const crudo = await get(KEY)
  if (crudo === undefined) return null

  const r = validate(crudo)
  if (!r.ok) {
    console.warn('Documento local invalido:', r.errors)
    return null
  }
  try {
    return migrate(r.doc)
  } catch (e) {
    console.warn('No se ha podido migrar el documento local:', e)
    return null
  }
}

export async function saveDocument(doc: LogbookDoc): Promise<void> {
  await set(KEY, doc)
}

export async function clearDocument(): Promise<void> {
  await del(KEY)
}

export interface DebouncedSaver {
  (doc: LogbookDoc): void
  flush(): Promise<void>
}

/**
 * Agrupa guardados seguidos en uno solo.
 *
 * Escribir el documento entero en cada pulsacion de tecla es innecesario, y en
 * la ruta de sincronizacion generaria un commit por letra. Se guarda el ultimo
 * estado tras `delayMs` de calma.
 */
export function makeDebouncedSaver(
  guardar: (doc: LogbookDoc) => Promise<void>,
  delayMs = 800,
): DebouncedSaver {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendiente: LogbookDoc | null = null

  const saver = ((doc: LogbookDoc) => {
    pendiente = doc
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void saver.flush() }, delayMs)
  }) as DebouncedSaver

  saver.flush = async () => {
    if (timer) { clearTimeout(timer); timer = null }
    if (pendiente === null) return
    const doc = pendiente
    pendiente = null
    await guardar(doc)
  }

  return saver
}

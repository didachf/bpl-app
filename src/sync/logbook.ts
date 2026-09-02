// src/sync/logbook.ts
// El documento contra el repositorio privado.
//
// Se sube el documento entero y no diferencias. Con menos de 100 vuelos pesa
// unos 150 kB, y a cambio el repositorio siempre contiene algo que se abre con
// un editor de texto y se restaura sin la app. Ver el spec §7.
import { migrate, validate } from '../domain/schema'
import type { LogbookDoc } from '../domain/types'
import { fetchFile, putFile, type GithubConfig } from './github'

export const LOGBOOK_PATH = 'logbook.json'

/**
 * JSON con sangria y salto final.
 *
 * Sangrado a proposito aunque ocupe mas: el repositorio existe para poder leer
 * y reparar el cuaderno a mano el dia que la app no arranque, y una sola linea
 * de 150 kB no se lee. El salto final es para que git no marque "\ No newline
 * at end of file" en cada commit.
 */
export function serialize(doc: LogbookDoc): string {
  return `${JSON.stringify(doc, null, 2)}\n`
}

/**
 * Sube el documento. `sha` es el de la version que teniamos, o null si el
 * fichero no existe todavia.
 *
 * Lanza ConflictError si el remoto ha cambiado. **No fusiona.** Quien llama
 * tiene que preguntar al usuario: una fusion automatica y silenciosa de un
 * cuaderno de vuelo es peor que un aviso.
 */
export async function pushDocument(
  cfg: GithubConfig, doc: LogbookDoc, sha: string | null,
): Promise<{ sha: string }> {
  const mensaje = `logbook: ${doc.flights.length} vuelos`
  return putFile(cfg, LOGBOOK_PATH, serialize(doc), sha, mensaje)
}

/**
 * Baja el documento del repositorio, validado y migrado.
 *
 * Devuelve null si el fichero no existe, que es el primer uso con el
 * repositorio recien creado. Lanza si existe pero no se puede usar, porque
 * cargar a medias un cuaderno seria peor que no cargarlo.
 */
export async function restoreDocument(
  cfg: GithubConfig,
): Promise<{ doc: LogbookDoc; sha: string } | null> {
  const remoto = await fetchFile(cfg, LOGBOOK_PATH)
  if (remoto === null) return null

  let crudo: unknown
  try {
    crudo = JSON.parse(remoto.content)
  } catch {
    throw new Error(`El ${LOGBOOK_PATH} del repositorio no es JSON valido`)
  }

  const r = validate(crudo)
  if (!r.ok) {
    throw new Error(`El ${LOGBOOK_PATH} del repositorio no valida: ${r.errors.join('; ')}`)
  }
  return { doc: migrate(r.doc), sha: remoto.sha }
}

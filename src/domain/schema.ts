// src/domain/schema.ts
import type { LogbookDoc } from './types'

export const CURRENT_SCHEMA_VERSION = 2

/** Lleva un documento de la version N a la N+1. */
export type Migration = (doc: any) => any

/**
 * Migraciones registradas. La clave N transforma de la version N a la N+1.
 */
export const MIGRATIONS: Record<number, Migration> = {
  // 1 -> 2: el limite de viento del manual, por globo, y el minimo personal
  // del piloto. Los dos entran en null y NO con un valor por defecto: 15 kt es
  // la cifra del FM04 de Ultramagic, y suponerla para un globo que puede ser
  // de otro fabricante seria inventar una limitacion de aeronavegabilidad.
  1: (doc: any) => ({
    ...doc,
    schemaVersion: 2,
    pilot: { ...doc.pilot, personalWindLimitKt: null },
    balloons: (doc.balloons ?? []).map((b: any) => ({ ...b, maxSurfaceWindKt: null })),
  }),
}

export type ValidationResult =
  | { ok: true; doc: LogbookDoc }
  | { ok: false; errors: string[] }

const COLLECTIONS = ['balloons', 'sites', 'people', 'flights'] as const

/**
 * Validacion estructural del documento. No comprueba reglas de negocio, solo
 * que la forma sea la esperada, para poder distinguir "documento corrupto" de
 * "documento con datos raros" al arrancar.
 *
 * Acumula todos los errores en lugar de parar en el primero, porque el mensaje
 * util es la lista entera.
 */
export function validate(input: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, errors: ['El documento no es un objeto'] }
  }
  const d = input as Record<string, unknown>

  if (typeof d.schemaVersion !== 'number') errors.push('Falta schemaVersion o no es un numero')

  if (typeof d.pilot !== 'object' || d.pilot === null) {
    errors.push('Falta el bloque pilot')
  } else {
    const p = d.pilot as Record<string, unknown>
    if (typeof p.name !== 'string') errors.push('pilot.name no es texto')
    if (typeof p.address !== 'string') errors.push('pilot.address no es texto')
  }

  for (const c of COLLECTIONS) {
    if (!Array.isArray(d[c])) errors.push(`${c} no es un array`)
  }

  if (Array.isArray(d.flights)) {
    d.flights.forEach((f: any, i: number) => {
      if (typeof f?.id !== 'string') errors.push(`flights[${i}] no tiene id`)
      if (typeof f?.date !== 'string') errors.push(`flights[${i}] no tiene date`)
    })
  }

  return errors.length === 0
    ? { ok: true, doc: input as LogbookDoc }
    : { ok: false, errors }
}

/**
 * Lleva un documento hasta la version destino aplicando las migraciones en
 * cadena.
 *
 * `migrations` es un parametro con valor por defecto para poder probar la
 * maquinaria con un mapa sintetico sin inventarse versiones que nunca
 * existieron.
 */
export function migrate(
  doc: LogbookDoc,
  target: number = CURRENT_SCHEMA_VERSION,
  migrations: Record<number, Migration> = MIGRATIONS,
): LogbookDoc {
  if (doc.schemaVersion > target) {
    throw new Error(
      `El documento es de una version mas nueva (${doc.schemaVersion}) que la que entiende esta app (${target}). Actualiza la app.`,
    )
  }

  let actual: any = doc
  while (actual.schemaVersion < target) {
    const paso = migrations[actual.schemaVersion]
    if (!paso) {
      throw new Error(`Falta la migracion de la version ${actual.schemaVersion} a la siguiente`)
    }
    const anterior = actual.schemaVersion
    actual = paso(actual)
    if (actual.schemaVersion <= anterior) {
      throw new Error(`La migracion desde la version ${anterior} no ha subido la version`)
    }
  }
  return actual as LogbookDoc
}

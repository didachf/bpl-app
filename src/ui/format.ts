// src/ui/format.ts
// Formato para pantalla. Puro, sin estado y sin tocar el reloj.
// El dominio devuelve minutos y cadenas ISO a proposito; convertirlas a algo
// legible es cosa de esta capa y de ningun otro sitio.
import type {
  BalloonClass, BalloonGroup, Coords, PermitStatus, PersonRole, PilotFunction, SignatureStatus,
} from '../domain/types'

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * Minutos a "h:mm".
 *
 * Sin cero a la izquierda en las horas, como el cuaderno en papel. Un negativo
 * sale como 0:00: el dominio ya garantiza que nunca los produce, pero si algun
 * dia lo hiciera, un "-0:30" en el acumulado seria peor que un cero.
 */
export function formatHm(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  return `${h}:${String(m % 60).padStart(2, '0')}`
}

function partes(date: string): [string, number, string] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (m === null) return null
  const mes = Number(m[2])
  if (mes < 1 || mes > 12) return null
  return [m[3], mes - 1, m[1]]
}

/** "2026-08-31" a "31 ago 2026". El dia conserva el cero para que la columna cuadre. */
export function formatDateShort(date: string): string {
  const p = partes(date)
  if (p === null) return ''
  return `${p[0]} ${MESES_CORTOS[p[1]]} ${p[2]}`
}

/** "2026-08-31" a "31 agosto 2026". */
export function formatDateLong(date: string): string {
  const p = partes(date)
  if (p === null) return ''
  return `${p[0]} ${MESES_LARGOS[p[1]]} ${p[2]}`
}

/**
 * Marca ISO a la hora local del telefono, "07:32".
 *
 * Local y no UTC: el piloto anota la hora del reloj que lleva puesto. Una marca
 * vacia o ilegible se pinta "--:--", porque el cierre rapido crea vuelos sin
 * hora de despegue a proposito y un "NaN:NaN" en la lista da miedo sin motivo.
 */
export function formatTime(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '--:--'
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Tres decimales, que son unos 100 m. Suficiente para encontrar un campo. */
export function formatCoords(c: Coords): string {
  return `${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}`
}

const FUNCIONES: Record<PilotFunction, string> = {
  PIC: 'PIC',
  PIC_SOLO_SUPERVISED: 'Solo supervisado',
  DUAL: 'Doble mando',
  FI_B: 'Instructor',
  FE_B: 'Examinador',
}
export function labelFunction(f: PilotFunction): string { return FUNCIONES[f] }

const CLASES: Record<BalloonClass, string> = {
  hot_air: 'Aire caliente',
  gas: 'Gas',
  mixed: 'Mixto',
  hot_air_airship: 'Dirigible de aire caliente',
}
export function labelClass(c: BalloonClass): string { return CLASES[c] }

/** El tramo va en la etiqueta porque las fronteras no se recuerdan de memoria. */
const GRUPOS: Record<BalloonGroup, string> = {
  A: 'A, hasta 3.400 m³',
  B: 'B, 3.401 a 6.000 m³',
  C: 'C, 6.001 a 10.500 m³',
  D: 'D, mas de 10.500 m³',
}
export function labelGroup(g: BalloonGroup): string { return GRUPOS[g] }

const FIRMAS: Record<SignatureStatus, string> = {
  not_required: 'No hace falta',
  pending: 'Pendiente',
  signed: 'Firmado',
}
export function labelSignature(s: SignatureStatus): string { return FIRMAS[s] }

const PERMISOS: Record<PermitStatus, string> = {
  unknown: 'Sin averiguar',
  granted: 'Concedido',
  denied: 'Denegado',
  not_needed: 'No hace falta',
}
export function labelPermit(p: PermitStatus): string { return PERMISOS[p] }

const ROLES: Record<PersonRole, string> = {
  instructor: 'Instructor',
  examiner: 'Examinador',
  pilot: 'Piloto',
  crew: 'Equipo de tierra',
  passenger: 'Pasajero',
}
export function labelRole(r: PersonRole): string { return ROLES[r] }

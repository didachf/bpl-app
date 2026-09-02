// src/ui/currencyView.ts
// Del informe de vigencia a filas de pantalla.
//
// Existe porque las tres formas de estropear el trabajo del dominio son de
// presentacion, no de calculo, y aqui se pueden probar sin navegador:
//
//   1. Mirar `met` sin mirar antes `applicable`. A un alumno la vigencia no le
//      aplica y `met` se calcula igualmente.
//   2. Publicar `maxGroup` y `currentUntil` como si fueran un par. Mienten:
//      `maxGroup` es solo el tramo de hoy. Fue el hallazgo bloqueante de la
//      cuarta auditoria. Por eso esta vista NO tiene campo `maxGroup`.
//   3. Callarse `excluded`, `warnings` o `notModelled`. Existen para que
//      ninguna exclusion sea silenciosa.
import { formatHm } from './format'
import type { CurrencyExclusionReason, CurrencyReport } from '../domain/currency'
import type { BalloonGroup, IsoDate } from '../domain/types'

export interface CurrencyLine {
  key: string
  label: string
  /** "4:30 de 6:00" o "12 de 10", ya formateado segun la unidad. */
  valor: string
  met: boolean
  expiresOn: IsoDate | null
  partial: boolean
}

export interface GroupLine {
  maxGroup: BalloonGroup
  until: IsoDate
}

export type CurrencyView =
  | { kind: 'no_aplica'; motivo: string }
  | {
    kind: 'aplica'
    titular: 'Vigente' | 'Sin vigencia'
    met: boolean
    /** La sostiene una verificacion de competencia de BFCL.160(a)(2). */
    viaProficiencyCheck: boolean
    currentUntil: IsoDate | null
    items: CurrencyLine[]
    /** La escalera de BFCL.160(d). Vacia si no hay limite que enseñar. */
    grupos: GroupLine[]
    excluidos: string[]
    avisos: string[]
    noModelado: string[]
  }

const MOTIVOS: Record<CurrencyExclusionReason, string> = {
  flight_in_future: 'tienen fecha futura',
  balloon_unknown: 'llevan un globo que no esta en el catalogo',
}

function frase(n: number, motivo: string): string {
  return n === 1
    ? `1 vuelo queda fuera del recuento: ${motivo}`
    : `${n} vuelos quedan fuera del recuento: ${motivo}`
}

export function describeCurrency(r: CurrencyReport): CurrencyView {
  // Primero `applicable`. Nada mas se mira si es falso: los demas campos vienen
  // calculados igualmente y publicarlos invita a pintarlos.
  if (!r.applicable) {
    return {
      kind: 'no_aplica',
      motivo:
        'La vigencia de BFCL.160 empieza a contar el dia de emision de la licencia. '
        + 'Mientras no haya una fecha de emision en Mis datos, no hay nada que comprobar.',
    }
  }

  const porMotivo = new Map<CurrencyExclusionReason, number>()
  for (const e of r.excluded) porMotivo.set(e.reason, (porMotivo.get(e.reason) ?? 0) + 1)

  return {
    kind: 'aplica',
    titular: r.met ? 'Vigente' : 'Sin vigencia',
    met: r.met,
    viaProficiencyCheck: r.viaProficiencyCheck,
    currentUntil: r.currentUntil,
    items: r.items.map(i => ({
      key: i.key,
      label: i.label,
      valor: i.unit === 'minutes'
        ? `${formatHm(i.current)} de ${formatHm(i.required)}`
        : `${i.current} de ${i.required}`,
      met: i.met,
      expiresOn: i.expiresOn,
      partial: i.partial,
    })),
    // La escalera entera, tal cual. No se recorta al primer tramo: ese recorte
    // es exactamente el defecto que la cuarta auditoria encontro.
    grupos: r.groupSchedule.map(g => ({ maxGroup: g.maxGroup, until: g.until })),
    excluidos: [...porMotivo.entries()].map(([razon, n]) => frase(n, MOTIVOS[razon])),
    avisos: [...r.warnings],
    noModelado: [...r.notModelled],
  }
}

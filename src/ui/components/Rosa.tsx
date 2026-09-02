// src/ui/components/Rosa.tsx
// La flecha de rumbo y el abanico de los modelos, en SVG.
import type { Arc } from '../../services/circular'

/**
 * Flecha que apunta HACIA DONDE VA el viento.
 *
 * La direccion meteorologica dice de donde viene, asi que la flecha se gira
 * 180 grados respecto a ese numero. Es lo que le importa al piloto: hacia
 * donde le va a llevar.
 *
 * El abanico, si lo hay, se pinta detras como un sector: es el desacuerdo
 * entre los modelos, no un margen de error calibrado.
 */
export function Rosa(
  { dir, arco, size = 34, color = 'var(--accent)' }: {
    dir: number | null; arco?: Arc | null; size?: number; color?: string
  },
) {
  const c = size / 2
  const rad = c - 2

  /** Punto del borde para un rumbo METEOROLOGICO, ya girado a "hacia donde va". */
  const punto = (rumbo: number) => {
    const a = ((rumbo + 180) % 360) * (Math.PI / 180)
    return [c + rad * Math.sin(a), c - rad * Math.cos(a)] as const
  }

  let sector: string | null = null
  if (arco != null && arco.spanDeg > 0 && arco.spanDeg < 360) {
    const [x1, y1] = punto(arco.from)
    const [x2, y2] = punto(arco.to)
    // `large-arc` cuando el abanico pasa de media vuelta, si no el sector sale
    // al reves y enseña justo lo contrario de lo que hay.
    const large = arco.spanDeg > 180 ? 1 : 0
    sector = `M ${c} ${c} L ${x1} ${y1} A ${rad} ${rad} 0 ${large} 1 ${x2} ${y2} Z`
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style="flex-shrink: 0;">
      {sector !== null && <path d={sector} fill={color} opacity="0.18" />}
      {dir !== null && (
        <g transform={`rotate(${(dir + 180) % 360} ${c} ${c})`}>
          <path
            d={`M ${c} ${c - rad + 1} L ${c} ${c + rad - 1}`}
            stroke={color} stroke-width="2" stroke-linecap="round"
          />
          <path
            d={`M ${c - 4} ${c + rad - 6} L ${c} ${c + rad - 1} L ${c + 4} ${c + rad - 6}`}
            stroke={color} stroke-width="2" fill="none"
            stroke-linecap="round" stroke-linejoin="round"
          />
        </g>
      )}
    </svg>
  )
}

const RUMBOS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']

/** Rumbo en letras. Del norte, del sudoeste, y asi. */
export function rumboCorto(deg: number): string {
  return RUMBOS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]
}

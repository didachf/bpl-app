// src/services/uv.ts
// Componentes del viento y unidades. Puro.
//
// Convencion meteorologica: la direccion es de DONDE VIENE el viento. Un
// viento del norte, 0 grados, empuja hacia el sur, o sea v negativa. De ahi
// los signos menos, que son los mismos que ya usa trayectoria_globo.py.
//
// Se promedian componentes y no escalares. La Guia CIMO de la OMM lo exige, y
// el ejemplo canonico dice por que: un viento del sur de 5 m/s y uno del norte
// de 5 m/s promedian cero en vectorial, que es lo correcto, y cinco en
// escalar, que es una mentira.

export interface UV { u: number; v: number }

/**
 * Convierte -0 en 0.
 *
 * `-10 * Math.sin(0)` da -0. Con `===` es igual que 0, pero con `Object.is` no,
 * asi que rompe las pruebas, y ademas un "-0.0" en pantalla queda raro.
 */
function sinCeroNegativo(x: number): number {
  return x === 0 ? 0 : x
}

/** De velocidad y direccion de procedencia a componentes este y norte. */
export function toUV(speed: number, dirDeg: number): UV {
  const a = (dirDeg * Math.PI) / 180
  return {
    u: sinCeroNegativo(-speed * Math.sin(a)),
    v: sinCeroNegativo(-speed * Math.cos(a)),
  }
}

/** Inverso de toUV. La direccion vuelve en 0 a 360 y nunca negativa. */
export function toSpeedDir(u: number, v: number): { speed: number; dir: number } {
  const speed = Math.hypot(u, v)
  // Calma: la direccion no esta definida. Devolver 0 y no NaN, que se propaga.
  if (speed === 0) return { speed: 0, dir: 0 }
  const dir = (((Math.atan2(-u, -v) * 180) / Math.PI) + 360) % 360
  return { speed, dir }
}

/** Un nudo son 1852 m en 3600 s. */
const MS_POR_KT = 1852 / 3600

export function ktToMs(kt: number): number { return kt * MS_POR_KT }
export function msToKt(ms: number): number { return ms / MS_POR_KT }

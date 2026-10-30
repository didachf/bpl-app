// src/services/nav/parametros.ts
// Las constantes del motor de navegacion, con nombre y con su origen
// (spec 2026-10-30 §5 y §6). Ninguna esta ajustada todavia con vuelos nuestros:
// se reajustan cuando haya trazas grabadas.

/** Error tipico a priori de la prevision, m/s por componente: 2,5 m/s vectorial entre raiz de 2. */
export const S_MS = 1.8
/** Longitud de correlacion del error en altitud. Loon: 326 Pa, unos 200 m a 10 kPa. */
export const LZ_M = 200
/** Longitud de correlacion del error en el tiempo. Corta a proposito por la capa limite de la manana. */
export const LT_S = 2 * 3600
export const MAX_MEDIDAS = 300
export const EDAD_MAX_S = 6 * 3600

/** Constante de tiempo del globo frente a un cambio de viento: 300 s al 90 % (KNMI) entre ln 10. */
export const TAU_S = 130
/** Ventana de la regresion de la velocidad GPS. */
export const VENTANA_S = 60
export const MIN_MUESTRAS = 20
/** Como mucho una medida por franja en cada tramo de este tiempo, la mas reciente. */
export const SEPARACION_S = 120
/** Ruido de la velocidad GNSS de un telefono con pasos de 1 s, por componente (KNMI: 0,8 y 0,6). */
export const SIGMA_GPS_1S = 0.7

/** Por debajo de esto se llega, y es el margen de empate entre planes. Criterio nuestro. */
export const LLEGA_M = 50
export const PASO_INTEGRACION_S = 10
export const MIN_MANTENER = 2
export const MAX_ALTITUDES = 3
export const DIRECCIONES = 32
/** Con mas franjas que esto, el plan solo prueba franjas candidatas. */
export const MAX_FRANJAS_TODAS = 16
export const MAX_CANDIDATAS = 12
/** Cuantos planes de la busqueda gruesa pasan al refinado. */
export const TOP_PLANES = 40
/** Umbral de sustitucion del plan vigente (spec 10/10 §6.8). */
export const MEJORA_RELATIVA = 0.8
export const MEJORA_ABSOLUTA_M = 200

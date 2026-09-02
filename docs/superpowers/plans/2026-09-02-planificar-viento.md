# Planificar, la pantalla de viento (plan A3 de la fase 1)

> **Para agentes:** SKILL OBLIGATORIA. Usa `superpowers:subagent-driven-development` o
> `superpowers:executing-plans` para ejecutar este plan tarea a tarea. Los pasos llevan
> casilla `- [ ]`.

**Objetivo:** que Dídac toque un punto del mapa la noche antes y sepa, con las fuentes a la
vista, si mañana se vuela desde ahí y hacia dónde iría.

**Arquitectura:** una llamada a open-meteo por punto, con los seis modelos agrupados y todos
los niveles de golpe. Todo el cálculo (componentes u y v, estadística circular, abanico de
rumbos) sale a módulos puros con pruebas. La pantalla solo pinta.

**Herramientas:** las que ya hay, más Leaflet para el mapa. Sin librería de gráficos.

---

## Lo que manda sobre este plan

El spec `docs/superpowers/specs/2026-09-01-bpl-app-design.md` §6, **reescrito el 2026-09-02**
tras investigar con fuentes primarias. Tres cosas que la maqueta `design/Planificar.dc.html`
enseña y que **no se implementan**:

| La maqueta enseña | Por qué no se hace |
|---|---|
| «6 de 6», «2 de 6» modelos coinciden | Contar modelos no es una probabilidad. Va abanico de rumbos y desacuerdo |
| Solo 925 y 900 hPa | No es la banda de gobierno. Se añaden 10, 80, 120 y 180 m AGL y 950 hPa |
| Nada sobre límites de viento | El límite del manual es lo que decide si se vuela, y va en pantalla |

## Las cinco reglas de esta pantalla

1. **Nunca la palabra «probabilidad»**, ni un porcentaje, ni una cuenta de modelos.
2. **Ningún límite de viento se presenta como reglamentario.** Part-BFCL no tiene ninguno.
3. **El límite del manual no se cablea.** Es un campo del globo, porque cambia por envolvente.
4. **Una ausencia se enseña, no se tapa.** `ecmwf_ifs025` no tiene 900 hPa y devuelve nulos
   sin error: eso sale en pantalla como «este modelo no cubre este nivel».
5. **El aviso del globo piloto no se quita nunca.**

---

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/services/levels.ts` | Los siete niveles, su nombre y para qué sirve cada uno |
| `src/services/uv.ts` + prueba | Componentes u y v, y vuelta. Convención meteorológica |
| `src/services/circular.ts` + prueba | Estadística circular. **El fichero de más riesgo** |
| `src/services/openmeteo.ts` + prueba | La llamada, y el parseo de las claves con sufijo de modelo |
| `src/services/windCache.ts` | La última respuesta, con su antigüedad |
| `src/services/wind.ts` + prueba | De la respuesta a filas de pantalla: banda, abanico, desacuerdo |
| `src/ui/windLimits.ts` + prueba | Comparar el viento con el límite del manual y el mínimo personal |
| `src/ui/components/Rosa.tsx` | La flecha de rumbo y el abanico, en SVG |
| `src/ui/components/Mapa.tsx` | Leaflet, punto libre, los campos guardados como marcas |
| `src/ui/screens/Planificar.tsx` | La pantalla |
| `src/domain/types.ts` | **Se toca**: `maxSurfaceWindKt` en `Balloon`, `personalWindLimitKt` en `Pilot` |
| `src/domain/schema.ts` | **Se toca**: versión 2 y su migración |

`CRITICAL:` el dominio se toca en la Task 1 y **solo ahí**. Es el hueco real que el spec
autoriza: sin el límite del manual, la pantalla no puede decir nada útil. Va con prueba
primero y con migración, como manda `STATUS.md`.

---

## Task 1: El límite de viento entra en el documento

**Ficheros:**
- Modificar: `src/domain/types.ts`
- Modificar: `src/domain/schema.ts`
- Modificar: `src/domain/empty.ts`
- Modificar: `src/domain/fixtures.ts`
- Modificar: `src/domain/schema.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

Añade al final de `src/domain/schema.test.ts`:

```ts
describe('migracion a la version 2, limites de viento', () => {
  it('la version actual es la 2', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2)
  })

  it('un documento de la version 1 llega a la 2 sin perder nada', () => {
    const v1 = {
      schemaVersion: 1,
      pilot: {
        personId: 'me', name: 'Didac', address: 'Calle 1',
        licenceNumber: null, medicalExpiry: null, licenceIssued: null,
      },
      balloons: [{
        id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
        balloonClass: 'hot_air', envelopeVolumeM3: 2900,
      }],
      sites: [], people: [], flights: [],
    }
    const v2 = migrate(v1 as never)
    expect(v2.schemaVersion).toBe(2)
    expect(v2.balloons[0].registration).toBe('EC-KMU')
    expect(v2.pilot.name).toBe('Didac')
  })

  it('a un globo de la version 1 el limite le queda en null, no en un numero inventado', () => {
    const v1 = {
      schemaVersion: 1,
      pilot: {
        personId: 'me', name: '', address: '',
        licenceNumber: null, medicalExpiry: null, licenceIssued: null,
      },
      balloons: [{
        id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
        balloonClass: 'hot_air', envelopeVolumeM3: 2900,
      }],
      sites: [], people: [], flights: [],
    }
    // Poner 15 kt por defecto seria inventar una limitacion de aeronavegabilidad
    // que solo esta en el manual del globo concreto. Null significa "no lo se",
    // y la pantalla lo pide.
    expect(migrate(v1 as never).balloons[0].maxSurfaceWindKt).toBe(null)
  })

  it('al piloto de la version 1 el minimo personal le queda en null', () => {
    const v1 = {
      schemaVersion: 1,
      pilot: {
        personId: 'me', name: '', address: '',
        licenceNumber: null, medicalExpiry: null, licenceIssued: null,
      },
      balloons: [], sites: [], people: [], flights: [],
    }
    expect(migrate(v1 as never).pilot.personalWindLimitKt).toBe(null)
  })

  it('un documento que ya es version 2 no se toca', () => {
    const v2 = emptyDocument()
    expect(migrate(v2)).toEqual(v2)
  })
})
```

Añade a los imports de ese fichero lo que falte: `emptyDocument` de `./empty`.

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/domain/schema.test.ts
```

Esperado: FAIL, `expected 1 to be 2`.

- [ ] **Paso 3: los tipos**

En `src/domain/types.ts`, dentro de `interface Pilot`, antes de la llave de cierre:

```ts
  /**
   * Minimo personal de viento en superficie, en nudos.
   *
   * No es reglamentario ni de aeronavegabilidad: es la cifra por debajo de la
   * cual ESTE piloto decide volar. El FAA la contempla explicitamente, y
   * existe porque el limite del manual (15 kt en el FM04 de Ultramagic) esta
   * muy por encima de la practica habitual, que es menos de 7 kt.
   *
   * null mientras no se haya puesto. La pantalla lo pide, no lo inventa.
   */
  personalWindLimitKt: number | null
```

En `interface Balloon`, antes de la llave de cierre:

```ts
  /**
   * Viento maximo en superficie al despegue, en nudos, SEGUN EL MANUAL DE VUELO
   * DE ESTE GLOBO.
   *
   * `CRITICAL:` es una limitacion de aeronavegabilidad aprobada, y cambia por
   * envolvente: el FM04 de Ultramagic dice 15 kt en §2.2, y el Suplemento 34
   * dice 12 kt para la N-500 y 10 en cautivo. Por eso es un campo y no una
   * constante.
   *
   * Part-BFCL NO contiene ninguna cifra de viento, asi que esto nunca se
   * presenta como un requisito reglamentario.
   *
   * null significa que no se ha mirado el manual. La pantalla lo dice.
   */
  maxSurfaceWindKt: number | null
```

- [ ] **Paso 4: la versión y la migración**

En `src/domain/schema.ts`, cambia la constante y registra la migración:

```ts
export const CURRENT_SCHEMA_VERSION = 2
```

Y sustituye el `MIGRATIONS` vacío por:

```ts
/**
 * Migraciones registradas. La clave N transforma de la version N a la N+1.
 */
export const MIGRATIONS: Record<number, Migration> = {
  // 1 -> 2: el limite de viento del manual, por globo, y el minimo personal
  // del piloto. Los dos entran en null y NO con un valor por defecto: 15 kt
  // es la cifra del FM04 de Ultramagic y suponerla para un globo que puede ser
  // de otro fabricante seria inventar una limitacion de aeronavegabilidad.
  1: (doc: any) => ({
    ...doc,
    schemaVersion: 2,
    pilot: { ...doc.pilot, personalWindLimitKt: null },
    balloons: (doc.balloons ?? []).map((b: any) => ({ ...b, maxSurfaceWindKt: null })),
  }),
}
```

- [ ] **Paso 5: el documento vacío y las fixtures**

En `src/domain/empty.ts`, dentro del `pilot` de `emptyDocument`, añade
`personalWindLimitKt: null,` después de `licenceIssued: null,`.

En `src/domain/fixtures.ts`, dentro de `makePilot`, añade `personalWindLimitKt: null,`
después de `licenceIssued: null,`.

- [ ] **Paso 6: verlas pasar y que nada del dominio se haya roto**

```bash
npm test
```

Esperado: todo en verde. `CRITICAL:` si alguna de las pruebas de vigencia o de acumulado
cambia de resultado, **para**: significa que la migración ha tocado algo que no debía.

- [ ] **Paso 7: commit**

```bash
git add src/domain
git commit -m "feat(domain)!: esquema 2, limite de viento del manual y minimo personal"
```

---

## Task 2: Los niveles de viento

**Ficheros:**
- Crear: `src/services/levels.ts`

- [ ] **Paso 1: escribir el módulo**

```ts
// src/services/levels.ts
// Los niveles de viento que se piden a open-meteo, y para que sirve cada uno.
//
// La primera version del spec pedia solo 925 y 900 hPa, que son los del script
// de deriva. Sirven para saber a donde te lleva el viento, pero NO para
// dirigir el globo: la tecnica documentada por el FAA se hace con lecturas de
// globo piloto a 150, 300 y 450 ft AGL, o sea de 45 a 140 m. Sobre Igualada,
// con 329 m de elevacion, 925 hPa queda a unos 470 m AGL, muy por encima.
//
// Pedir los niveles bajos no cuesta nada: van en la misma llamada.

export type LevelKind = 'agl' | 'pressure'

export interface Level {
  /** Sufijo de la variable en la API: "10m", "925hPa". */
  key: string
  /** Como se llama en pantalla. */
  label: string
  kind: LevelKind
  /** Altura sobre el suelo en metros, solo para los niveles AGL. */
  aglM: number | null
  /** Para que sirve este nivel. Sale en pantalla, no es un comentario. */
  para: string
}

export const LEVELS: readonly Level[] = [
  {
    key: '10m', label: '10 m', kind: 'agl', aglM: 10,
    para: 'Viento en superficie. Es contra este contra el que se compara el limite del manual.',
  },
  {
    key: '80m', label: '80 m', kind: 'agl', aglM: 80,
    para: 'Banda de gobierno. Aqui empieza a poder elegirse rumbo.',
  },
  {
    key: '120m', label: '120 m', kind: 'agl', aglM: 120,
    para: 'Banda de gobierno, el tramo medio de la lectura de globo piloto.',
  },
  {
    key: '180m', label: '180 m', kind: 'agl', aglM: 180,
    para: 'Banda de gobierno, el tramo alto.',
  },
  {
    key: '950hPa', label: '950 hPa', kind: 'pressure', aglM: null,
    para: 'Rellena el hueco entre la superficie y 925 hPa.',
  },
  {
    key: '925hPa', label: '925 hPa', kind: 'pressure', aglM: null,
    para: 'Techo de un vuelo de instruccion normal.',
  },
  {
    key: '900hPa', label: '900 hPa', kind: 'pressure', aglM: null,
    para: 'El viento en altura de la V del gobierno.',
  },
]

/** Los que llevan altura de geopotencial, que se lee y no se supone. */
export const PRESSURE_LEVELS = LEVELS.filter(l => l.kind === 'pressure')

/**
 * Los seis modelos, los mismos que `trayectoria_globo.py`.
 *
 * `ecmwf_ifs025` NO tiene 900 hPa: sus niveles saltan de 925 a 850. La API no
 * da error, devuelve 200 con nulos y la unidad "undefined". Se comprueba y se
 * enseña la ausencia.
 */
export const MODELS: readonly string[] = [
  'icon_eu',
  'gfs_seamless',
  'gem_seamless',
  'ukmo_global_deterministic_10km',
  'meteofrance_arpege_europe',
  'ecmwf_ifs025',
]

/** Como se llama cada modelo en pantalla. */
export const MODEL_LABELS: Record<string, string> = {
  icon_eu: 'ICON-EU, DWD',
  gfs_seamless: 'GFS, NOAA',
  gem_seamless: 'GEM, Canada',
  ukmo_global_deterministic_10km: 'UKMO, Met Office',
  meteofrance_arpege_europe: 'ARPEGE, Meteo-France',
  ecmwf_ifs025: 'IFS, ECMWF',
}
```

- [ ] **Paso 2: comprobar y commit**

```bash
npx tsc -b
git add src/services/levels.ts
git commit -m "feat(services): los siete niveles de viento y los seis modelos"
```

---

## Task 3: Componentes u y v

**Ficheros:**
- Crear: `src/services/uv.ts`
- Crear: `src/services/uv.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

```ts
import { describe, it, expect } from 'vitest'
import { toUV, toSpeedDir, msToKt, ktToMs } from './uv'

/** Redondeo para comparar flotantes sin pelearse con el ultimo bit. */
/**
 * Redondeo a seis decimales, normalizando el -0.
 *
 * `Math.cos(PI/2)` no da 0 exacto sino 6,1e-17, y al redondear sale -0, que
 * `Object.is` no considera igual a 0. El valor de verdad es cero.
 */
const r = (n: number) => Math.round(n * 1e6) / 1e6 + 0

describe('toUV, convencion meteorologica', () => {
  it('viento del norte, 0 grados, sopla HACIA el sur', () => {
    const { u, v } = toUV(10, 0)
    expect(r(u)).toBe(0)
    expect(r(v)).toBe(-10)
  })

  it('viento del este, 90 grados, sopla hacia el oeste', () => {
    const { u, v } = toUV(10, 90)
    expect(r(u)).toBe(-10)
    expect(r(v)).toBe(0)
  })

  it('viento del sur, 180 grados, sopla hacia el norte', () => {
    const { u, v } = toUV(10, 180)
    expect(r(u)).toBe(0)
    expect(r(v)).toBe(10)
  })

  it('viento del oeste, 270 grados, sopla hacia el este', () => {
    const { u, v } = toUV(10, 270)
    expect(r(u)).toBe(10)
    expect(r(v)).toBe(0)
  })
})

describe('toSpeedDir', () => {
  it('deshace toUV en las cuatro direcciones cardinales', () => {
    for (const d of [0, 90, 180, 270]) {
      const { u, v } = toUV(7, d)
      const back = toSpeedDir(u, v)
      expect(r(back.speed)).toBe(7)
      expect(r(back.dir)).toBe(d)
    }
  })

  it('viento en calma da direccion 0 y no NaN', () => {
    expect(toSpeedDir(0, 0)).toEqual({ speed: 0, dir: 0 })
  })

  it('la direccion sale siempre en 0 a 360, nunca negativa', () => {
    const { u, v } = toUV(5, 315)
    expect(r(toSpeedDir(u, v).dir)).toBe(315)
  })
})

describe('nudos', () => {
  it('un nudo es 0,514444 m/s', () => {
    expect(r(ktToMs(1))).toBe(0.514444)
  })

  it('ida y vuelta', () => {
    expect(r(msToKt(ktToMs(15)))).toBe(15)
  })

  it('los 15 kt del manual son 7,7 m/s', () => {
    expect(Math.round(ktToMs(15) * 10) / 10).toBe(7.7)
  })
})
```

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/services/uv.test.ts
```

Esperado: FAIL, `Failed to resolve import "./uv"`.

- [ ] **Paso 3: escribir el módulo**

```ts
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
```

- [ ] **Paso 4: verlas pasar y commit**

```bash
npx vitest run src/services/uv.test.ts
git add src/services/uv.ts src/services/uv.test.ts
git commit -m "feat(services): componentes u y v del viento, y nudos"
```

Esperado: PASS, 10 pruebas.

---

## Task 4: Estadística circular

**El fichero de más riesgo del plan.** Es donde se decide qué se le dice al piloto sobre la
incertidumbre, y donde una media mal hecha da un rumbo que no existe.

**Ficheros:**
- Crear: `src/services/circular.ts`
- Crear: `src/services/circular.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

```ts
import { describe, it, expect } from 'vitest'
import {
  circularMean, meanResultantLength, circularVariance, angularStdDev,
  bearingArc, speedWeightedMean, describeSpread,
} from './circular'

const r = (n: number) => Math.round(n * 1e6) / 1e6
const r2 = (n: number) => Math.round(n * 100) / 100

describe('circularMean', () => {
  it('la media de rumbos iguales es ese rumbo', () => {
    expect(r(circularMean([90, 90, 90]))).toBe(90)
  })

  it('CRUZA el 360, que es donde una media aritmetica se rompe', () => {
    // La media aritmetica de 350 y 10 da 180, que apunta al lado contrario.
    expect(r2(circularMean([350, 10]))).toBe(0)
  })

  it('otro caso de cruce, 340 y 20 dan 0', () => {
    expect(r2(circularMean([340, 20]))).toBe(0)
  })

  it('la media sale siempre en 0 a 360', () => {
    const m = circularMean([300, 20, 340])
    expect(m).toBeGreaterThanOrEqual(0)
    expect(m).toBeLessThan(360)
  })

  it('sin datos devuelve null en lugar de NaN', () => {
    expect(circularMean([])).toBe(null)
  })
})

describe('meanResultantLength', () => {
  it('acuerdo total da 1', () => {
    expect(r(meanResultantLength([45, 45, 45]))).toBe(1)
  })

  it('dos rumbos opuestos se cancelan y dan 0', () => {
    expect(r(meanResultantLength([0, 180]))).toBe(0)
  })

  it('cuatro rumbos repartidos por igual dan 0', () => {
    expect(r(meanResultantLength([0, 90, 180, 270]))).toBe(0)
  })

  it('esta siempre entre 0 y 1', () => {
    const R = meanResultantLength([10, 30, 350, 120])
    expect(R).toBeGreaterThanOrEqual(0)
    expect(R).toBeLessThanOrEqual(1)
  })

  it('sin datos devuelve null', () => {
    expect(meanResultantLength([])).toBe(null)
  })
})

describe('circularVariance', () => {
  it('es 1 menos R, por definicion', () => {
    expect(r(circularVariance([45, 45, 45]))).toBe(0)
    expect(r(circularVariance([0, 180]))).toBe(1)
  })
})

describe('angularStdDev, estimador Y3 de Yamartino', () => {
  it('acuerdo total da desviacion cero', () => {
    expect(r2(angularStdDev([45, 45, 45]))).toBe(0)
  })

  it('crece cuando los rumbos se abren', () => {
    const poco = angularStdDev([88, 90, 92])
    const mucho = angularStdDev([60, 90, 120])
    expect(poco).toBeLessThan(mucho)
  })

  it('nunca devuelve NaN ni infinito, que es lo que le pasa al estimador de Mardia', () => {
    // Con R igual a cero, el estimador de Mardia sqrt(-2 ln R) diverge. El Y3 no.
    const s = angularStdDev([0, 90, 180, 270])
    expect(Number.isFinite(s)).toBe(true)
  })

  it('con menos de dos rumbos no hay dispersion que estimar', () => {
    expect(angularStdDev([90])).toBe(0)
  })
})

describe('bearingArc, el abanico', () => {
  it('un solo rumbo es un abanico de cero grados', () => {
    expect(bearingArc([90])).toEqual({ from: 90, to: 90, spanDeg: 0 })
  })

  it('el arco MENOR, no el mayor', () => {
    expect(bearingArc([80, 100])).toEqual({ from: 80, to: 100, spanDeg: 20 })
  })

  it('cruza el 360 sin abrirse a 340 grados', () => {
    expect(bearingArc([350, 10])).toEqual({ from: 350, to: 10, spanDeg: 20 })
  })

  it('tres rumbos, uno de ellos al otro lado del 360', () => {
    expect(bearingArc([10, 20, 350])).toEqual({ from: 350, to: 20, spanDeg: 30 })
  })

  it('rumbos muy repartidos dan un abanico ancho', () => {
    expect(bearingArc([0, 90, 180]).spanDeg).toBe(180)
  })

  it('sin datos devuelve null', () => {
    expect(bearingArc([])).toBe(null)
  })
})

describe('speedWeightedMean', () => {
  it('un modelo lento no pesa lo mismo que uno rapido', () => {
    // 2 kt del norte y 12 kt del este: la media tiene que irse hacia el este.
    const m = speedWeightedMean([{ speed: 2, dir: 0 }, { speed: 12, dir: 90 }])
    expect(m).not.toBe(null)
    expect(m!.dir).toBeGreaterThan(45)
    expect(m!.dir).toBeLessThan(90)
  })

  it('con velocidades iguales coincide con la media circular', () => {
    const m = speedWeightedMean([{ speed: 5, dir: 350 }, { speed: 5, dir: 10 }])
    expect(r2(m!.dir)).toBe(0)
  })

  it('la velocidad que devuelve es la del VECTOR medio, no la media de velocidades', () => {
    // Dos vientos opuestos de 5 kt: el vector medio es cero aunque las dos
    // velocidades sean 5. Es la advertencia de la Guia CIMO de la OMM.
    const m = speedWeightedMean([{ speed: 5, dir: 0 }, { speed: 5, dir: 180 }])
    expect(r2(m!.speed)).toBe(0)
  })

  it('sin datos devuelve null', () => {
    expect(speedWeightedMean([])).toBe(null)
  })
})

describe('describeSpread', () => {
  const muestras = (dirs: number[]) => dirs.map(d => ({ speed: 8, dir: d }))

  it('rumbos apretados: los modelos van juntos', () => {
    const d = describeSpread(muestras([88, 90, 92, 91]))
    expect(d!.nivel).toBe('juntos')
  })

  it('rumbos abiertos: los modelos no se ponen de acuerdo', () => {
    const d = describeSpread(muestras([10, 120, 250]))
    expect(d!.nivel).toBe('dispares')
  })

  it('devuelve el abanico y el numero de modelos que lo sostienen', () => {
    const d = describeSpread(muestras([350, 10]))
    expect(d!.arco).toEqual({ from: 350, to: 10, spanDeg: 20 })
    expect(d!.n).toBe(2)
  })

  it('NUNCA devuelve una probabilidad ni un porcentaje de acuerdo', () => {
    const d = describeSpread(muestras([88, 90, 92]))
    const claves = Object.keys(d!)
    for (const prohibida of ['probabilidad', 'probability', 'confianza', 'porcentaje']) {
      expect(claves).not.toContain(prohibida)
    }
  })

  it('con un solo modelo lo dice, en lugar de fingir acuerdo total', () => {
    const d = describeSpread(muestras([90]))
    expect(d!.nivel).toBe('un_solo_modelo')
  })

  it('sin modelos devuelve null', () => {
    expect(describeSpread([])).toBe(null)
  })
})
```

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/services/circular.test.ts
```

Esperado: FAIL, `Failed to resolve import "./circular"`.

- [ ] **Paso 3: escribir el módulo**

```ts
// src/services/circular.ts
// Estadistica circular del viento. Puro.
//
// Los rumbos son angulos, no numeros: la media aritmetica de 350 y 10 da 180,
// que apunta justo al lado contrario. Todo lo de aqui trabaja sobre vectores
// unitarios para que eso no pase.
//
// Fuente de las formulas: Farrugia y Micallef, "Comparative analysis of
// estimators for wind direction standard deviation", Meteorological
// Applications 13, 29-41 (2006), doi:10.1017/S1350482705001982, que a su vez
// recoge a Yamartino (1984) y a Mardia (1972). Las ecuaciones citadas abajo
// son las de ese articulo.
import { toSpeedDir, toUV } from './uv'

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

function componentes(dirs: number[]): { C: number; S: number } {
  let C = 0
  let S = 0
  for (const d of dirs) {
    C += Math.cos(d * RAD)
    S += Math.sin(d * RAD)
  }
  return { C: C / dirs.length, S: S / dirs.length }
}

/**
 * Direccion media, ecuacion 3.
 *
 * `atan2` y no `atan`, porque hace falta el cuadrante. Sale en 0 a 360.
 */
export function circularMean(dirs: number[]): number | null {
  if (dirs.length === 0) return null
  const { C, S } = componentes(dirs)
  return ((Math.atan2(S, C) * DEG) + 360) % 360
}

/**
 * Longitud resultante media R, ecuacion 4. Va de 0 a 1.
 *
 * Uno es acuerdo total. Cero es que los rumbos se reparten de tal forma que se
 * cancelan, y entonces no hay direccion media que valga.
 */
export function meanResultantLength(dirs: number[]): number | null {
  if (dirs.length === 0) return null
  const { C, S } = componentes(dirs)
  return Math.min(1, Math.hypot(C, S))
}

/** Varianza circular, 1 menos R por definicion. */
export function circularVariance(dirs: number[]): number | null {
  const R = meanResultantLength(dirs)
  return R === null ? null : 1 - R
}

/**
 * Desviacion angular, estimador Y3 de Yamartino, ecuacion 23.
 *
 * Y3 y no el de Mardia, `sqrt(-2 ln R)`, ecuacion 27: ese **diverge a infinito
 * cuando R tiende a cero**, que es justo el caso de modelos muy dispersos, o
 * sea el caso en el que mas importa no mentir. Tampoco el Y1, que el propio
 * articulo dice que se queda corto por encima de un tercio de pi.
 *
 * Devuelve grados.
 */
export function angularStdDev(dirs: number[]): number {
  const n = dirs.length
  if (n < 2) return 0
  const R = meanResultantLength(dirs) ?? 0
  const e = Math.sqrt(Math.max(0, 1 - R * R))
  const corr = 1 + (2 / Math.sqrt(3) - 1) * Math.pow(e, 3)
  return Math.sqrt(n / (n - 1)) * Math.asin(e) * corr * DEG
}

export interface Arc {
  /** Rumbo donde empieza el abanico, girando en el sentido de las agujas. */
  from: number
  to: number
  spanDeg: number
}

/**
 * El arco MENOR que contiene todos los rumbos.
 *
 * Se busca el hueco mas grande entre rumbos consecutivos: el abanico es todo
 * lo demas. Asi 350 y 10 dan 20 grados y no 340, que es lo que daria una lista
 * ordenada, que es lo que hace hoy `trayectoria_globo.py` y se rompe al cruzar
 * el norte.
 */
export function bearingArc(dirs: number[]): Arc | null {
  if (dirs.length === 0) return null
  const d = [...dirs].map(x => ((x % 360) + 360) % 360).sort((a, b) => a - b)
  if (d.length === 1) return { from: d[0], to: d[0], spanDeg: 0 }

  let huecoMax = -1
  let iMax = 0
  for (let i = 0; i < d.length; i++) {
    const hueco = i === d.length - 1 ? d[0] + 360 - d[i] : d[i + 1] - d[i]
    if (hueco > huecoMax) { huecoMax = hueco; iMax = i }
  }
  const from = d[(iMax + 1) % d.length]
  const to = d[iMax]
  return { from, to, spanDeg: Math.round((360 - huecoMax) * 100) / 100 }
}

export interface Muestra { speed: number; dir: number }

/**
 * Media ponderada por velocidad, ecuaciones 5 a 7.
 *
 * El rumbo de un modelo que da 2 kt no puede pesar lo mismo que el de uno que
 * da 12. Se promedian las componentes u y v, que es exactamente lo que dicen
 * esas ecuaciones y lo que la Guia CIMO de la OMM llama promediado vectorial.
 *
 * `speed` es la velocidad del VECTOR medio, no la media de las velocidades. Es
 * menor cuando los rumbos discrepan, y eso es informacion: dos vientos
 * opuestos de 5 kt dan cero.
 */
export function speedWeightedMean(muestras: Muestra[]): Muestra | null {
  if (muestras.length === 0) return null
  let u = 0
  let v = 0
  for (const m of muestras) {
    const c = toUV(m.speed, m.dir)
    u += c.u
    v += c.v
  }
  const r = toSpeedDir(u / muestras.length, v / muestras.length)
  return { speed: r.speed, dir: r.dir }
}

/**
 * Cuanto se separan los modelos.
 *
 * `nivel` es **convencion de este proyecto y no de la literatura**: no existe
 * publicado ningun umbral de R ni de apertura que defina "los modelos
 * coinciden". Los cortes estan en la apertura del abanico porque es lo unico
 * de aqui que un piloto puede interpretar directamente: 30 grados de abanico
 * es una franja estrecha en el mapa, 90 es un cuadrante entero.
 *
 * `CRITICAL:` esto NO es una probabilidad y no lleva porcentajes. Seis modelos
 * operativos son un "poor man's ensemble" sin calibrar, y la fraccion de
 * modelos que coinciden no es la probabilidad de que acierten. Lo que mide
 * esto es DESACUERDO entre modelos, que es una cota INFERIOR de la
 * incertidumbre real, porque no ve el error que los seis comparten.
 */
export type NivelDesacuerdo = 'un_solo_modelo' | 'juntos' | 'dispersos' | 'dispares'

export interface Spread {
  n: number
  nivel: NivelDesacuerdo
  arco: Arc
  /** Varianza circular, 1 menos R. De 0 a 1. */
  desacuerdo: number
  /** Desviacion angular en grados, estimador Y3. */
  desviacionDeg: number
}

/** Convencion del proyecto, en grados de apertura del abanico. */
export const CORTE_JUNTOS = 30
export const CORTE_DISPERSOS = 90

export function describeSpread(muestras: Muestra[]): Spread | null {
  if (muestras.length === 0) return null
  const dirs = muestras.map(m => m.dir)
  const arco = bearingArc(dirs) as Arc

  let nivel: NivelDesacuerdo
  if (muestras.length === 1) nivel = 'un_solo_modelo'
  else if (arco.spanDeg <= CORTE_JUNTOS) nivel = 'juntos'
  else if (arco.spanDeg <= CORTE_DISPERSOS) nivel = 'dispersos'
  else nivel = 'dispares'

  return {
    n: muestras.length,
    nivel,
    arco,
    desacuerdo: circularVariance(dirs) ?? 0,
    desviacionDeg: angularStdDev(dirs),
  }
}
```

- [ ] **Paso 4: verlas pasar**

```bash
npx vitest run src/services/circular.test.ts
```

Esperado: PASS, 27 pruebas.

- [ ] **Paso 5: commit**

```bash
git add src/services/circular.ts src/services/circular.test.ts
git commit -m "feat(services): estadistica circular del viento, con Yamartino Y3"
```

---

## Task 5: El cliente de open-meteo

**Ficheros:**
- Crear: `src/services/openmeteo.ts`
- Crear: `src/services/openmeteo.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildBody, parseProfile, fetchWindProfile, keyOf } from './openmeteo'

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

/** Respuesta de mentira con dos modelos y dos niveles, y el hueco de ECMWF. */
function respuesta() {
  return {
    latitude: 41.58, longitude: 1.65,
    hourly_units: {
      time: 'iso8601',
      wind_speed_10m_icon_eu: 'm/s',
      wind_direction_10m_icon_eu: '°',
      wind_speed_900hPa_icon_eu: 'm/s',
      wind_direction_900hPa_icon_eu: '°',
      geopotential_height_900hPa_icon_eu: 'm',
      wind_speed_10m_ecmwf_ifs025: 'm/s',
      wind_direction_10m_ecmwf_ifs025: '°',
      // Asi es como la API dice "este modelo no tiene este nivel": no da error.
      wind_speed_900hPa_ecmwf_ifs025: 'undefined',
      wind_direction_900hPa_ecmwf_ifs025: 'undefined',
      geopotential_height_900hPa_ecmwf_ifs025: 'undefined',
    },
    hourly: {
      time: ['2026-09-03T05:00', '2026-09-03T06:00'],
      wind_speed_10m_icon_eu: [2.0, 3.0],
      wind_direction_10m_icon_eu: [220, 230],
      wind_speed_900hPa_icon_eu: [5.0, 6.0],
      wind_direction_900hPa_icon_eu: [240, 250],
      geopotential_height_900hPa_icon_eu: [1086, 1087],
      wind_speed_10m_ecmwf_ifs025: [2.5, null],
      wind_direction_10m_ecmwf_ifs025: [225, null],
      wind_speed_900hPa_ecmwf_ifs025: [null, null],
      wind_direction_900hPa_ecmwf_ifs025: [null, null],
      geopotential_height_900hPa_ecmwf_ifs025: [null, null],
    },
  }
}

describe('buildBody', () => {
  const q = { lat: 41.5842, lon: 1.6528, startHour: '2026-09-03T05:00', endHour: '2026-09-03T09:00' }

  it('pide UN solo punto, porque cada coordenada consume cuota', () => {
    const b = buildBody(q)
    expect(b.latitude).toBe(41.5842)
    expect(Array.isArray(b.latitude)).toBe(false)
  })

  it('pide los seis modelos en UNA llamada, no seis llamadas', () => {
    expect(buildBody(q).models.split(',')).toHaveLength(6)
  })

  it('pide los siete niveles, no solo 925 y 900', () => {
    const h = buildBody(q).hourly
    for (const nivel of ['10m', '80m', '120m', '180m', '950hPa', '925hPa', '900hPa']) {
      expect(h).toContain(`wind_speed_${nivel}`)
      expect(h).toContain(`wind_direction_${nivel}`)
    }
  })

  it('pide la altura de geopotencial de los niveles de presion, en vez de suponerla', () => {
    const h = buildBody(q).hourly
    expect(h).toContain('geopotential_height_925hPa')
    expect(h).toContain('geopotential_height_900hPa')
    expect(h).not.toContain('geopotential_height_10m')
  })

  it('velocidad en m/s y hora en UTC, como el script de deriva', () => {
    const b = buildBody(q)
    expect(b.wind_speed_unit).toBe('ms')
    expect(b.timezone).toBe('UTC')
  })
})

describe('parseProfile', () => {
  it('las horas vuelven como ISO con Z, porque la API las manda sin zona', () => {
    // "2026-09-03T05:00" con timezone=UTC es UTC, pero Date.parse de una cadena
    // sin zona la interpreta como LOCAL. Sin la Z el vuelo se desplaza dos horas.
    const p = parseProfile(respuesta())
    expect(p.times[0]).toBe('2026-09-03T05:00Z')
  })

  it('saca velocidad y direccion por modelo y por nivel', () => {
    const p = parseProfile(respuesta())
    expect(p.wind[keyOf('icon_eu', '10m')][0]).toEqual({ speed: 2.0, dir: 220 })
    expect(p.wind[keyOf('icon_eu', '900hPa')][1]).toEqual({ speed: 6.0, dir: 250 })
  })

  it('un nivel que el modelo NO cubre queda marcado, no en silencio', () => {
    const p = parseProfile(respuesta())
    expect(p.noCubiertos.has(keyOf('ecmwf_ifs025', '900hPa'))).toBe(true)
    expect(p.noCubiertos.has(keyOf('icon_eu', '900hPa'))).toBe(false)
  })

  it('un hueco puntual de un modelo que SI cubre el nivel no se marca como no cubierto', () => {
    const p = parseProfile(respuesta())
    expect(p.noCubiertos.has(keyOf('ecmwf_ifs025', '10m'))).toBe(false)
    expect(p.wind[keyOf('ecmwf_ifs025', '10m')][1]).toBe(null)
  })

  it('lee la altura real del nivel de presion', () => {
    const p = parseProfile(respuesta())
    expect(p.height[keyOf('icon_eu', '900hPa')][0]).toBe(1086)
  })
})

describe('fetchWindProfile', () => {
  it('va por POST, porque la peticion es larga', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respuesta()), { status: 200 }))
    await fetchWindProfile({ lat: 41.58, lon: 1.65, startHour: 'a', endHour: 'b' })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.method).toBe('POST')
  })

  it('un 429 sale con un mensaje que explica que es la cuota', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ error: true, reason: 'Minutely API request limit exceeded.' }),
      { status: 429 },
    ))
    await expect(fetchWindProfile({ lat: 1, lon: 1, startHour: 'a', endHour: 'b' }))
      .rejects.toThrow(/cuota/i)
  })

  it('cualquier otro fallo lo dice con su codigo', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 500 }))
    await expect(fetchWindProfile({ lat: 1, lon: 1, startHour: 'a', endHour: 'b' }))
      .rejects.toThrow(/500/)
  })
})
```

- [ ] **Paso 2: verlas fallar, luego escribir el módulo**

```bash
npx vitest run src/services/openmeteo.test.ts
```

Crea `src/services/openmeteo.ts`:

```ts
// src/services/openmeteo.ts
// La llamada a open-meteo y el parseo de su respuesta.
//
// Restricciones medidas contra la API en vivo el 2026-09-02, no leidas de la
// documentacion:
//
//  - CORS abierto y sin clave: se llama desde el navegador.
//  - **Cada coordenada consume cuota por separado.** Por eso aqui se pide UN
//    punto. La rejilla de 49 del script de deriva es fase 2 y necesitara su
//    propio presupuesto.
//  - Los seis modelos en UNA llamada cuestan unas 98 unidades; en seis
//    llamadas sueltas, unas 270. Se agrupan.
//  - Con `models=`, las claves de la respuesta llevan sufijo del modelo.
//  - `ecmwf_ifs025` no tiene 900 hPa y **no da error**: devuelve 200, nulos y
//    la unidad "undefined".
import { LEVELS, MODELS, PRESSURE_LEVELS } from './levels'

const URL_API = 'https://api.open-meteo.com/v1/forecast'

export interface Sample { speed: number; dir: number }

export interface WindQuery {
  lat: number
  lon: number
  /** "YYYY-MM-DDTHH:MM" en UTC. */
  startHour: string
  endHour: string
}

/** Clave interna, modelo y nivel. */
export function keyOf(model: string, level: string): string {
  return `${model}|${level}`
}

export interface RawProfile {
  lat: number
  lon: number
  /** ISO CON Z. La API las manda sin zona y eso desplaza el vuelo. */
  times: string[]
  /** `${modelo}|${nivel}` a serie paralela a `times`. null es hueco puntual. */
  wind: Record<string, (Sample | null)[]>
  /** Altura del nivel de presion en m sobre el mar, por hora. */
  height: Record<string, (number | null)[]>
  /** Claves que ese modelo no cubre EN ABSOLUTO. Distinto de un hueco puntual. */
  noCubiertos: Set<string>
  fetchedAt: number
}

export function buildBody(q: WindQuery): Record<string, string | number> {
  const vars: string[] = []
  for (const l of LEVELS) vars.push(`wind_speed_${l.key}`, `wind_direction_${l.key}`)
  for (const l of PRESSURE_LEVELS) vars.push(`geopotential_height_${l.key}`)

  return {
    latitude: q.lat,
    longitude: q.lon,
    hourly: vars.join(','),
    models: MODELS.join(','),
    timezone: 'UTC',
    wind_speed_unit: 'ms',
    start_hour: q.startHour,
    end_hour: q.endHour,
  }
}

interface RespuestaCruda {
  latitude: number
  longitude: number
  hourly_units: Record<string, string>
  hourly: Record<string, (number | null)[] | string[]>
}

/**
 * La unidad "undefined" es como la API dice "este modelo no tiene este nivel".
 * Hay que mirarla ANTES que los valores: si solo se miran los nulos, un modelo
 * que no cubre el nivel se confunde con uno que ese dia no tiene dato, y la
 * pantalla diria "sin dato" en vez de "este modelo no llega ahi".
 */
function cubierto(units: Record<string, string>, clave: string): boolean {
  const u = units[clave]
  return u !== undefined && u !== 'undefined'
}

export function parseProfile(d: RespuestaCruda): RawProfile {
  const h = d.hourly
  // `timezone=UTC` devuelve "2026-09-03T05:00", SIN zona. `Date.parse` de eso
  // lo interpreta como hora local, que en Madrid en verano son dos horas de
  // desfase. Se le pone la Z aqui, una vez, y no en cada sitio que la use.
  const times = (h.time as string[]).map(t => (t.endsWith('Z') ? t : `${t}Z`))

  const wind: Record<string, (Sample | null)[]> = {}
  const height: Record<string, (number | null)[]> = {}
  const noCubiertos = new Set<string>()

  for (const m of MODELS) {
    for (const l of LEVELS) {
      const kS = `wind_speed_${l.key}_${m}`
      const kD = `wind_direction_${l.key}_${m}`
      const clave = keyOf(m, l.key)

      if (!cubierto(d.hourly_units, kS) || !cubierto(d.hourly_units, kD)) {
        noCubiertos.add(clave)
        wind[clave] = times.map(() => null)
        continue
      }
      const ss = (h[kS] ?? []) as (number | null)[]
      const dd = (h[kD] ?? []) as (number | null)[]
      wind[clave] = times.map((_, i) => {
        const s = ss[i]
        const dir = dd[i]
        if (s === null || s === undefined || dir === null || dir === undefined) return null
        return { speed: s, dir }
      })
    }

    for (const l of PRESSURE_LEVELS) {
      const kH = `geopotential_height_${l.key}_${m}`
      const clave = keyOf(m, l.key)
      if (!cubierto(d.hourly_units, kH)) { height[clave] = times.map(() => null); continue }
      const hh = (h[kH] ?? []) as (number | null)[]
      height[clave] = times.map((_, i) => hh[i] ?? null)
    }
  }

  return {
    lat: d.latitude, lon: d.longitude, times, wind, height, noCubiertos,
    fetchedAt: Date.now(),
  }
}

/**
 * POST y no GET: siete niveles por seis modelos son catorce variables mas tres
 * alturas, y con `models=` la URL se pasa de largo. La API acepta POST con el
 * cuerpo en formato de formulario.
 */
export async function fetchWindProfile(q: WindQuery): Promise<RawProfile> {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(buildBody(q))) body.set(k, String(v))

  const res = await fetch(URL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (res.status === 429) {
    throw new Error(
      'open-meteo ha rechazado la peticion por cuota. Espera un minuto. '
      + 'Cada punto del mapa consume cuota, asi que no toques muchos seguidos.',
    )
  }
  if (!res.ok) throw new Error(`open-meteo ha respondido ${res.status}`)

  return parseProfile(await res.json() as RespuestaCruda)
}
```

- [ ] **Paso 3: verlas pasar y commit**

```bash
npx vitest run src/services/openmeteo.test.ts
git add src/services/openmeteo.ts src/services/openmeteo.test.ts
git commit -m "feat(services): cliente de open-meteo, un punto y los seis modelos en una llamada"
```

Esperado: PASS, 13 pruebas.

---

## Task 6: De la respuesta a filas de pantalla

**Ficheros:**
- Crear: `src/services/wind.ts`
- Crear: `src/services/wind.test.ts`

- [ ] **Paso 1: las pruebas**

```ts
import { describe, it, expect } from 'vitest'
import { keyOf, type RawProfile } from './openmeteo'
import { buildRows, nivelPorClave } from './wind'

function perfil(over: Partial<RawProfile> = {}): RawProfile {
  const times = ['2026-09-03T05:00Z']
  const wind: Record<string, ({ speed: number; dir: number } | null)[]> = {}
  const height: Record<string, (number | null)[]> = {}
  return {
    lat: 41.58, lon: 1.65, times, wind, height,
    noCubiertos: new Set<string>(), fetchedAt: 0, ...over,
  }
}

describe('buildRows', () => {
  it('una fila por hora', () => {
    const p = perfil({ times: ['2026-09-03T05:00Z', '2026-09-03T06:00Z'] })
    expect(buildRows(p)).toHaveLength(2)
  })

  it('agrupa los modelos que dan dato en ese nivel', () => {
    const p = perfil()
    p.wind[keyOf('icon_eu', '10m')] = [{ speed: 3, dir: 220 }]
    p.wind[keyOf('gfs_seamless', '10m')] = [{ speed: 4, dir: 230 }]
    const celda = nivelPorClave(buildRows(p)[0], '10m')
    expect(celda.muestras).toHaveLength(2)
    expect(celda.banda).toEqual({ min: 3, max: 4 })
  })

  it('separa el modelo que NO cubre el nivel del que no tiene dato esa hora', () => {
    const p = perfil()
    p.noCubiertos.add(keyOf('ecmwf_ifs025', '900hPa'))
    p.wind[keyOf('ecmwf_ifs025', '900hPa')] = [null]
    p.wind[keyOf('icon_eu', '900hPa')] = [null]
    p.wind[keyOf('gfs_seamless', '900hPa')] = [{ speed: 5, dir: 200 }]
    const celda = nivelPorClave(buildRows(p)[0], '900hPa')
    expect(celda.noCubren).toEqual(['ecmwf_ifs025'])
    expect(celda.sinDato).toContain('icon_eu')
    expect(celda.sinDato).not.toContain('ecmwf_ifs025')
  })

  it('calcula el abanico y la media ponderada', () => {
    const p = perfil()
    p.wind[keyOf('icon_eu', '80m')] = [{ speed: 5, dir: 350 }]
    p.wind[keyOf('gfs_seamless', '80m')] = [{ speed: 5, dir: 10 }]
    const celda = nivelPorClave(buildRows(p)[0], '80m')
    expect(celda.spread!.arco.spanDeg).toBe(20)
    expect(Math.round(celda.media!.dir)).toBe(0)
  })

  it('sin ningun modelo, la celda queda vacia y no revienta', () => {
    const celda = nivelPorClave(buildRows(perfil())[0], '925hPa')
    expect(celda.muestras).toHaveLength(0)
    expect(celda.spread).toBe(null)
    expect(celda.banda).toBe(null)
  })

  it('la altura del nivel de presion sale de los modelos, no de la atmosfera estandar', () => {
    const p = perfil()
    p.wind[keyOf('icon_eu', '925hPa')] = [{ speed: 5, dir: 200 }]
    p.height[keyOf('icon_eu', '925hPa')] = [849]
    p.wind[keyOf('gfs_seamless', '925hPa')] = [{ speed: 5, dir: 200 }]
    p.height[keyOf('gfs_seamless', '925hPa')] = [851]
    const celda = nivelPorClave(buildRows(p)[0], '925hPa')
    expect(celda.alturaAmslM).toBe(850)
  })

  it('los niveles AGL no llevan altura sobre el mar, llevan la suya', () => {
    const celda = nivelPorClave(buildRows(perfil())[0], '10m')
    expect(celda.alturaAmslM).toBe(null)
    expect(celda.level.aglM).toBe(10)
  })

  it('las filas salen en el orden de LEVELS, de abajo arriba', () => {
    const claves = buildRows(perfil())[0].niveles.map(n => n.level.key)
    expect(claves).toEqual(['10m', '80m', '120m', '180m', '950hPa', '925hPa', '900hPa'])
  })
})
```

- [ ] **Paso 2: el módulo**

```ts
// src/services/wind.ts
// De la respuesta cruda a lo que se pinta. Puro.
import { describeSpread, speedWeightedMean, type Muestra, type Spread } from './circular'
import { LEVELS, MODELS, type Level } from './levels'
import { keyOf, type RawProfile, type Sample } from './openmeteo'

export interface CeldaNivel {
  level: Level
  /** Modelos con dato a esta hora en este nivel. */
  muestras: { model: string; sample: Sample }[]
  /**
   * Modelos que NO cubren este nivel en absoluto, como ECMWF en 900 hPa.
   * Se separa de `sinDato` a proposito: son cosas distintas y la pantalla las
   * dice distinto. Taparlas seria descartar en silencio.
   */
  noCubren: string[]
  /** Modelos que cubren el nivel pero no traen dato a esta hora. */
  sinDato: string[]
  spread: Spread | null
  /** Media ponderada por velocidad. `speed` es la del vector medio. */
  media: Muestra | null
  /** Banda de velocidad en m/s, de la mas floja a la mas fuerte. */
  banda: { min: number; max: number } | null
  /** Altura sobre el mar en m, mediana de los modelos. null en niveles AGL. */
  alturaAmslM: number | null
}

export interface FilaHora {
  timeIso: string
  niveles: CeldaNivel[]
}

function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

export function buildRows(p: RawProfile): FilaHora[] {
  return p.times.map((t, i) => ({
    timeIso: t,
    niveles: LEVELS.map(level => {
      const muestras: { model: string; sample: Sample }[] = []
      const noCubren: string[] = []
      const sinDato: string[] = []
      const alturas: number[] = []

      for (const model of MODELS) {
        const clave = keyOf(model, level.key)
        if (p.noCubiertos.has(clave)) { noCubren.push(model); continue }
        const s = p.wind[clave]?.[i] ?? null
        if (s === null) { sinDato.push(model); continue }
        muestras.push({ model, sample: s })
        const h = p.height[clave]?.[i]
        if (typeof h === 'number') alturas.push(h)
      }

      const m: Muestra[] = muestras.map(x => x.sample)
      const vel = m.map(x => x.speed)

      return {
        level,
        muestras,
        noCubren,
        sinDato,
        spread: describeSpread(m),
        media: speedWeightedMean(m),
        banda: vel.length === 0 ? null : { min: Math.min(...vel), max: Math.max(...vel) },
        alturaAmslM: level.kind === 'pressure' ? mediana(alturas) : null,
      }
    }),
  }))
}

/** Atajo para las pruebas y para la pantalla. */
export function nivelPorClave(fila: FilaHora, key: string): CeldaNivel {
  const n = fila.niveles.find(x => x.level.key === key)
  if (n === undefined) throw new Error(`Nivel desconocido: ${key}`)
  return n
}
```

- [ ] **Paso 3: verlas pasar y commit**

```bash
npx vitest run src/services/wind.test.ts
git add src/services/wind.ts src/services/wind.test.ts
git commit -m "feat(services): de la respuesta de open-meteo a filas de pantalla"
```

---

## Task 7: El juicio contra los límites

**Ficheros:**
- Crear: `src/ui/windLimits.ts`
- Crear: `src/ui/windLimits.test.ts`

- [ ] **Paso 1: las pruebas**

```ts
import { describe, it, expect } from 'vitest'
import { juzgarViento, LIMITE_FM04_KT, PRACTICA_FAA_KT } from './windLimits'
import { ktToMs } from '../services/uv'

describe('juzgarViento', () => {
  it('sin limite del manual y sin minimo personal, no juzga: lo pide', () => {
    const j = juzgarViento(ktToMs(5), null, null)
    expect(j.veredicto).toBe('sin_limite')
    expect(j.mensaje).toMatch(/manual/i)
  })

  it('por debajo de los dos limites, dentro', () => {
    expect(juzgarViento(ktToMs(5), 15, 8).veredicto).toBe('dentro')
  })

  it('por encima del minimo personal pero por debajo del manual', () => {
    const j = juzgarViento(ktToMs(10), 15, 8)
    expect(j.veredicto).toBe('sobre_personal')
    expect(j.mensaje).toMatch(/personal/i)
  })

  it('por encima del manual manda sobre todo lo demas', () => {
    const j = juzgarViento(ktToMs(17), 15, 8)
    expect(j.veredicto).toBe('sobre_manual')
    expect(j.mensaje).toMatch(/manual de vuelo/i)
  })

  it('justo en el limite del manual NO lo supera', () => {
    expect(juzgarViento(ktToMs(15), 15, null).veredicto).toBe('dentro')
  })

  it('con manual pero sin minimo personal, solo juzga contra el manual', () => {
    expect(juzgarViento(ktToMs(10), 15, null).veredicto).toBe('dentro')
  })

  it('con minimo personal pero sin manual, juzga contra el personal y lo dice', () => {
    const j = juzgarViento(ktToMs(10), null, 8)
    expect(j.veredicto).toBe('sobre_personal')
    expect(j.mensaje).toMatch(/no has puesto el limite del manual/i)
  })

  it('convierte a nudos, que es en lo que hablan los manuales', () => {
    expect(Math.round(juzgarViento(ktToMs(12), 15, null).vientoKt)).toBe(12)
  })

  it('NUNCA dice que se puede volar', () => {
    for (const kt of [1, 5, 8, 14]) {
      const j = juzgarViento(ktToMs(kt), 15, 10)
      expect(j.mensaje.toLowerCase()).not.toMatch(/puedes volar|se puede volar|apto para volar/)
    }
  })
})

describe('las cifras de referencia', () => {
  it('el limite del FM04 son 15 kt', () => {
    expect(LIMITE_FM04_KT).toBe(15)
  })

  it('la practica que cita el FAA son menos de 7 kt', () => {
    expect(PRACTICA_FAA_KT).toBe(7)
  })
})
```

- [ ] **Paso 2: el módulo**

```ts
// src/ui/windLimits.ts
// Comparar el viento en superficie con los limites. Puro.
//
// `CRITICAL:` Part-BFCL NO contiene ninguna cifra de viento, ni para pilotos
// con licencia ni para alumnos. BFCL.125 solo exige autorizacion y supervision
// de un FI(B) para el vuelo solo. Nada de aqui se presenta como reglamentario.
//
// El limite de verdad es una limitacion de aeronavegabilidad del Manual de
// Vuelo, y cambia por envolvente, por eso viene del globo y no de una
// constante.
import { msToKt } from '../services/uv'

/**
 * Ultramagic FM04 §2.2, rev. 18: "The surface wind speed at take-off must not
 * exceed 15 kt". Aprobado por EASA y de cumplimiento obligatorio.
 *
 * Solo se usa como VALOR POR DEFECTO al dar de alta un globo Ultramagic de la
 * serie normal. El Suplemento 34 baja a 12 kt para la envolvente N-500, asi
 * que este numero no vale para cualquier globo y nunca se aplica solo.
 */
export const LIMITE_FM04_KT = 15

/**
 * FAA Balloon Flying Handbook: "Most pilots prefer to launch and fly in winds
 * less than 7 knots". Es practica, no limitacion, y esta muy por debajo del
 * limite del manual. Por eso se enseñan los dos.
 */
export const PRACTICA_FAA_KT = 7

export type Veredicto = 'sin_limite' | 'dentro' | 'sobre_personal' | 'sobre_manual'

export interface JuicioViento {
  veredicto: Veredicto
  vientoKt: number
  manualKt: number | null
  personalKt: number | null
  mensaje: string
}

/**
 * Juzga el viento en superficie contra los dos limites.
 *
 * El orden importa: el del manual manda, porque es una limitacion aprobada. El
 * personal es del piloto y va por debajo.
 *
 * **Nunca dice que se puede volar.** Decir "dentro de limites" es una
 * afirmacion sobre dos numeros; decir "puedes volar" seria una decision, y esa
 * es del piloto con el globo delante.
 */
export function juzgarViento(
  vientoMs: number, manualKt: number | null, personalKt: number | null,
): JuicioViento {
  const vientoKt = msToKt(vientoMs)
  const base = { vientoKt, manualKt, personalKt }

  if (manualKt === null && personalKt === null) {
    return {
      ...base,
      veredicto: 'sin_limite',
      mensaje:
        'No hay con que comparar. Pon el viento maximo de despegue del manual de vuelo de '
        + 'tu globo en Ajustes, globos, y tu minimo personal en Ajustes, mis datos.',
    }
  }

  if (manualKt !== null && vientoKt > manualKt) {
    return {
      ...base,
      veredicto: 'sobre_manual',
      mensaje:
        `Por encima del limite del manual de vuelo, ${manualKt} kt. Es una limitacion `
        + 'aprobada, no una recomendacion.',
    }
  }

  if (personalKt !== null && vientoKt > personalKt) {
    return {
      ...base,
      veredicto: 'sobre_personal',
      mensaje: manualKt === null
        ? `Por encima de tu minimo personal, ${personalKt} kt. Ojo: no has puesto el limite `
          + 'del manual de este globo, asi que contra eso no se ha comparado.'
        : `Por encima de tu minimo personal, ${personalKt} kt, aunque por debajo del limite `
          + `del manual, ${manualKt} kt.`,
    }
  }

  return {
    ...base,
    veredicto: 'dentro',
    mensaje: manualKt === null
      ? `Por debajo de tu minimo personal. No has puesto el limite del manual de este globo.`
      : 'Por debajo de los limites con los que se ha comparado. La decision sigue siendo tuya, '
        + 'y con el globo piloto delante.',
  }
}
```

- [ ] **Paso 3: verlas pasar y commit**

```bash
npx vitest run src/ui/windLimits.test.ts
git add src/ui/windLimits.ts src/ui/windLimits.test.ts
git commit -m "feat(ui): juicio del viento contra el manual y el minimo personal"
```

---

## Tasks 8 a 11: la pantalla

Estas cuatro no llevan pruebas automatizadas, por la regla del spec §9: el esfuerzo va a los
módulos puros, que ya están cubiertos.

- [ ] **Task 8: caché de la última respuesta.** `src/services/windCache.ts` con `idb-keyval`,
  clave por punto redondeado a tres decimales y hora de inicio. Guarda `RawProfile` con
  `fetchedAt`. La pantalla enseña la antigüedad y la marca de vieja pasadas 6 h, que es la
  cadencia de actualización más lenta de los seis modelos. Spec §8.
- [ ] **Task 9: Ajustes.** En `Globos.tsx`, campo «Viento máximo de despegue» en kt con la
  cita del manual como pista y 15 kt de sugerencia para Ultramagic. En `MisDatos.tsx`, campo
  «Mi mínimo personal» con la cita del FAA.
- [ ] **Task 10: mapa.** `npm install --save-exact leaflet @types/leaflet`. Componente
  `Mapa.tsx` con teselas OSM, marcas de los campos guardados, y punto libre al tocar. Atajo
  para volver a un campo del catálogo. Solo online en fase 1.
- [ ] **Task 11: la pantalla.** `Planificar.tsx`: mapa arriba, punto y hora elegidos, tabla de
  niveles de abajo arriba con flecha, banda de velocidad y abanico, el juicio del viento en
  superficie, y al pie la atribución y el aviso del globo piloto.

## Verificación final

```bash
npx tsc -b && npm test && npm run build
```

Y a mano, con `npm run dev`:

1. Tocar un punto del mapa pide el viento y aparece la tabla.
2. La fila de 10 m enseña el juicio contra el límite del globo.
3. La fila de 900 hPa dice que ECMWF no cubre ese nivel, con su nombre.
4. Sin red, sale la última respuesta cacheada con su antigüedad.
5. En ningún sitio aparece un porcentaje, la palabra «probabilidad», ni «N de 6 modelos».
6. El enlace de atribución a open-meteo está visible junto al viento.
7. El aviso del globo piloto está al pie.

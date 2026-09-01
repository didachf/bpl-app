# Logbook BPL, núcleo (plan A1 de la fase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA instalable que registra vuelos en globo conforme a AMC1 BFCL.050 y calcula en vivo el progreso hacia el BPL (BFCL.130) y la vigencia (BFCL.160), con copia automática a un repositorio privado de GitHub.

**Architecture:** Documento JSON único como origen de la verdad, guardado con `idb-keyval` y empujado entero a GitHub. Toda la lógica de negocio vive en `src/domain/` como funciones puras sin dependencias de navegador, y es donde se concentran las pruebas. La interfaz es Preact y solo lee y escribe el documento a través de un contexto.

**Tech Stack:** Vite, Preact, TypeScript, `idb-keyval`, `preact-iso`, Vitest con `fake-indexeddb`, `vite-plugin-pwa`.

**Spec:** `docs/superpowers/specs/2026-09-01-bpl-app-design.md`

---

## Estructura de ficheros

Se crean en este orden. Cada uno con una única responsabilidad.

| Fichero | Responsabilidad |
|---|---|
| `src/domain/types.ts` | Los tipos del documento. No contiene lógica |
| `src/domain/empty.ts` | Documento vacío de arranque y sitios sembrados |
| `src/domain/balloon.ts` | Grupo de globo derivado del volumen |
| `src/domain/flight.ts` | Duración de un vuelo y predicados sobre un vuelo |
| `src/domain/progress.ts` | Contadores de BFCL.130 |
| `src/domain/currency.ts` | Contadores y caducidades de BFCL.160 |
| `src/domain/schema.ts` | Versión de esquema, validación y migraciones |
| `src/db/store.ts` | Cargar y guardar el documento en IndexedDB |
| `src/sync/github.ts` | Traer y empujar el documento contra la API de GitHub |
| `src/state/logbook.tsx` | Contexto de Preact, mutadores y estado de sincronización |
| `src/ui/routes/*.tsx` | Una pantalla por fichero |
| `src/ui/components/*.tsx` | Piezas reutilizables |

`src/domain/` no importa nada de Preact ni del navegador. Es una regla, no una preferencia: si un fichero de `domain/` necesita `window`, el diseño está mal.

---

## Task 0: Andamiaje del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/app.tsx`, `src/styles.css`

- [ ] **Step 1: Crear el proyecto con Vite**

```bash
cd ~/code/bpl-app
npm create vite@latest . -- --template preact-ts
```

Si avisa de que el directorio no está vacío, elegir la opción de ignorar y continuar, para no borrar `docs/` ni `.git`.

- [ ] **Step 2: Instalar dependencias**

```bash
cd ~/code/bpl-app
npm install idb-keyval preact-iso
npm install -D vitest fake-indexeddb @types/node vite-plugin-pwa
```

- [ ] **Step 3: Fijar versiones exactas**

Editar `package.json` y quitar los prefijos `^` de todas las versiones en `dependencies` y `devDependencies`. Razón: el `dist/` se comitea y la app desplegada no debe depender de que una resolución futura de npm dé el mismo resultado.

Después:

```bash
cd ~/code/bpl-app && rm -rf node_modules package-lock.json && npm install
```

- [ ] **Step 4: Configurar Vitest**

Reemplazar `vite.config.ts` por:

```ts
import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  base: '/bpl-app/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

`base` es la ruta que usa GitHub Pages para un repositorio que no es el sitio raíz.

- [ ] **Step 5: Añadir los scripts de npm**

En `package.json`, dentro de `scripts`:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 6: Comprobar que arranca**

Run: `cd ~/code/bpl-app && npm run build`
Expected: termina sin errores y crea `dist/`

Run: `cd ~/code/bpl-app && npm test`
Expected: `No test files found` y código de salida 0 o 1. Ambos valen en este punto.

- [ ] **Step 7: Commit**

```bash
cd ~/code/bpl-app
git add -A
git commit -m "chore: andamiaje con Vite, Preact, TypeScript y Vitest"
```

---

## Task 1: Los tipos del documento

**Files:**
- Create: `src/domain/types.ts`

No hay prueba en esta tarea porque no hay comportamiento, solo declaraciones. La comprobación es que `tsc` compile.

- [ ] **Step 1: Escribir los tipos**

```ts
// src/domain/types.ts
// Los tipos del documento del logbook. Sin lógica.
// Campos reglamentarios trazados a AMC1 BFCL.050(a)(2).

/** Marca de tiempo ISO 8601 con zona, por ejemplo "2026-08-31T05:12:00Z". */
export type Iso = string
/** Fecha local sin hora, "YYYY-MM-DD". */
export type IsoDate = string
export type Uuid = string

export type BalloonClass = 'hot_air' | 'gas'
export type BalloonGroup = 'A' | 'B' | 'C' | 'D'

export interface Pilot {
  name: string
  /** AMC1 BFCL.050(a)(1) exige la dirección del piloto. */
  address: string
  licenceNumber: string | null
  /** Caducidad del reconocimiento médico. */
  medicalExpiry: IsoDate | null
  /** null mientras se es alumno. Activa el panel de vigencia cuando deja de serlo. */
  licenceIssued: IsoDate | null
}

export interface Balloon {
  id: Uuid
  registration: string
  manufacturer: string
  model: string
  balloonClass: BalloonClass
  /** El grupo A a D se deriva de aquí, nunca se guarda. Ver domain/balloon.ts */
  envelopeVolumeM3: number
}

export type PermitStatus = 'unknown' | 'granted' | 'denied' | 'not_needed'

export interface Site {
  id: Uuid
  name: string
  lat: number
  lon: number
  elevationM: number | null
  permitStatus: PermitStatus
  accessNotes: string
}

export type PersonRole = 'instructor' | 'examiner' | 'pilot' | 'crew' | 'passenger'

export interface Person {
  id: Uuid
  name: string
  roles: PersonRole[]
  licenceNumber: string | null
}

/**
 * Función del piloto en el vuelo.
 * PIC_SOLO_SUPERVISED es el vuelo solo bajo supervisión de un FI(B), que
 * BFCL.130(b)(3) exige y que AMC1 BFCL.050(b)(1)(ii) permite anotar como PIC.
 */
export type PilotFunction = 'PIC' | 'PIC_SOLO_SUPERVISED' | 'DUAL' | 'FI_B' | 'FE_B'

export type SignatureStatus = 'not_required' | 'pending' | 'signed'

/**
 * Vuelo de verificacion. BFCL.160(a)(2) permite que una verificacion de
 * competencia en los ultimos 24 meses sustituya a todos los demas contadores
 * de vigencia, asi que hay que poder anotarla.
 */
export type CheckType = 'none' | 'skill_test' | 'proficiency_check'

export interface Coords {
  lat: number
  lon: number
}

/**
 * Punto de despegue o de aterrizaje.
 * En globo se aterriza donde se puede, por eso `coords` puede llevar un punto
 * suelto que no está en el catálogo de sitios.
 */
export interface EndPoint {
  siteId: Uuid | null
  coords: Coords | null
  timestamp: Iso
}

export interface Flight {
  id: Uuid
  /** Fecha local del vuelo. Se guarda aparte de los timestamps para agrupar sin líos de zona. */
  date: IsoDate
  picId: Uuid
  balloonId: Uuid
  departure: EndPoint
  arrival: EndPoint
  /** Si es null, la duración se calcula de los dos timestamps. Ver domain/flight.ts */
  durationOverrideMin: number | null
  pilotFunction: PilotFunction
  dayNight: 'day' | 'night'
  tether: 'free' | 'tethered'
  inflations: number
  takeoffs: number
  landings: number
  /** BFCL.160(e) exige firma del FI(B) en dobles mando y supervisados. */
  instructorId: Uuid | null
  signatureStatus: SignatureStatus
  checkType: CheckType
  crewIds: Uuid[]
  passengerIds: Uuid[]
  /** Meteo que hubo de verdad, para contrastar con la pronosticada. */
  observedWeather: string
  maxAltitudeM: number | null
  distanceKm: number | null
  notes: string
  /** Identificador del fichero tracks/<id>.json si existe. Fuera del documento. */
  trackRef: string | null
  /** false cuando se ha usado el cierre rápido y faltan campos. */
  complete: boolean
}

export interface LogbookDoc {
  schemaVersion: number
  pilot: Pilot
  balloons: Balloon[]
  sites: Site[]
  people: Person[]
  flights: Flight[]
}
```

- [ ] **Step 2: Comprobar que compila**

Run: `cd ~/code/bpl-app && npx tsc --noEmit`
Expected: sin errores

- [ ] **Step 3: Commit**

```bash
cd ~/code/bpl-app
git add src/domain/types.ts
git commit -m "feat(domain): tipos del documento del logbook"
```

---

## Task 2: Grupo de globo derivado del volumen

Las fronteras salen del Balloon Rulebook: grupo A hasta 3.400 m³, B de 3.401 a 6.000, C de 6.001 a 10.500, D por encima. Los valores frontera son exactamente donde se equivoca todo el mundo, así que se prueban uno a uno.

**Files:**
- Create: `src/domain/balloon.ts`
- Test: `src/domain/balloon.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// src/domain/balloon.test.ts
import { describe, it, expect } from 'vitest'
import { groupFromVolume } from './balloon'

describe('groupFromVolume', () => {
  it('devuelve A hasta 3400 m3 inclusive', () => {
    expect(groupFromVolume(1000)).toBe('A')
    expect(groupFromVolume(3400)).toBe('A')
  })

  it('devuelve B desde 3401 hasta 6000 inclusive', () => {
    expect(groupFromVolume(3401)).toBe('B')
    expect(groupFromVolume(6000)).toBe('B')
  })

  it('devuelve C desde 6001 hasta 10500 inclusive', () => {
    expect(groupFromVolume(6001)).toBe('C')
    expect(groupFromVolume(10500)).toBe('C')
  })

  it('devuelve D por encima de 10500', () => {
    expect(groupFromVolume(10501)).toBe('D')
    expect(groupFromVolume(25000)).toBe('D')
  })

  it('trata los valores no enteros por el mismo criterio', () => {
    expect(groupFromVolume(3400.5)).toBe('B')
  })

  it('rechaza volúmenes no positivos', () => {
    expect(() => groupFromVolume(0)).toThrow()
    expect(() => groupFromVolume(-5)).toThrow()
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd ~/code/bpl-app && npm test -- balloon`
Expected: FAIL, no encuentra el módulo `./balloon`

- [ ] **Step 3: Implementar**

```ts
// src/domain/balloon.ts
import type { BalloonGroup } from './types'

/**
 * Grupo de globo de aire caliente según el volumen de envolvente.
 * Fuente: EASA Easy Access Rules for Balloons, definición de grupos.
 *   A: hasta 3400 m3
 *   B: 3401 a 6000 m3
 *   C: 6001 a 10500 m3
 *   D: mas de 10500 m3
 * Los limites del reglamento son enteros, asi que cualquier valor por encima
 * de 3400 y por debajo de 3401 cae en el grupo superior.
 */
export function groupFromVolume(m3: number): BalloonGroup {
  if (!(m3 > 0)) throw new Error(`Volumen de envolvente invalido: ${m3}`)
  if (m3 <= 3400) return 'A'
  if (m3 <= 6000) return 'B'
  if (m3 <= 10500) return 'C'
  return 'D'
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd ~/code/bpl-app && npm test -- balloon`
Expected: PASS, 6 pruebas

- [ ] **Step 5: Commit**

```bash
cd ~/code/bpl-app
git add src/domain/balloon.ts src/domain/balloon.test.ts
git commit -m "feat(domain): grupo de globo derivado del volumen de envolvente"
```

---

## Task 3: Duración del vuelo

Dos trampas reales: un vuelo que cruza medianoche, y un vuelo durante el cambio de hora. Ambas se resuelven solas si se opera siempre sobre marcas de tiempo con zona en lugar de sobre horas locales, y las pruebas están para demostrar que así es.

**Files:**
- Create: `src/domain/flight.ts`
- Test: `src/domain/flight.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// src/domain/flight.test.ts
import { describe, it, expect } from 'vitest'
import { flightDurationMin } from './flight'
import type { Flight } from './types'

function flight(partial: Partial<Flight>): Flight {
  return {
    id: 'f1',
    date: '2026-08-31',
    picId: 'p1',
    balloonId: 'b1',
    departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T05:00:00Z' },
    arrival: { siteId: null, coords: { lat: 41.7, lon: 1.1 }, timestamp: '2026-08-31T06:30:00Z' },
    durationOverrideMin: null,
    pilotFunction: 'DUAL',
    dayNight: 'day',
    tether: 'free',
    inflations: 1,
    takeoffs: 1,
    landings: 1,
    instructorId: 'p2',
    signatureStatus: 'pending',
    checkType: 'none',
    crewIds: [],
    passengerIds: [],
    observedWeather: '',
    maxAltitudeM: null,
    distanceKm: null,
    notes: '',
    trackRef: null,
    complete: true,
    ...partial,
  }
}

describe('flightDurationMin', () => {
  it('calcula la duracion de las dos marcas de tiempo', () => {
    expect(flightDurationMin(flight({}))).toBe(90)
  })

  it('respeta la anulacion manual cuando la hay', () => {
    expect(flightDurationMin(flight({ durationOverrideMin: 75 }))).toBe(75)
  })

  it('acepta una anulacion de cero minutos sin confundirla con ausencia', () => {
    expect(flightDurationMin(flight({ durationOverrideMin: 0 }))).toBe(0)
  })

  it('funciona con un vuelo que cruza medianoche', () => {
    const f = flight({
      departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T22:30:00Z' },
      arrival: { siteId: 's1', coords: null, timestamp: '2026-09-01T00:15:00Z' },
    })
    expect(flightDurationMin(f)).toBe(105)
  })

  it('no se descuadra en el cambio de hora, porque opera en UTC', () => {
    // 25/10/2026 a las 03:00 CEST pasan a ser las 02:00 CET.
    // En hora local parecen 30 min, en tiempo real son 90.
    const f = flight({
      departure: { siteId: 's1', coords: null, timestamp: '2026-10-25T00:30:00Z' },
      arrival: { siteId: 's1', coords: null, timestamp: '2026-10-25T02:00:00Z' },
    })
    expect(flightDurationMin(f)).toBe(90)
  })

  it('devuelve 0 si la llegada es anterior a la salida, en lugar de un negativo', () => {
    const f = flight({
      arrival: { siteId: 's1', coords: null, timestamp: '2026-08-31T04:00:00Z' },
    })
    expect(flightDurationMin(f)).toBe(0)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd ~/code/bpl-app && npm test -- flight`
Expected: FAIL, no encuentra `./flight`

- [ ] **Step 3: Implementar**

```ts
// src/domain/flight.ts
import type { Flight } from './types'

/**
 * Duracion del vuelo en minutos.
 *
 * La anulacion manual gana cuando existe, porque la hora de despegue real y la
 * de puesta en marcha pueden diferir y a veces el piloto anota el dato del
 * cuaderno del ATO en lugar del reloj.
 *
 * Sin anulacion se restan las dos marcas de tiempo. Al ser ISO con zona, un
 * vuelo que cruza medianoche o un cambio de hora salen bien sin casos
 * especiales.
 *
 * Una llegada anterior a la salida devuelve 0 y no un negativo, para que un
 * dato mal metido no reste horas del acumulado. La interfaz avisa aparte.
 */
export function flightDurationMin(f: Flight): number {
  if (f.durationOverrideMin !== null) return f.durationOverrideMin
  const from = Date.parse(f.departure.timestamp)
  const to = Date.parse(f.arrival.timestamp)
  if (Number.isNaN(from) || Number.isNaN(to)) return 0
  return Math.max(0, Math.round((to - from) / 60000))
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd ~/code/bpl-app && npm test -- flight`
Expected: PASS, 6 pruebas

- [ ] **Step 5: Commit**

```bash
cd ~/code/bpl-app
git add src/domain/flight.ts src/domain/flight.test.ts
git commit -m "feat(domain): duracion del vuelo, con anulacion manual y cruce de medianoche"
```

---

## Task 4: Aritmética de fechas

Los contadores de vigencia trabajan con ventanas de 24 y 48 meses. Sumar meses tiene una trampa clásica, que es el día 31 en un mes que no lo tiene. Se resuelve aquí y una sola vez.

Se opera sobre cadenas `YYYY-MM-DD` y no sobre objetos `Date`, porque una fecha de vuelo es una fecha de calendario y no un instante. Comparar dos cadenas en ese formato con `<` ya las ordena bien, así que la ventana es una comparación de texto.

**Files:**
- Create: `src/domain/dates.ts`
- Test: `src/domain/dates.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// src/domain/dates.test.ts
import { describe, it, expect } from 'vitest'
import { addMonths, toIsoDate } from './dates'

describe('addMonths', () => {
  it('suma meses dentro del mismo año', () => {
    expect(addMonths('2026-03-15', 2)).toBe('2026-05-15')
  })

  it('cruza el fin de año', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
  })

  it('resta meses', () => {
    expect(addMonths('2026-09-01', -24)).toBe('2024-09-01')
  })

  it('recorta el dia cuando el mes destino es mas corto', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
  })

  it('respeta el 29 de febrero en año bisiesto', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
  })

  it('mantiene el dia cuando el mes destino es suficientemente largo', () => {
    expect(addMonths('2026-08-31', -24)).toBe('2024-08-31')
  })
})

describe('toIsoDate', () => {
  it('usa las partes locales de la fecha y no UTC', () => {
    // 1 de enero a las 00:30 en Madrid es 31 de diciembre en UTC.
    // La fecha del vuelo debe ser la local.
    const d = new Date(2026, 0, 1, 0, 30, 0)
    expect(toIsoDate(d)).toBe('2026-01-01')
  })

  it('rellena con ceros mes y dia', () => {
    expect(toIsoDate(new Date(2026, 8, 5))).toBe('2026-09-05')
  })
})

describe('orden lexicografico', () => {
  it('sirve para comparar fechas sin parsear', () => {
    expect('2026-09-01' >= '2024-09-01').toBe(true)
    expect('2024-08-31' >= '2024-09-01').toBe(false)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd ~/code/bpl-app && npm test -- dates`
Expected: FAIL, no encuentra `./dates`

- [ ] **Step 3: Implementar**

```ts
// src/domain/dates.ts
import type { IsoDate } from './types'

/**
 * Suma (o resta, con n negativo) meses de calendario a una fecha "YYYY-MM-DD".
 *
 * Si el mes destino no tiene ese dia, se recorta al ultimo dia del mes. Es el
 * mismo criterio que usa el reglamento al hablar de "en los ultimos 24 meses",
 * y evita que un vuelo del 31 de enero se convierta en uno del 3 de marzo.
 */
export function addMonths(date: IsoDate, n: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number)
  const targetMonthIndex = (m - 1) + n
  const targetYear = y + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const day = Math.min(d, lastDay)
  return format(targetYear, targetMonth + 1, day)
}

/** Fecha de calendario local de un instante. Local y no UTC, a proposito. */
export function toIsoDate(d: Date): IsoDate {
  return format(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function format(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd ~/code/bpl-app && npm test -- dates`
Expected: PASS, 9 pruebas

- [ ] **Step 5: Commit**

```bash
cd ~/code/bpl-app
git add src/domain/dates.ts src/domain/dates.test.ts
git commit -m "feat(domain): suma de meses con recorte de dia y fecha local"
```

---

## Task 5: Fixtures de prueba compartidas

Las tareas 6 y 7 necesitan construir documentos de logbook completos. Sin un constructor, cada prueba repite cuarenta líneas y deja de leerse.

**Files:**
- Create: `src/domain/fixtures.ts`

Este fichero es solo para pruebas, pero vive en `src/` para que TypeScript lo tipe con el resto.

- [ ] **Step 1: Escribir el constructor**

```ts
// src/domain/fixtures.ts
// Constructores para pruebas. No se importa desde la interfaz.
import type { Flight, LogbookDoc, Pilot, PilotFunction } from './types'

export function makePilot(over: Partial<Pilot> = {}): Pilot {
  return {
    name: 'Piloto de prueba',
    address: 'Calle Falsa 123',
    licenceNumber: null,
    medicalExpiry: null,
    licenceIssued: null,
    ...over,
  }
}

let counter = 0

/**
 * Vuelo de prueba. Por defecto: doble mando, 90 minutos, un inflado,
 * un despegue y un aterrizaje, completo.
 */
export function makeFlight(over: Partial<Flight> = {}): Flight {
  counter += 1
  return {
    id: `f${counter}`,
    date: '2026-08-31',
    picId: 'p1',
    balloonId: 'b1',
    departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T05:00:00Z' },
    arrival: { siteId: 's1', coords: null, timestamp: '2026-08-31T06:30:00Z' },
    durationOverrideMin: null,
    pilotFunction: 'DUAL',
    dayNight: 'day',
    tether: 'free',
    inflations: 1,
    takeoffs: 1,
    landings: 1,
    instructorId: 'p2',
    signatureStatus: 'pending',
    checkType: 'none',
    crewIds: [],
    passengerIds: [],
    observedWeather: '',
    maxAltitudeM: null,
    distanceKm: null,
    notes: '',
    trackRef: null,
    complete: true,
    ...over,
  }
}

/**
 * Atajo para generar n vuelos identicos de una funcion y duracion dadas,
 * todos en la misma fecha.
 */
export function makeFlights(
  n: number,
  opts: { date: string; pilotFunction: PilotFunction; durationMin: number } & Partial<Flight>,
): Flight[] {
  const { date, pilotFunction, durationMin, ...rest } = opts
  return Array.from({ length: n }, () =>
    makeFlight({ date, pilotFunction, durationOverrideMin: durationMin, ...rest }),
  )
}

export function makeDoc(over: Partial<LogbookDoc> = {}): LogbookDoc {
  return {
    schemaVersion: 1,
    pilot: makePilot(),
    balloons: [],
    sites: [],
    people: [],
    flights: [],
    ...over,
  }
}
```

- [ ] **Step 2: Comprobar que compila**

Run: `cd ~/code/bpl-app && npx tsc --noEmit`
Expected: sin errores

- [ ] **Step 3: Commit**

```bash
cd ~/code/bpl-app
git add src/domain/fixtures.ts
git commit -m "test(domain): constructores de documentos y vuelos para pruebas"
```

---

## Task 6: Contadores de progreso hacia el BPL (BFCL.130)

Requisitos verificados contra el Balloon Rulebook, BFCL.130(b):
16 h de instrucción, de ellas 12 h de doble mando, 10 inflados, 20 despegues y aterrizajes, y un vuelo solo supervisado de al menos 30 minutos.

Dos decisiones que hay que dejar explícitas:

1. **"Instrucción" incluye el doble mando y el solo supervisado.** El vuelo solo bajo supervisión forma parte del curso, así que suma a las 16 h.
2. **"20 despegues y aterrizajes" se cuenta como 20 de cada uno**, no como 20 en total. Es la lectura conservadora, y equivocarse hacia el otro lado significaría presentarse sin cumplir.

Las horas se manejan **siempre en minutos** dentro del dominio. Evita comparaciones de coma flotante. Formatear a horas es cosa de la interfaz.

**Files:**
- Create: `src/domain/progress.ts`
- Test: `src/domain/progress.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// src/domain/progress.test.ts
import { describe, it, expect } from 'vitest'
import { bplProgress } from './progress'
import { makeDoc, makeFlight, makeFlights } from './fixtures'

function req(doc: ReturnType<typeof makeDoc>, key: string) {
  const r = bplProgress(doc).requirements.find(x => x.key === key)
  if (!r) throw new Error(`No existe el requisito ${key}`)
  return r
}

describe('bplProgress', () => {
  it('con un documento vacio todo esta a cero y nada cumplido', () => {
    const p = bplProgress(makeDoc())
    expect(p.allMet).toBe(false)
    expect(p.requirements.every(r => r.current === 0)).toBe(true)
  })

  it('las horas de instruccion suman doble mando y solo supervisado', () => {
    const doc = makeDoc({
      flights: [
        makeFlight({ pilotFunction: 'DUAL', durationOverrideMin: 120 }),
        makeFlight({ pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 45 }),
      ],
    })
    expect(req(doc, 'instructionMinutes').current).toBe(165)
  })

  it('las horas de doble mando no incluyen el solo supervisado', () => {
    const doc = makeDoc({
      flights: [
        makeFlight({ pilotFunction: 'DUAL', durationOverrideMin: 120 }),
        makeFlight({ pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 45 }),
      ],
    })
    expect(req(doc, 'dualMinutes').current).toBe(120)
  })

  it('los vuelos como PIC no cuentan para la instruccion', () => {
    const doc = makeDoc({
      flights: [makeFlight({ pilotFunction: 'PIC', durationOverrideMin: 300 })],
    })
    expect(req(doc, 'instructionMinutes').current).toBe(0)
  })

  it('cuenta despegues y aterrizajes por separado', () => {
    const doc = makeDoc({
      flights: [makeFlight({ takeoffs: 3, landings: 2 })],
    })
    expect(req(doc, 'takeoffs').current).toBe(3)
    expect(req(doc, 'landings').current).toBe(2)
  })

  it('exige 20 de cada uno y no 20 en total', () => {
    const doc = makeDoc({
      flights: [makeFlight({ takeoffs: 20, landings: 0 })],
    })
    expect(req(doc, 'takeoffs').met).toBe(true)
    expect(req(doc, 'landings').met).toBe(false)
  })

  it('el vuelo solo supervisado necesita 30 minutos o mas', () => {
    const corto = makeDoc({
      flights: [makeFlight({ pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 29 })],
    })
    expect(req(corto, 'soloFlight').met).toBe(false)

    const justo = makeDoc({
      flights: [makeFlight({ pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 30 })],
    })
    expect(req(justo, 'soloFlight').met).toBe(true)
  })

  it('marca como parcial el requisito que se apoya en un vuelo incompleto', () => {
    const doc = makeDoc({
      flights: [makeFlight({ durationOverrideMin: 60, complete: false })],
    })
    expect(req(doc, 'instructionMinutes').partial).toBe(true)
    expect(req(doc, 'soloFlight').partial).toBe(false)
  })

  it('allMet solo es cierto cuando se cumplen los cinco requisitos', () => {
    const doc = makeDoc({
      flights: [
        ...makeFlights(20, {
          date: '2026-08-01',
          pilotFunction: 'DUAL',
          durationMin: 40,
          inflations: 1,
          takeoffs: 1,
          landings: 1,
        }),
        makeFlight({
          pilotFunction: 'PIC_SOLO_SUPERVISED',
          durationOverrideMin: 40,
          inflations: 0,
          takeoffs: 0,
          landings: 0,
        }),
      ],
    })
    const p = bplProgress(doc)
    // 20 x 40 = 800 min de doble mando, mas 40 de solo = 840. Faltan las 16 h.
    expect(p.allMet).toBe(false)

    doc.flights.push(
      ...makeFlights(3, {
        date: '2026-08-02',
        pilotFunction: 'DUAL',
        durationMin: 60,
        inflations: 0,
        takeoffs: 0,
        landings: 0,
      }),
    )
    // 840 + 180 = 1020 min >= 960, y el doble mando 980 >= 720.
    expect(bplProgress(doc).allMet).toBe(true)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd ~/code/bpl-app && npm test -- progress`
Expected: FAIL, no encuentra `./progress`

- [ ] **Step 3: Implementar**

```ts
// src/domain/progress.ts
import { flightDurationMin } from './flight'
import type { Flight, LogbookDoc, PilotFunction } from './types'

export type RequirementUnit = 'minutes' | 'count'

export interface Requirement {
  key: string
  label: string
  current: number
  required: number
  unit: RequirementUnit
  met: boolean
  /** Cierto si algun vuelo que aporta a este contador esta marcado incompleto. */
  partial: boolean
}

export interface BplProgress {
  requirements: Requirement[]
  allMet: boolean
}

/** Funciones que cuentan como instruccion dentro del curso de BFCL.130. */
const INSTRUCTION: PilotFunction[] = ['DUAL', 'PIC_SOLO_SUPERVISED']

function isInstruction(f: Flight): boolean {
  return INSTRUCTION.includes(f.pilotFunction)
}

function build(
  key: string,
  label: string,
  required: number,
  unit: RequirementUnit,
  contributing: Flight[],
  value: (f: Flight) => number,
): Requirement {
  const aportan = contributing.filter(f => value(f) > 0)
  const current = aportan.reduce((sum, f) => sum + value(f), 0)
  return {
    key,
    label,
    current,
    required,
    unit,
    met: current >= required,
    partial: aportan.some(f => !f.complete),
  }
}

/**
 * Progreso hacia los requisitos de experiencia del BPL.
 * Fuente: BFCL.130(b), Reglamento (UE) 2020/357.
 *
 * "Instruccion" agrupa el doble mando y el vuelo solo supervisado, porque
 * ambos forman parte del curso.
 *
 * "20 despegues y aterrizajes" se interpreta como 20 de cada uno. Es la
 * lectura conservadora: equivocarse al otro lado significa presentarse sin
 * cumplir.
 */
export function bplProgress(doc: LogbookDoc): BplProgress {
  const instruccion = doc.flights.filter(isInstruction)
  const solos = doc.flights.filter(f => f.pilotFunction === 'PIC_SOLO_SUPERVISED')
  const soloValido = solos.filter(f => flightDurationMin(f) >= 30)

  const requirements: Requirement[] = [
    build('instructionMinutes', 'Instruccion de vuelo', 16 * 60, 'minutes',
      instruccion, flightDurationMin),
    build('dualMinutes', 'De ellas, doble mando', 12 * 60, 'minutes',
      doc.flights.filter(f => f.pilotFunction === 'DUAL'), flightDurationMin),
    build('inflations', 'Inflados', 10, 'count',
      instruccion, f => f.inflations),
    build('takeoffs', 'Despegues', 20, 'count',
      instruccion, f => f.takeoffs),
    build('landings', 'Aterrizajes', 20, 'count',
      instruccion, f => f.landings),
    build('soloFlight', 'Vuelo solo supervisado de 30 min', 1, 'count',
      soloValido, () => 1),
  ]

  return { requirements, allMet: requirements.every(r => r.met) }
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd ~/code/bpl-app && npm test -- progress`
Expected: PASS, 9 pruebas

- [ ] **Step 5: Commit**

```bash
cd ~/code/bpl-app
git add src/domain/progress.ts src/domain/progress.test.ts
git commit -m "feat(domain): contadores de progreso hacia el BPL segun BFCL.130"
```

---

## Task 7: Contadores de vigencia (BFCL.160)

Texto verificado contra el Balloon Rulebook, BFCL.160(a):

- **(a)(1)(i)** en los últimos 24 meses, al menos 6 h de vuelo como PIC, incluyendo 10 despegues y aterrizajes, como PIC o en doble mando o solo bajo supervisión de un FI(B)
- **(a)(1)(ii)** en los últimos 48 meses, al menos un vuelo de instrucción con un FI(B)
- **(a)(2)** o bien, en los últimos 24 meses, una verificación de competencia, que sustituye a todo lo anterior

Qué funciones cuentan como PIC sale de AMC1 BFCL.050(b)(1): el titular anota como PIC su tiempo como PIC, el solo supervisado, y el FI(B) y el FE(B) anotan como PIC el tiempo instruyendo o examinando. **El doble mando no cuenta como PIC**, pero sí cuenta para los despegues y aterrizajes, que el texto abre explícitamente al doble mando.

La parte que aporta valor de verdad es `expiresOn`: **el último día en que cada contador se sigue cumpliendo si no se vuela más.** Se calcula recorriendo los vuelos que cuentan de más nuevo a más viejo hasta alcanzar el umbral. El vuelo en el que se alcanza es el más antiguo que hace falta, y el contador caduca 24 o 48 meses después de la fecha de ese vuelo.

**Files:**
- Create: `src/domain/currency.ts`
- Test: `src/domain/currency.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// src/domain/currency.test.ts
import { describe, it, expect } from 'vitest'
import { currency } from './currency'
import { makeDoc, makeFlight, makeFlights, makePilot } from './fixtures'
import type { LogbookDoc } from './types'

const HOY = '2026-09-01'

function conLicencia(flights: LogbookDoc['flights']): LogbookDoc {
  return makeDoc({ pilot: makePilot({ licenceIssued: '2026-01-01' }), flights })
}

function item(doc: LogbookDoc, key: string) {
  const i = currency(doc, HOY).items.find(x => x.key === key)
  if (!i) throw new Error(`No existe el contador ${key}`)
  return i
}

describe('currency', () => {
  it('no aplica mientras no haya licencia emitida', () => {
    const doc = makeDoc({ flights: [makeFlight({})] })
    expect(currency(doc, HOY).applicable).toBe(false)
  })

  it('aplica en cuanto hay fecha de emision', () => {
    expect(currency(conLicencia([]), HOY).applicable).toBe(true)
  })

  it('el doble mando no suma a las horas como PIC', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'DUAL', durationOverrideMin: 600 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(0)
  })

  it('PIC, solo supervisado, FI(B) y FE(B) suman a las horas como PIC', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'PIC', durationOverrideMin: 60 }),
      makeFlight({ date: '2026-06-02', pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 30 }),
      makeFlight({ date: '2026-06-03', pilotFunction: 'FI_B', durationOverrideMin: 45 }),
      makeFlight({ date: '2026-06-04', pilotFunction: 'FE_B', durationOverrideMin: 15 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(150)
  })

  it('el doble mando si suma a despegues y aterrizajes', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'DUAL', takeoffs: 4, landings: 4 }),
    ])
    expect(item(doc, 'takeoffs').current).toBe(4)
    expect(item(doc, 'landings').current).toBe(4)
  })

  it('un vuelo justo en el borde de los 24 meses todavia cuenta', () => {
    const doc = conLicencia([
      makeFlight({ date: '2024-09-01', pilotFunction: 'PIC', durationOverrideMin: 400 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(400)
  })

  it('un vuelo un dia mas antiguo ya no cuenta', () => {
    const doc = conLicencia([
      makeFlight({ date: '2024-08-31', pilotFunction: 'PIC', durationOverrideMin: 400 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(0)
  })

  it('expiresOn es el ultimo dia en que se sigue cumpliendo', () => {
    // Dos vuelos de 3 h. El mas antiguo, el de mayo de 2025, es el que hace
    // falta para llegar a las 6 h, asi que el contador dura hasta mayo de 2027.
    const doc = conLicencia([
      makeFlight({ date: '2026-07-01', pilotFunction: 'PIC', durationOverrideMin: 180 }),
      makeFlight({ date: '2025-05-10', pilotFunction: 'PIC', durationOverrideMin: 180 }),
    ])
    const i = item(doc, 'picMinutes')
    expect(i.met).toBe(true)
    expect(i.expiresOn).toBe('2027-05-10')
  })

  it('expiresOn es null cuando el contador no se cumple', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-07-01', pilotFunction: 'PIC', durationOverrideMin: 60 }),
    ])
    const i = item(doc, 'picMinutes')
    expect(i.met).toBe(false)
    expect(i.expiresOn).toBe(null)
  })

  it('el vuelo de instruccion con FI(B) mira 48 meses y exige instructor', () => {
    const sinInstructor = conLicencia([
      makeFlight({ date: '2023-01-15', pilotFunction: 'DUAL', instructorId: null }),
    ])
    expect(item(sinInstructor, 'trainingFlight').met).toBe(false)

    const conInstructor = conLicencia([
      makeFlight({ date: '2023-01-15', pilotFunction: 'DUAL', instructorId: 'p2' }),
    ])
    const i = item(conInstructor, 'trainingFlight')
    expect(i.met).toBe(true)
    expect(i.expiresOn).toBe('2027-01-15')
  })

  it('una verificacion de competencia en 24 meses cumple la vigencia entera', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-03-20', pilotFunction: 'PIC', checkType: 'proficiency_check',
        durationOverrideMin: 30 }),
    ])
    const r = currency(doc, HOY)
    expect(r.viaProficiencyCheck).toBe(true)
    expect(r.met).toBe(true)
    expect(r.currentUntil).toBe('2028-03-20')
  })

  it('sin verificacion, met exige los cuatro contadores', () => {
    const casi = conLicencia([
      ...makeFlights(10, { date: '2026-06-01', pilotFunction: 'PIC', durationMin: 40,
        takeoffs: 1, landings: 1 }),
    ])
    // 400 min < 360? no, 400 >= 360. Despegues 10 y aterrizajes 10 cumplen.
    // Falta el vuelo de instruccion con FI(B) de los 48 meses.
    expect(currency(casi, HOY).met).toBe(false)

    casi.flights.push(makeFlight({ date: '2025-02-01', pilotFunction: 'DUAL', instructorId: 'p2' }))
    expect(currency(casi, HOY).met).toBe(true)
  })

  it('currentUntil es la mas temprana de las caducidades', () => {
    const doc = conLicencia([
      ...makeFlights(10, { date: '2026-06-01', pilotFunction: 'PIC', durationMin: 40,
        takeoffs: 1, landings: 1 }),
      makeFlight({ date: '2025-02-01', pilotFunction: 'DUAL', instructorId: 'p2' }),
    ])
    // Los contadores de 24 meses caducan el 2028-06-01, el de 48 el 2029-02-01.
    expect(currency(doc, HOY).currentUntil).toBe('2028-06-01')
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd ~/code/bpl-app && npm test -- currency`
Expected: FAIL, no encuentra `./currency`

- [ ] **Step 3: Implementar**

```ts
// src/domain/currency.ts
import { addMonths } from './dates'
import { flightDurationMin } from './flight'
import type { Flight, IsoDate, LogbookDoc, PilotFunction } from './types'

export interface CurrencyItem {
  key: string
  label: string
  current: number
  required: number
  unit: 'minutes' | 'count'
  met: boolean
  /** Ultimo dia en que este contador se sigue cumpliendo. null si ya no se cumple. */
  expiresOn: IsoDate | null
}

export interface CurrencyReport {
  /** false mientras el piloto no tenga licencia emitida. */
  applicable: boolean
  /** true si una verificacion de competencia reciente sustituye a los contadores. */
  viaProficiencyCheck: boolean
  items: CurrencyItem[]
  met: boolean
  /** La mas temprana de las caducidades. null si algo ya no se cumple. */
  currentUntil: IsoDate | null
}

/**
 * Funciones que se anotan como PIC.
 * Fuente: AMC1 BFCL.050(b)(1). El doble mando no esta, a proposito.
 */
const AS_PIC: PilotFunction[] = ['PIC', 'PIC_SOLO_SUPERVISED', 'FI_B', 'FE_B']

/**
 * Ultimo dia en que el contador se sigue cumpliendo si no se vuela mas.
 *
 * Se recorren los vuelos de mas nuevo a mas viejo acumulando. El vuelo en el
 * que se alcanza el umbral es el mas antiguo que hace falta, asi que el
 * contador aguanta hasta `windowMonths` despues de la fecha de ese vuelo.
 * Si nunca se alcanza el umbral, devuelve null.
 */
function rollingExpiry(
  flights: Flight[],
  value: (f: Flight) => number,
  required: number,
  windowMonths: number,
): IsoDate | null {
  const ordenados = [...flights].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  let acc = 0
  for (const f of ordenados) {
    acc += value(f)
    if (acc >= required) return addMonths(f.date, windowMonths)
  }
  return null
}

function buildItem(
  key: string,
  label: string,
  required: number,
  unit: 'minutes' | 'count',
  windowMonths: number,
  candidatos: Flight[],
  value: (f: Flight) => number,
): CurrencyItem {
  const aportan = candidatos.filter(f => value(f) > 0)
  const current = aportan.reduce((s, f) => s + value(f), 0)
  return {
    key,
    label,
    current,
    required,
    unit,
    met: current >= required,
    expiresOn: rollingExpiry(aportan, value, required, windowMonths),
  }
}

/**
 * Vigencia del BPL.
 * Fuente: BFCL.160(a), Reglamento (UE) 2020/357.
 *
 * `asOf` es la fecha de referencia en formato "YYYY-MM-DD". Se pasa como
 * parametro y no se lee del reloj para que la funcion sea pura y comprobable.
 */
export function currency(doc: LogbookDoc, asOf: IsoDate): CurrencyReport {
  const applicable = doc.pilot.licenceIssued !== null

  const desde24 = addMonths(asOf, -24)
  const desde48 = addMonths(asOf, -48)
  const en24 = doc.flights.filter(f => f.date >= desde24 && f.date <= asOf)
  const en48 = doc.flights.filter(f => f.date >= desde48 && f.date <= asOf)

  // BFCL.160(a)(2): una verificacion de competencia sustituye a todo.
  const checks = en24.filter(f => f.checkType === 'proficiency_check')
  const viaProficiencyCheck = checks.length > 0
  const fechasCheck = checks.map(f => f.date).sort()
  const checkExpiry = fechasCheck.length > 0
    ? addMonths(fechasCheck[fechasCheck.length - 1], 24)
    : null

  const items: CurrencyItem[] = [
    buildItem('picMinutes', '6 h como PIC en 24 meses', 6 * 60, 'minutes', 24,
      en24.filter(f => AS_PIC.includes(f.pilotFunction)), flightDurationMin),
    buildItem('takeoffs', '10 despegues en 24 meses', 10, 'count', 24,
      en24, f => f.takeoffs),
    buildItem('landings', '10 aterrizajes en 24 meses', 10, 'count', 24,
      en24, f => f.landings),
    buildItem('trainingFlight', 'Vuelo de instruccion con FI(B) en 48 meses', 1, 'count', 48,
      en48.filter(f => f.pilotFunction === 'DUAL' && f.instructorId !== null), () => 1),
  ]

  if (viaProficiencyCheck) {
    return { applicable, viaProficiencyCheck, items, met: true, currentUntil: checkExpiry }
  }

  const met = items.every(i => i.met)
  const fechas = items.map(i => i.expiresOn)
  const currentUntil = met ? (fechas.filter((d): d is IsoDate => d !== null).sort()[0] ?? null) : null

  return { applicable, viaProficiencyCheck, items, met, currentUntil }
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd ~/code/bpl-app && npm test -- currency`
Expected: PASS, 13 pruebas

- [ ] **Step 5: Commit**

```bash
cd ~/code/bpl-app
git add src/domain/currency.ts src/domain/currency.test.ts
git commit -m "feat(domain): contadores de vigencia y fechas de caducidad segun BFCL.160"
```

---

## Task 8: Documento vacío y sitios sembrados

Los tres campos salen de `Pilot Globus/trayectoria_globo.py`, que ya los tiene con coordenadas y elevación verificadas.

**Files:**
- Create: `src/domain/empty.ts`
- Test: `src/domain/empty.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// src/domain/empty.test.ts
import { describe, it, expect } from 'vitest'
import { emptyDocument, SEEDED_SITES } from './empty'
import { CURRENT_SCHEMA_VERSION } from './schema'

describe('emptyDocument', () => {
  it('arranca en la version de esquema actual', () => {
    expect(emptyDocument().schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('trae los tres campos habituales sembrados', () => {
    const nombres = emptyDocument().sites.map(s => s.name)
    expect(nombres).toEqual(['Igualada', 'Tarrega', 'Agramunt'])
  })

  it('no trae globos, personas ni vuelos', () => {
    const d = emptyDocument()
    expect(d.balloons).toEqual([])
    expect(d.people).toEqual([])
    expect(d.flights).toEqual([])
  })

  it('deja los datos del piloto en blanco para que los rellene el asistente', () => {
    expect(emptyDocument().pilot.name).toBe('')
    expect(emptyDocument().pilot.licenceIssued).toBe(null)
  })

  it('devuelve un objeto nuevo cada vez, sin estado compartido', () => {
    const a = emptyDocument()
    a.sites.push(SEEDED_SITES[0])
    expect(emptyDocument().sites).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd ~/code/bpl-app && npm test -- empty`
Expected: FAIL, no encuentra `./empty` ni `./schema`

- [ ] **Step 3: Implementar**

```ts
// src/domain/empty.ts
import { CURRENT_SCHEMA_VERSION } from './schema'
import type { LogbookDoc, Site } from './types'

/**
 * Campos de despegue habituales.
 * Fuente: Pilot Globus/trayectoria_globo.py, coordenadas y elevacion ya en uso.
 */
export const SEEDED_SITES: readonly Site[] = [
  { id: 'site-igualada', name: 'Igualada', lat: 41.5842, lon: 1.6528, elevationM: 329,
    permitStatus: 'unknown', accessNotes: '' },
  { id: 'site-tarrega', name: 'Tarrega', lat: 41.6470, lon: 1.1400, elevationM: 383,
    permitStatus: 'unknown', accessNotes: '' },
  { id: 'site-agramunt', name: 'Agramunt', lat: 41.7869, lon: 1.0967, elevationM: 345,
    permitStatus: 'unknown', accessNotes: '' },
]

/** Documento de arranque. Devuelve una copia nueva en cada llamada. */
export function emptyDocument(): LogbookDoc {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    pilot: {
      name: '',
      address: '',
      licenceNumber: null,
      medicalExpiry: null,
      licenceIssued: null,
    },
    balloons: [],
    sites: SEEDED_SITES.map(s => ({ ...s })),
    people: [],
    flights: [],
  }
}
```

- [ ] **Step 4: Verificar que pasa (después de la tarea 9)**

Esta prueba depende de `schema.ts`, que se crea en la tarea siguiente. Ejecutarla ahora falla por el import.

Run: `cd ~/code/bpl-app && npm test -- empty`
Expected: FAIL, no encuentra `./schema`. Se resuelve en la tarea 9.

- [ ] **Step 5: No comitear todavía**

Se comitea junto con la tarea 9, porque las dos piezas no compilan por separado.

---

## Task 9: Versión de esquema, validación y migraciones

Hoy solo existe la versión 1 y no hay ninguna migración escrita. Aun así se construye la maquinaria ahora, porque el día que haga falta el documento ya estará en el teléfono y en GitHub, y añadirla entonces es mucho peor.

Para poder probarla sin inventarse una historia de versiones que no existió, `migrate` recibe el mapa de migraciones como parámetro con un valor por defecto. La prueba le pasa un mapa sintético.

**Files:**
- Create: `src/domain/schema.ts`
- Test: `src/domain/schema.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// src/domain/schema.test.ts
import { describe, it, expect } from 'vitest'
import { CURRENT_SCHEMA_VERSION, migrate, validate, type Migration } from './schema'
import { makeDoc, makeFlight } from './fixtures'

describe('validate', () => {
  it('acepta un documento bien formado', () => {
    const r = validate(makeDoc({ flights: [makeFlight({})] }))
    expect(r.ok).toBe(true)
  })

  it('rechaza cualquier cosa que no sea un objeto', () => {
    expect(validate(null).ok).toBe(false)
    expect(validate('texto').ok).toBe(false)
    expect(validate([]).ok).toBe(false)
  })

  it('rechaza un documento sin version de esquema', () => {
    const d: any = makeDoc()
    delete d.schemaVersion
    const r = validate(d)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('schemaVersion')
  })

  it('rechaza un documento con una coleccion que no es array', () => {
    const d: any = makeDoc()
    d.flights = {}
    const r = validate(d)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('flights')
  })

  it('rechaza un vuelo sin identificador', () => {
    const d: any = makeDoc({ flights: [makeFlight({})] })
    delete d.flights[0].id
    expect(validate(d).ok).toBe(false)
  })

  it('acumula todos los errores en lugar de parar en el primero', () => {
    const d: any = { schemaVersion: 1 }
    const r = validate(d)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(1)
  })
})

describe('migrate', () => {
  it('devuelve el documento tal cual si ya esta en la version actual', () => {
    const d = makeDoc()
    expect(migrate(d).schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('aplica las migraciones en cadena hasta llegar a la version destino', () => {
    // Mapa sintetico: la clave N migra de la version N a la N+1.
    const migraciones: Record<number, Migration> = {
      1: (d: any) => ({ ...d, schemaVersion: 2, extra: 'de la 1 a la 2' }),
      2: (d: any) => ({ ...d, schemaVersion: 3, extra: d.extra + ', y de la 2 a la 3' }),
    }
    const salida: any = migrate(makeDoc({ schemaVersion: 1 }), 3, migraciones)
    expect(salida.schemaVersion).toBe(3)
    expect(salida.extra).toBe('de la 1 a la 2, y de la 2 a la 3')
  })

  it('falla en lugar de adivinar si falta una migracion de la cadena', () => {
    expect(() => migrate(makeDoc({ schemaVersion: 1 }), 3, {})).toThrow(/migracion/i)
  })

  it('falla si el documento viene de una version mas nueva que la que entendemos', () => {
    expect(() => migrate(makeDoc({ schemaVersion: 9 }), 1, {})).toThrow(/mas nueva/i)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd ~/code/bpl-app && npm test -- schema`
Expected: FAIL, no encuentra `./schema`

- [ ] **Step 3: Implementar**

```ts
// src/domain/schema.ts
import type { LogbookDoc } from './types'

export const CURRENT_SCHEMA_VERSION = 1

/** Lleva un documento de la version N a la N+1. */
export type Migration = (doc: any) => any

/**
 * Migraciones registradas. La clave N transforma de la version N a la N+1.
 * Vacio a proposito: hoy solo existe la version 1.
 */
export const MIGRATIONS: Record<number, Migration> = {}

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
```

- [ ] **Step 4: Verificar que pasan las pruebas de esta tarea y de la anterior**

Run: `cd ~/code/bpl-app && npm test`
Expected: PASS, todas las suites incluida `empty`, que ya encuentra `./schema`

- [ ] **Step 5: Commit**

```bash
cd ~/code/bpl-app
git add src/domain/schema.ts src/domain/schema.test.ts src/domain/empty.ts src/domain/empty.test.ts
git commit -m "feat(domain): version de esquema, validacion estructural y cadena de migraciones"
```

---

## Task 10: Guardar y cargar el documento

**Files:**
- Create: `src/db/store.ts`
- Test: `src/db/store.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// src/db/store.test.ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadDocument, saveDocument, clearDocument, makeDebouncedSaver } from './store'
import { makeDoc, makeFlight } from '../domain/fixtures'

describe('store', () => {
  beforeEach(async () => {
    await clearDocument()
  })

  it('devuelve null cuando no hay nada guardado', async () => {
    expect(await loadDocument()).toBe(null)
  })

  it('guarda y recupera el documento entero', async () => {
    const doc = makeDoc({ flights: [makeFlight({ notes: 'con acentos: Tarrega y Odena' })] })
    await saveDocument(doc)
    const leido = await loadDocument()
    expect(leido).toEqual(doc)
  })

  it('sobrescribe el documento anterior en lugar de acumular', async () => {
    await saveDocument(makeDoc({ flights: [makeFlight({})] }))
    await saveDocument(makeDoc({ flights: [] }))
    const leido = await loadDocument()
    expect(leido?.flights).toHaveLength(0)
  })

  it('devuelve null y no revienta si lo guardado no valida', async () => {
    // Se escribe basura por debajo, simulando un documento corrupto.
    const { set } = await import('idb-keyval')
    await set('logbook', { esto: 'no es un documento' })
    expect(await loadDocument()).toBe(null)
  })
})

describe('makeDebouncedSaver', () => {
  it('agrupa varias llamadas seguidas en un solo guardado', async () => {
    vi.useFakeTimers()
    const guardar = vi.fn().mockResolvedValue(undefined)
    const saver = makeDebouncedSaver(guardar, 500)

    saver(makeDoc({ flights: [] }))
    saver(makeDoc({ flights: [makeFlight({})] }))
    saver(makeDoc({ flights: [makeFlight({}), makeFlight({})] }))

    expect(guardar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)

    expect(guardar).toHaveBeenCalledTimes(1)
    // Se guarda el ultimo estado, no el primero.
    expect(guardar.mock.calls[0][0].flights).toHaveLength(2)
    vi.useRealTimers()
  })

  it('flush guarda de inmediato lo que este pendiente', async () => {
    vi.useFakeTimers()
    const guardar = vi.fn().mockResolvedValue(undefined)
    const saver = makeDebouncedSaver(guardar, 500)

    saver(makeDoc({ flights: [] }))
    await saver.flush()

    expect(guardar).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd ~/code/bpl-app && npm test -- store`
Expected: FAIL, no encuentra `./store`

- [ ] **Step 3: Implementar**

```ts
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
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd ~/code/bpl-app && npm test -- store`
Expected: PASS, 6 pruebas

- [ ] **Step 5: Commit**

```bash
cd ~/code/bpl-app
git add src/db/store.ts src/db/store.test.ts
git commit -m "feat(db): cargar y guardar el documento con validacion y guardado agrupado"
```

---

## Task 11: Sincronización con GitHub

Dos detalles que parecen menores y no lo son:

1. **`btoa` no sirve tal cual.** La API de contenidos de GitHub quiere base64, y `btoa` revienta con cualquier carácter fuera de Latin-1. En este documento hay "Tàrrega" y "Òdena" desde el primer arranque. Hay que codificar a UTF-8 primero.
2. **El `sha` es el mecanismo de detección de conflicto.** Si se manda uno viejo, GitHub responde 409 o 422. Eso no es un error a reintentar, es un aviso de que alguien escribió desde otro sitio, y se propaga a la interfaz como tal.

**Files:**
- Create: `src/sync/github.ts`
- Test: `src/sync/github.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// src/sync/github.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toBase64, fromBase64, fetchFile, putFile, ConflictError, type GithubConfig } from './github'

const cfg: GithubConfig = {
  owner: 'didachf',
  repo: 'bpl-logbook',
  branch: 'main',
  token: 'ghp_prueba',
}

describe('base64', () => {
  it('ida y vuelta con acentos y caracteres catalanes', () => {
    const s = 'Tàrrega, Òdena, Agramunt. Envoltura 3.400 m³'
    expect(fromBase64(toBase64(s))).toBe(s)
  })

  it('tolera los saltos de linea que mete la API de GitHub', () => {
    const b64 = toBase64('hola')
    const conSaltos = b64.slice(0, 2) + '\n' + b64.slice(2)
    expect(fromBase64(conSaltos)).toBe('hola')
  })
})

describe('fetchFile', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('devuelve contenido y sha cuando el fichero existe', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: toBase64('{"a":1}'), sha: 'abc123' }),
      { status: 200 },
    ))
    const r = await fetchFile(cfg, 'logbook.json')
    expect(r).toEqual({ content: '{"a":1}', sha: 'abc123' })
  })

  it('devuelve null cuando el fichero todavia no existe', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"message":"Not Found"}', { status: 404 }))
    expect(await fetchFile(cfg, 'logbook.json')).toBe(null)
  })

  it('lanza con el codigo cuando el token no vale', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"message":"Bad credentials"}', { status: 401 }))
    await expect(fetchFile(cfg, 'logbook.json')).rejects.toThrow(/401/)
  })

  it('manda el token en la cabecera', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 404 }))
    await fetchFile(cfg, 'logbook.json')
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer ghp_prueba')
  })
})

describe('putFile', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('devuelve el sha nuevo tras escribir', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: { sha: 'nuevo999' } }), { status: 200 },
    ))
    const r = await putFile(cfg, 'logbook.json', '{"a":1}', 'viejo111', 'mensaje')
    expect(r.sha).toBe('nuevo999')
  })

  it('omite el campo sha cuando el fichero es nuevo', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: { sha: 'primero' } }), { status: 201 },
    ))
    await putFile(cfg, 'logbook.json', '{}', null, 'primer commit')
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).not.toHaveProperty('sha')
  })

  it('lanza ConflictError con un 409', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"message":"conflict"}', { status: 409 }))
    await expect(putFile(cfg, 'logbook.json', '{}', 'viejo', 'm')).rejects.toBeInstanceOf(ConflictError)
  })

  it('lanza ConflictError con un 422, que es lo que devuelve con un sha caducado', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"message":"does not match"}', { status: 422 }))
    await expect(putFile(cfg, 'logbook.json', '{}', 'viejo', 'm')).rejects.toBeInstanceOf(ConflictError)
  })

  it('un 500 es un error normal y no un conflicto', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('boom', { status: 500 }))
    const p = putFile(cfg, 'logbook.json', '{}', 'viejo', 'm')
    await expect(p).rejects.toThrow(/500/)
    await expect(p).rejects.not.toBeInstanceOf(ConflictError)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd ~/code/bpl-app && npm test -- github`
Expected: FAIL, no encuentra `./github`

- [ ] **Step 3: Implementar**

```ts
// src/sync/github.ts
// Cliente minimo de la API de contenidos de GitHub.
// Documentacion: https://docs.github.com/rest/repos/contents

export interface GithubConfig {
  owner: string
  repo: string
  branch: string
  token: string
}

export interface RemoteFile {
  content: string
  sha: string
}

/** El fichero remoto ha cambiado desde la ultima lectura. No se reintenta solo. */
export class ConflictError extends Error {
  constructor(message = 'El fichero remoto ha cambiado desde la ultima lectura') {
    super(message)
    this.name = 'ConflictError'
  }
}

/**
 * Codifica a base64 pasando por UTF-8.
 * `btoa` a secas revienta con cualquier caracter fuera de Latin-1, y el
 * documento lleva "Tarrega" y "Odena" con acento desde el primer arranque.
 */
export function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** La API devuelve el base64 partido en lineas. Hay que quitarlas antes. */
export function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function url(cfg: GithubConfig, path: string): string {
  return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`
}

function headers(cfg: GithubConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/** Devuelve null si el fichero no existe todavia. Lanza en cualquier otro fallo. */
export async function fetchFile(cfg: GithubConfig, path: string): Promise<RemoteFile | null> {
  const res = await fetch(`${url(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub ha respondido ${res.status} al leer ${path}`)

  const body = await res.json() as { content: string; sha: string }
  return { content: fromBase64(body.content), sha: body.sha }
}

/**
 * Escribe el fichero. `sha` debe ser el de la version leida, o null si el
 * fichero es nuevo.
 *
 * Un 409 o un 422 significan que el sha ya no vale, es decir que alguien ha
 * escrito desde otro dispositivo. Se traduce a ConflictError para que la
 * interfaz pregunte en lugar de fusionar por su cuenta.
 */
export async function putFile(
  cfg: GithubConfig,
  path: string,
  content: string,
  sha: string | null,
  message: string,
): Promise<{ sha: string }> {
  const body: Record<string, unknown> = {
    message,
    content: toBase64(content),
    branch: cfg.branch,
  }
  if (sha !== null) body.sha = sha

  const res = await fetch(url(cfg, path), {
    method: 'PUT',
    headers: { ...headers(cfg), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.status === 409 || res.status === 422) throw new ConflictError()
  if (!res.ok) throw new Error(`GitHub ha respondido ${res.status} al escribir ${path}`)

  const out = await res.json() as { content: { sha: string } }
  return { sha: out.content.sha }
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd ~/code/bpl-app && npm test -- github`
Expected: PASS, 10 pruebas

- [ ] **Step 5: Pasar la batería entera**

Run: `cd ~/code/bpl-app && npm test`
Expected: PASS, todas las suites

- [ ] **Step 6: Commit**

```bash
cd ~/code/bpl-app
git add src/sync/github.ts src/sync/github.test.ts
git commit -m "feat(sync): cliente de la API de contenidos de GitHub con deteccion de conflicto"
```

---

## Fin del plan A1

Al terminar la tarea 11 existe el núcleo entero probado: tipos, contadores reglamentarios, persistencia local y sincronización remota. **No hay interfaz todavía**, así que la app aún no se puede usar.

La interfaz va en un documento aparte, `2026-09-01-logbook-ui.md`, porque este ya es largo y porque el núcleo se puede revisar y dar por bueno antes de construir nada encima.

### Cobertura respecto al spec

| Sección del spec | Cubierto por |
|---|---|
| §3 arquitectura en capas | Estructura de ficheros y tareas 1 a 11 |
| §4 modelo de datos | Tareas 1, 5, 8 |
| §4 grupo derivado del volumen | Tarea 2 |
| §4 duración y anulación manual | Tarea 3 |
| §4 trazas fuera del documento | Campo `trackRef` en la tarea 1. La escritura del fichero va en el plan de interfaz |
| §5 panel de progreso BFCL.130 | Tarea 6 |
| §5 panel de vigencia BFCL.160 | Tarea 7 |
| §6 pantallas | Plan de interfaz |
| §7 sincronización y conflictos | Tarea 11 |
| §8 modos de fallo, documento corrupto | Tareas 9 y 10 |
| §8 modos de fallo de interfaz | Plan de interfaz |
| §9 pruebas del dominio | Tareas 2, 3, 4, 6, 7, 9 |
| §9 ida y vuelta del documento | Tarea 10 |
| §9 migraciones | Tarea 9 |

### Cambio respecto al spec introducido en este plan

- **`Flight.checkType`** añadido. BFCL.160(a)(2) permite que una verificación de competencia sustituya a los demás contadores de vigencia, y no había dónde anotarla. Reflejar en el spec §4.

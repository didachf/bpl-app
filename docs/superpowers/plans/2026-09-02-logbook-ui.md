# Logbook BPL, la interfaz (plan A2 de la fase 1)

> **Para agentes:** SKILL OBLIGATORIA. Usa `superpowers:subagent-driven-development` o
> `superpowers:executing-plans` para ejecutar este plan tarea a tarea. Los pasos llevan
> casilla `- [ ]`.

**Objetivo:** poner en pie la interfaz Preact del logbook sobre el dominio ya cerrado, hasta
que Dídac pueda meter un vuelo desde el teléfono, rematarlo en casa y ver el acumulado.

**Arquitectura:** un contexto de estado que posee el documento único y lo guarda con rebote
en IndexedDB, un enrutador de hash de treinta líneas, y pantallas que solo leen del contexto
y llaman a funciones puras. Toda la lógica que no sea pintar sale a módulos `.ts` sin JSX
para poder probarla con Vitest en Node.

**Herramientas:** Preact 10, TypeScript, Vite, `idb-keyval`, Vitest. Sin librería de
componentes, sin CSS-in-JS, sin gestor de estado.

`WARNING:` **este plan se escribió y se ejecutó creyendo que el teléfono era un iPhone.**
El 2026-09-02, ya terminado, Dídac aclaró que es un **Android**. Se deja tal cual como
registro de lo que se hizo. Lo que hay que leer corregido está en el spec, enmendado ese
mismo día, y en `STATUS.md`. En concreto **no valen** de este documento: la lista de
verificación de la Task 20, que era del iPhone, y las justificaciones que citan a Safari.
Ninguna línea de código cambió por esto.

---

## Alcance de este plan

Entra: contexto de estado, Ajustes con sus cinco subpantallas, Cerrar vuelo, Vuelos,
Detalle, Inicio, y esbozos navegables de Planificar y Operar.

No entra, y va después: el empaquetado PWA con `vite-plugin-pwa`, el despliegue a GitHub
Pages, el mapa de Leaflet y las llamadas a open-meteo, y las checklists.

**El dominio está cerrado.** `src/domain/` no se toca. Si una pantalla descubre un hueco
real, se para, se escribe primero la prueba que lo demuestra y se avisa a Dídac. No se
repiten las cuatro auditorías.

---

## Decisiones de esta capa

Nueve, con su motivo, para no volver a discutirlas a mitad de ejecución.

| Decisión | Elección | Motivo |
|---|---|---|
| Enrutado | Hash propio, `#/vuelos/<id>` | GitHub Pages sirve estático. Con la API de historia, recargar en `/bpl-app/vuelos` da un 404. El hash nunca llega al servidor |
| `preact-iso` | Se desinstala | Queda sin uso al elegir el hash. Una dependencia que no se importa es una mentira en `package.json` |
| Tipografía | `@fontsource`, servida desde el propio origen | El spec exige funcionar sin cobertura en el campo de aterrizaje. Un `<link>` a Google Fonts falla justo ahí |
| Estado | Un `createContext` de Preact con el documento entero | Menos de 100 vuelos. Recalcular todo en cada pulsación cuesta microsegundos |
| Guardado | `makeDebouncedSaver` a 800 ms para IndexedDB, 5 s para GitHub | Ya existe en `db/store.ts`. GitHub va más lento porque cada empuje es un commit |
| Identificadores | `crypto.randomUUID()` | Safari lo tiene desde 15.4. No se añade una dependencia por esto |
| Pruebas | Cero pruebas de componentes, todas de módulos `.ts` puros | Spec §9. El riesgo está en qué se enseña, no en si el `<div>` se pinta |
| Formato de horas | `formatHm`, siempre `h:mm` sin cero a la izquierda | El dominio devuelve minutos y no formatea. Decisión ya tomada en STATUS |
| Tema | Variables CSS, oscuro por defecto, claro con `prefers-color-scheme` | Las dos maquetas claras fijan la paleta. Sin conmutador manual en la versión 1 |

### Lo que las maquetas traen de más

Las maquetas se dibujaron antes de retirar el seguimiento del curso, así que tres textos
suyos citan BFCL.130(b) y **no se implementan**:

| Maqueta | Texto que no se copia | Qué va en su lugar |
|---|---|---|
| `Vuelos.dc.html` | «Globo de grupo B, no cuenta para las 16 h» | Nada. La tarjeta no juzga |
| `Detalle.dc.html` | «Sin la firma de Alberto no cuenta para las 16 h» | «Falta la firma del instructor», sin consecuencia inventada |
| `Ajustes.dc.html` | «Que el curso sea en una ATO o DTO. Los nueve exámenes teóricos» | La lista literal de `report.notModelled`, leída del dominio |

### Las tres trampas del contrato

STATUS las enumera y el plan las ata con pruebas, no con buena voluntad:

1. `applicable` antes que `met`. La cubre `describeCurrency` en la Task 15.
2. `groupSchedule` antes que `maxGroup`. Misma tarea, con un caso de dos tramos.
3. `excluded`, `warnings` y `notModelled` siempre visibles. Misma tarea.

---

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/ui/theme.css` | Variables de color, tipografía y las clases compartidas |
| `src/ui/ids.ts` | `newId()`, único punto que llama a `crypto.randomUUID` |
| `src/ui/format.ts` | Minutos a `h:mm`, fechas, horas, etiquetas de enumerado. Puro |
| `src/ui/select.ts` | Buscar globo, persona y campo. Título del vuelo. Filtros. Puro |
| `src/ui/incomplete.ts` | Qué le falta a un vuelo. Puro |
| `src/ui/currencyView.ts` | `CurrencyReport` a filas de pantalla. Puro. **El fichero de mayor riesgo** |
| `src/ui/router.ts` | Enrutador de hash y `navigate()` |
| `src/ui/state.tsx` | Contexto: documento, carga, guardado, estado de sincronización |
| `src/ui/components/Icon.tsx` | Los SVG de las maquetas, uno por nombre |
| `src/ui/components/Tabs.tsx` | Barra inferior de cinco pestañas |
| `src/ui/components/Screen.tsx` | Armazón de pantalla: cabecera, cuerpo con scroll, pestañas |
| `src/ui/components/Field.tsx` | Texto, número, selector, contador, interruptor, fila de navegación |
| `src/ui/components/Notice.tsx` | Avisos en tres tonos |
| `src/ui/screens/Inicio.tsx` | Acumulado, incompletos, vigencia, botón de cerrar |
| `src/ui/screens/Vuelos.tsx` | Lista y filtros |
| `src/ui/screens/Detalle.tsx` | Formulario entero, dos bloques plegables |
| `src/ui/screens/CerrarVuelo.tsx` | Los cuatro campos |
| `src/ui/screens/Planificar.tsx` | Esbozo |
| `src/ui/screens/Operar.tsx` | Esbozo |
| `src/ui/screens/ajustes/Ajustes.tsx` | Índice de Ajustes |
| `src/ui/screens/ajustes/MisDatos.tsx` | Piloto y licencia |
| `src/ui/screens/ajustes/Globos.tsx` | Catálogo de globos |
| `src/ui/screens/ajustes/Campos.tsx` | Catálogo de campos |
| `src/ui/screens/ajustes/Personas.tsx` | Catálogo de personas |
| `src/ui/screens/ajustes/Copia.tsx` | Token, empuje, restauración, conflicto |
| `src/sync/config.ts` | El `GithubConfig` y el sha en `localStorage` |
| `src/sync/logbook.ts` | `pushDocument` y `restoreDocument` sobre `github.ts` |
| `src/app.tsx` | Monta el proveedor de estado y despacha la ruta |

---

## Task 1: Tema, tipografía e identificadores

**Ficheros:**
- Crear: `src/ui/theme.css`
- Crear: `src/ui/ids.ts`
- Modificar: `src/styles.css`
- Modificar: `index.html`
- Modificar: `package.json`

- [ ] **Paso 1: instalar las dos familias y quitar el enrutador sin usar**

```bash
npm install --save-exact @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
npm uninstall preact-iso
```

Comprueba que existen los ficheros que se van a importar, porque los nombres de
`@fontsource` cambian entre familias:

```bash
ls node_modules/@fontsource/ibm-plex-sans/{400,500,600}.css
ls node_modules/@fontsource/ibm-plex-mono/{400,500}.css
```

Esperado: las cinco rutas existen. Si alguna falla, mira `ls node_modules/@fontsource/ibm-plex-sans/*.css` y usa los ficheros que sí estén, ajustando los `import` del paso 3.

- [ ] **Paso 2: escribir el tema**

Crea `src/ui/theme.css`:

```css
/* src/ui/theme.css
   Dirección visual "Instrumento". Oscuro por defecto, claro por preferencia del
   sistema. Los valores salen de design/*.dc.html y no se inventan aquí.

   El ámbar #fab219 da 1,79 de contraste sobre fondo claro, así que en tema claro
   pasa a #8a5a00. Nunca rellena una superficie grande, solo trazos y texto. */

:root {
  color-scheme: dark;
  --bg: #1a1a19;
  --surface: #24231f;
  --border: #2c2c2a;
  --text: #ffffff;
  --muted: #c3c2b7;
  --dim: #898781;
  --accent: #2a78d6;
  --accent-text: #ffffff;
  --ok: #0ca30c;
  --warn: #fab219;
  --warn-bg: #2a1f14;
  --warn-border: #5a4423;
  --danger: #d03b3b;
  --danger-border: #4a2020;
  --sans: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, monospace;
}

@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
    --bg: #f2f1ed;
    --surface: #fcfcfb;
    --border: #e1e0d9;
    --text: #0b0b0b;
    --muted: #52514e;
    --dim: #898781;
    --accent: #1c5cab;
    --accent-text: #ffffff;
    --ok: #006300;
    --warn: #8a5a00;
    --warn-bg: #f6efe2;
    --warn-border: #d9c9a4;
    --danger: #a32020;
    --danger-border: #e0c4c4;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-size: 15px;
  -webkit-text-size-adjust: 100%;
}

/* Cifras alineadas en columna. Un acumulado que baila al teclear no se lee. */
.num { font-family: var(--mono); font-variant-numeric: tabular-nums; }

.cap {
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--dim);
}

.lbl { font-size: 13px; }
.dim { color: var(--dim); }
.muted { color: var(--muted); }

.card {
  background: var(--surface);
  border-radius: 8px;
  padding: 13px 14px;
}

.outline {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 13px 14px;
  background: none;
}

.chip {
  font: inherit;
  font-size: 13px;
  padding: 7px 13px;
  border-radius: 15px;
  border: 1px solid var(--border);
  background: none;
  color: var(--muted);
  cursor: pointer;
}
.chip[aria-pressed='true'] {
  border-color: var(--accent);
  color: var(--text);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}

.primary {
  width: 100%;
  height: 56px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: var(--accent-text);
  font: inherit;
  font-size: 17px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.secondary {
  width: 100%;
  height: 50px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

/* Un boton deshabilitado tiene que parecerlo. Sin esto, el de restaurar del
   primer uso se ve azul intenso y da a entender que se puede pulsar. */
.primary:disabled, .secondary:disabled, .linkish:disabled {
  opacity: .45;
  cursor: default;
}

.linkish {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 15px;
  color: var(--accent);
  cursor: pointer;
}

/* Un campo de texto que hereda del tema. Safari le pone fondo blanco si no. */
input, select, textarea {
  font: inherit;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  width: 100%;
}
/* 16 px es el umbral por debajo del cual Safari hace zoom al enfocar. */
input, select, textarea { font-size: 16px; }
textarea { min-height: 76px; resize: vertical; }

a { color: var(--accent); }
```

- [ ] **Paso 3: enganchar el tema y las fuentes**

`src/styles.css` pasa a ser una sola linea:

```css
@import './ui/theme.css';
```

Las fuentes se importan desde `src/main.tsx` y no desde el CSS, porque los paquetes de
`@fontsource` traen su propio `.css` con las rutas a los `.woff2` y es Vite quien las
resuelve al empaquetar. Van servidas desde el propio origen y no desde Google Fonts: la app
tiene que arrancar en un rastrojo sin cobertura, y ahi un `<link>` a un CDN falla.

Sustituye `src/main.tsx` entero:

```tsx
import { render } from 'preact'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles.css'
import { App } from './app'

const root = document.getElementById('app')
if (!root) throw new Error('Falta el nodo #app en index.html')
render(<App />, root)
```

- [ ] **Paso 4: el color de la barra de estado del teléfono**

En `index.html`, cambia la línea del `theme-color` por estas dos, para que la barra de
estado del iPhone acompañe al tema en lugar de quedarse en un azul que ya no existe:

```html
    <meta name="theme-color" content="#f2f1ed" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1a1a19" media="(prefers-color-scheme: dark)" />
```

- [ ] **Paso 5: el generador de identificadores**

Crea `src/ui/ids.ts`:

```ts
// src/ui/ids.ts
/**
 * Identificador de una entidad nueva del documento.
 *
 * Único sitio de la app que llama a `crypto.randomUUID`, para que el día que
 * haya que cambiarlo sea un cambio de una línea. Safari lo tiene desde 15.4,
 * que es muy anterior al iPhone del usuario.
 */
export function newId(): string {
  return crypto.randomUUID()
}
```

- [ ] **Paso 6: comprobar que compila y que nada se ha roto**

```bash
npx tsc -b && npm test
```

Esperado: `tsc` sin salida y las 174 pruebas del dominio en verde.

- [ ] **Paso 7: comprobar que el `build` sigue saliendo**

```bash
npm run build
```

Esperado: `built in ...`, y en `dist/assets/` aparecen ficheros `.woff2`.

- [ ] **Paso 8: commit**

```bash
git add -A
git commit -m "feat(ui): tema Instrumento, tipografia servida del propio origen"
```

---

## Task 2: Formato, puro y probado

**Ficheros:**
- Crear: `src/ui/format.ts`
- Crear: `src/ui/format.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crea `src/ui/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  formatHm, formatDateShort, formatDateLong, formatTime, formatCoords,
  labelFunction, labelClass, labelGroup, labelSignature, labelPermit, labelRole,
} from './format'

describe('formatHm', () => {
  it('parte los minutos en horas y minutos con dos cifras', () => {
    expect(formatHm(860)).toBe('14:20')
  })

  it('no pone cero a la izquierda en las horas', () => {
    expect(formatHm(65)).toBe('1:05')
  })

  it('menos de una hora sigue llevando el cero de las horas', () => {
    expect(formatHm(25)).toBe('0:25')
  })

  it('cero es cero, no una cadena vacia', () => {
    expect(formatHm(0)).toBe('0:00')
  })

  it('pasa de las 99 horas sin truncar', () => {
    expect(formatHm(100 * 60 + 7)).toBe('100:07')
  })

  it('un negativo se trata como cero en lugar de pintar un menos', () => {
    expect(formatHm(-30)).toBe('0:00')
  })
})

describe('formatDateShort', () => {
  it('dia, mes abreviado en minuscula y año', () => {
    expect(formatDateShort('2026-08-31')).toBe('31 ago 2026')
  })

  it('el dia lleva cero a la izquierda para que la columna cuadre', () => {
    expect(formatDateShort('2026-08-09')).toBe('09 ago 2026')
  })

  it('septiembre se abrevia sin punto', () => {
    expect(formatDateShort('2026-09-04')).toBe('04 sep 2026')
  })

  it('una fecha vacia no revienta', () => {
    expect(formatDateShort('')).toBe('')
  })
})

describe('formatDateLong', () => {
  it('mes entero', () => {
    expect(formatDateLong('2026-08-31')).toBe('31 agosto 2026')
  })
})

describe('formatTime', () => {
  it('devuelve la hora local de una marca ISO', () => {
    // 05:32 UTC son las 07:32 en Madrid en agosto, que es la maqueta.
    expect(formatTime('2026-08-31T05:32:00Z')).toBe('07:32')
  })

  it('una marca vacia se pinta como raya y no como NaN', () => {
    expect(formatTime('')).toBe('--:--')
  })

  it('una marca ilegible se pinta como raya', () => {
    expect(formatTime('no es una fecha')).toBe('--:--')
  })
})

describe('formatCoords', () => {
  it('tres decimales, coma decimal no, punto, que es lo que se teclea en un GPS', () => {
    expect(formatCoords({ lat: 41.7712, lon: 1.0384 })).toBe('41.771, 1.038')
  })
})

describe('etiquetas', () => {
  it('las cinco funciones del piloto', () => {
    expect(labelFunction('PIC')).toBe('PIC')
    expect(labelFunction('PIC_SOLO_SUPERVISED')).toBe('Solo supervisado')
    expect(labelFunction('DUAL')).toBe('Doble mando')
    expect(labelFunction('FI_B')).toBe('Instructor')
    expect(labelFunction('FE_B')).toBe('Examinador')
  })

  it('las cuatro clases de BFCL.010, no dos', () => {
    expect(labelClass('hot_air')).toBe('Aire caliente')
    expect(labelClass('gas')).toBe('Gas')
    expect(labelClass('mixed')).toBe('Mixto')
    expect(labelClass('hot_air_airship')).toBe('Dirigible de aire caliente')
  })

  it('el grupo lleva el tramo de volumen, que es lo que nadie recuerda', () => {
    expect(labelGroup('A')).toBe('A, hasta 3.400 m³')
    expect(labelGroup('D')).toBe('D, mas de 10.500 m³')
  })

  it('los tres estados de firma', () => {
    expect(labelSignature('not_required')).toBe('No hace falta')
    expect(labelSignature('pending')).toBe('Pendiente')
    expect(labelSignature('signed')).toBe('Firmado')
  })

  it('los cuatro estados de permiso de un campo', () => {
    expect(labelPermit('unknown')).toBe('Sin averiguar')
    expect(labelPermit('granted')).toBe('Concedido')
    expect(labelPermit('denied')).toBe('Denegado')
    expect(labelPermit('not_needed')).toBe('No hace falta')
  })

  it('los cinco roles', () => {
    expect(labelRole('instructor')).toBe('Instructor')
    expect(labelRole('examiner')).toBe('Examinador')
    expect(labelRole('pilot')).toBe('Piloto')
    expect(labelRole('crew')).toBe('Equipo de tierra')
    expect(labelRole('passenger')).toBe('Pasajero')
  })
})
```

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/ui/format.test.ts
```

Esperado: FAIL, `Failed to resolve import "./format"`.

- [ ] **Paso 3: escribir el módulo**

Crea `src/ui/format.ts`:

```ts
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
```

- [ ] **Paso 4: verlas pasar**

```bash
npx vitest run src/ui/format.test.ts
```

Esperado: PASS, 20 pruebas.

`WARNING:` la prueba de `formatTime` depende de la zona horaria de la máquina. En un Mac en
Madrid da `07:32`. Si el ejecutor está en otra zona, la prueba falla y **no** hay que
cambiar el módulo: hay que fijar la zona con `TZ=Europe/Madrid npx vitest run`. Si falla,
añade `TZ` al script de test en `package.json`:
`"test": "TZ=Europe/Madrid vitest run"`.

- [ ] **Paso 5: commit**

```bash
git add src/ui/format.ts src/ui/format.test.ts package.json
git commit -m "feat(ui): formato de horas, fechas y etiquetas de enumerado"
```

---

## Task 3: Selectores sobre el documento

Buscar un globo por su identificador, construir el título de un vuelo, ordenar y filtrar.
Todo puro, todo sobre el documento entero en memoria, sin índices, porque son menos de 100
vuelos.

**Ficheros:**
- Crear: `src/ui/select.ts`
- Crear: `src/ui/select.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crea `src/ui/select.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { makeFlight, makePilot } from '../domain/fixtures'
import type { Balloon, LogbookDoc, Person, Site } from '../domain/types'
import {
  balloonById, personById, siteById, personName, balloonLabel,
  endpointLabel, flightTitle, sortedFlights, flightYears, filterFlights,
} from './select'

const globo: Balloon = {
  id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
  balloonClass: 'hot_air', envelopeVolumeM3: 2900,
}
const campo: Site = {
  id: 's1', name: 'Agramunt', lat: 41.7869, lon: 1.0967, elevationM: 345,
  permitStatus: 'unknown', accessNotes: '',
}
const otroCampo: Site = { ...campo, id: 's2', name: 'Odena' }
const alberto: Person = { id: 'p2', name: 'Alberto Ruiz', roles: ['instructor'], licenceNumber: null }

function doc(over: Partial<LogbookDoc> = {}): LogbookDoc {
  return {
    schemaVersion: 1,
    pilot: makePilot(),
    balloons: [globo],
    sites: [campo, otroCampo],
    people: [alberto],
    flights: [],
    ...over,
  }
}

describe('busquedas por identificador', () => {
  it('encuentra el globo', () => {
    expect(balloonById(doc(), 'b1')).toBe(globo)
  })

  it('devuelve null y no undefined cuando no esta', () => {
    expect(balloonById(doc(), 'nada')).toBe(null)
    expect(personById(doc(), 'nada')).toBe(null)
    expect(siteById(doc(), 'nada')).toBe(null)
  })

  it('un identificador null no revienta', () => {
    expect(personById(doc(), null)).toBe(null)
  })
})

describe('personName', () => {
  it('el nombre cuando la persona existe', () => {
    expect(personName(doc(), 'p2')).toBe('Alberto Ruiz')
  })

  it('un id que no esta en el documento se dice, no se calla', () => {
    expect(personName(doc(), 'fantasma')).toBe('Sin asignar')
  })

  it('una persona sin nombre se muestra como sin nombre', () => {
    const d = doc({ people: [{ id: 'p9', name: '', roles: [], licenceNumber: null }] })
    expect(personName(d, 'p9')).toBe('Sin nombre')
  })
})

describe('balloonLabel', () => {
  it('matricula y modelo', () => {
    expect(balloonLabel(globo)).toBe('EC-KMU · M-105')
  })

  it('sin modelo, solo la matricula', () => {
    expect(balloonLabel({ ...globo, model: '' })).toBe('EC-KMU')
  })
})

describe('endpointLabel', () => {
  it('el nombre del campo cuando el punto esta en el catalogo', () => {
    expect(endpointLabel(doc(), { siteId: 's1', coords: null, timestamp: '' })).toBe('Agramunt')
  })

  it('las coordenadas cuando se aterrizo fuera del catalogo', () => {
    const ep = { siteId: null, coords: { lat: 41.7712, lon: 1.0384 }, timestamp: '' }
    expect(endpointLabel(doc(), ep)).toBe('41.771, 1.038')
  })

  it('sin campo y sin coordenadas lo dice', () => {
    expect(endpointLabel(doc(), { siteId: null, coords: null, timestamp: '' })).toBe('Sin indicar')
  })

  it('un siteId que ya no existe cae a las coordenadas si las hay', () => {
    const ep = { siteId: 'borrado', coords: { lat: 41.7, lon: 1.0 }, timestamp: '' }
    expect(endpointLabel(doc(), ep)).toBe('41.700, 1.000')
  })
})

describe('flightTitle', () => {
  it('salida y llegada del catalogo', () => {
    const f = makeFlight({
      departure: { siteId: 's1', coords: null, timestamp: '' },
      arrival: { siteId: 's2', coords: null, timestamp: '' },
    })
    expect(flightTitle(doc(), f)).toBe('Agramunt → Odena')
  })

  it('aterrizaje en campo abierto con distancia conocida', () => {
    const f = makeFlight({
      departure: { siteId: 's1', coords: null, timestamp: '' },
      arrival: { siteId: null, coords: { lat: 41.77, lon: 1.03 }, timestamp: '' },
      distanceKm: 11.4,
    })
    expect(flightTitle(doc(), f)).toBe('Agramunt → campo a 11 km')
  })

  it('aterrizaje en campo abierto sin distancia, las coordenadas', () => {
    const f = makeFlight({
      departure: { siteId: 's1', coords: null, timestamp: '' },
      arrival: { siteId: null, coords: { lat: 41.77, lon: 1.03 }, timestamp: '' },
      distanceKm: null,
    })
    expect(flightTitle(doc(), f)).toBe('Agramunt → 41.770, 1.030')
  })

  it('un vuelo cautivo no tiene flecha, se queda en el sitio', () => {
    const f = makeFlight({
      tether: 'tethered',
      departure: { siteId: 's1', coords: null, timestamp: '' },
      arrival: { siteId: 's1', coords: null, timestamp: '' },
    })
    expect(flightTitle(doc(), f)).toBe('Agramunt, cautivo')
  })
})

describe('sortedFlights', () => {
  it('la fecha mas reciente primero', () => {
    const a = makeFlight({ id: 'a', date: '2026-08-17' })
    const b = makeFlight({ id: 'b', date: '2026-08-31' })
    const c = makeFlight({ id: 'c', date: '2026-08-24' })
    expect(sortedFlights([a, b, c]).map(f => f.id)).toEqual(['b', 'c', 'a'])
  })

  it('dos vuelos del mismo dia se desempatan por la hora de salida, el ultimo arriba', () => {
    const manana = makeFlight({
      id: 'manana', date: '2026-08-31',
      departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T05:00:00Z' },
    })
    const tarde = makeFlight({
      id: 'tarde', date: '2026-08-31',
      departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T17:00:00Z' },
    })
    expect(sortedFlights([manana, tarde]).map(f => f.id)).toEqual(['tarde', 'manana'])
  })

  it('no muta la lista que recibe', () => {
    const lista = [makeFlight({ id: 'a', date: '2026-01-01' }), makeFlight({ id: 'b', date: '2026-06-01' })]
    sortedFlights(lista)
    expect(lista.map(f => f.id)).toEqual(['a', 'b'])
  })
})

describe('flightYears', () => {
  it('los años distintos, del mas reciente al mas antiguo', () => {
    const fs = [
      makeFlight({ date: '2025-03-01' }),
      makeFlight({ date: '2026-08-31' }),
      makeFlight({ date: '2026-01-04' }),
    ]
    expect(flightYears(fs)).toEqual(['2026', '2025'])
  })

  it('sin vuelos, lista vacia', () => {
    expect(flightYears([])).toEqual([])
  })
})

describe('filterFlights', () => {
  const fs = [
    makeFlight({ id: 'a', date: '2026-08-31', balloonId: 'b1', pilotFunction: 'DUAL' }),
    makeFlight({ id: 'b', date: '2025-08-31', balloonId: 'b1', pilotFunction: 'PIC' }),
    makeFlight({ id: 'c', date: '2026-02-01', balloonId: 'b2', pilotFunction: 'PIC' }),
  ]

  it('sin filtros los devuelve todos', () => {
    expect(filterFlights(fs, {}).map(f => f.id)).toEqual(['a', 'b', 'c'])
  })

  it('filtra por año', () => {
    expect(filterFlights(fs, { year: '2026' }).map(f => f.id)).toEqual(['a', 'c'])
  })

  it('filtra por globo', () => {
    expect(filterFlights(fs, { balloonId: 'b2' }).map(f => f.id)).toEqual(['c'])
  })

  it('filtra por funcion', () => {
    expect(filterFlights(fs, { pilotFunction: 'PIC' }).map(f => f.id)).toEqual(['b', 'c'])
  })

  it('los filtros se acumulan, no se sustituyen', () => {
    expect(filterFlights(fs, { year: '2026', pilotFunction: 'PIC' }).map(f => f.id)).toEqual(['c'])
  })
})
```

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/ui/select.test.ts
```

Esperado: FAIL, `Failed to resolve import "./select"`.

- [ ] **Paso 3: escribir el módulo**

Crea `src/ui/select.ts`:

```ts
// src/ui/select.ts
// Consultas de lectura sobre el documento. Puras.
//
// Barrido lineal a proposito: son menos de 100 vuelos y un puñado de globos y
// personas, asi que un indice seria complejidad sin comprador. Ver el spec §2.
import { formatCoords } from './format'
import type {
  Balloon, EndPoint, Flight, LogbookDoc, Person, PilotFunction, Site, Uuid,
} from '../domain/types'

export function balloonById(doc: LogbookDoc, id: Uuid | null): Balloon | null {
  if (id === null) return null
  return doc.balloons.find(b => b.id === id) ?? null
}

export function personById(doc: LogbookDoc, id: Uuid | null): Person | null {
  if (id === null) return null
  return doc.people.find(p => p.id === id) ?? null
}

export function siteById(doc: LogbookDoc, id: Uuid | null): Site | null {
  if (id === null) return null
  return doc.sites.find(s => s.id === id) ?? null
}

/**
 * Nombre de una persona para pantalla.
 *
 * Un identificador que ya no esta en el documento devuelve "Sin asignar" y no
 * el propio identificador: un uuid crudo en la pantalla no le dice nada a
 * nadie. El caso ocurre de verdad al borrar una persona que figuraba en un
 * vuelo antiguo.
 */
export function personName(doc: LogbookDoc, id: Uuid | null): string {
  const p = personById(doc, id)
  if (p === null) return 'Sin asignar'
  return p.name.trim() === '' ? 'Sin nombre' : p.name
}

/** "EC-KMU · M-105". Sin modelo, solo la matricula, sin el separador colgando. */
export function balloonLabel(b: Balloon): string {
  return b.model.trim() === '' ? b.registration : `${b.registration} · ${b.model}`
}

/**
 * Como se llama un punto de despegue o de aterrizaje.
 *
 * El orden importa: primero el catalogo, luego las coordenadas sueltas. Un
 * `siteId` que ya no existe cae a las coordenadas en lugar de mentir con un
 * nombre inventado.
 */
export function endpointLabel(doc: LogbookDoc, ep: EndPoint): string {
  const s = siteById(doc, ep.siteId)
  if (s !== null) return s.name
  if (ep.coords !== null) return formatCoords(ep.coords)
  return 'Sin indicar'
}

/**
 * Titulo del vuelo, el renglon gordo de la tarjeta.
 *
 * Un cautivo no lleva flecha porque no va a ninguna parte, y escribir
 * "Igualada → Igualada" es ruido. Un aterrizaje fuera del catalogo con
 * distancia conocida se resume en "campo a 11 km", que es como se cuenta de
 * viva voz, y sin distancia cae a las coordenadas.
 */
export function flightTitle(doc: LogbookDoc, f: Flight): string {
  const salida = endpointLabel(doc, f.departure)
  if (f.tether === 'tethered') return `${salida}, cautivo`

  const site = siteById(doc, f.arrival.siteId)
  let llegada: string
  if (site !== null) llegada = site.name
  else if (f.arrival.coords !== null && f.distanceKm !== null) {
    llegada = `campo a ${Math.round(f.distanceKm)} km`
  } else if (f.arrival.coords !== null) llegada = formatCoords(f.arrival.coords)
  else llegada = 'Sin indicar'

  return `${salida} → ${llegada}`
}

/**
 * Del mas reciente al mas antiguo.
 *
 * Desempata por la hora de salida, porque en un dia de curso se vuela dos
 * veces y el orden entre esos dos no puede ser el de insercion. Devuelve una
 * copia: ordenar en el sitio mutaria el documento del contexto.
 */
export function sortedFlights(flights: Flight[]): Flight[] {
  return [...flights].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    const ta = Date.parse(a.departure.timestamp)
    const tb = Date.parse(b.departure.timestamp)
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
    return tb - ta
  })
}

/** Los años que tienen algun vuelo, para las pastillas de filtro. */
export function flightYears(flights: Flight[]): string[] {
  const años = new Set(flights.map(f => f.date.slice(0, 4)).filter(a => a !== ''))
  return [...años].sort().reverse()
}

export interface FlightFilter {
  year?: string
  balloonId?: Uuid
  pilotFunction?: PilotFunction
}

/** Los filtros se acumulan. Un campo ausente no filtra nada. */
export function filterFlights(flights: Flight[], filtro: FlightFilter): Flight[] {
  return flights.filter(f => {
    if (filtro.year !== undefined && f.date.slice(0, 4) !== filtro.year) return false
    if (filtro.balloonId !== undefined && f.balloonId !== filtro.balloonId) return false
    if (filtro.pilotFunction !== undefined && f.pilotFunction !== filtro.pilotFunction) return false
    return true
  })
}
```

- [ ] **Paso 4: verlas pasar**

```bash
npx vitest run src/ui/select.test.ts
```

Esperado: PASS, 22 pruebas.

- [ ] **Paso 5: commit**

```bash
git add src/ui/select.ts src/ui/select.test.ts
git commit -m "feat(ui): selectores, titulo del vuelo, orden y filtros"
```

---

## Task 4: Qué le falta a un vuelo

El cierre rápido guarda vuelos con `complete: false`. Inicio dice «Faltan 6 campos» y el
Detalle tiene que enseñar cuáles. Es un juicio de la interfaz, no del reglamento, así que
vive aquí y no en `domain/`.

**Ficheros:**
- Crear: `src/ui/incomplete.ts`
- Crear: `src/ui/incomplete.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crea `src/ui/incomplete.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { makeFlight, makePilot } from '../domain/fixtures'
import type { Balloon, LogbookDoc, Person, Site } from '../domain/types'
import { missingFields, canBeCompleted } from './incomplete'

const globo: Balloon = {
  id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
  balloonClass: 'hot_air', envelopeVolumeM3: 2900,
}
const yo: Person = { id: 'p1', name: 'Didac', roles: ['pilot'], licenceNumber: null }
const alberto: Person = { id: 'p2', name: 'Alberto', roles: ['instructor'], licenceNumber: null }
// El campo 's1' existe porque `makeFlight` lo usa por defecto en las dos puntas.
// Sin el, cualquier vuelo de prueba echa en falta el campo de despegue y el
// lugar de aterrizaje, y la prueba mide el fixture en lugar de la funcion.
const campo: Site = {
  id: 's1', name: 'Agramunt', lat: 41.7869, lon: 1.0967, elevationM: 345,
  permitStatus: 'unknown', accessNotes: '',
}

function doc(over: Partial<LogbookDoc> = {}): LogbookDoc {
  return {
    schemaVersion: 1,
    pilot: makePilot({ personId: 'p1' }),
    balloons: [globo],
    sites: [campo],
    people: [yo, alberto],
    flights: [],
    ...over,
  }
}

describe('missingFields', () => {
  it('un vuelo completo y firmado no echa nada en falta', () => {
    const f = makeFlight({ picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(missingFields(doc(), f)).toEqual([])
  })

  it('sin hora de despegue lo dice', () => {
    const f = makeFlight({
      picId: 'p1', instructorId: 'p2', signatureStatus: 'signed',
      departure: { siteId: 's1', coords: null, timestamp: '' },
    })
    expect(missingFields(doc(), f)).toContain('Hora de despegue')
  })

  it('sin campo ni coordenadas de despegue lo dice', () => {
    const f = makeFlight({
      picId: 'p1', instructorId: 'p2', signatureStatus: 'signed',
      departure: { siteId: null, coords: null, timestamp: '2026-08-31T05:00:00Z' },
    })
    expect(missingFields(doc(), f)).toContain('Campo de despegue')
  })

  it('unas coordenadas de despegue bastan, no hace falta el catalogo', () => {
    const f = makeFlight({
      picId: 'p1', instructorId: 'p2', signatureStatus: 'signed',
      departure: { siteId: null, coords: { lat: 41.7, lon: 1 }, timestamp: '2026-08-31T05:00:00Z' },
    })
    expect(missingFields(doc(), f)).not.toContain('Campo de despegue')
  })

  it('un globo que no esta en el catalogo se echa en falta', () => {
    const f = makeFlight({ balloonId: '', picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(missingFields(doc(), f)).toContain('Globo')
  })

  it('cero despegues es un dato sin meter, no un vuelo sin despegar', () => {
    const f = makeFlight({ takeoffs: 0, picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(missingFields(doc(), f)).toContain('Despegues')
  })

  it('cero inflados igual', () => {
    const f = makeFlight({ inflations: 0, picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(missingFields(doc(), f)).toContain('Inflados')
  })

  it('un doble mando sin instructor asignado lo dice', () => {
    const f = makeFlight({ pilotFunction: 'DUAL', instructorId: null, picId: 'p1' })
    expect(missingFields(doc(), f)).toContain('Instructor')
  })

  it('un PIC solo no necesita instructor', () => {
    const f = makeFlight({
      pilotFunction: 'PIC', instructorId: null, picId: 'p1', signatureStatus: 'not_required',
    })
    expect(missingFields(doc(), f)).not.toContain('Instructor')
  })

  it('una firma pendiente cuenta como campo que falta', () => {
    const f = makeFlight({ picId: 'p1', instructorId: 'p2', signatureStatus: 'pending' })
    expect(missingFields(doc(), f)).toContain('Firma del instructor')
  })

  it('el vuelo del cierre rapido echa en falta seis campos', () => {
    const f = makeFlight({
      picId: 'p1',
      balloonId: 'b1',
      pilotFunction: 'DUAL',
      instructorId: null,
      signatureStatus: 'pending',
      departure: { siteId: null, coords: null, timestamp: '' },
      arrival: { siteId: null, coords: { lat: 41.77, lon: 1.03 }, timestamp: '2026-08-31T06:37:00Z' },
      takeoffs: 0,
      inflations: 0,
      complete: false,
    })
    expect(missingFields(doc(), f)).toEqual([
      'Hora de despegue',
      'Campo de despegue',
      'Inflados',
      'Despegues',
      'Instructor',
      'Firma del instructor',
    ])
  })
})

describe('canBeCompleted', () => {
  it('cierto cuando ya no falta nada', () => {
    const f = makeFlight({ picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(canBeCompleted(doc(), f)).toBe(true)
  })

  it('falso mientras quede algo', () => {
    const f = makeFlight({ picId: 'p1', instructorId: 'p2', signatureStatus: 'pending' })
    expect(canBeCompleted(doc(), f)).toBe(false)
  })
})
```

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/ui/incomplete.test.ts
```

Esperado: FAIL, `Failed to resolve import "./incomplete"`.

- [ ] **Paso 3: escribir el módulo**

Crea `src/ui/incomplete.ts`:

```ts
// src/ui/incomplete.ts
// Que le falta a un vuelo para estar rematado.
//
// Esto NO es reglamento, es interfaz. `domain/` no opina sobre si un vuelo
// esta a medio meter, solo sobre si cuenta. Por eso vive aqui y por eso la
// lista es de etiquetas de pantalla y no de claves.
//
// Cada comprobacion es objetiva: un campo vacio, un identificador que no esta
// en el catalogo, o un contador a cero que ningun vuelo real tiene. Nada de
// mirar `complete`, que es el resultado y no la causa.
import { balloonById, personById } from './select'
import type { EndPoint, Flight, LogbookDoc } from '../domain/types'

function tieneHora(ep: EndPoint): boolean {
  return !Number.isNaN(Date.parse(ep.timestamp))
}

function tieneSitio(doc: LogbookDoc, ep: EndPoint): boolean {
  return ep.coords !== null || doc.sites.some(s => s.id === ep.siteId)
}

/**
 * Los campos que le faltan al vuelo, en el orden en que se rellenan.
 *
 * El orden es el del formulario y no el alfabetico, para que la lista de
 * "faltan 6 campos" se lea de arriba abajo igual que la pantalla.
 */
export function missingFields(doc: LogbookDoc, f: Flight): string[] {
  const faltan: string[] = []

  if (personById(doc, f.picId) === null) faltan.push('Piloto al mando')
  if (balloonById(doc, f.balloonId) === null) faltan.push('Globo')
  if (!tieneHora(f.departure)) faltan.push('Hora de despegue')
  if (!tieneSitio(doc, f.departure)) faltan.push('Campo de despegue')
  if (!tieneHora(f.arrival)) faltan.push('Hora de aterrizaje')
  if (!tieneSitio(doc, f.arrival)) faltan.push('Lugar de aterrizaje')

  // Un vuelo tiene al menos un inflado y un despegue. Un cero es un dato sin
  // meter, no un globo que no llego a hincharse: eso seria un vuelo que no
  // existe y no se anota.
  if (f.inflations === 0) faltan.push('Inflados')
  if (f.takeoffs === 0) faltan.push('Despegues')
  if (f.landings === 0) faltan.push('Aterrizajes')

  // BFCL.160(e) exige firma del FI(B) en los dobles mando y los supervisados,
  // asi que sin instructor asignado el vuelo no esta rematado.
  const necesitaInstructor = f.pilotFunction === 'DUAL' || f.pilotFunction === 'PIC_SOLO_SUPERVISED'
  if (necesitaInstructor && personById(doc, f.instructorId) === null) faltan.push('Instructor')
  if (f.signatureStatus === 'pending') faltan.push('Firma del instructor')

  return faltan
}

/** No queda nada por meter. Es lo que habilita el boton de marcar como completo. */
export function canBeCompleted(doc: LogbookDoc, f: Flight): boolean {
  return missingFields(doc, f).length === 0
}
```

- [ ] **Paso 4: verlas pasar**

```bash
npx vitest run src/ui/incomplete.test.ts
```

Esperado: PASS, 13 pruebas.

- [ ] **Paso 5: commit**

```bash
git add src/ui/incomplete.ts src/ui/incomplete.test.ts
git commit -m "feat(ui): que le falta a un vuelo del cierre rapido"
```

---

## Task 5: Enrutador de hash

**Ficheros:**
- Crear: `src/ui/router.ts`
- Crear: `src/ui/router.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crea `src/ui/router.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseHash, hrefOf } from './router'

describe('parseHash', () => {
  it('el hash vacio es Inicio, que es lo que hay al abrir la app', () => {
    expect(parseHash('')).toEqual({ name: 'inicio' })
    expect(parseHash('#')).toEqual({ name: 'inicio' })
    expect(parseHash('#/')).toEqual({ name: 'inicio' })
  })

  it('las cinco pestañas', () => {
    expect(parseHash('#/vuelos')).toEqual({ name: 'vuelos' })
    expect(parseHash('#/planificar')).toEqual({ name: 'planificar' })
    expect(parseHash('#/operar')).toEqual({ name: 'operar' })
    expect(parseHash('#/ajustes')).toEqual({ name: 'ajustes' })
  })

  it('el detalle lleva el identificador del vuelo', () => {
    expect(parseHash('#/vuelos/f7')).toEqual({ name: 'detalle', flightId: 'f7' })
  })

  it('un identificador con caracteres raros vuelve decodificado', () => {
    expect(parseHash('#/vuelos/a%2Fb')).toEqual({ name: 'detalle', flightId: 'a/b' })
  })

  it('las cinco subpantallas de Ajustes', () => {
    expect(parseHash('#/ajustes/piloto')).toEqual({ name: 'ajustesPiloto' })
    expect(parseHash('#/ajustes/globos')).toEqual({ name: 'ajustesGlobos' })
    expect(parseHash('#/ajustes/campos')).toEqual({ name: 'ajustesCampos' })
    expect(parseHash('#/ajustes/personas')).toEqual({ name: 'ajustesPersonas' })
    expect(parseHash('#/ajustes/copia')).toEqual({ name: 'ajustesCopia' })
  })

  it('cerrar vuelo', () => {
    expect(parseHash('#/cerrar')).toEqual({ name: 'cerrar' })
  })

  it('una ruta que no existe cae en Inicio en lugar de dejar la pantalla en blanco', () => {
    expect(parseHash('#/no-existe')).toEqual({ name: 'inicio' })
    expect(parseHash('#/ajustes/inventado')).toEqual({ name: 'inicio' })
  })

  it('una barra final sobrante no cambia la ruta', () => {
    expect(parseHash('#/vuelos/')).toEqual({ name: 'vuelos' })
  })
})

describe('hrefOf', () => {
  it('ida y vuelta de cada ruta', () => {
    const rutas = [
      { name: 'inicio' }, { name: 'vuelos' }, { name: 'cerrar' },
      { name: 'planificar' }, { name: 'operar' }, { name: 'ajustes' },
      { name: 'ajustesPiloto' }, { name: 'ajustesGlobos' }, { name: 'ajustesCampos' },
      { name: 'ajustesPersonas' }, { name: 'ajustesCopia' },
      { name: 'detalle', flightId: 'f7' },
    ] as const
    for (const r of rutas) expect(parseHash(hrefOf(r))).toEqual(r)
  })

  it('codifica el identificador del vuelo al construir el enlace', () => {
    expect(hrefOf({ name: 'detalle', flightId: 'a/b' })).toBe('#/vuelos/a%2Fb')
  })
})
```

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/ui/router.test.ts
```

Esperado: FAIL, `Failed to resolve import "./router"`.

- [ ] **Paso 3: escribir el módulo**

Crea `src/ui/router.ts`:

```ts
// src/ui/router.ts
// Enrutador de hash, escrito a mano.
//
// Hash y no la API de historia porque GitHub Pages sirve ficheros estaticos:
// recargar en /bpl-app/vuelos pediria un fichero que no existe y daria un 404.
// El hash no llega nunca al servidor, asi que la app instalada en la pantalla
// de inicio sobrevive a un reinicio del telefono en cualquier pantalla.
import { useEffect, useState } from 'preact/hooks'

export type Route =
  | { name: 'inicio' }
  | { name: 'vuelos' }
  | { name: 'detalle'; flightId: string }
  | { name: 'cerrar' }
  | { name: 'planificar' }
  | { name: 'operar' }
  | { name: 'ajustes' }
  | { name: 'ajustesPiloto' }
  | { name: 'ajustesGlobos' }
  | { name: 'ajustesCampos' }
  | { name: 'ajustesPersonas' }
  | { name: 'ajustesCopia' }

const AJUSTES: Record<string, Route> = {
  piloto: { name: 'ajustesPiloto' },
  globos: { name: 'ajustesGlobos' },
  campos: { name: 'ajustesCampos' },
  personas: { name: 'ajustesPersonas' },
  copia: { name: 'ajustesCopia' },
}

/**
 * Del hash a la ruta.
 *
 * Cualquier cosa que no se reconozca cae en Inicio. Una pantalla en blanco por
 * un enlace roto es el peor fallo posible en una app que se usa con el globo
 * ya plegado.
 */
export function parseHash(hash: string): Route {
  const partes = hash.replace(/^#/, '').split('/').filter(p => p !== '')

  if (partes.length === 0) return { name: 'inicio' }

  if (partes[0] === 'vuelos') {
    if (partes.length === 1) return { name: 'vuelos' }
    if (partes.length === 2) return { name: 'detalle', flightId: decodeURIComponent(partes[1]) }
    return { name: 'inicio' }
  }

  if (partes[0] === 'ajustes') {
    if (partes.length === 1) return { name: 'ajustes' }
    if (partes.length === 2) return AJUSTES[partes[1]] ?? { name: 'inicio' }
    return { name: 'inicio' }
  }

  if (partes.length === 1) {
    if (partes[0] === 'cerrar') return { name: 'cerrar' }
    if (partes[0] === 'planificar') return { name: 'planificar' }
    if (partes[0] === 'operar') return { name: 'operar' }
  }

  return { name: 'inicio' }
}

/** De la ruta al hash. Inverso exacto de parseHash, y la prueba lo ata. */
export function hrefOf(r: Route): string {
  switch (r.name) {
    case 'inicio': return '#/'
    case 'vuelos': return '#/vuelos'
    case 'detalle': return `#/vuelos/${encodeURIComponent(r.flightId)}`
    case 'cerrar': return '#/cerrar'
    case 'planificar': return '#/planificar'
    case 'operar': return '#/operar'
    case 'ajustes': return '#/ajustes'
    case 'ajustesPiloto': return '#/ajustes/piloto'
    case 'ajustesGlobos': return '#/ajustes/globos'
    case 'ajustesCampos': return '#/ajustes/campos'
    case 'ajustesPersonas': return '#/ajustes/personas'
    case 'ajustesCopia': return '#/ajustes/copia'
  }
}

export function navigate(r: Route): void {
  location.hash = hrefOf(r)
}

/** Vuelve a Inicio o a la pantalla anterior, lo que el navegador tenga. */
export function goBack(): void {
  if (history.length > 1) history.back()
  else navigate({ name: 'inicio' })
}

/** La ruta actual, y se vuelve a pintar cuando cambia el hash. */
export function useRoute(): Route {
  const [ruta, setRuta] = useState<Route>(() => parseHash(location.hash))
  useEffect(() => {
    const alCambiar = () => setRuta(parseHash(location.hash))
    addEventListener('hashchange', alCambiar)
    return () => removeEventListener('hashchange', alCambiar)
  }, [])
  return ruta
}
```

- [ ] **Paso 4: verlas pasar**

```bash
npx vitest run src/ui/router.test.ts
```

Esperado: PASS, 10 pruebas.

- [ ] **Paso 5: commit**

```bash
git add src/ui/router.ts src/ui/router.test.ts
git commit -m "feat(ui): enrutador de hash, que sobrevive a la recarga en GitHub Pages"
```

---

## Task 6: Contexto de estado

El dueño del documento. Lo carga al arrancar, lo guarda con rebote y lo reparte. Todo lo
demás de la app lo lee de aquí.

**Ficheros:**
- Crear: `src/ui/state.tsx`
- Modificar: `src/app.tsx`

- [ ] **Paso 1: escribir el contexto**

Crea `src/ui/state.tsx`:

```tsx
// src/ui/state.tsx
// El dueño del documento.
//
// Un solo objeto en memoria, sin normalizar y sin indices, porque son menos de
// 100 vuelos. Cada cambio produce un documento NUEVO, nunca se muta el que
// tienen las pantallas: Preact compara por identidad para decidir si repinta.
import { createContext } from 'preact'
import type { ComponentChildren } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { loadDocument, makeDebouncedSaver, saveDocument } from '../db/store'
import { emptyDocument } from '../domain/empty'
import type { LogbookDoc } from '../domain/types'

/**
 * En que punto del arranque estamos.
 *
 * `sin_documento` no es un error: es el primer uso, y tambien lo que queda tras
 * un borrado de almacenamiento de WebKit. La app ofrece empezar de cero o
 * restaurar de GitHub. Ver el spec §8.
 */
export type Arranque = 'cargando' | 'sin_documento' | 'listo'

export interface Store {
  doc: LogbookDoc | null
  arranque: Arranque
  /** Cambios locales aun sin guardar en IndexedDB. Cero significa a salvo. */
  sinGuardar: number
  /** Aplica un cambio. La funcion recibe el documento y devuelve uno nuevo. */
  update: (fn: (d: LogbookDoc) => LogbookDoc) => void
  /** Sustituye el documento entero: primer uso, restauracion, resolucion de conflicto. */
  replace: (doc: LogbookDoc) => void
  /** Fuerza el guardado pendiente. Se llama al ocultarse la app. */
  flush: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(Ctx)
  if (s === null) throw new Error('useStore fuera de <StoreProvider>')
  return s
}

/**
 * El documento, ya cargado.
 *
 * Las pantallas se pintan solo cuando `arranque` es `listo`, asi que dentro de
 * ellas el documento nunca es null y no tiene sentido comprobarlo en cada una.
 */
export function useDoc(): LogbookDoc {
  const { doc } = useStore()
  if (doc === null) throw new Error('useDoc antes de que el documento este cargado')
  return doc
}

export function StoreProvider({ children }: { children: ComponentChildren }) {
  const [doc, setDoc] = useState<LogbookDoc | null>(null)
  const [arranque, setArranque] = useState<Arranque>('cargando')
  const [sinGuardar, setSinGuardar] = useState(0)

  // El guardador vive en una ref y no en un useMemo: useMemo puede
  // recalcularse cuando le apetezca, y perder el temporizador pendiente
  // significaria perder el ultimo cambio del usuario.
  const saverRef = useRef(
    makeDebouncedSaver(async (d: LogbookDoc) => {
      await saveDocument(d)
      setSinGuardar(0)
    }),
  )

  useEffect(() => {
    void (async () => {
      const cargado = await loadDocument()
      if (cargado === null) { setArranque('sin_documento'); return }
      setDoc(cargado)
      setArranque('listo')
    })()
  }, [])

  // Safari mata la app al pasar a segundo plano sin previo aviso, y un
  // temporizador de 800 ms pendiente se pierde con ella. `pagehide` y
  // `visibilitychange` son los dos unicos avisos fiables en iOS.
  useEffect(() => {
    const alSalir = () => { void saverRef.current.flush() }
    addEventListener('pagehide', alSalir)
    document.addEventListener('visibilitychange', alSalir)
    return () => {
      removeEventListener('pagehide', alSalir)
      document.removeEventListener('visibilitychange', alSalir)
    }
  }, [])

  const update = useCallback((fn: (d: LogbookDoc) => LogbookDoc) => {
    setDoc(anterior => {
      if (anterior === null) return anterior
      const nuevo = fn(anterior)
      saverRef.current(nuevo)
      return nuevo
    })
    setSinGuardar(n => n + 1)
  }, [])

  const replace = useCallback((nuevo: LogbookDoc) => {
    setDoc(nuevo)
    setArranque('listo')
    saverRef.current(nuevo)
    setSinGuardar(n => n + 1)
  }, [])

  const flush = useCallback(() => saverRef.current.flush(), [])

  const store = useMemo<Store>(
    () => ({ doc, arranque, sinGuardar, update, replace, flush }),
    [doc, arranque, sinGuardar, update, replace, flush],
  )

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

/** Documento de primer uso, con los tres campos sembrados. */
export function documentoNuevo(): LogbookDoc {
  return emptyDocument()
}
```

- [ ] **Paso 2: montar el proveedor en la app**

Sustituye `src/app.tsx` entero. De momento pinta el estado del arranque y nada más, para
comprobar que la carga funciona antes de escribir ninguna pantalla:

```tsx
import { StoreProvider, documentoNuevo, useStore } from './ui/state'

function Contenido() {
  const { arranque, doc, replace } = useStore()

  if (arranque === 'cargando') return <p style="padding: 20px;">Cargando el cuaderno...</p>

  if (arranque === 'sin_documento') {
    return (
      <div style="padding: 20px;">
        <h1>Logbook BPL</h1>
        <p class="muted">No hay ningun cuaderno en este telefono.</p>
        <button class="primary" onClick={() => replace(documentoNuevo())}>Empezar de cero</button>
      </div>
    )
  }

  return (
    <div style="padding: 20px;">
      <h1>Logbook BPL</h1>
      <p class="num">{doc?.flights.length} vuelos, {doc?.balloons.length} globos</p>
    </div>
  )
}

export function App() {
  return <StoreProvider><Contenido /></StoreProvider>
}
```

- [ ] **Paso 3: comprobar que compila**

```bash
npx tsc -b && npm test
```

Esperado: `tsc` sin salida, todas las pruebas en verde.

- [ ] **Paso 4: comprobarlo en el navegador**

```bash
npm run dev
```

Abre la dirección que imprime. Esperado: «No hay ningún cuaderno en este teléfono». Pulsa
«Empezar de cero» y aparece «0 vuelos, 0 globos». **Recarga la página**: tiene que seguir
diciendo «0 vuelos», no volver al primer uso. Eso demuestra que el guardado con rebote
llegó a IndexedDB.

Si tras recargar vuelve al primer uso, para y depura: el fallo está en el guardado, no en
la pantalla, y todo lo que viene después depende de él.

- [ ] **Paso 5: commit**

```bash
git add src/ui/state.tsx src/app.tsx
git commit -m "feat(ui): contexto de estado, carga y guardado con rebote"
```

---

## Task 7: Sincronización con GitHub

`src/sync/github.ts` ya sabe leer y escribir un fichero. Falta quién guarda la
configuración, quién serializa el documento y quién orquesta el empuje.

**Ficheros:**
- Crear: `src/sync/config.ts`
- Crear: `src/sync/config.test.ts`
- Crear: `src/sync/logbook.ts`
- Crear: `src/sync/logbook.test.ts`
- Modificar: `src/ui/state.tsx`

- [ ] **Paso 1: pruebas de la configuración**

Crea `src/sync/config.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { loadConfig, saveConfig, clearConfig, loadSha, saveSha, CLAVES } from './config'

/** localStorage de mentira, porque las pruebas corren en Node y no hay navegador. */
function fakeStorage() {
  const datos = new Map<string, string>()
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => { datos.set(k, v) },
    removeItem: (k: string) => { datos.delete(k) },
    get size() { return datos.size },
    claves: () => [...datos.keys()],
  }
}

let store: ReturnType<typeof fakeStorage>

beforeEach(() => {
  store = fakeStorage()
  vi.stubGlobal('localStorage', store)
})
afterEach(() => { vi.unstubAllGlobals() })

describe('configuracion de GitHub', () => {
  it('sin nada guardado devuelve null', () => {
    expect(loadConfig()).toBe(null)
  })

  it('ida y vuelta', () => {
    const cfg = { owner: 'didachf', repo: 'bpl-logbook', branch: 'main', token: 'ghp_x' }
    saveConfig(cfg)
    expect(loadConfig()).toEqual(cfg)
  })

  it('las claves llevan prefijo propio', () => {
    saveConfig({ owner: 'a', repo: 'b', branch: 'main', token: 't' })
    saveSha('abc')
    for (const k of store.claves()) expect(k.startsWith('bpl-app:')).toBe(true)
  })

  it('un json corrupto devuelve null en lugar de reventar el arranque', () => {
    localStorage.setItem(CLAVES.config, 'esto no es json')
    expect(loadConfig()).toBe(null)
  })

  it('a un objeto al que le falta el token no se le hace caso', () => {
    localStorage.setItem(CLAVES.config, JSON.stringify({ owner: 'a', repo: 'b', branch: 'main' }))
    expect(loadConfig()).toBe(null)
  })

  it('borrar quita la configuracion y tambien el sha', () => {
    saveConfig({ owner: 'a', repo: 'b', branch: 'main', token: 't' })
    saveSha('abc')
    clearConfig()
    expect(loadConfig()).toBe(null)
    expect(loadSha()).toBe(null)
  })

  it('el sha va y vuelve', () => {
    expect(loadSha()).toBe(null)
    saveSha('abc123')
    expect(loadSha()).toBe('abc123')
  })
})
```

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/sync/config.test.ts
```

Esperado: FAIL, `Failed to resolve import "./config"`.

- [ ] **Paso 3: escribir la configuración**

Crea `src/sync/config.ts`:

```ts
// src/sync/config.ts
// Donde vive el token y el sha del ultimo empuje.
import type { GithubConfig } from './github'

/**
 * Las claves llevan prefijo propio.
 *
 * `WARNING:` el origen de GitHub Pages es la cuenta entera, no la subcarpeta:
 * didachf.github.io, no didachf.github.io/bpl-app. Cualquier otro sitio de
 * Pages de la misma cuenta comparte este localStorage. Hoy no hay ninguno,
 * pero un prefijo cuesta cero y evita que un proyecto futuro pise el token.
 * Ver el spec §7.
 */
export const CLAVES = {
  config: 'bpl-app:github',
  sha: 'bpl-app:logbook-sha',
} as const

/**
 * Devuelve null ante cualquier duda: nada guardado, json corrupto, o un objeto
 * al que le falta un campo. Nunca lanza, porque esto se llama en el arranque y
 * un throw aqui deja la app en blanco.
 */
export function loadConfig(): GithubConfig | null {
  const crudo = localStorage.getItem(CLAVES.config)
  if (crudo === null) return null
  try {
    const o = JSON.parse(crudo) as Record<string, unknown>
    const campos = ['owner', 'repo', 'branch', 'token'] as const
    for (const c of campos) if (typeof o[c] !== 'string' || o[c] === '') return null
    return {
      owner: o.owner as string,
      repo: o.repo as string,
      branch: o.branch as string,
      token: o.token as string,
    }
  } catch {
    return null
  }
}

export function saveConfig(cfg: GithubConfig): void {
  localStorage.setItem(CLAVES.config, JSON.stringify(cfg))
}

/**
 * Borra la configuracion Y el sha.
 *
 * Van juntos a proposito: un sha que sobrevive a un cambio de repositorio
 * apunta a un fichero de otro sitio, y el primer empuje daria un conflicto que
 * no lo es.
 */
export function clearConfig(): void {
  localStorage.removeItem(CLAVES.config)
  localStorage.removeItem(CLAVES.sha)
}

export function loadSha(): string | null {
  return localStorage.getItem(CLAVES.sha)
}

export function saveSha(sha: string): void {
  localStorage.setItem(CLAVES.sha, sha)
}
```

- [ ] **Paso 4: verlas pasar**

```bash
npx vitest run src/sync/config.test.ts
```

Esperado: PASS, 7 pruebas.

- [ ] **Paso 5: pruebas del empuje y la restauración**

Crea `src/sync/logbook.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { emptyDocument } from '../domain/empty'
import { ConflictError, toBase64, type GithubConfig } from './github'
import { LOGBOOK_PATH, serialize, pushDocument, restoreDocument } from './logbook'

const cfg: GithubConfig = { owner: 'didachf', repo: 'bpl-logbook', branch: 'main', token: 't' }

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

describe('serialize', () => {
  it('json legible y con salto final, para que el repositorio se pueda leer a mano', () => {
    const s = serialize(emptyDocument())
    expect(s.startsWith('{\n')).toBe(true)
    expect(s.endsWith('\n')).toBe(true)
  })

  it('lo serializado vuelve a ser el mismo documento', () => {
    const d = emptyDocument()
    expect(JSON.parse(serialize(d))).toEqual(d)
  })
})

describe('pushDocument', () => {
  it('escribe en logbook.json y devuelve el sha nuevo', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: { sha: 'nuevo' } }), { status: 200 },
    ))
    const r = await pushDocument(cfg, emptyDocument(), 'viejo')
    expect(r.sha).toBe('nuevo')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain(`/contents/${LOGBOOK_PATH}`)
  })

  it('un 409 sale como ConflictError y no se reintenta', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 409 }))
    await expect(pushDocument(cfg, emptyDocument(), 'viejo')).rejects.toBeInstanceOf(ConflictError)
  })
})

describe('restoreDocument', () => {
  it('devuelve el documento y su sha', async () => {
    const d = emptyDocument()
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: toBase64(JSON.stringify(d)), sha: 'abc' }), { status: 200 },
    ))
    const r = await restoreDocument(cfg)
    expect(r).not.toBe(null)
    expect(r?.sha).toBe('abc')
    expect(r?.doc).toEqual(d)
  })

  it('devuelve null cuando el repositorio todavia no tiene el fichero', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 404 }))
    expect(await restoreDocument(cfg)).toBe(null)
  })

  it('un documento remoto que no valida se rechaza, no se carga a medias', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: toBase64('{"schemaVersion":1}'), sha: 'abc' }), { status: 200 },
    ))
    await expect(restoreDocument(cfg)).rejects.toThrow(/no valida/)
  })

  it('un json ilegible se rechaza con un mensaje que se entiende', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: toBase64('no es json'), sha: 'abc' }), { status: 200 },
    ))
    await expect(restoreDocument(cfg)).rejects.toThrow(/no es JSON/)
  })
})
```

- [ ] **Paso 6: verlas fallar**

```bash
npx vitest run src/sync/logbook.test.ts
```

Esperado: FAIL, `Failed to resolve import "./logbook"`.

- [ ] **Paso 7: escribir el orquestador**

Crea `src/sync/logbook.ts`:

```ts
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
```

- [ ] **Paso 8: verlas pasar**

```bash
npx vitest run src/sync/logbook.test.ts
```

Esperado: PASS, 8 pruebas.

- [ ] **Paso 9: enganchar la sincronización al contexto**

En `src/ui/state.tsx`, añade estos imports junto a los que ya hay:

```tsx
import { ConflictError } from '../sync/github'
import { clearConfig, loadConfig, loadSha, saveConfig, saveSha } from '../sync/config'
import { pushDocument, restoreDocument } from '../sync/logbook'
import type { GithubConfig } from '../sync/github'
```

Añade el tipo del estado de sincronización justo debajo del tipo `Arranque`:

```tsx
/**
 * Estado de la copia en GitHub.
 *
 * `conflicto` no se resuelve solo nunca. El spec §7 lo dice y la cuarta
 * auditoria del dominio dejo claro por que: fusionar sin preguntar un cuaderno
 * de vuelo puede borrar horas voladas.
 */
export type SyncState =
  | { kind: 'sin_configurar' }
  | { kind: 'al_dia' }
  | { kind: 'pendiente' }
  | { kind: 'subiendo' }
  | { kind: 'conflicto' }
  | { kind: 'error'; mensaje: string }
```

Amplía la interfaz `Store` con estos seis miembros, antes de la llave de cierre:

```tsx
  sync: SyncState
  cfg: GithubConfig | null
  /** Guarda o borra el token y el repositorio. `null` desconecta. */
  setCfg: (cfg: GithubConfig | null) => void
  /** Empuja ahora, sin esperar al rebote. */
  pushNow: () => Promise<void>
  /** Trae el documento del repositorio y sustituye el local. */
  restaurar: () => Promise<void>
  /** Resuelve un conflicto quedandose con una de las dos versiones. */
  resolverConflicto: (cual: 'local' | 'remoto') => Promise<void>
```

Dentro de `StoreProvider`, añade el estado y la maquinaria de empuje justo después de la
declaración de `saverRef`:

```tsx
  const [cfg, setCfgState] = useState<GithubConfig | null>(() => loadConfig())
  const [sync, setSync] = useState<SyncState>(
    () => (loadConfig() === null ? { kind: 'sin_configurar' } : { kind: 'al_dia' }),
  )

  // El documento y la configuracion vivos, para que el empujador rebotado no
  // se quede con los de hace cinco segundos.
  const docRef = useRef<LogbookDoc | null>(null)
  const cfgRef = useRef<GithubConfig | null>(cfg)
  cfgRef.current = cfg

  const empujar = useCallback(async (d: LogbookDoc) => {
    const c = cfgRef.current
    if (c === null) return
    setSync({ kind: 'subiendo' })
    try {
      const { sha } = await pushDocument(c, d, loadSha())
      saveSha(sha)
      setSync({ kind: 'al_dia' })
    } catch (e) {
      if (e instanceof ConflictError) { setSync({ kind: 'conflicto' }); return }
      setSync({ kind: 'error', mensaje: e instanceof Error ? e.message : String(e) })
    }
  }, [])

  // Cinco segundos, no ochocientos milisegundos: cada empuje es un commit, y
  // un commit por tecla convertiria el historial del repositorio en ruido.
  const pusherRef = useRef(makeDebouncedSaver(d => empujar(d), 5000))
```

`WARNING:` `empujar` se usa dentro de `useRef` en la línea siguiente a su definición. Como
`useRef` solo evalúa su argumento en el primer render y `empujar` es estable por su
`useCallback` con dependencias vacías, es correcto. No lo conviertas en `useMemo`.

Sustituye el cuerpo de `update` y de `replace` por estos, que además encolan el empuje:

```tsx
  const update = useCallback((fn: (d: LogbookDoc) => LogbookDoc) => {
    setDoc(anterior => {
      if (anterior === null) return anterior
      const nuevo = fn(anterior)
      docRef.current = nuevo
      saverRef.current(nuevo)
      if (cfgRef.current !== null) {
        setSync({ kind: 'pendiente' })
        pusherRef.current(nuevo)
      }
      return nuevo
    })
    setSinGuardar(n => n + 1)
  }, [])

  const replace = useCallback((nuevo: LogbookDoc) => {
    setDoc(nuevo)
    docRef.current = nuevo
    setArranque('listo')
    saverRef.current(nuevo)
    if (cfgRef.current !== null) {
      setSync({ kind: 'pendiente' })
      pusherRef.current(nuevo)
    }
    setSinGuardar(n => n + 1)
  }, [])
```

En el `useEffect` de carga, guarda también la ref:

```tsx
  useEffect(() => {
    void (async () => {
      const cargado = await loadDocument()
      if (cargado === null) { setArranque('sin_documento'); return }
      docRef.current = cargado
      setDoc(cargado)
      setArranque('listo')
    })()
  }, [])
```

Añade las cuatro acciones nuevas, justo antes del `useMemo` del store:

```tsx
  const setCfg = useCallback((nueva: GithubConfig | null) => {
    if (nueva === null) { clearConfig(); setCfgState(null); setSync({ kind: 'sin_configurar' }) }
    else { saveConfig(nueva); setCfgState(nueva); setSync({ kind: 'pendiente' }) }
  }, [])

  const pushNow = useCallback(async () => {
    const d = docRef.current
    if (d === null || cfgRef.current === null) return
    await pusherRef.current.flush()
    await empujar(d)
  }, [empujar])

  const restaurar = useCallback(async () => {
    const c = cfgRef.current
    if (c === null) return
    setSync({ kind: 'subiendo' })
    try {
      const r = await restoreDocument(c)
      if (r === null) {
        setSync({ kind: 'error', mensaje: 'El repositorio todavia no tiene logbook.json' })
        return
      }
      saveSha(r.sha)
      docRef.current = r.doc
      setDoc(r.doc)
      setArranque('listo')
      await saveDocument(r.doc)
      setSinGuardar(0)
      setSync({ kind: 'al_dia' })
    } catch (e) {
      setSync({ kind: 'error', mensaje: e instanceof Error ? e.message : String(e) })
    }
  }, [])

  /**
   * Un conflicto solo lo resuelve el usuario, y solo eligiendo una de las dos
   * versiones enteras. No hay fusion, ni la habra.
   *
   * Quedarse con la local exige releer el sha remoto antes de escribir: es la
   * unica forma de que GitHub acepte el PUT, y es deliberadamente un
   * sobrescribir, no un fusionar.
   */
  const resolverConflicto = useCallback(async (cual: 'local' | 'remoto') => {
    const c = cfgRef.current
    if (c === null) return
    if (cual === 'remoto') { await restaurar(); return }

    const d = docRef.current
    if (d === null) return
    setSync({ kind: 'subiendo' })
    try {
      const r = await restoreDocument(c)
      const { sha } = await pushDocument(c, d, r === null ? null : r.sha)
      saveSha(sha)
      setSync({ kind: 'al_dia' })
    } catch (e) {
      setSync({ kind: 'error', mensaje: e instanceof Error ? e.message : String(e) })
    }
  }, [restaurar])
```

`WARNING:` `resolverConflicto('local')` **descarta la versión remota**. La pantalla que lo
llame tiene que decirlo con esas palabras y pedir confirmación. Va en la Task 14.

Amplía el `useMemo` final para que reparta lo nuevo:

```tsx
  const store = useMemo<Store>(
    () => ({
      doc, arranque, sinGuardar, update, replace, flush,
      sync, cfg, setCfg, pushNow, restaurar, resolverConflicto,
    }),
    [doc, arranque, sinGuardar, update, replace, flush,
      sync, cfg, setCfg, pushNow, restaurar, resolverConflicto],
  )
```

Y en el efecto de salida, vacía también la cola de empuje:

```tsx
    const alSalir = () => {
      void saverRef.current.flush()
      void pusherRef.current.flush()
    }
```

- [ ] **Paso 10: comprobar que compila y que nada se ha roto**

```bash
npx tsc -b && npm test
```

Esperado: `tsc` sin salida, todas las pruebas en verde.

- [ ] **Paso 11: commit**

```bash
git add src/sync/config.ts src/sync/config.test.ts src/sync/logbook.ts src/sync/logbook.test.ts src/ui/state.tsx
git commit -m "feat(sync): empuje y restauracion del cuaderno, con conflicto sin fusion"
```

---

## Task 8: Componentes compartidos

Los cinco ladrillos que usan todas las pantallas. Sin librería externa: son doscientas
líneas y una dependencia más habría que mantenerla tres años.

**Ficheros:**
- Crear: `src/ui/components/Icon.tsx`
- Crear: `src/ui/components/Tabs.tsx`
- Crear: `src/ui/components/Screen.tsx`
- Crear: `src/ui/components/Notice.tsx`
- Crear: `src/ui/components/Field.tsx`

- [ ] **Paso 1: los iconos**

Crea `src/ui/components/Icon.tsx`. Los trazos salen literalmente de `design/*.dc.html`:

```tsx
// src/ui/components/Icon.tsx
// Los SVG de las maquetas, en un solo sitio.
//
// Trazo y no relleno, 24x24, `currentColor`: asi un icono hereda el color del
// texto que lo acompaña y el tema claro funciona sin tocar nada.

export type IconName =
  | 'check' | 'alerta' | 'aviso' | 'reloj' | 'pin' | 'mas' | 'menos'
  | 'derecha' | 'izquierda' | 'abajo' | 'arriba'
  | 'inicio' | 'lista' | 'viento' | 'checklist' | 'ajustes'
  | 'globo' | 'persona' | 'lapiz' | 'papelera' | 'nube'

const TRAZOS: Record<IconName, string> = {
  check: 'M20 6 9 17l-5-5',
  alerta: 'M12 3 2 20h20L12 3Z M12 10v4 M12 17.5v.01',
  aviso: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8v5 M12 16.5v.01',
  reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2',
  pin: 'M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  mas: 'M12 5v14 M5 12h14',
  menos: 'M5 12h14',
  derecha: 'm9 18 6-6-6-6',
  izquierda: 'm15 18-6-6 6-6',
  abajo: 'm6 9 6 6 6-6',
  arriba: 'm18 15-6-6-6 6',
  inicio: 'm3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  lista: 'M4 6h16 M4 12h16 M4 18h10',
  viento: 'M3 14c2-3 5-3 7 0s5 3 7 0 3-3 4-1 M12 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  checklist: 'M9 11l2 2 4-4 M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  ajustes: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M4 12a8 8 0 0 1 .3-2.2l-2-1.6 2-3.4 2.4 1a8 8 0 0 1 1.9-1.1L9 2h6l.4 2.7a8 8 0 0 1 1.9 1.1l2.4-1 2 3.4-2 1.6a8 8 0 0 1 0 4.4l2 1.6-2 3.4-2.4-1a8 8 0 0 1-1.9 1.1L15 22H9l-.4-2.7a8 8 0 0 1-1.9-1.1l-2.4 1-2-3.4 2-1.6A8 8 0 0 1 4 12Z',
  globo: 'M12 3a6 6 0 0 1 6 6c0 4-6 9-6 9S6 13 6 9a6 6 0 0 1 6-6Z M10 18h4l-.7 3h-2.6Z',
  persona: 'M9 4.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z M3 20a6 6 0 0 1 12 0 M16 6.5a3 3 0 0 1 0 5.5',
  lapiz: 'M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16Z',
  papelera: 'M4 7h16 M9 7V5h6v2 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  nube: 'M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.5 1.7A3.5 3.5 0 0 1 17.5 18Z',
}

export interface IconProps {
  name: IconName
  size?: number
  color?: string
  /** Grosor del trazo. Los iconos pequeños necesitan mas para no desaparecer. */
  width?: number
}

export function Icon({ name, size = 16, color = 'currentColor', width = 2.2 }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      stroke-width={width} stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true" style="flex-shrink: 0;"
    >
      <path d={TRAZOS[name]} />
    </svg>
  )
}
```

- [ ] **Paso 2: la barra de pestañas**

Crea `src/ui/components/Tabs.tsx`:

```tsx
// src/ui/components/Tabs.tsx
import { hrefOf, type Route } from '../router'
import { Icon, type IconName } from './Icon'

export type TabName = 'inicio' | 'vuelos' | 'planificar' | 'operar' | 'ajustes'

const PESTAÑAS: { name: TabName; label: string; icon: IconName; route: Route }[] = [
  { name: 'inicio', label: 'Inicio', icon: 'inicio', route: { name: 'inicio' } },
  { name: 'vuelos', label: 'Vuelos', icon: 'lista', route: { name: 'vuelos' } },
  { name: 'planificar', label: 'Planificar', icon: 'viento', route: { name: 'planificar' } },
  { name: 'operar', label: 'Operar', icon: 'checklist', route: { name: 'operar' } },
  { name: 'ajustes', label: 'Ajustes', icon: 'ajustes', route: { name: 'ajustes' } },
]

/**
 * Las cinco pestañas.
 *
 * Enlaces de verdad y no botones: asi el pulsado largo del iPhone ofrece
 * copiar el enlace, y el hash queda en el historial para que la flecha de
 * atras funcione.
 *
 * El relleno inferior sale de la barra de gestos del iPhone. Sin el, la
 * pestaña de Ajustes queda debajo de la raya y no se puede pulsar.
 */
export function Tabs({ actual }: { actual: TabName }) {
  return (
    <nav style="
      display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
      border-top: 1px solid var(--border); flex-shrink: 0;
      padding-bottom: env(safe-area-inset-bottom);
    ">
      {PESTAÑAS.map(p => (
        <a
          key={p.name}
          href={hrefOf(p.route)}
          aria-current={p.name === actual ? 'page' : undefined}
          style={`
            height: 64px; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 3px;
            text-decoration: none;
            color: ${p.name === actual ? 'var(--text)' : 'var(--dim)'};
          `}
        >
          <Icon name={p.icon} size={20} width={2} />
          <span style={`font-size: 10px; font-weight: ${p.name === actual ? 500 : 400};`}>
            {p.label}
          </span>
        </a>
      ))}
    </nav>
  )
}
```

- [ ] **Paso 3: los dos armazones de pantalla**

Crea `src/ui/components/Screen.tsx`:

```tsx
// src/ui/components/Screen.tsx
import type { ComponentChildren } from 'preact'
import { goBack } from '../router'
import { Icon } from './Icon'
import { Tabs, type TabName } from './Tabs'

const MARCO = `
  display: flex; flex-direction: column;
  height: 100dvh; overflow: hidden;
  padding-top: env(safe-area-inset-top);
`

/** Cuerpo con scroll propio. El marco no scrollea nunca, para que las pestañas no se vayan. */
const CUERPO = 'flex-grow: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;'

export interface ScreenProps {
  title: string
  tab: TabName
  /** Lo que va a la derecha del titulo: un estado, un boton pequeño. */
  right?: ComponentChildren
  children: ComponentChildren
}

/** Pantalla de pestaña: titulo grande arriba, barra de pestañas abajo. */
export function Screen({ title, tab, right, children }: ScreenProps) {
  return (
    <div style={MARCO}>
      <header style="
        display: flex; align-items: baseline; justify-content: space-between;
        padding: 16px 20px 10px 20px; flex-shrink: 0;
      ">
        <h1 style="margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.02em;">
          {title}
        </h1>
        {right}
      </header>
      <div style={CUERPO}>{children}</div>
      <Tabs actual={tab} />
    </div>
  )
}

export interface SheetProps {
  title: string
  /** Renglon pequeño encima del titulo: la fecha del vuelo, por ejemplo. */
  overline?: string
  /** Accion de la derecha de la cabecera. */
  action?: ComponentChildren
  /** Barra fija al pie, fuera del scroll. */
  footer?: ComponentChildren
  children: ComponentChildren
}

/**
 * Pantalla interior: Detalle, Cerrar vuelo, las de Ajustes.
 *
 * Sin pestañas a proposito. Son pantallas de las que se sale por la flecha o
 * guardando, y dejar las pestañas invitaria a irse a medio formulario.
 */
export function Sheet({ title, overline, action, footer, children }: SheetProps) {
  return (
    <div style={MARCO}>
      <header style="
        display: flex; align-items: center; gap: 12px;
        padding: 16px 20px 12px 20px; flex-shrink: 0;
      ">
        <button
          class="linkish" onClick={goBack} aria-label="Atras"
          style="display: flex; align-items: center; color: var(--dim);"
        >
          <Icon name="izquierda" size={20} width={2.4} />
        </button>
        <div style="flex-grow: 1; min-width: 0;">
          {overline !== undefined && (
            <div class="num dim" style="font-size: 13px;">{overline}</div>
          )}
          <div style="font-size: 19px; font-weight: 500;">{title}</div>
        </div>
        {action}
      </header>
      <div style={CUERPO}>{children}</div>
      {footer !== undefined && (
        <div style="
          padding: 14px 20px; flex-shrink: 0; border-top: 1px solid var(--border);
          padding-bottom: calc(14px + env(safe-area-inset-bottom));
        ">
          {footer}
        </div>
      )}
    </div>
  )
}

/** Titulillo de seccion en versalitas. */
export function SectionTitle({ children }: { children: ComponentChildren }) {
  return <div class="cap" style="margin: 22px 20px 8px 20px;">{children}</div>
}
```

- [ ] **Paso 4: los avisos**

Crea `src/ui/components/Notice.tsx`:

```tsx
// src/ui/components/Notice.tsx
import type { ComponentChildren } from 'preact'
import { Icon, type IconName } from './Icon'

export type Tone = 'info' | 'warn' | 'danger'

const TONOS: Record<Tone, { color: string; icon: IconName; borde: string; fondo: string }> = {
  info: { color: 'var(--dim)', icon: 'aviso', borde: 'var(--border)', fondo: 'var(--surface)' },
  warn: { color: 'var(--warn)', icon: 'alerta', borde: 'var(--warn-border)', fondo: 'var(--warn-bg)' },
  danger: { color: 'var(--danger)', icon: 'alerta', borde: 'var(--danger-border)', fondo: 'var(--surface)' },
}

export interface NoticeProps {
  tone?: Tone
  title?: string
  children?: ComponentChildren
}

/**
 * Aviso con icono.
 *
 * El ambar solo pinta el icono, el borde y el titulo, nunca una superficie
 * grande: da 1,79 de contraste sobre fondo claro. Decision ya tomada, no la
 * deshagas rellenando una tarjeta de amarillo.
 */
export function Notice({ tone = 'info', title, children }: NoticeProps) {
  const t = TONOS[tone]
  return (
    <div style={`
      display: flex; gap: 11px; padding: 12px 14px; border-radius: 8px;
      background: ${t.fondo}; border: 1px solid ${t.borde};
    `}>
      <div style="margin-top: 1px;"><Icon name={t.icon} size={17} color={t.color} /></div>
      <div style="flex-grow: 1; min-width: 0;">
        {title !== undefined && (
          <div style={`font-size: 14px; font-weight: 500; color: ${t.color};`}>{title}</div>
        )}
        {children !== undefined && (
          <div class="muted" style="font-size: 13px; line-height: 1.45;">{children}</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Paso 5: los campos de formulario**

Crea `src/ui/components/Field.tsx`:

```tsx
// src/ui/components/Field.tsx
// Campos de formulario. Sin librería: son cinco y no cambian.
//
// Ningun componente de aqui llama a dangerouslySetInnerHTML ni a nada
// equivalente. El escape de Preact es la unica barrera entre una nota de vuelo
// y el token de GitHub, que viven en el mismo origen. Ver el spec §7.
import type { ComponentChildren } from 'preact'
import { Icon } from './Icon'

/** Envoltorio de un campo editable: etiqueta encima, control debajo, pista opcional. */
export function Labeled(
  { label, hint, children }: { label: string; hint?: string; children: ComponentChildren },
) {
  return (
    <div style="margin-bottom: 18px;">
      <div class="cap" style="margin-bottom: 7px;">{label}</div>
      {children}
      {hint !== undefined && (
        <div class="lbl dim" style="margin-top: 6px; line-height: 1.4;">{hint}</div>
      )}
    </div>
  )
}

export function TextField(
  { label, value, onChange, hint, placeholder, type = 'text' }: {
    label: string
    value: string
    onChange: (v: string) => void
    hint?: string
    placeholder?: string
    /** `date` y `time` abren los selectores nativos del iPhone, que son mejores que cualquiera propio. */
    type?: 'text' | 'date' | 'time' | 'number'
  },
) {
  return (
    <Labeled label={label} hint={hint}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onInput={e => onChange((e.currentTarget as HTMLInputElement).value)}
      />
    </Labeled>
  )
}

export function TextArea(
  { label, value, onChange, hint, placeholder }: {
    label: string; value: string; onChange: (v: string) => void
    hint?: string; placeholder?: string
  },
) {
  return (
    <Labeled label={label} hint={hint}>
      <textarea
        value={value}
        placeholder={placeholder}
        onInput={e => onChange((e.currentTarget as HTMLTextAreaElement).value)}
      />
    </Labeled>
  )
}

/**
 * Campo numerico que admite quedarse vacio.
 *
 * `null` y `0` son cosas distintas en este documento: altitud maxima null es
 * "no lo apunte", altitud 0 es el nivel del mar. Un `<input type=number>` a
 * secas los confunde.
 */
export function NumberField(
  { label, value, onChange, hint, unit, step }: {
    label: string; value: number | null; onChange: (v: number | null) => void
    hint?: string; unit?: string; step?: string
  },
) {
  return (
    <Labeled label={label} hint={hint}>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input
          type="number"
          step={step}
          value={value === null ? '' : String(value)}
          onInput={e => {
            const s = (e.currentTarget as HTMLInputElement).value.trim()
            if (s === '') { onChange(null); return }
            const n = Number(s)
            onChange(Number.isFinite(n) ? n : null)
          }}
        />
        {unit !== undefined && <span class="dim" style="flex-shrink: 0;">{unit}</span>}
      </div>
    </Labeled>
  )
}

export interface Opcion { value: string; label: string }

export function SelectField(
  { label, value, options, onChange, hint, empty }: {
    label: string
    value: string | null
    options: Opcion[]
    onChange: (v: string | null) => void
    hint?: string
    /** Texto de la opcion vacia. Si no se pasa, el campo es obligatorio y no la lleva. */
    empty?: string
  },
) {
  return (
    <Labeled label={label} hint={hint}>
      <select
        value={value ?? ''}
        onChange={e => {
          const v = (e.currentTarget as HTMLSelectElement).value
          onChange(v === '' ? null : v)
        }}
      >
        {empty !== undefined && <option value="">{empty}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Labeled>
  )
}

/**
 * Contador de mas y menos, con la cifra grande en medio.
 *
 * Botones de 44 px porque se usa con el globo plegandose y las manos frias.
 * Es el patron de la maqueta CierreRapido.
 */
export function Stepper(
  { label, value, onChange, min = 0, hint }: {
    label: string; value: number; onChange: (v: number) => void; min?: number; hint?: string
  },
) {
  const boton = `
    width: 52px; height: 52px; border-radius: 8px; border: 1px solid var(--border);
    background: none; color: var(--text); display: flex; align-items: center;
    justify-content: center; cursor: pointer; flex-shrink: 0;
  `
  return (
    <Labeled label={label} hint={hint}>
      <div style="display: flex; align-items: center; gap: 14px;">
        <button
          type="button" style={boton} aria-label={`Restar a ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Icon name="menos" size={22} width={2.4} />
        </button>
        <div class="num" style="font-size: 42px; font-weight: 500; flex-grow: 1; text-align: center;">
          {value}
        </div>
        <button
          type="button" style={boton} aria-label={`Sumar a ${label}`}
          onClick={() => onChange(value + 1)}
        >
          <Icon name="mas" size={22} width={2.4} />
        </button>
      </div>
    </Labeled>
  )
}

export function Toggle(
  { label, checked, onChange, hint }: {
    label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string
  },
) {
  return (
    <label style="display: flex; gap: 12px; align-items: flex-start; padding: 11px 0; cursor: pointer;">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange((e.currentTarget as HTMLInputElement).checked)}
        style="width: 22px; height: 22px; flex-shrink: 0; margin: 0; accent-color: var(--accent);"
      />
      <span style="flex-grow: 1;">
        <span style="font-size: 15px;">{label}</span>
        {hint !== undefined && (
          <span class="lbl dim" style="display: block; margin-top: 3px; line-height: 1.4;">{hint}</span>
        )}
      </span>
    </label>
  )
}

/** Fila pulsable de una lista: icono, texto, contador y flecha. */
export function NavRow(
  { icon, label, value, href, onClick }: {
    icon?: ComponentChildren; label: string; value?: string
    href?: string; onClick?: () => void
  },
) {
  const contenido = (
    <>
      {icon}
      <span style="flex-grow: 1; font-size: 16px; min-width: 0;">{label}</span>
      {value !== undefined && <span class="num dim" style="font-size: 15px;">{value}</span>}
      <Icon name="derecha" size={16} color="var(--dim)" width={2.4} />
    </>
  )
  const estilo = `
    display: flex; align-items: center; gap: 11px; width: 100%;
    padding: 13px 0; border: none; border-bottom: 1px solid var(--border);
    background: none; color: var(--text); font: inherit; text-align: left;
    text-decoration: none; cursor: pointer;
  `
  if (href !== undefined) return <a href={href} style={estilo}>{contenido}</a>
  return <button type="button" style={estilo} onClick={onClick}>{contenido}</button>
}
```

- [ ] **Paso 6: comprobar que compila**

```bash
npx tsc -b
```

Esperado: sin salida. Si se queja de `noUnusedLocals` en algún import, quítalo, no lo
silencies.

- [ ] **Paso 7: commit**

```bash
git add src/ui/components
git commit -m "feat(ui): iconos, pestañas, armazon de pantalla, avisos y campos"
```

---

## Task 9: Armazón de la app, y las doce rutas navegables

Al acabar esta tarea se puede recorrer la app entera con el dedo. Ocho de las pantallas son
todavía un rótulo, y las tareas 10 a 19 las van sustituyendo una a una. Planificar y Operar
salen ya en su forma definitiva de esta fase, que es un esbozo.

**Ficheros:**
- Crear: `src/ui/screens/Inicio.tsx`, `Vuelos.tsx`, `Detalle.tsx`, `CerrarVuelo.tsx`
- Crear: `src/ui/screens/Planificar.tsx`, `Operar.tsx`
- Crear: `src/ui/screens/ajustes/Ajustes.tsx`, `MisDatos.tsx`, `Globos.tsx`, `Campos.tsx`, `Personas.tsx`, `Copia.tsx`
- Crear: `src/ui/screens/PrimerUso.tsx`
- Modificar: `src/app.tsx`

- [ ] **Paso 1: los ocho rótulos temporales**

Estos ocho ficheros existen para que el enrutador compile y se pueda navegar. **Cada uno se
sustituye entero** en la tarea que dice su comentario. No añadas nada más aquí.

`src/ui/screens/Inicio.tsx` (lo sustituye la Task 19):

```tsx
import { Screen } from '../components/Screen'

export function Inicio() {
  return <Screen title="Inicio" tab="inicio"><p class="dim" style="padding: 0 20px;">Pendiente</p></Screen>
}
```

`src/ui/screens/Vuelos.tsx` (lo sustituye la Task 16):

```tsx
import { Screen } from '../components/Screen'

export function Vuelos() {
  return <Screen title="Vuelos" tab="vuelos"><p class="dim" style="padding: 0 20px;">Pendiente</p></Screen>
}
```

`src/ui/screens/Detalle.tsx` (lo sustituye la Task 17):

```tsx
import { Sheet } from '../components/Screen'

export function Detalle({ flightId }: { flightId: string }) {
  return <Sheet title="Vuelo"><p class="dim" style="padding: 0 20px;">{flightId}</p></Sheet>
}
```

`src/ui/screens/CerrarVuelo.tsx` (lo sustituye la Task 15):

```tsx
import { Sheet } from '../components/Screen'

export function CerrarVuelo() {
  return <Sheet title="Cerrar vuelo"><p class="dim" style="padding: 0 20px;">Pendiente</p></Sheet>
}
```

`src/ui/screens/ajustes/Ajustes.tsx` (lo sustituye la Task 10):

```tsx
import { Screen } from '../../components/Screen'

export function Ajustes() {
  return <Screen title="Ajustes" tab="ajustes"><p class="dim" style="padding: 0 20px;">Pendiente</p></Screen>
}
```

`src/ui/screens/ajustes/MisDatos.tsx` (lo sustituye la Task 10):

```tsx
import { Sheet } from '../../components/Screen'

export function MisDatos() {
  return <Sheet title="Mis datos"><p class="dim" style="padding: 0 20px;">Pendiente</p></Sheet>
}
```

`src/ui/screens/ajustes/Globos.tsx` (lo sustituye la Task 11):

```tsx
import { Sheet } from '../../components/Screen'

export function Globos() {
  return <Sheet title="Globos"><p class="dim" style="padding: 0 20px;">Pendiente</p></Sheet>
}
```

`src/ui/screens/ajustes/Campos.tsx` (lo sustituye la Task 12):

```tsx
import { Sheet } from '../../components/Screen'

export function Campos() {
  return <Sheet title="Campos"><p class="dim" style="padding: 0 20px;">Pendiente</p></Sheet>
}
```

`src/ui/screens/ajustes/Personas.tsx` (lo sustituye la Task 13):

```tsx
import { Sheet } from '../../components/Screen'

export function Personas() {
  return <Sheet title="Personas"><p class="dim" style="padding: 0 20px;">Pendiente</p></Sheet>
}
```

`src/ui/screens/ajustes/Copia.tsx` (lo sustituye la Task 14):

```tsx
import { Sheet } from '../../components/Screen'

export function Copia() {
  return <Sheet title="Copia de seguridad"><p class="dim" style="padding: 0 20px;">Pendiente</p></Sheet>
}
```

- [ ] **Paso 2: Planificar, esbozo definitivo de la fase 1**

Crea `src/ui/screens/Planificar.tsx`. Es un esbozo honesto: dice qué va a hacer y qué no
hace todavía, y no finge un mapa que no existe.

```tsx
// src/ui/screens/Planificar.tsx
// Esbozo. El mapa de Leaflet y las llamadas a open-meteo son fase 1 tardia, y
// la deriva es fase 2. Esta pantalla existe para que la pestaña no lleve a una
// pagina en blanco, y para dejar escrito que el punto de despegue se elige
// libre y no de una lista.
import { Notice } from '../components/Notice'
import { Screen } from '../components/Screen'

const MODELOS = [
  'icon_eu', 'gfs_seamless', 'gem_seamless',
  'ukmo_global_deterministic_10km', 'meteofrance_arpege_europe', 'ecmwf_ifs025',
]

export function Planificar() {
  return (
    <Screen title="Planificar" tab="planificar">
      <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 16px;">
        <Notice tone="warn" title="Sin conectar todavia">
          El mapa y la consulta de viento llegan despues del cuaderno. Esta pantalla es
          hoy solo el sitio donde iran.
        </Notice>

        <div>
          <div class="cap">Que hara</div>
          <p class="muted" style="font-size: 14px; line-height: 1.5;">
            Se toca cualquier punto del mapa, no solo un campo guardado, y devuelve la
            prevision de viento a 925 y 900 hPa hora a hora. El punto de despegue se
            decide cada dia segun el viento, que es justo lo que esta pantalla informa.
          </p>
        </div>

        <div>
          <div class="cap">Los seis modelos</div>
          <div class="num muted" style="font-size: 13px; line-height: 1.7; margin-top: 6px;">
            {MODELOS.map(m => <div key={m}>{m}</div>)}
          </div>
          <p class="muted" style="font-size: 14px; line-height: 1.5;">
            La ultima columna dira cuantos de los seis coinciden. Cuando bajan, el
            pronostico no vale.
          </p>
        </div>

        <Notice tone="info">
          La deriva llega en la fase 2, con el puerto de trayectoria_globo.py. Nada de
          esto sustituye al globo piloto.
        </Notice>
      </div>
    </Screen>
  )
}
```

- [ ] **Paso 3: Operar, esbozo definitivo de la fase 1**

Crea `src/ui/screens/Operar.tsx`:

```tsx
// src/ui/screens/Operar.tsx
// Esbozo.
//
// CRITICAL: aqui NO se escribe contenido de checklist. Una checklist de globo
// es un documento de seguridad y su texto se transcribe del Manual de Vuelo
// MV04r30 de Ultramagic en la fase 3, y lo valida el piloto contra el papel.
// Lo que hay aqui es el indice de lo que se va a transcribir, con el numero de
// bloque del manual, y un aviso que no se quita hasta que este transcrito.
import { Notice } from '../components/Notice'
import { Screen } from '../components/Screen'

const DEL_MANUAL: { titulo: string; fuente: string; grave?: boolean }[] = [
  { titulo: 'Chequeo prevuelo', fuente: 'Apendice C, nueve bloques' },
  { titulo: 'Preparacion', fuente: 'Seccion 4.5' },
  { titulo: 'Inflado', fuente: 'Seccion 4.7' },
  { titulo: 'Antes del despegue', fuente: 'Seccion 4.8.1' },
  { titulo: 'Briefing de pasajeros', fuente: 'Seccion 4.8.2' },
  { titulo: 'Despegue', fuente: 'Seccion 4.9' },
  { titulo: 'Control en vuelo', fuente: 'Seccion 4.10' },
  { titulo: 'Aterrizaje', fuente: 'Seccion 4.11' },
  { titulo: 'Emergencias', fuente: 'Seccion 3, lineas electricas y FDS', grave: true },
]

export function Operar() {
  return (
    <Screen title="Operar" tab="operar">
      <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 16px;">
        <Notice tone="warn" title="Sin transcribir. No usar en vuelo.">
          El contenido se copia del Manual de Vuelo MV04r30 y lo validas contra el papel.
          Hasta entonces esto es solo la estructura.
        </Notice>

        <div>
          <div class="cap">Del manual, pendiente de transcribir</div>
          <div style="margin-top: 8px;">
            {DEL_MANUAL.map(c => (
              <div
                key={c.titulo}
                style={`
                  display: flex; align-items: center; gap: 11px; padding: 12px 0;
                  border-bottom: 1px solid ${c.grave === true ? 'var(--danger-border)' : 'var(--border)'};
                `}
              >
                <div style="flex-grow: 1;">
                  <div style="font-size: 15px;">{c.titulo}</div>
                  <div class="num dim" style="font-size: 12px; margin-top: 2px;">{c.fuente}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  )
}
```

- [ ] **Paso 4: la pantalla de primer uso**

Crea `src/ui/screens/PrimerUso.tsx`. Cubre los dos casos del spec §8: no hay documento
local, y el almacenamiento se ha borrado.

```tsx
// src/ui/screens/PrimerUso.tsx
import { useState } from 'preact/hooks'
import { Notice } from '../components/Notice'
import { documentoNuevo, useStore } from '../state'

export function PrimerUso() {
  const { cfg, replace, restaurar } = useStore()
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div style="
      padding: calc(24px + env(safe-area-inset-top)) 20px 24px 20px;
      display: flex; flex-direction: column; gap: 18px; min-height: 100dvh;
    ">
      <div>
        <div class="cap">Logbook BPL</div>
        <h1 style="margin: 8px 0 0 0; font-size: 26px; font-weight: 600;">
          No hay ningun cuaderno en este telefono
        </h1>
      </div>

      <p class="muted" style="font-size: 15px; line-height: 1.5;">
        O es la primera vez que abres la app, o el navegador ha borrado el almacenamiento.
        Si ya tienes copia en GitHub, restaurala. Si no, empieza de cero.
      </p>

      {error !== null && <Notice tone="danger" title="No se ha podido restaurar">{error}</Notice>}

      <button
        class="primary"
        disabled={cfg === null || trabajando}
        onClick={() => {
          setError(null)
          setTrabajando(true)
          void restaurar().finally(() => setTrabajando(false))
        }}
      >
        {trabajando ? 'Restaurando...' : 'Restaurar desde GitHub'}
      </button>
      {cfg === null && (
        <div class="lbl dim" style="margin-top: -10px;">
          No hay token guardado en este telefono, asi que no hay de donde restaurar.
        </div>
      )}

      <button class="secondary" disabled={trabajando} onClick={() => replace(documentoNuevo())}>
        Empezar de cero
      </button>
    </div>
  )
}
```

`WARNING:` `restaurar()` no lanza, deja el fallo en `sync`. Esta pantalla usa su propio
`error` solo para el caso de que algún día lance. La Task 14 enseña el mensaje real de
`sync` en Ajustes.

- [ ] **Paso 5: el despachador de rutas**

Sustituye `src/app.tsx` entero:

```tsx
// src/app.tsx
import { PrimerUso } from './ui/screens/PrimerUso'
import { CerrarVuelo } from './ui/screens/CerrarVuelo'
import { Detalle } from './ui/screens/Detalle'
import { Inicio } from './ui/screens/Inicio'
import { Operar } from './ui/screens/Operar'
import { Planificar } from './ui/screens/Planificar'
import { Vuelos } from './ui/screens/Vuelos'
import { Ajustes } from './ui/screens/ajustes/Ajustes'
import { Campos } from './ui/screens/ajustes/Campos'
import { Copia } from './ui/screens/ajustes/Copia'
import { Globos } from './ui/screens/ajustes/Globos'
import { MisDatos } from './ui/screens/ajustes/MisDatos'
import { Personas } from './ui/screens/ajustes/Personas'
import { useRoute } from './ui/router'
import { StoreProvider, useStore } from './ui/state'

function Ruta() {
  const ruta = useRoute()
  switch (ruta.name) {
    case 'inicio': return <Inicio />
    case 'vuelos': return <Vuelos />
    case 'detalle': return <Detalle flightId={ruta.flightId} />
    case 'cerrar': return <CerrarVuelo />
    case 'planificar': return <Planificar />
    case 'operar': return <Operar />
    case 'ajustes': return <Ajustes />
    case 'ajustesPiloto': return <MisDatos />
    case 'ajustesGlobos': return <Globos />
    case 'ajustesCampos': return <Campos />
    case 'ajustesPersonas': return <Personas />
    case 'ajustesCopia': return <Copia />
  }
}

function Contenido() {
  const { arranque } = useStore()
  if (arranque === 'cargando') {
    return <p class="dim" style="padding: 40px 20px;">Cargando el cuaderno...</p>
  }
  if (arranque === 'sin_documento') return <PrimerUso />
  return <Ruta />
}

export function App() {
  return <StoreProvider><Contenido /></StoreProvider>
}
```

- [ ] **Paso 6: comprobar que compila y que se navega**

```bash
npx tsc -b && npm test && npm run dev
```

Esperado: `tsc` sin salida, pruebas en verde, y en el navegador se pueden pulsar las cinco
pestañas y llegar a las doce rutas escribiendo el hash a mano. Prueba también
`#/ajustes/inventado`: tiene que caer en Inicio, no en blanco.

- [ ] **Paso 7: commit**

```bash
git add src/app.tsx src/ui/screens
git commit -m "feat(ui): armazon de rutas, primer uso, y esbozos de Planificar y Operar"
```

---

## Task 10: Ajustes, índice y Mis datos

**Ficheros:**
- Crear: `src/ui/today.ts`
- Sustituir: `src/ui/screens/ajustes/Ajustes.tsx`
- Sustituir: `src/ui/screens/ajustes/MisDatos.tsx`

- [ ] **Paso 1: la fecha de hoy, en un solo sitio**

Crea `src/ui/today.ts`:

```ts
// src/ui/today.ts
import { toIsoDate } from '../domain/dates'

/**
 * La fecha local de hoy, "YYYY-MM-DD".
 *
 * Unico punto de la app que lee el reloj. El dominio recibe siempre `asOf`
 * como parametro para poder probarse; si alguna funcion de dominio empezara a
 * llamar aqui, dejaria de ser pura y las 174 pruebas dejarian de valer.
 */
export function hoy(): string {
  return toIsoDate(new Date())
}
```

- [ ] **Paso 2: el índice de Ajustes**

Sustituye `src/ui/screens/ajustes/Ajustes.tsx` entero:

```tsx
// src/ui/screens/ajustes/Ajustes.tsx
import { currency } from '../../../domain/currency'
import { Icon } from '../../components/Icon'
import { NavRow } from '../../components/Field'
import { Screen, SectionTitle } from '../../components/Screen'
import { hrefOf } from '../../router'
import { useDoc, useStore } from '../../state'
import { hoy } from '../../today'

/**
 * Los requisitos que la app NO evalua nunca.
 *
 * Se leen del propio dominio y no se reescriben aqui. Si algun dia se modela
 * uno, desaparece de esta pantalla solo, sin que nadie se acuerde de venir a
 * borrarlo. La clase da igual: `notModelled` es la misma lista siempre.
 */
function NoComprobado() {
  const doc = useDoc()
  const lista = currency(doc, hoy(), 'hot_air').notModelled
  return (
    <div class="card" style="margin: 0 20px;">
      <ul class="muted" style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.55;">
        {lista.map(t => <li key={t} style="margin-bottom: 6px;">{t}</li>)}
      </ul>
      <div class="dim" style="font-size: 13px; margin-top: 8px;">Compruebalo tu.</div>
    </div>
  )
}

const RESUMEN: Record<string, string> = {
  sin_configurar: 'Sin configurar',
  al_dia: 'Al dia',
  pendiente: 'Cambios sin subir',
  subiendo: 'Subiendo...',
  conflicto: 'Conflicto sin resolver',
  error: 'Con error',
}

export function Ajustes() {
  const doc = useDoc()
  const { sync, cfg } = useStore()

  return (
    <Screen title="Ajustes" tab="ajustes">
      <SectionTitle>Copia de seguridad</SectionTitle>
      <div style="padding: 0 20px;">
        <a href={hrefOf({ name: 'ajustesCopia' })} style="text-decoration: none; color: inherit;">
          <div class="card" style="display: flex; align-items: center; gap: 11px;">
            <Icon
              name={sync.kind === 'al_dia' ? 'check' : 'nube'}
              size={17}
              color={sync.kind === 'al_dia' ? 'var(--ok)' : 'var(--dim)'}
              width={2.4}
            />
            <div style="flex-grow: 1; min-width: 0;">
              <div style="font-size: 15px;">
                {cfg === null ? 'Sin repositorio' : `${cfg.owner}/${cfg.repo}`}
              </div>
              <div class="dim" style="font-size: 13px; margin-top: 3px;">
                {RESUMEN[sync.kind]}
              </div>
            </div>
            <Icon name="derecha" size={16} color="var(--dim)" width={2.4} />
          </div>
        </a>
      </div>

      <SectionTitle>Catalogos</SectionTitle>
      <div style="padding: 0 20px;">
        <NavRow
          icon={<Icon name="globo" size={18} color="var(--dim)" width={2} />}
          label="Globos"
          value={String(doc.balloons.length)}
          href={hrefOf({ name: 'ajustesGlobos' })}
        />
        <NavRow
          icon={<Icon name="pin" size={18} color="var(--dim)" width={2} />}
          label="Campos"
          value={String(doc.sites.length)}
          href={hrefOf({ name: 'ajustesCampos' })}
        />
        <NavRow
          icon={<Icon name="persona" size={18} color="var(--dim)" width={2} />}
          label="Personas"
          value={String(doc.people.length)}
          href={hrefOf({ name: 'ajustesPersonas' })}
        />
        <NavRow
          icon={<Icon name="lapiz" size={18} color="var(--dim)" width={2} />}
          label="Mis datos y licencia"
          href={hrefOf({ name: 'ajustesPiloto' })}
        />
      </div>

      <SectionTitle>Lo que esta app no comprueba</SectionTitle>
      <NoComprobado />
      <div style="height: 24px;"></div>
    </Screen>
  )
}
```

- [ ] **Paso 3: Mis datos**

Sustituye `src/ui/screens/ajustes/MisDatos.tsx` entero:

```tsx
// src/ui/screens/ajustes/MisDatos.tsx
import { Notice } from '../../components/Notice'
import { Sheet } from '../../components/Screen'
import { TextField } from '../../components/Field'
import { useDoc, useStore } from '../../state'
import { hoy } from '../../today'
import type { LogbookDoc, Pilot } from '../../../domain/types'

/**
 * Cambia un campo del piloto.
 *
 * El nombre se copia ademas a la Person del titular. Van juntos porque
 * `pilot.personId` apunta a esa persona, y es la que `hasRoleAndIsNotThePilot`
 * usa para impedir que uno se autoexamine. Si se quedan descolgados, la lista
 * de personas enseña "Sin nombre" para el dueño del cuaderno.
 */
function cambiar(doc: LogbookDoc, campo: Partial<Pilot>): LogbookDoc {
  const pilot = { ...doc.pilot, ...campo }
  const people = campo.name === undefined
    ? doc.people
    : doc.people.map(p => (p.id === pilot.personId ? { ...p, name: campo.name as string } : p))
  return { ...doc, pilot, people }
}

export function MisDatos() {
  const doc = useDoc()
  const { update } = useStore()
  const p = doc.pilot
  const medicoCaducado = p.medicalExpiry !== null && p.medicalExpiry < hoy()

  return (
    <Sheet title="Mis datos y licencia">
      <div style="padding: 8px 20px 32px 20px;">
        <TextField
          label="Nombre"
          value={p.name}
          onChange={v => update(d => cambiar(d, { name: v }))}
        />
        <TextField
          label="Direccion"
          value={p.address}
          hint="AMC1 BFCL.050(a)(1) la exige en el cuaderno, por raro que parezca."
          onChange={v => update(d => cambiar(d, { address: v }))}
        />
        <TextField
          label="Numero de licencia"
          value={p.licenceNumber ?? ''}
          placeholder="Sin licencia todavia"
          onChange={v => update(d => cambiar(d, { licenceNumber: v.trim() === '' ? null : v }))}
        />
        <TextField
          label="Caducidad del reconocimiento medico"
          type="date"
          value={p.medicalExpiry ?? ''}
          onChange={v => update(d => cambiar(d, { medicalExpiry: v === '' ? null : v }))}
        />
        {medicoCaducado && (
          <div style="margin: -8px 0 18px 0;">
            <Notice tone="warn" title="El reconocimiento medico ha caducado">
              BFCL.045(a)(2) exige llevar un certificado medico valido para ejercer las
              atribuciones.
            </Notice>
          </div>
        )}
        <TextField
          label="Fecha de emision de la licencia"
          type="date"
          value={p.licenceIssued ?? ''}
          hint={
            'Mientras este vacio eres alumno y la vigencia de BFCL.160 no te aplica, asi '
            + 'que Inicio no enseña ningun contador reglamentario. Al rellenarla aparece '
            + 'el panel de vigencia.'
          }
          onChange={v => update(d => cambiar(d, { licenceIssued: v === '' ? null : v }))}
        />
      </div>
    </Sheet>
  )
}
```

- [ ] **Paso 4: comprobar**

```bash
npx tsc -b && npm run dev
```

Esperado: en Ajustes se ven los tres catálogos con sus cuentas, y la lista de lo no
comprobado tiene **seis** puntos, que son los de `NO_MODELADO` en
`src/domain/currency.ts`. Si en esa lista aparece algo sobre una ATO o sobre nueve
exámenes, es que alguien ha copiado el texto de la maqueta en lugar de leerlo del dominio.

En Mis datos, escribe un nombre y vuelve a Ajustes y entra en Personas: el titular tiene
que llevar ese nombre.

- [ ] **Paso 5: commit**

```bash
git add src/ui/today.ts src/ui/screens/ajustes/Ajustes.tsx src/ui/screens/ajustes/MisDatos.tsx
git commit -m "feat(ui): indice de Ajustes y datos del piloto"
```

---

## Task 11: Ajustes, catálogo de globos

El grupo se enseña derivado del volumen, en vivo, porque es la razón de ser de
`groupFromVolume` y porque el usuario tiene que ver que 3.401 m³ ya no es grupo A.

**Ficheros:**
- Sustituir: `src/ui/screens/ajustes/Globos.tsx`

- [ ] **Paso 1: escribir la pantalla**

```tsx
// src/ui/screens/ajustes/Globos.tsx
import { useState } from 'preact/hooks'
import { groupFromVolume } from '../../../domain/balloon'
import type { Balloon, BalloonClass } from '../../../domain/types'
import { NumberField, SelectField, TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { Notice } from '../../components/Notice'
import { Sheet } from '../../components/Screen'
import { labelClass, labelGroup } from '../../format'
import { newId } from '../../ids'
import { useDoc, useStore } from '../../state'

const CLASES: BalloonClass[] = ['hot_air', 'gas', 'mixed', 'hot_air_airship']

function nuevoGlobo(): Balloon {
  return {
    id: newId(),
    registration: '',
    manufacturer: '',
    model: '',
    balloonClass: 'hot_air',
    envelopeVolumeM3: 0,
  }
}

/**
 * El grupo, derivado y nunca guardado.
 *
 * `groupFromVolume` lanza con un volumen que no sea positivo, asi que un globo
 * a medio meter no puede pasar por ahi. Se dice que falta el volumen en lugar
 * de enseñar un grupo inventado.
 */
function Grupo({ m3, clase }: { m3: number; clase: BalloonClass }) {
  if (clase !== 'hot_air') {
    return <span class="dim">Los grupos A a D solo aplican al aire caliente</span>
  }
  if (!(m3 > 0)) return <span class="dim">Falta el volumen de envolvente</span>
  return <span>Grupo {labelGroup(groupFromVolume(m3))}</span>
}

function Editor({ balloon, onChange, onDelete }: {
  balloon: Balloon
  onChange: (b: Balloon) => void
  onDelete: () => void
}) {
  return (
    <div class="outline" style="margin-bottom: 14px;">
      <TextField
        label="Matricula"
        value={balloon.registration}
        placeholder="EC-KMU"
        onChange={v => onChange({ ...balloon, registration: v.toUpperCase() })}
      />
      <TextField
        label="Fabricante"
        value={balloon.manufacturer}
        placeholder="Ultramagic"
        onChange={v => onChange({ ...balloon, manufacturer: v })}
      />
      <TextField
        label="Modelo"
        value={balloon.model}
        placeholder="M-105"
        onChange={v => onChange({ ...balloon, model: v })}
      />
      <SelectField
        label="Clase"
        value={balloon.balloonClass}
        options={CLASES.map(c => ({ value: c, label: labelClass(c) }))}
        onChange={v => onChange({ ...balloon, balloonClass: (v ?? 'hot_air') as BalloonClass })}
        hint="BFCL.010 define cuatro. Un dirigible de aire caliente NO es un globo de aire caliente."
      />
      <NumberField
        label="Volumen de envolvente"
        unit="m³"
        value={balloon.envelopeVolumeM3 === 0 ? null : balloon.envelopeVolumeM3}
        onChange={v => onChange({ ...balloon, envelopeVolumeM3: v ?? 0 })}
      />
      <div class="lbl" style="margin: -8px 0 14px 0;">
        <Grupo m3={balloon.envelopeVolumeM3} clase={balloon.balloonClass} />
      </div>
      <button
        class="linkish"
        style="color: var(--danger); display: flex; align-items: center; gap: 6px;"
        onClick={onDelete}
      >
        <Icon name="papelera" size={15} color="var(--danger)" />
        Borrar este globo
      </button>
    </div>
  )
}

export function Globos() {
  const doc = useDoc()
  const { update } = useStore()
  const [abierto, setAbierto] = useState<string | null>(null)

  const usados = new Set(doc.flights.map(f => f.balloonId))

  return (
    <Sheet
      title="Globos"
      action={
        <button
          class="linkish"
          onClick={() => {
            const b = nuevoGlobo()
            update(d => ({ ...d, balloons: [...d.balloons, b] }))
            setAbierto(b.id)
          }}
        >
          Añadir
        </button>
      }
    >
      <div style="padding: 8px 20px 32px 20px;">
        {doc.balloons.length === 0 && (
          <Notice tone="info" title="Ningun globo todavia">
            Sin globo no se puede anotar un vuelo: el cuaderno exige fabricante, modelo y
            matricula por AMC1 BFCL.050(a)(2).
          </Notice>
        )}

        {doc.balloons.map(b => (
          <div key={b.id}>
            <button
              class="linkish"
              style="
                display: flex; align-items: center; gap: 10px; width: 100%;
                padding: 13px 0; border-bottom: 1px solid var(--border); color: var(--text);
              "
              onClick={() => setAbierto(abierto === b.id ? null : b.id)}
            >
              <span class="num" style="font-size: 16px;">
                {b.registration === '' ? 'Sin matricula' : b.registration}
              </span>
              <span class="dim" style="flex-grow: 1; text-align: left; font-size: 14px;">
                {b.model}
              </span>
              <Icon name={abierto === b.id ? 'arriba' : 'abajo'} size={16} color="var(--dim)" width={2.4} />
            </button>

            {abierto === b.id && (
              <div style="padding-top: 14px;">
                <Editor
                  balloon={b}
                  onChange={nuevo => update(d => ({
                    ...d,
                    balloons: d.balloons.map(x => (x.id === nuevo.id ? nuevo : x)),
                  }))}
                  onDelete={() => {
                    if (usados.has(b.id)) {
                      alert(
                        'Este globo figura en algun vuelo. Borrarlo dejaria esos vuelos sin '
                        + 'globo, y la vigencia los excluiria. Cambia el globo de esos vuelos '
                        + 'antes de borrarlo.',
                      )
                      return
                    }
                    if (!confirm(`Borrar ${b.registration || 'este globo'}?`)) return
                    update(d => ({ ...d, balloons: d.balloons.filter(x => x.id !== b.id) }))
                    setAbierto(null)
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  )
}
```

`WARNING:` el borrado usa `confirm()` y `alert()` del navegador. Está comprobado que dentro
de un iframe de artefacto `confirm()` devuelve `false` sin avisar, pero **esta app no se
sirve en un iframe**, se sirve en GitHub Pages y se instala en la pantalla de inicio, donde
funcionan. Aun así, en la lista de verificación manual de la Task 20 hay un punto que lo
comprueba en el iPhone real.

- [ ] **Paso 2: comprobar**

```bash
npx tsc -b && npm run dev
```

Esperado: añadir un globo, poner 3.400 m³ y ver «Grupo A, hasta 3.400 m³». Cambiar a 3.401
y ver «Grupo B». Cambiar la clase a gas y ver que el grupo desaparece con su explicación.

- [ ] **Paso 3: commit**

```bash
git add src/ui/screens/ajustes/Globos.tsx
git commit -m "feat(ui): catalogo de globos, con el grupo derivado en vivo"
```

---

## Task 12: Ajustes, catálogo de campos

**Ficheros:**
- Sustituir: `src/ui/screens/ajustes/Campos.tsx`

- [ ] **Paso 1: escribir la pantalla**

```tsx
// src/ui/screens/ajustes/Campos.tsx
import { useState } from 'preact/hooks'
import type { PermitStatus, Site } from '../../../domain/types'
import { NumberField, SelectField, TextArea, TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { Sheet } from '../../components/Screen'
import { formatCoords, labelPermit } from '../../format'
import { newId } from '../../ids'
import { useDoc, useStore } from '../../state'

const PERMISOS: PermitStatus[] = ['unknown', 'granted', 'denied', 'not_needed']

function nuevoCampo(): Site {
  return {
    id: newId(), name: '', lat: 0, lon: 0, elevationM: null,
    permitStatus: 'unknown', accessNotes: '',
  }
}

function Editor({ site, onChange, onDelete }: {
  site: Site; onChange: (s: Site) => void; onDelete: () => void
}) {
  return (
    <div class="outline" style="margin-bottom: 14px;">
      <TextField label="Nombre" value={site.name} onChange={v => onChange({ ...site, name: v })} />
      <NumberField
        label="Latitud" step="0.0001" value={site.lat}
        onChange={v => onChange({ ...site, lat: v ?? 0 })}
      />
      <NumberField
        label="Longitud" step="0.0001" value={site.lon}
        onChange={v => onChange({ ...site, lon: v ?? 0 })}
      />
      <NumberField
        label="Elevacion" unit="m" value={site.elevationM}
        onChange={v => onChange({ ...site, elevationM: v })}
      />
      <SelectField
        label="Permiso del propietario"
        value={site.permitStatus}
        options={PERMISOS.map(p => ({ value: p, label: labelPermit(p) }))}
        onChange={v => onChange({ ...site, permitStatus: (v ?? 'unknown') as PermitStatus })}
      />
      <TextArea
        label="Notas de acceso"
        value={site.accessNotes}
        placeholder="Por donde entra el coche de recuperacion, cancelas, estado del camino"
        onChange={v => onChange({ ...site, accessNotes: v })}
      />
      <button
        class="linkish"
        style="color: var(--danger); display: flex; align-items: center; gap: 6px;"
        onClick={onDelete}
      >
        <Icon name="papelera" size={15} color="var(--danger)" />
        Borrar este campo
      </button>
    </div>
  )
}

export function Campos() {
  const doc = useDoc()
  const { update } = useStore()
  const [abierto, setAbierto] = useState<string | null>(null)

  // Un campo referido por un vuelo no se borra: el vuelo se quedaria sin sitio
  // de despegue y el titulo de la tarjeta pasaria a "Sin indicar".
  const usados = new Set<string>()
  for (const f of doc.flights) {
    if (f.departure.siteId !== null) usados.add(f.departure.siteId)
    if (f.arrival.siteId !== null) usados.add(f.arrival.siteId)
  }

  return (
    <Sheet
      title="Campos"
      action={
        <button
          class="linkish"
          onClick={() => {
            const s = nuevoCampo()
            update(d => ({ ...d, sites: [...d.sites, s] }))
            setAbierto(s.id)
          }}
        >
          Añadir
        </button>
      }
    >
      <div style="padding: 8px 20px 32px 20px;">
        {doc.sites.map(s => (
          <div key={s.id}>
            <button
              class="linkish"
              style="
                display: flex; align-items: center; gap: 10px; width: 100%;
                padding: 13px 0; border-bottom: 1px solid var(--border); color: var(--text);
              "
              onClick={() => setAbierto(abierto === s.id ? null : s.id)}
            >
              <span style="font-size: 16px;">{s.name === '' ? 'Campo sin nombre' : s.name}</span>
              <span class="num dim" style="flex-grow: 1; text-align: left; font-size: 13px;">
                {formatCoords({ lat: s.lat, lon: s.lon })}
              </span>
              <Icon name={abierto === s.id ? 'arriba' : 'abajo'} size={16} color="var(--dim)" width={2.4} />
            </button>

            {abierto === s.id && (
              <div style="padding-top: 14px;">
                <Editor
                  site={s}
                  onChange={nuevo => update(d => ({
                    ...d, sites: d.sites.map(x => (x.id === nuevo.id ? nuevo : x)),
                  }))}
                  onDelete={() => {
                    if (usados.has(s.id)) {
                      alert('Este campo figura en algun vuelo. Cambia esos vuelos antes de borrarlo.')
                      return
                    }
                    if (!confirm(`Borrar ${s.name || 'este campo'}?`)) return
                    update(d => ({ ...d, sites: d.sites.filter(x => x.id !== s.id) }))
                    setAbierto(null)
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  )
}
```

- [ ] **Paso 2: comprobar**

```bash
npx tsc -b && npm run dev
```

Esperado: los tres campos sembrados, Igualada, Tàrrega y Agramunt, con sus coordenadas.

- [ ] **Paso 3: commit**

```bash
git add src/ui/screens/ajustes/Campos.tsx
git commit -m "feat(ui): catalogo de campos de despegue"
```

---

## Task 13: Ajustes, catálogo de personas

Los roles no son decoración. `hasRoleAndIsNotThePilot` los mira para decidir si una
verificación de competencia vale, así que la pantalla tiene que explicarlo.

**Ficheros:**
- Sustituir: `src/ui/screens/ajustes/Personas.tsx`

- [ ] **Paso 1: escribir la pantalla**

```tsx
// src/ui/screens/ajustes/Personas.tsx
import { useState } from 'preact/hooks'
import type { Person, PersonRole } from '../../../domain/types'
import { TextField, Toggle } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { Notice } from '../../components/Notice'
import { Sheet } from '../../components/Screen'
import { labelRole } from '../../format'
import { newId } from '../../ids'
import { useDoc, useStore } from '../../state'

const ROLES: PersonRole[] = ['instructor', 'examiner', 'pilot', 'crew', 'passenger']

const PISTA: Partial<Record<PersonRole, string>> = {
  instructor: 'Sin este rol, un vuelo de instruccion no cuenta para la vigencia de 48 meses.',
  examiner: 'Sin este rol, una verificacion de competencia no cuenta. BFCL.160(c) exige un FE(B).',
}

function nuevaPersona(): Person {
  return { id: newId(), name: '', roles: [], licenceNumber: null }
}

export function Personas() {
  const doc = useDoc()
  const { update } = useStore()
  const [abierto, setAbierto] = useState<string | null>(null)

  const usadas = new Set<string>()
  for (const f of doc.flights) {
    usadas.add(f.picId)
    if (f.instructorId !== null) usadas.add(f.instructorId)
    if (f.check !== null) usadas.add(f.check.examinerId)
    for (const id of f.crewIds) usadas.add(id)
    for (const id of f.passengerIds) usadas.add(id)
  }

  return (
    <Sheet
      title="Personas"
      action={
        <button
          class="linkish"
          onClick={() => {
            const p = nuevaPersona()
            update(d => ({ ...d, people: [...d.people, p] }))
            setAbierto(p.id)
          }}
        >
          Añadir
        </button>
      }
    >
      <div style="padding: 8px 20px 32px 20px;">
        <div style="margin-bottom: 16px;">
          <Notice tone="info" title="Los roles deciden que cuenta">
            La app comprueba quien firma y quien examina, no solo que haya un nombre. Un
            examinador sin el rol de examinador no valida una verificacion de competencia.
          </Notice>
        </div>

        {doc.people.map(p => {
          const esElTitular = p.id === doc.pilot.personId
          return (
            <div key={p.id}>
              <button
                class="linkish"
                style="
                  display: flex; align-items: center; gap: 10px; width: 100%;
                  padding: 13px 0; border-bottom: 1px solid var(--border); color: var(--text);
                "
                onClick={() => setAbierto(abierto === p.id ? null : p.id)}
              >
                <span style="font-size: 16px;">
                  {p.name === '' ? 'Sin nombre' : p.name}
                  {esElTitular && <span class="dim" style="font-size: 13px;"> · tu</span>}
                </span>
                <span class="dim" style="flex-grow: 1; text-align: left; font-size: 13px;">
                  {p.roles.map(labelRole).join(', ')}
                </span>
                <Icon name={abierto === p.id ? 'arriba' : 'abajo'} size={16} color="var(--dim)" width={2.4} />
              </button>

              {abierto === p.id && (
                <div class="outline" style="margin: 14px 0;">
                  <TextField
                    label="Nombre"
                    value={p.name}
                    onChange={v => update(d => ({
                      ...d,
                      people: d.people.map(x => (x.id === p.id ? { ...x, name: v } : x)),
                      pilot: esElTitular ? { ...d.pilot, name: v } : d.pilot,
                    }))}
                  />
                  <TextField
                    label="Numero de licencia"
                    value={p.licenceNumber ?? ''}
                    onChange={v => update(d => ({
                      ...d,
                      people: d.people.map(x => (
                        x.id === p.id ? { ...x, licenceNumber: v.trim() === '' ? null : v } : x
                      )),
                    }))}
                  />
                  <div class="cap" style="margin-bottom: 4px;">Roles</div>
                  {ROLES.map(r => (
                    <Toggle
                      key={r}
                      label={labelRole(r)}
                      hint={PISTA[r]}
                      checked={p.roles.includes(r)}
                      onChange={marcado => update(d => ({
                        ...d,
                        people: d.people.map(x => (
                          x.id === p.id
                            ? {
                              ...x,
                              roles: marcado
                                ? [...x.roles, r]
                                : x.roles.filter(y => y !== r),
                            }
                            : x
                        )),
                      }))}
                    />
                  ))}

                  {esElTitular ? (
                    <div class="lbl dim" style="margin-top: 14px; line-height: 1.4;">
                      Esta persona eres tu. No se puede borrar: el documento la necesita para
                      poder decir que un examinador NO eres tu mismo.
                    </div>
                  ) : (
                    <button
                      class="linkish"
                      style="color: var(--danger); display: flex; align-items: center; gap: 6px; margin-top: 14px;"
                      onClick={() => {
                        if (usadas.has(p.id)) {
                          alert('Esta persona figura en algun vuelo. Cambia esos vuelos antes de borrarla.')
                          return
                        }
                        if (!confirm(`Borrar a ${p.name || 'esta persona'}?`)) return
                        update(d => ({ ...d, people: d.people.filter(x => x.id !== p.id) }))
                        setAbierto(null)
                      }}
                    >
                      <Icon name="papelera" size={15} color="var(--danger)" />
                      Borrar
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
```

- [ ] **Paso 2: comprobar**

```bash
npx tsc -b && npm run dev
```

Esperado: el titular sale marcado como «· tú» y no ofrece borrarse. Al añadir a un
instructor y marcarle el rol, el rótulo de la fila lo refleja.

- [ ] **Paso 3: commit**

```bash
git add src/ui/screens/ajustes/Personas.tsx
git commit -m "feat(ui): catalogo de personas con sus roles"
```

---

## Task 14: Ajustes, copia de seguridad

Token, empuje manual, restauración y **la pantalla de conflicto**, que es la única parte de
la sincronización donde una decisión mal presentada borra horas voladas.

**Ficheros:**
- Sustituir: `src/ui/screens/ajustes/Copia.tsx`

- [ ] **Paso 1: escribir la pantalla**

```tsx
// src/ui/screens/ajustes/Copia.tsx
import { useState } from 'preact/hooks'
import type { GithubConfig } from '../../../sync/github'
import { TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { Notice } from '../../components/Notice'
import { Sheet } from '../../components/Screen'
import { useDoc, useStore } from '../../state'

const VACIA: GithubConfig = { owner: '', repo: 'bpl-logbook', branch: 'main', token: '' }

/**
 * Pantalla de conflicto.
 *
 * Se enseña sola, por encima de todo lo demas, y las dos opciones dicen que se
 * pierde con cada una. Nunca hay una tercera opcion de fusionar: el spec §7 lo
 * prohibe y la razon es que una fusion automatica de un cuaderno de vuelo
 * puede borrar horas voladas sin que nadie se entere.
 */
function Conflicto() {
  const { resolverConflicto } = useStore()
  const doc = useDoc()
  const [trabajando, setTrabajando] = useState(false)

  const hacer = (cual: 'local' | 'remoto') => {
    const texto = cual === 'local'
      ? 'Se subira lo de este telefono y se PERDERA lo que haya en GitHub. Seguro?'
      : 'Se bajara lo de GitHub y se PERDERA lo que haya en este telefono. Seguro?'
    if (!confirm(texto)) return
    setTrabajando(true)
    void resolverConflicto(cual).finally(() => setTrabajando(false))
  }

  return (
    <div style="margin-bottom: 20px;">
      <Notice tone="danger" title="Conflicto: el repositorio ha cambiado por otro lado">
        Alguien ha escrito el cuaderno desde otro dispositivo. La app no fusiona nunca,
        asi que tienes que elegir una de las dos versiones enteras.
      </Notice>
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
        <button class="secondary" disabled={trabajando} onClick={() => hacer('local')}>
          Quedarme con este telefono, {doc.flights.length} vuelos
        </button>
        <button class="secondary" disabled={trabajando} onClick={() => hacer('remoto')}>
          Quedarme con lo de GitHub
        </button>
      </div>
    </div>
  )
}

export function Copia() {
  const doc = useDoc()
  const { cfg, setCfg, sync, pushNow, restaurar, sinGuardar } = useStore()
  const [borrador, setBorrador] = useState<GithubConfig>(cfg ?? VACIA)
  const [trabajando, setTrabajando] = useState(false)

  const completa = borrador.owner.trim() !== ''
    && borrador.repo.trim() !== ''
    && borrador.branch.trim() !== ''
    && borrador.token.trim() !== ''

  return (
    <Sheet title="Copia de seguridad">
      <div style="padding: 8px 20px 32px 20px;">
        {sync.kind === 'conflicto' && <Conflicto />}

        {sync.kind === 'error' && (
          <div style="margin-bottom: 20px;">
            <Notice tone="warn" title="La ultima subida ha fallado">{sync.mensaje}</Notice>
          </div>
        )}

        <div class="card" style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <Icon
              name={sync.kind === 'al_dia' ? 'check' : 'nube'}
              size={17}
              color={sync.kind === 'al_dia' ? 'var(--ok)' : 'var(--dim)'}
              width={2.4}
            />
            <div style="flex-grow: 1; font-size: 15px;">
              {cfg === null ? 'Sin repositorio configurado' : `${cfg.owner}/${cfg.repo}`}
            </div>
          </div>
          <div class="num dim" style="font-size: 13px; margin-top: 7px;">
            {doc.flights.length} vuelos · {sinGuardar === 0 ? 'guardado' : `${sinGuardar} cambios sin guardar`}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <Notice tone="info" title="El cuaderno funciona entero sin esto">
            La copia en GitHub es para no perder los datos si el telefono se pierde o si
            el navegador borra el almacenamiento. Sin token, la app sigue anotando vuelos.
          </Notice>
        </div>

        <TextField
          label="Cuenta de GitHub"
          value={borrador.owner}
          placeholder="didachf"
          onChange={v => setBorrador({ ...borrador, owner: v.trim() })}
        />
        <TextField
          label="Repositorio privado"
          value={borrador.repo}
          placeholder="bpl-logbook"
          onChange={v => setBorrador({ ...borrador, repo: v.trim() })}
        />
        <TextField
          label="Rama"
          value={borrador.branch}
          placeholder="main"
          onChange={v => setBorrador({ ...borrador, branch: v.trim() })}
        />
        <TextField
          label="Token"
          value={borrador.token}
          placeholder="github_pat_..."
          hint={
            'PAT de grano fino, con permiso de contenido SOLO sobre ese repositorio y '
            + 'caducidad de un año. Se guarda en este telefono, no viaja a ningun otro '
            + 'sitio, y se revoca en un clic desde GitHub.'
          }
          onChange={v => setBorrador({ ...borrador, token: v.trim() })}
        />

        <div style="margin: 6px 0 20px 0;">
          <Notice tone="warn" title="Quien tenga el telefono desbloqueado puede leer el token">
            Por eso el permiso alcanza solo a ese repositorio: robarlo cuesta el cuaderno,
            no la cuenta de GitHub.
          </Notice>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="primary" disabled={!completa} onClick={() => setCfg(borrador)}>
            Guardar la configuracion
          </button>

          <button
            class="secondary"
            disabled={cfg === null || trabajando}
            onClick={() => { setTrabajando(true); void pushNow().finally(() => setTrabajando(false)) }}
          >
            Subir ahora
          </button>

          <button
            class="secondary"
            disabled={cfg === null || trabajando}
            onClick={() => {
              if (!confirm(
                'Se bajara el cuaderno de GitHub y SUSTITUIRA al de este telefono. Seguro?',
              )) return
              setTrabajando(true)
              void restaurar().finally(() => setTrabajando(false))
            }}
          >
            Restaurar desde GitHub
          </button>

          {cfg !== null && (
            <button
              class="linkish"
              style="color: var(--danger); align-self: center; margin-top: 8px;"
              onClick={() => {
                if (!confirm('Se borrara el token de este telefono. El cuaderno local no se toca.')) return
                setCfg(null)
                setBorrador(VACIA)
              }}
            >
              Olvidar el token
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
```

- [ ] **Paso 2: comprobar**

```bash
npx tsc -b && npm run dev
```

Esperado: sin token, los botones de subir y restaurar salen desactivados. Al guardar una
configuración inventada y pulsar «Subir ahora», sale el aviso de error con el mensaje de
GitHub, y la app **sigue funcionando** para anotar vuelos.

- [ ] **Paso 3: commit**

```bash
git add src/ui/screens/ajustes/Copia.tsx
git commit -m "feat(ui): copia de seguridad, con conflicto que no fusiona nunca"
```

---

## Task 15: Cerrar vuelo

El camino de entrada que decide si la app se usa o se abandona. Cuatro campos, y todo lo
demás se hereda del último vuelo **y se dice en pantalla**, para que nada quede supuesto en
silencio.

**Ficheros:**
- Crear: `src/ui/newFlight.ts`
- Crear: `src/ui/newFlight.test.ts`
- Sustituir: `src/ui/screens/CerrarVuelo.tsx`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crea `src/ui/newFlight.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { makeFlight, makePilot } from '../domain/fixtures'
import { flightDurationMin, hasConsistentTimes } from '../domain/flight'
import type { Balloon, LogbookDoc, Person, Site } from '../domain/types'
import { localTimestamp, heredado, flightFromQuickClose } from './newFlight'

const globo: Balloon = {
  id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
  balloonClass: 'hot_air', envelopeVolumeM3: 2900,
}
const yo: Person = { id: 'p1', name: 'Didac', roles: ['pilot'], licenceNumber: null }
const alberto: Person = { id: 'p2', name: 'Alberto', roles: ['instructor'], licenceNumber: null }
// El campo 's1' existe porque `makeFlight` lo usa por defecto en las dos puntas.
// Sin el, cualquier vuelo de prueba echa en falta el campo de despegue y el
// lugar de aterrizaje, y la prueba mide el fixture en lugar de la funcion.
const campo: Site = {
  id: 's1', name: 'Agramunt', lat: 41.7869, lon: 1.0967, elevationM: 345,
  permitStatus: 'unknown', accessNotes: '',
}

function doc(over: Partial<LogbookDoc> = {}): LogbookDoc {
  return {
    schemaVersion: 1,
    pilot: makePilot({ personId: 'p1' }),
    balloons: [globo],
    sites: [campo],
    people: [yo, alberto],
    flights: [],
    ...over,
  }
}

describe('localTimestamp', () => {
  it('la hora tecleada es hora local, no UTC', () => {
    // 08:37 del 31 de agosto en Madrid son las 06:37 UTC.
    expect(localTimestamp('2026-08-31', '08:37')).toBe('2026-08-31T06:37:00.000Z')
  })

  it('sin hora devuelve cadena vacia, que es lo que el dominio trata como sin dato', () => {
    expect(localTimestamp('2026-08-31', '')).toBe('')
  })
})

describe('heredado', () => {
  it('sin vuelos previos, el piloto es el titular y no hay globo', () => {
    expect(heredado(doc())).toEqual({
      picId: 'p1', balloonId: '', pilotFunction: 'DUAL', instructorId: null,
    })
  })

  it('copia globo, funcion e instructor del vuelo mas reciente', () => {
    const d = doc({
      flights: [
        makeFlight({ date: '2026-08-17', balloonId: 'b9', pilotFunction: 'PIC', instructorId: null }),
        makeFlight({ date: '2026-08-31', balloonId: 'b1', pilotFunction: 'DUAL', instructorId: 'p2' }),
      ],
    })
    expect(heredado(d)).toEqual({
      picId: 'p1', balloonId: 'b1', pilotFunction: 'DUAL', instructorId: 'p2',
    })
  })

  it('no adivina el globo aunque el catalogo solo tenga uno', () => {
    // Elegir "el unico globo" seria correcto hoy y silenciosamente falso el dia
    // que haya dos. Se deja vacio y `missingFields` lo reclama.
    const d = doc({ balloons: [globo] })
    expect(heredado(d).balloonId).toBe('')
  })
})

describe('flightFromQuickClose', () => {
  const entrada = {
    date: '2026-08-31',
    landingTime: '08:37',
    coords: { lat: 41.7712, lon: 1.0384 },
    siteId: null,
    landings: 1,
    notes: 'Aterrizaje en rastrojo',
  }

  it('queda marcado como incompleto', () => {
    expect(flightFromQuickClose(doc(), 'f1', entrada).complete).toBe(false)
  })

  it('no inventa la hora de despegue', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(f.departure.timestamp).toBe('')
  })

  it('no inventa inflados ni despegues, que se cuentan a mano al rematar', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(f.inflations).toBe(0)
    expect(f.takeoffs).toBe(0)
  })

  it('la duracion sale cero y el vuelo queda marcado como incoherente hasta rematarlo', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(flightDurationMin(f)).toBe(0)
    expect(hasConsistentTimes(f)).toBe(false)
  })

  it('guarda la hora y el sitio de aterrizaje, que es lo que se acaba de vivir', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(f.arrival.timestamp).toBe('2026-08-31T06:37:00.000Z')
    expect(f.arrival.coords).toEqual({ lat: 41.7712, lon: 1.0384 })
    expect(f.landings).toBe(1)
    expect(f.notes).toBe('Aterrizaje en rastrojo')
  })

  it('un aterrizaje en un campo del catalogo no guarda coordenadas sueltas', () => {
    const f = flightFromQuickClose(doc(), 'f1', { ...entrada, siteId: 's1', coords: null })
    expect(f.arrival.siteId).toBe('s1')
    expect(f.arrival.coords).toBe(null)
  })

  it('hereda el globo y la funcion del ultimo vuelo', () => {
    const d = doc({ flights: [makeFlight({ balloonId: 'b1', pilotFunction: 'DUAL', instructorId: 'p2' })] })
    const f = flightFromQuickClose(d, 'f1', entrada)
    expect(f.balloonId).toBe('b1')
    expect(f.pilotFunction).toBe('DUAL')
    expect(f.instructorId).toBe('p2')
  })

  it('un doble mando nace con la firma pendiente, que es lo que exige BFCL.160(e)', () => {
    const d = doc({ flights: [makeFlight({ pilotFunction: 'DUAL' })] })
    expect(flightFromQuickClose(d, 'f1', entrada).signatureStatus).toBe('pending')
  })

  it('un PIC solo nace sin firma que pedir', () => {
    const d = doc({ flights: [makeFlight({ pilotFunction: 'PIC' })] })
    expect(flightFromQuickClose(d, 'f1', entrada).signatureStatus).toBe('not_required')
  })

  it('nunca nace con verificacion de competencia ni marcado para la vigencia', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(f.check).toBe(null)
    expect(f.recencyTrainingFlight).toBe(false)
  })
})
```

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/ui/newFlight.test.ts
```

Esperado: FAIL, `Failed to resolve import "./newFlight"`.

- [ ] **Paso 3: escribir el módulo**

Crea `src/ui/newFlight.ts`:

```ts
// src/ui/newFlight.ts
// Como nace un vuelo desde el cierre rapido.
//
// La regla es no inventar nada. Lo que el cierre rapido no pregunta se queda
// vacio o a cero, y `missingFields` lo reclama despues. Lo unico que se hereda
// es lo que sale del historial del propio piloto, y la pantalla lo enseña
// escrito para que no quede supuesto en silencio.
import { sortedFlights } from './select'
import type { Coords, Flight, LogbookDoc, PilotFunction, Uuid } from '../domain/types'

/**
 * Fecha local y "HH:MM" locales a marca ISO con zona.
 *
 * El piloto teclea la hora del reloj que lleva puesto. Construir la fecha con
 * los componentes locales y dejar que `toISOString` la pase a UTC es la unica
 * forma de que un vuelo del cambio de hora no se desplace una hora.
 *
 * Sin hora devuelve cadena vacia, que es lo que `flightDurationMin` y
 * `hasConsistentTimes` ya tratan como dato ausente.
 */
export function localTimestamp(date: string, hhmm: string): string {
  if (hhmm === '' || date === '') return ''
  const [a, m, d] = date.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  if ([a, m, d, h, min].some(n => !Number.isFinite(n))) return ''
  return new Date(a, m - 1, d, h, min, 0, 0).toISOString()
}

export interface Heredado {
  picId: Uuid
  balloonId: Uuid
  pilotFunction: PilotFunction
  instructorId: Uuid | null
}

/**
 * Lo que se copia del vuelo mas reciente.
 *
 * Sin vuelos previos no se hereda globo: dejarlo vacio hace que
 * `missingFields` lo reclame, mientras que elegir "el unico globo del
 * catalogo" seria adivinar, y el dia que haya dos globos la adivinanza pasaria
 * a ser silenciosamente falsa.
 */
export function heredado(doc: LogbookDoc): Heredado {
  const ultimo = sortedFlights(doc.flights)[0]
  if (ultimo === undefined) {
    return {
      picId: doc.pilot.personId ?? '',
      balloonId: '',
      pilotFunction: 'DUAL',
      instructorId: null,
    }
  }
  return {
    picId: doc.pilot.personId ?? ultimo.picId,
    balloonId: ultimo.balloonId,
    pilotFunction: ultimo.pilotFunction,
    instructorId: ultimo.instructorId,
  }
}

export interface CierreRapido {
  date: string
  landingTime: string
  coords: Coords | null
  siteId: Uuid | null
  landings: number
  notes: string
}

/**
 * El vuelo que produce el cierre rapido.
 *
 * `complete: false` y sin hora de despegue a proposito. La consecuencia es que
 * aporta 0 minutos al acumulado y lo marca como parcial, que es exactamente lo
 * que el dominio decidio hacer con un dato ausente: no restar horas, pero
 * tampoco desaparecer en silencio.
 */
export function flightFromQuickClose(
  doc: LogbookDoc, id: Uuid, e: CierreRapido,
): Flight {
  const h = heredado(doc)
  const necesitaFirma = h.pilotFunction === 'DUAL' || h.pilotFunction === 'PIC_SOLO_SUPERVISED'
  return {
    id,
    date: e.date,
    picId: h.picId,
    balloonId: h.balloonId,
    departure: { siteId: null, coords: null, timestamp: '' },
    arrival: {
      siteId: e.siteId,
      coords: e.siteId === null ? e.coords : null,
      timestamp: localTimestamp(e.date, e.landingTime),
    },
    durationOverrideMin: null,
    pilotFunction: h.pilotFunction,
    dayNight: 'day',
    tether: 'free',
    inflations: 0,
    takeoffs: 0,
    landings: e.landings,
    instructorId: h.instructorId,
    // BFCL.160(e) exige firma del FI(B) en dobles mando y supervisados, asi que
    // nacen pendientes. Los demas no tienen firma que pedir.
    signatureStatus: necesitaFirma ? 'pending' : 'not_required',
    // Ni la verificacion de competencia ni la marca de vuelo de instruccion se
    // deducen: son un juicio de otra persona. Nacen en el estado que no
    // concede nada.
    check: null,
    recencyTrainingFlight: false,
    crewIds: [],
    passengerIds: [],
    observedWeather: '',
    maxAltitudeM: null,
    distanceKm: null,
    notes: e.notes,
    trackRef: null,
    complete: false,
  }
}
```

- [ ] **Paso 4: verlas pasar**

```bash
TZ=Europe/Madrid npx vitest run src/ui/newFlight.test.ts
```

Esperado: PASS, 14 pruebas.

- [ ] **Paso 5: escribir la pantalla**

Sustituye `src/ui/screens/CerrarVuelo.tsx` entero:

```tsx
// src/ui/screens/CerrarVuelo.tsx
// El camino de entrada de despues de aterrizar.
//
// Con el globo en el suelo y el equipo plegando, nadie rellena veinte campos.
// Si el unico camino fuera el formulario entero, la app se abandonaria en tres
// semanas. Por eso aqui van cuatro campos y nada mas. Ver el spec §6.
import { useEffect, useState } from 'preact/hooks'
import { Stepper, TextArea } from '../components/Field'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { Sheet } from '../components/Screen'
import { balloonById, personName } from '../select'
import { formatCoords, labelFunction } from '../format'
import { flightFromQuickClose, heredado } from '../newFlight'
import { newId } from '../ids'
import { navigate } from '../router'
import { useDoc, useStore } from '../state'
import { hoy } from '../today'
import type { Coords } from '../../domain/types'

function ahoraHhmm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Posicion =
  | { estado: 'pidiendo' }
  | { estado: 'ok'; coords: Coords; precisionM: number }
  | { estado: 'no'; motivo: string }

export function CerrarVuelo() {
  const doc = useDoc()
  const { update } = useStore()

  const [hora, setHora] = useState(ahoraHhmm())
  const [landings, setLandings] = useState(1)
  const [nota, setNota] = useState('')
  const [siteId, setSiteId] = useState<string | null>(null)
  const [pos, setPos] = useState<Posicion>({ estado: 'pidiendo' })

  // Se pide la posicion al abrir, no al pulsar: para cuando el piloto llegue al
  // campo "donde", el GPS ya ha fijado. Si la deniega, se sigue sin ella: nada
  // depende de tener GPS. Ver el spec §8.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPos({ estado: 'no', motivo: 'Este navegador no da la posicion' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      p => setPos({
        estado: 'ok',
        coords: { lat: p.coords.latitude, lon: p.coords.longitude },
        precisionM: Math.round(p.coords.accuracy),
      }),
      err => setPos({ estado: 'no', motivo: err.message }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }, [])

  const h = heredado(doc)
  const globo = balloonById(doc, h.balloonId)
  const coords = pos.estado === 'ok' ? pos.coords : null

  const guardar = () => {
    const id = newId()
    update(d => ({
      ...d,
      flights: [
        ...d.flights,
        flightFromQuickClose(d, id, {
          date: hoy(),
          landingTime: hora,
          coords,
          siteId,
          landings,
          notes: nota,
        }),
      ],
    }))
    navigate({ name: 'detalle', flightId: id })
  }

  return (
    <Sheet
      title="Cerrar vuelo"
      footer={
        <>
          <button class="primary" onClick={guardar}>Guardar</button>
          <div class="lbl dim" style="text-align: center; margin-top: 10px;">
            Quedara marcado como incompleto
          </div>
        </>
      }
    >
      <div style="padding: 8px 20px 24px 20px;">
        <p class="muted" style="margin: 0 0 20px 0; font-size: 14px;">
          Cuatro campos. El resto se completa en casa.
        </p>

        {/* Hora nativa y no dos botones de mas y menos: corregir veinte minutos
            a pulsaciones de uno en uno serian veinte toques, y el selector del
            iPhone lo hace en dos. */}
        <div style="margin-bottom: 24px;">
          <div class="cap" style="margin-bottom: 8px;">Hora de aterrizaje</div>
          <input
            type="time"
            value={hora}
            onInput={e => setHora((e.currentTarget as HTMLInputElement).value)}
            class="num"
            style="font-size: 32px; text-align: center; padding: 12px;"
          />
        </div>

        <div style="margin-bottom: 24px;">
          <div class="cap" style="margin-bottom: 8px;">Donde</div>

          <div class="outline" style="display: flex; align-items: center; gap: 11px; margin-bottom: 10px;">
            <Icon name="pin" size={19} color="var(--accent)" />
            <div style="flex-grow: 1; min-width: 0;">
              {pos.estado === 'pidiendo' && <div class="dim">Buscando la posicion...</div>}
              {pos.estado === 'ok' && (
                <>
                  <div class="num" style="font-size: 16px;">{formatCoords(pos.coords)}</div>
                  <div class="dim" style="font-size: 12px;">
                    Posicion actual, ±{pos.precisionM} m
                  </div>
                </>
              )}
              {pos.estado === 'no' && (
                <>
                  <div class="dim">Sin posicion</div>
                  <div class="dim" style="font-size: 12px;">{pos.motivo}</div>
                </>
              )}
            </div>
          </div>

          <select
            value={siteId ?? ''}
            onChange={e => {
              const v = (e.currentTarget as HTMLSelectElement).value
              setSiteId(v === '' ? null : v)
            }}
          >
            <option value="">Campo abierto, con las coordenadas de arriba</option>
            {doc.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {siteId === null && coords === null && (
            <div style="margin-top: 10px;">
              <Notice tone="warn" title="Sin posicion y sin campo elegido">
                El vuelo se guardara sin lugar de aterrizaje. Lo puedes poner en casa desde
                el detalle.
              </Notice>
            </div>
          )}
        </div>

        <Stepper label="Aterrizajes en este vuelo" value={landings} onChange={setLandings} min={0} />

        <TextArea
          label="Nota"
          value={nota}
          placeholder="Como fue, quien firmo, lo que no quieras olvidar"
          onChange={setNota}
        />

        <div class="card">
          <div class="cap" style="margin-bottom: 6px;">Se copia del ultimo vuelo</div>
          <div class="muted" style="font-size: 13px; line-height: 1.5;">
            Globo {globo === null ? 'sin asignar' : globo.registration},
            {' '}funcion {labelFunction(h.pilotFunction).toLowerCase()},
            {' '}instructor {personName(doc, h.instructorId).toLowerCase()}.
          </div>
          <div class="dim" style="font-size: 13px; margin-top: 6px;">
            Ni la hora de despegue ni los inflados se adivinan. Se piden al rematar.
          </div>
        </div>
      </div>
    </Sheet>
  )
}
```

- [ ] **Paso 6: comprobar**

```bash
npx tsc -b && TZ=Europe/Madrid npm test && npm run dev
```

Esperado: al pulsar Guardar salta al detalle del vuelo recién creado, y en Vuelos aparece
la tarjeta. Recarga: sigue ahí.

- [ ] **Paso 7: commit**

```bash
git add src/ui/newFlight.ts src/ui/newFlight.test.ts src/ui/screens/CerrarVuelo.tsx
git commit -m "feat(ui): cierre rapido de vuelo, sin inventar los datos que no pregunta"
```

---

## Task 16: Vuelos

**Ficheros:**
- Sustituir: `src/ui/screens/Vuelos.tsx`

- [ ] **Paso 1: escribir la pantalla**

```tsx
// src/ui/screens/Vuelos.tsx
// Lista completa, en orden cronologico inverso.
//
// Sin paginacion ni scroll virtual: con menos de 100 registros no compran
// nada y añaden un modo de fallo. Ver el spec §6.
import { useState } from 'preact/hooks'
import { logbookTotals } from '../../domain/totals'
import type { PilotFunction } from '../../domain/types'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { Screen } from '../components/Screen'
import { formatDateShort, formatHm, labelFunction } from '../format'
import { flightDurationMin } from '../../domain/flight'
import { balloonById, filterFlights, flightTitle, flightYears, sortedFlights } from '../select'
import { hrefOf } from '../router'
import { useDoc } from '../state'
import { hoy } from '../today'

const FUNCIONES: PilotFunction[] = ['PIC', 'PIC_SOLO_SUPERVISED', 'DUAL', 'FI_B', 'FE_B']

const CHIP = `
  font: inherit; font-size: 13px; padding: 7px 13px; border-radius: 15px;
  border: 1px solid var(--border); background: var(--bg); color: var(--muted);
  width: auto; appearance: none; -webkit-appearance: none;
`
const CHIP_ACTIVO = `${CHIP} border-color: var(--accent); color: var(--text);`

/** Aviso de estado de la tarjeta. Uno solo, el mas urgente. */
function Estado({ completo, firma }: { completo: boolean; firma: string }) {
  if (!completo) {
    return (
      <span style="font-size: 12px; color: var(--warn); display: flex; align-items: center; gap: 4px;">
        <Icon name="aviso" size={12} color="var(--warn)" width={2.4} />
        Sin rematar
      </span>
    )
  }
  if (firma === 'pending') {
    return (
      <span style="font-size: 12px; color: var(--warn); display: flex; align-items: center; gap: 4px;">
        <Icon name="aviso" size={12} color="var(--warn)" width={2.4} />
        Falta la firma
      </span>
    )
  }
  if (firma === 'signed') {
    return (
      <span style="font-size: 12px; color: var(--ok); display: flex; align-items: center; gap: 4px;">
        <Icon name="check" size={12} color="var(--ok)" width={2.6} />
        Firmado
      </span>
    )
  }
  return null
}

export function Vuelos() {
  const doc = useDoc()
  const [year, setYear] = useState('')
  const [balloonId, setBalloonId] = useState('')
  const [pf, setPf] = useState('')

  const total = logbookTotals(doc, hoy())
  const años = flightYears(doc.flights)

  const lista = sortedFlights(filterFlights(doc.flights, {
    year: year === '' ? undefined : year,
    balloonId: balloonId === '' ? undefined : balloonId,
    pilotFunction: pf === '' ? undefined : (pf as PilotFunction),
  }))

  return (
    <Screen
      title="Vuelos"
      tab="vuelos"
      right={
        <span class="num dim" style="font-size: 13px;">
          {total.flights} {total.flights === 1 ? 'vuelo' : 'vuelos'} · {formatHm(total.minutes)}
        </span>
      }
    >
      <div style="display: flex; gap: 8px; padding: 4px 20px 14px 20px; overflow-x: auto;">
        <select
          style={year === '' ? CHIP : CHIP_ACTIVO}
          value={year}
          onChange={e => setYear((e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">Todos los años</option>
          {años.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          style={balloonId === '' ? CHIP : CHIP_ACTIVO}
          value={balloonId}
          onChange={e => setBalloonId((e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">Todos los globos</option>
          {doc.balloons.map(b => (
            <option key={b.id} value={b.id}>{b.registration || 'Sin matricula'}</option>
          ))}
        </select>
        <select
          style={pf === '' ? CHIP : CHIP_ACTIVO}
          value={pf}
          onChange={e => setPf((e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">Todas las funciones</option>
          {FUNCIONES.map(f => <option key={f} value={f}>{labelFunction(f)}</option>)}
        </select>
      </div>

      <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 9px;">
        {doc.flights.length === 0 && (
          <Notice tone="info" title="Todavia no hay ningun vuelo">
            El boton de cerrar vuelo de Inicio crea el primero en diez segundos, y se
            remata en casa.
          </Notice>
        )}

        {doc.flights.length > 0 && lista.length === 0 && (
          <Notice tone="info" title="Ningun vuelo con esos filtros" />
        )}

        {lista.map(f => {
          const globo = balloonById(doc, f.balloonId)
          return (
            <a
              key={f.id}
              href={hrefOf({ name: 'detalle', flightId: f.id })}
              class="card"
              style={`
                text-decoration: none; color: inherit; display: block;
                ${f.complete ? '' : 'border-left: 3px solid var(--warn);'}
              `}
            >
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 10px;">
                <span class="num dim" style="font-size: 13px;">{formatDateShort(f.date)}</span>
                <Estado completo={f.complete} firma={f.signatureStatus} />
              </div>
              <div style="font-size: 16px; margin-top: 4px;">{flightTitle(doc, f)}</div>
              <div class="muted" style="display: flex; gap: 14px; margin-top: 6px; font-size: 13px;">
                <span class="num">{formatHm(flightDurationMin(f))}</span>
                <span>{labelFunction(f.pilotFunction)}</span>
                <span class="num">{globo === null ? 'Sin globo' : globo.registration}</span>
              </div>
            </a>
          )
        })}
      </div>
    </Screen>
  )
}
```

- [ ] **Paso 2: comprobar**

```bash
npx tsc -b && npm run dev
```

Esperado: el vuelo creado en la Task 15 sale con la raya ámbar y «Sin rematar», y con
`0:00` de duración, que es lo correcto mientras no tenga hora de despegue. Los filtros
reducen la lista y se acumulan.

- [ ] **Paso 3: commit**

```bash
git add src/ui/screens/Vuelos.tsx
git commit -m "feat(ui): lista de vuelos con filtros de año, globo y funcion"
```

---

## Task 17: Detalle del vuelo

El formulario entero, en dos bloques plegables. **Avisa pero no bloquea:** un dato raro se
señala y se guarda igual, porque el cuaderno tiene que poder reflejar lo que pasó de verdad.

**Ficheros:**
- Modificar: `src/ui/newFlight.ts` (añadir `hhmmFrom`)
- Modificar: `src/ui/newFlight.test.ts` (añadir sus pruebas)
- Sustituir: `src/ui/screens/Detalle.tsx`

- [ ] **Paso 1: la prueba del extractor de hora**

Añade al final de `src/ui/newFlight.test.ts`:

```ts
describe('hhmmFrom', () => {
  it('saca la hora local de una marca ISO, para meterla en un input de tipo time', () => {
    expect(hhmmFrom('2026-08-31T06:37:00.000Z')).toBe('08:37')
  })

  it('una marca vacia da cadena vacia, que es el input vacio', () => {
    expect(hhmmFrom('')).toBe('')
  })

  it('ida y vuelta con localTimestamp', () => {
    expect(hhmmFrom(localTimestamp('2026-08-31', '07:32'))).toBe('07:32')
  })
})
```

Y añade `hhmmFrom` al import de ese fichero:

```ts
import { localTimestamp, heredado, flightFromQuickClose, hhmmFrom } from './newFlight'
```

- [ ] **Paso 2: verla fallar**

```bash
TZ=Europe/Madrid npx vitest run src/ui/newFlight.test.ts
```

Esperado: FAIL, `hhmmFrom is not a function` o error de compilación por el import.

- [ ] **Paso 3: implementarla**

Añade al final de `src/ui/newFlight.ts`:

```ts
/**
 * De marca ISO a "HH:MM" local, inverso de `localTimestamp`.
 *
 * Devuelve cadena vacia ante una marca ausente o ilegible, que es lo que un
 * `<input type="time">` entiende como vacio. `formatTime` no sirve aqui porque
 * devuelve "--:--", que el input rechazaria.
 */
export function hhmmFrom(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
```

- [ ] **Paso 4: verla pasar**

```bash
TZ=Europe/Madrid npx vitest run src/ui/newFlight.test.ts
```

Esperado: PASS, 17 pruebas.

- [ ] **Paso 5: escribir la pantalla**

Sustituye `src/ui/screens/Detalle.tsx` entero:

```tsx
// src/ui/screens/Detalle.tsx
// El formulario completo del vuelo, en los dos bloques del spec §4.
//
// Los cambios se aplican al documento en cuanto se tocan, sin boton de
// guardar: el contexto ya agrupa los guardados con rebote, y un boton de
// guardar en un telefono es una forma de perder datos al salir de la app.
//
// La validacion AVISA y NO BLOQUEA. Una llegada anterior a la salida se señala
// y se guarda igual, porque el cuaderno tiene que poder reflejar lo que se
// anoto de verdad, y porque `hasConsistentTimes` ya se encarga de que ese
// vuelo no reste horas del acumulado.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { flightDurationMin, hasConsistentTimes } from '../../domain/flight'
import type {
  CheckType, Flight, PilotFunction, SignatureStatus, Uuid,
} from '../../domain/types'
import {
  NumberField, SelectField, Stepper, TextArea, TextField, Toggle,
} from '../components/Field'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { Sheet } from '../components/Screen'
import { formatDateLong, formatHm, labelFunction, labelSignature } from '../format'
import { hhmmFrom, localTimestamp } from '../newFlight'
import { missingFields } from '../incomplete'
import { navigate } from '../router'
import { balloonLabel, flightTitle } from '../select'
import { useDoc, useStore } from '../state'

const FUNCIONES: PilotFunction[] = ['PIC', 'PIC_SOLO_SUPERVISED', 'DUAL', 'FI_B', 'FE_B']
const FIRMAS: SignatureStatus[] = ['not_required', 'pending', 'signed']

function Bloque(
  { titulo, abierto, onToggle, children }: {
    titulo: string; abierto: boolean; onToggle: () => void; children: ComponentChildren
  },
) {
  return (
    <section style="margin-bottom: 8px;">
      <button
        class="linkish"
        onClick={onToggle}
        style="
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 12px 0; color: var(--dim);
        "
      >
        <span class="cap">{titulo}</span>
        <Icon name={abierto ? 'arriba' : 'abajo'} size={16} color="var(--dim)" width={2.4} />
      </button>
      {abierto && <div>{children}</div>}
    </section>
  )
}

export function Detalle({ flightId }: { flightId: string }) {
  const doc = useDoc()
  const { update } = useStore()
  const [verReglamentario, setVerReglamentario] = useState(true)
  const [verOperacional, setVerOperacional] = useState(false)

  const f = doc.flights.find(x => x.id === flightId)

  if (f === undefined) {
    return (
      <Sheet title="Vuelo">
        <div style="padding: 8px 20px;">
          <Notice tone="warn" title="Ese vuelo ya no existe">
            Puede que lo borraras desde otro dispositivo y la copia se haya restaurado.
          </Notice>
        </div>
      </Sheet>
    )
  }

  /** Aplica un cambio al vuelo. Documento nuevo, vuelo nuevo, nada mutado. */
  const set = (campo: Partial<Flight>) => update(d => ({
    ...d,
    flights: d.flights.map(x => (x.id === flightId ? { ...x, ...campo } : x)),
  }))

  const faltan = missingFields(doc, f)
  const horasIncoherentes = !hasConsistentTimes(f)
  const duracion = flightDurationMin(f)

  const personas = doc.people.map(p => ({
    value: p.id,
    label: p.name === '' ? 'Sin nombre' : p.name,
  }))
  const instructores = doc.people
    .filter(p => p.roles.includes('instructor'))
    .map(p => ({ value: p.id, label: p.name === '' ? 'Sin nombre' : p.name }))
  const examinadores = doc.people
    .filter(p => p.roles.includes('examiner'))
    .map(p => ({ value: p.id, label: p.name === '' ? 'Sin nombre' : p.name }))

  const campos = doc.sites.map(s => ({ value: s.id, label: s.name || 'Campo sin nombre' }))

  return (
    <Sheet
      title={flightTitle(doc, f)}
      overline={formatDateLong(f.date)}
      footer={
        <>
          {faltan.length > 0 ? (
            <>
              <div class="lbl dim" style="margin-bottom: 10px; line-height: 1.45;">
                Faltan {faltan.length} campos: {faltan.join(', ').toLowerCase()}.
              </div>
              <button class="secondary" disabled>Marcar como completo</button>
            </>
          ) : (
            <button
              class={f.complete ? 'secondary' : 'primary'}
              onClick={() => set({ complete: !f.complete })}
            >
              {f.complete ? 'Volver a marcarlo como incompleto' : 'Marcar como completo'}
            </button>
          )}
        </>
      }
    >
      <div style="padding: 0 20px 24px 20px;">
        {!f.complete && (
          <div style="margin-bottom: 14px;">
            <Notice tone="warn" title="Vuelo sin rematar">
              Cuenta como vuelo en el acumulado, pero lo marca como parcial hasta que estos
              campos esten metidos.
            </Notice>
          </div>
        )}

        {horasIncoherentes && (
          <div style="margin-bottom: 14px;">
            <Notice tone="warn" title="Las horas no cuadran">
              La llegada es anterior a la salida, o falta alguna de las dos. El vuelo aporta
              0 minutos al acumulado y queda señalado, pero se guarda igual.
            </Notice>
          </div>
        )}

        <Bloque
          titulo="Reglamentario"
          abierto={verReglamentario}
          onToggle={() => setVerReglamentario(!verReglamentario)}
        >
          <TextField
            label="Fecha" type="date" value={f.date}
            onChange={v => set({ date: v })}
          />
          <SelectField
            label="Piloto al mando" value={f.picId} options={personas}
            empty="Sin asignar"
            onChange={v => set({ picId: v ?? '' })}
          />
          <SelectField
            label="Funcion" value={f.pilotFunction}
            options={FUNCIONES.map(x => ({ value: x, label: labelFunction(x) }))}
            onChange={v => set({ pilotFunction: (v ?? 'DUAL') as PilotFunction })}
          />
          <SelectField
            label="Globo" value={f.balloonId}
            options={doc.balloons.map(b => ({ value: b.id, label: balloonLabel(b) }))}
            empty="Sin asignar"
            onChange={v => set({ balloonId: v ?? '' })}
          />

          <SelectField
            label="Campo de despegue" value={f.departure.siteId} options={campos}
            empty="Fuera del catalogo"
            onChange={v => set({ departure: { ...f.departure, siteId: v } })}
          />
          <TextField
            label="Hora de despegue" type="time" value={hhmmFrom(f.departure.timestamp)}
            onChange={v => set({
              departure: { ...f.departure, timestamp: localTimestamp(f.date, v) },
            })}
          />
          <SelectField
            label="Lugar de aterrizaje" value={f.arrival.siteId} options={campos}
            empty="Campo abierto"
            hint={
              f.arrival.coords === null
                ? undefined
                : `Coordenadas guardadas: ${f.arrival.coords.lat.toFixed(4)}, ${f.arrival.coords.lon.toFixed(4)}`
            }
            onChange={v => set({ arrival: { ...f.arrival, siteId: v } })}
          />
          <TextField
            label="Hora de aterrizaje" type="time" value={hhmmFrom(f.arrival.timestamp)}
            onChange={v => set({
              arrival: { ...f.arrival, timestamp: localTimestamp(f.date, v) },
            })}
          />

          <div style="margin-bottom: 18px;">
            <div class="cap" style="margin-bottom: 7px;">Duracion</div>
            <div class="num" style="font-size: 28px;">{formatHm(duracion)}</div>
            <div class="lbl dim" style="margin-top: 4px;">
              {f.durationOverrideMin === null
                ? 'Calculada de las dos horas.'
                : 'Puesta a mano. Manda sobre las dos horas.'}
            </div>
          </div>
          <NumberField
            label="Duracion a mano" unit="min" value={f.durationOverrideMin}
            hint={
              'Solo si la hora de despegue real y la de puesta en marcha difieren. '
              + 'Dejalo vacio para que se calcule.'
            }
            onChange={v => set({ durationOverrideMin: v })}
          />

          <Stepper label="Inflados" value={f.inflations} onChange={v => set({ inflations: v })} />
          <Stepper label="Despegues" value={f.takeoffs} onChange={v => set({ takeoffs: v })} />
          <Stepper label="Aterrizajes" value={f.landings} onChange={v => set({ landings: v })} />

          <SelectField
            label="Momento del dia" value={f.dayNight}
            options={[{ value: 'day', label: 'Dia' }, { value: 'night', label: 'Noche' }]}
            onChange={v => set({ dayNight: v === 'night' ? 'night' : 'day' })}
            hint="Volar de noche exige la habilitacion de BFCL.210, que esta app no comprueba."
          />
          <SelectField
            label="Tipo de vuelo" value={f.tether}
            options={[{ value: 'free', label: 'Vuelo libre' }, { value: 'tethered', label: 'Cautivo' }]}
            onChange={v => set({ tether: v === 'tethered' ? 'tethered' : 'free' })}
          />

          <SelectField
            label="Instructor" value={f.instructorId} options={instructores}
            empty="Ninguno"
            hint={
              instructores.length === 0
                ? 'Ninguna persona tiene el rol de instructor. Se pone en Ajustes, Personas.'
                : 'BFCL.160(e) exige su firma en los dobles mando y en los supervisados.'
            }
            onChange={v => set({ instructorId: v })}
          />
          <SelectField
            label="Firma del instructor" value={f.signatureStatus}
            options={FIRMAS.map(x => ({ value: x, label: labelSignature(x) }))}
            onChange={v => set({ signatureStatus: (v ?? 'not_required') as SignatureStatus })}
          />

          <Toggle
            label="Vuelo de instruccion que cuenta para la vigencia"
            checked={f.recencyTrainingFlight}
            hint={
              'Marcalo solo si siguio el contenido del examen practico y fue uno a uno con '
              + 'el instructor, sin otro piloto a bordo que se acredite el vuelo. Es lo que '
              + 'pide AMC1 BFCL.160(a)(1)(ii)(a) y es un juicio del instructor, no algo que '
              + 'la app pueda deducir.'
            }
            onChange={v => set({ recencyTrainingFlight: v })}
          />

          <SelectField
            label="Verificacion"
            value={f.check === null ? '' : f.check.type}
            options={[
              { value: 'skill_test', label: 'Examen practico' },
              { value: 'proficiency_check', label: 'Verificacion de competencia' },
            ]}
            empty="Ninguna"
            hint={
              examinadores.length === 0
                ? 'Ninguna persona tiene el rol de examinador. Sin un FE(B), BFCL.160(c) no se cumple.'
                : undefined
            }
            onChange={v => {
              if (v === null) { set({ check: null }); return }
              set({
                check: {
                  type: v as CheckType,
                  examinerId: f.check?.examinerId ?? '',
                  result: f.check?.result ?? 'passed',
                },
              })
            }}
          />
          {f.check !== null && (
            <>
              <SelectField
                label="Examinador" value={f.check.examinerId === '' ? null : f.check.examinerId}
                options={examinadores} empty="Sin asignar"
                onChange={v => set({
                  check: f.check === null ? null : { ...f.check, examinerId: (v ?? '') as Uuid },
                })}
              />
              <SelectField
                label="Resultado" value={f.check.result}
                options={[
                  { value: 'passed', label: 'Aprobada' },
                  { value: 'failed', label: 'No aprobada' },
                ]}
                onChange={v => set({
                  check: f.check === null
                    ? null
                    : { ...f.check, result: v === 'failed' ? 'failed' : 'passed' },
                })}
              />
            </>
          )}
        </Bloque>

        <Bloque
          titulo="Operacional"
          abierto={verOperacional}
          onToggle={() => setVerOperacional(!verOperacional)}
        >
          <div class="cap" style="margin-bottom: 4px;">Equipo de tierra</div>
          {doc.people.map(p => (
            <Toggle
              key={`crew-${p.id}`}
              label={p.name === '' ? 'Sin nombre' : p.name}
              checked={f.crewIds.includes(p.id)}
              onChange={m => set({
                crewIds: m ? [...f.crewIds, p.id] : f.crewIds.filter(x => x !== p.id),
              })}
            />
          ))}

          <div class="cap" style="margin: 18px 0 4px 0;">Pasajeros</div>
          {doc.people.map(p => (
            <Toggle
              key={`pax-${p.id}`}
              label={p.name === '' ? 'Sin nombre' : p.name}
              checked={f.passengerIds.includes(p.id)}
              onChange={m => set({
                passengerIds: m ? [...f.passengerIds, p.id] : f.passengerIds.filter(x => x !== p.id),
              })}
            />
          ))}

          <div style="height: 18px;"></div>

          <TextArea
            label="Meteo que hubo de verdad"
            value={f.observedWeather}
            placeholder="Viento en superficie, inversion, visibilidad, lo que difirio del pronostico"
            hint="Con el tiempo, contrastarla con la pronosticada calibra las previsiones."
            onChange={v => set({ observedWeather: v })}
          />
          <NumberField
            label="Altitud maxima" unit="m" value={f.maxAltitudeM}
            onChange={v => set({ maxAltitudeM: v })}
          />
          <NumberField
            label="Distancia" unit="km" step="0.1" value={f.distanceKm}
            onChange={v => set({ distanceKm: v })}
          />
          <TextArea label="Notas" value={f.notes} onChange={v => set({ notes: v })} />
        </Bloque>

        <button
          class="linkish"
          style="color: var(--danger); display: flex; align-items: center; gap: 6px; margin-top: 20px;"
          onClick={() => {
            if (!confirm('Borrar este vuelo del cuaderno? No se puede deshacer desde la app.')) return
            update(d => ({ ...d, flights: d.flights.filter(x => x.id !== flightId) }))
            navigate({ name: 'vuelos' })
          }}
        >
          <Icon name="papelera" size={15} color="var(--danger)" />
          Borrar este vuelo
        </button>
      </div>
    </Sheet>
  )
}
```

`WARNING:` `verbatimModuleSyntax` está activo en el `tsconfig.json`, así que todo lo que
sea solo un tipo tiene que importarse con `import type`. Si `noUnusedLocals` se queja de
alguno, quítalo del import en lugar de silenciarlo.

- [ ] **Paso 6: comprobar**

```bash
npx tsc -b && TZ=Europe/Madrid npm test && npm run dev
```

Esperado, con el vuelo del cierre rápido abierto:
- Aparece el aviso de sin rematar y el de horas que no cuadran.
- Al meter la hora de despegue, la duración deja de ser `0:00` y el segundo aviso
  desaparece.
- El pie va bajando la cuenta de campos que faltan según se rellenan.
- Con todo puesto, «Marcar como completo» se activa y la tarjeta de Vuelos pierde la raya
  ámbar.

- [ ] **Paso 7: commit**

```bash
git add src/ui/newFlight.ts src/ui/newFlight.test.ts src/ui/screens/Detalle.tsx
git commit -m "feat(ui): detalle del vuelo, formulario entero que avisa sin bloquear"
```

---

## Task 18: La vista de la vigencia

**El fichero de mayor riesgo de todo el plan.** Aquí es donde una pantalla descuidada
deshace el trabajo de las cuatro auditorías del dominio. Las tres trampas de STATUS se atan
con pruebas, no con cuidado.

**Ficheros:**
- Crear: `src/ui/currencyView.ts`
- Crear: `src/ui/currencyView.test.ts`
- Crear: `src/ui/components/PanelVigencia.tsx`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crea `src/ui/currencyView.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { CurrencyReport } from '../domain/currency'
import { describeCurrency } from './currencyView'

function report(over: Partial<CurrencyReport> = {}): CurrencyReport {
  return {
    applicable: true,
    balloonClass: 'hot_air',
    viaProficiencyCheck: false,
    items: [],
    met: false,
    currentUntil: null,
    maxGroup: null,
    groupSchedule: [],
    excluded: [],
    warnings: [],
    notModelled: [],
    ...over,
  }
}

describe('trampa 1: applicable manda sobre met', () => {
  it('a un alumno no se le enseña vigencia, aunque met venga en true', () => {
    const v = describeCurrency(report({ applicable: false, met: true }))
    expect(v.kind).toBe('no_aplica')
  })

  it('y el motivo dice por que, no se queda mudo', () => {
    const v = describeCurrency(report({ applicable: false, met: true }))
    if (v.kind !== 'no_aplica') throw new Error('deberia ser no_aplica')
    expect(v.motivo).toMatch(/licencia/i)
  })

  it('la vista de no_aplica no lleva ningun veredicto que se pueda pintar por error', () => {
    const v = describeCurrency(report({ applicable: false, met: true, currentUntil: '2028-01-01' }))
    expect('met' in v).toBe(false)
    expect('currentUntil' in v).toBe(false)
  })
})

describe('trampa 2: el grupo es una escalera, no un par con currentUntil', () => {
  it('la vista NUNCA publica un maxGroup suelto', () => {
    const v = describeCurrency(report({
      applicable: true, met: true, currentUntil: '2028-06-30',
      maxGroup: 'D', groupSchedule: [{ maxGroup: 'D', until: '2027-05-31' }],
    }))
    expect('maxGroup' in v).toBe(false)
  })

  it('los dos tramos salen los dos, no solo el de hoy', () => {
    const v = describeCurrency(report({
      applicable: true, met: true, currentUntil: '2028-06-30', maxGroup: 'D',
      groupSchedule: [
        { maxGroup: 'D', until: '2027-05-31' },
        { maxGroup: 'A', until: '2028-06-30' },
      ],
    }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.grupos).toHaveLength(2)
    expect(v.grupos[0].until).toBe('2027-05-31')
    expect(v.grupos[1].maxGroup).toBe('A')
  })

  it('sin escalera no hay lista de grupos que enseñar', () => {
    const v = describeCurrency(report({ applicable: true, met: true, groupSchedule: [] }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.grupos).toEqual([])
  })
})

describe('trampa 3: nada se descarta en silencio', () => {
  it('los avisos y lo no modelado se copian enteros', () => {
    const v = describeCurrency(report({
      warnings: ['aviso uno', 'aviso dos'],
      notModelled: ['no modelado uno'],
    }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.avisos).toEqual(['aviso uno', 'aviso dos'])
    expect(v.noModelado).toEqual(['no modelado uno'])
  })

  it('los vuelos excluidos se agrupan por motivo y se cuentan', () => {
    const v = describeCurrency(report({
      excluded: [
        { flightId: 'a', reason: 'flight_in_future' },
        { flightId: 'b', reason: 'balloon_unknown' },
        { flightId: 'c', reason: 'balloon_unknown' },
      ],
    }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.excluidos).toHaveLength(2)
    expect(v.excluidos.join(' ')).toMatch(/2 vuelos/)
    expect(v.excluidos.join(' ')).toMatch(/1 vuelo\b/)
  })

  it('sin exclusiones la lista esta vacia, no falta', () => {
    const v = describeCurrency(report())
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.excluidos).toEqual([])
  })
})

describe('los contadores', () => {
  it('los minutos se pintan en h:mm y las cuentas en enteros', () => {
    const v = describeCurrency(report({
      items: [
        {
          key: 'picMinutes', label: '6 h como PIC en 24 meses', current: 270, required: 360,
          unit: 'minutes', met: false, expiresOn: null, partial: false,
        },
        {
          key: 'takeoffs', label: '10 despegues en 24 meses', current: 12, required: 10,
          unit: 'count', met: true, expiresOn: '2027-08-31', partial: true,
        },
      ],
    }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.items[0].valor).toBe('4:30 de 6:00')
    expect(v.items[1].valor).toBe('12 de 10')
    expect(v.items[1].partial).toBe(true)
    expect(v.items[1].expiresOn).toBe('2027-08-31')
  })
})

describe('el titular', () => {
  it('vigente cuando se cumple', () => {
    const v = describeCurrency(report({ met: true, currentUntil: '2028-06-30' }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.titular).toBe('Vigente')
  })

  it('no vigente cuando no', () => {
    const v = describeCurrency(report({ met: false }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.titular).toBe('Sin vigencia')
  })

  it('dice cuando la sostiene una verificacion de competencia y no los contadores', () => {
    const v = describeCurrency(report({ met: true, viaProficiencyCheck: true }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.viaProficiencyCheck).toBe(true)
  })
})
```

- [ ] **Paso 2: verlas fallar**

```bash
npx vitest run src/ui/currencyView.test.ts
```

Esperado: FAIL, `Failed to resolve import "./currencyView"`.

- [ ] **Paso 3: escribir el módulo**

Crea `src/ui/currencyView.ts`:

```ts
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
  return n === 1 ? `1 vuelo queda fuera del recuento: ${motivo}` : `${n} vuelos quedan fuera del recuento: ${motivo}`
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
```

- [ ] **Paso 4: verlas pasar**

```bash
npx vitest run src/ui/currencyView.test.ts
```

Esperado: PASS, 13 pruebas.

- [ ] **Paso 5: el panel**

Crea `src/ui/components/PanelVigencia.tsx`:

```tsx
// src/ui/components/PanelVigencia.tsx
import { currency } from '../../domain/currency'
import type { BalloonClass, IsoDate, LogbookDoc } from '../../domain/types'
import { describeCurrency } from '../currencyView'
import { formatDateShort, labelClass, labelGroup } from '../format'
import { Icon } from './Icon'
import { Notice } from './Notice'

/**
 * El panel de vigencia, por clase de globo.
 *
 * `forClass` es obligatorio: BFCL.160(a) exige el cumplimiento "in the relevant
 * balloon class" y no existe una vigencia global. Quien llama decide de que
 * clase pregunta.
 */
export function PanelVigencia(
  { doc, asOf, forClass }: { doc: LogbookDoc; asOf: IsoDate; forClass: BalloonClass },
) {
  const vista = describeCurrency(currency(doc, asOf, forClass))

  if (vista.kind === 'no_aplica') {
    return (
      <div class="outline" style="display: flex; align-items: center; gap: 11px;">
        <Icon name="reloj" size={16} color="var(--dim)" width={2} />
        <div style="flex-grow: 1;">
          <div class="lbl muted">Vigencia</div>
          <div class="lbl dim" style="font-size: 12px; line-height: 1.4;">{vista.motivo}</div>
        </div>
      </div>
    )
  }

  return (
    <div class="card">
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 7px;">
          <Icon
            name={vista.met ? 'check' : 'alerta'}
            size={15}
            color={vista.met ? 'var(--ok)' : 'var(--warn)'}
            width={2.4}
          />
          <span style={`font-size: 15px; font-weight: 500; color: ${vista.met ? 'var(--ok)' : 'var(--warn)'};`}>
            {vista.titular}
          </span>
        </div>
        <span class="dim" style="font-size: 12px;">{labelClass(forClass)}</span>
      </div>

      {vista.currentUntil !== null && (
        <div class="lbl muted" style="margin-top: 6px;">
          Hasta el <span class="num">{formatDateShort(vista.currentUntil)}</span>
        </div>
      )}

      {vista.viaProficiencyCheck && (
        <div class="lbl dim" style="margin-top: 4px; line-height: 1.4;">
          La sostiene una verificacion de competencia de BFCL.160(a)(2), que es una via
          alternativa y no un rescate.
        </div>
      )}

      <div style="margin-top: 12px;">
        {vista.items.map(i => (
          <div
            key={i.key}
            style="display: flex; align-items: baseline; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border);"
          >
            <Icon
              name={i.met ? 'check' : 'aviso'}
              size={13}
              color={i.met ? 'var(--ok)' : 'var(--warn)'}
              width={2.4}
            />
            <span class="lbl" style="flex-grow: 1; min-width: 0;">{i.label}</span>
            <span class="num lbl muted" style="white-space: nowrap;">{i.valor}</span>
          </div>
        ))}
      </div>

      <div style="margin-top: 8px;">
        {vista.items.filter(i => i.expiresOn !== null || i.partial).map(i => (
          <div key={`n-${i.key}`} class="lbl dim" style="font-size: 12px; line-height: 1.5;">
            {i.label}
            {i.expiresOn !== null && <> caduca el <span class="num">{formatDateShort(i.expiresOn)}</span></>}
            {i.partial && <> · se apoya en algun vuelo incompleto</>}
          </div>
        ))}
      </div>

      {/* BFCL.160(d). La escalera entera y no solo el tramo de hoy: publicar el
          grupo de hoy junto a currentUntil miente, y ese fue el hallazgo
          bloqueante de la cuarta auditoria del dominio. */}
      {vista.grupos.length > 0 && (
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border);">
          <div class="cap" style="margin-bottom: 6px;">Grupo maximo, BFCL.160(d)</div>
          {vista.grupos.map(g => (
            <div key={g.until} class="lbl muted" style="line-height: 1.6;">
              Hasta el <span class="num">{formatDateShort(g.until)}</span>, grupo {labelGroup(g.maxGroup)}
            </div>
          ))}
        </div>
      )}

      {vista.excluidos.length > 0 && (
        <div style="margin-top: 14px;">
          <Notice tone="warn" title="Vuelos fuera del recuento">
            {vista.excluidos.map(t => <div key={t} style="margin-bottom: 3px;">{t}</div>)}
          </Notice>
        </div>
      )}

      {vista.avisos.length > 0 && (
        <div style="margin-top: 10px;">
          <Notice tone="warn" title="Avisos de este cuaderno">
            {vista.avisos.map(t => <div key={t} style="margin-bottom: 5px;">{t}</div>)}
          </Notice>
        </div>
      )}

      <details style="margin-top: 12px;">
        <summary class="lbl dim" style="cursor: pointer;">
          Lo que este panel no comprueba, {vista.noModelado.length} cosas
        </summary>
        <ul class="muted" style="margin: 8px 0 0 0; padding-left: 18px; font-size: 12px; line-height: 1.5;">
          {vista.noModelado.map(t => <li key={t} style="margin-bottom: 5px;">{t}</li>)}
        </ul>
      </details>
    </div>
  )
}
```

- [ ] **Paso 6: comprobar**

```bash
npx tsc -b && TZ=Europe/Madrid npm test
```

Esperado: `tsc` sin salida, todas las pruebas en verde.

- [ ] **Paso 7: commit**

```bash
git add src/ui/currencyView.ts src/ui/currencyView.test.ts src/ui/components/PanelVigencia.tsx
git commit -m "feat(ui): panel de vigencia, con la escalera de grupos y nada en silencio"
```

---

## Task 19: Inicio

**Ficheros:**
- Sustituir: `src/ui/screens/Inicio.tsx`

- [ ] **Paso 1: escribir la pantalla**

```tsx
// src/ui/screens/Inicio.tsx
// El acumulado del cuaderno como numero protagonista, los incompletos
// pendientes de rematar, y el boton de cerrar vuelo.
//
// NO hay panel de progreso hacia el BPL. Se retiro el 2026-09-02 con el resto
// del seguimiento del curso, y con el `domain/progress.ts` entero. Durante la
// fase de alumno esta pantalla no lleva ningun contador reglamentario a
// proposito: el acumulado es un dato llano. Ver el spec §5.
import { logbookTotals } from '../../domain/totals'
import type { BalloonClass } from '../../domain/types'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { PanelVigencia } from '../components/PanelVigencia'
import { Screen } from '../components/Screen'
import { formatDateShort, formatHm } from '../format'
import { missingFields } from '../incomplete'
import { hrefOf } from '../router'
import { flightTitle, sortedFlights } from '../select'
import { useDoc, useStore } from '../state'
import { hoy } from '../today'

const SYNC: Record<string, { texto: string; color: string; icono: 'check' | 'nube' | 'alerta' }> = {
  sin_configurar: { texto: 'Solo en el telefono', color: 'var(--dim)', icono: 'nube' },
  al_dia: { texto: 'Al dia', color: 'var(--ok)', icono: 'check' },
  pendiente: { texto: 'Sin subir', color: 'var(--dim)', icono: 'nube' },
  subiendo: { texto: 'Subiendo...', color: 'var(--dim)', icono: 'nube' },
  conflicto: { texto: 'Conflicto', color: 'var(--warn)', icono: 'alerta' },
  error: { texto: 'Fallo al subir', color: 'var(--warn)', icono: 'alerta' },
}

/**
 * Las clases de globo realmente voladas.
 *
 * La vigencia es POR CLASE, asi que se enseña un panel por cada clase que
 * aparezca en el cuaderno. Sin vuelos todavia, se enseña la de aire caliente,
 * que es la del curso.
 */
function clasesVoladas(
  balloons: { id: string; balloonClass: BalloonClass }[],
  flights: { balloonId: string }[],
): BalloonClass[] {
  const ids = new Set(flights.map(f => f.balloonId))
  const clases = new Set<BalloonClass>()
  for (const b of balloons) if (ids.has(b.id)) clases.add(b.balloonClass)
  return clases.size === 0 ? ['hot_air'] : [...clases]
}

export function Inicio() {
  const doc = useDoc()
  const { sync } = useStore()
  const asOf = hoy()

  const total = logbookTotals(doc, asOf)
  const incompletos = sortedFlights(doc.flights.filter(f => !f.complete))
  const s = SYNC[sync.kind]

  return (
    <Screen title="" tab="inicio">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 20px;">
        <div class="cap" style="letter-spacing: .06em;">Logbook BPL</div>
        <a
          href={hrefOf({ name: 'ajustesCopia' })}
          style="display: flex; align-items: center; gap: 6px; text-decoration: none;"
        >
          <Icon name={s.icono} size={14} color={s.color} width={2.4} />
          <span class="lbl" style={`color: ${s.color};`}>{s.texto}</span>
        </a>
      </div>

      <div style="padding: 26px 20px 0 20px;">
        <div class="cap">Acumulado del cuaderno</div>
        <div
          class="num"
          style="font-size: 76px; line-height: 1; font-weight: 500; letter-spacing: -.03em; margin-top: 10px;"
        >
          {formatHm(total.minutes)}
        </div>
        <div class="lbl muted" style="margin-top: 8px;">horas de vuelo</div>
      </div>

      <div style="
        margin: 30px 20px 0 20px; padding: 16px 0;
        border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
        display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
      ">
        {[
          { n: total.flights, l: 'vuelos' },
          { n: total.landings, l: 'aterrizajes' },
          { n: total.inflations, l: 'inflados' },
        ].map(c => (
          <div key={c.l}>
            <div class="num" style="font-size: 26px; font-weight: 500;">{c.n}</div>
            <div class="lbl dim" style="font-size: 12px; margin-top: 2px;">{c.l}</div>
          </div>
        ))}
      </div>

      {total.partial && (
        <div class="lbl dim" style="padding: 10px 20px 0 20px; line-height: 1.45;">
          El acumulado se apoya en algun vuelo incompleto o con las horas incoherentes.
        </div>
      )}

      <div style="padding: 22px 20px 0 20px; display: flex; flex-direction: column; gap: 10px;">
        {(sync.kind === 'error' || sync.kind === 'conflicto') && (
          <Notice
            tone="warn"
            title={sync.kind === 'conflicto' ? 'Conflicto sin resolver' : 'La copia de seguridad falla'}
          >
            {sync.kind === 'error' ? sync.mensaje : 'Alguien ha escrito el cuaderno desde otro sitio.'}
            {' '}El cuaderno sigue funcionando entero en este telefono. Entra en Ajustes,
            copia de seguridad.
          </Notice>
        )}

        {incompletos.map(f => (
          <a
            key={f.id}
            href={hrefOf({ name: 'detalle', flightId: f.id })}
            class="card"
            style="display: flex; align-items: center; gap: 11px; text-decoration: none; color: inherit;"
          >
            <Icon name="alerta" size={16} color="var(--warn)" />
            <div style="flex-grow: 1; min-width: 0;">
              <div class="lbl" style="font-weight: 500;">Vuelo sin rematar</div>
              <div class="lbl dim" style="font-size: 12px;">
                {formatDateShort(f.date)}, {flightTitle(doc, f)}.
                {' '}Faltan {missingFields(doc, f).length} campos
              </div>
            </div>
            <Icon name="derecha" size={16} color="var(--dim)" width={2.2} />
          </a>
        ))}

        {clasesVoladas(doc.balloons, doc.flights).map(c => (
          <PanelVigencia key={c} doc={doc} asOf={asOf} forClass={c} />
        ))}
      </div>

      <div style="padding: 22px 20px 24px 20px;">
        <a href={hrefOf({ name: 'cerrar' })} class="primary" style="text-decoration: none;">
          <Icon name="mas" size={18} width={2.4} />
          Cerrar vuelo
        </a>
      </div>
    </Screen>
  )
}
```

`WARNING:` el último vuelo del día muestra el acumulado con `formatHm`, que **no** es el
número de vuelos. Si en la pantalla aparece `23` donde debería salir `14:20`, es que se ha
pintado `total.flights` en lugar de `total.minutes`.

- [ ] **Paso 2: Inicio no lleva título en la cabecera**

`Screen` pinta un `<h1>` con el título. En Inicio el título es la cifra grande, no un
rótulo, así que se le pasa cadena vacía. Para que no deje un hueco, ajusta el `header` de
`src/ui/components/Screen.tsx` para que no se pinte cuando el título está vacío:

```tsx
      {title !== '' && (
        <header style="
          display: flex; align-items: baseline; justify-content: space-between;
          padding: 16px 20px 10px 20px; flex-shrink: 0;
        ">
          <h1 style="margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.02em;">
            {title}
          </h1>
          {right}
        </header>
      )}
```

Y añade un relleno superior al cuerpo cuando no hay cabecera, en la misma línea del `div`
del cuerpo:

```tsx
      <div style={title === '' ? `${CUERPO} padding-top: 16px;` : CUERPO}>{children}</div>
```

- [ ] **Paso 3: comprobar**

```bash
npx tsc -b && TZ=Europe/Madrid npm test && npm run dev
```

Esperado, con un cuaderno vacío: `0:00`, tres ceros, y el panel de vigencia en su forma de
«no aplica» diciendo que empieza al emitirse la licencia. Rellena la fecha de emisión en
Ajustes, Mis datos, y vuelve: ahora sale el panel con los cuatro contadores, todos sin
cumplir, con sus avisos y con el desplegable de lo no comprobado.

- [ ] **Paso 4: commit**

```bash
git add src/ui/screens/Inicio.tsx src/ui/components/Screen.tsx
git commit -m "feat(ui): Inicio, acumulado del cuaderno, incompletos y vigencia por clase"
```

---

## Task 20: Verificación y estado

**Ficheros:**
- Modificar: `STATUS.md`

- [ ] **Paso 1: la comprobación completa**

```bash
npx tsc -b && TZ=Europe/Madrid npm test && npm run build
```

Esperado: `tsc` sin salida, todas las pruebas en verde, `built in ...`.

Anota el número de pruebas que salen. Deben ser las 174 del dominio más las de la interfaz.
Si alguna del dominio ha cambiado de resultado, **para**: significa que la interfaz ha
tocado algo que no debía.

- [ ] **Paso 2: el recorrido a mano en el navegador del Mac**

Este es el primer filtro, no el definitivo. Con `npm run dev`:

1. Borra el almacenamiento del sitio y recarga. Sale la pantalla de primer uso.
2. «Empezar de cero». Recarga: sigue habiendo cuaderno.
3. Ajustes, Mis datos: nombre y dirección. Ajustes, Personas: el titular lleva ese nombre.
4. Ajustes, Personas: añade a un instructor con su rol.
5. Ajustes, Globos: añade uno con 2.900 m³ y comprueba que sale grupo A.
6. Inicio, «Cerrar vuelo». Guarda. Salta al detalle.
7. En el detalle, el pie dice cuántos campos faltan. Rellénalos y «Marcar como completo».
8. Vuelos: la tarjeta ya no lleva la raya ámbar y la duración no es `0:00`.
9. Inicio: el acumulado refleja esa duración.
10. Ajustes, Mis datos: pon fecha de emisión de licencia. Inicio enseña el panel de
    vigencia con los cuatro contadores y la lista de lo no comprobado.

- [ ] **Paso 3: la lista de verificación en el iPhone**

`CRITICAL:` el spec §9 lo dice y no es negociable: **se prueba en el iPhone real y con la
app añadida a la pantalla de inicio**, no en Chrome del Mac ni en el simulador. El service
worker, la persistencia y la geolocalización se comportan distinto instalados que en una
pestaña, y probar en el entorno equivocado da un aprobado falso.

Esto **no se puede hacer todavía**: falta el empaquetado PWA y el despliegue a GitHub
Pages, que son la tarea siguiente. Deja escrita la lista en `STATUS.md` para ejecutarla en
cuanto la app esté servida:

- La app arranca sin cobertura, con el modo avión puesto.
- El teclado no tapa el campo que se está escribiendo en el detalle.
- `confirm()` y `alert()` de los borrados funcionan de verdad, no devuelven `false` sin
  avisar.
- La geolocalización del cierre rápido pide permiso y, si se deniega, la pantalla sigue
  siendo usable.
- El tema claro se lee al sol, y el ámbar sobre fondo claro no es el `#fab219`.
- Al cerrar la app desde el conmutador y volver, el último cambio sigue guardado.
- La barra de pestañas no queda debajo de la raya de gestos.

- [ ] **Paso 4: actualizar STATUS.md**

En `STATUS.md`:

1. Corrige la primera línea, que hoy dice `Última sesión: **2026-09-03**`, una fecha que
   todavía no ha llegado. Pon `2026-09-02`.
2. Cambia «Siguiente tarea» a «el empaquetado PWA y el despliegue».
3. En «Dónde está cada cosa», la fila de Interfaz pasa de «no existe todavía» a
   `src/ui/`, con el plan en `docs/superpowers/plans/2026-09-02-logbook-ui.md`.
4. Añade a «Hecho» un punto con lo que se ha construido y el número de pruebas nuevas.
5. Añade la lista de verificación del iPhone del paso 3.
6. En «Lo siguiente, en orden», tacha los puntos 1 y 2, que ya están.
7. Añade a «Decisiones que no hay que volver a tomar» las nueve de este plan.

- [ ] **Paso 5: commit**

```bash
git add STATUS.md
git commit -m "docs: STATUS tras la interfaz, y la lista de verificacion del iPhone"
```

---

## Fin del plan A2

### Cobertura respecto al spec

| Sección del spec | Dónde queda |
|---|---|
| §3, capa `ui/` con todas las dependencias | Tasks 1 a 19 |
| §3, `domain/` sin tocar el navegador | Respetado. `hoy()` es el único lector del reloj y vive en `ui/` |
| §4, todos los campos de `Flight` editables | Task 17 |
| §5, acumulado como dato llano | Task 19 |
| §5, vigencia por clase, con escalera de grupos | Tasks 18 y 19 |
| §5, sin panel de curso | Task 19, dicho en el comentario de cabecera |
| §6, cinco pestañas | Task 9 |
| §6, Inicio | Task 19 |
| §6, Vuelos con filtros | Task 16 |
| §6, Detalle en dos bloques que avisa sin bloquear | Task 17 |
| §6, Planificar y Operar como esbozo | Task 9 |
| §6, Ajustes con los tres catálogos | Tasks 10 a 14 |
| §6, los dos caminos de entrada | Tasks 15 y 17 |
| §7, empuje con rebote y snapshot completo | Task 7 |
| §7, conflicto sin fusión automática | Tasks 7 y 14 |
| §7, token con su aviso | Task 14 |
| §7, nunca `dangerouslySetInnerHTML` | No aparece en ningún fichero del plan |
| §8, sin red al guardar | Task 7, estado `pendiente` |
| §8, token revocado, aviso en Inicio | Task 19 |
| §8, `sha` distinto | Task 14 |
| §8, documento local corrupto y sin documento | Task 9, `PrimerUso` |
| §8, geolocalización denegada | Task 15 |
| §9, pruebas solo de módulos puros | Tasks 2, 3, 4, 5, 7, 15, 18 |
| §9, verificación manual en el iPhone | Task 20 |

### Lo que este plan deja fuera a propósito

- **Empaquetado PWA y despliegue.** Es la tarea siguiente y tiene su propio plan.
- **`navigator.storage.persist()`.** Va con el empaquetado, porque solo tiene sentido con
  la app instalada.
- **Mapa y open-meteo.** Fase 1 tardía, sobre la pantalla de Planificar ya creada.
- **Checklists.** Fase 3, y su contenido se transcribe del manual, no se escribe.
- **Trazas GPS.** Fuera del alcance de la versión 1, spec §11.

### Lo que hay que vigilar durante la ejecución

De las cuatro auditorías del dominio salió una lección que aplica igual aquí: **cinco de
los 34 defectos los introdujeron las propias reparaciones**, porque las reescrituras cambian
más superficie de la que declara el commit.

Traducido a este plan: si una tarea obliga a tocar un fichero de una tarea anterior, hay
que volver a correr **todas** las pruebas, no solo las del fichero tocado, y comprobar a
mano el paso de verificación de aquella tarea. Los pasos de comprobación de cada tarea están
para eso.

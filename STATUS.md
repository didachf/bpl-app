# Logbook BPL, estado

Última sesión: **2026-09-02**. Siguiente tarea: **crear `bpl-logbook` y el token**, y pasar
la lista de verificación en el móvil. Todo fusionado a `main` y publicado.

**App en vivo: https://didachf.github.io/bpl-app/**

## Qué es

PWA instalable en el **teléfono Android** para el ciclo completo de un vuelo en globo: registro de
vuelos, planificación y operaciones. Usuario único (Dídac, alumno de BPL en Ultramagic),
diseñada para que un segundo piloto la pueda usar sin reescribirla.

**Empieza por** `docs/superpowers/specs/2026-09-01-bpl-app-design.md`. Manda sobre todo lo
demás y está enmendado tres veces.

## Dónde está cada cosa

| | |
|---|---|
| Spec | `docs/superpowers/specs/2026-09-01-bpl-app-design.md` |
| Plan del núcleo, ejecutado | `docs/superpowers/plans/2026-09-01-logbook-nucleo.md` |
| Plan de la interfaz, ejecutado | `docs/superpowers/plans/2026-09-02-logbook-ui.md` |
| Dominio, funciones puras | `src/domain/` |
| Persistencia y sincronización | `src/db/store.ts`, `src/sync/github.ts` |
| Maquetas de pantalla | `design/*.dc.html`, nueve artboards, publicadas en el enlace de abajo |
| Interfaz | `src/ui/`, doce rutas, nueve pantallas de verdad y dos esbozos |
| Empaquetado PWA | `vite.config.ts`, iconos en `public/`, `src/ui/install.ts` |
| Despliegue | rama `gh-pages`, con `git subtree push --prefix dist origin gh-pages` |

Maqueta publicada: https://claude.ai/code/artifact/e0420826-2c67-4c0f-889f-6f8d173082a6

## Hecho

- **Núcleo del logbook completo y probado.** 174 pruebas, `tsc` y `build` limpios.
  Tipos, acumulado del cuaderno, contadores de vigencia de BFCL.160, esquema y migraciones,
  persistencia local con `idb-keyval`, cliente de la API de GitHub con detección de
  conflicto.
- **Cuatro auditorías adversariales** del dominio contra el Balloon Rulebook en PDF.
  Encontraron 10, 11, 9 y 4 defectos. Todos reparados.
- **Revisión de seguridad.** Tres hallazgos, el bajo cerrado, los otros dos documentados
  en el spec §7.
- **La interfaz, entera.** Contexto de estado con guardado en rebote, enrutador de hash,
  Ajustes con sus cinco subpantallas, Cerrar vuelo, Vuelos, Detalle e Inicio. Planificar y
  Operar quedan como esbozo navegable. **116 pruebas nuevas** de los módulos puros de
  `ui/` y de `sync/`, ninguna de componentes. Total del proyecto: 290, y las 174 de antes
  siguen intactas.
- **Comprobado en navegador**: primer uso, persistencia tras recargar, frontera de grupo en
  3.400 y 3.401 m³, ciclo completo de cerrar vuelo y rematarlo, y los dos temas.
  `CRITICAL:` la primera pasada se hizo en WebKit con emulación de iPhone, que era **el
  motor equivocado**. Repetida el 02/09/2026 en Chromium con emulación de Pixel, 360 px de
  ancho. La maquetación aguanta a 360, más estrecho que los 390 de las maquetas, y todo lo
  que usa la interfaz existe en Android: `crypto.randomUUID`, `navigator.storage.persist`,
  geolocalización, `color-mix`, `100dvh`, `accent-color` y los selectores nativos de fecha
  y hora.
- **Empaquetado PWA y publicado.** Manifiesto con `start_url` y `scope` absolutos bajo
  `/bpl-app/`, iconos de 192 y 512 más uno *maskable*, y service worker de Workbox con el
  armazón entero precacheado, tipografías incluidas. Verificado **servido de verdad y en
  vivo**: el service worker se activa con el scope correcto y, con la red cortada, la app
  arranca entera y las tipografías salen de la caché.
- **Seguimiento del curso retirado** el 02/09/2026. Fuera el panel de progreso hacia el
  BPL y `src/domain/progress.ts` con sus 31 pruebas. Inicio enseña el acumulado del
  cuaderno. Ver spec §5.
- **Dirección visual elegida:** Instrumento. Oscuro por defecto, IBM Plex Sans y Mono,
  cifras monoespaciadas. **Nueve artboards**: las cinco pestañas (Inicio, Vuelos,
  Planificar, Operar, Ajustes), las dos pantallas internas (Cerrar vuelo, Detalle) y dos en
  tema claro.

## Contrato del dominio, lo que consume la interfaz

Todo en `src/domain/` son funciones puras: no importan nada del navegador. Firmas exactas al
02/09/2026, para no tener que leer los ficheros:

```ts
// El acumulado del cuaderno. Cuenta TODOS los vuelos, sin juicio reglamentario.
logbookTotals(doc: LogbookDoc, asOf: IsoDate): LogbookTotals
//   { flights, minutes, takeoffs, landings, inflations, partial }

// La vigencia, POR CLASE de globo. Sólo aplica con licencia emitida.
currency(doc: LogbookDoc, asOf: IsoDate, forClass: BalloonClass): CurrencyReport
//   { applicable, balloonClass, viaProficiencyCheck, items, met, currentUntil,
//     maxGroup, groupSchedule, excluded, warnings, notModelled }

// Un vuelo
flightDurationMin(f: Flight): number      // minutos, nunca negativo
hasConsistentTimes(f: Flight): boolean    // false si la llegada precede a la salida

// Globos y personas
groupFromVolume(m3: number): BalloonGroup                 // lanza si m3 <= 0
hasRole(doc, id: Uuid | null, role: PersonRole): boolean
hasRoleAndIsNotThePilot(doc, id, role): boolean

// Fechas, siempre sobre cadenas "YYYY-MM-DD"
addMonths(date, n)  addDays(date, n)  endOfMonth(date)  toIsoDate(d: Date)

// Documento
emptyDocument(): LogbookDoc      // siembra los 3 campos y al titular como Person
validate(input: unknown): ValidationResult
migrate(doc, target?, migrations?): LogbookDoc
CURRENT_SCHEMA_VERSION = 1

// Persistencia local
loadDocument(): Promise<LogbookDoc | null>   // null si no hay, no valida, o no migra
saveDocument(doc): Promise<void>
clearDocument(): Promise<void>
makeDebouncedSaver(guardar, delayMs = 800): DebouncedSaver   // tiene .flush()

// GitHub
fetchFile(cfg: GithubConfig, path): Promise<RemoteFile | null>   // null si no existe
putFile(cfg, path, content, sha: string | null, message): Promise<{ sha }>
//   lanza ConflictError con 409 o 422. NO fusionar: preguntar.
```

Tres cosas que la interfaz debe respetar y son fáciles de romper:

1. **Mirar `applicable` antes que `met`.** A un alumno la vigencia no le aplica, y `met` se
   calcula igualmente.
2. **`groupSchedule` antes que `maxGroup`.** `maxGroup` es sólo el tramo de hoy. Publicar
   `currentUntil` junto a `maxGroup` como si fueran un par miente, y ese fue el hallazgo
   bloqueante de la cuarta auditoría.
3. **Enseñar `excluded`, `warnings` y `notModelled`.** Existen para que ninguna exclusión sea
   silenciosa. Una pantalla que los ignora deshace el trabajo del dominio.

## Lo siguiente, en orden

1. **Crear el repositorio privado `bpl-logbook` y el token de grano fino.** Lo hace Dídac,
   no yo: un PAT no debe pasar por una conversación. Instrucciones abajo.
2. **Pasar la lista de verificación del Android**, con la app ya instalada desde Chrome.
3. Fase 2: planificación, con el puerto de `trayectoria_globo.py` y el mapa, sobre la
   pantalla de Planificar que ya existe.
4. Fase 3: checklists, transcritas del Manual de Vuelo. Ver abajo.

## Crear el token, paso a paso

1. GitHub, **New repository**, nombre `bpl-logbook`, **privado**, sin README.
2. Ajustes de la cuenta, Developer settings, **Personal access tokens, Fine-grained**.
3. **Repository access:** *Only select repositories*, y elige **solo `bpl-logbook`**. Esto
   es lo que acota el daño si el token se filtra.
4. **Permissions, Repository permissions:** `Contents` a **Read and write**. Nada más.
5. **Expiration:** un año.
6. En la app: Ajustes, copia de seguridad. Cuenta `didachf`, repositorio `bpl-logbook`,
   rama `main`, y pega el token. Después, **Subir ahora**.

`WARNING:` el primer **Subir ahora** con el repositorio vacío crea `logbook.json`. Si el
repositorio ya tuviera un `logbook.json` de otro sitio, saldría el aviso de conflicto y
tendrías que elegir versión. No fusiona nunca.

## Decisiones que no hay que volver a tomar

- **Documento JSON único**, no Dexie. Menos de 100 vuelos en toda la vida útil.
- **Dos repositorios**: `bpl-app` público con el código, `bpl-logbook` privado con los
  datos. El token vive en `localStorage`, es de grano fino y caduca en un año.
- **`domain/` no importa nada del navegador.** Es una regla, no una preferencia.
- **Las horas se manejan en minutos** dentro del dominio. Formatear es cosa de la interfaz.
- **El ámbar `#fab219` nunca rellena una barra.** Da 1,79 de contraste sobre fondo claro.
  En tema claro pasa a `#8a5a00`.
- **La app no sigue el curso.** No hay contadores de BFCL.130. El acumulado de
  `totals.ts` es un dato llano que cuenta todos los vuelos, y la vigencia de `currency.ts`
  es el único juicio reglamentario, y solo se activa con licencia emitida.
- **El teléfono es Android.** Corregido el 02/09/2026: el spec justificaba media docena de
  decisiones con Safari y WebKit, y estaba mal. No cambió ni una línea de código, pero sí
  los motivos, el entorno de prueba y dos cosas del alcance: la traza GPS en vuelo pasa a
  ser posible, y el borrado de almacenamiento a los siete días no aplica.
- **Enrutado por hash, escrito a mano.** GitHub Pages es estático: con la API de historia,
  recargar en `/bpl-app/vuelos` da un 404. Por eso se desinstaló `preact-iso`.
- **Las fuentes se sirven del propio origen**, vía `@fontsource`. La app tiene que arrancar
  en un rastrojo sin cobertura, y ahí un `<link>` a Google Fonts falla.
- **Nada de pruebas de componentes.** El riesgo está en qué se enseña, no en si el `<div>`
  se pinta. Todo lo que no sea pintar sale a un módulo `.ts` puro y ese sí se prueba.
- **El detalle guarda al teclear, sin botón de guardar.** Un botón de guardar en un teléfono
  es una forma de perder datos al salir de la app.
- **El cierre rápido no inventa nada.** Sin hora de despegue, con inflados y despegues a
  cero, y `complete: false`. Lo único que hereda del último vuelo es globo, función e
  instructor, y lo dice en pantalla.
- **`ui/today.ts` es el único sitio que lee el reloj.** Si una función de `domain/` empezara
  a llamarlo, dejaría de ser pura.
- **Las claves de `localStorage` llevan prefijo `bpl-app:`**, porque el origen de Pages es la
  cuenta entera.
- **Nunca `dangerouslySetInnerHTML`.** El escape de Preact es la única barrera entre una
  nota de vuelo y el token de GitHub.

## Lo que la app NO comprueba, y lo dice en pantalla

Declarado en `notModelled` y visible en Ajustes: la habilitación de noche (BFCL.210), la
recencia de vuelo cautivo (BFCL.200(d)), las 3 h por clase adicional (BFCL.160(b)) y las
equivalencias comerciales (BFCL.160(f)).

Ya no aplica lo del curso en una ATO ni los nueve exámenes: la app no sigue el curso.

## Hallazgo que cambia el orden de las fases

El Manual de Vuelo MV04r30 de Ultramagic **sí trae checklists**, así que la fase 3 pasa de
ser la cara a la barata:

| Fuente | Contenido |
|---|---|
| Apéndice C | Chequeo prevuelo, nueve bloques, unos 33 ítems literales en castellano |
| Sección 4 | Procedimientos estándar: preparación, inflado, chequeo antes del despegue, briefing de pasajeros, despegue, vuelo, aterrizaje |
| Sección 3 | Emergencias, incluido contacto con líneas eléctricas |

`CRITICAL:` El contenido se **transcribe**, no se escribe. Una checklist de globo es un
documento de seguridad.

## Lista de verificación en el Android, pendiente

`CRITICAL:` el spec §9 exige probar **en el Android real y con la app instalada desde
Chrome**, no en Chrome de escritorio ni en el emulador. El service worker, la persistencia y
la geolocalización se comportan distinto instalados que en una pestaña. No se puede hacer
hasta que la app esté desplegada.

- [ ] La app arranca sin cobertura, con el modo avión puesto.
- [ ] `navigator.storage.persisted()` devuelve `true` con la app instalada. Comprobarlo, no
      darlo por hecho: `persist()` puede conceder o no.
- [ ] El teclado no tapa el campo que se está escribiendo en el detalle, y el `100dvh` no
      deja la barra de pestañas debajo del teclado.
- [ ] `confirm()` y `alert()` de los borrados funcionan de verdad y no devuelven `false` sin
      avisar. Ya pasó dentro de un iframe de artefacto, aquí no debería, pero se comprueba.
- [ ] La geolocalización del cierre rápido pide permiso y, si se deniega, la pantalla sigue
      siendo usable.
- [ ] El tema claro se lee al sol, y el ámbar sobre fondo claro es `#8a5a00` y no `#fab219`.
      El tema lo manda el ajuste del sistema de Android, que se conmuta sin reinstalar.
- [ ] Al sacar la app de recientes y volver, el último cambio sigue guardado.
- [ ] El **botón de atrás del sistema** sale de las pantallas interiores y no cierra la app
      desde el detalle. Es un botón de sistema, no un gesto opcional como en iOS, así que
      esto se usa constantemente.
- [ ] La instalación desde Chrome deja un icono de verdad, no un acceso directo, y abre sin
      barra de direcciones.

## La lección de las cuatro auditorías

De los 34 defectos encontrados, **cinco los introdujeron mis propias reparaciones**. El
patrón, diagnosticado por el tercer auditor: las reescrituras cambian más superficie de la
que declara el commit, y después se escriben pruebas que congelan el resultado nuevo sin
que exista ninguna que ate el caso que se rompió. Hubo que borrar una prueba que fijaba un
comportamiento equivocado.

Lo que funcionó para detectarlo: **auditoría adversarial contra el PDF del reglamento, más
mutación sistemática de cada guarda**. Las pruebas verdes por sí solas no valieron: las 22
primeras pasaban porque los fixtures no tenían ni dos globos distintos ni una firma de
instructor.

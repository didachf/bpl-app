# Logbook BPL, estado

Última sesión: **2026-09-03**. Siguiente tarea: **el plan de la interfaz**. Rama `feat/logbook-nucleo`, sin fusionar a `main`.

## Qué es

PWA instalable en el iPhone para el ciclo completo de un vuelo en globo: registro de
vuelos, planificación y operaciones. Usuario único (Dídac, alumno de BPL en Ultramagic),
diseñada para que un segundo piloto la pueda usar sin reescribirla.

**Empieza por** `docs/superpowers/specs/2026-09-01-bpl-app-design.md`. Manda sobre todo lo
demás y está enmendado tres veces.

## Dónde está cada cosa

| | |
|---|---|
| Spec | `docs/superpowers/specs/2026-09-01-bpl-app-design.md` |
| Plan del núcleo, ejecutado | `docs/superpowers/plans/2026-09-01-logbook-nucleo.md` |
| Dominio, funciones puras | `src/domain/` |
| Persistencia y sincronización | `src/db/store.ts`, `src/sync/github.ts` |
| Maquetas de pantalla | `design/*.dc.html`, nueve artboards, publicadas en el enlace de abajo |
| Interfaz | **no existe todavía**, `src/app.tsx` es un marcador |

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
- **Seguimiento del curso retirado** el 03/09/2026. Fuera el panel de progreso hacia el
  BPL y `src/domain/progress.ts` con sus 31 pruebas. Inicio enseña el acumulado del
  cuaderno. Ver spec §5.
- **Dirección visual elegida:** Instrumento. Oscuro por defecto, IBM Plex Sans y Mono,
  cifras monoespaciadas. **Nueve artboards**: las cinco pestañas (Inicio, Vuelos,
  Planificar, Operar, Ajustes), las dos pantallas internas (Cerrar vuelo, Detalle) y dos en
  tema claro.

## Contrato del dominio, lo que consume la interfaz

Todo en `src/domain/` son funciones puras: no importan nada del navegador. Firmas exactas al
03/09/2026, para no tener que leer los ficheros:

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

1. **Escribir el plan de la interfaz** (`docs/superpowers/plans/2026-09-XX-logbook-ui.md`),
   a partir de las maquetas y del contrato de arriba. El dominio está cerrado: no tocarlo
   salvo que la interfaz descubra un hueco real, y en ese caso con prueba primero.
2. **Implementar las pantallas** en este orden, que es el de dependencia: contexto de
   estado, Ajustes (para poder meter globos y personas), Cerrar vuelo, Vuelos, Detalle,
   Inicio. Planificar y Operar quedan como esbozo navegable.
3. **Empaquetado PWA** y despliegue a GitHub Pages con el `dist/` comiteado.
4. Crear el repositorio privado `bpl-logbook` y el token de grano fino.
5. Fase 2: planificación, con el puerto de `trayectoria_globo.py` y el mapa.
6. Fase 3: checklists, transcritas del Manual de Vuelo. Ver abajo.

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

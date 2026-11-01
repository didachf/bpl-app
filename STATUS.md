# Logbook BPL, estado

## 01/11/2026, noche: la pantalla de vuelo en la tablet

Dídac aprobó las seis maquetas de la fase 2 «tal como están». Hecha la pantalla de vuelo en dos planes
(`2026-11-01-vol-logica.md` y `2026-11-01-vol-pantalla.md`, con sus cambios al final), sin push ni
publicar. `#/vol` sólo en la tablet (modo del aparato en Ajustes), entrada desde Operar.

* **Començar vol:** techo, pronóstico, relieve y ortofoto para volar sin cobertura, calibración de la
  altitud en tierra (§6.2), y se abre con pronóstico y calibración.
* **En vuelo:** mapa con la ortofoto guardada, traza por altitud, proyección sin waypoint, zona
  alcanzable, plan por tramos (a ras en verde discontinuo), punto más cercano, tarjeta del plan,
  avisos del motor, franja A o B, menú Més, salir y volver, acabar con confirmación.
* **Waypoints** en el documento (esquema 3): lista, marcar al mapa con objetivo y resultado en
  directo, coordenadas en decimal, grados minutos y segundos o UTM (contra PROJ al milímetro).
* El motor corre en un worker cada 15 s y devuelve ahora el camino y el punto más cercano.
* Comprobado en Chromium a 1 280 × 800 con GPS simulado, recorrido entero. Encontrado y
  arreglado un fallo de verdad: mosaicos del ICGC que no contestan paraban la descarga 10 min.
* 718 pruebas. **Siguiente:** que Dídac decida publicar para probarla en su tablet (push y Pages
  son suyos). Parte 3: vista Vent, zonas, mejor izquierda y derecha, Camps, Acabar vol al Registre.

## 01/11/2026, noche: capa de datos de la pantalla de vuelo

Todo lo que la pantalla de vuelo necesita por debajo, sin pantalla, en `src/services/vuelo/`.
Plan `docs/superpowers/plans/2026-11-01-datos-de-vuelo.md`, con sus cambios al final. Sin push
ni publicar, y sin tocar `dist/`, que sólo cambia al publicar.

* **Previsión:** la petición de §5.1 (siete modelos, 42 variables, 29,4 llamadas) de una hora
  antes a 24 h después, guardada en IndexedDB, refresco como mucho cada 30 min y, sin red, la
  guardada con el error.
* **Relieve:** 36 mosaicos Terrarium en 20 km a la rejilla del motor. En Chromium, la del 10/10
  sale idéntica a la del prototipo en los 29 145 nodos.
* **Ortofoto:** 1 764 mosaicos del Mapa base (z12 a z15 en 15 km, z16 en 3 km), cuatro a la vez,
  sin repetir. El service worker los sirve de la caché `mosaicos` sin red (comprobado con un
  mosaico que no existe en el servidor), y guarda también los que se ven con conexión.
* **Motor en un Web Worker**, gana el último pedido. Con el 10/10, mismo resultado que en el
  hilo principal, de 98 a 191 ms en Chromium en el Mac.
* `prepararVol()` junta las tres descargas para el botón «Començar vol».
* 652 pruebas, 37 nuevas, y las guardas mutadas. Una vuelta de la suite falló una prueba justo
  tras un build y no se repitió en once vueltas más, dos con carga: sin causa conocida.
* **Siguiente:** su repaso de las seis maquetas, y después la pantalla, que ya tiene debajo
  todo esto. La capa de Leaflet tendrá que pedir los mosaicos con `crossOrigin: true`.
* **Más tarde, la lógica de la pantalla** (plan `docs/superpowers/plans/2026-11-01-vol-logica.md`): coordenadas
  en los tres formatos (UTM contra PROJ al milímetro), rumbo y distancia, calibración, rumbo, velocidad y
  vario del GPS, waypoints en el documento (esquema 3), sesión de vuelo y plan vigente. 696 pruebas.
  Dídac aprobó las seis maquetas de la fase 2 tal como están. Siguiente: la pantalla, parte 2.

## 01/11/2026, noche: las comprobaciones del §12 del 10/10

Hechas las cuatro, sin esperar al repaso de las maquetas porque no dependen de ellas. Resultado
en §12.1 del spec `2026-10-10-pantalla-de-vuelo-design.md`, con sus fuentes:

* **ICGC:** XYZ. El servicio de ortofoto del spec está **retirado desde el 28/02/2025** (sigue
  contestando). El que vale es el Mapa base, `servei/catalunya/mapa-base/wmts/orto/MON3857NW`,
  comprobado: CORS abierto, unos 31 KB por mosaico, CC BY 4.0, sin cláusula contra guardarlos.
* **open-meteo:** la petición de siete modelos pesa 29,4 llamadas (fórmula del servidor). El
  tiempo no cuenta bajo 14 días, así que se pide el día entero de una vez. Uso no comercial.
  El comentario de `openmeteo.ts` con «98 contra 270» estaba mal y queda corregido.
* **Chrome en Android:** elipsoide, del código de Chromium. `altitudeAccuracy` siempre nula.
  La calibración en tierra se queda.
* **Optimizador:** 230 ms en node. En la tablet, `ESTIMATE` por debajo de 1 s, a medir con el
  Web Worker.
* Relieve: los mosaicos de AWS tienen CORS abierto, unos 100 KB, EU-DEM en Cataluña, con su
  atribución de Copernicus.

**Siguiente, sin cambios:** su repaso de las seis maquetas, y después el plan de la pantalla.

## 01/11/2026, tarde: el motor sabe del relieve

Al preparar las maquetas de la fase 2 con el 10/10 salió que el motor no sabía dónde estaba el suelo:
de 380 m en el despegue a 430 bajo el globo y hasta 535 al este, con el mínimo del rango (1 500 ft,
457 m) bajo tierra en 77 de 143 puntos, y terra 40 m bajo el suelo. Decidido con el piloto: **mínimo
de 100 ft sobre el terreno bajo el recorrido** (editable), terra a ras también de paso, techo sobre el
mar. Fusionado en `main`, sin push ni publicar.

* Spec `docs/superpowers/specs/2026-11-01-relieve-design.md`, plan `docs/superpowers/plans/2026-11-01-relieve.md`.
* Relieve: AWS Terrain Tiles (Terrarium z12, unos 29 m), contrastado con GLO-90 a menos de 3 m. El del
  10/10 para pruebas en `docs/prototipos/2026-10-10-vuelo/relieve_10-10.json`.
* Terra al suelo de ahora o del punto con el viento de ras, franjas justo por encima, cada plan cortado
  donde deja de valer, zona pintada en una segunda pasada que poda, aviso de «si no fas res» contra el
  terreno. Dos fallos corregidos por el camino: el minuto del paso redondeado al inicio de una bajada
  (se perdía la orden de bajar) y el texto de «si no fas res» sin objetivo.
* 615 pruebas. Cada guarda nueva mutada y atada. Motor con relieve y el 10/10: unos 230 ms en node.
* Con el relieve, Aterrar en la zona A ya no llega: 1 500 ft queda a 27 m del suelo, el plan sube a
  1 750 ft, baja y flota hasta 140 m del punto. Sin relieve decía 42 m manteniendo 1 500 ft.
* **Maquetas de la fase 2 hechas**, seis pantallas en una fila nueva del lienzo (versión 39), con las
  órdenes, zonas y resultados reales del motor: marcar el punto con su objetivo (tablet y teléfono) y el
  mapa en vuelo para Aterrar, Passar a 2 500 ft y «no s'hi arriba». Copia en `design/pantalla-de-vol/`,
  generadas con `docs/prototipos/2026-11-01-objetivo/artboards.py`.
* **Siguiente:** que Dídac las repase. Después, plan de la pantalla de vuelo (con las comprobaciones del
  §12 del spec del 10/10, y bajar y guardar los mosaicos del relieve con el plan).

## 01/11/2026: objetivo de altura en el punto

El motor del 30/10 y esto están fusionados en `main` el mismo 01/11, sin publicar (no hay pantalla
que publicar) y sin push: `main` va 27 commits por delante de `origin`. Lo nuevo: cada punto lleva un objetivo de altura,
**Aterrar** (el que saldrá por defecto en la pantalla), **Passar a X ft** o **Qualsevol altura**, y la
distancia y la zona sólo cuentan dentro de su margen. Spec
`docs/superpowers/specs/2026-11-01-objetivo-de-altura-design.md`, plan
`docs/superpowers/plans/2026-11-01-objetivo-de-altura.md` con sus cambios al final. Sin pantalla.

* Con el 10/10 hacia la zona A: con Qualsevol el plan pasa por el punto **subiendo** a 2 250 ft (4 m);
  con Aterrar, mantener 1 500 ft 3 min, bajar rápido a terra y flotar hasta el punto (48 m, 08:46);
  con 2 500 ft pasa por el punto a esa altura subiendo (10 m).
* 573 pruebas, 53 nuevas. Cada guarda nueva se ha mutado y alguna prueba la detecta. `tsc -b` y
  `npm run build` limpios.
* Tiempo del motor en node con el 10/10: unos 250 ms sin objetivo y 150 a 200 ms con Aterrar, con la
  máquina cargada (`main` en las mismas condiciones, unos 200). Por debajo del límite de 2 s de la
  prueba. El objetivo de 1 s en la tablet se mide en la fase 2.
* **Siguiente:** fase 2, maquetas antes de código: marcar el punto con su
  objetivo, la zona alcanzable según el objetivo y el punto más cercano. Después la pantalla de vuelo.
* Observación: la búsqueda guarda los 40 planes más cercanos por distancia, y con muchos empates
  exactos (sólo pasa con campos sintéticos) puede quedarse fuera el de menos cambios. Lo que ve el
  piloto no cambia, porque las órdenes se cortan al pasar por el punto. Anotado, sin tocar.

## 30/10/2026: motor de navegación a un punto, fase 1

**En la rama `motor-navegacion`** (worktree `~/code/bpl-app-motor`), sin fusionar con `main` y sin
publicar. Sin pantalla: sólo el cálculo, en `src/services/nav/`.

* Spec: `docs/superpowers/specs/2026-10-30-motor-navegacion-design.md`. Plan ejecutado:
  `docs/superpowers/plans/2026-10-30-motor-navegacion.md`, con sus cambios al final.
* Qué hace: con la previsión de los siete modelos y la traza GPS, dice cómo llegar a un punto con
  hasta tres altitudes (2 min como mínimo cada una), o el punto más cercano posible y la zona
  alcanzable, y demuestra cuándo un punto no se alcanza. El viento medido corrige el error de la
  previsión (proceso gaussiano, como Loon) con el retraso del globo corregido.
* Con el vuelo real del 10/10 (escenario de `optim2.py`): pasa a 4 m de la zona A, contra 370 m sin
  hacer nada, en unos 180 ms en node. No es peor que la fuerza bruta del prototipo.
* 94 pruebas nuevas, 520 en total. `tsc -b` y `npm run build` limpios. Revisión de código
  independiente hecha: dos fallos serios en la decisión de «llega» y cinco menores, todos
  corregidos con su prueba (detalle al final del plan).
* **Siguiente:** fase 2, maquetas de la zona alcanzable y del punto más cercano en el lienzo, y
  después la pantalla de vuelo, que usará `navegar()` en un Web Worker. Antes de la pantalla,
  las comprobaciones del §12 del spec del 10/10. Luego, otras fuentes (METAR sin clave) y Claude.
* Observación para la fase 2: el motor busca la menor distancia horizontal, así que el plan
  puede pasar sobre el punto subiendo. Para aterrizar o marcar un blanco hará falta pedir llegar
  bajo, como la regla 3D del AXMER (§13 del spec del 10/10).

Última sesión: **2026-10-10**. Dos cosas:

1. **Cinturón de aterrizaje en el Últim xequeig**, publicado (commit `0515c48` en `main`, bundle
   `index-3L9J590H.js` comprobado en Pages). Va antes de «Mirar obstacles», donde el Apèndix C
   del MV04 pone el arnés de ocupantes (y §6.6). JSON en versión 5.
2. **Diseño de la pantalla de vuelo, sin código todavía.** Spec en
   `docs/superpowers/specs/2026-10-10-pantalla-de-vuelo-design.md`, quince maquetas en
   https://claude.ai/artifact/Frarp4bampNfwHn86kKNnf (copia en `design/pantalla-de-vol/`) y
   prototipos con datos reales en `docs/prototipos/2026-10-10-vuelo/`. **Siguiente sesión:
   Dídac hace el repaso final de spec y maquetas, y después plan de implementación de la pieza
   1 (tabla de viento prevista) y a programar.**

Lo que manda del 10/10, en una línea cada cosa, y el detalle en el spec:
* **La tablet y el teléfono son cosas distintas.** Navegación, rumbos y viento en directo, sólo
  en la tablet (Galaxy Tab S11 5G, sin barómetro). El teléfono: registro, plan y checklists.
  Una sola app con un modo por aparato en Ajustes.
* **En vuelo, todo en esta app.** Dos vistas, Mapa y Vent, con la franja de cifras grandes fija.
* **Altitud en pies sobre el mar**, filas cada 250 ft hasta el techo y cada 1 000 ft hasta
  10 000 ft. Siete modelos (entra AROME France).
* **Viento medido con el GPS** por franja, con la altura calibrada en tierra porque el GPS da
  elipsoide.
* **Waypoints, puntos o zonas**, marcados al mapa con cruz fija o por coordenadas (decimal,
  grados minutos segundos, UTM). A una zona se navega a su polo de inaccesibilidad. Sin
  waypoint activo no aparece nada del waypoint.
* **Optimizador** que dice cómo llegar con altitud y los cuatro modos de subida y bajada del
  piloto (lento de 0 a 1 m/s, rápido de 2,5 a 3 subiendo y de 3 a 5 bajando).
* **Pestaña propia «Competició»** (pieza 5), con el reglamento de la FAI en
  `Pilot Globus/08_Competicion/`. Notas en el §13 del spec.

Las checklists del 08/10 siguen pendientes de que él las pruebe en un montaje de verdad.

**En catalán desde el mismo 08/10/2026** (versión 4 del JSON), por petición suya: «lo quiero en catalán». Contenido y textos de las pantallas de Operar y de la checklist. El resto de la app sigue en castellano. La fuente de los pasos suyos es `Pilot`.

**Checklists de Operar, versión 3, desde el 08/10/2026.** Montaje (27 pasos), inflado (21) y
último chequeo (7). **Sustituyen enteras** a las del 06/10/2026, que eran transcripción del
manual en el orden del manual: «todo lo que hemos hecho en la app de checkeos es sustituido
por esto de hoy». Los pasos y el orden los dictó él, cada uno con su fuente (apartado del
MV04, Apéndice C, norma, o `Piloto` si es procedimiento suyo). El repaso punto a punto, con
cada decisión y sus palabras, está en `docs/revision-montaje-inflado-08-10-2026.md`.
Contenido en `src/ops/checklists.json`, lógica pura en `src/ops/checklist.ts`. Llevan el
aviso de pendiente de validar hasta que el JSON diga `"validado": true`, y eso lo pone él,
no yo.

**Pasos que se despliegan.** El test del quemador (10 subpasos), el interior de la barquilla
(extintor, botiquín y documentos) y las pertenencias (9 cosas). Se marca cada subpaso, y el
paso no se puede marcar hasta tenerlos todos. Desmarcar un subpaso desmarca su paso. Es
petición suya: «que no estén en los pasos generales, sino test quemador, se despliega esto».
Campo `subpasos` en el JSON, un solo nivel.

**Planificar ya funciona con datos reales.** Es, según Dídac, la pantalla principal de la
app. Se investigó con fuentes primarias antes de escribirla y salieron tres errores de
fondo en el spec, corregidos en §6.

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
| Viento y modelos | `src/services/`, y `src/ui/windLimits.ts` para el juicio |
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
- **Planificar, con viento real.** Mapa de Leaflet con punto libre, siete niveles de abajo
  arriba, abanico de rumbos, banda de velocidad y el juicio del viento en superficie contra
  el manual del globo. Comprobado contra la API de verdad sobre Igualada.
- **Esquema 2 del documento.** `maxSurfaceWindKt` en `Balloon` y `personalWindLimitKt` en
  `Pilot`, con migración y prueba primero. Es el único hueco de dominio que la interfaz ha
  necesitado abrir.
- **Instalada en el Android de Dídac** el 02/09/2026. La opción de Chrome vive escondida en
  el menú de tres puntos y se llama distinto según la versión, así que Inicio lleva ahora un
  aviso de **instalar** con su botón, y unas instrucciones a mano para cuando el navegador
  no dispara `beforeinstallprompt`. Ver `src/ui/components/Instalar.tsx`.
- **Seguimiento del curso retirado** el 02/09/2026. Fuera el panel de progreso hacia el
  BPL y `src/domain/progress.ts` con sus 31 pruebas. Inicio enseña el acumulado del
  cuaderno. Ver spec §5.
- **Dirección visual elegida:** Instrumento. Oscuro por defecto, IBM Plex Sans y Mono,
  cifras monoespaciadas. **Nueve artboards**: las cinco pestañas (Inicio, Vuelos,
  Planificar, Operar, Ajustes), las dos pantallas internas (Cerrar vuelo, Detalle) y dos en
  tema claro.
- **Checklists de montaje (69 ítems) y pre-despegue (54)**, el 06/10/2026. Transcritas del
  MV04 r30: montaje de 2.2 y 4.2 a 4.7, pre-despegue del Apéndice C con lo de 4.8.1, 2.4 y
  2.5 metido en su bloque, más el briefing de 4.8.2 y el despegue de 4.9. Cada ítem lleva
  su apartado. Ruta `#/operar/<id>`. Marcas en `localStorage` selladas con la `version`
  del JSON y **caducan a las 6 h del último cambio**, para que las de la mañana no salgan
  por la tarde como hechas. Reiniciar en dos toques dentro de la página, sin `confirm()`.
  Pantalla encendida con `wakeLock` mientras está abierta. 30 pruebas nuevas, 402 en total.
  Comprobado en Chromium con Pixel: toques seguidos, recarga, caducidad, versión vieja,
  JSON roto, reinicio e identificador que no existe. La comprobación encontró un defecto
  (tres toques seguidos guardaban sólo el último, por leer el estado viejo) y está reparado.
  **Si se cambia un ítem, subir `version`**, que descarta las marcas guardadas.
- **Checklist de inflado (27 ítems)**, el mismo 06/10/2026, porque Dídac echó en falta el
  procedimiento de inflado. Sale de 4.7, texto y figura de tres pasos (frío, caliente, de
  pie), con 4.6, 6.5, 3.3 y 7.5.1 metidos donde tocan. El paracaídas y las instrucciones a la
  tripulación de corona **pasaron del montaje al inflado**, así que el montaje queda en 59
  ítems y termina con la envoltura extendida. `version` del JSON a 2. 403 pruebas.
- **Operar en dos apartados**, también a petición suya: «Preparación y montaje» (montaje e
  inflado) y «Check antes de despegar» (pre-despegue). Salen de `grupos` en el JSON, y la
  validación exige cada checklist en un grupo y sólo en uno. 407 pruebas.

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

1. **Repaso final del spec y las maquetas de la pantalla de vuelo con Dídac**, y plan de
   implementación de la pieza 1 con la skill de planes. Antes de escribir código, las cuatro
   comprobaciones del §12 del spec: mosaicos del ICGC, cuota de open-meteo, altitud de Chrome en
   Android y coste del optimizador.
2. **Las piezas en orden:** 1 tabla de viento prevista, 2 GPS en vuelo y optimizador, 3 plan de
   vuelo dentro de la app con un solo motor, 4 sincronización entre aparatos y planes del Mac,
   5 Competició.
3. **Crear el repositorio privado `bpl-logbook` y el token de grano fino.** Lo hace Dídac,
   no yo: un PAT no debe pasar por una conversación. Instrucciones abajo. **Desde el 10/10 ya
   no es opcional**: el plan del teléfono y el vuelo de la tablet tienen que viajar entre los
   dos aparatos.
4. **Pasar la lista de verificación del Android**, con la app ya instalada desde Chrome, y
   ahora también en la tablet.
4. Fase 3: checklists. Hechas montaje, inflado y pre-despegue. **Primero, que Dídac las
   valide contra el papel** y entonces `"validado": true`. Quedan control en vuelo (4.10),
   aterrizaje (4.11) y emergencias (sección 3).

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
- **En Planificar se investiga antes de escribir.** El 02/09/2026, tres cosas que el spec
  daba por buenas eran falsas: 925 y 900 hPa no son la banda de gobierno, contar modelos que
  coinciden no es una probabilidad, y Part-BFCL no tiene ninguna cifra de viento. Las tres
  salieron de fuentes primarias, no de razonar.
- **La incertidumbre se dice como desacuerdo, nunca como probabilidad.** Ni porcentajes, ni
  «N de 6 modelos». Los cortes de juntos, dispersos y dispares son convención nuestra y la
  pantalla lo dice.
- **El límite de viento no se cablea.** Es del manual del globo y cambia por envolvente: 15
  kt en el FM04 de Ultramagic, 12 en el Suplemento 34 para la N-500.
- **Una ausencia se enseña.** `ecmwf_ifs025` no tiene 900 hPa y devuelve nulos sin error: la
  pantalla lo dice con el nombre del modelo.
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
- [x] La instalación desde Chrome deja un icono de verdad, no un acceso directo, y abre sin
      barra de direcciones. **Hecho el 02/09/2026.**

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

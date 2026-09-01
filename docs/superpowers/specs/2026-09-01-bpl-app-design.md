# Diseño: app de vuelo en globo (BPL)

**Fecha:** 2026-09-01
**Autor:** Dídac (didac@highfrontier.es), con Claude
**Estado:** aprobado, pendiente de plan de implementación

---

## 1. Objetivo

Aplicación de teléfono para todo el ciclo de un vuelo en globo de aire caliente:
planificación, operaciones e historial de vuelos.

Usuario único (Dídac), alumno de BPL en la ATO Ultramagic (Òdena), volando desde
Igualada, Tàrrega y Agramunt. Diseñada para que un segundo piloto pueda usarla sin
reescribirla, pero sin cuentas de usuario ni multiusuario.

**Volumen esperado: menos de 100 vuelos en toda la vida útil.** Esta cifra manda sobre
casi todas las decisiones técnicas de abajo.

---

## 2. Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Ambición | Personal, pero exportable | Sin cuentas ni backend multiusuario. No cablear nombres ni globos concretos |
| Plataforma | PWA instalable en pantalla de inicio | Sin Xcode, sin cuenta de desarrollador, iteración inmediata |
| Conectividad | Online cuando la hay, caché local siempre | Sin cobertura en los campos de aterrizaje |
| Stack | Vite, Preact, TypeScript | Componentes y tipos. Preact pesa 3 kB |
| Persistencia | Documento JSON único vía `idb-keyval` | Con menos de 100 vuelos, Dexie e índices no compran nada |
| Copia de seguridad | Empuje automático a repositorio privado de GitHub | Gratis, versionado, restaurable a mano sin la app |
| Primer módulo | Logbook a fondo | Es la espina dorsal de datos, y las horas no registradas hoy se pierden |
| Mapa | Fase 1, online. Fase 2, cacheado | El usuario elige punto de despegue libre, no solo sitios guardados |

### Descartado y por qué

- **Artifact de Claude.** La CSP bloquea toda petición de red que no sea cargar un script
  de CDN. No podría llamar a open-meteo ni descargar teselas.
- **Dexie e IndexedDB con índices.** Dimensionado para miles de registros. Con 100, el
  conjunto entero cabe en memoria y se filtra con `Array.filter`.
- **Nativa iOS con SwiftUI.** Mejor acceso a sensores, pero exige Xcode, 99 USD al año y
  un ciclo de iteración mucho más lento. El usuario es Python primero, no Swift.
- **Backend propio.** Un servicio más que mantener para un solo usuario.
- **Fotos dentro del documento.** Cinco fotos por vuelo son 1,5 GB en 100 vuelos.

---

## 3. Arquitectura

Cinco capas. La frontera que importa es `domain/`.

| Capa | Contenido | Dependencias |
|---|---|---|
| `db/` | Carga y guardado del documento, `idb-keyval` | Ninguna |
| `domain/` | **Funciones puras**: contadores BFCL, validación, derivación de grupo, migraciones de esquema | Ninguna. Ni DOM ni almacenamiento |
| `sync/` | Empuje y restauración contra la API de GitHub | `db/` |
| `services/` | Meteo (open-meteo), mapa (Leaflet), geolocalización | Ninguna |
| `ui/` | Componentes Preact y rutas | Todas |

`domain/` no toca el navegador a propósito. Los contadores de BFCL.130 y BFCL.160 son la
única parte de la app donde un error tiene consecuencia real: presentarse a un examen sin
cumplir requisitos, o volar sin vigencia. Al ser funciones puras se cubren con Vitest en el
Mac, sin navegador ni mocks. Ahí va el esfuerzo de pruebas.

### Despliegue

GitHub Pages sirviendo `dist/` **comiteado al repositorio**. Versiones de npm fijadas
exactas. Si dentro de tres años la cadena de herramientas se pudre, la app desplegada sigue
funcionando y solo quedan bloqueados los cambios nuevos.

Service worker generado por `vite-plugin-pwa` con Workbox, precache del app shell.

### Dos repositorios

- **`bpl-app`, público.** Código. GitHub Pages gratis exige repositorio público. Es seguro
  porque el token nunca vive en el código, solo en el almacenamiento del teléfono. Efecto
  colateral deseado: otro piloto clona, despliega y apunta a su propio repositorio de datos.
- **`bpl-logbook`, privado.** Solo `logbook.json` y `tracks/`. Datos personales.

---

## 4. Modelo de datos

Un único documento JSON. La misma estructura vive en IndexedDB, se sube a GitHub y se abre
en el Mac. **No hay ruta de exportación separada, porque exportar es copiar el fichero.**

```
{
  schemaVersion: number,
  pilot:    Pilot,
  balloons: Balloon[],
  sites:    Site[],
  people:   Person[],
  flights:  Flight[]
}
```

### `Pilot` (registro único)
Nombre y dirección, que AMC1 BFCL.050(a)(1) exige explícitamente. Número de licencia,
fecha del reconocimiento médico.

### `Balloon`
Matrícula, fabricante, modelo, clase (aire caliente o gas), volumen de envolvente en m³.

**El grupo se calcula, no se guarda**, para que no pueda quedar incoherente con el volumen.
Fronteras según el Balloon Rulebook (pág. 4794 del texto extraído):

| Grupo | Volumen de envolvente |
|---|---|
| A | hasta 3.400 m³ |
| B | 3.401 a 6.000 m³ |
| C | 6.001 a 10.500 m³ |
| D | más de 10.500 m³ |

El grupo importa por BFCL.160(d), que limita en qué globos se pueden ejercer las
atribuciones tras recuperar la vigencia.

### `Site`
Campos de despegue y aterrizaje. Nombre, coordenadas, elevación, propietario y estado del
permiso, notas de acceso para el coche de recuperación.

Se siembra con los tres que ya están en `trayectoria_globo.py`:

| Sitio | Lat | Lon | Elev (m) |
|---|---|---|---|
| Igualada | 41,5842 | 1,6528 | 329 |
| Tàrrega | 41,6470 | 1,1400 | 383 |
| Agramunt | 41,7869 | 1,0967 | 345 |

### `Person`
Instructores, examinadores, tripulación de tierra, pasajeros. Rol y número de licencia
cuando aplique.

### `Flight`

**Bloque reglamentario.** Uno por uno los campos de AMC1 BFCL.050(a)(2):

- `date`
- `picId`, referencia a `Person`
- `departure`: `{ siteId, timestamp }`
- `arrival`: `{ siteId | coords, timestamp }`. Admite coordenadas sueltas, porque en globo
  se aterriza donde se puede y no en un sitio del catálogo
- `balloonId`, que aporta fabricante, modelo, matrícula y clase
- `durationMin`. Se calcula de las dos marcas de tiempo, pero admite anulación manual,
  porque la hora de despegue real y la de puesta en marcha pueden diferir. Si hay anulación
  se guarda el valor y una marca de que es manual
- `function`: `PIC` | `PIC_SOLO_SUPERVISADO` | `DUAL` | `FI_B` | `FE_B`
- `conditions`: `{ dayNight: 'day' | 'night', tether: 'free' | 'tethered' }`
- `inflations`, `takeoffs`, `landings`, como contadores enteros. Un vuelo de instrucción
  puede llevar varios
- `instructorId` y `signatureStatus`.
- `check`: `null`, o un objeto `{ type, examinerId, result }` donde `type` es `skill_test`
  o `proficiency_check`, y `result` es `passed` o `failed`. **Enmendado el 2026-09-02 tras
  la auditoría.** La primera versión era un simple `checkType`, que aceptaba una
  verificación sin examinador y sin saber si se aprobó. BFCL.160(c) exige "shall **pass** a
  proficiency check **with an FE(B)** in a balloon that represents the relevant class", y
  AMC1 BFCL.050(b)(1)(ii) habla de "**successfully completed** skill tests and proficiency
  checks". Un objeto único en lugar de tres campos sueltos hace imposible representar los
  estados ilegales: no puede haber examinador sin verificación, ni resultado sin tipo.
- `recencyTrainingFlight`: booleano. Marca que este vuelo de doble mando cumple las
  condiciones de AMC1 BFCL.160(a)(1)(ii)(a): sigue el contenido del examen práctico y se
  hace uno a uno entre un piloto y un instructor, sin otro piloto a bordo que se acredite
  el vuelo. **No es inferible de los demás datos**, es un juicio del instructor, así que se
  marca a mano. Sin este campo cualquier doble mando servía para la vigencia de 48 meses,
  que era un falso positivo. BFCL.160(e) exige firma del FI(B) responsable para
  los vuelos de doble mando y los supervisados

**Bloque operacional.** Validado con el usuario el 2026-09-01:

- `crew`: pasajeros y equipo de tierra, referencias a `Person`
- `observedWeather`: la meteo que hubo de verdad, para contrastar con la pronosticada. Con
  el tiempo calibra las previsiones
- `maxAltitudeM`, `distanceKm`, `notes`
- `trackRef`: identificador del fichero de traza, si lo hay
- `complete`: booleano. Ver §6, captura rápida

**Descartado explícitamente:** combustible. El usuario no lo anota.

**Nada derivado se guarda.** El acumulado de horas y todos los contadores se calculan al
vuelo desde `flights[]`. Es la única forma de que no puedan mentir tras editar un vuelo
antiguo.

### Trazas GPS, fuera del documento

Una traza de 2 h a 1 Hz son 100 a 500 kB. Cien vuelos serían 10 a 50 MB dentro del
documento, y cada pulsación de tecla al editar una nota reescribiría y reenviaría todo.

Por eso: `tracks/<flightId>.json`, un fichero por vuelo, subido una sola vez al cerrar el
vuelo y nunca reescrito.

**Fotos fuera del alcance de la versión 1.** No aportan al logbook reglamentario y son lo
que rompe el modelo. Si más adelante se quieren, van reducidas a 1.600 px y como ficheros
aparte, nunca dentro del documento.

---

## 5. Los dos paneles de contadores

Es la razón por la que la app gana a una hoja de cálculo. Ambos se calculan con funciones
puras en `domain/`.

### Progreso hacia el BPL, contra BFCL.130(b)

Texto verificado contra el Balloon Rulebook local:

| Requisito | Umbral |
|---|---|
| Instrucción de vuelo | 16 h |
| De ellas, doble mando | 12 h |
| Inflados | 10 |
| Despegues y aterrizajes | 20 |
| Vuelo solo supervisado y firmado | 1, de al menos 30 min |

**Qué vuelos cuentan.** Enmendado el 2026-09-02 tras la auditoría. Antes contaba cualquier
vuelo, que era un falso positivo de los caros. Un vuelo aporta a estos contadores solo si:

1. **Es del globo correcto.** BFCL.130(b) dice "at least 16 hours of flight instruction **in
   either hot-air balloons that represent group A of that class, or gas balloons**". Así que
   cuenta si el globo es de gas, o si es de aire caliente **de grupo A**, es decir hasta
   3.400 m³ de envolvente. El crédito para horas fuera del grupo A que daba el Artículo
   3c.1(b) era transitorio y expiró el 8 de abril de 2021.
2. **Está firmado por el instructor**, cuando la función lo requiere. AMC1
   BFCL.050(b)(1)(ii) permite anotar el solo supervisado como PIC "provided that ... the
   logbook entry is **signed by the supervising instructor**". Y AMC1 BFCL.160(a)(1)(ii)(c)
   deja claro por qué importa: si el instructor considera que el alumno no estuvo a la
   altura, "they should **not** sign the logbook". Un vuelo sin firmar es exactamente el
   vuelo que el instructor no dio por bueno.
3. **Tiene supervisor identificado**, si se anota como solo supervisado. BFCL.130(b)(3) dice
   "one **supervised** solo flight".

### Vigencia, contra BFCL.160(a)

Empieza a contar el día de la emisión de la licencia.

| Requisito | Ventana |
|---|---|
| 6 h como PIC | últimos 24 meses |
| 10 despegues y aterrizajes, como PIC o en doble mando o solo bajo supervisión de FI(B) | últimos 24 meses |
| 1 vuelo de instrucción con FI(B) | últimos 48 meses |

**BFCL.160(a) son dos vías alternativas, no una principal y una de rescate.** Corregido el
2026-09-02 en la tercera auditoría. El texto dice "(1) **either** (i) … and (ii); **or** (2)
… a proficiency check". El apartado (c) solo define qué es esa verificación y cuándo es
obligatoria, no convierte a (a)(2) en subsidiaria.

Vía (a)(2): una verificación de competencia **aprobada, ante un FE(B) que no sea el propio
piloto, y en la clase pertinente**, en los últimos 24 meses.

Quien cumple las dos está cubierto por **la que dure más**, y el grupo máximo de BFCL.160(d)
es **el mayor** de los dos, porque GM1 BFCL.015(c) dice que las atribuciones del grupo mayor
"can be exercised once the recency requirements are complied with in that bigger group".

Tratarlas como excluyentes hacía que el informe se contradijera solo: anunciaba una
caducidad y seguía diciendo "cumples" al día siguiente.

El panel muestra **la fecha exacta en que cada contador caduca**, no solo si se cumple hoy.

#### La vigencia es por clase de globo

Enmendado el 2026-09-02. BFCL.160(a) dice "shall only exercise the privileges ... if he or
she has completed **in the relevant balloon class**". No hay un contador de vigencia, hay uno
por clase. La función recibe la clase para la que se pregunta.

#### Límite de grupo tras recuperar la vigencia, BFCL.160(d)

Tras cumplir (a), (b) o (c), las atribuciones en aire caliente quedan limitadas al **grupo
del vuelo de instrucción o de la verificación, o a uno de envolvente menor**. El panel
devuelve ese grupo máximo, no solo un sí o un no. Estaba en el spec desde el principio como
la razón de ser de `groupFromVolume`, y la primera implementación no lo cableó.

#### BFCL.160(b) no se modela, y se dice

Los apartados (b), tres horas en cada clase adicional en 24 meses, y (f), las equivalencias
con el habilitamiento comercial, **no están implementados**. En lugar de ignorarlos en
silencio, el informe de vigencia lleva una lista de avisos que los nombra cuando el
documento contiene vuelos de más de una clase. La app nunca dice "cumples" tapando un
requisito que no ha mirado.

#### Las personas se validan, no basta un identificador

Segunda auditoría, 2026-09-02. El reglamento no dice "un identificador cualquiera", dice
quién: BFCL.160(c) "a proficiency check **with an FE(B)**", BFCL.160(a)(1)(ii) "one training
flight **with an FI(B)**", BFCL.130(b)(3) "one **supervised** solo flight". Sin validar
contra `people` y su rol, bastaba escribir el id del propio piloto para autoexaminarse y
conceder dos años de vigencia.

#### Cuatro clases de globo, no dos

BFCL.010 define aire caliente, gas, mixto y dirigible de aire caliente. Solo las dos
primeras sirven para BFCL.130(b). Un dirigible se anotaba como aire caliente y, si el
volumen caía en grupo A, contaba para las 16 h.

### Interpretaciones resueltas

Puntos donde el reglamento admite lectura y hubo que elegir. Se dejan por escrito para que
nadie los "corrija" en la dirección contraria sin saber que fue deliberado.

| Punto | Elección | Motivo |
|---|---|---|
| "20 take-offs and landings" de BFCL.130(b)(2) | 20 despegues **y** 20 aterrizajes | Lectura conservadora. En globo todo vuelo libre tiene un despegue y un aterrizaje, así que la otra lectura daría 10 vuelos, la mitad |
| "16 hours of flight instruction" | Doble mando **más** solo supervisado | El contraste con "12 hours of **dual** flight instruction" solo tiene sentido si las 4 h restantes pueden no ser doble mando |
| "6 hours of flight time as PIC" de BFCL.160(a)(1)(i) | Solo funciones que se anotan como PIC. **El doble mando no** | La coletilla "as PIC or flying dual or solo under the supervision of an FI(B)" modifica a "10 take-offs and landings", no a las 6 h. El spec lo tuvo mal hasta el 2026-09-02 |
| Periodo de 48 meses | Desde el **último día del mes** del vuelo de instrucción | AMC1 BFCL.160(a)(1)(ii)(e), literal. Contarlo desde la fecha del vuelo pierde hasta 30 días de vigencia |
| Vuelo exactamente en el borde de la ventana de 24 meses | **No cuenta** | El reglamento no lo resuelve. Ante la duda, la opción que nunca dice "puedes volar" de más. Cuesta un día |
| Vuelo con hora de llegada anterior a la de salida | Aporta 0 y **marca el contador como parcial** | Un dato malo no puede restar horas, pero tampoco puede desaparecer en silencio |

---

## 6. Pantallas

Cinco pestañas inferiores: Inicio, Vuelos, Planificar, Operar y Ajustes. Vuelo (detalle) no
es pestaña, se abre desde Vuelos y desde Inicio.

### Inicio
Los dos paneles de contadores arriba. Botón grande de nuevo vuelo. Indicador de
sincronización. Lista de vuelos incompletos pendientes de rematar.

### Vuelos
Lista en orden cronológico inverso. Tarjeta por vuelo: fecha, globo, sitio, duración,
función, aviso si falta firma del instructor. Cabecera con el acumulado. Filtros por año,
globo y función.

Sin paginación ni scroll virtual. Con 100 registros no hace falta.

### Vuelo (detalle)
Formulario partido en los dos bloques, reglamentario y operacional, plegables. Validación
que **avisa pero no bloquea**, por ejemplo hora de llegada anterior a la de salida.

### Planificar
En fase 1 contiene solo el viento. La deriva llega en fase 2, en esta misma pantalla.

Mapa (Leaflet, teselas OSM, **solo online en fase 1**). Se toca cualquier punto y devuelve
la previsión de viento a 925 y 900 hPa de los seis modelos de open-meteo, hora a hora.

Los seis modelos, ya validados en `trayectoria_globo.py`: `icon_eu`, `gfs_seamless`,
`gem_seamless`, `ukmo_global_deterministic_10km`, `meteofrance_arpege_europe`,
`ecmwf_ifs025`.

Punto libre y no solo sitios guardados, porque **el punto de despegue se decide cada día en
función del viento**, que es justamente lo que esta pantalla informa.

### Operar

Esbozo navegable. Motor de checklists que lee su contenido de un JSON, y una única
checklist de ejemplo marcada en pantalla como NO OPERACIONAL. Sin persistencia de
ejecución en fase 1.

El contenido real se transcribe del Manual de Vuelo en fase 3. Ver §10.

### Ajustes
Catálogos de globos, sitios y personas. Datos del piloto. Token, estado de sincronización,
restaurar desde el repositorio.

### El detalle de diseño que decide si se usa

Después de aterrizar, con el globo en el suelo y el equipo plegando, nadie rellena veinte
campos. Si el único camino es el formulario completo, la app se abandona en tres semanas.

Dos caminos de entrada:

1. **Cerrar vuelo.** Cuatro campos: hora de aterrizaje, dónde, cuántos aterrizajes, nota
   libre. Diez segundos. Se guarda con `complete: false`.
2. **Completar.** En casa, formulario entero.

Inicio recuerda los incompletos. Los contadores usan lo que haya y **señalan cuáles se
apoyan en datos incompletos**.

---

## 7. Sincronización

IndexedDB es el origen de la verdad. Cada cambio marca estado sucio y encola un empuje
(con rebote, para no subir en cada tecla).

Se sube un **snapshot completo** en `logbook.json`, no diferencias. Con menos de 100 vuelos
el fichero pesa unos 150 kB, y a cambio el repositorio siempre contiene algo legible y
restaurable a mano sin la app. Cada empuje es un commit, así que hay historial por vuelo.

**Conflictos.** La API de contenidos de GitHub devuelve el `sha` del fichero. Si no coincide
con el que teníamos, alguien escribió desde otro dispositivo. **No se fusiona
automáticamente.** Se avisa y el usuario elige. Una fusión automática silenciosa de un
logbook es peor que un aviso.

**Token.** PAT de grano fino de GitHub, con permiso de contenido restringido a
`bpl-logbook`, **con fecha de caducidad de un año**, guardado en `localStorage`. Decidido el
2026-09-02 tras la revisión de seguridad.

`WARNING:` **El origen de GitHub Pages es compartido.** La app se sirve en
`didachf.github.io/bpl-app/`, pero el origen del navegador es `didachf.github.io` entero, no
la subcarpeta. `localStorage`, IndexedDB y cookies se comparten con cualquier otro proyecto
que se publique con Pages en esa cuenta. Comprobado el 2026-09-02: hoy no hay ninguno, nueve
repositorios y cero sitios de Pages, así que el riesgo es futuro y no presente.

Lo que acota el daño: el permiso del token alcanza solo a `bpl-logbook`. Robarlo cuesta el
logbook, no la cuenta de GitHub. Y caduca en un año.

Si algún día se publica un segundo sitio de Pages en esa cuenta, hay que mover esta app a un
dominio propio o a una organización aparte.

`WARNING:` Quien acceda al teléfono desbloqueado puede leer el token. Es revocable en un
clic desde la configuración de GitHub.

**Consecuencia para la interfaz:** nunca `dangerouslySetInnerHTML` ni equivalentes. Preact
escapa por defecto, y esa es la única barrera entre una nota de vuelo y el token.

---

## 8. Modos de fallo

| Fallo | Comportamiento |
|---|---|
| Sin red al guardar | Guarda local, marca pendiente, reintenta con espera creciente. Contador visible de cambios sin subir |
| Token revocado o caducado | Aviso permanente en Inicio. La app sigue funcionando entera en local |
| `sha` remoto distinto | Pantalla de comparación, el usuario elige. Nunca fusión automática |
| Documento local corrupto | Validación de esquema al arrancar. Si falla, ofrece restaurar del repositorio |
| No hay documento local | Lo descarga del repositorio. Si tampoco hay, asistente de primer uso |
| Geolocalización denegada | Coordenadas a mano. Nada depende de tener GPS |
| open-meteo caído o sin red | La pantalla de viento muestra la última respuesta cacheada con su antigüedad, marcada como vieja |
| Cuota de almacenamiento llena | Solo alcanzable acumulando trazas. Aviso y purga de las ya subidas |

### Borrado de almacenamiento por parte de WebKit

`WARNING:` WebKit borra el almacenamiento escribible por script de los sitios no visitados
en siete días. Las apps añadidas a la pantalla de inicio quedan exentas, pero es una
política que se ha movido varias veces.
**ESTIMATE, verificar contra la documentación de WebKit antes de fiarse.**

Mitigación: con la copia en GitHub, un borrado deja de ser pérdida de datos y pasa a ser un
arranque lento, porque la app se rebaja el documento. Además se pide
`navigator.storage.persist()` al instalar.

---

## 9. Pruebas

El esfuerzo va donde está el riesgo, que es `domain/`, no la interfaz.

**Vitest sobre las funciones puras**, con un logbook sintético cuyos vuelos están colocados
a propósito en los sitios incómodos:

- Vuelos justo dentro y justo fuera de las ventanas de 24 y 48 meses de BFCL.160
- Cambio de hora de verano en medio de un vuelo
- Vuelo que cruza medianoche
- Cada función de piloto, comprobando cuáles cuentan para cada contador
- Volumen de envolvente en 3.400 y en 3.401 m³, frontera de grupo A y B
- Vuelos con `complete: false`, comprobando que el contador los marca como parciales

**Ida y vuelta del documento:** escribir, subir simulado, restaurar, comparar igualdad
estricta.

**Migraciones de esquema:** cada versión antigua debe llegar a la actual sin perder campos.

**Sin pruebas automatizadas de interfaz en la versión 1.** Para un usuario único el coste no
compensa. En su lugar, lista corta de verificación manual **en el iPhone real y con la app
instalada en la pantalla de inicio**, no en Chrome del Mac ni en el simulador. El service
worker, la persistencia y la geolocalización se comportan distinto instalados que en una
pestaña, y probar en el entorno equivocado da un aprobado falso.

---

## 10. Fases

| Fase | Contenido |
|---|---|
| **1, esta** | Logbook completo, catálogos, sincronización, los dos paneles de contadores, pantalla de viento con mapa online, esbozo navegable de operaciones |
| 2 | Deriva: puerto de `trayectoria_globo.py`. Teselas cacheadas para uso sin cobertura. Espacio aéreo |
| 3 | Operaciones: checklists transcritas del Manual de Vuelo, traza GPS en vuelo |

### Teselas sin cobertura (fase 2)

Descargar en bloque teselas de OpenStreetMap viola su política de uso. La solución prevista
es un extracto PMTiles de Catalunya (del orden de 50 a 200 MB), servido por peticiones de
rango HTTP y cacheable entero.

### Checklists (fase 3)

**Hallazgo del 2026-09-01: el contenido ya existe y es transcribible.** El Manual de Vuelo
MV04r30 de Ultramagic (`Pilot Globus/02_Material_Estudio/Manual_de_Vuelo_MV04r30.pdf`)
contiene:

| Fuente | Contenido |
|---|---|
| Apéndice C | Referencia rápida de chequeo prevuelo. Nueve bloques (envoltura, quemador y sistema de combustible, barquilla, combustible, equipo, pasajeros, carga, arnés de ocupantes, condiciones generales), unos 33 ítems literales en castellano |
| Sección 4 | Procedimientos estándar. 4.5 preparación, 4.7 inflado, 4.8.1 chequeo antes del despegue, 4.8.2 briefing de pasajeros, 4.9 despegue, 4.10 control en vuelo, 4.11 aterrizaje |
| Sección 3 | Procedimientos de emergencia, incluido contacto con líneas eléctricas y operación accidental del FDS |

Esto invierte el coste relativo: las checklists dejan de ser el módulo caro (había que
redactarlas) y pasan a ser el barato (se copian). Reconsiderar el orden de fases al
terminar el logbook.

El aviso de abajo sigue en pie con la misma fuerza.

Estructura definida **como datos en JSON, no como código**, para que sean editables sin
tocar la app.

`CRITICAL:` El contenido de las checklists **no se escribe desde cero**. Una checklist de
globo es un documento de seguridad y tiene que salir del Manual de Vuelo MV04r30 de
Ultramagic y del manual del globo concreto. En fase 1 va el motor y una checklist de ejemplo
marcada claramente como no operacional. En fase 3 se transcriben del manual y las valida el
usuario contra el papel.

---

## 11. Alcance excluido de la versión 1

- Fotos
- NOTAM y espacio aéreo
- Traza GPS grabada durante el vuelo (Safari suspende la app en segundo plano)
- Altitud barométrica (Safari no expone el barómetro)
- Combustible
- Multiusuario, cuentas, compartición
- Cualquier contenido de checklist operacional

---

## 12. Fuentes

| Afirmación | Fuente |
|---|---|
| Requisitos de registro de vuelos | AMC1 BFCL.050, ED Decision 2020/003/R |
| Obligación de llevar registro | BFCL.050, Reglamento (UE) 2020/357 |
| Requisitos de experiencia para el BPL | BFCL.130(b), Reglamento (UE) 2020/357 |
| Requisitos de vigencia | BFCL.160, Reglamento (UE) 2020/357 |
| Grupos de globo por volumen | Balloon Rulebook, definición de grupos de globos de aire caliente |
| Coordenadas de los tres sitios | `Pilot Globus/trayectoria_globo.py` |
| Modelos meteorológicos | open-meteo, ya en uso y validado en `trayectoria_globo.py` |

Documento base: `Pilot Globus/02_Material_Estudio/EASA_Easy_Access_Rules_for_Balloons_Balloon_Rulebook.pdf`

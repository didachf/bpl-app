# Pantalla de vuelo, diseño

Fecha: 10/10/2026. Amplía el spec principal (`2026-09-01-bpl-app-design.md`) en §6 y §10.
Donde los dos choquen, manda éste para la pantalla de vuelo.

## 1. Objetivo

El piloto pidió dos cosas el 10/10/2026:

1. **El gradiente de viento en vuelo**, con velocidad y rumbo para cada altura y para cada
   intervalo de tiempo del vuelo. Es lo que más le cuesta: los vientos cambian muy rápido
   y todavía le cuesta navegar.
2. **No abrir varias apps en vuelo** para ver información distinta. No tiene ninguna app de
   pago, y todo lo que mira volando tiene que estar en ésta.

De ahí la regla de esta pantalla: **en vuelo basta con esta app.** Pueden ser dos vistas,
siempre que se pase de una a otra con un toque.

## 2. Las cuatro piezas, y qué cubre este spec

| Pieza | Contenido | Spec |
|---|---|---|
| 1 | Tabla de viento previsto por altitud y hora | **Éste** |
| 2 | GPS en vuelo: posición, viento medido, proyección y destino | **Éste** |
| 3 | El plan de vuelo dentro de la app, que se rehace entero desde el móvil o la tablet | Propio, más adelante |
| 4 | Pasar los planes del Mac a la tablet y al teléfono | Propio, más adelante |

Las piezas 3 y 4 salen de otra respuesta suya del mismo día: el plan se hace idealmente en
el Mac, pero si hay que cambiar algo en el campo quiere poder hacerlo con el móvil o la
tablet, **y que rehaga el estudio entero**. Eso exige **un solo motor de cálculo**, el de la
app, que el Mac también usará. Si no, el PDF y la pantalla acaban dando cifras distintas.
Por eso todo el cálculo de este spec vive en módulos puros de `src/services/`, sin nada del
navegador, que se pueden correr con node.

## 3. Decisiones tomadas con el piloto, 10/10/2026

| Tema | Decisión |
|---|---|
| Altitud | **Todo en pies sobre el mar**, también la capa baja. Es lo que marcan el altímetro y el GPS |
| Vistas | Dos, **Mapa** y **Vent**, con un toque para cambiar. La franja de cifras es común y está siempre a la vista |
| Proyección | Una línea con marcas a los **5, 10, 15 y 20 min**, como la de FlyMate. 30 min «es casi medio vuelo» |
| Filas de la tabla | La fila «terra» (viento a 10 m sobre el terreno, escrita en pies sobre el mar), **cada 250 ft** hasta el techo y **cada 1 000 ft** por encima, hasta 10 000 ft, para la emergencia |
| Viento medido | En las mismas franjas de 250 ft que la tabla. Cada franja guarda sólo la última medida |
| Destino | Se fija con una pulsación larga en el mapa. Se resaltan las filas que van hacia allí con **15° a cada lado**. Este margen es criterio nuestro y la pantalla lo dice |
| Sin plan del día | Hasta que exista la pieza 3, el despegue es la posición GPS al pulsar «Començar vol», la ventana va desde ese momento hasta 3 h después y el techo es 1 200 m. Los tres se cambian en la pantalla |
| Idioma | Catalán, como Operar y como los planes en PDF |

## 4. Ideas tomadas de otras apps

Investigadas el 10/10/2026. Ninguna sustituye a esta app: sólo se copian ideas.

| Idea | De dónde |
|---|---|
| Tabla de gradiente cada 250 ft con selector de hora | FlightFlow [1], Hot Air [2] |
| Línea en la altitud actual sobre la tabla, con un color por encima y otro por debajo | La línea, de Hot Air [2]. Los colores son lo que pide un usuario en las reseñas de Hot Air Balloon Pilot [3] |
| Mejor izquierda y mejor derecha dentro de un rango de altitud | Kubicek FlyMate [4], Hotairballoon Navigation [5] |
| Registro del viento medido por banda, que se sobrescribe al volver | FlyMate [4] (Wind Log, p. 20), BalloonRadar [6] |
| Medido y previsto en la misma fila | FlyOn [7] |
| La fuente de la altitud siempre a la vista, con cifras grandes | FlyMate [4] (pp. 17 y 20). Las cifras pequeñas son una queja contra FlightPack [8] |
| Línea de proyección con marcas de tiempo | FlyMate [4] (p. 34), FlightPack [8] |

1. https://balloonflightplanner.netlify.app/
2. https://apps.apple.com/us/app/hot-air/id353321502
3. https://play.google.com/store/apps/details?id=eu.paamand.hotairpro
4. Manual de FlyMate, edición 1.1: https://kubicekballoons.com/en/flymate-user-manual/downloads/Kubicek-FlyMate-User-Manual-EN.pdf
5. https://apps.apple.com/us/app/id1097147788
6. https://www.balloonradar.com/features.html
7. https://apps.apple.com/us/app/flyon-pilot/id6743952325
8. https://play.google.com/store/apps/details?id=com.ultramagic.workbench

## 5. Motor del viento previsto (pieza 1)

### 5.1 La petición

Una sola llamada POST a open-meteo con los **siete modelos**: los seis actuales más
`meteofrance_arome_france`, que es el único de alta resolución con niveles de presión. Los
scripts del Mac ya lo usan desde el 04/10/2026, y el primer día llevaba la parte alta en otra
dirección que los demás.

Variables, por modelo:
* velocidad y dirección del viento a 10, 20, 50, 80, 100, 120, 150, 180 y 200 m sobre el
  terreno
* velocidad, dirección y altura de geopotencial en 1000, 975, 950, 925, 900, 850, 800 y 700 hPa

Cobertura **medida contra la API el 10/10/2026** sobre un punto a 380 m de elevación:

| Modelo | No cubre |
|---|---|
| `icon_eu` | 20, 50 y 150 m |
| `gfs_seamless` | 20, 50, 150, 180 y 200 m |
| `gem_seamless` | 20, 50, 100, 150, 180 y 200 m |
| `ukmo_global_deterministic_10km` | todo menos 10 m en los niveles de altura |
| `meteofrance_arpege_europe` | cubre todo |
| `ecmwf_ifs025` | sólo 10 y 100 m en altura, y sólo 1000, 925, 850 y 700 hPa |
| `meteofrance_arome_france` | cubre todo |

Un nivel no cubierto llega con la unidad `"undefined"`, como ya trata `openmeteo.ts`.

`WARNING:` **un nivel de presión puede estar bajo tierra y llegar con valores.** A 380 m de
elevación, 1000 y 975 hPa quedan por debajo del suelo. Tres modelos dan nulos en 975 hPa, pero
otros devuelven números extrapolados. El motor descarta todo nivel de presión cuya altura de
geopotencial quede por debajo de la elevación más 10 m, tenga o no valor.

### 5.2 De los niveles a las filas

Para cada modelo y cada hora:

1. Se monta el perfil vertical con pares (altitud sobre el mar, u, v). Los niveles de altura
   van a la **elevación real del punto** más su altura. Los de presión, a su altura de
   geopotencial. Es lo mismo que hace `vent_alt.py` en el Mac.
2. La elevación real es la que devuelve la API en el campo `elevation`.
   `ASSUMPTION:` es un modelo digital de 90 m, y en terreno quebrado puede apartarse decenas
   de metros del punto exacto. El plan del Mac trae la elevación medida, y la pieza 3 la
   usará cuando exista.
3. Se interpola **u y v**, nunca velocidad y dirección por separado, linealmente en altitud,
   a cada fila. No se extrapola. Una fila por encima del nivel más alto de un modelo, o por
   debajo del más bajo, queda sin dato de ese modelo, y la pantalla lo dice.
4. La fila «terra» es el nivel de 10 m tal cual, sin interpolar.

Filas: «terra» a la elevación más 10 m. Después cada múltiplo de 250 ft por encima de
«terra», hasta el techo. Por encima del techo, cada múltiplo de 1 000 ft hasta 10 000 ft.

### 5.3 De siete modelos a una casilla

Por fila y por hora, con los modelos que tienen dato:
* **Rumbo**: hacia dónde va el viento («cap a»), que es la dirección de la media vectorial
  ponderada por velocidad (`speedWeightedMean`) más 180°. En vuelo lo que importa es a dónde
  te lleva, no de dónde viene.
* **Velocidad**: la mediana de los modelos, en nudos. La banda de mínima a máxima va en el
  detalle de la casilla.
* **Desacuerdo**: los cortes de siempre, juntos, dispersos y dispares (`describeSpread`). Nunca
  un porcentaje ni una cuenta de modelos. Las reglas de §6 del spec principal siguen todas.

### 5.4 La columna «Ara»

En vuelo, la columna «Ara» es lo previsto para ese minuto. Se interpola linealmente en el
tiempo, en u y v, entre las dos horas que lo rodean, **modelo a modelo**, y después se
combina como en §5.3. Se marca como interpolada.

### 5.5 Caché y antigüedad

La de ahora, en IndexedDB (`windCache.ts`), con el aviso de pronóstico viejo a las 6 h. Si
hay cobertura en vuelo (la tablet es 5G), se vuelve a pedir en la posición actual como mucho
cada 30 min, por cuota, y la pantalla dice de qué hora es el pronóstico y a cuántos km se
pidió.

`ASSUMPTION:` el viento es el de un solo punto, sin variación horizontal, como en
`carta_perfil.py`. En 1,5 h de vuelo de prácticas la deriva es de pocos km. El refresco en
vuelo lo corrige cuando hay cobertura.

## 6. GPS en vuelo (pieza 2)

### 6.1 Posición

`navigator.geolocation.watchPosition` con `enableHighAccuracy: true` y `maximumAge: 0`. Los
puntos se guardan en IndexedDB según llegan, para no perder la traza si la app se cierra. La
traza es la que, más adelante, cerrará el vuelo en el logbook con sus horas.

### 6.2 Altitud

`WARNING:` según la especificación del W3C, la altitud de la geolocalización es **sobre el
elipsoide WGS84, no sobre el mar**. En Cataluña el geoide queda unos 50 m por encima del
elipsoide (`ESTIMATE`, verificar contra EGM96), así que la altitud sale unos 50 m alta.

La corrección no depende de saber cuánto es: **se calibra en tierra.** Al pulsar «Començar
vol» se promedia la altitud del GPS durante 30 s con la cesta en el suelo, y la diferencia
con la elevación del punto es la corrección del vuelo. La franja dice siempre la fuente:
«GPS, calibrat a terra» o «GPS sense calibrar». Sin calibrar, se enseña la altitud tal cual y
el aviso de que puede salir unos 50 m alta.

La tablet (Galaxy Tab S11 5G) **no tiene barómetro**, así que no hay otra fuente.

### 6.3 Rumbo, velocidad y variómetro

* Rumbo y velocidad sobre el suelo: del desplazamiento en una ventana deslizante de 30 s, no
  de los campos `heading` y `speed` del GPS, que con el globo lento llegan nulos o con ruido.
* Variómetro: derivada de la altitud en 10 s, en m/s, marcado «GPS». `ESTIMATE`: con el ruido
  vertical del GPS, del orden de 0,5 m/s de incertidumbre. Verificar en vuelo.

### 6.4 Viento medido por franja

El globo va con el aire, así que su rumbo y su velocidad sobre el suelo son el viento a esa
altitud. Cada vez que una ventana de 20 s queda entera dentro de una franja de 250 ft, el
rumbo y la velocidad de esa ventana son la medida de la franja, y sustituyen a la anterior.
Cada medida lleva su hora, y la pantalla enseña cuánto hace.

`ASSUMPTION:` subiendo a 2 m/s se pasan unos 38 s en una franja de 76 m, así que se mide
también en ascenso y descenso suaves. A más velocidad vertical no da tiempo, y la franja
conserva su medida anterior.

### 6.5 Proyección

Una línea desde la posición actual con el rumbo y la velocidad de §6.3, con marcas a los 5,
10, 15 y 20 min. Es dónde estarías si te quedas a esta altura.

### 6.6 Destino

Se fija con una pulsación larga en el mapa. La franja da rumbo, distancia y hora estimada
de llegada a la velocidad actual. En la tabla se resaltan las filas cuyo rumbo, previsto
(«Ara») o medido, queda a 15° o menos del rumbo al destino.

### 6.7 Mejor izquierda y mejor derecha

Con un rango de altitud que elige el piloto, por ejemplo de 1 500 a 3 000 ft: la fila que
más gira a la izquierda del rumbo actual y la que más gira a la derecha, con su altitud,
rumbo y velocidad. Sale de lo medido si la medida tiene menos de 15 min, y de «Ara» si no, y
dice de cuál.

## 7. La pantalla

Ruta `#/vol`. Se entra con «Començar vol» al final del Últim xequeig y desde Planificar.

### 7.1 Franja fija, en las dos vistas

Cifras grandes:
* altitud en ft, con la fuente debajo
* variómetro en m/s
* rumbo y velocidad sobre el suelo, en grados y nudos
* tiempo de vuelo
* destino: rumbo, distancia en km y hora estimada, si hay destino
* el botón para cambiar de vista

### 7.2 Vista Mapa

Leaflet, con la ortofoto del ICGC. Encima:
* la posición
* la traza, coloreada por altitud
* la proyección
* el destino, con su línea

Las zonas de aterrizaje, las líneas eléctricas y el propano llegan con la pieza 3.

### 7.3 Vista Vent

La tabla, con lo alto arriba:
* Columnas: «Mesurat», «Ara» y una por cada hora de la ventana.
* Cada casilla lleva una flecha que apunta hacia donde va el viento (norte arriba) y los nudos.
* Las casillas con modelos dispares van atenuadas.
* Una línea marca la altitud actual. Por encima y por debajo de ella, las filas llevan un tono
  distinto cada una.
* Las filas que van al destino van resaltadas.
* Un toque en la casilla abre el detalle: la banda de velocidad, el desacuerdo, y qué modelos
  no llegan a esa fila.

Debajo, el rango y la mejor izquierda y la mejor derecha.

### 7.4 Teléfono y tablet

Las mismas dos vistas en los dos. **El manifiesto pasa de `orientation: 'portrait'` a
`'any'`**, para que la tablet se pueda usar apaisada.

Mientras la pantalla de vuelo está abierta, la pantalla del aparato se mantiene encendida con
`wakeLock`. Se vuelve a pedir al volver de segundo plano, porque Android lo suelta.

## 8. Sin cobertura

Al pulsar «Començar vol», antes de despegar:
1. **El pronóstico**, a IndexedDB, como ahora.
2. **La ortofoto.** Los mosaicos del ICGC se sirven con CORS abierto, unos 28 KB cada uno,
   medidos el 10/10/2026 en
   `geoserveis.icgc.cat/icc_mapesmultibase/noutm/wmts/orto/GRID3857/{z}/{x}/{y}.jpeg`.
   `ESTIMATE` del peso:
   * de z12 a z15 en 15 km a la redonda, unos 1 500 mosaicos y unos 42 MB
   * z16 en 3 km alrededor del despegue, unos 200 mosaicos y unos 6 MB

   Se guardan en la Cache API, con la persistencia de almacenamiento que ya pide la app. Se
   mide de verdad al construirlo y la pantalla dice cuánto ha bajado.

`WARNING:` la ortofoto del ICGC cubre sólo Cataluña. Los vuelos de empresa en otras regiones
necesitarán otra fuente, por ejemplo el PNOA del IGN. Queda fuera de este spec.

## 9. Fuera de este spec

* El plan de vuelo, con zonas de aterrizaje, propano, tabla de carga, emergencia por encima
  del techo y líneas eléctricas. Es la pieza 3.
* Pasar los planes del Mac a los aparatos. Es la pieza 4.
* Cerrar el vuelo en el logbook con las horas del GPS. El piloto dejó Vuelos para más adelante.
* La temperatura de la envoltura. Sale del instrumento, no de la app. No hay protocolo público
  conocido para leer el DBI3U desde la tablet.
* El viento con variación horizontal (rejilla de puntos).

## 10. Modos de fallo

| Fallo | Qué hace la pantalla |
|---|---|
| Sin señal GPS | La franja dice «sense GPS» y la antigüedad del último punto. La tabla sigue con lo previsto |
| Arranque ya en el aire | Altitud sin calibrar, con su aviso |
| Pronóstico de más de 6 h | Aviso, como en Planificar |
| Un modelo no llega a una fila | Se dice en el detalle de la casilla, con el nombre del modelo |
| Ninguna medida en una franja | La casilla de «Mesurat» va vacía, no inventa |
| La pantalla se apaga | Se vuelve a pedir `wakeLock` al volver |
| Sin mosaicos de una zona | Leaflet enseña el fondo vacío. La posición y la traza siguen |

## 11. Pruebas

Módulos puros con prueba, como el resto del proyecto, y ninguna prueba de componentes:
* perfil vertical: orden por altitud, descarte de niveles bajo tierra, interpolación en u y v,
  sin extrapolación
* filas: «terra», pasos de 250 ft y de 1 000 ft, techo que no cae en un múltiplo
* casilla: rumbo «cap a», mediana, desacuerdo, modelos que no llegan
* «Ara»: interpolación en el tiempo modelo a modelo, y en los extremos de la ventana
* rumbo y velocidad de una ventana de puntos, incluido el paso por 360°
* viento medido: vuelo nivelado, ascenso lento que sí mide, ascenso rápido que no
* calibración de altitud
* proyección, rumbo y distancia al destino, contra valores conocidos
* mejor izquierda y mejor derecha, y de qué fuente sale

**Contraste con el Mac:** con la misma respuesta de open-meteo guardada, el motor de la app y
`vent_alt.py` deben dar lo mismo en las alturas comunes, dentro de 0,5 kt y 3°. Es la
primera prueba del motor único.

En navegador, Chromium con emulación de Pixel (360 px) y a tamaño de tablet, en vertical y
apaisada. En la tablet de verdad:
* qué referencia de altitud da Chrome
* la calibración en tierra en un punto de elevación conocida
* `wakeLock`
* si el GPS sigue con la pantalla apagada

## 12. Comprobar antes de escribir código

1. **ICGC:** el esquema de los mosaicos (el de prueba en z15 no cayó donde esperaba, puede ser
   TMS y no XYZ) y sus condiciones para descargar mosaicos en bloque.
2. **open-meteo:** cuánta cuota gasta la petición con siete modelos y nueve niveles de altura.
3. **La altitud de Chrome en Android:** si da elipsoide, como dice el W3C, o ya la da sobre el
   mar.

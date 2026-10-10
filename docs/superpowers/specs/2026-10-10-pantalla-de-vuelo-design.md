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

Y una tercera, del mismo día: **la tablet y el teléfono son cosas distintas.** La tablet se usa
para todo. El teléfono sirve sólo para el registro de vuelos, el plan de vuelo y las
checklists. Todo lo de navegación, rumbos y viento en directo es sólo de la tablet.

## 2. Las cuatro piezas, y qué cubre este spec

| Pieza | Contenido | Spec |
|---|---|---|
| 1 | Tabla de viento previsto por altitud y hora | **Éste** |
| 2 | GPS en vuelo: posición, viento medido, proyección, waypoints y navegación con optimizador | **Éste** |
| 3 | El plan de vuelo dentro de la app, que se rehace entero desde el móvil o la tablet | Propio, más adelante |
| 4 | Pasar los planes del Mac a la tablet y al teléfono, y sincronizar los dos aparatos | Propio, más adelante |
| 5 | Practicar pruebas de competición: la app crea los blancos o las áreas según el tipo de prueba y el viento del momento, en la tablet y en el teléfono | Propio, después de leer el reglamento de la FAI |

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
| Waypoints | Se crean con una pulsación larga en el mapa **o escribiendo las coordenadas**, eligiendo antes el formato: decimal, grados minutos y segundos, o UTM. Uno de ellos es el activo |
| Navegación | Dos partes. **Rumbo directo y distancia horizontal** del globo al waypoint activo. Y un **optimizador** que dice cómo llegar controlando la altitud y la velocidad de subida y bajada |
| Velocidad vertical | La del piloto. Subir lento de 0 a 1 m/s, rápido de 2,5 a 3. Bajar lento de 0 a 1 m/s, rápido de 3 a 5. Son los valores por defecto, editables en Ajustes |
| Filas hacia el waypoint | Se resaltan las que van hacia él con **15° a cada lado**. Este margen es criterio nuestro y la pantalla lo dice |
| Sin plan del día | Hasta que exista la pieza 3, el despegue es la posición GPS al pulsar «Començar vol», la ventana va desde ese momento hasta 3 h después y el techo es 1 200 m. Los tres se cambian en la pantalla |
| Idioma | Catalán, como Operar y como los planes en PDF |
| Aparatos | **La pantalla de vuelo sólo existe en la tablet.** Es una sola app con dos modos, no dos apps: cada aparato dice en Ajustes si es «Tauleta de vol» o «Telèfon». La primera vez se propone por el tamaño de pantalla y el piloto lo cambia si hace falta. El modo teléfono no enseña ni «Començar vol» ni la ruta `#/vol` |
| Waypoints en el teléfono | Sí. Se crean, se editan y se borran en los dos aparatos, porque forman parte del plan. Navegar a ellos es sólo de la tablet |

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

### 6.6 Waypoints

Un waypoint lleva nombre, latitud, longitud y una nota opcional. Se crea de dos maneras:

1. **Desde el mapa**, con una pulsación larga. Sale con el nombre WP1, WP2..., que se cambia
   después.
2. **Escribiendo las coordenadas.** Primero se elige el formato, y el campo cambia según él:
   * **Decimal**: «41,6561 N 1,1490 E», como en los planes, y también lo que se pega de Google
     Maps, «41.6561, 1.1490». Acepta coma o punto decimal, y letras o signo.
   * **Grados, minutos y segundos**: «41°39'22" N 1°08'56" E», como en el AIP.
   * **UTM**, en ETRS89, que es lo que usan los mapas del ICGC: huso, X e Y. El huso es 31 por
     defecto. El 30 queda disponible porque el oeste de Lleida cae cerca del límite. La
     diferencia entre ETRS89 y WGS84 es de menos de un metro, y aquí no cuenta.

   Antes de guardar, la pantalla enseña el punto en el mapa y en los otros dos formatos, para
   ver que está donde se quería.

Se crean en los dos aparatos. En el teléfono, desde Planificar, con el mapa y el formulario de
coordenadas, y sin nada de navegación. En la tablet, además, desde la pantalla de vuelo.

Hay una lista de waypoints con su rumbo y su distancia desde la posición actual. En ella se
activa uno, se cambia el nombre o se borra. Sólo uno está activo a la vez, y es el que usan la
franja, la tabla y el optimizador.

Los waypoints se guardan **en el documento del logbook**, con su esquema y su migración, como
el resto de datos. Así van en la copia de seguridad y llegarán a la tablet y al teléfono con la
pieza 4. Las zonas de aterrizaje del plan, con la pieza 3, serán waypoints también.

### 6.7 Rumbo directo y distancia

Del globo al waypoint activo, por círculo máximo: rumbo verdadero, distancia horizontal en km
(en metros por debajo de 1 km) y hora estimada de llegada a la velocidad actual sobre el suelo.
Van en la franja fija y se ven en las dos vistas. En el mapa, una línea recta une el globo con
el waypoint.

En la tabla se resaltan las filas cuyo rumbo, previsto («Ara») o medido, queda a 15° o menos
del rumbo directo.

### 6.8 Optimizador: cómo llegar

Dice qué hacer con la altitud para pasar lo más cerca posible del waypoint activo. Se
recalcula en directo.

**El modelo.** Con el viento de un solo punto (§5.5), la deriva sólo depende de la altitud y
de la hora, no de dónde esté el globo. Entonces el desplazamiento de un plan es la suma del
viento de cada altitud por el tiempo que se pasa en ella. Se integra en pasos de 10 s, con el
viento interpolado en altitud y en el tiempo, igual que la columna «Ara».

**De dónde sale el viento de cada altitud.** De lo medido si la medida de esa franja tiene
menos de 15 min. Si no, de lo previsto para cada instante del plan.

**Qué planes prueba.** Hasta tres altitudes mantenidas, que son filas de la tabla, unidas por
subidas y bajadas. El primer tramo puede ser quedarse donde se está. Cada cambio de altitud se
hace en uno de los cuatro modos del piloto:

| Modo | Rango del piloto | Valor de cálculo |
|---|---|---|
| Puja lent | 0 a 1 m/s | 0,5 m/s |
| Puja ràpid | 2,5 a 3 m/s | 2,75 m/s |
| Baixa lent | 0 a 1 m/s | 0,5 m/s |
| Baixa ràpid | 3 a 5 m/s | 4 m/s |

`ASSUMPTION:` el valor de cálculo es el punto medio del rango. Durante la subida o la bajada,
el globo atraviesa las capas intermedias y su viento cuenta, no se salta. Los tiempos en cada
altitud van en pasos de 1 min.

**Qué busca.** La menor distancia horizontal al waypoint en todo el recorrido, no al final. Si
dos planes empatan dentro de 50 m, gana el que llega antes, y después el que tiene menos
cambios.

**Límites.**
* La altitud se mueve dentro de un rango que elige el piloto. Por defecto va desde 250 ft
  sobre el despegue hasta el techo.
* El horizonte es de 60 min, editable. Con la pieza 3, lo limitará también el propano.

**Qué enseña**, en catalán y en órdenes cortas:

1. Ara, puja ràpid (2,5 a 3 m/s) fins a 2 500 ft.
2. Manté 2 500 ft 9 min, cap a 078° a 7 kt (previst).
3. Baixa lent fins a 1 500 ft.
4. Manté 1 500 ft fins al punt, cap a 045° a 4 kt (mesurat fa 6 min).

Debajo de las órdenes va:
* el resultado: «Passes a 120 m del punt a les 08:52»
* lo mismo **si no haces nada** y te quedas a la altitud actual, para comparar
* **la dispersión**: el mismo plan calculado con el viento de cada modelo por separado, por
  ejemplo «amb cada model, entre 100 m i 1,6 km». Es un desacuerdo, no una probabilidad, y
  sigue las reglas de §6 del spec principal. En las capas medidas, todos los modelos usan la
  medida.

En el mapa, el recorrido del plan sale en otro color, con marcas cada 5 min.

**En directo.**
* Se recalcula cada 15 s, y también al cambiar de waypoint o al llegar una medida nueva.
* El cálculo va en un Web Worker, para que la pantalla no se trabe. Presupuesto: menos de
  1 s en la tablet.
* Para que la orden no salte de un recálculo a otro, el plan vigente sólo se sustituye si el
  nuevo pasa al menos un 20 % más cerca o 200 m más cerca.
* Si el piloto no sigue el plan, el siguiente recálculo parte de donde está de verdad.

`WARNING:` el optimizador no sabe nada del terreno bajo el recorrido, de los obstáculos, de las
líneas eléctricas ni del espacio aéreo. La altitud mínima del rango se cuenta desde el
despegue, y una loma más alta en el camino la deja corta. Es una ayuda para decidir, la decisión
es del piloto, y la pantalla lo dice.

### 6.9 Sin waypoint activo

Pedido por el piloto el 10/10/2026: que no falle, y que **las opciones y los datos del waypoint
no aparezcan si no hay ninguno activo**. No se enseñan huecos, guiones ni «sense destí».

**Cuándo no hay waypoint activo.** Son cuatro casos, y los cuatro se tratan igual:
1. no se ha creado ninguno
2. hay waypoints pero ninguno activado
3. se ha borrado el que estaba activo
4. el identificador activo guardado ya no existe en el documento, por ejemplo tras restaurar
   una copia de seguridad

Por eso el waypoint activo no se guarda como un objeto, sino como un identificador que se
resuelve cada vez contra la lista. Si no se encuentra, es «ninguno». Borrar el waypoint activo
lo desactiva en la misma operación.

**Qué desaparece**, no se vacía:
* de la franja: nombre, rumbo directo, distancia, hora estimada y orden del optimizador. La
  franja se recoloca con lo que queda
* del mapa: la línea recta y el recorrido del plan
* de la tabla: el resaltado de las filas y las marcas de las altitudes del plan
* de la vista Vent: el bloque entero del optimizador

**Qué se queda:** la lista de waypoints, para crear o activar uno, y la mejor izquierda y la
mejor derecha, que no necesitan waypoint.

**El optimizador** no se ejecuta. Al quitar el waypoint activo en vuelo se para el cálculo en
curso y se descarta el plan vigente, para que no quede una orden vieja pintada. Un resultado
que llegue del Web Worker después de desactivar se tira.

**En el código**, todas las funciones que reciben el waypoint activo aceptan «ninguno» y
devuelven «nada que enseñar», nunca lanzan. La pantalla pregunta una sola vez si hay
waypoint activo y, si no, no pinta esas piezas.

### 6.10 Mejor izquierda y mejor derecha

Con el mismo rango de altitud: la fila que más gira a la izquierda del rumbo actual y la que
más gira a la derecha, con su altitud, rumbo y velocidad. Sale de lo medido si la medida tiene
menos de 15 min, y de «Ara» si no, y dice de cuál. Sirve aunque no haya waypoint activo.

## 7. La pantalla

Ruta `#/vol`, **sólo en modo tablet**. Se entra con «Començar vol» al final del Últim xequeig y
desde Planificar. En modo teléfono la ruta no existe: un enlace viejo a `#/vol` lleva a Inicio.

### 7.1 Franja fija, en las dos vistas

Cifras grandes:
* altitud en ft, con la fuente debajo
* variómetro en m/s
* rumbo y velocidad sobre el suelo, en grados y nudos
* tiempo de vuelo
* waypoint activo: nombre, rumbo directo, distancia y hora estimada
* **la orden vigente del optimizador** y su resultado, por ejemplo «Puja ràpid fins a
  2 500 ft. Passes a 120 m a les 08:52»
* el botón para cambiar de vista

### 7.2 Vista Mapa

Leaflet, con la ortofoto del ICGC. Encima:
* la posición
* la traza, coloreada por altitud
* la proyección
* los waypoints, con el activo destacado y la línea recta hasta él
* el recorrido del plan del optimizador, con marcas cada 5 min

Desde aquí se abre la lista de waypoints y el formulario de coordenadas.

Las zonas de aterrizaje, las líneas eléctricas y el propano llegan con la pieza 3.

### 7.3 Vista Vent

La tabla, con lo alto arriba:
* Columnas: «Mesurat», «Ara» y una por cada hora de la ventana.
* Cada casilla lleva una flecha que apunta hacia donde va el viento (norte arriba) y los nudos.
* Las casillas con modelos dispares van atenuadas.
* Una línea marca la altitud actual. Por encima y por debajo de ella, las filas llevan un tono
  distinto cada una.
* Las filas que van al waypoint activo van resaltadas, y las altitudes del plan del
  optimizador van marcadas.
* Un toque en la casilla abre el detalle: la banda de velocidad, el desacuerdo, y qué modelos
  no llegan a esa fila.

Debajo, en este orden:
1. el plan del optimizador entero, con sus órdenes, el resultado, el «si no fas res» y la
   dispersión
2. el rango de altitud
3. la mejor izquierda y la mejor derecha

### 7.4 Sólo en la tablet

La pantalla de vuelo se diseña para la Galaxy Tab S11, apaisada, de unos 1 280 por 800 px. **El
manifiesto pasa de `orientation: 'portrait'` a `'any'`**, para que la tablet se pueda usar
apaisada. El teléfono sigue en vertical.

El modo del aparato se guarda en `localStorage` del propio aparato, no en el documento del
logbook, porque cada aparato tiene el suyo y el documento es el mismo en los dos.

`WARNING:` con el plan hecho en el teléfono y el vuelo en la tablet, **la sincronización entre
aparatos deja de ser opcional.** El plan y los waypoints tienen que llegar a la tablet, y el
vuelo que graba la tablet tiene que llegar al registro. Es la pieza 4, y depende del
repositorio privado `bpl-logbook` y su token, pendientes desde el 02/09/2026.

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
| Ninguna medida en ninguna franja | **La columna «Mesurat» no aparece** hasta la primera medida. Es la misma regla de §6.9, aceptada por el piloto el 10/10/2026 |
| Ninguna medida en una franja, habiendo otras | Esa casilla de «Mesurat» va vacía, no inventa |
| La pantalla se apaga | Se vuelve a pedir `wakeLock` al volver |
| Sin mosaicos de una zona | Leaflet enseña el fondo vacío. La posición y la traza siguen |
| Sin waypoint activo, en cualquiera de los cuatro casos de §6.9 | No aparece nada del waypoint ni del optimizador. La mejor izquierda y la mejor derecha siguen |
| Ningún plan mejora a quedarse | El optimizador lo dice así, «cap pla s'hi acosta més que quedar-te a aquesta altitud», y no inventa una orden |
| Coordenadas que no se entienden o fuera de rango | El formulario dice qué campo falla y no guarda |
| El cálculo tarda más de lo previsto | Se queda el plan anterior, con su hora, hasta que llegue el nuevo |

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
* proyección, rumbo y distancia al waypoint, contra valores conocidos
* coordenadas: los tres formatos, en los dos sentidos, contra puntos de referencia publicados
  (para UTM, puntos con coordenadas oficiales del ICGC), con coma y punto decimal, y los
  errores de formato y de rango
* waypoints en el documento: esquema nuevo, migración desde el esquema 2 y validación
* sin waypoint activo, los cuatro casos de §6.9:
  * cada función que recibe el waypoint activo devuelve «nada que enseñar» y no lanza
  * borrar el activo lo desactiva
  * un identificador que ya no existe se resuelve como «ninguno»
  * un resultado del optimizador que llega después de desactivar se descarta
* optimizador:
  * con dos capas sintéticas cuya solución exacta se puede calcular a mano, encuentra esa
    solución
  * cuenta la deriva durante las subidas y las bajadas
  * respeta el rango de altitud y el horizonte
  * prefiere lo medido reciente a lo previsto
  * el umbral de sustitución no deja que la orden salte
  * dice «cap pla s'hi acosta més» cuando es verdad
* mejor izquierda y mejor derecha, y de qué fuente sale

**Contraste con el Mac:** con la misma respuesta de open-meteo guardada, el motor de la app y
`vent_alt.py` deben dar lo mismo en las alturas comunes, dentro de 0,5 kt y 3°. Es la
primera prueba del motor único.

En navegador, Chromium con emulación de Pixel (360 px) y a tamaño de tablet, en vertical y
apaisada. Además, recorriendo los estados del waypoint a mano: sin ninguno, crear uno,
activarlo, cambiar a otro, desactivarlo, borrar el activo con el optimizador calculando, y
restaurar un documento cuyo activo ya no existe. En cada paso, comprobar que no queda nada del
waypoint pintado y que la consola no tiene errores.

En la tablet de verdad:
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
4. **El coste del optimizador:** cuántos planes salen con tres altitudes, cuatro modos y pasos
   de 1 min, y si caben en 1 s en la tablet. Si no caben, se poda (por ejemplo, altitudes
   sólo dentro del rango y tiempos más gruesos lejos del punto) antes de bajar el número de
   altitudes.

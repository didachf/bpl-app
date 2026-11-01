# Especificación de las maquetas de la pantalla de vuelo en la tablet

Sacada el 01/11/2026 de los `.dc.html` de esta carpeta, renderizados en Chromium a 1280 × 800 con IBM
Plex. Es la referencia para programar la pantalla (plan `docs/superpowers/plans/2026-11-01-vol-pantalla.md`).
Las maquetas mandan: si esto y una maqueta no coinciden, se mira la maqueta. Dídac aprobó las seis de la
fase 2 «tal como están» el 01/11/2026.

Notación: «D» es un dato que cambia, «L» un rótulo fijo. Tamaños en px. Las coordenadas de lo pintado
sobre el mapa son píxeles de la ortofoto `orto_tarrega.jpg` (1300 × 1050, 10 m/px, norte arriba).

## 0. General

* Raíz 1280 × 800, fondo `#1a1a19`, texto `#fff`, IBM Plex Sans. **Las maquetas sólo tienen tema
  oscuro** y ningún token CSS: todo son colores sueltos.
* Utilidades: `.num` (Plex Mono, cifras tabulares), `.lab` (12 px, mayúsculas, espaciado .08em,
  `#898781`), `.halo` en texto SVG (trazo `#0b0b0b` de 4 px por debajo, 5 en Començar).
* Miles con espacio normal en las maquetas («1 540»). En Chrome se parte en dos líneas: usar espacio
  fino o duro, o `white-space: nowrap`. El signo menos es U+2212 («−49 m»).

### Colores

| Hex | Uso | Token de `theme.css` |
|---|---|---|
| `#1a1a19` | fondo, paneles, diálogo, relleno de marcas | `--bg` |
| `#24231f` | tarjetas, campos, fondo del selector | `--surface` |
| `#2c2c2a` | bordes y divisiones, fondo de las barras | `--border` |
| `#ffffff` | texto, trazos del mapa | `--text` |
| `#c3c2b7` | texto secundario, unidades | `--muted` |
| `#898781` | rótulos `.lab`, terciario | `--dim` |
| `#2a78d6` | botón principal, segmento elegido, borde de vista activa, barra de progreso | `--accent` |
| `#0ca30c` | punto de GPS bien, hecho | `--ok` |
| `#f2a33a` | botón CAMPS, altura sobre el terreno, aviso de terreno, «No s'hi arriba.» | `--warn` es `#fab219` |
| `#e0524b` | icono de Acabar vol | `--danger` es `#d03b3b` |
| `#35d0ff` | navegación: destino activo, línea del plan, etiquetas ACTIU y ATERRAR, distancias destacadas | ninguno |
| `#8fd8f5` | `.lab` de los paneles de navegación («Ordre», «Amb el vent d'ara», cabecera del plan) | ninguno |
| `#1f2a33` | fondo de la casilla Ordre, de la tarjeta del activo y del resultado | ninguno |
| `#1d2c40` | fondo del botón de vista pulsado | ninguno |
| `#3c4f5c` | bordes de los botones de la tarjeta activa | ninguno |
| `#3ad16b` | zonas, zona alcanzable, plan a ras | ninguno |
| `#ffd400` `#ff9f1a` `#ff4fd8` `#a77bff` | rampa de la traza por altitud, del suelo a 3 750 ft | ninguno |
| `#0b0b0b` | halos y contornos, texto de ACTIU | ninguno |
| `#3a3426` | fondo del mapa antes de la imagen | ninguno |
| `#222220` | fila neutra del menú | ninguno |
| `#2a2416` / `#6b5420` | fila ámbar del menú, fondo y borde | ninguno |
| `#2a1d1b` / `#6b2a26` | fila roja del menú, fondo y borde | ninguno |
| `rgba(26,26,25,.88)` a `.92` | fichas, leyenda, botones y tarjeta del plan sobre el mapa | ninguno |
| `rgba(10,10,10,.55)` | velo del diálogo | ninguno |

### Iconos (24 × 24, `fill:none; stroke:currentColor`, puntas redondas)

| Icono | Trazos | Grosor |
|---|---|---|
| Camps | `M3 20h18`, `M5 20l3-9h8l3 9`, `M12 4v4M10 6h4` | 2,2 |
| Waypoint | `M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z` y círculo (12,10) r2,2 | 2 |
| Centrar | círculo (12,12) r7 y `M12 2v4M12 18v4M2 12h4M18 12h4` | 2 |
| Mapa | `M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z`, `M9 4v14M15 6v14` | 2 |
| Vent | `M3 8h11a3 3 0 1 0-3-3`, `M3 12h16a3 3 0 1 1-3 3`, `M3 16h7` | 2 |
| Més | círculos rellenos r2 en (5,12), (12,12), (19,12) | relleno |
| Cerrar | `M6 6l12 12M18 6L6 18` | 2,2 |
| Atrás | `M15 5l-7 7 7 7` | 2,2 |
| Marcar al mapa | círculo r6 y `M12 2v5M12 17v5M2 12h5M17 12h5` | 2,2 |
| Per coordenades | `M4 9h16M4 15h16M10 3 8 21M16 3l-2 18` | 2,2 |
| Aviso | `M12 3 2 20h20L12 3z`, `M12 10v4M12 17.5v.5` | 2,2 |
| Hecho | `M20 6 9 17l-5-5` | 2,6 |
| Reloj | círculo r8 y `M12 8v4l3 2` | 2,2 |
| Parar | rect (6,6) 12 × 12 rx 2 | 2 |

Punto de GPS: círculo r5 `#0ca30c` en 10 × 10. Destino pequeño: aro r4,5 `#35d0ff` de 2 y punto r1,6.

## 1. Piezas comunes

### 1.1 Mapa

Arriba a la izquierda, 1280 × 600 (860 × 600 en Marcar al mapa), fondo `#3a3426`.

### 1.2 Lo que se pinta sobre el mapa

| | Qué | Cómo |
|---|---|---|
| O1 | Traza | Dos pasadas: halo `#0b0b0b` opacidad ,55 de 8 y línea de 4, puntas redondas. Color por tramo según la altitud, rampa `#ffd400 → #ff9f1a → #ff4fd8 → #a77bff` del suelo a 3 750 ft. En Waypoints y Coordenades, una línea `#ff9f1a` de 4 sin halo |
| O2 | Despegue | Círculo r7 blanco con borde `#0b0b0b` 2. Rótulo «Enlairament 08:00» (hora D) en (+12,+22), 13 px 500 blanco con halo |
| O3 | Globo | Grupo girado al rumbo: círculo r20 blanco opacidad ,18 y flecha `M0,-15 L10,11 L0,5 L-10,11 Z` blanca con borde `#0b0b0b` 2. **Siempre encima de todo** |
| O4 | Zona | Relleno `#3ad16b` ,22, borde `#3ad16b` 2. Nombre 15 px 600 blanco con halo en el vértice de arriba |
| O5 | Waypoint no activo | Aro r9 sin relleno: halo `#0b0b0b` ,6 de 5 y blanco de 2. Nombre opcional 14 px 600 blanco con halo en (+14,+5) |
| O6 | Destino activo | Halo r13 `#0b0b0b` ,6 de 6, aro r13 `#35d0ff` de 3 y punto r4 `#35d0ff` |
| O7 | Línea al destino | Del globo al destino, blanca de 2, discontinua `6 6`, sin halo (sólo en fase 1, ver O11) |
| O8 | Proyección | Recta por el rumbo durante 20 min a la velocidad sobre el suelo. Halo `#0b0b0b` ,5 de 6 y blanca de 3. Marcas a 5, 10, 15 y 20 min: círculo r11 relleno `#1a1a19`, borde blanco 2, el minuto en Mono 11 600 blanco |
| O10 | Zona alcanzable | Grupo con opacidad ,26 (,2 en Marcar al mapa), polígonos `#3ad16b` sin borde. La opacidad es del grupo: los solapes no oscurecen |
| O11 | Plan | Por tramos. En altura: halo `#0b0b0b` ,55 de 8 y `#35d0ff` de 4. A ras: mismo halo y `#3ad16b` de 4 discontinuo `7 6`. Marcas cada 5 min: círculo r9 relleno `#0b0b0b`, borde `#35d0ff` 2, número Mono 10 600 `#35d0ff` |
| O12 | Punto más cercano | Primero una línea blanca de 2 discontinua `3 4` del punto al destino, después el punto: círculo r7 relleno `#1a1a19`, borde blanco 2,5 |

En las pantallas de la fase 2 (con objetivo) no se pintan O7 ni O8: el plan (O11) y el punto más
cercano (O12) los sustituyen.

### 1.3 Fichas arriba a la izquierda

En fila desde (16,16), separadas 8. Cada una: fondo `rgba(26,26,25,.88)`, radio 8, relleno 9 × 12,
13 px, alto 35.
* GPS: punto de GPS, «GPS» (L), «±4 m» (D, precisión, Mono `#c3c2b7`).
* Pronóstico: `#c3c2b7`, «Pronòstic de les » + «07:41» (D, Mono blanco) + «, 7 models» (D). En la fase
  2 se añade «, amb relleu».

Debajo, en la fase 2, el **aviso de terreno**: fondo `rgba(26,26,25,.92)`, borde 1 `#f2a33a`, radio 8,
relleno 8 × 12, 13 px `#f2a33a`, icono de aviso 16: «Si no fas res, a les » + Mono 600 «08:35» + «
passes a menys de » + Mono 600 «100 ft» + « del terreny».

Debajo, la **tarjeta del plan** (fase 2), 440 de ancho, fondo `rgba(26,26,25,.92)`, radio 10, relleno
12 × 14, separación 8:
* `.lab` `#8fd8f5` «Pla cap a ZONA A · aterrar» (nombre y objetivo D; «a 2 500 ft» para Passar).
* Lista numerada sin viñetas, separación 5, 14 px, interlineado 1,35. Cada paso en rejilla
  `22px 46px 1fr`: número (Mono `#898781`), hora (Mono `#c3c2b7`, «ara» el primero) y la orden.
* Pie con borde arriba, 13 px: el resultado en blanco con las cifras en Mono 600, «Si no fas res…» en
  `#c3c2b7`, y la dispersión «Amb cada model, entre 83 m i 400 m.» en `#c3c2b7`. Con «No s'hi arriba
  amb aquest vent.» delante cuando toca.

### 1.4 Botones arriba a la derecha

Columna desde (right 16, top 16), separación 8, cada uno 52 × 52, radio 10, fondo
`rgba(26,26,25,.9)`, icono blanco 24:
1. **CAMPS** (fondo `#f2a33a`, texto `#1a1a19`, icono Camps 22 y «CAMPS» 10 px 700) → Emergència.
2. Waypoints → la lista.
3. Centrar en el globo.
4. «+» (Mono 26) acercar.
5. «−» alejar.

Sin waypoint activo no hay CAMPS.

### 1.5 Leyenda abajo a la izquierda

(16, bottom 14), fondo `rgba(26,26,25,.88)`, radio 8, relleno 9 × 12, columna con separación 6, 12 px
`#c3c2b7`. Cada fila: muestra y texto, separación 10. Muestras: plan 22 × 4 `#35d0ff`; proyección
22 × 3 blanca; traza 120 × 4 con degradado de la rampa; alcanzable 22 × 12 `#3ad16b` ,5; a ras
22 × 0 con borde de arriba 4 discontinuo `#3ad16b`.

### 1.6 Escala y atribución abajo a la derecha

«1 km» (D) Mono 11 blanco con sombra `0 0 3px #000` sobre una barra de 100 × 6 con borde blanco 2 sin
el de arriba. Atribución 11 px blanca con la misma sombra: «Ortofoto ICGC, CC BY 4.0», y en la fase 2
« · relleu AWS Terrain Tiles».

### 1.7 Franja, variante A (con waypoint activo)

Abajo, 1280 × 200, borde de arriba `#2c2c2a`, en fila. Casillas con relleno 16 × 18, borde derecho
`#2c2c2a`, columna con separación 4. Anchos medidos en `Main` (usar `box-sizing: border-box` y fijarlos):

| | Casilla | Ancho | De arriba abajo |
|---|---|---|---|
| 1 | Altitud | 193 | `.lab` «Altitud». «1 540» (D, Mono 50/500) + «ft» (Mono 18 `#c3c2b7`). «GPS, calibrat a terra» (D, 13 `#c3c2b7`). «469 m» (D, Mono 13 `#898781`); en la fase 2 esta línea es «127 ft sobre el terreny» en `#f2a33a` |
| 2 | Vario | 157 | `.lab` «Vario». «+0,3» (D, Mono 50/500). «m/s, GPS» (Mono 13 `#c3c2b7`) |
| 3 | Rumb i velocitat | 181 | `.lab`. «061°» (D, Mono 50/500). «4,3» (D, Mono 22) + « kt» (15 `#c3c2b7`) |
| 4 | Temps de vol | 157 | `.lab`. «0:34» (D, Mono 50/500). «ara 08:34» (Mono 13 `#c3c2b7`) |
| 5 | Waypoint activo | 218 | Cabecera: destino pequeño + nombre «ZONA A» (D, 13/600, espaciado .06em, `#35d0ff`), y en la fase 2 la etiqueta «ATERRAR» o «A 2 500 FT» (11 px 600, texto `#1a1a19` sobre `#35d0ff`, radio 4, relleno 2 × 6). «036°» (D, rumbo directo, Mono 50/500). «850» (D, Mono 22) + « m» o « km». «a 4,3 kt, a les 08:40» (D, Mono 13 `#c3c2b7`) |
| 6 | Ordre | el resto (255) | Fondo `#1f2a33`, separación 6. `.lab` «Ordre» `#8fd8f5`. Orden vigente (D) 24/600: «Manté 1 500 ft 2 min». La siguiente (D) 17 `#c3c2b7`: «Després baixa lent fins a terra». Hueco. Resultado (D) 16: «Passes a » + Mono 600 `#35d0ff` «20 m» + « del punt a les » + Mono 600 «08:44». En la fase 2 el resultado es la primera línea del pie de la tarjeta del plan, y «No s'hi arriba.» va en `#f2a33a` 600 |
| 7 | Vistas | 119 | Relleno 12, columna, separación 10. **Mapa**: pulsado, borde 2 `#2a78d6`, fondo `#1d2c40`, blanco 16/600, icono 22. **Vent**: borde 1 `#2c2c2a`, `#c3c2b7` 16/500, icono 22. **Més**: alto 44, borde 1, `#c3c2b7` 15/500, fila con icono 18 |

### 1.7b Franja, variante B (sin waypoint activo)

Cuatro casillas iguales con relleno 18 × 24 y separación 6, y la columna de vistas (Mapa y Vent, sin
Més) de 116. Altitud «1 540» Mono 64 + «ft» Mono 22, y «GPS, calibrat a terra · » + Mono «469 m» (14).
Vario «+0,3» 64 y «m/s, GPS» 14. Rumb i velocitat en una fila: «061°» 64, «4,3» Mono 30, «kt» 18.
Temps de vol «0:34» 64 y «ara 08:34» 14.

### 1.8 Panel lateral (Waypoints, Coordenades, Marcar al mapa)

420 × 600 a la derecha del mapa (left 860), fondo `#1a1a19`, borde izquierdo `#2c2c2a`, columna.
* Selector por segmentos: rejilla de N columnas iguales, separación 6, fondo `#24231f`, radio 10,
  relleno 4. Segmento radio 7, sin borde. Elegido: fondo `#2a78d6`, blanco, 600. Los demás:
  transparentes, `#c3c2b7`, 400.
* Campo de texto: alto 44, radio 8, borde 1 `#2c2c2a`, fondo `#24231f`, relleno 0 × 12, 16 px. Con el
  foco, borde `#2a78d6`.
* Botón principal: fondo `#2a78d6`, blanco, radio 8, alto 52. Secundario: transparente, borde 1
  `#2c2c2a`, radio 8.

## 2. Por pantalla

### 2.1 `Main` (Mapa en vuelo, fase 1)

Pintado en orden: O4 con nombre, O1, O2 con rótulo, O7, O9 (plan de la fase 1, `#35d0ff` de 5 con halo
de 9), O8 con marcas, O6, O3. Fichas, los cinco botones, leyenda con tres filas («Pla de
l'optimitzador, marques cada 5 min», «Projecció a l'altitud actual, 5 a 20 min», «Traça per altitud,
terra a 3 750 ft»), escala, atribución y franja A.

### 2.2 `TauletaVolMes` (menú Més)

Lo de `Main` y encima un velo `rgba(10,10,10,.55)` sobre toda la pantalla y un diálogo (right 16,
bottom 212, 450 de ancho): fondo `#1a1a19`, borde `#2c2c2a`, radio 16, relleno 14, separación 10,
sombra `0 12px 40px rgba(0,0,0,.5)`. Cabecera: `.lab` «Vol en marxa · 0:34» (D) y «×» 40 × 40 → Mapa.
Cuatro filas de 72 de alto, relleno 14 × 16, radio 12, icono 28, título 18/600, subtítulo 13
`#c3c2b7`:

| Fila | Fondo / borde | Icono | Título | Subtítulo |
|---|---|---|---|---|
| 1 | `#2a2416` / `#6b5420` | Camps `#f2a33a` | «Camps d'emergència» | «On pots aterrar en els propers 10 min» |
| 2 | `#222220` / `#2c2c2a` | waypoint blanco | «Waypoints» | «Els del pla i afegir-ne» |
| 3 | `#222220` / `#2c2c2a` | atrás | «Sortir a l'app» | «El vol i el GPS continuen. Vol, a la columna, hi torna» |
| 4 | `#2a1d1b` / `#6b2a26` | parar `#e0524b` | «Acabar vol» | «Para el GPS i obre el Registre» |

### 2.3 `TauletaSenseWaypoint` (sin waypoint activo)

O4 con nombre, O5 en el centro de la zona sin nombre, O5 «Camp gran» con nombre, O1, O2, O8, O3. Sin
O6, O7 ni plan. Cuatro botones (sin CAMPS). Leyenda: proyección, traza, y sin muestra en `#898781`
«Mantén premut el mapa per afegir un waypoint». Franja B. Pulsación larga en el mapa: marcar un
waypoint ahí.

### 2.4 `TauletaWaypoints` (lista)

Mapa a la izquierda (desplazado para que el globo quede a la vista), sin fichas, botones, escala ni
atribución, con la ficha «Mantén premut el mapa per afegir un waypoint» abajo a la izquierda. Destino
activo con su nombre en `#35d0ff`.

Panel:
* Cabecera (relleno 14 12 4 18): «Waypoints» 20/600 y «×» 44 × 44 → Mapa.
* Subtítulo 12 `#898781`: «Rumb i distància des d'on ets ara. Només un pot estar actiu.»
* Lista con separación 8. Tarjeta: radio 10, relleno 11 × 12, columna, separación 8. Arriba: a la
  izquierda nombre 16/600 (y etiqueta «ACTIU»: 10 px 600, texto `#0b0b0b` sobre `#35d0ff`, radio 8,
  relleno 2 × 7) y debajo las coordenadas (Mono 12 `#c3c2b7`, «41,6938 N 1,2212 E») o «Zona de 144 ha,
  navegues al centre»; a la derecha el rumbo (Mono 21/500) sobre la distancia (Mono 13 `#c3c2b7`).
  Botones de 44 de alto, radio 8, 14 px: la acción (crece), «Editar» (76), «Esborrar» (82).
  * Activa: borde 2 `#35d0ff`, fondo `#1f2a33`, botones «Desactivar», «Editar», «Esborrar»
    transparentes con borde `#3c4f5c`.
  * No activa: borde 1 `#2c2c2a`, «Activar» principal, «Editar» y «Esborrar» con borde `#2c2c2a`.
* Pie: dos botones principales de 52, 15/500 con icono 20: «Marcar al mapa» y «Per coordenades».

Franja A, con «Mapa» como enlace que vuelve al mapa y sin «Més».

### 2.5 `TauletaCoordenades` (nuevo waypoint por coordenadas)

Mapa con el waypoint nuevo como chincheta `#35d0ff` (la punta en la coordenada), punto interior r6
`#0b0b0b`, nombre «WP2» 16/600 con halo, y una línea discontinua `#35d0ff` de 2 desde el globo.

Panel (relleno 14 × 16, separación 12):
* Atrás → lista, y «Nou waypoint» 20/600.
* «Nom» (rejilla `110px 1fr`) con el campo «WP2».
* Formato, tres segmentos de 42: «Decimal» | «Graus min s» | «UTM».
* Graus min s: dos filas en rejilla `74px 56px 56px 78px 52px`: «Latitud», «41°», «41'», «08,7"» y el
  botón de hemisferio «N»; «Longitud», «1°», «12'», «41,5"» y «E». Campos y botones de 44, Mono 16,
  centrados.
* Decimal: «Latitud N» y «Longitud E» (de `MobilCoordenades`). UTM: «Fus 31», «X, est», «Y, nord»,
  y «ETRS89, com als mapes de l'ICGC».
* Equivalencias, tarjeta `#24231f`: `.lab` «És el mateix punt que» y filas «Decimal» «41,6857 N 1,2115
  E», «UTM 31» «351 155 · 4 616 431», «Des d'on ets» «058° · 2,1 km» (13 `#898781` y Mono 14 blanco).
* Abajo: «Desar» (secundario) y «Desar i activar» (principal).

### 2.6 `TauletaComencar` (Començar vol)

Dos columnas. Izquierda, 640 × 800: el mapa de lo que se baja, con un círculo discontinuo de 3 km
alrededor del despegue («Més detall a 3 km»), las zonas y el despegue, y arriba una tarjeta «Mapa per
volar sense cobertura» / «Ortofoto de 15 km al voltant de l'enlairament, i més detall a 3 km».

Derecha (relleno 28 × 36, separación 12):
* «Començar vol» 30/600 y «Tot el que cal per volar sense cobertura, abans d'enlairar-te» 14 `#898781`.
* Tarjeta hecha (`#24231f`, radio 10, relleno 14 × 16, icono hecho 22 `#0ca30c`): «Pronòstic» 17/500 y
  «7 models, baixat a les 07:41 al punt d'enlairament» 14 `#c3c2b7`.
* Tarjeta hecha con barra llena `#0ca30c` de 6: «Mapa sense cobertura» y «1 512 mosaics, 43 MB».
* Tarjeta en curso (borde 1 `#2a78d6`, icono reloj): «Calibrant l'altitud a terra», «Deixa la cistella
  quieta a terra. 18 s de 30», barra `#2a78d6` al 60 %, y tres datos (`.lab` 11 sobre Mono 18): «GPS»
  «429 m», «Terreny» «380 m», «Correcció» «−49 m».
* Resumen en dos columnas, filas con borde abajo, rótulo 15 blanco y valor 15 `#c3c2b7`: «Finestra»
  «08:00 a 11:00», «Sostre» «1 200 m · 3 937 ft», «Optimitzador» «1 500 a 3 937 ft», «Waypoint actiu»
  «ZONA A».
* Botón «Obrir la pantalla de vol», 64 de alto, radio 10, `#2a78d6`, 19/500.
* Nota centrada 13 `#898781`: «La pantalla es queda encesa mentre voles».

### 2.7 `TauletaPuntAterrar` y 2.8 `TauletaPuntPassar` (marcar al mapa con objetivo)

Mapa de 860 × 600 con la zona alcanzable (O10 a ,2), la cruz fija en el centro (aro r16 y cuatro
brazos, blancos de 2,5 con halo de 5), «Mou el mapa fins que la creu caigui al punt» arriba a la
izquierda, «+» y «−» arriba a la derecha, y la leyenda «On pots aterrar amb el vent d'ara, fins a les
09:34» (o «On pots passar a 2 500 ft…»).

Panel (relleno 14 × 16, separación 10, con scroll si no cabe):
1. «×» → lista, y «Marcar al mapa» 20/600.
2. «Punt» | «Zona» (la zona llega con la parte 3).
3. «Nom» con «WP3».
4. «Sota la creu»: Mono 20/500 «41,6820 N 1,1967 E» y Mono 13 `#c3c2b7` «terreny 1 444 ft · 036° a
   850 m del globus».
5. `.lab` «Al punt» y el selector «Aterrar» | «Passar a…» | «Qualsevol altura» (46 de alto).
6. Con «Passar a…», el paso de altitud: «−» y «+» de 52 × 48 (Mono 24) y en medio «2 500» (Mono 28,
   editable) + « ft», y debajo «1 056 ft sobre el terreny del punt · de 250 en 250».
7. Explicación, 13 `#c3c2b7`: Aterrar «Compta arribar al punt a ras, a uns 10 m del terreny. Baixar
   abans i volar a ras, o baixar ràpid al final, ho tria el càlcul.» Passar «Compta passar pel punt a
   2 500 ft, mantenint-la o creuant-la pujant o baixant.»
8. Resultado, fondo `#1f2a33`, `.lab` `#8fd8f5` «Amb el vent d'ara»: «El més a prop a terra: 140 m a
   les 08:45» o «Hi passes a 21 m a 2 500 ft, a les 08:45».
9. «Desar i navegar-hi», principal de 52.

### 2.9 `TauletaMapaAterrar`, 2.10 `TauletaMapaPassar` y 2.11 `TauletaMapaNoArriba` (en vuelo, fase 2)

Pintado en orden: O10, O11 por tramos con sus marcas, O12 si el plan no llega al punto, O6, O4, O1, O2,
O3. Sin O7 ni O8. Arriba a la izquierda, en columna: fichas, aviso de terreno y tarjeta del plan. Los
cinco botones. Leyenda: «On pots aterrar, fins a les 09:34» (o «On pots passar a 2 500 ft…»), «Pla en
altura, marques cada 5 min», «Pla a ras (terra)», «Traça per altitud». Atribución de la fase 2. Franja
A con la etiqueta del objetivo.

## 3. Defectos de las maquetas y qué se hace

1. Miles y unidades se parten en dos líneas: espacio duro o `nowrap`.
2. Los anchos de la franja no suman 1280: `border-box` y los anchos medidos.
3. Falta un espacio en «a les08:44» de `Main`: se escribe bien.
4. En `TauletaPuntPassar` el botón queda tapado por la franja: el panel lleva scroll.
5. En `TauletaPuntPassar` la zona y la leyenda son las de aterrar: se pinta la del objetivo elegido.
6. La cruz no está en el centro del mapa: va en el centro.
7. La punta de la chincheta de Coordenades no cae en la coordenada: va en la coordenada.
8. En `TauletaComencar` el Camp gran queda fuera del panel: no importa.
9. En `TauletaMapaNoArriba` el plan baja a terra y no se pinta a ras: se pinta lo que diga el motor.
10. Cifras en Sans en la orden de la fase 2: todas en Mono.
11. «Mapa» como enlace sin `aria-pressed` en la lista: botón con `aria-pressed`.
12. Ámbar y rojo distintos de `theme.css`: se usan los tokens de la app (ver el plan).

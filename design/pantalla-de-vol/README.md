# Maquetas de la pantalla de vuelo, 10/10/2026

Copia de los ficheros del lienzo publicado en
https://claude.ai/artifact/Frarp4bampNfwHn86kKNnf (privado). El lienzo manda: esto es una copia
para que no se pierdan.

Veintisiete pantallas, en catalán:

| Fila | Pantallas |
|---|---|
| Tablet, mapa nuevo de la app (11/10/2026) | `TauletaPerfil`, `TauletaAfegirGlobus` (marca por pieza), `TauletaAfegirGlobusBarreja` (envolvente Ultramagic con cistella Kubicek), `TauletaPlans` (comparar días en Tàrrega, 12 a 14/10, y los puntos de despegue), `TauletaPlaNou` (lo que pide el generador del Mac, con «On acabar» en lugar del perfil), `TauletaAfegirEnlairament` (como un waypoint, al mapa o por coordenadas), `TauletaPla` (resumen, Tàrrega 10/10), `TauletaPlaTrajectories` (zona donde puedes acabar y viento por altura), `TauletaPlaWaypoints` (waypoints y zonas del plan), `TauletaPlaEnaire` (espacio aéreo y plan de vuelo ATS, **TBD** desde el 11/10/2026: no entra en la primera versión) |
| Tablet, pantalla de vuelo, sin columna | `Main` (Mapa, con «Camps» y «Més»), `TauletaVent`, `TauletaSenseWaypoint`, `TauletaVolMes` (menú: campos, waypoints, salir, acabar), `TauletaEmergencia` (campos de emergencia con cubiertas ICGC 2024), `TauletaAcabarVol` (hacia Registre, cifras ilustrativas) |
| Tablet, antes y durante el vuelo | `TauletaComencar`, `TauletaWaypoints`, `TauletaMarcarMapa` (una zona a medio dibujar), `TauletaCoordenades` (grados, minutos y segundos) |
| Teléfono, dentro del plan, sin navegación | `MobilWaypoints`, `MobilMarcarMapa`, `MobilCoordenades` (UTM) |
| Competició | `MobilCompeticio`, `MobilProvaGenerada`, `TauletaProvaEnVol`, `TauletaResultat` |

Las imágenes del lienzo se cargan como `/_blob/81fc07a526d1131ee13d8a04f183945b`, que sólo existe
en el artefacto. Aquí la misma imagen es `orto_tarrega.jpg`: ortofoto del ICGC, CC BY 4.0, a 10 m
por píxel, de 4 km al oeste a 9 km al este del despegue de Tàrrega y de 2 km al sur a 8,5 km al
norte.

Las cifras salen de `docs/prototipos/2026-10-10-vuelo/`. El viento y los planes del optimizador
son reales. La traza, el viento medido y el resultado de 44 m son ilustrativos.

La fila del mapa nuevo usa además `/_blob/843d5d13cddf10eb2cb0a1916f6a32a0`, que aquí es `orto_zona.jpg`: ortofoto del ICGC a 20 m por píxel, de 6 km al oeste a 18 km al este del despegue de Tàrrega y de 6 km al sur a 12 km al norte. Las líneas eléctricas, las trayectorias y los perfiles salen de `carta_tarrega_10-10-2026_datos.json` del generador del Mac, proyectados con `docs/prototipos/2026-10-11-mapa/geo_zona.py`.
La pantalla `TauletaMeteo` usa `/_blob/b6cc2611a6fc1a542b334b20e2bb7be1`, que aquí es `orto_regio.jpg` (ICGC, de Balaguer a Igualada). Su viento sale de `vent_grid_12-10.json` (AROME France, 91 puntos) y las distancias, de correr `carta_datos.py` y `carta_perfil.py` del Mac en una copia aparte para los cuatro despegues el 12/10 (`carta_*_12-10-2026_datos.json` y `resum_12-10.json` en `docs/prototipos/2026-10-11-mapa/`).
El campo en color de `TauletaMeteo` es `/_blob/bb7dcef90db97983a13c96fd2407e23d`, aquí `camp_925hPa_0800.jpg`, generado con `docs/prototipos/2026-10-11-mapa/camp_vent.py` (u y v interpolados entre los 91 puntos, escala de color tipo Windy y líneas de flujo).

El 11/10/2026 se probó un mapa de viento propio estilo Windy (`TauletaMeteo`, ya retirada; `camp_vent.py` y `camp_925hPa_0800.jpg` quedan como prueba) y Dídac eligió abrir Windy directamente. La columna «Acabaries» de `TauletaPlans` sale de `dies_resum.json`.

`TauletaEmergencia` usa `/_blob/c0c4fa5ab78ca1d819491c7b5e6a9981`, aquí `apte_fan.png`: aptitud del terreno (cubiertas ICGC 2024, criterio del buscador del Mac) dentro de la zona alcanzable en 10 min desde la posición de `Main`, calculada con `docs/prototipos/2026-10-11-mapa/emergencia.py` y el viento del plan del 10/10.

**01/11/2026, fila nueva «Fase 2 · objectiu d'altura al punt i zona, amb el relleu»**, seis pantallas:
`TauletaPuntAterrar` y `TauletaPuntPassar` (marcar un punto con su objetivo: Aterrar, Passar a ___ ft con
pasos de 250 ft, Qualsevol altura), `MobilPuntObjectiu` (lo mismo en el teléfono, dentro del plan),
`TauletaMapaAterrar`, `TauletaMapaPassar` y `TauletaMapaNoArriba` (en vuelo: la zona según el objetivo, el
plan por pasos, a ras en verde discontinuo, el punto más cercano y el aviso de terreno). Las órdenes, las
zonas, los caminos y los resultados son los del motor con el viento real del 10/10 y el relieve real
(`docs/prototipos/2026-11-01-objetivo/maquetas.json`). Las genera
`docs/prototipos/2026-11-01-objetivo/artboards.py`. La franja de cifras (1 540 ft, vario, rumbo, tiempo)
sigue siendo la ilustrativa de `Main`, y «127 ft sobre el terreny» sale del relieve bajo el globo.

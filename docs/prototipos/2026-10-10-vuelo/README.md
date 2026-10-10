# Prototipos del 10/10/2026, pantalla de vuelo

Scripts de usar y tirar que sacaron las cifras de las maquetas de `design/pantalla-de-vol/`. No
son código de la app. Sirven de referencia para el motor en TypeScript y como datos de
contraste para sus pruebas. Se corren desde esta carpeta con `uv run python3 -I <script>`.

| Fichero | Qué hace |
|---|---|
| `viento.py` | Pide a open-meteo los siete modelos sobre el despegue de Tàrrega (41,6561 N 1,1490 E) para el 10/10/2026, de 06 a 09 UTC, y monta las filas cada 250 ft sobre el mar como dice el spec §5.2 y §5.3. Guarda la respuesta cruda en `openmeteo_10-10.json` y las filas en `filas.json` |
| `openmeteo_10-10.json` | **La respuesta cruda de open-meteo.** Es el dato de contraste del spec §11: el motor de la app y `vent_alt.py` del Mac deben dar lo mismo con ella |
| `optim2.py` | Optimizador de prueba del spec §6.8, con el viento precalculado por fila y por paso de 30 s. Desde la posición de la maqueta a las 08:34 hasta la ZONA A. Probó 46 431 planes en unos 8 s en Python |
| `compet.py` | Comprueba que cuatro blancos de una HWZ se alcanzan desde el despegue a las 08:00 |
| `b3bajo.py`, `cuatro_bajo.py` | Lo mismo, pero sólo cuenta la distancia por debajo de 500 ft sobre el despegue, por la separación 2D y 3D de la plantilla II.21 del AXMER |
| `b3path.py`, `mapa.py` | Coordenadas en píxeles para pintar las maquetas sobre la ortofoto |
| `*.json` | Salidas de los anteriores |

Lo que salió y cambia el diseño:

* A 380 m de elevación, 975 hPa queda a unos 350 m, bajo tierra, e ICON-EU, GFS y UKMO dan
  viento ahí igualmente. El motor tiene que descartar esos niveles (spec §5.1).
* La primera versión del optimizador, sin precalcular el viento, tardó más de dos minutos. Con
  el viento por fila y por paso precalculado, 8 s. En TypeScript en la tablet debería caber en
  el presupuesto de 1 s, pero hay que medirlo (spec §12, punto 4).
* Pasar a 2 750 ft por encima de un blanco daba unos 290 m de resultado con la regla 3D. El plan
  bajo, 10 m.

Las cifras de la traza, del viento medido y del resultado de 44 m de las maquetas son
ilustrativas: no había vuelo grabado.

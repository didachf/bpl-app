# El relieve en el motor de navegación, diseño

Fecha: 01/11/2026. Enmienda el motor del 30/10 (`2026-10-30-motor-navegacion-design.md`, §6.1, §6.3,
§6.4 y §9) y el objetivo de altura del mismo 01/11 (`2026-11-01-objetivo-de-altura-design.md`, §3).
Para lo que toca aquí, manda éste.

## 1. Por qué

El motor trabajaba con un rango de altitud sobre el mar y no sabía dónde estaba el suelo. Con el
vuelo del 10/10 sobre Tàrrega, al preparar las maquetas de la fase 2, salió que:

* El suelo sube de 380 m en el despegue a 430 m bajo el globo y entre 440 y 535 m más al este. En 77
  de 143 puntos de una rejilla de 500 m al este del globo, el suelo está por encima de 1 500 ft
  (457 m), el mínimo del rango de ese día.
* Terra estaba a la elevación del pronóstico más 10 m, 390 m, que bajo el globo queda 40 m bajo
  tierra. El plan para pasar a 2 500 ft empezaba por «baixa ràpid fins a terra».

## 2. Decisiones del piloto, 01/11/2026

| Tema | Decisión |
|---|---|
| Mínimo de altitud | **Sobre el terreno bajo el recorrido**, no sobre el mar. El techo sigue sobre el mar |
| Valor | **100 ft** por defecto, editable en Ajustes |
| Volar a ras | **También de paso**, no sólo para aterrizar: terra sigue siendo una franja que el plan puede usar unos minutos y dejar |

Así, las altitudes que se mantienen quedan al menos 100 ft sobre el suelo que tienen debajo, y terra,
a unos 10 m, es la única excepción, como modo deliberado.

## 3. La fuente del relieve

**AWS Terrain Tiles, formato Terrarium, z12**: unos 29 m por píxel a esta latitud, gratis y sin clave
(https://registry.opendata.aws/terrain-tiles/). Contrastado el 01/11/2026 con Copernicus GLO-90 (la API
de elevación de open-meteo) en el despegue de Tàrrega, bajo el globo, en la zona A y en dos puntos más:
diferencias de 0 a 3 m. Una zona de vuelo de 30 × 30 km son unos 25 mosaicos, menos de 3 MB, que la
tablet baja con el plan y guarda para volar sin cobertura (fase 2, pantalla).

En la app (plan `2026-11-01-datos-de-vuelo`, `src/services/vuelo/`): 20 km alrededor del despegue,
36 mosaicos y unos 3,6 MB, rejilla de 100 m (400 × 400 nodos), en la caché `mosaicos` con la
ortofoto. Comprobado en Chromium el 01/11/2026: la rejilla del 10/10 sale idéntica a
`relieve_10-10.json` en sus 29 145 nodos, y se monta en 15 ms con los mosaicos ya leídos.

El motor no baja nada: recibe una rejilla regular en grados.

```ts
/** Elevacion del suelo. Filas de sur a norte desde lat0, columnas de oeste a este desde lon0. */
export interface Relieve { lat0: number; lon0: number; dLat: number; dLon: number; nLat: number; nLon: number; elevM: number[] }
```

Para las pruebas, `docs/prototipos/2026-10-10-vuelo/relieve_10-10.json`: la zona del 10/10 remuestreada
a unos 100 m (145 × 201 nodos, de 297 a 650 m), hecha con `docs/prototipos/2026-11-01-objetivo/relieve.py`.

## 4. El cálculo

### 4.1 El suelo

`relieve.ts`, puro:
* `sueloGeo(r, lat, lon)`: bilineal entre los cuatro nodos. `NaN` fuera de la rejilla.
* `sueloPlano(r, plano)`: lo mismo en metros del plano local del motor, con la transformación
  precalculada. Es lineal, así que cada consulta son dos multiplicaciones y la interpolación.
* `techoPlano(r, plano)`: **el máximo de los cuatro nodos** de la celda. Es el que se usa para
  comprobar el mínimo: entre nodos el suelo puede ser más alto que la bilineal, y así el error va del
  lado seguro.

### 4.2 Las franjas

Con relieve:
* **Terra** va al suelo bajo el globo más 10 m para los tiempos de subida y bajada, con el viento a
  10 m del pronóstico (el mecanismo de `vientoM` del objetivo de altura). Con Aterrar, al suelo del
  punto, de `elevPuntoM` o, si no viene, del relieve en el punto.
* **Las franjas de 250 ft empiezan justo por encima de terra** (y nunca por debajo de la elevación del
  pronóstico más 10 m, donde los modelos no tienen viento). El `altMinM` del piloto ya no se usa: el
  mínimo lo pone el terreno, punto por punto.
* El techo es el `altMaxM` de siempre.

`ASSUMPTION:` terra tiene una sola altitud geométrica, la del suelo de ahora (o del punto, al
aterrizar). Los tiempos de las bajadas a terra más adelante en el recorrido salen de esa altitud, no
del suelo de allí. Y no hay franjas por debajo del suelo de ahora: en un valle más adelante, lo único
por debajo es terra, que sigue el terreno.

### 4.3 Qué es válido

Una posición a la altitud `z` en el punto `(x, y)` del plano es válida si `z ≥ techo(x, y) + mínimo`.
Se comprueba al final de cada minuto:
* manteniendo una franja, con su altitud
* en un cambio entre dos franjas, con la altitud de ese minuto (subida o bajada a velocidad constante)
* terra, y los cambios de terra o a terra, no se comprueban: son el vuelo a ras que decidió el piloto
* fuera de la rejilla no se puede comprobar: se deja pasar y el aviso lo dice

**Un plan cuenta hasta su primera posición no válida**, y lo que viene después no existe: allí el
piloto tendría que cambiar de altitud, y el recálculo de 15 s lo hará. La distancia al punto sólo se
mide en ese tramo válido. Las órdenes se cortan al pasar por el punto, así que lo de después no se ve.

Las franjas que quedan por encima del suelo más alto de la rejilla más el mínimo son siempre válidas y
no se comprueban.

### 4.4 La búsqueda y la zona

* `buscarPlan` corta cada plan en su primera posición no válida, en la búsqueda gruesa y en el
  refinado. Un cambio que pasa por una posición no válida no se hace.
* **La zona** se calcula dos veces. La cota exterior, sin el relieve, así que sigue demostrando lo que
  demostraba (con relieve hay menos planes, nunca más). La zona que se pinta, con una segunda pasada
  que descarta cada estado en cuanto su posición no es válida, y cada cambio que pasa por una posición
  no válida. Marcar sólo las posiciones válidas no basta: pintaría puntos detrás de un cerro a los que
  sólo se llega atravesándolo. La segunda pasada se queda corta a veces (si el extremo de un estado no
  vale, se descarta aunque otra posición del mismo estado valdría), y eso va del lado seguro: lo que se
  pinta se alcanza.
* `fracciones` y las tablas ganan la altitud del final de cada minuto de cada cambio.

### 4.5 Lo que acompaña al plan

* **Si no fas res**: si mantener la altitud actual llega a una posición no válida dentro del
  horizonte, el aviso lo dice con la hora: «Si no fas res, a les 08:50 passes a menys de 100 ft del
  terreny.» La distancia de «si no fas res» se mide hasta allí.
* La dispersión entre modelos corta cada camino con el mismo criterio.
* Sin relieve: «Sense relleu: el pla no sap on és el terreny.» y todo como antes.
* Con el globo fuera de la rejilla: lo mismo que sin relieve, con su aviso.
* Con parte del plan fuera de la rejilla: «Part del pla surt del relleu carregat: allà no es comprova
  el terreny.»

## 5. Entrada

* `EntradaNav.relieve?: Relieve`.
* `AjustesNav.minSobreTerrenoM`, 30,48 m (100 ft) por defecto.

## 6. Pruebas

Prueba primero, con vitest, y mutación de cada guarda nueva como el resto del 01/11.

* **Suelo:** bilineal exacta en una rejilla hecha a mano, `NaN` fuera, el plano igual que la geográfica,
  el techo es el máximo de la celda.
* **Validez:** con un cerro sintético delante, mantener la franja baja deja de valer al llegar al cerro y
  el plan sube por encima. Terra pasa por encima del cerro. Un cambio que atraviesa el cerro no se hace.
* **Fuerza bruta con relieve:** el oráculo corta los planes igual, y el motor no es peor en más de 50 m,
  con el 10/10 y su relieve real, con los tres objetivos.
* **10/10 con relieve:** ninguna posición del plan elegido, fuera de terra, queda a menos de 100 ft del
  suelo. Terra a unos 440 m (430 m de suelo bajo el globo).
* **Si no fas res** con el cerro delante: el aviso con la hora.
* **Sin relieve:** las pruebas de antes pasan sin tocarlas.
* **Rendimiento:** el 10/10 con relieve, por debajo de los 2 s de la prueba.

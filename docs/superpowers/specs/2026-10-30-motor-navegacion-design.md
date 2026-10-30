# Motor de navegación a un punto, diseño

Fecha: 30/10/2026. Amplía el spec de la pantalla de vuelo (`2026-10-10-pantalla-de-vuelo-design.md`)
en §6.4 (viento medido) y §6.8 (optimizador). Para el cálculo manda éste. Lo que se pinta sigue en
el del 10/10, salvo lo nuevo de §8 de éste, que necesitará maquetas antes de programarse.

## 1. Objetivo

El piloto, 30/10/2026: marcar un punto en el mapa y que la app, con todos los datos medidos en
directo, los pronósticos y, más adelante, globos piloto lanzados por el equipo, dé instrucciones
para llegar a ese punto o, si el viento no deja, alternativas.

Se empieza por **el motor, sin pantalla**: el cálculo entero, probado con datos reales, para que la
pantalla de vuelo, el Mac y más adelante Claude usen el mismo.

## 2. Decisiones del piloto, 30/10/2026

| Tema | Decisión |
|---|---|
| Por dónde empezar | El motor primero, sin pantalla |
| Alternativas si no se llega | **El punto más cercano posible**, con su plan, y **la zona alcanzable en el mapa**. No eligió ni probar otros destinos conocidos ni esperar a otro viento |
| Planes volables | **Hasta tres altitudes mantenidas** por plan, unidas por subidas o bajadas, como en el spec del 10/10 |
| Tiempo mínimo en cada altitud | **2 min** |
| Estructura interna | La decide el desarrollador («esto lo decides tú») y queda escrita aquí |
| Orden de trabajo | 1 motor con previsión y GPS. 2 pantalla de vuelo, con maquetas nuevas de lo de §8. 3 otras fuentes de viento. 4 Claude encima del motor |
| Claude dentro de la app | Sí, al final, como capa que pregunta al motor y explica. Nunca da una cifra propia |

## 3. Qué cambia respecto al spec del 10/10

1. **El viento medido ya no sustituye a la franja** (§6.4 y §6.8 del 10/10, «lo medido si tiene
   menos de 15 min»). Ahora cada medida corrige **el error de la previsión**, y la corrección se
   extiende a las franjas vecinas y dura en el tiempo (§5.2). Es lo que hizo Loon (Bellemare et al.,
   Nature, 2020: un proceso gaussiano sobre el pronóstico de ECMWF como media a priori).
2. **El retraso del globo se corrige.** Un globo de aire caliente tarda unos 300 s en recorrer el
   90 % de un cambio de viento de 2 m/s (KNMI y Wageningen, medidas en globo contra la torre de
   Cabauw). La deriva medida justo al entrar en una capa es todavía la de la capa anterior (§5.1).
3. **La búsqueda por fuerza bruta se sustituye** por programación dinámica para la zona alcanzable
   y por una búsqueda guiada para el plan (§6). La fuerza bruta del prototipo (`optim2.py`, 46 431
   planes en unos 8 s en Python) pasa a ser el oráculo de las pruebas.
4. **Nuevo:** la zona alcanzable, la comprobación de que un punto no se alcanza y el punto más
   cercano posible.
5. **Nuevo:** mínimo de 2 min en cada altitud mantenida.

Lo demás de §6.8 del 10/10 sigue: modos verticales, horizonte de 60 min, recálculo cada 15 s,
umbral de sustitución del plan (20 % o 200 m más cerca), órdenes en catalán, «si no fas res»,
dispersión entre modelos y el aviso de terreno, obstáculos y espacio aéreo.

## 4. Piezas

Todas en `src/services/nav/`, puras, sin nada del navegador, con entrada y salida en datos
serializables a JSON. Corren en un Web Worker en la tablet, en node en el Mac y, en la fase 4,
como herramientas de Claude.

| Fichero | Qué hace |
|---|---|
| `tipos.ts` | Los tipos de entrada y salida de todo el motor |
| `medidas.ts` | La medida de viento única, y su obtención desde la traza GPS con la corrección del retraso |
| `campo.ts` | El campo de viento por franja y por minuto, de cada modelo y combinado, a partir de la previsión |
| `correccion.ts` | La corrección del campo con las medidas (proceso gaussiano sobre el error) |
| `vertical.ts` | Qué franjas se alcanzan y en cuánto tiempo, con los modos del piloto |
| `zona.ts` | La zona alcanzable por programación dinámica, y la comprobación de que un punto queda fuera |
| `plan.ts` | El plan que pasa más cerca del punto, y su evaluación con cada modelo |
| `ordenes.ts` | El plan en órdenes cortas en catalán |
| `motor.ts` | La entrada única: de previsión, traza, ajustes y punto a `ResultadoNavegacion` |

Además, `parametros.ts` con todas las constantes con nombre, `geo.ts` con el plano local y la
envolvente convexa, y tres ficheros que sólo usan las pruebas: `sintetico.ts` (campos hechos a
mano), `prueba-1010.ts` (la respuesta guardada del 10/10) y `oraculo.ts` (la fuerza bruta del
prototipo).

Unidades dentro del motor: metros sobre el mar, m/s, segundos, posiciones en metros este y norte
desde el despegue (plano local, suficiente para unas decenas de km). Pies y nudos sólo en
`ordenes.ts` y en la pantalla.

## 5. El viento

### 5.1 Medidas

Una medida es `{ fuente, t, altM, u, v, sigma }`: hora, altitud sobre el mar, componentes este y
norte en m/s, y su error típico por componente. `fuente` es `gps` en la fase 1, y más adelante
`caja`, `pibal` o `metar`. El resto del motor no distingue fuentes, así que añadir una es escribir
cómo se obtiene su medida y nada más.

**Desde la traza GPS** (§6.4 del 10/10, con dos cambios):
* La velocidad del globo sale de una ventana de 60 s (al menos 20 velocidades) cuya altitud no
  varía más de una franja, en lugar de la de 20 s del 10/10.
* **Corrección del retraso.** Con una respuesta de primer orden, el viento es
  `w = v + τ · dv/dt`, con `v` la velocidad sobre el suelo y `dv/dt` su derivada. Las dos salen de
  una regresión lineal sobre la ventana y se toman **en el centro de la ventana**: la media de la
  velocidad y la pendiente se refieren al mismo instante y el sesgo de la ventana se cancela. Con
  un escalón de viento sintético de 5 m/s, la medida recupera el viento nuevo con un error de
  0,01 m/s, cuando la deriva sin corregir va todavía 3,5 m/s desviada (comprobado el 30/10/2026).
  `τ = 130 s` (ESTIMATE: 300 s al 90 % del KNMI entre ln 10). Editable en código y por ajustar con
  vuelos grabados.
* **Error de la medida.** El ruido del GNSS de un teléfono es de unos 0,8 y 0,6 m/s en este y norte
  con pasos de 1 s (KNMI). Promediado en 20 s queda en unos 0,2 m/s. El `sigma` de la medida es
  `√(σv² + (τ · σd)²)`, con `σv` el de la velocidad promediada y `σd` el error típico de la
  pendiente de la regresión. Si la medida sale ruidosa, su `sigma` lo dice y la corrección le da
  menos peso sola. No hace falta una regla aparte.
* Como mucho una medida por franja cada 2 min, la más reciente.

### 5.2 Campo y corrección

**Campo.** Para cada modelo y para la combinación de los modelos, `u` y `v` en cada franja de
250 ft del rango de altitud y en cada minuto del horizonte. Las franjas son las filas de §5.2 del
10/10, y el tiempo se interpola como la columna «Ara» de §5.4. La combinación es la misma casilla
de §5.3 (rumbo de la media vectorial ponderada por velocidad, velocidad mediana) pasada a vector,
para que el plan diga el mismo viento que la tabla.

**Corrección.** Para cada medida, el residuo es la medida menos el campo en su altitud y su hora.
Se ajusta un proceso gaussiano sobre los residuos de `u` y de `v`, por separado, con núcleo
exponencial en altitud y en tiempo:

`k = s² · exp(−|Δz| / Lz − |Δt| / Lt)`

y la media a posteriori se suma al campo. La varianza a posteriori es la incertidumbre de cada
casilla. Las medidas son las mismas para todos los modelos, así que la matriz se factoriza una vez
y se resuelve para cada modelo y para la combinación.

| Parámetro | Valor de partida | De dónde sale |
|---|---|---|
| `s` | 1,8 m/s por componente | ASSUMPTION: 2,5 m/s de error vectorial entre viento medido en globo y HARMONIE-AROME a corto plazo, entre raíz de 2 |
| `Lz` | 200 m | ASSUMPTION: Loon usa 326 Pa en la estratosfera, unos 200 m a 10 kPa. No hay valor publicado para la capa límite |
| `Lt` | 2 h | ASSUMPTION: los valores publicados son más largos (9,6 h en Loon, 0,35 d en el viento a 10 m del NAM), pero la capa límite de la mañana cambia rápido al salir el sol. Se empieza corto |
| Ruido | el `sigma` de cada medida | §5.1 |
| Medidas | hasta 300, de menos de 6 h | Loon descarta las de más de 6 h |

Los tres primeros se reajustan cuando haya vuelos grabados con traza. Mientras tanto, son
constantes con nombre en `correccion.ts`, no números sueltos.

## 6. El cálculo

### 6.1 La rejilla

Franjas de 250 ft dentro del rango de altitud (por defecto, de 250 ft sobre el despegue al techo,
como en el 10/10) y pasos de 1 min hasta el horizonte (60 min por defecto). En un vuelo de
prácticas son unas 12 a 16 franjas. Con el viento sólo función de altitud y hora (§5.5 del 10/10),
el desplazamiento de un plan es la suma del viento de cada paso por su duración, y no depende de
dónde esté el globo. Todo lo que sigue se apoya en eso.

Precálculos, una vez por recálculo:
* `P[b][k]`, desplazamiento acumulado manteniendo la franja `b` hasta el minuto `k`. Mantener de
  `k1` a `k2` cuesta una resta.
* `T[b][b'][modo][k]`, desplazamiento y duración de ir de `b` a `b'` con un modo empezando en el
  minuto `k`, integrado en pasos de 10 s a través de las franjas que cruza. La duración se redondea
  al minuto por arriba y el resto del minuto se mantiene en `b'`.

### 6.2 Vertical

Los cuatro modos del piloto con su valor de cálculo (§6.8 del 10/10: 0,5, 2,75, 0,5 y 4 m/s),
editables en Ajustes. `vertical.ts` es la única pieza que sabe de modos. Cuando la caja dé la
temperatura de la vela, el tiempo de quemado y la temperatura del aire, se sustituye por un modelo
físico de tres estados (altitud, velocidad y temperatura del aire de la vela), el de la tesis de
Lladó-Gambín (UC Irvine, 2016), contrastado en vuelo con un M-77 y un quemador MK-32. Sus cifras
de partida: constante térmica de unos 340 s, y 1 K más de temperatura en la vela da del orden de
1 m/s de subida estable (ESTIMATE).

### 6.3 Zona alcanzable

Para una dirección `u`, el punto alcanzable más lejano en esa dirección en el minuto `k` maximiza
una suma de términos de cada paso, y eso lo resuelve exacto una programación dinámica hacia
delante (tipo Viterbi). El estado es la franja, cuántas altitudes mantenidas se llevan (1 a 3) y
cuánto se lleva en la actual (0, 1, o 2 min o más). Una sola pasada hacia delante da el extremo de
**todos** los minutos a la vez, y los punteros hacia atrás dan el plan real que llega a cada
extremo.

Con 32 direcciones:
* **Zona interior:** la envolvente de los 32 extremos de cada minuto. Son puntos a los que llega un
  plan de verdad.
* **Cota exterior:** la intersección de los 32 semiplanos. Fuera de ella no se llega con ningún plan
  que cumpla las reglas, con este viento. Es la prueba de «no s'hi arriba».
* **La zona del mapa** es la unión de las zonas interiores de cada minuto hasta el horizonte.

Coste por dirección, con 16 franjas, 60 min y 9 estados por franja: unas 3 × 10⁵ operaciones.
Con 32 direcciones, unos 10⁷. ESTIMATE: decenas de milisegundos en el Web Worker. Se mide (§10).

`ASSUMPTION:` la zona interior es convexa por construcción, y la zona real puede no serlo. Con hasta
tres altitudes la diferencia es pequeña: con viento constante en el tiempo y cambios de altitud
instantáneos, todo punto de la envolvente se alcanza con tres altitudes como mucho (teorema de
Carathéodory en el plano). Con viento que cambia y cambios que tardan, no es exacto, y la cota
exterior sigue siendo segura.

### 6.4 Plan al punto

Lo que se busca es lo mismo que en el 10/10: **la menor distancia al punto en todo el recorrido**,
no al final. Si dos planes quedan a menos de 50 m uno del otro, gana el que llega antes, y después
el que tiene menos cambios.

Un plan es `[actual, A, B]`: mantener la franja actual (0 min, o 2 o más), ir a `A`, mantenerla
2 min o más, ir a `B` y mantenerla hasta el horizonte. O sus versiones cortas `[actual]` y
`[actual, A]`. Son las tres altitudes como mucho de §2, y la misma familia que la fuerza bruta del
prototipo.

1. **Búsqueda exhaustiva gruesa:** todas las franjas `A` y `B`, los dos modos de cada cambio y las
   duraciones en pasos de 2 min. Con `P` y `T` cada plan se evalúa con restas, y la distancia mínima
   del tramo común (lo mantenido en la actual, el cambio a `A`) se calcula una vez para todos los
   planes que lo comparten. Con 11 franjas son unos 2 × 10⁵ planes.
2. **Refinado:** a los 40 mejores se les mueve cada duración un minuto arriba y abajo.
3. **Elección:** el de menor distancia y, entre los que quedan a menos de 50 m de ella, el que llega
   antes y después el de menos cambios.

Con más de 16 franjas (vuelos altos), `A` y `B` se eligen entre 12 candidatas: la actual y las tres
de arriba y de abajo, las que forman la envolvente del viento medio de cada franja sobre el
horizonte, y las más alineadas con el punto. Por el argumento de Carathéodory de §6.3, con viento
estable bastan las de la envolvente.

Con eso salen los dos casos:
* **Se llega** si la distancia mínima es de 50 m o menos: «Passes a 40 m del punt a les 08:52».
  `ASSUMPTION:` los 50 m son criterio nuestro, el mismo margen de empate del 10/10. Constante con
  nombre, para cambiarla si el piloto quiere otro.
* **No se llega** si no: el mejor plan es el punto más cercano posible. Si además el punto queda
  fuera de la cota exterior en todos los minutos, la pantalla puede decir sin dudas «no s'hi arriba
  amb aquest vent».

### 6.5 Lo que acompaña al plan

* **Si no fas res:** mantener la franja actual hasta el horizonte, evaluado igual.
* **Dispersión:** el plan elegido evaluado con el campo corregido de cada modelo por separado.
  Distancia mínima y máxima. Es un desacuerdo, no una probabilidad (§6 del spec principal).
* **Fuente del viento** de cada tramo: medido si la incertidumbre de §5.2 en esa franja y ese tiempo
  ha bajado por debajo de la mitad de `s`, previsto si no.

### 6.6 En directo

* Plan cada 15 s y al llegar una medida nueva. Zona cada 60 s y al llegar una medida nueva.
* El plan vigente sólo se sustituye si el nuevo pasa al menos un 20 % o 200 m más cerca (10/10).
  El motor no guarda estado: da la regla (`debeSustituir`) y la pantalla guarda el plan vigente y
  la aplica, en la fase 2.
* Presupuesto: plan y zona juntos en menos de 1 s en la tablet. Si un cálculo no acaba a tiempo, se
  queda el resultado anterior con su hora.

## 7. Salida

`motor.ts` devuelve `ResultadoNavegacion`:

| Campo | Contenido |
|---|---|
| `estado` | `llega`, `no-llega`, `sin-punto` o `sin-datos` |
| `plan` | Tramos: mantener o cambiar, franja, modo, hora de inicio y fin, viento y su fuente |
| `distanciaMinM`, `horaMin` | Lo más cerca que pasa el plan, y cuándo (ISO 8601) |
| `avisos` | Lo que la pantalla tiene que decir: posición vieja, horizonte acortado, franjas fuera, corrección no aplicada |
| `siNoHaces` | Lo mismo manteniendo la altitud actual |
| `dispersion` | Distancia mínima del plan con cada modelo |
| `fueraSeguro` | Si el punto queda fuera de la cota exterior en todo el horizonte |
| `zona` | Polígonos de la zona alcanzable, en coordenadas geográficas |
| `ordenes` | El plan en catalán, ya redactado |
| `calculadoA`, `previsionDe` | Hora del cálculo y del pronóstico usado |

Sin punto activo, `estado` es `sin-punto` y no se calcula ni el plan ni nada del punto, como manda
§6.9 del 10/10. La zona sí, porque no necesita punto.

## 8. Lo nuevo para la pantalla (fase 2, con maquetas antes)

* La zona alcanzable en el mapa.
* «No s'hi arriba amb aquest vent» y el punto más cercano posible con su plan: «El més a prop:
  2,3 km a les 09:05».

El resto ya está diseñado en el 10/10.

## 9. Modos de fallo

| Fallo | Qué hace el motor |
|---|---|
| Sin previsión | `sin-datos`. No inventa viento |
| Una franja sin dato en ningún modelo | Sale del rango de altitud del cálculo, y la salida lo dice |
| Sin GPS | Calcula desde el último punto conocido y devuelve su antigüedad |
| La factorización de la corrección falla | Se reintenta con más ruido en la diagonal. Si vuelve a fallar, se calcula sin corrección y la salida lo dice |
| Medidas viejas | Pesan menos solas por el núcleo en tiempo. Las de más de 6 h se descartan |
| El horizonte pasa del final del pronóstico | Se acorta al último minuto con previsión, y la salida lo dice |
| Ningún plan mejora a quedarse | `estado` según la distancia, y la orden es mantener. «Cap pla s'hi acosta més que quedar-te a aquesta altitud», como en el 10/10 |

`WARNING:` como en el 10/10, el motor no sabe nada del terreno, los obstáculos, las líneas
eléctricas ni el espacio aéreo, y la pantalla lo dice.

## 10. Pruebas

Con vitest, prueba primero, como el resto del proyecto.

* **Medidas:** vuelo nivelado, escalón de viento con respuesta de primer orden sintética (la
  corrección del retraso recupera el viento nuevo antes que la deriva sin corregir), una medida por
  franja cada 2 min.
* **Corrección:** sin medidas el campo no cambia. Una medida corrige su franja casi entera y las
  vecinas con la caída exponencial de `Lz`. Dos medidas iguales no cuentan doble más de lo debido.
  La factorización que falla cae al campo sin corregir.
* **Vertical:** duraciones de cada modo, redondeo al minuto, deriva durante el cruce de franjas.
* **Zona:** con viento constante en el tiempo, la zona coincide con la envolvente del triángulo de
  vientos por el tiempo. Todo final de plan de la fuerza bruta cae dentro de la cota exterior. Todo
  extremo de la zona interior lo alcanza un plan que cumple las reglas.
* **Plan:**
  * con dos capas sintéticas de solución calculable a mano, la encuentra
  * contra la fuerza bruta de `optim2.py` portada a TypeScript, con el viento real del 10/10
    (`docs/prototipos/2026-10-10-vuelo/openmeteo_10-10.json`): la distancia del plan guiado no es
    peor que la del oráculo en más de 50 m
  * respeta tres altitudes, 2 min mínimo, rango y horizonte
  * desempate por distancia, hora y cambios
* **Órdenes:** catalán, pies y nudos, fuente del viento.
* **Motor:** `sin-punto`, `sin-datos` y el horizonte acortado.
* **Rendimiento:** el motor entero con el vuelo del 10/10 (11 franjas, 60 min) por debajo de 1 s en
  node en el Mac, y la prueba apunta el tiempo. En la tablet se mide en la fase 2.

El script de node para correr el motor desde el Mac con un JSON guardado queda para cuando haga
falta: el código de la app usa importaciones sin extensión y node no las resuelve sin un
empaquetador.

## 11. Fases siguientes, sólo lo que ya se sabe

**Fase 3, otras fuentes.** Cada una es una medida más de §5.1.
* **METAR** de Lleida, Reus, Girona, Barcelona y Sabadell: la API de aviationweather.gov da JSON
  sin clave, cada media hora y de madrugada también (comprobado el 30/10/2026). Viento a 10 m en el
  aeropuerto, con más `sigma` por la distancia al globo.
* **Meteocat:** la API de la XEMA pide clave, gratuita en el plan «Accés ciutadà». La copia abierta
  sin clave no está al día.
* **La caja:** el anemómetro sónico da el viento relativo, y sumado a la velocidad GPS da el viento
  real sin retraso.
* **Pibals:** posiciones GPS por LoRa, con el viento por diferencias. Normativa y rastreadores, con
  quien los hace.
* Descartados por ahora: viento de aviones por Mode-S (cobertura en España sin confirmar, sobre todo
  por encima de nuestras alturas) y otros globos por FLARM u OGN (cuatro globos españoles en la base
  de OGN el 30/10/2026).

**Fase 4, Claude.** Las piezas de §4 como herramientas. Claude pregunta al motor y explica la
respuesta, nunca calcula ni da una cifra que no venga del motor. Necesita cobertura en vuelo, y el
motor tiene que funcionar igual sin ella. Spec propio cuando toque.

## 12. Referencias

Investigación del 30/10/2026, con fuente primaria salvo lo marcado.

* Bellemare et al., «Autonomous navigation of stratospheric balloons using reinforcement learning»,
  Nature, 2020. Copia en https://www.gwern.net/doc/reinforcement-learning/model-free/2020-bellemare.pdf
* Núcleo de Loon para el error del viento:
  https://github.com/google/balloon-learning-environment/blob/master/balloon_learning_environment/env/wind_gp.py
* KNMI y Wageningen, viento en capas bajas medido con un globo de aire caliente contra la torre de
  Cabauw: https://www.knmi.nl/research/publications/measuring-low-altitude-winds-with-a-hot-air-balloon-and-their-validation-with-cabauw-tower-observations
  y el retraso del globo y el ruido del GNSS en
  https://cdn.knmi.nl/system/data_center_publications/files/000/071/898/original/hotair_balloon_wind_sensing-wageningen_university_and_research_589639.pdf
* Error de HARMONIE-AROME contra viento medido en globo: https://doaj.org/article/2a65c3b900414e66ab55f143d7fc8a10
* Persistencia en el tiempo del error del viento a 10 m del NAM: https://amt.copernicus.org/articles/19/3761/2026/
* Lladó-Gambín, tesis, UC Irvine, 2016, modelo dinámico de un globo de aire caliente contrastado en
  vuelo: https://escholarship.org/uc/item/68j7s6j5
* API de METAR: https://aviationweather.gov/data/api/
* Meteocat, clave de la API de la XEMA: https://meteostations-geopy.readthedocs.io/en/latest/user-guide/meteocat.html
  (documentación de terceros)
* Base de aparatos de OGN: https://ddb.glidernet.org/download/?j=1&t=1

`ASSUMPTION:` el argumento de Carathéodory de §6.3 y el coste de §6.3 son derivación nuestra, no
de una fuente. Las pruebas de §10 los comprueban.

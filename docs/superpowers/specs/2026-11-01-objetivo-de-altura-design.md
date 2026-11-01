# Objetivo de altura en el punto, diseño

Fecha: 01/11/2026. Enmienda el spec del motor de navegación (`2026-10-30-motor-navegacion-design.md`)
en §6.3, §6.4, §6.5, §7 y §8. Para lo que toca aquí, manda éste.

## 1. Objetivo

El motor del 30/10 busca la menor distancia horizontal al punto, a cualquier altura, y puede pasar
por encima del campo subiendo a 2 000 ft. El piloto, 01/11/2026: «tengo que poder definir la altura
por la que quiero pasar en ese punto, o si es aterrizar».

## 2. Decisiones del piloto, 01/11/2026

| Tema | Decisión |
|---|---|
| Opciones al marcar un punto | Tres: **Aterrar**, **Passar a ___ ft** y **Qualsevol altura** (lo de hoy). Sale marcada **Aterrar** |
| Passar a X ft | Cuenta pasar por esa altura **manteniéndola o cruzándola**, subiendo o bajando |
| Aterrar | Cuenta sólo ir a ras, en la franja terra. **El modelo elige** la bajada: «puedo bajar antes y flotar a 2 m hasta llegar donde quiero aterrizar, o tener que bajar a 4 m/s para no pasarme» |
| Zona del mapa | Sigue al objetivo del punto activo. Con Aterrar, dónde puedes aterrizar |
| Diseño de la pantalla de marcar | Con maquetas antes, en la fase 2 |

## 3. Cómo se hace: un margen de altura

El objetivo se traduce en un margen de altura sobre el mar, `[bajo, alto]`, y **la distancia al
punto sólo cuenta mientras el globo está dentro del margen**. La búsqueda del plan y la zona son las
del 30/10, sólo cambia qué tramos cuentan.

| Objetivo | Margen |
|---|---|
| `qualsevol` | Sin límites. Es el motor del 30/10 tal cual |
| `altitud`, X | X ± 125 ft (38,1 m): la franja de X en la tabla |
| `aterrar` | La franja terra, la elevación del pronóstico más 10 m, con 1 m de holgura |

Descartadas:
* **Distancia 3D con un peso** (horizontal más k veces la diferencia de altura). El k sería
  inventado, y un «passes a 80 m» que mezcla las dos cosas no se puede leer en la cesta.
* **Plan horizontal y luego ajustar la altura sobre el punto.** El viento a la altura pedida no es el
  del plan: al cambiar de altura el globo se va del punto.

El margen sirve después para la regla 3D de Competició (§13 del spec del 10/10), que es un margen
«por debajo de 500 ft sobre el terreno».

**La altura se pide en ft sobre el mar y en pasos de 250 ft**, como las filas de la tabla de viento
(§3 del 10/10). Así X cae siempre en una franja y el margen es esa franja.

`ASSUMPTION:` la franja terra se pone a la elevación del punto del pronóstico (el despegue o la
posición actual) más 10 m, con el viento a 10 m de los modelos. El motor sigue sin saber del terreno
bajo el punto, y una diferencia de cota entre los dos sitios cambia la duración real de la última
bajada. El aviso de terreno del 30/10 (§9) sigue valiendo.

## 4. El cálculo

### 4.1 Distancia con margen

Un tramo de un minuto va de `(p0, z0)` a `(p1, z1)`. Dentro del minuto:
* **Manteniendo una franja**, la altitud es fija: el tramo cuenta entero o no cuenta.
* **Subiendo o bajando**, la altitud avanza a la velocidad del modo hasta llegar a la franja de
  destino y ahí se queda. Con eso se calcula **exacto en el tiempo** el trozo del minuto que está
  dentro del margen, y la distancia al punto se mide sobre ese trozo del segmento.

La posición dentro del minuto se toma lineal entre los dos extremos, como ya hacen la distancia y la
cota exterior del 30/10.

Un plan que nunca entra en el margen tiene distancia infinita y nunca gana a uno que entra.

### 4.2 Plan

`plan.ts` usa la distancia con margen en la búsqueda gruesa, el refinado y la evaluación de la
dispersión. Con más de 16 franjas, las franjas dentro del margen (terra con Aterrar) entran siempre
entre las candidatas. Con Aterrar, el plan acaba en terra, sea bajando pronto y manteniéndola o
llegando a ella al pasar por el punto. Los dos modos de bajada están permitidos.

### 4.3 Zona

`zona.ts` sólo marca las posiciones dentro del margen: las de una franja mantenida si la franja está
dentro, y en un cambio de altitud los extremos del trozo de minuto que cae dentro. La programación
dinámica no cambia, porque el margen sólo decide qué se marca, no qué estados existen. Un minuto sin
ninguna posición dentro no tiene zona, y la cota exterior de ese minuto lo deja fuera.

Así la zona interior son puntos donde un plan real está dentro del margen, y la cota exterior
demuestra que ningún plan pasa por el punto **a esa altura**. Sin punto activo, la zona es la de
`qualsevol`.

### 4.4 Si no fas res

Quedarse a la altitud actual. Si esa altitud no está dentro del margen, no se pasa nunca por el
punto a esa altura y `siNoHaces` es `null`. La pantalla lo dice sin distancia.

### 4.5 Altura fuera del rango

Si el margen no toca ninguna franja del cálculo (por ejemplo, 5 000 ft con el techo a 3 500 ft), el
motor no busca plan: `estado` es `no-llega`, `distanciaMinM` es `null` y el aviso dice el rango. Si
ningún plan entra en el margen dentro del horizonte, igual, con su aviso.

## 5. Entrada y salida

```ts
export type Objetivo =
  | { tipo: 'aterrar' }
  | { tipo: 'altitud'; altM: number }
  | { tipo: 'qualsevol' }
```

* `EntradaNav.objetivo?: Objetivo`. Sin él, `qualsevol`, para que el motor por sí solo haga lo del
  30/10. El valor por defecto del piloto, Aterrar, lo pone la pantalla al crear el punto.
* Con `aterrar`, el motor incluye la franja terra aunque `incluirTerra` no lo pida.
* `ResultadoNavegacion` devuelve el `objetivo` que usó. `siNoHaces` puede ser `null` (§4.4) y
  `distanciaMinM` también (§4.5).

En la fase 2, el waypoint del documento del logbook nace ya con su `objectiu` (los waypoints no
existen todavía en el código, así que no hay nada que migrar).

## 6. Textos en catalán

| Caso | Texto |
|---|---|
| Altitud, llega | «Passes a 40 m del punt a 2 000 ft a les 08:52.» |
| Altitud, no llega | «El més a prop a 2 000 ft: 2,3 km a les 09:05.» |
| Altitud, pasa cruzando | «Puja ràpid (2,5 a 3 m/s) cap a 2 500 ft, i passes pel punt a 2 000 ft pujant.» |
| Aterrar, llega | «Arribes a terra a 40 m del punt a les 09:05.» |
| Aterrar, no llega | «El més a prop a terra: 2,3 km a les 09:05.» |
| Aterrar, llega bajando | «Baixa ràpid (3 a 5 m/s) fins a terra, i hi arribes al punt.» |
| Aterrar, flotando | «Manté terra fins al punt, cap a 078° a 3 kt (previst).» |
| Si no fas res, fuera del margen | «Si no fas res, no hi passes a 2 000 ft.» o «Si no fas res, no baixes a terra.» |
| Fuera del rango | «5 000 ft queda fora del rang de càlcul (terra a 3 750 ft).» Las etiquetas son las de la rejilla, que empieza por terra cuando la franja está |
| Aterrar sin franja terra | «Falta la franja terra: no es pot calcular l'aterratge.» |
| Ningún plan entra | «Cap pla hi passa a 2 000 ft dins de l'horitzó.» |
| Qualsevol | Los del 30/10, sin cambios |

«No s'hi arriba amb aquest vent» se queda igual: con un objetivo, la cota exterior ya es la de esa
altura.

## 7. Pruebas

Prueba primero, con vitest.

* **Margen:** los tres objetivos dan su `[bajo, alto]`.
* **Distancia con margen:** tramo mantenido dentro y fuera, cruce de una franja a mitad de minuto
  subiendo y bajando, llegada a la franja de destino a mitad del último minuto, y plan que nunca
  entra (infinito).
* **Plan:** con dos capas sintéticas, `altitud` en la capa de arriba da la menor distancia sólo en
  ella. `aterrar` acaba en terra. `qualsevol` da lo mismo que hoy (las pruebas del 30/10 siguen
  verdes sin tocarlas).
* **Oráculo:** la fuerza bruta con el mismo margen no gana al plan guiado por más de 50 m, con el
  10/10 y los tres objetivos.
* **Zona:** la de `aterrar` y la de `altitud` caen dentro de la de `qualsevol`. Todo punto donde un
  plan de la fuerza bruta está dentro del margen cae dentro de la cota exterior con ese margen.
* **Motor:** altura fuera del rango, `siNoHaces` nulo, `objetivo` devuelto, y los textos de §6.
* **Rendimiento:** el 10/10 con cada objetivo sigue por debajo del límite de la prueba del 30/10.

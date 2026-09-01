# Logbook BPL, estado

Última sesión: **2026-09-02**. Rama `feat/logbook-nucleo`, sin fusionar a `main`.

## Qué es

PWA instalable en el iPhone para el ciclo completo de un vuelo en globo: registro de
vuelos, planificación y operaciones. Usuario único (Dídac, alumno de BPL en Ultramagic),
diseñada para que un segundo piloto la pueda usar sin reescribirla.

**Empieza por** `docs/superpowers/specs/2026-09-01-bpl-app-design.md`. Manda sobre todo lo
demás y está enmendado tres veces.

## Dónde está cada cosa

| | |
|---|---|
| Spec | `docs/superpowers/specs/2026-09-01-bpl-app-design.md` |
| Plan del núcleo, ejecutado | `docs/superpowers/plans/2026-09-01-logbook-nucleo.md` |
| Dominio, funciones puras | `src/domain/` |
| Persistencia y sincronización | `src/db/store.ts`, `src/sync/github.ts` |
| Maquetas de pantalla | `design/*.dc.html`, publicadas en el enlace de abajo |
| Interfaz | **no existe todavía**, `src/app.tsx` es un marcador |

Maqueta publicada: https://claude.ai/code/artifact/e0420826-2c67-4c0f-889f-6f8d173082a6

## Hecho

- **Núcleo del logbook completo y probado.** 193 pruebas, `tsc` y `build` limpios.
  Tipos, contadores de BFCL.130 y BFCL.160, esquema y migraciones, persistencia local con
  `idb-keyval`, cliente de la API de GitHub con detección de conflicto.
- **Cuatro auditorías adversariales** del dominio contra el Balloon Rulebook en PDF.
  Encontraron 10, 11, 9 y 4 defectos. Todos reparados.
- **Revisión de seguridad.** Tres hallazgos, el bajo cerrado, los otros dos documentados
  en el spec §7.
- **Dirección visual elegida:** Instrumento. Oscuro por defecto, IBM Plex Sans y Mono,
  cifras monoespaciadas. Cinco pantallas maquetadas en oscuro y dos en claro.

## Lo siguiente, en orden

1. **Escribir el plan de la interfaz** (`docs/superpowers/plans/`), a partir de las
   maquetas y del contrato del dominio, que ya está estable.
2. **Implementar las pantallas**: Inicio, Vuelos, Detalle, Cerrar vuelo, Ajustes.
3. **Empaquetado PWA** y despliegue a GitHub Pages con el `dist/` comiteado.
4. Crear el repositorio privado `bpl-logbook` y el token de grano fino.
5. Fase 2: planificación, con el puerto de `trayectoria_globo.py` y el mapa.
6. Fase 3: checklists, transcritas del Manual de Vuelo. Ver abajo.

## Decisiones que no hay que volver a tomar

- **Documento JSON único**, no Dexie. Menos de 100 vuelos en toda la vida útil.
- **Dos repositorios**: `bpl-app` público con el código, `bpl-logbook` privado con los
  datos. El token vive en `localStorage`, es de grano fino y caduca en un año.
- **`domain/` no importa nada del navegador.** Es una regla, no una preferencia.
- **Las horas se manejan en minutos** dentro del dominio. Formatear es cosa de la interfaz.
- **El ámbar `#fab219` nunca rellena una barra.** Da 1,79 de contraste sobre fondo claro.
  En tema claro pasa a `#8a5a00`.
- **Nunca `dangerouslySetInnerHTML`.** El escape de Preact es la única barrera entre una
  nota de vuelo y el token de GitHub.

## Lo que la app NO comprueba, y lo dice en pantalla

Declarado en `notModelled` y visible en Ajustes: que el curso sea en una ATO o DTO, los
nueve exámenes teóricos, la habilitación de noche (BFCL.210), la recencia de vuelo cautivo
(BFCL.200(d)), las 3 h por clase adicional (BFCL.160(b)) y las equivalencias comerciales
(BFCL.160(f)).

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

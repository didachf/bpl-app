# Logbook BPL

Cuaderno de vuelo en globo de aire caliente, con planificación y operaciones. PWA
instalable en Android.

**App:** https://didachf.github.io/bpl-app/

Pensada para un solo piloto, sin cuentas ni backend, pero sin nada cableado: otro piloto
puede clonarla, desplegarla y apuntarla a su propio repositorio de datos.

## Qué hace hoy

- **Cuaderno.** Los campos de AMC1 BFCL.050(a)(2), acumulado de horas, despegues,
  aterrizajes e inflados.
- **Vigencia de BFCL.160, por clase de globo.** Con la fecha exacta en que caduca cada
  contador y el grupo máximo de BFCL.160(d) como una escalera, no como un solo valor.
- **Cierre rápido.** Cuatro campos al aterrizar, el resto se completa en casa.
- **Copia de seguridad** en un repositorio privado de GitHub, con detección de conflicto.

Planificar y Operar son de momento un esbozo navegable. El viento y el mapa llegan en la
fase 2; las checklists, en la fase 3.

`WARNING:` **esta app no sustituye al reglamento.** Los requisitos que no modela los dice
en pantalla, en Ajustes y en el panel de vigencia. Compruébalos tú.

## Dos repositorios

| | |
|---|---|
| `bpl-app`, público | Este. Solo código. GitHub Pages gratis exige repositorio público |
| `bpl-logbook`, privado | Solo `logbook.json` y `tracks/`. Datos personales |

El token nunca vive en el código, solo en el almacenamiento del teléfono. Es un PAT de
grano fino con permiso de contenido **restringido al repositorio de datos** y caducidad de
un año: quien lo robe se lleva el cuaderno, no la cuenta.

## Usarla con tus propios datos

1. Haz un fork de este repositorio y activa Pages sobre la rama `gh-pages`.
2. Crea un repositorio **privado** para tus datos.
3. Crea un PAT de grano fino con acceso solo a ese repositorio y permiso
   **Contents: Read and write**.
4. Abre la app, ve a Ajustes, copia de seguridad, y mete cuenta, repositorio y token.

Si cambias el nombre del repositorio del código, cambia también `base` en `vite.config.ts`
y `start_url` y `scope` del manifiesto: los tres tienen que coincidir con la ruta que sirve
Pages.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # 290 pruebas, TZ fijada a Europe/Madrid
npm run build    # tsc + vite + service worker
```

El despliegue es `git subtree push --prefix dist origin gh-pages`, con el `dist/` comiteado
a `main`. Las versiones de npm están fijadas exactas a propósito: si dentro de tres años la
cadena de herramientas se pudre, la app desplegada sigue funcionando y solo quedan
bloqueados los cambios nuevos.

## Cómo está hecho

Vite, Preact y TypeScript. Un documento JSON único en IndexedDB, sin Dexie ni índices,
porque son menos de 100 vuelos en toda la vida útil.

`src/domain/` son **funciones puras que no importan nada del navegador**, y ahí va el
esfuerzo de pruebas: los contadores de BFCL son la única parte donde un error tiene
consecuencia real. Están auditados cuatro veces contra el texto del Balloon Rulebook.

Documentación en `docs/superpowers/`: el diseño manda sobre todo lo demás, y los dos planes
son el registro de cómo se construyó. `STATUS.md` dice dónde está cada cosa hoy.

## Fuentes reglamentarias

Reglamento (UE) 2020/357, Part-BFCL. AMC1 BFCL.050 para el registro de vuelos, BFCL.160
para la vigencia, y el Balloon Rulebook de EASA para los grupos de globo por volumen.

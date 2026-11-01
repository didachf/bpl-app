// Solo para generar las cifras de las maquetas del 01/11/2026. No entra en `npm test`.
// Se corre desde la raiz del repo:
//   TZ=Europe/Madrid npx vitest run --config docs/prototipos/2026-11-01-objetivo/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { include: ['docs/prototipos/2026-11-01-objetivo/*.gen.test.ts'] } })

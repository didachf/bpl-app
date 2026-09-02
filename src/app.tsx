// src/app.tsx
import { useEffect, useState } from 'preact/hooks'
import { PrimerUso } from './ui/screens/PrimerUso'
import { CerrarVuelo } from './ui/screens/CerrarVuelo'
import { Detalle } from './ui/screens/Detalle'
import { Inicio } from './ui/screens/Inicio'
import { Operar } from './ui/screens/Operar'
import { Planificar } from './ui/screens/Planificar'
import { Vuelos } from './ui/screens/Vuelos'
import { Ajustes } from './ui/screens/ajustes/Ajustes'
import { Campos } from './ui/screens/ajustes/Campos'
import { Copia } from './ui/screens/ajustes/Copia'
import { Globos } from './ui/screens/ajustes/Globos'
import { MisDatos } from './ui/screens/ajustes/MisDatos'
import { Personas } from './ui/screens/ajustes/Personas'
import { aplicarVersionNueva, pedirAlmacenamientoPersistente, vigilarVersiones } from './ui/install'
import { useRoute } from './ui/router'
import { StoreProvider, useStore } from './ui/state'

function Ruta() {
  const ruta = useRoute()
  switch (ruta.name) {
    case 'inicio': return <Inicio />
    case 'vuelos': return <Vuelos />
    case 'detalle': return <Detalle flightId={ruta.flightId} />
    case 'cerrar': return <CerrarVuelo />
    case 'planificar': return <Planificar />
    case 'operar': return <Operar />
    case 'ajustes': return <Ajustes />
    case 'ajustesPiloto': return <MisDatos />
    case 'ajustesGlobos': return <Globos />
    case 'ajustesCampos': return <Campos />
    case 'ajustesPersonas': return <Personas />
    case 'ajustesCopia': return <Copia />
  }
}

/**
 * Barra de version nueva.
 *
 * Va por encima de la ruta y no dentro de una pantalla, porque puede aparecer
 * estes donde estes. Antes de recargar se vacia la cola de guardado, que si no
 * se pierde el ultimo cambio.
 */
function BarraVersion({ onAplicar }: { onAplicar: () => void }) {
  return (
    <div style="
      display: flex; align-items: center; gap: 12px; flex-shrink: 0;
      padding: calc(10px + env(safe-area-inset-top)) 20px 10px 20px;
      background: var(--surface); border-bottom: 1px solid var(--border);
    ">
      <span class="lbl muted" style="flex-grow: 1;">Hay una version nueva de la app</span>
      <button class="linkish" onClick={onAplicar}>Actualizar</button>
    </div>
  )
}

function Contenido() {
  const { arranque, flush } = useStore()
  const [hayVersionNueva, setHayVersionNueva] = useState(false)

  useEffect(() => {
    vigilarVersiones(() => setHayVersionNueva(true))
    void pedirAlmacenamientoPersistente()
  }, [])

  if (arranque === 'cargando') {
    return <p class="dim" style="padding: 40px 20px;">Cargando el cuaderno...</p>
  }

  const pantalla = arranque === 'sin_documento' ? <PrimerUso /> : <Ruta />

  if (!hayVersionNueva) return pantalla

  return (
    <div style="display: flex; flex-direction: column; height: 100dvh; overflow: hidden;">
      <BarraVersion
        onAplicar={() => {
          void flush().then(() => aplicarVersionNueva())
        }}
      />
      <div style="flex-grow: 1; min-height: 0;">{pantalla}</div>
    </div>
  )
}

export function App() {
  return <StoreProvider><Contenido /></StoreProvider>
}

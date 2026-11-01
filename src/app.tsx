// src/app.tsx
import { useEffect, useState } from 'preact/hooks'
import { PrimerUso } from './ui/screens/PrimerUso'
import { CerrarVuelo } from './ui/screens/CerrarVuelo'
import { ChecklistScreen } from './ui/screens/Checklist'
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
import { aparell } from './ui/aparell'
import { aplicarVersionNueva, pedirAlmacenamientoPersistente, vigilarVersiones } from './ui/install'
import { hrefOf, useRoute } from './ui/router'
import { StoreProvider, useStore } from './ui/state'
import { tempsVol } from './ui/vol/presentacio'
import { Vol } from './ui/vol/Vol'
import { useVol, VolProvider } from './ui/vol/VolProvider'

function Ruta() {
  const ruta = useRoute()
  switch (ruta.name) {
    case 'inicio': return <Inicio />
    case 'vuelos': return <Vuelos />
    case 'detalle': return <Detalle flightId={ruta.flightId} />
    case 'cerrar': return <CerrarVuelo />
    case 'planificar': return <Planificar />
    case 'operar': return <Operar />
    case 'checklist': return <ChecklistScreen id={ruta.id} />
    case 'ajustes': return <Ajustes />
    case 'ajustesPiloto': return <MisDatos />
    case 'ajustesGlobos': return <Globos />
    case 'ajustesCampos': return <Campos />
    case 'ajustesPersonas': return <Personas />
    case 'ajustesCopia': return <Copia />
    // En el telefono la ruta no existe: un enlace viejo lleva a Inicio (spec 10/10 §7).
    case 'vol': return aparell() === 'tauleta' ? <Vol /> : <Inicio />
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

/**
 * Barra de vuelo en marcha, fuera de la pantalla de vuelo: el GPS sigue
 * grabando, y desde aqui se vuelve (maqueta TauletaVolMes, «Sortir a l'app»).
 */
function BarraVol({ inici }: { inici: number }) {
  const [ara, setAra] = useState(Date.now())
  useEffect(() => {
    const r = setInterval(() => setAra(Date.now()), 30_000)
    return () => clearInterval(r)
  }, [])
  return (
    <a
      href={hrefOf({ name: 'vol' })}
      style="
        display: flex; align-items: center; gap: 12px; flex-shrink: 0; text-decoration: none;
        padding: calc(10px + env(safe-area-inset-top)) 20px 10px 20px;
        background: var(--nav-bg); border-bottom: 1px solid var(--border); color: var(--text);
      "
    >
      <span class="lbl" style="flex-grow: 1;">
        Vol en marxa · <span class="num">{tempsVol(ara - inici)}</span>
      </span>
      <span style="color: var(--nav); font-weight: 600;">Tornar al vol</span>
    </a>
  )
}

function Contenido() {
  const { arranque, flush } = useStore()
  const { sessio } = useVol()
  const ruta = useRoute()
  const [hayVersionNueva, setHayVersionNueva] = useState(false)

  useEffect(() => {
    vigilarVersiones(() => setHayVersionNueva(true))
    void pedirAlmacenamientoPersistente()
  }, [])

  if (arranque === 'cargando') {
    return <p class="dim" style="padding: 40px 20px;">Cargando el cuaderno...</p>
  }

  const pantalla = arranque === 'sin_documento' ? <PrimerUso /> : <Ruta />
  const volFora = sessio !== null && ruta.name !== 'vol'

  if (!hayVersionNueva && !volFora) return pantalla

  return (
    <div style="display: flex; flex-direction: column; height: 100dvh; overflow: hidden;">
      {hayVersionNueva && (
        <BarraVersion
          onAplicar={() => {
            void flush().then(() => aplicarVersionNueva())
          }}
        />
      )}
      {volFora && <BarraVol inici={sessio.enlairatA ?? sessio.iniciadaA} />}
      <div style="flex-grow: 1; min-height: 0;">{pantalla}</div>
    </div>
  )
}

export function App() {
  return <StoreProvider><VolProvider><Contenido /></VolProvider></StoreProvider>
}

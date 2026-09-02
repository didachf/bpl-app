// src/app.tsx
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

function Contenido() {
  const { arranque } = useStore()
  if (arranque === 'cargando') {
    return <p class="dim" style="padding: 40px 20px;">Cargando el cuaderno...</p>
  }
  if (arranque === 'sin_documento') return <PrimerUso />
  return <Ruta />
}

export function App() {
  return <StoreProvider><Contenido /></StoreProvider>
}

import { StoreProvider, documentoNuevo, useStore } from './ui/state'

function Contenido() {
  const { arranque, doc, replace } = useStore()

  if (arranque === 'cargando') return <p style="padding: 20px;">Cargando el cuaderno...</p>

  if (arranque === 'sin_documento') {
    return (
      <div style="padding: 20px;">
        <h1>Logbook BPL</h1>
        <p class="muted">No hay ningun cuaderno en este telefono.</p>
        <button class="primary" onClick={() => replace(documentoNuevo())}>Empezar de cero</button>
      </div>
    )
  }

  return (
    <div style="padding: 20px;">
      <h1>Logbook BPL</h1>
      <p class="num">{doc?.flights.length} vuelos, {doc?.balloons.length} globos</p>
    </div>
  )
}

export function App() {
  return <StoreProvider><Contenido /></StoreProvider>
}

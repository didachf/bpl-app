import { Sheet } from '../components/Screen'

export function Detalle({ flightId }: { flightId: string }) {
  return <Sheet title="Vuelo"><p class="dim" style="padding: 0 20px;">{flightId}</p></Sheet>
}

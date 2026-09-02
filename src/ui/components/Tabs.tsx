// src/ui/components/Tabs.tsx
import { hrefOf, type Route } from '../router'
import { Icon, type IconName } from './Icon'

export type TabName = 'inicio' | 'vuelos' | 'planificar' | 'operar' | 'ajustes'

const PESTANAS: { name: TabName; label: string; icon: IconName; route: Route }[] = [
  { name: 'inicio', label: 'Inicio', icon: 'inicio', route: { name: 'inicio' } },
  { name: 'vuelos', label: 'Vuelos', icon: 'lista', route: { name: 'vuelos' } },
  { name: 'planificar', label: 'Planificar', icon: 'viento', route: { name: 'planificar' } },
  { name: 'operar', label: 'Operar', icon: 'checklist', route: { name: 'operar' } },
  { name: 'ajustes', label: 'Ajustes', icon: 'ajustes', route: { name: 'ajustes' } },
]

/**
 * Las cinco pestañas.
 *
 * Enlaces de verdad y no botones: asi el pulsado largo ofrece copiar el enlace,
 * y el hash queda en el historial para que el boton de atras de Android
 * funcione, que ahi es un boton del sistema y no un gesto opcional.
 *
 * El relleno inferior es por si el navegador declara un `safe-area-inset`. En
 * una PWA instalada de Android la barra de navegacion queda fuera del viewport
 * y el inset vale cero, asi que no estorba, pero cubre el caso de pestaña
 * normal y el de pantalla con recorte.
 */
export function Tabs({ actual }: { actual: TabName }) {
  return (
    <nav style="
      display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
      border-top: 1px solid var(--border); flex-shrink: 0;
      padding-bottom: env(safe-area-inset-bottom);
    ">
      {PESTANAS.map(p => (
        <a
          key={p.name}
          href={hrefOf(p.route)}
          aria-current={p.name === actual ? 'page' : undefined}
          style={`
            height: 64px; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 3px;
            text-decoration: none;
            color: ${p.name === actual ? 'var(--text)' : 'var(--dim)'};
          `}
        >
          <Icon name={p.icon} size={20} width={2} />
          <span style={`font-size: 10px; font-weight: ${p.name === actual ? 500 : 400};`}>
            {p.label}
          </span>
        </a>
      ))}
    </nav>
  )
}

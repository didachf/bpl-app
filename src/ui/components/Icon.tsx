// src/ui/components/Icon.tsx
// Los SVG de las maquetas, en un solo sitio.
//
// Trazo y no relleno, 24x24, `currentColor`: asi un icono hereda el color del
// texto que lo acompaña y el tema claro funciona sin tocar nada.

export type IconName =
  | 'check' | 'alerta' | 'aviso' | 'reloj' | 'pin' | 'mas' | 'menos'
  | 'derecha' | 'izquierda' | 'abajo' | 'arriba'
  | 'inicio' | 'lista' | 'viento' | 'checklist' | 'ajustes'
  | 'globo' | 'persona' | 'lapiz' | 'papelera' | 'nube'

const TRAZOS: Record<IconName, string> = {
  check: 'M20 6 9 17l-5-5',
  alerta: 'M12 3 2 20h20L12 3Z M12 10v4 M12 17.5v.01',
  aviso: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8v5 M12 16.5v.01',
  reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2',
  pin: 'M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  mas: 'M12 5v14 M5 12h14',
  menos: 'M5 12h14',
  derecha: 'm9 18 6-6-6-6',
  izquierda: 'm15 18-6-6 6-6',
  abajo: 'm6 9 6 6 6-6',
  arriba: 'm18 15-6-6-6 6',
  inicio: 'm3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  lista: 'M4 6h16 M4 12h16 M4 18h10',
  viento: 'M3 14c2-3 5-3 7 0s5 3 7 0 3-3 4-1 M12 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  checklist: 'M9 11l2 2 4-4 M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  ajustes: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M4 12a8 8 0 0 1 .3-2.2l-2-1.6 2-3.4 2.4 1a8 8 0 0 1 1.9-1.1L9 2h6l.4 2.7a8 8 0 0 1 1.9 1.1l2.4-1 2 3.4-2 1.6a8 8 0 0 1 0 4.4l2 1.6-2 3.4-2.4-1a8 8 0 0 1-1.9 1.1L15 22H9l-.4-2.7a8 8 0 0 1-1.9-1.1l-2.4 1-2-3.4 2-1.6A8 8 0 0 1 4 12Z',
  globo: 'M12 3a6 6 0 0 1 6 6c0 4-6 9-6 9S6 13 6 9a6 6 0 0 1 6-6Z M10 18h4l-.7 3h-2.6Z',
  persona: 'M9 4.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z M3 20a6 6 0 0 1 12 0 M16 6.5a3 3 0 0 1 0 5.5',
  lapiz: 'M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16Z',
  papelera: 'M4 7h16 M9 7V5h6v2 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  nube: 'M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.5 1.7A3.5 3.5 0 0 1 17.5 18Z',
}

export interface IconProps {
  name: IconName
  size?: number
  color?: string
  /** Grosor del trazo. Los iconos pequeños necesitan mas para no desaparecer. */
  width?: number
}

export function Icon({ name, size = 16, color = 'currentColor', width = 2.2 }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      stroke-width={width} stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true" style="flex-shrink: 0;"
    >
      <path d={TRAZOS[name]} />
    </svg>
  )
}

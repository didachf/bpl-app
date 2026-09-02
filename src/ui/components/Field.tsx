// src/ui/components/Field.tsx
// Campos de formulario. Sin libreria: son cinco y no cambian.
//
// Ningun componente de aqui llama a dangerouslySetInnerHTML ni a nada
// equivalente. El escape de Preact es la unica barrera entre una nota de vuelo
// y el token de GitHub, que viven en el mismo origen. Ver el spec §7.
import type { ComponentChildren } from 'preact'
import { Icon } from './Icon'

/** Envoltorio de un campo editable: etiqueta encima, control debajo, pista opcional. */
export function Labeled(
  { label, hint, children }: { label: string; hint?: string; children: ComponentChildren },
) {
  return (
    <div style="margin-bottom: 18px;">
      <div class="cap" style="margin-bottom: 7px;">{label}</div>
      {children}
      {hint !== undefined && (
        <div class="lbl dim" style="margin-top: 6px; line-height: 1.4;">{hint}</div>
      )}
    </div>
  )
}

export function TextField(
  { label, value, onChange, hint, placeholder, type = 'text' }: {
    label: string
    value: string
    onChange: (v: string) => void
    hint?: string
    placeholder?: string
    /** `date` y `time` abren los selectores nativos de Android, mejores que cualquiera propio. */
    type?: 'text' | 'date' | 'time' | 'number'
  },
) {
  return (
    <Labeled label={label} hint={hint}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onInput={e => onChange((e.currentTarget as HTMLInputElement).value)}
      />
    </Labeled>
  )
}

export function TextArea(
  { label, value, onChange, hint, placeholder }: {
    label: string; value: string; onChange: (v: string) => void
    hint?: string; placeholder?: string
  },
) {
  return (
    <Labeled label={label} hint={hint}>
      <textarea
        value={value}
        placeholder={placeholder}
        onInput={e => onChange((e.currentTarget as HTMLTextAreaElement).value)}
      />
    </Labeled>
  )
}

/**
 * Campo numerico que admite quedarse vacio.
 *
 * `null` y `0` son cosas distintas en este documento: altitud maxima null es
 * "no lo apunte", altitud 0 es el nivel del mar. Un `<input type=number>` a
 * secas los confunde.
 */
export function NumberField(
  { label, value, onChange, hint, unit, step }: {
    label: string; value: number | null; onChange: (v: number | null) => void
    hint?: string; unit?: string; step?: string
  },
) {
  return (
    <Labeled label={label} hint={hint}>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input
          type="number"
          step={step}
          value={value === null ? '' : String(value)}
          onInput={e => {
            const s = (e.currentTarget as HTMLInputElement).value.trim()
            if (s === '') { onChange(null); return }
            const n = Number(s)
            onChange(Number.isFinite(n) ? n : null)
          }}
        />
        {unit !== undefined && <span class="dim" style="flex-shrink: 0;">{unit}</span>}
      </div>
    </Labeled>
  )
}

export interface Opcion { value: string; label: string }

export function SelectField(
  { label, value, options, onChange, hint, empty }: {
    label: string
    value: string | null
    options: Opcion[]
    onChange: (v: string | null) => void
    hint?: string
    /** Texto de la opcion vacia. Si no se pasa, el campo es obligatorio y no la lleva. */
    empty?: string
  },
) {
  return (
    <Labeled label={label} hint={hint}>
      <select
        value={value ?? ''}
        onChange={e => {
          const v = (e.currentTarget as HTMLSelectElement).value
          onChange(v === '' ? null : v)
        }}
      >
        {empty !== undefined && <option value="">{empty}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Labeled>
  )
}

/**
 * Contador de mas y menos, con la cifra grande en medio.
 *
 * Botones de 52 px porque se usa con el globo plegandose y las manos frias.
 * Es el patron de la maqueta CierreRapido.
 */
export function Stepper(
  { label, value, onChange, min = 0, hint }: {
    label: string; value: number; onChange: (v: number) => void; min?: number; hint?: string
  },
) {
  const boton = `
    width: 52px; height: 52px; border-radius: 8px; border: 1px solid var(--border);
    background: none; color: var(--text); display: flex; align-items: center;
    justify-content: center; cursor: pointer; flex-shrink: 0;
  `
  return (
    <Labeled label={label} hint={hint}>
      <div style="display: flex; align-items: center; gap: 14px;">
        <button
          type="button" style={boton} aria-label={`Restar a ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Icon name="menos" size={22} width={2.4} />
        </button>
        <div class="num" style="font-size: 42px; font-weight: 500; flex-grow: 1; text-align: center;">
          {value}
        </div>
        <button
          type="button" style={boton} aria-label={`Sumar a ${label}`}
          onClick={() => onChange(value + 1)}
        >
          <Icon name="mas" size={22} width={2.4} />
        </button>
      </div>
    </Labeled>
  )
}

export function Toggle(
  { label, checked, onChange, hint }: {
    label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string
  },
) {
  return (
    <label style="display: flex; gap: 12px; align-items: flex-start; padding: 11px 0; cursor: pointer;">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange((e.currentTarget as HTMLInputElement).checked)}
        style="width: 22px; height: 22px; flex-shrink: 0; margin: 0; accent-color: var(--accent);"
      />
      <span style="flex-grow: 1;">
        <span style="font-size: 15px;">{label}</span>
        {hint !== undefined && (
          <span class="lbl dim" style="display: block; margin-top: 3px; line-height: 1.4;">{hint}</span>
        )}
      </span>
    </label>
  )
}

/** Fila pulsable de una lista: icono, texto, contador y flecha. */
export function NavRow(
  { icon, label, value, href, onClick }: {
    icon?: ComponentChildren; label: string; value?: string
    href?: string; onClick?: () => void
  },
) {
  const contenido = (
    <>
      {icon}
      <span style="flex-grow: 1; font-size: 16px; min-width: 0;">{label}</span>
      {value !== undefined && <span class="num dim" style="font-size: 15px;">{value}</span>}
      <Icon name="derecha" size={16} color="var(--dim)" width={2.4} />
    </>
  )
  const estilo = `
    display: flex; align-items: center; gap: 11px; width: 100%;
    padding: 13px 0; border: none; border-bottom: 1px solid var(--border);
    background: none; color: var(--text); font: inherit; text-align: left;
    text-decoration: none; cursor: pointer;
  `
  if (href !== undefined) return <a href={href} style={estilo}>{contenido}</a>
  return <button type="button" style={estilo} onClick={onClick}>{contenido}</button>
}

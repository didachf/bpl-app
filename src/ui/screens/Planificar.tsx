// src/ui/screens/Planificar.tsx
// El viento en el punto que elijas, nivel a nivel y hora a hora.
//
// Las cinco reglas de esta pantalla, del spec §6:
//
//  1. Nunca la palabra "probabilidad", ni un porcentaje, ni una cuenta de
//     modelos. Seis modelos operativos son un "poor man's ensemble" sin
//     calibrar: lo que se puede afirmar es DESACUERDO, y como cota INFERIOR de
//     la incertidumbre real.
//  2. Ningun limite de viento se presenta como reglamentario. Part-BFCL no
//     tiene ninguno.
//  3. El limite del manual no se cablea: viene del globo, porque cambia por
//     envolvente.
//  4. Una ausencia se enseña, no se tapa. ECMWF no cubre 900 hPa.
//  5. El aviso del globo piloto no se quita nunca.
import { useEffect, useState } from 'preact/hooks'
import { Icon } from '../components/Icon'
import { Mapa, type Punto } from '../components/Mapa'
import { Notice } from '../components/Notice'
import { Rosa, rumboCorto } from '../components/Rosa'
import { Screen } from '../components/Screen'
import { NIVEL_SUPERFICIE, modelLabel } from '../../services/levels'
import { fetchWindProfile, type RawProfile } from '../../services/openmeteo'
import { msToKt } from '../../services/uv'
import { buildRows, nivelPorClave, type CeldaNivel } from '../../services/wind'
import { antiguedadMin, claveDe, esVieja, guardar, leer } from '../../services/windCache'
import { formatTime } from '../format'
import { juzgarViento, limiteManual, PRACTICA_FAA_KT, type Veredicto } from '../windLimits'
import { balloonById } from '../select'
import { useDoc } from '../state'
import { hoy } from '../today'
import { addDays } from '../../domain/dates'

/** La ventana de la mañana: el FAA situa el vuelo en las dos primeras horas tras el orto. */
const HORA_INICIO_UTC = 4
const HORAS = 5

function dosCifras(n: number): string {
  return String(n).padStart(2, '0')
}

function ventana(fecha: string): { startHour: string; endHour: string } {
  // Se pide de 04:00 a 09:00 UTC, que en horario de verano peninsular son las
  // 06:00 a 11:00 locales: cubre de sobra la ventana de la mañana.
  return {
    startHour: `${fecha}T${dosCifras(HORA_INICIO_UTC)}:00`,
    endHour: `${fecha}T${dosCifras(HORA_INICIO_UTC + HORAS)}:00`,
  }
}

/**
 * Mañana, en fecha LOCAL.
 *
 * `new Date().toISOString().slice(0,10)` daria la fecha UTC, y a partir de las
 * 22:00 en horario de verano peninsular eso ya es el dia siguiente: pediria el
 * viento de pasado mañana sin avisar.
 */
function manana(): string {
  return addDays(hoy(), 1)
}

const COLOR_VEREDICTO: Record<Veredicto, string> = {
  sin_limite: 'var(--dim)',
  dentro: 'var(--ok)',
  sobre_personal: 'var(--warn)',
  sobre_manual: 'var(--danger)',
}

const TEXTO_DESACUERDO: Record<string, string> = {
  un_solo_modelo: 'un solo modelo',
  juntos: 'modelos juntos',
  dispersos: 'modelos dispersos',
  dispares: 'modelos dispares',
}

function Nivel({ celda }: { celda: CeldaNivel }) {
  const s = celda.spread
  const alto = s !== null && (s.nivel === 'dispares' || s.nivel === 'dispersos')

  return (
    <div style="padding: 11px 0; border-bottom: 1px solid var(--border);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <Rosa dir={celda.media?.dir ?? null} arco={s?.arco ?? null} />

        <div style="flex-grow: 1; min-width: 0;">
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span class="num" style="font-size: 15px;">{celda.level.label}</span>
            {celda.alturaAmslM !== null && (
              <span class="num dim" style="font-size: 12px;">{celda.alturaAmslM} m sobre el mar</span>
            )}
          </div>
          {celda.banda === null ? (
            <div class="dim" style="font-size: 13px; margin-top: 3px;">Sin dato de ningun modelo</div>
          ) : (
            <div class="num" style="font-size: 15px; margin-top: 3px;">
              {msToKt(celda.banda.min).toFixed(0)} a {msToKt(celda.banda.max).toFixed(0)} kt
              {celda.media !== null && (
                <span class="muted">
                  {' · '}del {rumboCorto(celda.media.dir)}, {Math.round(celda.media.dir)}°
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {s !== null && (
        <div
          class="lbl"
          style={`margin-top: 6px; color: ${alto ? 'var(--warn)' : 'var(--dim)'};`}
        >
          Abanico de {Math.round(s.arco.spanDeg)}°, del {Math.round(s.arco.from)}° al{' '}
          {Math.round(s.arco.to)}°. {TEXTO_DESACUERDO[s.nivel]}.
        </div>
      )}

      {celda.noCubren.length > 0 && (
        <div class="lbl dim" style="margin-top: 4px;">
          No cubren este nivel: {celda.noCubren.map(modelLabel).join(', ')}.
        </div>
      )}
      {celda.sinDato.length > 0 && (
        <div class="lbl dim" style="margin-top: 3px;">
          Sin dato a esta hora: {celda.sinDato.map(modelLabel).join(', ')}.
        </div>
      )}
    </div>
  )
}

export function Planificar() {
  const doc = useDoc()
  const [punto, setPunto] = useState<Punto | null>(() => {
    const s = doc.sites[0]
    return s === undefined ? null : { lat: s.lat, lon: s.lon }
  })
  const [fecha, setFecha] = useState(manana())
  const [perfil, setPerfil] = useState<RawProfile | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [iHora, setIHora] = useState(0)
  const [balloonId, setBalloonId] = useState(doc.balloons[0]?.id ?? '')

  // Al cambiar de punto o de fecha, primero lo que haya en cache, para que la
  // pantalla no se quede en blanco, y despues se pide.
  useEffect(() => {
    if (punto === null) return
    let vivo = true
    const { startHour, endHour } = ventana(fecha)
    const clave = claveDe(punto.lat, punto.lon, startHour)

    void (async () => {
      const cacheado = await leer(clave)
      if (vivo && cacheado !== null) { setPerfil(cacheado); setIHora(0) }

      setCargando(true)
      setError(null)
      try {
        const p = await fetchWindProfile({ lat: punto.lat, lon: punto.lon, startHour, endHour })
        if (!vivo) return
        await guardar(clave, p)
        setPerfil(p)
        setIHora(0)
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (vivo) setCargando(false)
      }
    })()

    return () => { vivo = false }
  }, [punto?.lat, punto?.lon, fecha])

  const filas = perfil === null ? [] : buildRows(perfil)
  const fila = filas[Math.min(iHora, filas.length - 1)]
  const globo = balloonById(doc, balloonId)

  const superficie = fila === undefined ? null : nivelPorClave(fila, NIVEL_SUPERFICIE)
  // Se juzga contra la punta ALTA de la banda, no contra la media: si un modelo
  // da 16 kt y otro 10, lo que hay que saber es que puede haber 16.
  const limite = limiteManual(globo)
  const juicio = superficie?.banda == null
    ? null
    : juzgarViento(superficie.banda.max, limite.kt, doc.pilot.personalWindLimitKt)

  return (
    <Screen title="Planificar" tab="planificar">
      <Mapa
        punto={punto}
        sitios={doc.sites}
        onElegir={p => setPunto(p)}
      />

      <div style="padding: 12px 20px 0 20px;">
        <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px;">
          <div class="num" style="font-size: 16px;">
            {punto === null ? 'Toca el mapa' : `${punto.lat.toFixed(4)}, ${punto.lon.toFixed(4)}`}
          </div>
          <input
            type="date"
            value={fecha}
            onInput={e => setFecha((e.currentTarget as HTMLInputElement).value)}
            style="width: auto; padding: 6px 10px; font-size: 14px;"
          />
        </div>
        <div class="lbl dim" style="margin-top: 3px;">
          Punto libre. El sitio de despegue se decide cada dia segun el viento.
        </div>
      </div>

      {cargando && perfil === null && (
        <p class="dim" style="padding: 20px;">Pidiendo el viento a los seis modelos...</p>
      )}

      {error !== null && (
        <div style="padding: 14px 20px 0 20px;">
          <Notice tone="warn" title="No se ha podido pedir el viento">{error}</Notice>
        </div>
      )}

      {perfil !== null && esVieja(perfil) && (
        <div style="padding: 14px 20px 0 20px;">
          <Notice tone="warn" title="Este pronostico es viejo">
            Se bajo hace {Math.round(antiguedadMin(perfil) / 60)} h. Los modelos se
            actualizan entre cada 3 y cada 12 h, asi que ya hay pasada nueva.
          </Notice>
        </div>
      )}

      {filas.length > 0 && (
        <>
          <div style="display: flex; gap: 8px; padding: 14px 20px 0 20px; overflow-x: auto;">
            {filas.map((f, i) => (
              <button
                key={f.timeIso}
                class="chip num"
                aria-pressed={i === iHora}
                onClick={() => setIHora(i)}
              >
                {formatTime(f.timeIso)}
              </button>
            ))}
          </div>

          {juicio !== null && (
            <div style="padding: 16px 20px 0 20px;">
              <div class="card">
                <div style="display: flex; align-items: center; gap: 9px;">
                  <Icon
                    name={juicio.veredicto === 'dentro' ? 'check' : 'alerta'}
                    size={16}
                    color={COLOR_VEREDICTO[juicio.veredicto]}
                    width={2.4}
                  />
                  <span
                    class="num"
                    style={`font-size: 15px; font-weight: 500; color: ${COLOR_VEREDICTO[juicio.veredicto]};`}
                  >
                    {juicio.vientoKt.toFixed(0)} kt en superficie
                  </span>
                  <span style="flex-grow: 1;"></span>
                  <select
                    value={balloonId}
                    onChange={e => setBalloonId((e.currentTarget as HTMLSelectElement).value)}
                    style="width: auto; padding: 5px 8px; font-size: 13px;"
                  >
                    <option value="">Sin globo</option>
                    {doc.balloons.map(b => (
                      <option key={b.id} value={b.id}>{b.registration || 'Sin matricula'}</option>
                    ))}
                  </select>
                </div>
                <div class="muted" style="font-size: 13px; margin-top: 7px; line-height: 1.5;">
                  {juicio.mensaje}
                </div>
                <div class="lbl dim" style="margin-top: 7px; line-height: 1.5;">
                  {limite.fuente === 'fm04'
                    ? `Comparado contra ${limite.kt} kt del FM04 §2.2 de Ultramagic, que es el `
                      + 'valor por defecto. Si este globo lleva otra envolvente, ponle su cifra '
                      + 'en Ajustes, globos.'
                    : `Comparado contra los ${limite.kt} kt que tiene puesto este globo.`}
                  {' '}La practica que cita el FAA esta en menos de {PRACTICA_FAA_KT} kt, muy por
                  debajo del limite de cualquier manual. Y el manual prohibe volar en
                  actividad termica, que esta app no mira.
                </div>
              </div>
            </div>
          )}

          <div style="padding: 16px 20px 0 20px;">
            <div class="cap">Viento por nivel, de abajo arriba</div>
            <div style="margin-top: 4px;">
              {fila.niveles.map(c => <Nivel key={c.level.key} celda={c} />)}
            </div>
          </div>

          <div style="padding: 14px 20px 0 20px;">
            <Notice tone="info" title="Que significa el abanico">
              Es lo que se separan los seis modelos entre si.{' '}
              <strong>No es una probabilidad</strong>: un conjunto de seis modelos
              operativos no esta calibrado. Es una cota inferior de la incertidumbre, porque
              no ve el error que los seis comparten. Los cortes de juntos, dispersos y
              dispares son convencion de esta app, no de la literatura.
            </Notice>
          </div>
        </>
      )}

      <div style="padding: 16px 20px 24px 20px;">
        <Notice tone="warn" title="Esto no sustituye al globo piloto">
          El globo piloto da viento real, en el sitio y en el momento, que ninguna prevision
          puede dar. El propio FAA dice que las previsiones son un punto de partida y no el
          final de la planificacion.
        </Notice>
        <div class="lbl dim" style="margin-top: 12px; line-height: 1.6;">
          Datos meteorologicos de{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>,
          con licencia CC BY 4.0. Los datos del Met Office britanico, uno de los seis modelos,
          son CC BY-SA 4.0. Mapa &copy; colaboradores de OpenStreetMap.
        </div>
      </div>
    </Screen>
  )
}

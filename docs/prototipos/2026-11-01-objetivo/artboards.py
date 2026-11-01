# Genera las seis maquetas de la fase 2 (01/11/2026) a partir de maquetas.json, con el estilo de
# design/pantalla-de-vol/Main.dc.html, del que copia la traza, la zona A, los botones y la columna
# Mapa/Vent. Argumentos: carpeta del repo, carpeta de salida (se escribe <salida>/<nombre>.dc.html).
import json
import math
import sys
from pathlib import Path

repo, salida = Path(sys.argv[1]), Path(sys.argv[2])
d = json.loads((repo / "docs/prototipos/2026-11-01-objetivo/maquetas.json").read_text())
main = (repo / "design/pantalla-de-vol/Main.dc.html").read_text()
ORTO = "/_blob/81fc07a526d1131ee13d8a04f183945b"
CIAN, VERDE, AMBAR = "#35d0ff", "#3ad16b", "#f2a33a"
BALLOON = (746.1, 630.9)

# Piezas de Main, tal cual
lineas = main.split("\n")
capas_base = "\n".join(
    l for l in lineas[24:34] if l.strip()
)  # zona A, su nombre, traza y despegue
ini = main.index(
    '<div style="position: absolute; right: 16px; top: 16px; display: flex; flex-direction: column; gap: 8px;">'
)
fin = main.index('    <div style="position: absolute; left: 16px; bottom: 14px;')
botones = main[ini:fin].rstrip()
ini = main.index(
    '<div style="width: 116px; padding: 12px; display: flex; flex-direction: column; gap: 10px;">'
)
columna_y_cierre = main[ini : main.index("</x-dc>")]

CABEZA = """<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<title>{titulo}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;display=swap">
<style>
body{{margin:0}}
a{{color:#5598e7}}a:hover{{color:#86b6ef}}
.num{{font-family:'IBM Plex Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums}}
.lab{{font-size:{lab}px;letter-spacing:.08em;text-transform:uppercase;color:#898781}}
.halo{{paint-order:stroke;stroke:#0b0b0b;stroke-width:4px;stroke-linejoin:round}}
input{{font:inherit}}
</style>
</helmet>
<div style="width: {w}px; height: {h}px; background: #1a1a19; color: #ffffff; font-family: 'IBM Plex Sans', system-ui, sans-serif; position: relative; overflow: hidden;">
"""


def pie(w, h):
    return f"""</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{}};
  }}
}}
</script>
</body>
</html>
"""


def pts(ps):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in ps)


def hora(min_desde_0834):
    t = 8 * 60 + 34 + min_desde_0834
    return f"{t // 60:02d}:{t % 60:02d}"


def corta(orden):
    # La orden de la franja, sin el rango del modo ni el viento: «Puja ràpid fins a 1 750 ft».
    o = orden.replace("Ara, ", "")
    o = o[0].upper() + o[1:]
    for a, b in [(" (2,5 a 3 m/s)", ""), (" (3 a 5 m/s)", ""), (" (0 a 1 m/s)", "")]:
        o = o.replace(a, b)
    return o.split(", cap a ")[0].rstrip(".")


def capas_plan(s):
    """Zona, camino del plan hasta el paso, marcas cada 5 min, punto y el mas cercano."""
    terra = s["rejilla"]["altM"][0] if s["rejilla"]["etiqueta"][0] == "terra" else None
    cam = s["camino"][: s["minuto"]] + [s["masCerca"] + [None]]
    out = [
        '      <g opacity="0.26">'
        + "".join(
            f'<polygon points="{pts(p)}" fill="{VERDE}"></polygon>' for p in s["zona"]
        )
        + "</g>"
    ]
    # tramos a ras (terra) y en altura
    trozos, actual, a_ras = [], [], None
    for x, y, z in cam:
        r = z is not None and terra is not None and abs(z - terra) < 1
        if z is None:
            r = a_ras
        if a_ras is not None and r != a_ras:
            trozos.append((a_ras, actual))
            actual = [actual[-1]]
        actual.append((x, y))
        a_ras = r
    trozos.append((a_ras, actual))
    for r, ps in trozos:
        if len(ps) < 2:
            continue
        out.append(
            f'      <polyline points="{pts(ps)}" fill="none" stroke="#0b0b0b" stroke-opacity="0.55" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></polyline>'
        )
        guion = ' stroke-dasharray="7 6"' if r else ""
        out.append(
            f'      <polyline points="{pts(ps)}" fill="none" stroke="{VERDE if r else CIAN}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"{guion}></polyline>'
        )
    for k in range(5, s["minuto"], 5):
        x, y, _ = s["camino"][k]
        out.append(
            f'      <circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="#0b0b0b" stroke="{CIAN}" stroke-width="2"></circle>'
        )
        out.append(
            f'      <text x="{x:.1f}" y="{y + 3.9:.1f}" fill="{CIAN}" font-family="IBM Plex Mono" font-size="10" font-weight="600" text-anchor="middle">{k}</text>'
        )
    px, py = s["punto"]
    mx, my = s["masCerca"]
    if s["estado"] != "llega":
        out.append(
            f'      <line x1="{mx:.1f}" y1="{my:.1f}" x2="{px:.1f}" y2="{py:.1f}" stroke="#ffffff" stroke-width="2" stroke-dasharray="3 4"></line>'
        )
        out.append(
            f'      <circle cx="{mx:.1f}" cy="{my:.1f}" r="7" fill="#1a1a19" stroke="#ffffff" stroke-width="2.5"></circle>'
        )
    out.append(
        f'      <circle cx="{px:.1f}" cy="{py:.1f}" r="13" fill="none" stroke="#0b0b0b" stroke-opacity="0.6" stroke-width="6"></circle>'
    )
    out.append(
        f'      <circle cx="{px:.1f}" cy="{py:.1f}" r="13" fill="none" stroke="{CIAN}" stroke-width="3"></circle>'
    )
    out.append(
        f'      <circle cx="{px:.1f}" cy="{py:.1f}" r="4" fill="{CIAN}"></circle>'
    )
    return "\n".join(out)


GLOBO = f"""      <g transform="translate({BALLOON[0]} {BALLOON[1]}) rotate(61)">
        <circle r="20" fill="#ffffff" fill-opacity="0.18"></circle>
        <path d="M0,-15 L10,11 L0,5 L-10,11 Z" fill="#ffffff" stroke="#0b0b0b" stroke-width="2" stroke-linejoin="round"></path>
      </g>"""

AVISO_ICONO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3z"></path><path d="M12 10v4M12 17.5v.5"></path></svg>'


def franja(wp, chip, rumbo, dist, eta, gran, despues, resultado):
    return f"""  <div style="position: absolute; left: 0; top: 600px; width: 1280px; height: 200px; display: flex; border-top: 1px solid #2c2c2a;">
    <div style="width: 190px; padding: 16px 18px; border-right: 1px solid #2c2c2a; display: flex; flex-direction: column; gap: 4px;">
      <div class="lab">Altitud</div>
      <div style="display: flex; align-items: baseline; gap: 6px;"><span class="num" style="font-size: 50px; font-weight: 500; line-height: 1.05;">1 540</span><span class="num" style="font-size: 18px; color: #c3c2b7;">ft</span></div>
      <div style="font-size: 13px; color: #c3c2b7;">GPS, calibrat a terra</div>
      <div class="num" style="font-size: 13px; color: {AMBAR};">127 ft sobre el terreny</div>
    </div>
    <div style="width: 140px; padding: 16px 18px; border-right: 1px solid #2c2c2a; display: flex; flex-direction: column; gap: 4px;">
      <div class="lab">Vario</div>
      <div class="num" style="font-size: 50px; font-weight: 500; line-height: 1.05;">+0,3</div>
      <div class="num" style="font-size: 13px; color: #c3c2b7;">m/s, GPS</div>
    </div>
    <div style="width: 175px; padding: 16px 18px; border-right: 1px solid #2c2c2a; display: flex; flex-direction: column; gap: 4px;">
      <div class="lab">Rumb i velocitat</div>
      <div class="num" style="font-size: 50px; font-weight: 500; line-height: 1.05;">061°</div>
      <div class="num" style="font-size: 22px;">4,3 <span style="font-size: 15px; color: #c3c2b7;">kt</span></div>
    </div>
    <div style="width: 135px; padding: 16px 18px; border-right: 1px solid #2c2c2a; display: flex; flex-direction: column; gap: 4px;">
      <div class="lab">Temps de vol</div>
      <div class="num" style="font-size: 50px; font-weight: 500; line-height: 1.05;">0:34</div>
      <div class="num" style="font-size: 13px; color: #c3c2b7;">ara 08:34</div>
    </div>
    <div style="width: 220px; padding: 16px 18px; border-right: 1px solid #2c2c2a; display: flex; flex-direction: column; gap: 4px;">
      <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="{CIAN}" stroke-width="2"></circle><circle cx="6" cy="6" r="1.6" fill="{CIAN}"></circle></svg>
        <span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; color: {CIAN};">{wp}</span>
        <span style="font-size: 11px; font-weight: 600; letter-spacing: .06em; color: #1a1a19; background: {CIAN}; border-radius: 4px; padding: 2px 6px;">{chip}</span>
      </div>
      <div class="num" style="font-size: 50px; font-weight: 500; line-height: 1.05;">{rumbo}</div>
      <div class="num" style="font-size: 22px;">{dist}</div>
      <div class="num" style="font-size: 13px; color: #c3c2b7;">{eta}</div>
    </div>
    <div style="flex-grow: 1; min-width: 0; padding: 16px 18px; border-right: 1px solid #2c2c2a; display: flex; flex-direction: column; gap: 6px; background: #1f2a33;">
      <div class="lab" style="color: #8fd8f5;">Ordre</div>
      <div style="font-size: 24px; font-weight: 600; line-height: 1.2;">{gran}</div>
      <div style="font-size: 17px; color: #c3c2b7; line-height: 1.3;">{despues}</div>
      <div style="flex-grow: 1;"></div>
      <div style="font-size: 16px;">{resultado}</div>
    </div>
    {columna_y_cierre}"""


def num_html(txt):
    # Pone en monoespaciada las cifras con unidad de una frase de resultado.
    import re

    return re.sub(
        r"(\d[\d ,]*\s?(?:m|km|ft)\b|\d\d:\d\d)",
        r'<span class="num" style="font-weight: 600;">\1</span>',
        txt,
    )


def mapa_vuelo(nombre, titulo, s, wp, chip, rumbo, dist, eta, zona_txt, punto_txt):
    tramos = s["tramos"]
    n = len(tramos)
    pasos = s["ordenes"][:n]
    resumen = s["ordenes"][n:]
    lista = "\n".join(
        f"""        <li style="display: grid; grid-template-columns: 22px 46px minmax(0, 1fr); gap: 8px; align-items: baseline;"><span class="num" style="color: #898781;">{i + 1}</span><span class="num" style="color: #c3c2b7;">{"ara" if t["inicioMin"] == 0 else hora(t["inicioMin"])}</span><span>{p}</span></li>"""
        for i, (p, t) in enumerate(zip(pasos, tramos))
    )
    res = "\n".join(
        f'        <div style="font-size: 13px; color: {"#ffffff" if j == 0 else "#c3c2b7"};">{num_html(r)}</div>'
        for j, r in enumerate(resumen)
    )
    gran = corta(pasos[0])
    despues = (
        "Després " + corta(pasos[1])[0].lower() + corta(pasos[1])[1:] if n > 1 else ""
    )
    if s["estado"] == "llega":
        resultado = num_html(resumen[0].rstrip("."))
    else:
        resultado = num_html(
            [r for r in resumen if r.startswith("El més a prop")][0].rstrip(".")
        )
        if s["fueraSeguro"]:
            resultado = (
                f'<span style="color: {AMBAR}; font-weight: 600;">No s\'hi arriba.</span> '
                + resultado
            )
    aviso = [a for a in s["avisos"] if a.startswith("Si no fas res")]
    aviso_html = (
        f"""
      <div style="background: rgba(26,26,25,.92); border: 1px solid {AMBAR}; border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: {AMBAR};">{AVISO_ICONO}<span>{num_html(aviso[0].rstrip("."))}</span></div>"""
        if aviso
        else ""
    )
    html = (
        CABEZA.format(titulo=titulo, w=1280, h=800, lab=12)
        + f"""
  <div style="position: absolute; left: 0; top: 0; width: 1280px; height: 600px; overflow: hidden; background: #3a3426;">
    <img src="{ORTO}" alt="Ortofoto del ICGC al voltant de Tàrrega" style="position: absolute; left: 0; top: -300px; width: 1300px; height: 1050px;">
    <svg width="1300" height="1050" viewBox="0 0 1300 1050" style="position: absolute; left: 0; top: -300px;" role="img" aria-label="{zona_txt}, pla de l'optimitzador i {punto_txt}">
{capas_plan(s)}
{capas_base}
{GLOBO}
    </svg>

    <div style="position: absolute; left: 16px; top: 16px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; max-width: 470px;">
      <div style="display: flex; gap: 8px;">
        <div style="background: rgba(26,26,25,.88); border-radius: 8px; padding: 9px 12px; display: flex; align-items: center; gap: 8px; font-size: 13px;">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill="#0ca30c"></circle></svg>
          <span>GPS</span><span class="num" style="color: #c3c2b7;">±4 m</span>
        </div>
        <div style="background: rgba(26,26,25,.88); border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #c3c2b7;">Pronòstic de les <span class="num" style="color: #ffffff;">07:41</span>, 7 models, amb relleu</div>
      </div>{aviso_html}
      <div style="background: rgba(26,26,25,.92); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; width: 440px; box-sizing: border-box;">
        <div class="lab" style="color: #8fd8f5;">Pla cap a {wp} · {chip.lower()}</div>
        <ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; font-size: 14px; line-height: 1.35;">
{lista}
        </ol>
        <div style="border-top: 1px solid #2c2c2a; padding-top: 7px; display: flex; flex-direction: column; gap: 3px;">
{res}
        </div>
      </div>
    </div>

    {botones}

    <div style="position: absolute; left: 16px; bottom: 14px; background: rgba(26,26,25,.88); border-radius: 8px; padding: 9px 12px; display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #c3c2b7;">
      <div style="display: flex; align-items: center; gap: 10px;"><span style="display: inline-block; width: 22px; height: 12px; border-radius: 3px; background: {VERDE}; opacity: .5;"></span><span>{zona_txt}, fins a les 09:34</span></div>
      <div style="display: flex; align-items: center; gap: 10px;"><span style="display: inline-block; width: 22px; height: 4px; border-radius: 2px; background: {CIAN};"></span><span>Pla en altura, marques cada 5 min</span></div>
      <div style="display: flex; align-items: center; gap: 10px;"><span style="display: inline-block; width: 22px; height: 0; border-top: 4px dashed {VERDE};"></span><span>Pla a ras (terra)</span></div>
      <div style="display: flex; align-items: center; gap: 10px;"><span style="display: inline-block; width: 120px; height: 4px; border-radius: 2px; background: linear-gradient(90deg, #ffd400, #ff9f1a, #ff4fd8, #a77bff);"></span><span>Traça per altitud</span></div>
    </div>

    <div style="position: absolute; right: 16px; bottom: 14px; display: flex; align-items: flex-end; gap: 12px;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
        <span class="num" style="font-size: 11px; color: #ffffff; text-shadow: 0 0 3px #000;">1 km</span>
        <span style="display: block; width: 100px; height: 6px; border: 2px solid #ffffff; border-top: none;"></span>
      </div>
      <span style="font-size: 11px; color: #ffffff; text-shadow: 0 0 3px #000;">Ortofoto ICGC, CC BY 4.0 · relleu AWS Terrain Tiles</span>
    </div>
  </div>

"""
        + franja(wp, chip, rumbo, dist, eta, gran, despues, resultado)
        + pie(1280, 800)
    )
    (salida / nombre).write_text(html)


def objetivo_seg(sel, alto=46, tam=15):
    ops = [
        ("aterrar", "Aterrar"),
        ("passar", "Passar a…"),
        ("qualsevol", "Qualsevol altura"),
    ]
    return (
        """<div role="group" aria-label="Objectiu al punt" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; background: #24231f; border-radius: 10px; padding: 4px;">
"""
        + "\n".join(
            f"""        <button aria-pressed="{"true" if k == sel else "false"}" style="height: {alto}px; border-radius: 7px; border: none; background: {"#2a78d6" if k == sel else "none"}; color: {"#ffffff" if k == sel else "#c3c2b7"}; font-family: inherit; font-size: {tam}px;{" font-weight: 600;" if k == sel else ""}">{t}</button>"""
            for k, t in ops
        )
        + "\n      </div>"
    )


def marcar_tauleta(nombre, titulo, sel, s, resultado):
    # Mapa a la izquierda con la cruz en el centro de la zona A, panel a la derecha, franja abajo.
    ox, oy = -450, -200
    cx, cy = d["zonaA"][0] + ox, d["zonaA"][1] + oy
    stepper = (
        ""
        if sel != "passar"
        else """
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="display: grid; grid-template-columns: 52px minmax(0, 1fr) 52px; gap: 8px; align-items: center;">
        <button aria-label="Baixar 250 ft" style="height: 48px; border-radius: 8px; border: 1px solid #2c2c2a; background: #24231f; color: #ffffff; font-family: 'IBM Plex Mono', monospace; font-size: 24px;">−</button>
        <label for="palt" class="num" style="text-align: center; font-size: 28px; font-weight: 500;"><input id="palt" value="2 500" aria-label="Altitud de pas, ft sobre el mar" style="width: 110px; text-align: right; border: none; background: none; color: #ffffff; font-size: 28px; font-family: 'IBM Plex Mono', monospace;"> <span style="font-size: 16px; color: #c3c2b7;">ft</span></label>
        <button aria-label="Pujar 250 ft" style="height: 48px; border-radius: 8px; border: 1px solid #2c2c2a; background: #24231f; color: #ffffff; font-family: 'IBM Plex Mono', monospace; font-size: 24px;">+</button>
      </div>
      <div class="num" style="font-size: 13px; color: #c3c2b7; text-align: center;">1 056 ft sobre el terreny del punt · de 250 en 250</div>
    </div>"""
    )
    explica = {
        "aterrar": "Compta arribar al punt a ras, a uns 10 m del terreny. Baixar abans i volar a ras, o baixar ràpid al final, ho tria el càlcul.",
        "passar": "Compta passar pel punt a 2 500 ft, mantenint-la o creuant-la pujant o baixant.",
    }[sel]
    html = (
        CABEZA.format(titulo=titulo, w=1280, h=800, lab=12)
        + f"""
  <div style="position: absolute; left: 0; top: 0; width: 860px; height: 600px; overflow: hidden; background: #3a3426;">
    <img src="{ORTO}" alt="Ortofoto del ICGC al voltant de Tàrrega" style="position: absolute; left: {ox}px; top: {oy}px; width: 1300px; height: 1050px;">
    <svg width="1300" height="1050" viewBox="0 0 1300 1050" style="position: absolute; left: {ox}px; top: {oy}px;" role="img" aria-label="Zona A, zona on pots aterrar i el globus">
      <g opacity="0.2">{"".join(f'<polygon points="{pts(p)}" fill="{VERDE}"></polygon>' for p in s["zona"])}</g>
{capas_base}
{GLOBO}
    </svg>
    <svg width="64" height="64" viewBox="0 0 64 64" style="position: absolute; left: {cx - 32:.1f}px; top: {cy - 32:.1f}px;" aria-hidden="true">
      <circle cx="32" cy="32" r="16" fill="none" stroke="#0b0b0b" stroke-width="5" stroke-opacity="0.6"></circle>
      <circle cx="32" cy="32" r="16" fill="none" stroke="#ffffff" stroke-width="2.5"></circle>
      <path d="M32 2v20M32 42v20M2 32h20M42 32h20" stroke="#0b0b0b" stroke-width="5" stroke-opacity="0.6"></path>
      <path d="M32 2v20M32 42v20M2 32h20M42 32h20" stroke="#ffffff" stroke-width="2.5"></path>
    </svg>
    <div style="position: absolute; left: 16px; top: 16px; background: rgba(26,26,25,.9); border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #c3c2b7;">Mou el mapa fins que la creu caigui al punt</div>
    <div style="position: absolute; right: 16px; top: 16px; display: flex; flex-direction: column; gap: 8px;">
      <button aria-label="Apropar" style="width: 52px; height: 52px; border-radius: 10px; border: none; background: rgba(26,26,25,.9); color: #ffffff; font-size: 26px; font-family: 'IBM Plex Mono', monospace;">+</button>
      <button aria-label="Allunyar" style="width: 52px; height: 52px; border-radius: 10px; border: none; background: rgba(26,26,25,.9); color: #ffffff; font-size: 26px; font-family: 'IBM Plex Mono', monospace;">−</button>
    </div>
    <div style="position: absolute; left: 16px; bottom: 14px; background: rgba(26,26,25,.88); border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; gap: 10px; font-size: 12px; color: #c3c2b7;"><span style="display: inline-block; width: 22px; height: 12px; border-radius: 3px; background: {VERDE}; opacity: .5;"></span><span>On pots aterrar amb el vent d'ara, fins a les 09:34</span></div>
  </div>

  <div style="position: absolute; left: 860px; top: 0; width: 420px; height: 600px; background: #1a1a19; border-left: 1px solid #2c2c2a; display: flex; flex-direction: column; box-sizing: border-box; padding: 14px 16px; gap: 10px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <a href="TauletaWaypoints.dc.html" aria-label="Cancel·lar" style="width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #ffffff; margin-left: -8px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
      </a>
      <div style="font-size: 20px; font-weight: 600;">Marcar al mapa</div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; background: #24231f; border-radius: 10px; padding: 4px;">
      <button aria-pressed="true" style="height: 38px; border-radius: 7px; border: none; background: #2a78d6; color: #ffffff; font-family: inherit; font-size: 15px; font-weight: 600;">Punt</button>
      <button aria-pressed="false" style="height: 38px; border-radius: 7px; border: none; background: none; color: #c3c2b7; font-family: inherit; font-size: 15px;">Zona</button>
    </div>
    <div style="display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 10px; align-items: center;">
      <label for="pnom" class="lab">Nom</label>
      <input id="pnom" value="WP3" style="height: 44px; border-radius: 8px; border: 1px solid #2c2c2a; background: #24231f; color: #ffffff; padding: 0 12px; font-size: 16px;">
    </div>
    <div style="background: #24231f; border-radius: 10px; padding: 9px 12px; display: flex; flex-direction: column; gap: 3px;">
      <span class="lab">Sota la creu</span>
      <span class="num" style="font-size: 20px; font-weight: 500;">41,6820 N 1,1967 E</span>
      <span class="num" style="font-size: 13px; color: #c3c2b7;">terreny 1 444 ft · 036° a 850 m del globus</span>
    </div>
    <div class="lab" style="margin-top: 2px;">Al punt</div>
    {objetivo_seg(sel)}{stepper}
    <div style="font-size: 13px; color: #c3c2b7; line-height: 1.45;">{explica}</div>
    <div style="background: #1f2a33; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px;">
      <span class="lab" style="color: #8fd8f5;">Amb el vent d'ara</span>
      <span style="font-size: 15px;">{num_html(resultado)}</span>
    </div>
    <div style="flex-grow: 1;"></div>
    <button style="height: 52px; flex-shrink: 0; border-radius: 8px; border: none; background: #2a78d6; color: #ffffff; font-family: inherit; font-size: 17px; font-weight: 500;">Desar i navegar-hi</button>
  </div>

"""
        + franja(
            "ZONA A",
            "ATERRAR",
            "036°",
            '850 <span style="font-size: 15px; color: #c3c2b7;">m</span>',
            "a 4,3 kt, a les 08:40",
            corta(d["aterrar"]["ordenes"][0]),
            "Després " + corta(d["aterrar"]["ordenes"][1]).lower(),
            num_html("El més a prop a terra: 140 m a les 08:45"),
        )
        + pie(1280, 800)
    )
    (salida / nombre).write_text(html)


def marcar_mobil(nombre, titulo):
    ox, oy = round(195 - d["zonaA"][0], 1), round(190 - d["zonaA"][1], 1)
    html = (
        CABEZA.format(titulo=titulo, w=390, h=844, lab=11)
        + f"""
  <div style="position: absolute; left: 0; top: 0; width: 390px; height: 380px; overflow: hidden; background: #3a3426;">
    <img src="{ORTO}" alt="Ortofoto del ICGC al voltant de Tàrrega" style="position: absolute; left: {ox}px; top: {oy}px; width: 1300px; height: 1050px;">
    <svg width="1300" height="1050" viewBox="0 0 1300 1050" style="position: absolute; left: {ox}px; top: {oy}px;" aria-hidden="true">
{capas_base}
    </svg>
    <svg width="64" height="64" viewBox="0 0 64 64" style="position: absolute; left: 163px; top: 158px;" aria-hidden="true">
      <circle cx="32" cy="32" r="16" fill="none" stroke="#0b0b0b" stroke-width="5" stroke-opacity="0.6"></circle>
      <circle cx="32" cy="32" r="16" fill="none" stroke="#ffffff" stroke-width="2.5"></circle>
      <path d="M32 2v20M32 42v20M2 32h20M42 32h20" stroke="#0b0b0b" stroke-width="5" stroke-opacity="0.6"></path>
      <path d="M32 2v20M32 42v20M2 32h20M42 32h20" stroke="#ffffff" stroke-width="2.5"></path>
    </svg>
    <div style="position: absolute; left: 12px; top: 12px; right: 12px; display: flex; align-items: center; gap: 8px;">
      <a href="MobilWaypoints.dc.html" aria-label="Cancel·lar" style="width: 44px; height: 44px; border-radius: 10px; background: rgba(26,26,25,.9); display: flex; align-items: center; justify-content: center; color: #ffffff;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
      </a>
      <div style="background: rgba(26,26,25,.9); border-radius: 8px; padding: 9px 11px; font-size: 12px; color: #c3c2b7;">Mou el mapa fins que la creu caigui al punt</div>
    </div>
    <div style="position: absolute; right: 10px; bottom: 8px; font-size: 10px; color: #ffffff; text-shadow: 0 0 3px #000;">Ortofoto ICGC</div>
  </div>

  <div style="position: absolute; left: 0; top: 380px; width: 390px; height: 464px; border-top: 1px solid #2c2c2a; padding: 12px 16px 22px 16px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;">
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; background: #24231f; border-radius: 10px; padding: 4px;">
      <button aria-pressed="true" style="height: 38px; border-radius: 7px; border: none; background: #2a78d6; color: #ffffff; font-family: inherit; font-size: 15px; font-weight: 600;">Punt</button>
      <button aria-pressed="false" style="height: 38px; border-radius: 7px; border: none; background: none; color: #c3c2b7; font-family: inherit; font-size: 15px;">Zona</button>
    </div>
    <div style="display: grid; grid-template-columns: 54px minmax(0, 1fr); gap: 10px; align-items: center;">
      <label for="mpnom" class="lab">Nom</label>
      <input id="mpnom" value="WP3" style="height: 44px; border-radius: 8px; border: 1px solid #2c2c2a; background: #24231f; color: #ffffff; padding: 0 12px; font-size: 16px;">
    </div>
    <div style="background: #24231f; border-radius: 10px; padding: 9px 12px; display: flex; flex-direction: column; gap: 3px;">
      <span class="lab">Sota la creu</span>
      <span class="num" style="font-size: 20px; font-weight: 500;">41,6820 N 1,1967 E</span>
      <span class="num" style="font-size: 13px; color: #c3c2b7;">terreny 1 444 ft · 054° a 4,9 km de l'enlairament</span>
    </div>
    <div class="lab" style="margin-top: 2px;">Al punt</div>
    {objetivo_seg("aterrar", 44, 14)}
    <div style="font-size: 13px; color: #c3c2b7; line-height: 1.45;">Compta arribar al punt a ras. Com hi arribes ho calcula la tauleta en vol.</div>
    <div style="flex-grow: 1;"></div>
    <button style="height: 54px; flex-shrink: 0; border-radius: 8px; border: none; background: #2a78d6; color: #ffffff; font-family: inherit; font-size: 17px; font-weight: 500;">Desar al pla</button>
  </div>
</div>
"""
        + pie(390, 844)
    )
    (salida / nombre).write_text(html)


marcar_tauleta(
    "TauletaPuntAterrar.dc.html",
    "Tauleta, punt nou per aterrar",
    "aterrar",
    d["aterrar"],
    "El més a prop a terra: 140 m a les 08:45",
)
marcar_tauleta(
    "TauletaPuntPassar.dc.html",
    "Tauleta, punt nou per passar a una altitud",
    "passar",
    d["aterrar"],
    "Hi passes a 21 m a 2 500 ft, a les 08:45",
)
marcar_mobil("MobilPuntObjectiu.dc.html", "Telèfon, punt nou del pla")
mapa_vuelo(
    "TauletaMapaAterrar.dc.html",
    "Tauleta, mapa per aterrar al punt",
    d["aterrar"],
    "ZONA A",
    "ATERRAR",
    "036°",
    '850 <span style="font-size: 15px; color: #c3c2b7;">m</span>',
    "a 4,3 kt, a les 08:40",
    "On pots aterrar",
    "zona A",
)
mapa_vuelo(
    "TauletaMapaPassar.dc.html",
    "Tauleta, mapa per passar a 2 500 ft",
    d["passar2500"],
    "ZONA A",
    "A 2 500 FT",
    "036°",
    '850 <span style="font-size: 15px; color: #c3c2b7;">m</span>',
    "a 4,3 kt, a les 08:40",
    "On pots passar a 2 500 ft",
    "zona A",
)
dx, dy = (
    (d["noLlega"]["punto"][0] - BALLOON[0]) * 10,
    (BALLOON[1] - d["noLlega"]["punto"][1]) * 10,
)
rumbo = round(math.degrees(math.atan2(dx, dy))) % 360
km = math.hypot(dx, dy) / 1000
eta = hora(round(math.hypot(dx, dy) / (4.3 * 1852 / 3600) / 60))
mapa_vuelo(
    "TauletaMapaNoArriba.dc.html",
    "Tauleta, mapa quan no s'hi arriba",
    d["noLlega"],
    "WP2",
    "ATERRAR",
    f"{rumbo:03d}°",
    f"{km:.1f}".replace(".", ",")
    + ' <span style="font-size: 15px; color: #c3c2b7;">km</span>',
    f"a 4,3 kt, a les {eta}",
    "On pots aterrar",
    "WP2",
)
print(
    "ok", sorted(p.name for p in salida.glob("Tauleta*Punt*")), rumbo, round(km, 2), eta
)

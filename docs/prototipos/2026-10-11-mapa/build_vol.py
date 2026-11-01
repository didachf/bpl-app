"""Pantallas de vuelo: botón Més y Camps en Mapa y Vent, menú Més, buscador de campos de emergencia y Acabar vol."""
import json, math, os, re, sys
P = sys.argv[1]
G = "/private/tmp/claude-501/-Users-didac-High-Frontier-Pilot-Globus/6c858963-174c-4355-9fb5-f3512c1fe575/scratchpad/geo/"
main = open(P + "Main.dc.html").read(); vent = open(P + "TauletaVent.dc.html").read()
MES = '''      <a href="TauletaVolMes.dc.html" style="height: 44px; flex-shrink: 0; border-radius: 10px; border: 1px solid #2c2c2a; color: #c3c2b7; font-size: 15px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>Més</a>
'''
def add_mes(s):
    i = s.index('<div style="width: 116px; padding: 12px; display: flex; flex-direction: column; gap: 10px;')
    j = s.index("    </div>\n  </div>\n</div>\n</x-dc>", i)
    return s[:j] + MES + s[j:]
if "TauletaVolMes.dc.html" not in main: main = add_mes(main)
if "TauletaVolMes.dc.html" not in vent: vent = add_mes(vent)
CAMPS_BTN = '''      <a href="TauletaEmergencia.dc.html" aria-label="Camps d'emergència" style="width: 52px; height: 52px; border-radius: 10px; background: #f2a33a; color: #1a1a19; display: flex; flex-direction: column; align-items: center; justify-content: center; text-decoration: none; font-size: 10px; font-weight: 700; gap: 1px;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18"></path><path d="M5 20l3-9h8l3 9"></path><path d="M12 4v4M10 6h4"></path></svg>CAMPS</a>
'''
anchor = '<div style="position: absolute; right: 16px; top: 16px; display: flex; flex-direction: column; gap: 8px;">\n'
if "TauletaEmergencia.dc.html" not in main: main = main.replace(anchor, anchor + CAMPS_BTN, 1)
open(P + "Main.dc.html", "w").write(main); open(P + "TauletaVent.dc.html", "w").write(vent)

head = main[:main.index('<div style="width: 1280px; height: 800px;')]
tail = main[main.index("</x-dc>"):]
MAP = main[main.index('  <div style="position: absolute; left: 0; top: 0; width: 1280px; height: 600px; overflow: hidden; background: #3a3426;">'):main.index('  <div style="position: absolute; left: 0; top: 600px;')]
FRANJA = main[main.index('  <div style="position: absolute; left: 0; top: 600px;'):main.rindex("</div>\n</x-dc>")]
ROOT_OPEN = '<div style="width: 1280px; height: 800px; background: #1a1a19; color: #ffffff; font-family: \'IBM Plex Sans\', system-ui, sans-serif; position: relative; overflow: hidden;">\n'
def board(title, inner):
    h = head.replace("<title>Tauleta, vista Mapa</title>", f"<title>{title}</title>")
    return h + ROOT_OPEN + inner + "</div>\n" + tail
DIM = '  <div style="position: absolute; inset: 0; background: rgba(10,10,10,.55);"></div>\n'

# ---------- menú Més ----------
def item(href, icon, t, sub, col="#ffffff", border="#2c2c2a", bg="#222220"):
    h = f' href="{href}"' if href else ""
    return f'''      <a{h} style="display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 12px; border: 1px solid {border}; background: {bg}; color: {col}; text-decoration: none;">{icon}<span style="display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 18px; font-weight: 600;">{t}</span><span style="font-size: 13px; color: #c3c2b7;">{sub}</span></span></a>
'''
IC = lambda p, c="currentColor": f'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{p}</svg>'
SHEET = ('''  <div role="dialog" aria-label="Més opcions del vol" style="position: absolute; right: 16px; bottom: 212px; width: 420px; background: #1a1a19; border: 1px solid #2c2c2a; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 12px 40px rgba(0,0,0,.5);">
      <div style="display: flex; align-items: center; justify-content: space-between;"><span class="lab">Vol en marxa · 0:34</span><a href="Main.dc.html" aria-label="Tancar" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #c3c2b7; text-decoration: none; font-size: 22px;">×</a></div>
'''
 + item("TauletaEmergencia.dc.html", IC('<path d="M3 20h18"></path><path d="M5 20l3-9h8l3 9"></path><path d="M12 4v4M10 6h4"></path>', "#f2a33a"), "Camps d'emergència", "On pots aterrar en els propers 10 min", "#ffffff", "#6b5420", "#2a2416")
 + item("TauletaWaypoints.dc.html", IC('<path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z"></path><circle cx="12" cy="10" r="2.2"></circle>'), "Waypoints", "Els del pla i afegir-ne")
 + item("TauletaPerfil.dc.html", IC('<path d="M15 6l-6 6 6 6"></path>'), "Sortir a l'app", "El vol i el GPS continuen. Vol, a la columna, hi torna")
 + item("TauletaAcabarVol.dc.html", IC('<rect x="6" y="6" width="12" height="12" rx="2"></rect>', "#e0524b"), "Acabar vol", "Para el GPS i obre el Registre", "#ffffff", "#6b2a26", "#2a1d1b")
 + "  </div>\n")
open(P + "TauletaVolMes.dc.html", "w").write(board("Tauleta, vol, més", MAP + FRANJA + DIM + SHEET))

# ---------- camps d'emergència ----------
E = json.load(open(G + "emerg/emerg.json"))
D = json.load(open(os.path.expanduser("~/High Frontier/Pilot Globus/04_Planes_de_vuelo/_generador/carta_tarrega_10-10-2026_datos.json")))
LAT0, LON0 = 41.656127, 1.149041; R = 6378137.0
def merc(lat, lon): return (math.radians(lon)*R, math.log(math.tan(math.pi/4+math.radians(lat)/2))*R)
k = 1/math.cos(math.radians(LAT0)); X0, Y0 = merc(LAT0, LON0)
def ll2px(lat, lon):
    x, y = merc(lat, lon); e, n = (x-X0)/k, (y-Y0)/k; return ((e+4000)/10, (8500-n)/10)
Z = 2.0; BX, BY = 746.1, 630.9; CX, CY = 470, 300           # globo en pantalla
OX, OY = CX - BX*Z, CY - BY*Z
lines = ""
for l in D["lines"]:
    pts = [ll2px(a, b) for a, b in l["g"]]
    if any(500 < x < 1000 and 400 < y < 850 for x, y in pts):
        p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        lines += f'<polyline points="{p}" fill="none" stroke="#0b0b0b" stroke-opacity="0.5" stroke-width="5"></polyline><polyline points="{p}" fill="none" stroke="#ff5a4f" stroke-width="2.5"></polyline>'
hull = " ".join(f"{x:.1f},{y:.1f}" for x, y in E["hull"])
pts_svg = ""
for i, c in enumerate(E["punts"], 1):
    x, y = c["px"]
    on = i == 1
    pts_svg += (f'<circle cx="{x}" cy="{y}" r="10" fill="none" stroke="{"#35d0ff" if on else "#ffffff"}" stroke-width="{2.5 if on else 1.8}" stroke-dasharray="{"" if on else "3 2"}"></circle>'
                f'<circle cx="{x}" cy="{y}" r="5" fill="{"#35d0ff" if on else "#ffffff"}" stroke="#0b0b0b" stroke-width="1.2"></circle>'
                f'<text x="{x+7}" y="{y-7}" fill="#ffffff" font-family="IBM Plex Mono" font-size="9" font-weight="600" class="halo">{i}</text>')
x1, y1 = E["punts"][0]["px"]
EMAP = f'''  <div style="position: absolute; left: 0; top: 0; width: 1280px; height: 600px; overflow: hidden; background: #3a3426;">
    <img src="/_blob/81fc07a526d1131ee13d8a04f183945b" alt="Ortofoto del ICGC al voltant del globus" style="position: absolute; left: {OX:.0f}px; top: {OY:.0f}px; width: {1300*Z:.0f}px; height: {1050*Z:.0f}px;">
    <img src="/_blob/c0c4fa5ab78ca1d819491c7b5e6a9981" alt="Terreny dins de l'abast: verd bo, groc regular, vermell dolent" style="position: absolute; left: {OX:.0f}px; top: {OY:.0f}px; width: {1300*Z:.0f}px; height: {1050*Z:.0f}px; image-rendering: pixelated;">
    <svg width="{1300*Z:.0f}" height="{1050*Z:.0f}" viewBox="0 0 1300 1050" style="position: absolute; left: {OX:.0f}px; top: {OY:.0f}px;" role="img" aria-label="Zona a l'abast en 10 minuts, camps proposats i línies elèctriques">
      {lines}
      <polygon points="{hull}" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="5 4"></polygon>
      <line x1="{BX}" y1="{BY}" x2="{x1}" y2="{y1}" stroke="#35d0ff" stroke-width="2"></line>
      {pts_svg}
      <g transform="translate({BX} {BY}) rotate(61)"><circle r="10" fill="#ffffff" fill-opacity="0.2"></circle><path d="M0,-7.5 L5,5.5 L0,2.5 L-5,5.5 Z" fill="#ffffff" stroke="#0b0b0b" stroke-width="1" stroke-linejoin="round"></path></g>
    </svg>
    <div style="position: absolute; left: 16px; top: 16px; display: flex; gap: 8px;">
      <a href="Main.dc.html" style="background: rgba(26,26,25,.9); border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #ffffff; text-decoration: none;">‹ Mapa</a>
      <div style="background: rgba(42,36,22,.95); border: 1px solid #6b5420; border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #f0d79a;">Camps d'emergència · on pots aterrar en 10 min</div>
    </div>
    <div style="position: absolute; left: 16px; bottom: 14px; background: rgba(26,26,25,.9); border-radius: 8px; padding: 8px 12px; display: flex; gap: 14px; align-items: center; font-size: 12px; color: #c3c2b7;">
      <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 14px; height: 10px; background: rgb(70,190,100);"></span>bo</span>
      <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 14px; height: 10px; background: rgb(235,200,60);"></span>regular</span>
      <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 14px; height: 10px; background: rgb(200,70,60);"></span>dolent</span>
      <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 18px; height: 0; border-top: 2px dashed #ffffff;"></span>a l'abast</span>
      <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 18px; height: 3px; background: #ff5a4f;"></span>línies</span>
      <span>Cobertes del sòl ICGC 2024 · ortofoto ICGC</span>
    </div>
  </div>
'''
def card(i, c):
    on = i == 1
    capes = " i ".join(c["capes"]) if c["capes"] else ""
    st = "border: 2px solid #35d0ff; background: #1b2a33; padding: 9px 11px;" if on else "border: 1px solid #2c2c2a; background: #222220; padding: 10px 12px;"
    btn = ('<span style="font-size: 12px; color: #0b0b0b; background: #35d0ff; border-radius: 8px; padding: 2px 8px; font-weight: 600;">Actiu</span>' if on
           else '<button style="height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid #35d0ff; background: transparent; color: #ffffff; font-family: inherit; font-size: 13px;">Anar-hi</button>')
    return f'''      <div style="border-radius: 10px; {st} display: flex; flex-direction: column; gap: 3px;">
        <div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 16px; font-weight: 600;">Camp {i} <span class="num" style="font-size: 14px; font-weight: 400; color: #c3c2b7;">{c["b"]:03d}° · {c["d"]} m</span></span>{btn}</div>
        <span class="num" style="font-size: 13px; color: #ffffff;">uns {c["min"]} min · vent de {capes} sobre el terreny</span>
        <span class="num" style="font-size: 12px; color: #c3c2b7;">{c["marge"]} m fins a terreny no bo · línia a {str(round(c["linia"]/1000, 1)).replace(".", ",")} km</span>
      </div>
'''
PANEL = ('''  <div style="position: absolute; right: 16px; top: 16px; width: 380px; max-height: 568px; background: rgba(26,26,25,.95); border: 1px solid #2c2c2a; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;"><span class="lab">Camps a l'abast</span><span class="num" style="font-size: 11px; color: #898781;">recalculat fa 4 s</span></div>
'''
 + "".join(card(i, c) for i, c in enumerate(E["punts"], 1))
 + '''      <span style="font-size: 12px; line-height: 1.4; color: #898781;">Amb el vent que mesura el GPS a la teva altura i el previst a baix. Bo: 90 % obert en 500 m, gens de bosc ni urbà. No veu cables baixos, tanques ni bestiar: mira-ho tu.</span>
  </div>
''')
FR = FRANJA
FR = FR.replace('<span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; color: #35d0ff;">ZONA A</span>', '<span style="font-size: 13px; font-weight: 600; letter-spacing: .06em; color: #35d0ff;">CAMP 1</span>')
FR = FR.replace('<span class="num" style="font-size: 50px; font-weight: 500; line-height: 1.05;">036°</span>', f'<span class="num" style="font-size: 50px; font-weight: 500; line-height: 1.05;">{E["punts"][0]["b"]:03d}°</span>')
FR = FR.replace('<div class="num" style="font-size: 22px;">850 <span style="font-size: 15px; color: #c3c2b7;">m</span></div>', f'<div class="num" style="font-size: 22px;">{E["punts"][0]["d"]} <span style="font-size: 15px; color: #c3c2b7;">m</span></div>')
FR = FR.replace('<div class="num" style="font-size: 13px; color: #c3c2b7;">a 4,3 kt, a les 08:40</div>', '<div class="num" style="font-size: 13px; color: #c3c2b7;">camp d\'emergència</div>')
FR = FR.replace('<div style="font-size: 24px; font-weight: 600; line-height: 1.2;">Manté <span class="num">1 500 ft</span> 2 min</div>', '<div style="font-size: 24px; font-weight: 600; line-height: 1.2;">Baixa a 50 m sobre terra</div>')
FR = FR.replace('<div style="font-size: 17px; color: #c3c2b7; line-height: 1.3;">Després baixa lent fins a terra</div>', '<div style="font-size: 17px; color: #c3c2b7; line-height: 1.3;">i aterra al camp 1</div>')
FR = FR.replace('<div style="font-size: 16px;">Passes a <span class="num" style="color: #35d0ff; font-weight: 600;">20 m</span> del centre a les<span class="num" style="font-weight: 600;">08:44</span></div>', f'<div style="font-size: 16px;">Hi arribes en uns <span class="num" style="color: #35d0ff; font-weight: 600;">{E["punts"][0]["min"]} min</span></div>')
FR = FR.replace('<div class="lab" style="color: #8fd8f5;">Ordre</div>', '<div class="lab" style="color: #f2c46a;">Emergència</div>')
open(P + "TauletaEmergencia.dc.html", "w").write(board("Tauleta, camps d'emergència", EMAP + PANEL + FR))

# ---------- acabar vol ----------
def row(a, b):
    return f'<div style="display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0; border-bottom: 1px solid #2c2c2a;"><span style="font-size: 14px; color: #c3c2b7;">{a}</span><span class="num" style="font-size: 16px;">{b}</span></div>'
DLG = ('''  <div role="dialog" aria-label="Acabar el vol" style="position: absolute; left: 50%; top: 70px; transform: translateX(-50%); width: 520px; background: #1a1a19; border: 1px solid #2c2c2a; border-radius: 16px; padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 12px 40px rgba(0,0,0,.5);">
      <div style="font-size: 22px; font-weight: 600;">Acabar el vol?</div>
      <div style="font-size: 13px; color: #c3c2b7;">Es para el GPS i s'obre el Registre amb aquest vol. Xifres il·lustratives.</div>
      <div style="display: flex; flex-direction: column;">
'''
 + row("Enlairament", "08:00 · Tàrrega") + row("Aterratge", "09:31 · 41,6925 N 1,2055 E") + row("Durada", "1 h 31 min")
 + row("Distància", "6,4 km") + row("Altitud màxima", "3 750 ft") + row("Del pla", "M-65 · Marc, instructor")
 + '''      </div>
      <div style="font-size: 12px; line-height: 1.4; color: #898781;">Funció, signatura i notes, les acabes al Registre. La traça es guarda amb el vol.</div>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding-top: 4px;">
        <a href="Main.dc.html" style="height: 52px; border-radius: 10px; border: 1px solid #45443f; color: #ffffff; font-size: 16px; text-decoration: none; display: flex; align-items: center; justify-content: center;">Continuar volant</a>
        <a style="height: 52px; border-radius: 10px; background: #2a78d6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: flex; align-items: center; justify-content: center;">Desar al Registre</a>
      </div>
  </div>
''')
open(P + "TauletaAcabarVol.dc.html", "w").write(board("Tauleta, acabar vol", MAP + FRANJA + DIM + DLG))
print("ok")

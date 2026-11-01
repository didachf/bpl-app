"""Construye las maquetas Plans, Afegir enlairament y Trajectòries, y cambia la columna de las demás."""
import json, re, sys
ROOT = sys.argv[1]            # carpeta project/ del lienzo
G = "/private/tmp/claude-501/-Users-didac-High-Frontier-Pilot-Globus/6c858963-174c-4355-9fb5-f3512c1fe575/scratchpad/geo/"
BLOB = "/_blob/843d5d13cddf10eb2cb0a1916f6a32a0"
geo = json.load(open(G + "geo_zona.json"))
LINES = open(G + "f_lines.svg").read()
ZONES = open(G + "f_zones.svg").read()
TRACKS = open(G + "f_tracks_baix.svg").read()
PLACES = "\n".join(f'<text x="{p["p"][0]+10}" y="{p["p"][1]}" fill="#ffffff" fill-opacity="0.85" font-family="IBM Plex Sans" font-size="21" class="halo">{p["n"]}</text>' for p in geo["places"] if p["n"] != "Tàrrega")

IC = {
 "user": '<circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"></path>',
 "pin": '<path d="M12 21s-6.5-5.7-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21z"></path><circle cx="12" cy="9.8" r="2.3"></circle>',
 "clip": '<rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 3h6v3H9z"></path><path d="M9 11h6M9 15h4"></path>',
 "check": '<path d="M4 6.5l1.8 1.8L9 5"></path><path d="M4 12.5l1.8 1.8L9 11"></path><path d="M4 18.5l1.8 1.8L9 17"></path><path d="M12 7h8M12 13h8M12 19h8"></path>',
 "ball": '<path d="M12 2.5a7 7 0 0 0-7 7c0 3.8 3.3 6.6 4.6 8h4.8c1.3-1.4 4.6-4.2 4.6-8a7 7 0 0 0-7-7z"></path><path d="M9.6 17.5l.6 2.5h3.6l.6-2.5"></path>',
 "target": '<circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="4.5"></circle><circle cx="12" cy="12" r="1" fill="currentColor"></circle>',
 "book": '<path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z"></path><path d="M5 20a2 2 0 0 0 2 2h12v-4"></path><path d="M9 7h6"></path>',
 "gear": '<circle cx="12" cy="12" r="3"></circle><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"></path>',
}
ITEMS = [("Perfil", "TauletaPerfil.dc.html", "user"), ("Plans", "TauletaPlans.dc.html", "clip"), ("Operar", None, "check"), ("Competició", None, "target"),
         ("Vol", "TauletaComencar.dc.html", "ball"), ("Registre", None, "book")]
def item(lab, href, ic, active):
    h = f' href="{href}"' if href else ""
    cur = ' aria-current="page"' if active else ""
    col, fw, bg = ("#ffffff", 600, " background: #1d3352;") if active else ("#a9a79f", 500, "")
    return (f'    <a{h}{cur} style="width: 80px; height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; text-decoration: none; color: {col}; font-size: 12px; font-weight: {fw};">\n'
            f'      <span style="width: 54px; height: 30px; border-radius: 15px;{bg} display: flex; align-items: center; justify-content: center;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{IC[ic]}</svg></span>\n'
            f'      {lab}\n    </a>\n')
def rail(active):
    s = '<nav aria-label="Seccions" style="width: 88px; height: 800px; flex-shrink: 0; box-sizing: border-box; background: #121211; border-right: 1px solid #2c2c2a; padding: 14px 0; display: flex; flex-direction: column; align-items: center; gap: 4px;">\n'
    for lab, href, ic in ITEMS: s += item(lab, href, ic, lab == active)
    s += '    <span style="flex-grow: 1;"></span>\n' + item("Ajustos", None, "gear", False) + '  </nav>'
    return s

def page(title, active, main, vals="{}"):
    return f'''<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<title>{title}</title>
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
.lab{{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#898781}}
.halo{{paint-order:stroke;stroke:#0b0b0b;stroke-width:5px;stroke-linejoin:round}}
</style>
</helmet>
<div style="width: 1280px; height: 800px; background: #1a1a19; color: #ffffff; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; overflow: hidden;">
  {rail(active)}
{main}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1280,"height":800}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {vals};
  }}
}}
</script>
</body>
</html>
'''

CARD = "background: #222220; border: 1px solid #2c2c2a; border-radius: 12px;"
TA = geo["tarrega"]; AG = geo["agramunt"]

def mapa(w, h, extra, tracks=""):
    return f'''<div style="position: relative; width: {w}px; height: {h}px; border-radius: 12px; overflow: hidden; background: #2c2c2a; flex-shrink: 0;">
          <img src="{BLOB}" alt="Ortofoto del ICGC de Tàrrega a Agramunt i Cervera" style="position: absolute; left: 0; top: 0; width: {w}px; height: {h}px;">
          <svg width="{w}" height="{h}" viewBox="0 0 1200 900" style="position: absolute; left: 0; top: 0;" role="img" aria-label="Línies elèctriques, zones d'aterratge i enlairaments">
{ZONES}
{LINES}
{tracks}
{PLACES}
            <text x="545" y="430" fill="#ffffff" font-family="IBM Plex Sans" font-size="26" font-weight="600" class="halo">ZONA A</text>
            <text x="258" y="196" fill="#ffffff" font-family="IBM Plex Sans" font-size="26" font-weight="600" class="halo">ZONA B</text>
            <circle cx="{TA[0]}" cy="{TA[1]}" r="11" fill="#ffffff" stroke="#0b0b0b" stroke-width="4"></circle>
            <text x="{TA[0]+18}" y="{TA[1]+30}" fill="#ffffff" font-family="IBM Plex Sans" font-size="24" font-weight="600" class="halo">Tàrrega</text>
            <circle cx="{AG[0]}" cy="{AG[1]}" r="11" fill="#ffffff" stroke="#0b0b0b" stroke-width="4"></circle>
            <text x="{AG[0]+18}" y="{AG[1]+8}" fill="#ffffff" font-family="IBM Plex Sans" font-size="24" font-weight="600" class="halo">Agramunt</text>
          </svg>
{extra}
        </div>'''

def overlay_btns(labels):
    b = "".join(f'<button style="height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid #45443f; background: #1a1a19e6; color: #ffffff; font-family: inherit; font-size: 13px;">{l}</button>' for l in labels)
    return f'          <div style="position: absolute; right: 10px; top: 10px; display: flex; gap: 6px;">{b}</div>'

def sec(title, body, extra=""):
    return f'''<section aria-label="{title}" style="{CARD} padding: 10px 14px; display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;"><span class="lab">{title}</span>{extra}</div>
{body}
          </section>'''

# ---------- PLANS ----------
dies = [
 {"acab": '<span class="num" style="font-size: 15px;">2,7 km</span><span style="font-size: 11px; color: #898781;">tornant</span>', "dia": "dl 12/10", "gen": "11:50", "sol": "08:04", "raf": "6,0", "vis": "15,0", "cells": [("3,0","3,9",318),("3,1","3,7",310),("3,1","3,9",299),("1,5","2,8",291)]},
 {"acab": '<span class="num" style="font-size: 15px;">2,7 km</span><span style="font-size: 11px; color: #898781;">tornant</span>', "dia": "dt 13/10", "gen": "13:05", "sol": "08:05", "raf": "7,8", "vis": "13,5", "cells": [("3,7","6,0",274),("3,7","5,7",277),("3,1","4,9",285),("1,6","4,2",289)]},
 {"acab": '<span style="font-size: 13px; color: #fab219;">falten dades</span>', "dia": "dc 14/10", "gen": "13:07", "sol": "08:06", "raf": "6,6", "vis": "13,1", "cells": [("2,9","3,7",291),("3,1","3,3",291),("2,7","3,7",286),("1,6","2,9",267)]},
]
GRID = "grid-template-columns: 136px repeat(4, minmax(0, 1fr)) 76px 88px 56px 118px 96px;"
def arrow(rot, size=16):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 16 16" aria-hidden="true" style="color: #ffffff; flex-shrink: 0;"><g transform="rotate({rot} 8 8)"><path d="M8 1 L12.5 9 L8.8 8.2 L8.8 15 L7.2 15 L7.2 8.2 L3.5 9 Z" fill="currentColor"></path></g></svg>'
rows = ""
for d in dies:
    cells = "".join(f'<div style="display: flex; align-items: center; gap: 7px;">{arrow(c)}<div style="display: flex; flex-direction: column;"><span class="num" style="font-size: 16px;">{a} <span style="font-size: 12px; color: #898781;">a {b}</span></span><span class="num" style="font-size: 11px; color: #898781;">cap a {c:03d}°</span></div></div>' for a, b, c in d["cells"])
    rows += f'''        <div style="display: grid; {GRID} align-items: center; height: 54px; border-bottom: 1px solid #262624;">
          <div style="display: flex; flex-direction: column; gap: 1px;"><span style="font-size: 15px; font-weight: 500;">{d["dia"]}</span><span class="num" style="font-size: 11px; color: #898781;">sol {d["sol"]} · de les {d["gen"]}</span></div>
          {cells}
          <span class="num" style="font-size: 15px;">{d["raf"]} kt</span>
          <span class="num" style="font-size: 15px;">{d["vis"]} km</span>
          <span style="font-size: 14px; color: #c3c2b7;">cap</span>
          <span style="display: flex; flex-direction: column;">{d["acab"]}</span>
          <a href="TauletaPlaNou.dc.html" style="height: 34px; border-radius: 8px; border: 1px solid #3b5c84; color: #ffffff; font-size: 13px; text-decoration: none; display: flex; align-items: center; justify-content: center;">Crear pla</a>
        </div>
'''
def seg(opts, sel):
    return '<div role="group" style="display: flex; gap: 3px; background: #121211; border: 1px solid #2c2c2a; border-radius: 9px; padding: 3px;">' + "".join(
        f'<button aria-pressed="{"true" if o == sel else "false"}" style="height: 30px; padding: 0 12px; border: 0; border-radius: 6px; background: {"#2a78d6" if o == sel else "transparent"}; color: {"#ffffff" if o == sel else "#c3c2b7"}; font-family: inherit; font-size: 13px; font-weight: {600 if o == sel else 400};">{o}</button>' for o in opts) + '</div>'
def plan_row(dia, lloc, txt, href=None, last=False):
    h = f' href="{href}"' if href else ""
    bb = "" if last else " border-bottom: 1px solid #2c2c2a;"
    return f'<a{h} style="display: grid; grid-template-columns: 88px 120px minmax(0, 1fr) 40px 14px; align-items: center; height: 44px;{bb} color: #ffffff; text-decoration: none;"><span class="num" style="font-size: 14px; color: #c3c2b7;">{dia}</span><span style="font-size: 15px; font-weight: 500;">{lloc}</span><span class="num" style="font-size: 13px; color: #c3c2b7;">{txt}</span><span style="font-size: 12px; color: #5598e7;">PDF</span><span style="color: #898781;">›</span></a>'
def site_row(nom, elev, coord, acces, hist, last=False):
    bb = "" if last else " border-bottom: 1px solid #2c2c2a;"
    acc = f'<span style="font-size: 12px; color: #c3c2b7;">{acces}</span>' if acces else '<span style="font-size: 12px; color: #fab219;">Accés sense posar</span>'
    return f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) auto; row-gap: 1px; column-gap: 10px; padding: 6px 0;{bb}"><span style="font-size: 15px; font-weight: 500;">{nom} <span class="num" style="font-size: 12px; color: #898781; font-weight: 400;">{elev}</span></span><span class="num" style="font-size: 12px; color: #9fb4c6; text-align: right;">{hist}</span><span class="num" style="font-size: 12px; color: #898781;">{coord}</span>{acc}</div>'
plans_main = f'''  <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 18px 24px 20px; display: flex; flex-direction: column; gap: 14px;">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
      <h1 style="margin: 0; font-size: 26px; font-weight: 600;">Plans</h1>
      <a href="TauletaPlaNou.dc.html" style="height: 42px; padding: 0 18px; border-radius: 10px; background: #2a78d6; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; display: flex; align-items: center;">Pla nou</a>
    </div>
    <section aria-label="Meteo dels propers dies" style="{CARD} padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <h2 style="margin: 0; font-size: 17px; font-weight: 600;">Meteo dels propers dies</h2>
        {seg(["Per llocs", "Per dies"], "Per dies")}
        <button style="height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid #45443f; background: #1a1a19; color: #ffffff; font-family: inherit; font-size: 14px;">Tàrrega ▾</button>
        <span style="flex-grow: 1;"></span>
        <span style="font-size: 12px; color: #898781;">Vent a 10 m, mitjana i màxim entre models, cap a on va</span>
        <a href="https://www.windy.com/" style="height: 36px; padding: 0 14px; border-radius: 8px; border: 1px solid #45443f; color: #ffffff; font-size: 14px; text-decoration: none; display: flex; align-items: center;">Obrir Windy ↗</a>
      </div>
      <div style="display: grid; {GRID} align-items: end; padding-bottom: 5px; border-bottom: 1px solid #2c2c2a;">
        <span class="lab">Dia</span><span class="lab num" style="letter-spacing: 0;">07:00</span><span class="lab num" style="letter-spacing: 0;">08:00</span><span class="lab num" style="letter-spacing: 0;">09:00</span><span class="lab num" style="letter-spacing: 0;">10:00</span><span class="lab">Ràfega</span><span class="lab">Visibilitat</span><span class="lab">Pluja</span><span class="lab">Acabaries</span><span></span>
      </div>
{rows}      <div style="font-size: 12px; color: #898781;">Només dades. Cap casella arriba als 15 kt del manual. El teu mínim personal de vent no està posat. «Acabaries» és la mediana de 7 models, tornant o cap a la base.</div>
    </section>
    <div style="flex-grow: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 470px; gap: 14px; align-items: start;">
    <section aria-label="Plans fets" style="{CARD} padding: 12px 16px; display: flex; flex-direction: column; gap: 4px;">
      <div style="display: flex; align-items: baseline; justify-content: space-between;">
        <h2 style="margin: 0; font-size: 17px; font-weight: 600;">Plans fets</h2>
        <a style="font-size: 14px;">Veure'ls tots, 11</a>
      </div>
      {plan_row("ds 10/10", "Tàrrega", "08:00 a 09:30 · baix · Marc", "TauletaPla.dc.html")}
      {plan_row("ds 10/10", "Agramunt", "08:00 a 09:30 · creuer · Marc")}
      {plan_row("dv 09/10", "Balaguer A", "07:10 a 08:40 · baix · Marc")}
      {plan_row("dc 07/10", "Tàrrega", "07:10 a 08:40 · pronto · Marc", last=True)}
    </section>
    <section aria-label="Llocs d'enlairament" style="{CARD} padding: 12px 16px; display: flex; flex-direction: column; gap: 4px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <h2 style="margin: 0; font-size: 17px; font-weight: 600;">Llocs d'enlairament</h2>
        <a href="TauletaAfegirEnlairament.dc.html" style="height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid #2a78d6; color: #ffffff; font-size: 14px; text-decoration: none; display: flex; align-items: center;">Afegir punt d'enlairament</a>
      </div>
      {site_row("Tàrrega", "380 m", "41,6561 N 1,1490 E", "Dins el polígon industrial", "5 plans")}
      {site_row("Agramunt", "409 m", "41,7577 N 1,0871 E", "", "3 plans")}
      {site_row("Igualada", "329 m", "41,5842 N 1,6528 E", "", "2 plans")}
      {site_row("Balaguer A", "249 m", "41,7782 N 0,8616 E", "Mateix accés que el punt del 08/10", "1 pla", last=True)}
    </section>
    </div>
  </main>'''
open(ROOT + "TauletaPlans.dc.html", "w").write(page("Tauleta, Plans", "Plans", plans_main))

# ---------- PLA, capçalera i pestanyes compartides ----------
TABS = ["Resum", "Meteo", "Trajectòries", "Waypoints i zones", "Càrrega i combustible", "Emergència", "Espai aeri i ENAIRE", "Comprovació del matí"]
TABHREF = {"Resum": "TauletaPla.dc.html", "Trajectòries": "TauletaPlaTrajectories.dc.html", "Waypoints i zones": "TauletaPlaWaypoints.dc.html", "Espai aeri i ENAIRE": "TauletaPlaEnaire.dc.html"}
def tabs(sel):
    out = '    <div role="tablist" aria-label="Parts del pla" style="display: flex; gap: 2px; border-bottom: 1px solid #2c2c2a;">\n'
    for t in TABS:
        on = t == sel
        h = f' href="{TABHREF[t]}"' if t in TABHREF else ""
        out += (f'      <a{h} role="tab" aria-selected="{"true" if on else "false"}" style="height: 40px; padding: 0 12px; border-bottom: 3px solid {"#2a78d6" if on else "transparent"}; color: {"#ffffff" if on else "#a9a79f"}; font-size: 14px; font-weight: {600 if on else 400}; text-decoration: none; display: flex; align-items: center; box-sizing: border-box;">{t}</a>\n')
    return out + '    </div>'
HEADER = '''    <div style="display: flex; align-items: flex-end; gap: 16px;">
      <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px;">
        <a href="TauletaPlans.dc.html" style="font-size: 14px; text-decoration: none;">‹ Plans</a>
        <h1 style="margin: 0; font-size: 25px; font-weight: 600;">Tàrrega · dissabte 10/10/2026</h1>
        <div class="num" style="font-size: 14px; color: #c3c2b7;">08:00 a 09:30 · Marc · M-65, C-1, MK-32 doble, 2 × M-40 · perfil baix</div>
      </div>
      <a style="height: 54px; padding: 0 16px; border-radius: 12px; border: 1px solid #45443f; color: #ffffff; font-size: 15px; text-decoration: none; display: flex; align-items: center; flex-shrink: 0;">PDF per a l'instructor</a>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
        <a href="TauletaComencar.dc.html" style="height: 54px; padding: 0 22px; border-radius: 12px; background: #2a78d6; color: #ffffff; font-size: 18px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 10px;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">''' + IC["ball"] + '''</svg>Començar vol</a>
        <span style="font-size: 12px; color: #898781;">Baixa el mapa i el pronòstic i calibra l'altitud</span>
      </div>
    </div>'''

# ---------- TRAJECTÒRIES ----------
PROF = json.load(open(G + "perfils.json"))
def xt(t): return round(34 + t / 90 * 352, 1)
def ya(a): return round(132 - (a - 300) / 1300 * 118, 1)
def prof_line(pts, col, w):
    return f'<polyline points="{" ".join(f"{xt(t)},{ya(a)}" for t, a in pts)}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linejoin="round"></polyline>'
others = ""
chart = f'''<svg width="396" height="150" viewBox="0 0 396 150" role="img" aria-label="Perfil d'altitud dels quatre perfils sota el sostre de la classe G">
              <rect x="34" y="6" width="352" height="{ya(1372)-6}" fill="#2a1d1b"></rect>
              <text x="42" y="22" fill="#d4a59c" font-family="IBM Plex Sans" font-size="11">TMA de Barcelona, classe D</text>
              <line x1="34" y1="{ya(1372)}" x2="386" y2="{ya(1372)}" stroke="#d4a59c" stroke-width="1.5"></line>
              <text x="384" y="{ya(1372)-4}" fill="#d4a59c" font-family="IBM Plex Mono" font-size="10" text-anchor="end">4 500 ft, sostre de la G</text>
              <line x1="34" y1="{ya(1200)}" x2="386" y2="{ya(1200)}" stroke="#898781" stroke-width="1" stroke-dasharray="4 4"></line>
              <text x="384" y="{ya(1200)+12}" fill="#898781" font-family="IBM Plex Mono" font-size="10" text-anchor="end">sostre del pla, 1 200 m</text>
              <line x1="34" y1="{ya(380)}" x2="386" y2="{ya(380)}" stroke="#5b5a55" stroke-width="1"></line>
              {others}
              {prof_line(PROF["baix"], "#ffd400", 3)}
              <text x="30" y="{ya(1372)+4}" fill="#898781" font-family="IBM Plex Mono" font-size="10" text-anchor="end">1372</text>
              <text x="30" y="{ya(380)+4}" fill="#898781" font-family="IBM Plex Mono" font-size="10" text-anchor="end">380</text>
              <text x="34" y="146" fill="#898781" font-family="IBM Plex Mono" font-size="10">08:00</text>
              <text x="386" y="146" fill="#898781" font-family="IBM Plex Mono" font-size="10" text-anchor="end">09:30</text>
            </svg>'''
def prow(name, txt, sel=False):
    st = "border: 2px solid #ffd400; background: #2a2716; padding: 6px 10px;" if sel else "border: 1px solid #2c2c2a; background: #1d1d1b; padding: 7px 11px;"
    return f'<button aria-pressed="{"true" if sel else "false"}" style="font-family: inherit; text-align: left; color: #ffffff; border-radius: 9px; {st} display: grid; grid-template-columns: 62px minmax(0, 1fr); align-items: baseline; gap: 8px;"><span class="num" style="font-size: 14px; font-weight: {600 if sel else 500};">{name}</span><span class="num" style="font-size: 12px; color: #c3c2b7;">{txt}</span></button>'
ZP = json.load(open(G + "zona_possible.json"))
ZONE_SVG = (f'<polygon points="{ZP["hull"]}" fill="#ffd400" fill-opacity="0.22" stroke="#ffd400" stroke-width="4" stroke-linejoin="round"></polygon>'
            + "".join(f'<circle cx="{x}" cy="{y}" r="5" fill="#ffd400" stroke="#0b0b0b" stroke-width="2"></circle>' for x, y in ZP["dots"])
            + '<path d="M1150,771 L1188,771 M1176,760 L1190,771 L1176,782" fill="none" stroke="#35d0ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>'
            + '<text x="1140" y="760" fill="#ffffff" font-family="IBM Plex Sans" font-size="24" font-weight="600" text-anchor="end" class="halo">Òdena, 42,6 km</text>')
def vrow(ft, st, c8, c9, top=False):
    def cell(r, k, g):
        return f'<span style="display: flex; align-items: center; gap: 5px;">{arrow(r, 14)}<span class="num" style="font-size: 13px;">{k}</span><span class="num" style="font-size: 11px; color: #898781;">{g:03d}°</span></span>'
    return f'<div style="display: grid; grid-template-columns: 92px repeat(2, minmax(0, 1fr)); align-items: center; height: 27px; border-bottom: 1px solid #262624;"><span style="display: flex; flex-direction: column; line-height: 1.1;"><span class="num" style="font-size: 13px;">{ft}</span><span style="font-size: 10px; color: #898781;">{st}</span></span>{cell(*c8)}{cell(*c9)}</div>'
VENT = (vrow("5 250 ft", "4 000 ft sobre terra", (131, "8,1", 131), (131, "7,3", 131))
        + '<div style="display: flex; align-items: center; gap: 6px; height: 18px;"><span style="flex-grow: 1; height: 0; border-top: 2px solid #d4a59c;"></span><span class="num" style="font-size: 10px; color: #d4a59c;">4 500 ft · sostre de la G, per sobre TMA classe D</span></div>'
        + vrow("4 250 ft", "3 000 ft sobre terra", (122, "7,2", 122), (119, "6,5", 119))
        + vrow("3 250 ft", "2 000 ft sobre terra", (104, "7,1", 104), (100, "6,5", 100))
        + vrow("2 250 ft", "1 000 ft sobre terra", (76, "6,9", 76), (77, "6,6", 77))
        + vrow("1 570 ft", "100 m", (63, "4,9", 63), (65, "4,3", 65))
        + vrow("1 410 ft", "50 m", (47, "3,4", 47), (48, "3,2", 48))
        + vrow("1 280 ft", "terra, 10 m", (354, "2,3", 354), (5, "2,2", 5)))
traj_main = f'''  <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 14px 24px 16px; display: flex; flex-direction: column; gap: 10px;">
{HEADER}
{tabs("Trajectòries")}
    <div style="flex-grow: 1; min-height: 0; display: flex; gap: 14px;">
      <div style="display: flex; flex-direction: column; gap: 5px;">
        {mapa(668, 501, overlay_btns(["Afegir waypoint", "Afegir camp"]) + chr(10) + '          <button style="position: absolute; left: 10px; bottom: 10px; height: 40px; padding: 0 14px; border-radius: 9px; border: 0; background: #2a78d6; color: #ffffff; font-family: inherit; font-size: 14px; font-weight: 600;">Buscar camps per aterrar a la zona</button>', ZONE_SVG)}
        <div style="font-size: 11px; color: #898781;">En groc, on pots acabar a les 09:30 segons com volis: 4 maneres de volar amb 7 models. Pronòstic del 09/10 al vespre. Ortofoto ICGC, línies d'OpenStreetMap.</div>
      </div>
      <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px;">
        <section aria-label="On pots acabar" style="{CARD} padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
          <span class="lab">On pots acabar a les 09:30</span>
          <span class="num" style="font-size: 14px; line-height: 1.4;">De 2,2 a 17,7 km de l'enlairament, entre el 320 i el 108°, segons com volis.</span>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px;">
            <div style="border-radius: 9px; border: 2px solid #ffd400; background: #2a2716; padding: 6px 10px; display: flex; flex-direction: column; gap: 1px;">
              <span style="display: flex; justify-content: space-between; align-items: baseline;"><span style="font-size: 13px; font-weight: 600;">A prop de Tàrrega</span><span style="font-size: 10px; color: #1a1a19; background: #ffd400; border-radius: 7px; padding: 1px 6px; font-weight: 600;">Recomanat</span></span>
              <span class="num" style="font-size: 19px;">6,1 km</span>
            </div>
            <div style="border-radius: 9px; border: 1px solid #2c2c2a; background: #1d1d1b; padding: 7px 11px; display: flex; flex-direction: column; gap: 1px;">
              <span style="font-size: 13px; font-weight: 500;">A prop d'Òdena</span>
              <span class="num" style="font-size: 19px;">33,6 km</span>
            </div>
          </div>
          <span style="font-size: 11px; line-height: 1.35; color: #898781;">El més a prop que es pot arribar, mediana de 7 models. Ara amb les 4 maneres de volar del generador. La app en provarà moltes més.</span>
        </section>
        <section aria-label="Vent per altura" style="{CARD} padding: 8px 12px; display: flex; flex-direction: column; gap: 2px;">
          <div style="display: grid; grid-template-columns: 92px repeat(2, minmax(0, 1fr)); align-items: end; padding-bottom: 3px;"><span class="lab">Vent, cap a</span><span class="lab num" style="letter-spacing: 0;">08:00</span><span class="lab num" style="letter-spacing: 0;">09:00</span></div>
          {VENT}
        </section>
        <section aria-label="Camps i waypoints" style="{CARD} padding: 10px 12px; display: flex; flex-direction: column; gap: 5px;">
          <span class="lab">Camps i waypoints del pla</span>
          <div style="display: grid; grid-template-columns: 62px minmax(0, 1fr); row-gap: 3px; font-size: 12px; color: #dcdbd3;"><span style="font-weight: 600; color: #3ad16b;">ZONA A</span><span class="num">048 a 060°, 4,2 a 5,6 km. Del pla.</span><span style="font-weight: 600; color: #3ad16b;">ZONA B</span><span class="num">345 a 358°, 6,5 a 8 km. Del pla.</span></div>
          <div style="font-size: 11px; line-height: 1.4; color: #898781;">El buscador marca bo un 90 % obert en 500 m, menys d'un 2 % de bosc en 300 m i menys d'un 1 % urbà. Després, sempre l'ortofoto.</div>
        </section>
      </div>
    </div>
  </main>'''
open(ROOT + "TauletaPlaTrajectories.dc.html", "w").write(page("Tauleta, Pla, Trajectòries", "Plans", traj_main))

# ---------- PLA, WAYPOINTS I ZONES ----------
ZONE_FAINT = f'<polygon points="{ZP["hull"]}" fill="#ffd400" fill-opacity="0.10" stroke="#ffd400" stroke-width="3" stroke-dasharray="10 8"></polygon>'
def wcard(nom, tipus, det, dins, actiu=False):
    st = "border: 2px solid #35d0ff; background: #1b2a33; padding: 8px 10px;" if actiu else "border: 1px solid #2c2c2a; background: #222220; padding: 9px 11px;"
    tag = ('<span style="font-size: 10px; color: #0b0b0b; background: #35d0ff; border-radius: 7px; padding: 1px 6px; font-weight: 600;">Actiu en començar</span>' if actiu else "")
    dz = ('<span style="font-size: 12px; color: #c9e7d2;">Dins de la zona on pots acabar</span>' if dins else '<span style="font-size: 12px; color: #fab219;">Fora de la zona on pots acabar</span>')
    return f"""<div style="border-radius: 10px; {st} display: flex; flex-direction: column; gap: 3px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;"><span style="font-size: 15px; font-weight: 600;">{nom} <span style="font-size: 12px; color: #898781; font-weight: 400;">{tipus}</span></span>{tag}</div>
            <span class="num" style="font-size: 12px; color: #c3c2b7;">{det}</span>
            {dz}
          </div>"""
WCARDS = (wcard("ZONA A", "zona", "144 ha · centre al 054°, a 4,9 km de l'enlairament", True, True)
          + wcard("ZONA B", "zona", "247 ha · centre al 352°, a 7,3 km de l'enlairament", False)
          + wcard("Tàrrega", "punt", "l'enlairament, per tornar-hi", True))
wp_main = f"""  <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 14px 24px 16px; display: flex; flex-direction: column; gap: 10px;">
{HEADER}
{tabs("Waypoints i zones")}
    <div style="flex-grow: 1; min-height: 0; display: flex; gap: 14px;">
      <div style="display: flex; flex-direction: column; gap: 5px;">
        {mapa(668, 501, overlay_btns(["Marcar al mapa", "Per coordenades"]), ZONE_FAINT)}
        <div style="font-size: 11px; color: #898781;">En verd, les zones del pla. Ratllada en groc, on pots acabar a les 09:30. Ortofoto ICGC, línies d'OpenStreetMap.</div>
      </div>
      <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;"><span class="lab">Waypoints del pla</span><span style="font-size: 12px; color: #898781;">3</span></div>
        {WCARDS}
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
          <a href="TauletaMarcarMapa.dc.html" style="height: 46px; border-radius: 10px; background: #2a78d6; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; display: flex; align-items: center; justify-content: center;">Marcar al mapa</a>
          <a href="TauletaCoordenades.dc.html" style="height: 46px; border-radius: 10px; border: 1px solid #2a78d6; color: #ffffff; font-size: 15px; text-decoration: none; display: flex; align-items: center; justify-content: center;">Per coordenades</a>
        </div>
        <span style="font-size: 12px; line-height: 1.4; color: #898781;">Punts o zones. A una zona, la app hi navega pel centre. En vol tens aquests mateixos i n'hi pots afegir més des de la <a href="TauletaWaypoints.dc.html">pantalla de vol</a>.</span>
      </div>
    </div>
  </main>"""
open(ROOT + "TauletaPlaWaypoints.dc.html", "w").write(page("Tauleta, Pla, Waypoints", "Plans", wp_main))

# ---------- PLA, ESPAI AERI I ENAIRE ----------
def yft(ft): return round(452 - ft/8000*420, 1)
AIR = f"""<svg width="430" height="470" viewBox="0 0 430 470" role="img" aria-label="Espai aeri sobre Tàrrega: classe G fins a 4 500 ft, amb la capa G de la TMA des de 1 000 ft sobre el terreny, i classe D per sobre">
          <defs><pattern id="ratlla" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#22261f"></rect><line x1="0" y1="0" x2="0" y2="10" stroke="#6b5420" stroke-width="4"></line></pattern></defs>
          <rect x="60" y="{yft(8000)}" width="200" height="{yft(4500)-yft(8000)}" fill="#2a1d1b"></rect>
          <rect x="60" y="{yft(4500)}" width="200" height="{yft(1247)-yft(4500)}" fill="#1f2a22"></rect>
          <rect x="60" y="{yft(4500)}" width="200" height="{yft(2247)-yft(4500)}" fill="url(#ratlla)"></rect>
          <rect x="60" y="{yft(1247)}" width="200" height="{452-yft(1247)}" fill="#3a3024"></rect>
          <line x1="60" y1="{yft(4500)}" x2="260" y2="{yft(4500)}" stroke="#d4a59c" stroke-width="2"></line>
          <line x1="60" y1="{yft(3937)}" x2="260" y2="{yft(3937)}" stroke="#c3c2b7" stroke-width="1.5" stroke-dasharray="6 5"></line>
          <line x1="60" y1="{yft(6500)}" x2="260" y2="{yft(6500)}" stroke="#35d0ff" stroke-width="2.5"></line>
          <text x="70" y="{yft(8000)+18}" fill="#ecd9d4" font-family="IBM Plex Sans" font-size="13" font-weight="600">TMA Barcelona, classe D</text>
          <text x="70" y="{yft(8000)+34}" fill="#d4a59c" font-family="IBM Plex Sans" font-size="11">fins a FL145 · pla de vol i autorització</text>
          <text x="70" y="{yft(4500)+16}" fill="#f0d79a" font-family="IBM Plex Sans" font-size="12" font-weight="600">TMA, capa G</text>
          <text x="70" y="{yft(4500)+31}" fill="#f0d79a" font-family="IBM Plex Sans" font-size="11">transpondedor? per confirmar</text>
          <text x="70" y="{yft(2247)+18}" fill="#c9e7d2" font-family="IBM Plex Sans" font-size="12" font-weight="600">Classe G</text>
          <text x="70" y="{yft(1247)+20}" fill="#c3c2b7" font-family="IBM Plex Sans" font-size="11">Tàrrega, 1 250 ft</text>
          <text x="268" y="{yft(4500)+4}" fill="#d4a59c" font-family="IBM Plex Mono" font-size="11">4 500 ft · sostre G</text>
          <text x="268" y="{yft(2247)+4}" fill="#f0d79a" font-family="IBM Plex Mono" font-size="11">2 250 ft · 1 000 sobre terra</text>
          <text x="268" y="{yft(3937)+4}" fill="#c3c2b7" font-family="IBM Plex Mono" font-size="11">3 940 ft · sostre del pla</text>
          <text x="268" y="{yft(6500)+4}" fill="#35d0ff" font-family="IBM Plex Mono" font-size="11">6 500 ft · exemple A065</text>
          <line x1="60" y1="{yft(2247)}" x2="260" y2="{yft(2247)}" stroke="#8a6a1f" stroke-width="1"></line>
          <text x="52" y="{yft(2000)+4}" fill="#898781" font-family="IBM Plex Mono" font-size="10" text-anchor="end">2 000</text>
          <text x="52" y="{yft(4000)+4}" fill="#898781" font-family="IBM Plex Mono" font-size="10" text-anchor="end">4 000</text>
          <text x="52" y="{yft(6000)+4}" fill="#898781" font-family="IBM Plex Mono" font-size="10" text-anchor="end">6 000</text>
          <text x="52" y="{yft(8000)+4}" fill="#898781" font-family="IBM Plex Mono" font-size="10" text-anchor="end">8 000 ft</text>
        </svg>"""
def fpl(cas, val, nota="", gap=False):
    v = f'<span class="num" style="font-size: 14px; color: {"#fab219" if gap else "#ffffff"};">{val}</span>'
    n = f'<span style="font-size: 11px; color: #898781;">{nota}</span>' if nota else ""
    return f'<div style="display: grid; grid-template-columns: 34px minmax(0, 1fr); column-gap: 8px; align-items: baseline; padding: 4px 0; border-bottom: 1px solid #262624;"><span class="num" style="font-size: 12px; color: #898781;">{cas}</span><span style="display: flex; flex-direction: column; gap: 1px;">{v}{n}</span></div>'
FPL = (fpl("7", "[MATRÍCULA], sense guió", "la del Perfil")
       + fpl("8", "V G", "VFR, aviació general")
       + fpl("9", "BALL/L", "globus, estela lleugera")
       + fpl("10", "VY / ?", "ràdio de 8,33 kHz. Transpondedor S o C: no està al Perfil", True)
       + fpl("13", "ZZZZ 0600", "camp sense indicador, 08:00 en UTC")
       + fpl("15", "? A065 DCT 4139N00112E DCT 4139N00114E DCT 4140N00116E", "velocitat: un globus no en té, per confirmar amb l'ARO. Ruta de 30 en 30 min", True)
       + fpl("16", "ZZZZ 0130 ?", "destí desconegut: per confirmar amb l'ARO", True)
       + fpl("18", "DEP/TARREGA 4139N00109E DOF/261010 RMK/GLOBUS AIRE CALENT", "")
       + fpl("19", "E/0200 P/2 A/[COLOR] C/[PILOT AL COMANDAMENT]", "80 kg de propà a 40 kg/h"))
STEP = lambda h, t: f'<div style="display: grid; grid-template-columns: 74px minmax(0, 1fr); column-gap: 8px; font-size: 13px; line-height: 1.35;"><span class="num" style="color: #ffffff;">{h}</span><span style="color: #dcdbd3;">{t}</span></div>'
STEPS = (STEP("abans 07:00", "Presentar-lo a ICARO, com a mínim 60 min abans")
         + STEP("en vol", "Barcelona Control 127,700 abans d'entrar")
         + STEP("si tard", "Més de 30 min de retard: DLA")
         + STEP("en aterrar", "ARR per telèfon a l'ARO, +34 918 603 561"))
en_main = f"""  <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 14px 24px 14px; display: flex; flex-direction: column; gap: 10px;">
{HEADER}
{tabs("Espai aeri i ENAIRE")}
    <div style="flex-grow: 1; min-height: 0; display: flex; gap: 16px;">
      <section aria-label="Espai aeri" style="width: 452px; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px;">
        <span class="lab">Espai aeri a l'enlairament</span>
        {AIR}
        <div style="font-size: 12px; line-height: 1.45; color: #c3c2b7;">Cervera, al sector de 5 500 ft. CTR de Lleida, classe D de terra a 3 000 ft, només en horari ATS. AIP ENR 2.1 i carta VFR.</div>
        <div style="background: #2a2416; border: 1px solid #5a4719; border-radius: 10px; padding: 8px 11px; font-size: 12px; line-height: 1.45; color: #f0d79a;">ENR 1.6 demana transpondedor a tota la TMA «a qualsevol nivell». Llegit al peu de la lletra, també a la capa G des de 1 000 ft sobre terra. Pregunta-ho a l'escola.</div>
      </section>
      <section aria-label="Pla de vol ATS" style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="lab" style="flex-grow: 1;">Pla de vol per a ENAIRE</span>
          <label for="ctrl2" style="display: flex; align-items: center; gap: 8px; font-size: 14px;"><input id="ctrl2" type="checkbox" checked style="width: 22px; height: 22px; accent-color: #2a78d6;">Pujar a l'espai controlat</label>
        </div>
        <span style="font-size: 12px; color: #898781;">Exemple amb sostre a 6 500 ft: el pla del 10/10 no hi pujava. En àmbar, el que cal confirmar.</span>
        <div style="{CARD} padding: 6px 12px; display: flex; flex-direction: column;">{FPL}</div>
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
          <button style="height: 44px; border-radius: 10px; border: 0; background: #2a78d6; color: #ffffff; font-family: inherit; font-size: 15px; font-weight: 600;">Copiar per a ICARO</button>
          <a href="https://notampib.enaire.es" style="height: 44px; border-radius: 10px; border: 1px solid #45443f; color: #ffffff; font-size: 15px; text-decoration: none; display: flex; align-items: center; justify-content: center;">Obrir ICARO ↗</a>
        </div>
        <div style="{CARD} padding: 8px 12px; display: flex; flex-direction: column; gap: 4px;">{STEPS}</div>
      </section>
    </div>
  </main>"""
open(ROOT + "TauletaPlaEnaire.dc.html", "w").write(page("Tauleta, Pla, Espai aeri i ENAIRE", "Plans", en_main))

# ---------- AFEGIR PUNT D'ENLAIRAMENT ----------
OX, OY = -50, 0     # desplaçament de la imatge perquè el píxel (420, 380) quedi sota la creu
def mk(p, lab):
    x, y = p[0], p[1]
    return (f'<circle cx="{x}" cy="{y}" r="10" fill="#ffffff" stroke="#0b0b0b" stroke-width="4"></circle>'
            f'<text x="{x+16}" y="{y+8}" fill="#ffffff" font-family="IBM Plex Sans" font-size="22" font-weight="600" class="halo">{lab}</text>')
enl_main = f"""  <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 14px 24px 14px; display: flex; gap: 16px;">
    <div style="position: relative; width: 740px; height: 772px; flex-shrink: 0; border-radius: 12px; overflow: hidden; background: #2c2c2a;">
      <img src="{BLOB}" alt="Ortofoto del ICGC al nord de Tàrrega" style="position: absolute; left: {OX}px; top: {OY}px; width: 1200px; height: 900px;">
      <svg width="1200" height="900" viewBox="0 0 1200 900" style="position: absolute; left: {OX}px; top: {OY}px;" role="img" aria-label="Línies elèctriques i llocs d'enlairament guardats">
{LINES}
{PLACES}
        {mk(TA, "Tàrrega")}
        {mk(AG, "Agramunt")}
      </svg>
      <svg width="64" height="64" viewBox="0 0 64 64" style="position: absolute; left: 338px; top: 354px;" aria-hidden="true">
        <circle cx="32" cy="32" r="16" fill="none" stroke="#0b0b0b" stroke-width="5" stroke-opacity="0.6"></circle>
        <circle cx="32" cy="32" r="16" fill="none" stroke="#ffffff" stroke-width="2.5"></circle>
        <path d="M32 2v20M32 42v20M2 32h20M42 32h20" stroke="#0b0b0b" stroke-width="5" stroke-opacity="0.6"></path>
        <path d="M32 2v20M32 42v20M2 32h20M42 32h20" stroke="#ffffff" stroke-width="2.5"></path>
      </svg>
      <div style="position: absolute; left: 14px; top: 14px; background: rgba(26,26,25,.9); border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #c3c2b7;">Mou el mapa fins que la creu caigui al punt d'enlairament</div>
      <div style="position: absolute; right: 14px; top: 14px; display: flex; flex-direction: column; gap: 8px;">
        <button aria-label="Apropar" style="width: 52px; height: 52px; border-radius: 10px; border: none; background: rgba(26,26,25,.9); color: #ffffff; font-size: 26px; font-family: 'IBM Plex Mono', monospace;">+</button>
        <button aria-label="Allunyar" style="width: 52px; height: 52px; border-radius: 10px; border: none; background: rgba(26,26,25,.9); color: #ffffff; font-size: 26px; font-family: 'IBM Plex Mono', monospace;">−</button>
      </div>
      <div style="position: absolute; left: 14px; bottom: 12px; font-size: 11px; color: #ffffff; text-shadow: 0 0 3px #000;">Ortofoto ICGC, CC BY 4.0. Línies d'OpenStreetMap.</div>
    </div>
    <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px;">
      <a href="TauletaPlans.dc.html" style="font-size: 14px; text-decoration: none;">‹ Plans</a>
      <h1 style="margin: 0; font-size: 22px; font-weight: 600;">Afegir punt d'enlairament</h1>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; background: #121211; border: 1px solid #2c2c2a; border-radius: 10px; padding: 3px;">
        <button aria-pressed="true" style="height: 40px; border: 0; border-radius: 7px; background: #2a78d6; color: #ffffff; font-family: inherit; font-size: 15px; font-weight: 600;">Al mapa</button>
        <button aria-pressed="false" style="height: 40px; border: 0; border-radius: 7px; background: transparent; color: #c3c2b7; font-family: inherit; font-size: 15px;">Per coordenades</button>
      </div>
      <label for="enl-nom" style="display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #c3c2b7;">Nom
        <input id="enl-nom" placeholder="Per exemple, Camp nord" style="height: 44px; border-radius: 8px; border: 1px solid #45443f; background: #1a1a19; color: #ffffff; font-family: inherit; font-size: 16px; padding: 0 12px;">
      </label>
      <div style="{CARD} padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="lab">Sota la creu</span>
          <div style="display: flex; gap: 4px;">
            <button aria-pressed="true" style="height: 28px; padding: 0 9px; border-radius: 6px; border: 0; background: #2a78d6; color: #ffffff; font-family: inherit; font-size: 12px;">Decimal</button>
            <button aria-pressed="false" style="height: 28px; padding: 0 9px; border-radius: 6px; border: 1px solid #2c2c2a; background: transparent; color: #c3c2b7; font-family: inherit; font-size: 12px;">G M S</button>
            <button aria-pressed="false" style="height: 28px; padding: 0 9px; border-radius: 6px; border: 1px solid #2c2c2a; background: transparent; color: #c3c2b7; font-family: inherit; font-size: 12px;">UTM</button>
          </div>
        </div>
        <span class="num" style="font-size: 22px; font-weight: 500;">41,6956 N 1,1779 E</span>
        <span class="num" style="font-size: 12px; line-height: 1.5; color: #898781;">41°41'44" N 1°10'40" E<br>UTM 31, 348378 4617588</span>
        <div style="display: flex; align-items: baseline; justify-content: space-between; padding-top: 6px; border-top: 1px solid #2c2c2a;">
          <span style="font-size: 14px; color: #c3c2b7;">Elevació</span>
          <span class="num" style="font-size: 18px;">394 m</span>
        </div>
        <span style="font-size: 12px; line-height: 1.4; color: #898781;">Del model de terreny de 90 m. Si la saps millor, canvia-la.</span>
      </div>
      <label for="enl-acces" style="display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #c3c2b7;">Accés en cotxe
        <textarea id="enl-acces" rows="3" placeholder="Per on s'hi arriba amb el cotxe i el remolc" style="border-radius: 8px; border: 1px solid #45443f; background: #1a1a19; color: #ffffff; font-family: inherit; font-size: 15px; padding: 10px 12px; resize: none;"></textarea>
      </label>
      <span style="flex-grow: 1;"></span>
      <a href="TauletaPlans.dc.html" style="height: 52px; border-radius: 10px; background: #2a78d6; color: #ffffff; font-size: 17px; font-weight: 600; text-decoration: none; display: flex; align-items: center; justify-content: center;">Desar el punt</a>
    </div>
  </main>"""
open(ROOT + "TauletaAfegirEnlairament.dc.html", "w").write(page("Tauleta, Afegir punt d'enlairament", "Plans", enl_main))

# ---------- PLA NOU ----------
def spark(pts, on):
    col = "#ffd400" if on else "#8f8d86"
    p = " ".join(f"{round(t/90*120,1)},{round(34-(a-380)/870*32,1)}" for t, a in pts)
    return f'<svg width="120" height="36" viewBox="0 0 120 36" aria-hidden="true"><line x1="0" y1="34" x2="120" y2="34" stroke="#45443f" stroke-width="1"></line><polyline points="{p}" fill="none" stroke="{col}" stroke-width="2.5" stroke-linejoin="round"></polyline></svg>'
def pcard(name, txt, on=False):
    st = "border: 2px solid #ffd400; background: #2a2716; padding: 9px 11px;" if on else "border: 1px solid #2c2c2a; background: #222220; padding: 10px 12px;"
    return f'<button aria-pressed="{"true" if on else "false"}" style="font-family: inherit; text-align: left; color: #ffffff; border-radius: 10px; {st} display: flex; flex-direction: column; gap: 4px;"><span class="num" style="font-size: 15px; font-weight: {600 if on else 500};">{name}</span>{spark(PROF[name], on)}<span style="font-size: 12px; line-height: 1.35; color: #c3c2b7;">{txt}</span></button>'
def chip(t, on=False, w=""):
    st = "border: 2px solid #2a78d6; background: #1d2c40; color: #ffffff; font-weight: 600;" if on else "border: 1px solid #2c2c2a; background: #222220; color: #c3c2b7;"
    return f'<button aria-pressed="{"true" if on else "false"}" class="num" style="height: 40px; padding: 0 12px; border-radius: 8px; {st} font-size: 14px;{w}">{t}</button>'
def field(lab, body):
    return f'<div style="display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid #262624;"><span style="font-size: 14px; color: #c3c2b7;">{lab}</span><div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0;">{body}</div></div>'
INP = 'height: 40px; border-radius: 8px; border: 1px solid #45443f; background: #1a1a19; color: #ffffff; font-family: \'IBM Plex Mono\', monospace; font-size: 16px; padding: 0 10px;'
F0 = field("Lloc d'enlairament", '<button style="height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid #45443f; background: #1a1a19; color: #ffffff; font-family: inherit; font-size: 15px;">Tàrrega · <span class="num">380 m</span> ▾</button><span class="num" style="font-size: 12px; color: #898781;">41,6561 N 1,1490 E</span><a href="TauletaAfegirEnlairament.dc.html" style="font-size: 13px;">Afegir punt</a><a href="https://www.windy.com/" style="font-size: 13px;">Obrir Windy ↗</a>')
F1 = field("Dia", chip("dl 12/10", True) + chip("dt 13/10") + chip("dc 14/10") + '<button style="height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid #2c2c2a; background: transparent; color: #c3c2b7; font-family: inherit; font-size: 14px;">Un altre dia</button>')
F2 = field("Hores", '<label for="h-enl" style="font-size: 13px; color: #898781;">Enlairament</label><input id="h-enl" value="08:00" style="width: 74px; ' + INP + '"><label for="h-ate" style="font-size: 13px; color: #898781;">Aterratge</label><input id="h-ate" value="09:30" style="width: 74px; ' + INP + '"><span class="num" style="font-size: 13px; color: #c3c2b7;">1 h 30 min · crepuscle 07:35, orto 08:04</span>')
F3 = field("Tripulació", '<span style="font-size: 14px;">Dídac <span class="num" style="color: #898781;">80 kg</span></span><span style="width: 8px;"></span><span style="font-size: 13px; color: #898781;">Instructor</span>' + chip("Marc 75 kg", True) + chip("Pere 70 kg") + chip("Cap"))
F4 = field("Globus", '<button style="height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid #45443f; background: #1a1a19; color: #ffffff; font-family: inherit; font-size: 15px;">M-65 · C-1 · MK-32 doble ▾</button><span class="num" style="font-size: 12px; color: #898781;">[MATRÍCULA]</span>')
F5 = field("Bombones", chip("M-40", True) + chip("M-30") + '<span style="width: 6px;"></span><button aria-label="Una menys" style="width: 40px; height: 40px; border-radius: 8px; border: 1px solid #45443f; background: #1a1a19; color: #ffffff; font-size: 20px;">−</button><span class="num" style="font-size: 18px; width: 20px; text-align: center;">2</span><button aria-label="Una més" style="width: 40px; height: 40px; border-radius: 8px; border: 1px solid #45443f; background: #1a1a19; color: #ffffff; font-size: 20px;">+</button><span class="num" style="font-size: 13px; color: #c3c2b7;">80 kg de propà</span>')
F6 = field("Sostre", '<input id="sostre" value="1 200" aria-label="Sostre en metres" style="width: 84px; ' + INP + '"><span class="num" style="font-size: 13px; color: #c3c2b7;">m · 3 937 ft</span><span style="width: 10px;"></span><label for="ctrl" style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #ffffff;"><input id="ctrl" type="checkbox" style="width: 22px; height: 22px; accent-color: #2a78d6;">Pujar a l\'espai controlat</label><span style="font-size: 12px; color: #898781;">per sobre de 4 500 ft cal pla de vol d\'ENAIRE</span>')
ON_ACABAR = """<div style="display: flex; flex-direction: column; gap: 8px; padding: 10px 0; border-bottom: 1px solid #262624;">
          <div style="display: flex; align-items: baseline; justify-content: space-between;"><span style="font-size: 14px; color: #c3c2b7;">On acabar</span><span style="font-size: 12px; color: #898781;">Mediana de 7 models, i el millor i el pitjor</span></div>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) 150px; gap: 8px;">
            <button aria-pressed="true" style="font-family: inherit; text-align: left; color: #ffffff; border-radius: 10px; border: 2px solid #ffd400; background: #2a2716; padding: 9px 12px; display: flex; flex-direction: column; gap: 3px;">
              <span style="display: flex; justify-content: space-between; width: 100%; align-items: baseline;"><span style="font-size: 15px; font-weight: 600;">Tornar a Tàrrega</span><span style="font-size: 11px; color: #1a1a19; background: #ffd400; border-radius: 8px; padding: 1px 7px; font-weight: 600;">Recomanat</span></span>
              <span class="num" style="font-size: 24px; font-weight: 500;">2,7 km</span>
              <span class="num" style="font-size: 12px; color: #c3c2b7;">el més a prop que pots acabar, mediana de 7 models</span>
            </button>
            <button aria-pressed="false" style="font-family: inherit; text-align: left; color: #ffffff; border-radius: 10px; border: 1px solid #2c2c2a; background: #222220; padding: 10px 13px; display: flex; flex-direction: column; gap: 3px;">
              <span style="font-size: 15px; font-weight: 500;">Cap a la base, Òdena</span>
              <span class="num" style="font-size: 24px; font-weight: 500;">42,7 km</span>
              <span class="num" style="font-size: 12px; color: #c3c2b7;">no t'hi acostes: és a 42,6 km al 100°</span>
            </button>
            <button style="font-family: inherit; color: #c3c2b7; border-radius: 10px; border: 1px dashed #45443f; background: transparent; font-size: 14px;">Un altre punt</button>
          </div>
          <span style="font-size: 12px; line-height: 1.4; color: #898781;">La app prova moltes maneres de volar amb el vent previst. Com volar ho decideixes tu, també en vol.</span>
        </div>"""
nou_main = f"""  <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 14px 24px 16px; display: flex; flex-direction: column; gap: 10px;">
    <div style="display: flex; flex-direction: column; gap: 3px;">
      <a href="TauletaPlans.dc.html" style="font-size: 14px; text-decoration: none;">‹ Plans</a>
      <div style="display: flex; align-items: baseline; gap: 14px;">
        <h1 style="margin: 0; font-size: 25px; font-weight: 600;">Pla nou</h1>
        <span style="font-size: 13px; color: #898781;">Des del cribratge: Tàrrega, dilluns 12/10</span>
      </div>
    </div>
    <div style="flex-grow: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 384px; gap: 18px;">
      <div style="display: flex; flex-direction: column; min-width: 0;">
        {F0}
        {F1}
        {F2}
        {F3}
        {F4}
        {F5}
        {ON_ACABAR}
        {F6}
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px; min-width: 0;">
        <section aria-label="Meteo de la finestra" style="{CARD} padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
          <span class="lab">Meteo de 08:00 a 09:30, cribratge de les 11:50</span>
          <div style="display: grid; grid-template-columns: 54px minmax(0, 1fr); row-gap: 5px; align-items: center;">
            <span class="num" style="font-size: 13px; color: #898781;">08:00</span><span style="display: flex; align-items: center; gap: 7px;">{arrow(310)}<span class="num" style="font-size: 15px;">3,1 kt <span style="font-size: 12px; color: #898781;">a 3,7 · cap a 310°</span></span></span>
            <span class="num" style="font-size: 13px; color: #898781;">09:00</span><span style="display: flex; align-items: center; gap: 7px;">{arrow(299)}<span class="num" style="font-size: 15px;">3,1 kt <span style="font-size: 12px; color: #898781;">a 3,9 · cap a 299°</span></span></span>
          </div>
          <span class="num" style="font-size: 13px; line-height: 1.5; color: #dcdbd3;">Ràfega fins a 5,6 kt. Visibilitat de 15,7 km o més. Pluja: cap model. Sense boira.</span>
        </section>
        <section aria-label="Massa" style="{CARD} padding: 12px 14px; display: flex; flex-direction: column; gap: 5px;">
          <span class="lab">Massa a l'enlairament</span>
          <div style="display: grid; grid-template-columns: minmax(0, 1fr) auto; row-gap: 3px; font-size: 13px; color: #c3c2b7;">
            <span>Globus buit</span><span class="num" style="text-align: right; color: #ffffff;">171 kg + cremador</span>
            <span>2 M-40 plenes</span><span class="num" style="text-align: right; color: #ffffff;">128 kg</span>
            <span>Dídac i Marc</span><span class="num" style="text-align: right; color: #ffffff;">155 kg</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: 5px; border-top: 1px solid #2c2c2a;"><span style="font-size: 14px;">Total</span><span class="num" style="font-size: 17px;">457 kg + cremador</span></div>
          <span style="font-size: 12px; color: #f0d79a;">Falta la massa del MK-32 doble al Perfil. MTOM 638 kg.</span>
        </section>
        <section aria-label="Què calcula" style="{CARD} padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;">
          <span class="lab">En calcular el pla</span>
          <span style="font-size: 13px; line-height: 1.5; color: #dcdbd3;">Com acabar a prop amb 7 models, vent de 10 m a 4 000 ft, emergència per sobre del sostre, taula de càrrega, combustible, i AEMET de Tàrrega.</span>
        </section>
        <span style="flex-grow: 1;"></span>
        <a href="TauletaPla.dc.html" style="height: 56px; border-radius: 12px; background: #2a78d6; color: #ffffff; font-size: 18px; font-weight: 600; text-decoration: none; display: flex; align-items: center; justify-content: center;">Calcular el pla</a>
      </div>
    </div>
  </main>"""
open(ROOT + "TauletaPlaNou.dc.html", "w").write(page("Tauleta, Pla nou", "Plans", nou_main))

# ---------- METEO I LLOC D'ENLAIRAMENT ----------
import math as _m
GRID = json.load(open(G + "vent_grid_12-10.json"))
OR = json.load(open(G + "orto_regio.json"))
BLOB2 = "/_blob/b6cc2611a6fc1a542b334b20e2bb7be1"
def _merc(lat, lon): return (_m.radians(lon)*6378137.0, _m.log(_m.tan(_m.pi/4+_m.radians(lat)/2))*6378137.0)
X0r, Y0r, X1r, Y1r = OR["bbox_merc"]; WR, HR = OR["W"], OR["H"]
def rp(lat, lon):
    x, y = _merc(lat, lon); return (round((x-X0r)/(X1r-X0r)*WR, 1), round((Y1r-y)/(Y1r-Y0r)*HR, 1))
def col(kt):
    for lim, c in ((2, "#7fb3e0"), (4, "#4cc38a"), (6, "#c9d84a"), (8, "#f2c14e"), (12, "#f08a3e")):
        if kt < lim: return c
    return "#e0524b"
LV = "925hPa"; HH = "08:00"
arrows = []
for g in GRID:
    kt, frm = g[HH][LV]
    if kt is None: continue
    x, y = rp(g["lat"], g["lon"]); L = 16 + kt*5; to = (frm + 180) % 360
    arrows.append(f'<g transform="translate({x} {y}) rotate({to})"><path d="M0,{L/2} L0,{-L/2+9}" stroke="#0b0b0b" stroke-opacity="0.55" stroke-width="7" stroke-linecap="round"></path><path d="M0,{L/2} L0,{-L/2+9}" stroke="{col(kt)}" stroke-width="4" stroke-linecap="round"></path><path d="M0,{-L/2} L7,{-L/2+11} L-7,{-L/2+11} Z" fill="{col(kt)}" stroke="#0b0b0b" stroke-width="1.5"></path></g>')
z925 = sum(g[HH]["z925"] for g in GRID)/len(GRID); z850 = sum(g[HH]["z850"] for g in GRID)/len(GRID)
ft925 = int(round(z925/0.3048, -2)); ft850 = int(round(z850/0.3048, -2))
C12 = json.load(open("/private/tmp/claude-501/-Users-didac-High-Frontier-Pilot-Globus/6c858963-174c-4355-9fb5-f3512c1fe575/scratchpad/gen12/carta_tarrega_12-10-2026_datos.json"))
trk = []
for m, pts in C12["tracks"]["dues"].items():
    p = " ".join(f"{x},{y}" for x, y in (rp(a, b) for a, b, t in pts))
    trk.append(f'<polyline points="{p}" fill="none" stroke="#0b0b0b" stroke-opacity="0.5" stroke-width="7" stroke-linejoin="round"></polyline><polyline points="{p}" fill="none" stroke="#ffd400" stroke-width="3.5" stroke-linejoin="round"></polyline>')
def site(lat, lon, lab, base=False):
    x, y = rp(lat, lon)
    if base:
        return f'<rect x="{x-11}" y="{y-11}" width="22" height="22" rx="4" fill="#35d0ff" stroke="#0b0b0b" stroke-width="3"></rect><text x="{x+18}" y="{y+8}" fill="#ffffff" font-family="IBM Plex Sans" font-size="24" font-weight="600" class="halo">{lab}</text>'
    return f'<circle cx="{x}" cy="{y}" r="10" fill="#ffffff" stroke="#0b0b0b" stroke-width="4"></circle><text x="{x+16}" y="{y+8}" fill="#ffffff" font-family="IBM Plex Sans" font-size="24" font-weight="600" class="halo">{lab}</text>'
SITESVG = site(41.656127, 1.149041, "Tàrrega") + site(41.7577, 1.0871, "Agramunt") + site(41.7782, 0.8616, "Balaguer A") + site(41.5842, 1.6528, "Base, Òdena", True)
MW, MH = 744, round(744*HR/WR)
def mini(rot, kt):
    return f'<span style="display: inline-flex; flex-direction: column; align-items: center; gap: 1px; width: 52px;">{arrow(rot, 14)}<span class="num" style="font-size: 11px; color: #dcdbd3;">{kt}</span></span>'
def scard(nom, rec, tor, tor_r, estr, od, t, raf, grad, on=False):
    st = "border: 2px solid #ffd400; background: #2a2716; padding: 9px 11px;" if on else f"border: 1px solid #2c2c2a; background: #222220; padding: 10px 12px;"
    chip = '<span style="font-size: 11px; color: #1a1a19; background: #ffd400; border-radius: 8px; padding: 1px 7px; font-weight: 600;">Recomanat</span>' if on else ""
    g = "".join(mini(r, k) for r, k in grad)
    return f"""<div style="border-radius: 10px; {st} display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;"><span style="font-size: 15px; font-weight: 600;">{nom}</span>{chip}</div>
            <div class="num" style="font-size: 13px; color: #ffffff;">{rec} <span style="font-size: 18px;">{tor}</span> <span style="font-size: 11px; color: #898781;">{tor_r} · {estr}</span></div>
            <div class="num" style="font-size: 12px; color: #c3c2b7;">{od} · {t} · ràfega {raf}</div>
            <div style="display: flex; gap: 2px; align-items: flex-end;">{g}<a href="TauletaPlaNou.dc.html" style="margin-left: auto; font-size: 12px;">Fer el pla</a></div>
          </div>"""
CARDS = (scard("Tàrrega", "Tornar a l'enlairament", "2,7 km", "0,4 a 9,6", "dues pujades", "Òdena a 42,7 km", "12,7 °C", "5,6 kt", [(302, "2,8"), (57, "4,4"), (346, "1,5"), (166, "5,6")], True)
       + scard("Agramunt", "Tornar a l'enlairament", "4,8 km", "1,5 a 12,5", "creuer", "Òdena a 51,6 km", "11,3 °C", "5,8 kt", [(249, "2,7"), (33, "3,6"), (295, "1,5"), (165, "5,7")])
       + scard("Igualada-Òdena", "Tornar a la base", "4,9 km", "1,7 a 7,5", "dues pujades", "és la base", "13,6 °C", "5,8 kt", [(164, "1,8"), (137, "1,6"), (347, "0,6"), (144, "5,6")])
       + scard("Balaguer A", "Tornar a l'enlairament", "7,8 km", "5,1 a 17,1", "baix", "Òdena a 73,3 km", "12,6 °C", "8,2 kt", [(230, "3,1"), (310, "1,3"), (263, "2,7"), (161, "5,4")]))
def hbtn(h, on=False):
    st = "background: #2a78d6; color: #ffffff; font-weight: 600;" if on else "background: transparent; color: #c3c2b7;"
    return f'<button aria-pressed="{"true" if on else "false"}" class="num" style="height: 34px; padding: 0 12px; border: 0; border-radius: 7px; {st} font-size: 14px;">{h}</button>'
LEG = '<span class="num">0</span><span style="width: 220px; height: 9px; border-radius: 3px; background: linear-gradient(90deg, rgb(98,113,183) 0%, rgb(57,160,200) 10%, rgb(76,195,138) 20%, rgb(140,200,75) 30%, rgb(216,214,65) 40%, rgb(242,163,58) 50%, rgb(224,82,75) 70%, rgb(168,58,139) 100%);"></span><span class="num">20 kt</span>' 
LVBTN = seg(["10 m", f"925 hPa · {ft925:,} ft".replace(",", " "), f"850 hPa · {ft850:,} ft".replace(",", " ")], f"925 hPa · {ft925:,} ft".replace(",", " "))
HBTN = '<div role="group" style="display: flex; gap: 3px; background: #121211; border: 1px solid #2c2c2a; border-radius: 9px; padding: 3px;">' + hbtn("07:00") + hbtn("08:00", True) + hbtn("09:00") + hbtn("10:00") + '</div>'
met_main = f"""  <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 14px 24px 14px; display: flex; flex-direction: column; gap: 10px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1;">
        <a href="TauletaPlans.dc.html" style="font-size: 14px; text-decoration: none;">‹ Plans</a>
        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">On enlairar-se dilluns 12/10</h1>
      </div>
      {chip("dl 12/10", True)}{chip("dt 13/10")}{chip("dc 14/10")}
    </div>
    <div style="flex-grow: 1; min-height: 0; display: flex; gap: 14px;">
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">{LVBTN}<span style="flex-grow: 1;"></span>{HBTN}<button style="height: 40px; padding: 0 12px; border-radius: 8px; border: 1px solid #45443f; background: #1a1a19; color: #ffffff; font-family: inherit; font-size: 14px;">▶ Animar</button></div>
        <div style="position: relative; width: {MW}px; height: {MH}px; border-radius: 12px; overflow: hidden; background: #2c2c2a;">
          <img src="{BLOB2}" alt="Ortofoto del ICGC de Balaguer a Igualada" style="position: absolute; left: 0; top: 0; width: {MW}px; height: {MH}px; filter: brightness(0.62) saturate(0.7);">
          <img src="/_blob/bb7dcef90db97983a13c96fd2407e23d" alt="Velocitat del vent en color i línies de flux" style="position: absolute; left: 0; top: 0; width: {MW}px; height: {MH}px; opacity: 0.86;">
          <svg width="{MW}" height="{MH}" viewBox="0 0 {WR} {HR}" style="position: absolute; left: 0; top: 0;" role="img" aria-label="Vent a 925 hPa a les 08:00, llocs d'enlairament i la base">
            {"".join(trk)}
            {SITESVG}
          </svg>
          <div style="position: absolute; left: 10px; bottom: 10px; background: rgba(18,18,17,.88); border-radius: 8px; padding: 7px 10px; display: flex; gap: 10px; align-items: center; font-size: 11px; color: #c3c2b7;">{LEG}</div>
        </div>
        <div style="font-size: 11px; color: #898781;">Color, velocitat del vent. Línies, cap a on va. AROME France a 925 hPa a les 08:00. En groc, Tàrrega tornant amb dues pujades, 7 models. Ortofoto ICGC.</div>
      </div>
      <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;"><span class="lab">On acabaries, a les 09:30</span><span class="num" style="font-size: 11px; color: #898781;">10 m · 180 m · 925 · 850 hPa</span></div>
        {CARDS}
        <span style="font-size: 11px; line-height: 1.4; color: #898781;">Mediana de 7 models, i entre parèntesis el millor i el pitjor. La tauleta ho calcula amb el pronòstic del moment.</span>
      </div>
    </div>
  </main>"""
open(ROOT + "TauletaMeteo.dc.html", "w").write(page("Tauleta, On enlairar-se", "Plans", met_main))

# ---------- cambiar la columna y los enlaces de las maquetas existentes ----------
NAV = re.compile(r"<nav aria-label=\"Seccions\".*?</nav>", re.S)
for fn, act in [("TauletaPerfil.dc.html", "Perfil"), ("TauletaAfegirGlobus.dc.html", "Perfil"),
                ("TauletaAfegirGlobusBarreja.dc.html", "Perfil"), ("TauletaPla.dc.html", "Plans")]:
    s = open(ROOT + fn).read()
    s, n = NAV.subn(lambda m: rail(act), s)
    assert n == 1, fn
    s = s.replace("TauletaPreparacio.dc.html", "TauletaPlans.dc.html").replace("‹ Preparació", "‹ Plans")
    s = s.replace('<a href="TauletaPlans.dc.html" style="flex-shrink: 0; height: 48px;', '<a href="TauletaPlaNou.dc.html" style="flex-shrink: 0; height: 48px;')
    if fn == "TauletaPla.dc.html":
        s2, n2 = re.subn(r'    <div role="tablist" aria-label="Parts del pla".*?\n    </div>', lambda m: tabs("Resum"), s, flags=re.S)
        assert n2 == 1
        s = s2
    open(ROOT + fn, "w").write(s)
print("ok")
s = open(ROOT + "TauletaPla.dc.html").read()
s, n = re.subn(r'    <div style="display: flex; align-items: flex-end; gap: (?:20|16)px;">.*?\n(?=    <div role="tablist")', lambda m: HEADER + "\n\n", s, flags=re.S)
assert n == 1, "header"
open(ROOT + "TauletaPla.dc.html", "w").write(s)
print("header ok")

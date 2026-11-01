"""Buscador de campos de emergencia para la maqueta: zona alcanzable en 10 min desde la posición del globo de Main (10/10)
con el viento de cada capa (vent_alt 08:00 y 09:00 interpolado a las 08:34), y campos buenos según las cubiertas ICGC 2024."""
import json, math, os
import numpy as np
from PIL import Image
from scipy import ndimage
T = "/private/tmp/claude-501/-Users-didac-High-Frontier-Pilot-Globus/3dafa82d-80fc-4b47-9a3b-a1e1da6df041/scratchpad/terreny/tar/cob/"
M = json.load(open(T + "cobertes.json")); Z = np.load(T + "apte.npz")
BB, WC, HC = M["bb"], M["W"], M["H"]
bo = (Z["f_ob"] >= 0.9) & (Z["f_bo"] < 0.02) & (Z["f_ur"] < 0.01)
mig = (Z["f_ob"] >= 0.75) & ~bo
D = json.load(open(os.path.expanduser("~/High Frontier/Pilot Globus/04_Planes_de_vuelo/_generador/carta_tarrega_10-10-2026_datos.json")))
LAT0, LON0 = 41.656127, 1.149041; R = 6378137.0
def merc(lat, lon): return (math.radians(lon)*R, math.log(math.tan(math.pi/4+math.radians(lat)/2))*R)
def imerc(x, y): return (math.degrees(2*math.atan(math.exp(y/R))-math.pi/2), math.degrees(x/R))
k = 1/math.cos(math.radians(LAT0)); X0, Y0 = merc(LAT0, LON0)
E0, N1, MPX = -4000, 8500, 10          # ortofoto de Main: 1300 x 1050 a 10 m/px
def en2ll(e, n): return imerc(X0 + e*k, Y0 + n*k)
def ll2px(lat, lon):
    x, y = merc(lat, lon); e, n = (x-X0)/k, (y-Y0)/k; return ((e-E0)/MPX, (N1-n)/MPX)
POS_PX = (746.1, 630.9); POS_E, POS_N = POS_PX[0]*MPX + E0, N1 - POS_PX[1]*MPX
pos = en2ll(POS_E, POS_N)
# viento por capa a las 08:34 (interpolado entre 08:00 y 09:00), hacia donde va
f = 34/60; capes = []
for r in D["vent_alt"]["files"]:
    h8, h9 = r["hores"]["08"], r["hores"]["09"]
    u8, v8 = h8["kt"]*math.sin(math.radians(h8["cap"])), h8["kt"]*math.cos(math.radians(h8["cap"]))
    u9, v9 = h9["kt"]*math.sin(math.radians(h9["cap"])), h9["kt"]*math.cos(math.radians(h9["cap"]))
    capes.append((r["nivell"], u8*(1-f)+u9*f, v8*(1-f)+v9*f))
# puntos alcanzables: quedarse t minutos en una capa (0 a 10) y bajar; 1 kt = 30,87 m/min
pts = [(0.0, 0.0)]
for nom, u, v in capes:
    if nom in ("10 m", "50 m", "100 m", "1 000 ft", "2 000 ft"):
        for t in np.linspace(0.5, 10, 20):
            pts.append((u*30.87*t, v*30.87*t))
pts = np.array(pts)
from scipy.spatial import ConvexHull
hull = pts[ConvexHull(pts).vertices]
# rejilla de la ortofoto de Main y máscara de la zona alcanzable
W, H = 1300, 1050
ee = E0 + (np.arange(W)+0.5)*MPX; nn = N1 - (np.arange(H)+0.5)*MPX
EE, NN = np.meshgrid(ee, nn)
from matplotlib.path import Path
fan = Path(np.c_[hull[:, 0] + POS_E, hull[:, 1] + POS_N]).contains_points(np.c_[EE.ravel(), NN.ravel()]).reshape(H, W)
# cubiertas en cada píxel de la ortofoto
lat = np.degrees(2*np.arctan(np.exp((Y0 + NN*k)/R)) - np.pi/2); lon = np.degrees((X0 + EE*k)/R)
ci = np.clip(((lon - BB[1])/(BB[3]-BB[1])*WC).astype(int), 0, WC-1); cj = np.clip(((BB[2]-lat)/(BB[2]-BB[0])*HC).astype(int), 0, HC-1)
BO, MIG = bo[cj, ci], mig[cj, ci]
over = np.zeros((H, W, 4), np.uint8)
over[fan & BO] = (70, 190, 100, 150); over[fan & MIG] = (235, 200, 60, 140); over[fan & ~BO & ~MIG] = (200, 70, 60, 120)
Image.fromarray(over, "RGBA").save("emerg/apte_fan.png")
# campos candidatos: componentes de «bo» dentro de la zona, ordenados por tiempo hasta el centro
lab, n = ndimage.label(fan & BO)
lines = [[ll2px(a, b) for a, b in l["g"]] for l in D["lines"]]
def dist_line(px_, py_):
    best = 1e9
    for L in lines:
        for (x1, y1), (x2, y2) in zip(L, L[1:]):
            dx, dy = x2-x1, y2-y1; t = max(0, min(1, ((px_-x1)*dx+(py_-y1)*dy)/(dx*dx+dy*dy+1e-9)))
            best = min(best, math.hypot(px_-(x1+t*dx), py_-(y1+t*dy)))
    return best*MPX
cands = []
for i in range(1, n+1):
    m = lab == i; area = m.sum()*MPX*MPX/1e4
    if area < 3: continue
    dt = ndimage.distance_transform_edt(m); cy, cx = np.unravel_index(dt.argmax(), dt.shape)   # punto más alejado de los bordes
    de, dn = (cx+0.5)*MPX + E0 - POS_E, N1 - (cy+0.5)*MPX - POS_N
    d = math.hypot(de, dn); b = (math.degrees(math.atan2(de, dn)) + 360) % 360
    cands.append({"px": [float(cx), float(cy)], "ha": round(area, 1), "d": round(d), "b": round(b), "marge": round(float(dt.max())*MPX), "linia": round(dist_line(cx, cy))})
cands.sort(key=lambda c: c["d"])
json.dump({"pos": pos, "hull": [[float(POS_PX[0] + x/MPX), float(POS_PX[1] - y/MPX)] for x, y in hull], "cands": cands[:6], "capes": [(c[0], round(math.degrees(math.atan2(c[1], c[2])) % 360), round(math.hypot(c[1], c[2]), 1)) for c in capes]}, open("emerg/emerg.json", "w"))
print("pos %.5f %.5f" % pos); print("capes", [(c[0], round(math.degrees(math.atan2(c[1], c[2])) % 360), round(math.hypot(c[1], c[2]), 1)) for c in capes])
print("fan km2", round(fan.sum()*MPX*MPX/1e6, 2), "bo dins", round((fan & BO).sum()/fan.sum()*100), "%")
for c in cands[:6]: print(c)

# --- puntos concretos: margen de 100 m o más hasta el borde de lo bueno, separados 300 m, por cercanía
dtall = ndimage.distance_transform_edt(fan & BO) * MPX
ys, xs = np.where(dtall >= 100)
order = np.argsort(np.hypot((xs+0.5)*MPX + E0 - POS_E, N1 - (ys+0.5)*MPX - POS_N))
pick = []
for idx in order:
    x, y = xs[idx], ys[idx]
    if all(math.hypot(x - px_, y - py_)*MPX >= 300 for px_, py_, _ in pick):
        # dentro de un radio de 60 m, el píxel con más margen
        y0, y1, x0, x1 = max(0, y-6), y+7, max(0, x-6), x+7
        sub = dtall[y0:y1, x0:x1]; dy_, dx_ = np.unravel_index(sub.argmax(), sub.shape)
        pick.append((x0+dx_, y0+dy_, float(sub.max())))
    if len(pick) == 3: break
VK = {c[0]: (c[1], c[2]) for c in capes}
def temps(de, dn):
    # combinación de dos capas contiguas que da el vector: a*v1 + b*v2 = d, a y b en minutos >= 0
    best = None
    noms = ["10 m", "50 m", "100 m", "1 000 ft", "2 000 ft"]
    for i in range(len(noms)):
        for j in range(i, len(noms)):
            (u1, v1), (u2, v2) = [(VK[n][0]*30.87, VK[n][1]*30.87) for n in (noms[i], noms[j])]
            if i == j:
                t = (de*u1 + dn*v1)/(u1*u1 + v1*v1)
                if t > 0 and math.hypot(de - t*u1, dn - t*v1) < 60: cand = (t, noms[i], None)
                else: continue
            else:
                det = u1*v2 - u2*v1
                if abs(det) < 1e-6: continue
                a = (de*v2 - dn*u2)/det; b = (u1*dn - v1*de)/det
                if a < 0 or b < 0: continue
                cand = (a+b, noms[i], noms[j])
            if best is None or cand[0] < best[0]: best = cand
    return best
out = []
for x, y, marge in pick:
    de, dn = (x+0.5)*MPX + E0 - POS_E, N1 - (y+0.5)*MPX - POS_N
    tt = temps(de, dn)
    out.append({"px": [int(x), int(y)], "d": int(round(math.hypot(de, dn), -1)), "b": int(round((math.degrees(math.atan2(de, dn))+360) % 360)),
                "marge": int(round(marge, -1)), "linia": int(round(dist_line(x, y), -1)), "min": (round(tt[0]) if tt else None),
                "capes": ([tt[1]] + ([tt[2]] if tt[2] else [])) if tt else None})
J = json.load(open("emerg/emerg.json")); J["punts"] = out
for c in J["cands"]: c["ha"] = float(c["ha"])
json.dump(J, open("emerg/emerg.json", "w"), ensure_ascii=False)
for o in out: print(o)

"""Zona donde se puede acabar a las 09:30 (10/10, Tàrrega): envolvente de los puntos finales de las 4 maneras de volar x 7 modelos del generador."""
import json, math, os
import statistics
d = json.load(open(os.path.expanduser("~/High Frontier/Pilot Globus/04_Planes_de_vuelo/_generador/carta_tarrega_10-10-2026_datos.json")))
T = (41.656127, 1.149041); O = (41.5842, 1.6528)
LAT0, LON0 = T; R = 6378137.0
def merc(lat, lon): return (math.radians(lon)*R, math.log(math.tan(math.pi/4+math.radians(lat)/2))*R)
k = 1/math.cos(math.radians(LAT0)); X0, Y0 = merc(LAT0, LON0)
E0, N1, M = -6000, 12000, 20
def px(lat, lon):
    x, y = merc(lat, lon); e, n = (x-X0)/k, (y-Y0)/k; return (round((e-E0)/M, 1), round((N1-n)/M, 1))
def dist(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 2*6371*math.asin(math.sqrt(h))
def brg(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    y = math.sin(lo2-lo1)*math.cos(la2); x = math.cos(la1)*math.sin(la2)-math.sin(la1)*math.cos(la2)*math.cos(lo2-lo1)
    return (math.degrees(math.atan2(y, x))+360) % 360
ends = [(p[-1][0], p[-1][1]) for prof in d["tracks"].values() for p in prof.values()]
P = [px(*e) for e in ends]
def hull(pts):
    pts = sorted(set(pts))
    def cross(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]
H = hull(P)
dT = [dist(e, T) for e in ends]
bs = sorted(brg(T, e) for e in ends)
gaps = [((bs[(i+1) % len(bs)] - bs[i]) % 360, i) for i in range(len(bs))]; g, i = max(gaps)
arc = (round(bs[(i+1) % len(bs)]), round(bs[i]))
med = {prof: (statistics.median(dist(p[-1], T) for p in m.values()), statistics.median(dist(p[-1], O) for p in m.values())) for prof, m in d["tracks"].items()}
out = {"hull": " ".join(f"{x},{y}" for x, y in H), "dots": P, "tarrega": px(*T),
       "min_T": round(min(dT), 1), "max_T": round(max(dT), 1), "arc": arc,
       "best_T": round(min(v[0] for v in med.values()), 1), "best_O": round(min(v[1] for v in med.values()), 1),
       "dist_O": round(dist(T, O), 1), "brg_O": round(brg(T, O))}
json.dump(out, open("zona_possible.json", "w"))
print({k: v for k, v in out.items() if k not in ("hull", "dots")}, "vertexs", len(H))

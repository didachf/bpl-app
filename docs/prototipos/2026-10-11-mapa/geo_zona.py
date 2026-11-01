"""Ortofoto ICGC gran (Tàrrega i Agramunt) i geometria real del Mac en píxels, per a les maquetes."""
import json, math, sys, urllib.parse, urllib.request
CARTA, OUT = sys.argv[1], sys.argv[2]
LAT0, LON0 = 41.656127, 1.149041          # enlairament de Tàrrega
R = 6378137.0
def merc(lat, lon): return (math.radians(lon)*R, math.log(math.tan(math.pi/4+math.radians(lat)/2))*R)
k = 1/math.cos(math.radians(LAT0))
X0, Y0 = merc(LAT0, LON0)
E0, E1, N0, N1 = -6000, 18000, -6000, 12000   # m sobre el terreny des de l'enlairament
M = 20                                          # m per píxel
W, H = (E1-E0)//M, (N1-N0)//M
bbox = (X0+E0*k, Y0+N0*k, X0+E1*k, Y0+N1*k)
q = dict(SERVICE="WMS", VERSION="1.3.0", REQUEST="GetMap", LAYERS="ortofoto_color_vigent", STYLES="",
         CRS="EPSG:3857", BBOX=",".join(f"{v:.1f}" for v in bbox), WIDTH=W, HEIGHT=H, FORMAT="image/jpeg")
u = "https://geoserveis.icgc.cat/servei/catalunya/orto-territorial/wms?" + urllib.parse.urlencode(q)
open(f"{OUT}/orto_zona.jpg", "wb").write(urllib.request.urlopen(u, timeout=180).read())
def en(lat, lon):
    x, y = merc(lat, lon); return ((x-X0)/k, (y-Y0)/k)
def px(lat, lon):
    e, n = en(lat, lon); return (round((e-E0)/M, 1), round((N1-n)/M, 1))
def inside(p, m=0): return -m <= p[0] <= W+m and -m <= p[1] <= H+m
d = json.load(open(CARTA))
lines = []
for l in d["lines"]:
    pts = [px(a, b) for a, b in l["g"]]
    if any(inside(p) for p in pts):
        lines.append({"v": l.get("v", ""), "pts": " ".join(f"{x},{y}" for x, y in pts)})
obst = json.load(open(CARTA.replace("_10-10-2026_datos.json", "_obst.json")))
pts_obst = [{"k": o["k"], "p": px(o["lat"], o["lon"])} for o in obst if inside(px(o["lat"], o["lon"]))]
places = [{"n": n, "p": px(a, b)} for a, b, n in d["places"] if inside(px(a, b), -20)]
tracks = {}
for prof, models in d["tracks"].items():
    tracks[prof] = {m: " ".join(f"{x},{y}" for x, y in (px(a, b) for a, b, t in pts)) for m, pts in models.items()}
def pol(r, b): return (r*math.sin(math.radians(b)), r*math.cos(math.radians(b)))
def epx(e, n): return (round((e-E0)/M, 1), round((N1-n)/M, 1))
def sector(b1, b2, r1, r2):
    ps = [pol(r1, b1+(b2-b1)*i/8) for i in range(9)] + [pol(r2, b2-(b2-b1)*i/8) for i in range(9)]
    return " ".join(f"{epx(*p)[0]},{epx(*p)[1]}" for p in ps)
volts = {}
for l in lines: volts[l["v"]] = volts.get(l["v"], 0) + 1
res = {"img": [W, H], "M": M, "tarrega": epx(0, 0), "agramunt": px(41.7577, 1.0871),
       "secA": sector(48, 60, 4200, 5600), "secB": sector(345, 358, 6500, 8000),
       "lines": lines, "obst": pts_obst, "places": places, "tracks": tracks, "volts": volts}
json.dump(res, open(f"{OUT}/geo_zona.json", "w"))
print(W, H, "linies", len(lines), volts, "obst", len(pts_obst), {k: sum(1 for o in pts_obst if o['k'] == k) for k in {o['k'] for o in pts_obst}}, "llocs", [p["n"] for p in places])

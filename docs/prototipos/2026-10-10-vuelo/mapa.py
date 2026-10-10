import json, math, urllib.parse, urllib.request
LAT0, LON0 = 41.6561, 1.1490
R = 6378137.0
def merc(lat, lon): return (math.radians(lon)*R, math.log(math.tan(math.pi/4+math.radians(lat)/2))*R)
k = 1/math.cos(math.radians(LAT0))
X0, Y0 = merc(LAT0, LON0)
E0, E1, N0, N1 = -4000, 9000, -2000, 8500     # m sobre el terreno desde el despegue
W, Hh = 1300, 1050                              # 10 m por pixel
bbox = (X0+E0*k, Y0+N0*k, X0+E1*k, Y0+N1*k)
q = dict(SERVICE="WMS", VERSION="1.3.0", REQUEST="GetMap", LAYERS="ortofoto_color_vigent", STYLES="",
         CRS="EPSG:3857", BBOX=",".join(f"{v:.1f}" for v in bbox), WIDTH=W, HEIGHT=Hh, FORMAT="image/jpeg")
u = "https://geoserveis.icgc.cat/servei/catalunya/orto-territorial/wms?" + urllib.parse.urlencode(q)
open("orto_tarrega.jpg", "wb").write(urllib.request.urlopen(u, timeout=120).read())
def px(e, n): return (round((e-E0)/10, 1), round((N1-n)/10, 1))
o = json.load(open("optim.json"))
P = o["POS"]; ZA = o["ZA"]
def pol(r, b): return (r*math.sin(math.radians(b)), r*math.cos(math.radians(b)))
def sector(b1, b2, r1, r2):
    pts = [pol(r1, b1 + (b2-b1)*i/8) for i in range(9)] + [pol(r2, b2 - (b2-b1)*i/8) for i in range(9)]
    return " ".join(f"{px(*p)[0]},{px(*p)[1]}" for p in pts)
# traza ilustrativa con algo de ruido, en tramos de color por altitud
traza = []
import random; random.seed(3)
e = n = 0.0
for m in range(34*2):
    t = m/2
    r, kt, alt = (40 + 8*math.sin(t/3), 3, 1280 + 120*t/12) if t < 12 else (64 + 3*math.sin(t/2), 4.5, 1500 + 40*math.sin(t/4))
    d = kt*1852/3600*30
    e += d*math.sin(math.radians(r)); n += d*math.cos(math.radians(r)); traza.append((e, n, alt))
esc = P[0]/traza[-1][0], P[1]/traza[-1][1]
traza = [(x*esc[0], y*esc[1], a) for x, y, a in traza]
out = {"img": [W, Hh], "T": px(0, 0), "POS": px(*P), "ZA": px(*ZA), "ZB": px(*pol(7250, 351.5)),
       "secA": sector(48, 60, 4200, 5600), "secB": sector(345, 358, 6500, 8000),
       "traza_baja": " ".join(f"{px(x, y)[0]},{px(x, y)[1]}" for x, y, a in traza if a < 1450),
       "traza_alta": " ".join(f"{px(x, y)[0]},{px(x, y)[1]}" for x, y, a in traza if a >= 1440),
       "plan": " ".join(f"{px(x, y)[0]},{px(x, y)[1]}" for t, x, y, z in o["path"] if t <= 14),
       "plan_ticks": [px(x, y) for t, x, y, z in o["path"] if abs(t % 5) < 1e-6 and 0 < t <= 10],
       "proy": [px(P[0] + 4.3*1852/60*mm*math.sin(math.radians(61)), P[1] + 4.3*1852/60*mm*math.cos(math.radians(61))) for mm in (0, 5, 10, 15, 20)],
       }
print(json.dumps(out, indent=0)[:3000])
print("ara", o["ara"])
json.dump(out, open("geo.json", "w"))

# Prototipo del motor del spec §5.2 y §5.3, para las maquetas. Datos reales de open-meteo.
import json, math, urllib.parse, urllib.request
LAT, LON = 41.6561, 1.1490
M = ["icon_eu","gfs_seamless","gem_seamless","ukmo_global_deterministic_10km",
     "meteofrance_arpege_europe","ecmwf_ifs025","meteofrance_arome_france"]
HL = [10,20,50,80,100,120,150,180,200]
PL = [1000,975,950,925,900,850,800,700]
v = []
for h in HL: v += [f"wind_speed_{h}m", f"wind_direction_{h}m"]
for p in PL: v += [f"wind_speed_{p}hPa", f"wind_direction_{p}hPa", f"geopotential_height_{p}hPa"]
q = dict(latitude=LAT, longitude=LON, hourly=",".join(v), models=",".join(M), timezone="UTC",
         start_hour="2026-10-10T06:00", end_hour="2026-10-10T09:00", wind_speed_unit="kn")
d = json.loads(urllib.request.urlopen(urllib.request.Request(
    "https://api.open-meteo.com/v1/forecast", data=urllib.parse.urlencode(q).encode()), timeout=120).read())
json.dump(d, open("openmeteo_10-10.json","w"))
H, U = d["hourly"], d["hourly_units"]
ELEV = d["elevation"]
FT = 0.3048
def ok(k): return U.get(k) not in (None, "undefined")
def uv(s, dirfrom):  # u,v del vector HACIA donde va
    r = math.radians(dirfrom); return (-s*math.sin(r), -s*math.cos(r))
rows_ft = []
terra_ft = (ELEV+10)/FT
techo_ft = 1200/FT
f = 250*math.ceil((terra_ft+1)/250)
while f < techo_ft: rows_ft.append(f); f += 250
rows_ft += [4000,5000,6000,7000,8000,9000,10000]
nt = len(H["time"])
def perfil(m, i):
    pts = []
    for h in HL:
        ks, kd = f"wind_speed_{h}m_{m}", f"wind_direction_{h}m_{m}"
        if ok(ks) and ok(kd) and H[ks][i] is not None and H[kd][i] is not None:
            pts.append((ELEV+h, *uv(H[ks][i], H[kd][i])))
    for p in PL:
        ks, kd, kz = f"wind_speed_{p}hPa_{m}", f"wind_direction_{p}hPa_{m}", f"geopotential_height_{p}hPa_{m}"
        if all(ok(k) for k in (ks,kd,kz)) and None not in (H[ks][i], H[kd][i], H[kz][i]):
            if H[kz][i] < ELEV + 10: continue   # bajo tierra
            pts.append((H[kz][i], *uv(H[ks][i], H[kd][i])))
    return sorted(pts)
def interp(pts, z):
    if not pts or z < pts[0][0] or z > pts[-1][0]: return None
    for a, b in zip(pts, pts[1:]):
        if a[0] <= z <= b[0]:
            t = 0 if b[0]==a[0] else (z-a[0])/(b[0]-a[0])
            return (a[1]+t*(b[1]-a[1]), a[2]+t*(b[2]-a[2]))
    return (pts[-1][1], pts[-1][2])
def combina(muestras):
    if not muestras: return None
    sp = sorted(math.hypot(*x) for x in muestras)
    n = len(sp); med = sp[n//2] if n%2 else (sp[n//2-1]+sp[n//2])/2
    su = sum(x[0] for x in muestras); sv = sum(x[1] for x in muestras)
    rumbo = (math.degrees(math.atan2(su, sv)) + 360) % 360   # hacia donde va
    dirs = sorted((math.degrees(math.atan2(x[0], x[1]))+360)%360 for x in muestras)
    gaps = [(dirs[(k+1)%n]-dirs[k]) % 360 for k in range(n)] if n > 1 else [360]
    span = 360 - max(gaps) if n > 1 else 0
    nivel = "un_solo" if n == 1 else ("juntos" if span < 30 else ("dispersos" if span < 90 else "dispares"))
    return dict(rumbo=round(rumbo), kt=round(med,1), min=round(sp[0],1), max=round(sp[-1],1), span=round(span), nivel=nivel, n=n)
out = {"elev": ELEV, "terra_ft": round(terra_ft), "rows": [], "horas": H["time"]}
def fila(z_m, i, modelo_list=M):
    ms = []
    for m in modelo_list:
        if z_m == ELEV+10:
            ks, kd = f"wind_speed_10m_{m}", f"wind_direction_10m_{m}"
            if ok(ks) and H[ks][i] is not None: ms.append(uv(H[ks][i], H[kd][i]))
        else:
            r = interp(perfil(m, i), z_m)
            if r: ms.append(r)
    return ms
for i in range(nt):
    col = {"terra": combina(fila(ELEV+10, i))}
    for ft in rows_ft: col[str(ft)] = combina(fila(ft*FT, i))
    out["rows"].append(col)
json.dump(out, open("filas.json","w"), indent=1)
print("elev", ELEV, "terra ft", round(terra_ft), "filas", [round(x) for x in rows_ft])
for i,t in enumerate(H["time"]):
    print(t, "UTC")
    for k in ["terra"]+[str(x) for x in rows_ft]:
        c = out["rows"][i][k]
        print(f"  {k:>8}", c and f"{c['rumbo']:03d}° {c['kt']:4.1f} kt ({c['min']}-{c['max']}) {c['nivel']} n={c['n']}")

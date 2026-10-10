# Optimizador de prueba (spec 6.8) con el viento precalculado por fila y paso. Datos reales del 10/10.
import json, math, time
src = open("viento.py").read().split("out = {")[0]
src = src.replace('d = json.loads(urllib.request.urlopen(urllib.request.Request(\n    "https://api.open-meteo.com/v1/forecast", data=urllib.parse.urlencode(q).encode()), timeout=120).read())', 'd = json.load(open("openmeteo_10-10.json"))').replace('json.dump(d, open("openmeteo_10-10.json","w"))', '')
exec(src)
KTM = 1852/3600
filas = [("terra", ELEV+10)] + [(str(int(f)), f*FT) for f in rows_ft if f <= 3750]
NF = len(filas); ZS = [f[1] for f in filas]
DT = 30.0; NSTEP = 120          # 60 min
T0 = 6 + 34/60                  # 08:34 local
MED = {"1500": (61, 4.3, 1), "1750": (66, 5.4, 9), "terra": (18, 1.6, 32)}  # ilustrativas
def wm(m, z, i):
    if abs(z-(ELEV+10)) < 1e-6:
        ks, kd = f"wind_speed_10m_{m}", f"wind_direction_10m_{m}"
        return uv(H[ks][i], H[kd][i]) if ok(ks) and H[ks][i] is not None else None
    return interp(perfil(m, i), z)
def mediana(ms):
    su = sum(x[0] for x in ms); sv = sum(x[1] for x in ms)
    sp = sorted(math.hypot(*x) for x in ms); n = len(sp); s = sp[n//2] if n % 2 else (sp[n//2-1]+sp[n//2])/2
    k = math.hypot(su, sv); return (su/k*s, sv/k*s)
FUENTES = ["med"] + M
# por hora: viento por fuente y fila
hora = {f: [[None]*NF for _ in range(nt)] for f in FUENTES}
for i in range(nt):
    for j, (nm, z) in enumerate(filas):
        ms = {m: wm(m, z, i) for m in M}
        for m in M: hora[m][i][j] = ms[m]
        hora["med"][i][j] = mediana([v for v in ms.values() if v])
# por paso: interpolado en el tiempo, y la medida si es reciente (en m/s)
W = {}
for f in FUENTES:
    tab = []
    for s in range(NSTEP+1):
        t = T0 + s*DT/3600; i = min(int(t)-6, nt-2); a = t-int(t)
        fila = []
        for j, (nm, z) in enumerate(filas):
            if nm in MED and MED[nm][2] < 15:
                r, kt, _ = MED[nm]; fila.append((kt*KTM*math.sin(math.radians(r)), kt*KTM*math.cos(math.radians(r)))); continue
            x0, x1 = hora[f][i][j], hora[f][i+1][j]
            if not x0 or not x1: x0 = x1 = hora["med"][i][j] if not x0 else x0; x1 = x1 or x0
            fila.append(((x0[0]+a*(x1[0]-x0[0]))*KTM, (x0[1]+a*(x1[1]-x0[1]))*KTM))
        tab.append(fila)
    W[f] = tab
def wz(tab, s, z):
    if z <= ZS[0]: return tab[s][0]
    for j in range(NF-1):
        if ZS[j] <= z <= ZS[j+1]:
            k = (z-ZS[j])/(ZS[j+1]-ZS[j]); a, b = tab[s][j], tab[s][j+1]
            return (a[0]+k*(b[0]-a[0]), a[1]+k*(b[1]-a[1]))
    return tab[s][-1]
RATE = {"puja_lent": 0.5, "puja_rapid": 2.75, "baixa_lent": 0.5, "baixa_rapid": 4.0}
def simula(plan, obj, f="med", z0=1540*FT, guarda=False):
    tab = W[f]; x = y = 0.0; z = z0; s = 0; best = (math.hypot(*obj), 0); path = [(0, 0.0, 0.0, z)]
    for k, p in enumerate(plan):
        if p[0] == "go":
            zt = ZS[p[1]]; dz = RATE[p[2]]*DT
            while abs(z-zt) > 0.01 and s < NSTEP:
                w = wz(tab, s, z); x += w[0]*DT; y += w[1]*DT; s += 1
                z = zt if abs(zt-z) <= dz else z + math.copysign(dz, zt-z)
                d = math.hypot(obj[0]-x, obj[1]-y)
                if d < best[0]: best = (d, s)
                if guarda: path.append((s, x, y, z))
        else:
            fin = NSTEP if k == len(plan)-1 else min(NSTEP, s + p[2]*60/DT)
            while s < fin:
                w = tab[s][p[1]]; x += w[0]*DT; y += w[1]*DT; s += 1
                d = math.hypot(obj[0]-x, obj[1]-y)
                if d < best[0]: best = (d, s)
                if guarda: path.append((s, x, y, z))
    return best, path
def mov(r, kt, mins): return (kt*KTM*60*mins*math.sin(math.radians(r)), kt*KTM*60*mins*math.cos(math.radians(r)))
a, b = mov(40, 3, 12), mov(64, 4.5, 22)
POS = (a[0]+b[0], a[1]+b[1])
ZA = (4900*math.sin(math.radians(54)), 4900*math.cos(math.radians(54)))
OBJ = (ZA[0]-POS[0], ZA[1]-POS[1])
print("pos", [round(v) for v in POS], "obj", [round(v) for v in OBJ], "rumbo", round((math.degrees(math.atan2(*OBJ))+360) % 360), "dist", round(math.hypot(*OBJ)))
cur = 1  # fila 1500
t0 = time.time(); cand = []; n = 0
base = simula([("hold", cur, 0)], OBJ)
for h0 in range(0, 21, 2):
    pre = [("hold", cur, h0)] if h0 else []
    for A in range(NF):
        for ra in ("lent", "rapid"):
            if A == cur and ra == "rapid": continue
            p1 = pre + ([("go", A, ("puja_" if ZS[A] > 1540*FT else "baixa_") + ra)] if A != cur else [])
            r = simula(p1 + [("hold", A, 0)], OBJ); n += 1
            cand.append((r[0][0], r[0][1], p1 + [("hold", A, 0)]))
            for hA in range(2, 21, 2):
                for B in range(NF):
                    if B == A: continue
                    for rb in ("lent", "rapid"):
                        pl = p1 + [("hold", A, hA), ("go", B, ("puja_" if ZS[B] > ZS[A] else "baixa_") + rb), ("hold", B, 0)]
                        r = simula(pl, OBJ); n += 1
                        cand.append((r[0][0], r[0][1], pl))
cand.sort(key=lambda c: (round(c[0]/50), c[1], len(c[2])))
print("planes", n, "en", round(time.time()-t0, 1), "s")
def hhmm(s): mm = 34 + s*DT/60; return f"{8+int(mm//60):02d}:{int(mm%60):02d}"
print("si no fas res:", round(base[0][0]), "m a las", hhmm(base[0][1]))
for c in cand[:6]: print(round(c[0]), "m", hhmm(c[1]), [(p[0], filas[p[1]][0], p[2]) for p in c[2]])
best = cand[0]; res, path = simula(best[2], OBJ, guarda=True)
disp = sorted(round(simula(best[2], OBJ, f=m)[0][0]) for m in M)
print("dispersion", disp)
_, bpath = simula([("hold", cur, 0)], OBJ, guarda=True)
json.dump({"POS": POS, "ZA": ZA, "plan": [(p[0], filas[p[1]][0], p[2]) for p in best[2]], "res": [res[0], hhmm(res[1])],
           "base": [base[0][0], hhmm(base[0][1])], "disp": disp,
           "path": [(p[0]*DT/60, p[1]+POS[0], p[2]+POS[1], p[3]) for p in path],
           "base_path": [(p[0]*DT/60, p[1]+POS[0], p[2]+POS[1]) for p in bpath],
           "ara": [(nm, (round((math.degrees(math.atan2(*W["med"][0][j]))+360) % 360), round(math.hypot(*W["med"][0][j])/KTM, 1))) for j, (nm, z) in enumerate(filas)]},
          open("optim.json", "w"), indent=0)

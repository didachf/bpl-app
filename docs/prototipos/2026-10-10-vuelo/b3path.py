import json, math
src = open("compet.py").read().split("GOALS =")[0]
exec(src)
c = json.load(open("compet.json"))
idx = {nm: j for j, (nm, z) in enumerate(filas)}
plan = [(p[0], idx[p[1]], p[2]) for p in c["B3"]["plan"]]
obj = pol(6000, 70)
res, path = simula(plan, obj, z0=Z0, guarda=True)
def px(e, n): return (round((e+4000)/10, 1), round((8500-n)/10, 1))
pts = [(p[0]*DT/60, px(p[1], p[2]), round(p[3]/FT)) for p in path]
now = [p for p in pts if abs(p[0]-20) < 1e-6][0]
print("closest", round(res[0]), "at min", res[1]*DT/60)
print("now", now)
print("track_low", " ".join(f"{p[1][0]},{p[1][1]}" for p in pts if p[0] <= 20 and p[2] < 1700))
print("track_high", " ".join(f"{p[1][0]},{p[1][1]}" for p in pts if p[0] <= 20 and p[2] >= 1600))
print("plan_rest", " ".join(f"{p[1][0]},{p[1][1]}" for p in pts if 20 <= p[0] <= 30))
print("ticks", [(p[0], p[1]) for p in pts if p[0] in (25.0, 30.0)])
# rumbo y velocidad actuales
a = [p for p in path if abs(p[0]*DT/60-19.5) < 1e-6][0]; b = [p for p in path if abs(p[0]*DT/60-20) < 1e-6][0]
de, dn = b[1]-a[1], b[2]-a[2]
print("rumbo", round((math.degrees(math.atan2(de, dn))+360) % 360), "kt", round(math.hypot(de, dn)/30/0.514444, 1))
po = (b[1], b[2]); d = (obj[0]-po[0], obj[1]-po[1])
print("a B3", round((math.degrees(math.atan2(*d))+360) % 360), round(math.hypot(*d)))
for k in c: 
    g = c[k]; dd = (pol(g["r"], g["b"])[0]-po[0], pol(g["r"], g["b"])[1]-po[1])
    print(k, g["px"], g["lat"], g["lon"], "desde ahora", round((math.degrees(math.atan2(*dd))+360) % 360), round(math.hypot(*dd)))
# proyeccion 5..20 min con el rumbo actual
r = math.atan2(de, dn); v = math.hypot(de, dn)/30
print("proy", [px(po[0]+v*60*m*math.sin(r), po[1]+v*60*m*math.cos(r)) for m in (5, 10, 15, 20)])

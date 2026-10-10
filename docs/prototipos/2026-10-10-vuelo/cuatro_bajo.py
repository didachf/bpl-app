import json, math
pre = open("optim2.py").read().split("def mov(r, kt, mins)")[0]
pre = pre.replace("T0 = 6 + 34/60                  # 08:34 local", "T0 = 6.0")
pre = pre.replace('MED = {"1500": (61, 4.3, 1), "1750": (66, 5.4, 9), "terra": (18, 1.6, 32)}  # ilustrativas', "MED = {}")
a = "d = math.hypot(obj[0]-x, obj[1]-y)\n                if d < best[0]: best = (d, s)"
assert pre.count(a) == 2, pre.count(a)
pre = pre.replace(a, "d = math.hypot(obj[0]-x, obj[1]-y) if z < ZLIM else 1e9\n                if d < best[0]: best = (d, s)")
pre = pre.replace("best = (math.hypot(*obj), 0)", "best = (1e9, 0)")
pre = pre.replace("def simula", "ZLIM = ELEV + 500*0.3048\ndef simula", 1)
exec(pre)
comp = open("compet.py").read()
exec("def plan_mejor" + comp.split("def plan_mejor")[1].split("GOALS =")[0])
Z0 = ELEV + 10
print("ZLIM ft", round(ZLIM/FT))
for k, (r, b) in {"B1": (2500, 30), "B2": (4000, 55), "B3": (6000, 70), "B4": (6000, 85)}.items():
  obj = pol(r, b); best = plan_mejor(obj); disp = sorted(round(simula(best[2], obj, f=m, z0=Z0)[0][0]) for m in M); print(k, round(best[0]), "m", best[1]*DT/60, "min", [(p[0], filas[p[1]][0], p[2]) for p in best[2]], disp)
raise SystemExit
best = plan_mejor(obj)
res, path = simula(best[2], obj, z0=Z0, guarda=True)
disp = sorted(round(simula(best[2], obj, f=m, z0=Z0)[0][0]) for m in M)
print("pasa a", round(best[0]), "m en", best[1]*DT/60, "min", [(p[0], filas[p[1]][0], p[2]) for p in best[2]], "disp", disp)
def px(e, n): return (round((e+4000)/10, 1), round((8500-n)/10, 1))
pts = [(p[0]*DT/60, px(p[1], p[2]), round(p[3]/FT)) for p in path]
for t in (0, 5, 10, 15, 20, 25, 28, 30, 35, 40):
    q = [p for p in pts if abs(p[0]-t) < 1e-6]
    if q: print(t, q[0])
json.dump({"plan": [(p[0], filas[p[1]][0], p[2]) for p in best[2]], "miss": round(best[0]), "tmin": best[1]*DT/60, "disp": disp, "pts": pts}, open("b3bajo.json", "w"))

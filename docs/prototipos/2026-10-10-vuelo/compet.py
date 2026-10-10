import json, math, time
src = open("optim2.py").read()
pre = src.split("def mov(r, kt, mins)")[0]
# despegue a las 08:00 local desde terra, sin medidas
pre = pre.replace("T0 = 6 + 34/60                  # 08:34 local", "T0 = 6.0")
pre = pre.replace('MED = {"1500": (61, 4.3, 1), "1750": (66, 5.4, 9), "terra": (18, 1.6, 32)}  # ilustrativas', "MED = {}")
exec(pre)
Z0 = ELEV + 10
def plan_mejor(obj):
    cand = []
    cur = 0
    for h0 in range(0, 31, 2):
        pre_ = [("hold", cur, h0)] if h0 else []
        for A in range(NF):
            for ra in ("lent", "rapid"):
                if A == cur and ra == "rapid": continue
                p1 = pre_ + ([("go", A, "puja_" + ra)] if A != cur else [])
                r = simula(p1 + [("hold", A, 0)], obj, z0=Z0)
                cand.append((r[0][0], r[0][1], p1 + [("hold", A, 0)]))
                for hA in range(2, 31, 2):
                    for B in range(NF):
                        if B == A: continue
                        for rb in ("lent", "rapid"):
                            pl = p1 + [("hold", A, hA), ("go", B, ("puja_" if ZS[B] > ZS[A] else "baixa_") + rb), ("hold", B, 0)]
                            r = simula(pl, obj, z0=Z0)
                            cand.append((r[0][0], r[0][1], pl))
    cand.sort(key=lambda c: (round(c[0]/50), c[1], len(c[2])))
    return cand[0]
def pol(r, b): return (r*math.sin(math.radians(b)), r*math.cos(math.radians(b)))
GOALS = {"B1": (2500, 30), "B2": (4000, 55), "B3": (6000, 70), "B4": (6000, 85)}
out = {}
for k, (r, b) in GOALS.items():
    obj = pol(r, b)
    t0 = time.time(); best = plan_mejor(obj)
    disp = sorted(round(simula(best[2], obj, f=m, z0=Z0)[0][0]) for m in M)
    cambios = sum(1 for p in best[2] if p[0] == "go")
    mins = round(best[1]*DT/60)
    pl = [(p[0], filas[p[1]][0], p[2]) for p in best[2]]
    print(k, f"{b:03d}° {r/1000:.1f} km", "pasa a", round(best[0]), "m en", mins, "min", "cambios", cambios, "disp", disp, pl, round(time.time()-t0,1), "s")
    out[k] = {"r": r, "b": b, "miss": round(best[0]), "min": mins, "cambios": cambios, "disp": disp, "plan": pl,
              "px": [round((obj[0]+4000)/10, 1), round((8500-obj[1])/10, 1)],
              "lat": round(41.6561 + obj[1]/111320, 4), "lon": round(1.1490 + obj[0]/83146, 4)}
json.dump(out, open("compet.json", "w"), indent=1)

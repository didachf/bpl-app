"""Resumen por día para la pantalla «On enlairar-se»: tarjetas de los cuatro despegues y trayectorias del recomendado."""
import json, math, statistics, os
W = "/private/tmp/claude-501/-Users-didac-High-Frontier-Pilot-Globus/6c858963-174c-4355-9fb5-f3512c1fe575/scratchpad/"
CRIB = {"12": os.path.expanduser("~/High Frontier/Pilot Globus/04_Planes_de_vuelo/_generador/cribratge_12-10-2026.json"),
        "13": W + "cribratge/cribratge_13-10-2026.json", "14": W + "cribratge/cribratge_14-10-2026.json"}
O = (41.5842, 1.6528)
SITES = [("tarrega", "Tàrrega", (41.656127, 1.149041)), ("agramunt", "Agramunt", (41.7577, 1.0871)),
         ("igualada", "Igualada-Òdena", (41.5842, 1.6528)), ("balaguer", "Balaguer A", (41.7782, 0.8616))]
EST = {"pronto": "pujada i baix", "dues": "dues pujades", "baix": "baix", "creuer": "creuer"}
def dist(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 2*6371*math.asin(math.sqrt(h))
f1 = lambda x: f"{x:.1f}".replace(".", ",")
out = {}
for dd in ("12", "13"):
    crib = json.load(open(CRIB[dd]))["llocs"]
    cards = []
    for sid, nom, T in SITES:
        d = json.load(open(W + f"gen12/carta_{sid}_{dd}-10-2026_datos.json"))
        res = {}
        for prof, models in d["tracks"].items():
            fT = [dist(p[-1], T) for p in models.values()]; fO = [dist(p[-1], O) for p in models.values()]
            res[prof] = (statistics.median(fT), min(fT), max(fT), statistics.median(fO), min(fO), max(fO))
        bT = min(res, key=lambda k: res[k][0]); bO = min(res, key=lambda k: res[k][3])
        # objetivo recomendado para este despegue: el de menor mediana
        if sid == "igualada" or res[bT][0] <= res[bO][3]:
            obj, prof, km, lo, hi = ("Tornar a la base" if sid == "igualada" else "Tornar a l'enlairament"), bT, res[bT][0], res[bT][1], res[bT][2]
        else:
            obj, prof, km, lo, hi = "Cap a la base", bO, res[bO][3], res[bO][4], res[bO][5]
        lv = {x["lvl"]: x for x in d["profile"]}
        grad = [{"r": lv[k]["dir"], "k": f1(lv[k]["kt"])} for k in ("10 m", "180 m", "925 hPa", "850 hPa")]
        r8 = next(r for r in crib[sid]["superficie"] if r["h"] == "08:00")
        cards.append({"nom": nom, "obj": obj, "km": f1(km) + " km", "rang": f1(lo) + " a " + f1(hi), "estr": EST[prof],
                      "base": "és la base" if sid == "igualada" else "Òdena a " + f1(res[bO][3]) + " km",
                      "t": f1(r8["t_med"]) + " °C", "raf": f1(r8["gmax"]) + " kt", "grad": grad, "_km": km, "_sid": sid, "_prof": prof,
                      "_tracks": [[(a, b) for a, b, t in p] for p in d["tracks"][prof].values()]})
    cards.sort(key=lambda c: c["_km"])
    for i, c in enumerate(cards): c["rec"] = i == 0
    tracks = cards[0]["_tracks"]
    for c in cards:
        for k in ("_km", "_sid", "_prof", "_tracks"): c.pop(k)
    out[dd] = {"cards": cards, "tracks": tracks}
    print(dd, [(c["nom"], c["obj"], c["km"], c["estr"], c["rec"]) for c in cards])
json.dump(out, open(W + "geo/dies_resum.json", "w"), ensure_ascii=False)

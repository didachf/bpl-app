"""Campo de viento en color, estilo Windy, con líneas de flujo, a partir de la rejilla AROME (para la maqueta)."""
import json, math, random, sys
import numpy as np
from PIL import Image, ImageDraw
LV, HH = sys.argv[1], sys.argv[2]           # p. ej. 925hPa 08:00
grid = json.load(open("vent_grid_12-10.json")); OR = json.load(open("orto_regio.json"))
LATS = sorted({g["lat"] for g in grid}); LONS = sorted({g["lon"] for g in grid})
U = np.zeros((len(LATS), len(LONS))); V = np.zeros_like(U)
for g in grid:
    i, j = LATS.index(g["lat"]), LONS.index(g["lon"]); kt, frm = g[HH][LV]
    U[i, j] = -kt*math.sin(math.radians(frm)); V[i, j] = -kt*math.cos(math.radians(frm))   # componentes hacia donde va
R = 6378137.0
x0, y0, x1, y1 = OR["bbox_merc"]; W, H = OR["W"], OR["H"]
xs = x0 + (np.arange(W)+0.5)/W*(x1-x0); ys = y1 - (np.arange(H)+0.5)/H*(y1-y0)
lon = np.degrees(xs/R); lat = np.degrees(2*np.arctan(np.exp(ys/R)) - np.pi/2)
def interp(A, la, lo):
    fi = np.clip((la-LATS[0])/(LATS[-1]-LATS[0])*(len(LATS)-1), 0, len(LATS)-1-1e-9)
    fj = np.clip((lo-LONS[0])/(LONS[-1]-LONS[0])*(len(LONS)-1), 0, len(LONS)-1-1e-9)
    i0, j0 = np.floor(fi).astype(int), np.floor(fj).astype(int); di, dj = fi-i0, fj-j0
    return (A[i0, j0]*(1-di)*(1-dj) + A[i0+1, j0]*di*(1-dj) + A[i0, j0+1]*(1-di)*dj + A[i0+1, j0+1]*di*dj)
LA, LO = np.meshgrid(lat, lon, indexing="ij")
UU, VV = interp(U, LA, LO), interp(V, LA, LO); SP = np.hypot(UU, VV)
STOPS = [(0, (98, 113, 183)), (2, (57, 160, 200)), (4, (76, 195, 138)), (6, (140, 200, 75)), (8, (216, 214, 65)),
         (10, (242, 163, 58)), (14, (224, 82, 75)), (20, (168, 58, 139))]
def cmap(s):
    out = np.zeros(s.shape + (3,))
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (s >= a) & (s < b); t = ((s - a)/(b - a))[m][:, None]
        out[m] = np.array(ca)*(1-t) + np.array(cb)*t
    out[s >= STOPS[-1][0]] = STOPS[-1][1]
    return out
rgb = cmap(SP).astype(np.uint8)
img = Image.fromarray(rgb, "RGB").convert("RGBA")
# líneas de flujo, dibujadas al doble y reducidas
S = 2; big = Image.new("RGBA", (W*S, H*S), (0, 0, 0, 0)); dr = ImageDraw.Draw(big)
random.seed(7)
def vel(px, py):
    px = min(max(px, 0), W-1); py = min(max(py, 0), H-1)
    return UU[int(py), int(px)], VV[int(py), int(px)]
step = 34
for gy in range(step//2, H, step):
    for gx in range(step//2, W, step):
        px, py = gx + random.uniform(-12, 12), gy + random.uniform(-12, 12)
        pts = [(px, py)]
        for k in range(14):
            u, v = vel(px, py); sp = math.hypot(u, v)
            if sp < 0.05: break
            px += u/sp*(2.2 + sp*0.55); py -= v/sp*(2.2 + sp*0.55)
            pts.append((px, py))
        for k in range(1, len(pts)):
            a = int(40 + 170*k/len(pts))
            dr.line([(pts[k-1][0]*S, pts[k-1][1]*S), (pts[k][0]*S, pts[k][1]*S)], fill=(255, 255, 255, a), width=2*S)
streaks = big.resize((W, H), Image.LANCZOS)
out = Image.alpha_composite(img, streaks)
out.convert("RGB").save(f"camp_{LV}_{HH.replace(':', '')}.jpg", quality=86)
print("ok", W, H, "vel min %.1f max %.1f" % (SP.min(), SP.max()))

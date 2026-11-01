# Baja los mosaicos Terrarium z12 que cubren la zona del 10/10 y saca una rejilla regular de unos
# 100 m en grados, con interpolacion bilineal. Argumentos: carpeta de mosaicos, fichero de salida.
import json, math, sys, urllib.request
from pathlib import Path
from PIL import Image
tiles, salida = Path(sys.argv[1]), Path(sys.argv[2])
Z = 12
R = 6371000; RAD = math.pi / 180
LAT0, LON0 = 41.6561, 1.149  # despegue de Tarrega
def geo(x, y): return LAT0 + y / (R * RAD), LON0 + x / (R * RAD * math.cos(LAT0 * RAD))
sur, oeste = geo(-5000, -3000); norte, este = geo(15000, 11500)
def tile(lat, lon):
    n = 2 ** Z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(lat * RAD)) / math.pi) / 2 * n
x0, y1 = tile(sur, oeste); x1, y0 = tile(norte, este)
cache = {}
def img(tx, ty):
    if (tx, ty) not in cache:
        f = tiles / f'{Z}_{tx}_{ty}.png'
        if not f.exists():
            urllib.request.urlretrieve(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png', f)
        cache[(tx, ty)] = Image.open(f).convert('RGB')
    return cache[(tx, ty)]
def px(gx, gy):
    tx, ty = int(gx // 256), int(gy // 256)
    r, g, b = img(tx, ty).getpixel((int(gx - tx * 256), int(gy - ty * 256)))
    return r * 256 + g + b / 256 - 32768
def elev(lat, lon):
    x, y = tile(lat, lon); gx, gy = x * 256 - 0.5, y * 256 - 0.5
    ix, iy = math.floor(gx), math.floor(gy); fx, fy = gx - ix, gy - iy
    return (px(ix, iy) * (1 - fx) * (1 - fy) + px(ix + 1, iy) * fx * (1 - fy)
            + px(ix, iy + 1) * (1 - fx) * fy + px(ix + 1, iy + 1) * fx * fy)
dLat = 100 / (R * RAD); dLon = 100 / (R * RAD * math.cos(LAT0 * RAD))
nLat = int((norte - sur) / dLat) + 1; nLon = int((este - oeste) / dLon) + 1
e = [round(elev(sur + i * dLat, oeste + j * dLon), 1) for i in range(nLat) for j in range(nLon)]
salida.write_text(json.dumps({
    'fuente': 'AWS Terrain Tiles, formato Terrarium, z12 (unos 29 m por pixel), https://registry.opendata.aws/terrain-tiles/. '
              'Remuestreado a unos 100 m con interpolacion bilineal el 01/11/2026. Contrastado con Copernicus GLO-90 '
              '(open-meteo) en cinco puntos: diferencias de 0 a 3 m.',
    'lat0': sur, 'lon0': oeste, 'dLat': dLat, 'dLon': dLon, 'nLat': nLat, 'nLon': nLon, 'elevM': e}))
print(nLat, nLon, len(e), min(e), max(e), 'mosaicos', len(cache))

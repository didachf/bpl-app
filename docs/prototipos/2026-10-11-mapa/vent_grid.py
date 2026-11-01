"""Rejilla de viento AROME del 12/10 de 07 a 10 h y ortofoto ICGC de Balaguer a Òdena, para la maqueta."""
import json, math, urllib.parse, urllib.request
LATS = [round(41.50 + 0.06*i, 2) for i in range(7)]
LONS = [round(0.80 + 0.0767*j, 4) for j in range(13)]
pts = [(la, lo) for la in LATS for lo in LONS]
vars_ = ["wind_speed_10m", "wind_direction_10m", "wind_speed_925hPa", "wind_direction_925hPa", "wind_speed_850hPa", "wind_direction_850hPa", "geopotential_height_925hPa", "geopotential_height_850hPa"]
q = dict(latitude=",".join(str(a) for a, b in pts), longitude=",".join(str(b) for a, b in pts), hourly=",".join(vars_),
         models="meteofrance_arome_france", start_date="2026-10-12", end_date="2026-10-12", timezone="Europe/Madrid", wind_speed_unit="kn")
u = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(q)
r = json.loads(urllib.request.urlopen(u, timeout=120).read())
grid = []
for (la, lo), loc in zip(pts, r):
    h = loc["hourly"]; t = h["time"]
    row = {"lat": la, "lon": lo, "elev": loc.get("elevation")}
    for hh in ("07:00", "08:00", "09:00", "10:00"):
        i = t.index(f"2026-10-12T{hh}")
        row[hh] = {lv: (h[f"wind_speed_{lv}"][i], h[f"wind_direction_{lv}"][i]) for lv in ("10m", "925hPa", "850hPa")}
        row[hh]["z925"] = h["geopotential_height_925hPa"][i]; row[hh]["z850"] = h["geopotential_height_850hPa"][i]
    grid.append(row)
json.dump(grid, open("vent_grid_12-10.json", "w"))
print("punts", len(grid), "exemple", grid[0]["08:00"])
# ortofoto
LAT0, LON0 = 41.68, 1.26
R = 6378137.0
def merc(lat, lon): return (math.radians(lon)*R, math.log(math.tan(math.pi/4+math.radians(lat)/2))*R)
x0, y0 = merc(41.47, 0.77); x1, y1 = merc(41.89, 1.75)
W, H = 1360, round(1360*(y1-y0)/(x1-x0))
q = dict(SERVICE="WMS", VERSION="1.3.0", REQUEST="GetMap", LAYERS="ortofoto_color_vigent", STYLES="", CRS="EPSG:3857",
         BBOX=f"{x0:.1f},{y0:.1f},{x1:.1f},{y1:.1f}", WIDTH=W, HEIGHT=H, FORMAT="image/jpeg")
open("orto_regio.jpg", "wb").write(urllib.request.urlopen("https://geoserveis.icgc.cat/servei/catalunya/orto-territorial/wms?" + urllib.parse.urlencode(q), timeout=180).read())
json.dump({"bbox_merc": [x0, y0, x1, y1], "W": W, "H": H}, open("orto_regio.json", "w"))
print("orto", W, H)

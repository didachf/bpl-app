import json
g = json.load(open("geo_zona.json"))
def lines_svg():
    out = []
    for l in g["lines"]:
        v = l["v"]; w = 5 if v in ("110000", "220000") else 3
        out.append(f'<polyline points="{l["pts"]}" fill="none" stroke="#0b0b0b" stroke-opacity="0.45" stroke-width="{w+3}" stroke-linejoin="round"></polyline>')
        out.append(f'<polyline points="{l["pts"]}" fill="none" stroke="#ff5a4f" stroke-width="{w}" stroke-linejoin="round"></polyline>')
    return "\n".join(out)
def places_svg(skip=()):
    return "\n".join(f'<text x="{p["p"][0]}" y="{p["p"][1]}" fill="#ffffff" fill-opacity="0.85" font-family="IBM Plex Sans" font-size="20" class="halo">{p["n"]}</text>' for p in g["places"] if p["n"] not in skip)
def zones_svg():
    return (f'<polygon points="{g["secA"]}" fill="#3ad16b" fill-opacity="0.3" stroke="#3ad16b" stroke-width="4"></polygon>\n'
            f'<polygon points="{g["secB"]}" fill="#3ad16b" fill-opacity="0.3" stroke="#3ad16b" stroke-width="4"></polygon>')
def tracks_svg(prof):
    out = []
    for m, pts in g["tracks"][prof].items():
        out.append(f'<polyline points="{pts}" fill="none" stroke="#0b0b0b" stroke-opacity="0.5" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"></polyline>')
    for m, pts in g["tracks"][prof].items():
        out.append(f'<polyline points="{pts}" fill="none" stroke="#ffd400" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></polyline>')
    return "\n".join(out)
open("f_lines.svg", "w").write(lines_svg())
open("f_places.svg", "w").write(places_svg())
open("f_zones.svg", "w").write(zones_svg())
open("f_tracks_baix.svg", "w").write(tracks_svg("baix"))
for f in ["f_lines.svg", "f_places.svg", "f_zones.svg", "f_tracks_baix.svg"]:
    print(f, len(open(f).read()))
print("A label", g["secA"].split()[13], "B label", g["secB"].split()[13])

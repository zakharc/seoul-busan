#!/usr/bin/env python3
"""Inject trip data, version the scene module and review URL, and write the KML."""
import json, os, re, html, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
DATA = os.path.join(ROOT, "data")

meta = json.load(open(os.path.join(DATA, "meta.json")))
days = json.load(open(os.path.join(DATA, "days-a.json"))) + json.load(open(os.path.join(DATA, "days-b.json")))
commutes = json.load(open(os.path.join(DATA, "commutes.json")))
quiz = json.load(open(os.path.join(DATA, "quiz.json")))
for i, q in enumerate(quiz): q["id"] = f"q{i}"
explore_path = os.path.join(DATA, "explore.json")
explore = json.load(open(explore_path)) if os.path.exists(explore_path) else []
trip = dict(meta, days=days, commutes=commutes, quiz=quiz, explore=explore)

# ---- inject into index.html
idx_path = os.path.join(ROOT, "index.html")
src = open(idx_path, encoding="utf-8").read()
blob = json.dumps(trip, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
new = re.sub(r'(<script type="application/json" id="trip-data">).*?(</script>)', lambda m: m.group(1) + blob + m.group(2), src, count=1, flags=re.S)
assert new != src or blob in src, "trip-data block not found in index.html"
import datetime as _dt
stamp = _dt.datetime.now(_dt.timezone.utc).strftime("%Y%m%d-%H%M%S")
new = re.sub(r'<meta name="build" content="[^"]*">', f'<meta name="build" content="{stamp}">', new, count=1)
scene_path = os.path.join(ROOT, "place-scenes.js")
scene_version = hashlib.sha256(open(scene_path, "rb").read()).hexdigest()[:12]
new, imports = re.subn(
    r"(import \{createPlaceScenes\} from '\./place-scenes\.js)(?:\?v=[^']*)?(';)",
    lambda m: m.group(1) + "?v=" + scene_version + m.group(2), new, count=1)
assert imports == 1, "place-scenes import not found in index.html"
for asset, attr in (("experience.css", "href"), ("experience.js", "src"), ("novartis-game.js", "src"), ("trip-map.js", "src")):
    version = hashlib.sha256(open(os.path.join(ROOT, asset), "rb").read()).hexdigest()[:12]
    new, tags = re.subn(
        r'(' + attr + r'="' + re.escape(asset) + r')(?:\?v=[^"]*)?(")',
        lambda m: m.group(1) + "?v=" + version + m.group(2), new, count=1)
    assert tags == 1, asset + " tag not found in index.html"
open(idx_path, "w", encoding="utf-8").write(new)
review_path = os.path.join(ROOT, "visual-review", "index.html")
review = open(review_path, encoding="utf-8").read()
review, frames = re.subn(
    r'(\.\./index\.html\?visual-preview=1)(?:&v=[^"]*)?',
    lambda m: m.group(1) + "&v=" + stamp, review, count=1)
assert frames == 1, "visual review iframe not found"
open(review_path, "w", encoding="utf-8").write(review)
open(os.path.join(ROOT, ".build-stamp"), "w").write(stamp)
print("index.html:", len(new), "bytes · build", stamp)

# ---- KML
hotels = meta["hotels"]
def resolve(o):
    if "place" in o:
        return dict(hotels[o["place"]], **{k: v for k, v in o.items() if k != "place"})
    return o
def fmt_day(d):
    import datetime
    return datetime.date.fromisoformat(d).strftime("%a %d %b")
COL = {"Seoul": "ff e6 5f 4f".replace(" ", ""), "Busan": "ffa79a0e"}  # aabbggrr
def esc(s): return html.escape(str(s or ""), quote=False)

stays = []  # group consecutive days by base
for d in days:
    if stays and stays[-1]["base"] == d["base"]:
        stays[-1]["days"].append(d)
    else:
        stays.append({"base": d["base"], "days": [d]})

out = ['<?xml version="1.0" encoding="UTF-8"?>', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
       f'<name>{esc(meta["title"])} for two, 28 Oct – 7 Nov 2026</name>',
       f'<description>{esc(meta["budgetLine"])} Options are marked "(option)" / "(food option)".</description>']
for city, col in COL.items():
    out.append(f'<Style id="{city}"><IconStyle><color>{col}</color><scale>1.1</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle></Style>')
    out.append(f'<Style id="{city}-opt"><IconStyle><color>{col}</color><scale>0.9</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href></Icon></IconStyle></Style>')
    out.append(f'<Style id="{city}-food"><IconStyle><color>ff179ad5</color><scale>0.9</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href></Icon></IconStyle></Style>')
out.append('<Style id="hotel"><IconStyle><color>ff2a2a2a</color><scale>1.2</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/wht-stars.png</href></Icon></IconStyle></Style>')

def placemark(p, name, style, desc):
    return (f'<Placemark><name>{esc(name)}</name><styleUrl>#{style}</styleUrl>'
            f'<description><![CDATA[{desc}]]></description>'
            f'<Point><coordinates>{p["lng"]},{p["lat"]},0</coordinates></Point></Placemark>')

for st in stays:
    h = hotels[st["base"]]
    d0, d1 = st["days"][0], st["days"][-1]
    out.append(f'<Folder><name>{esc(h["city"])} · {esc(h["title"])} ({esc(h["nights"])})</name>')
    out.append(placemark(h, f'Hotel: {h["title"]}', "hotel", f'<b>{esc(h["nights"])}</b><br>{esc(h.get("about"))}<br>{esc(h.get("hours"))}' + (f'<br><i>{esc(h.get("warn"))}</i>' if h.get("warn") else "")))
    for d in st["days"]:
        for it in d["items"]:
            opts = it.get("options")
            for o in (opts or [it]):
                p = resolve(o)
                if "lat" not in p: continue
                is_food = (it.get("kind") == "food") or (o.get("type", "").split("·")[0].strip().lower() in ("korean", "seafood", "busan", "street food", "bakery-café", "food hall", "food court", "market food", "korean bbq", "korean pub food", "picnic", "chinese-korean", "korean bistro", "instant noodles"))
                suffix = "" if not opts else (" (food option)" if is_food else " (option)")
                name = f'{fmt_day(d["date"])} {it["t"]} · {p.get("title", it["title"])}{suffix}'
                style = ("Seoul" if d["city"] == "Seoul" else "Busan") + ("" if not opts else ("-food" if is_food else "-opt"))
                desc = []
                if opts: desc.append(f'<b>Choice:</b> {esc(it["title"])}')
                if p.get("type"): desc.append(f'<b>{esc(p["type"])}</b>')
                if p.get("price"): desc.append(f'<b>Price:</b> {esc(p["price"])}')
                if p.get("about"): desc.append(esc(p["about"]))
                if p.get("cool"): desc.append(f'<i>{esc(p["cool"])}</i>')
                if p.get("booking"): desc.append(f'<b>Booking:</b> {esc(p["booking"])}')
                if p.get("hours"): desc.append(f'<b>Hours:</b> {esc(p["hours"])}' + (f' · <b>Closed:</b> {esc(p["closed"])}' if p.get("closed") else ""))
                if p.get("tips"): desc.append("<br>".join("• " + esc(t) for t in p["tips"]))
                if p.get("ko"): desc.append(f'Naver: {esc(p["ko"])}')
                out.append(placemark(p, name, style, "<br>".join(desc)))
    out.append("</Folder>")
# ---- more ideas, not in the plan (the explore pages)
if explore:
    out.append('<Style id="idea"><IconStyle><color>ff2f3bd2</color><scale>0.9</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/wht-diamond.png</href></Icon></IconStyle></Style>')
    EFF = {"easy": "Easy add-on", "half": "Half day", "day": "Day trip"}
    for city in ("Seoul", "Busan"):
        items = [p for p in explore if p["city"] == city]
        if not items: continue
        out.append(f'<Folder><name>More ideas · {city} (not in the plan yet)</name>')
        for p in items:
            go = p.get("go")
            go_txt = go if isinstance(go, str) else (f'Taxi ≈{go["t"]} min from {hotels[go["h"]]["title"]}' if go else "")
            desc = [f'<b>{esc(EFF.get(p.get("effort"), ""))}</b>', esc(p["cool"]), f'<b>The catch:</b> {esc(p["catch"])}', f'<b>Fits:</b> {esc(p["swap"])}']
            if p.get("need"): desc.append(f'<b>Time:</b> {esc(p["need"])}')
            if p.get("price"): desc.append(f'<b>Cost:</b> {esc(p["price"])}')
            if go_txt: desc.append(f'<b>Getting there:</b> {esc(go_txt)}')
            if p.get("metro"): desc.append(esc(p["metro"]))
            if p.get("ko"): desc.append(f'Naver: {esc(p["ko"])}')
            out.append(placemark(p, f'Idea · {p["title"]}', "idea", "<br>".join(desc)))
        out.append("</Folder>")
out.append("</Document></kml>")
kml_path = os.path.join(ROOT, "seoul-busan-trip.kml")
open(kml_path, "w", encoding="utf-8").write("\n".join(out))
print("kml:", kml_path, sum(1 for l in out if l.startswith("<Placemark")), "placemarks")

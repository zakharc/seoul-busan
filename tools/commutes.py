#!/usr/bin/env python3
"""Precompute walking / taxi commutes between consecutive stops (and all their options)
from real road routes (OSRM foot + car profiles). Results go to data/commutes.json.

Rules (from the spec):
  walking  = foot-route distance at 4.5 km/h
  taxi     = car-route duration x 1.7 (Seoul) / x 1.5 (Busan) + 3 min pickup
  fare     = W4,800 base (1.6 km Seoul / 2 km Busan) + W763/km beyond, +12% traffic, rounded to W500
"""
import json, time, sys, urllib.request, urllib.parse, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
UA = {"User-Agent": "SeoulBusanPlanner/2.0 (personal trip page)"}
CACHE_PATH = os.path.join(DATA, "osrm-cache.json")
cache = json.load(open(CACHE_PATH)) if os.path.exists(CACHE_PATH) else {}

meta = json.load(open(os.path.join(DATA, "meta.json")))
days = json.load(open(os.path.join(DATA, "days-a.json"))) + json.load(open(os.path.join(DATA, "days-b.json")))
hotels = meta["hotels"]

def resolve(o):
    if "place" in o:
        h = hotels[o["place"]]
        o = dict(h, **{k: v for k, v in o.items() if k != "place"})
    return o

def places_of(item):
    return [resolve(o) for o in (item.get("options") or [item])]

def route(profile, a, b):
    key = f"{profile}|{a['lng']:.5f},{a['lat']:.5f}|{b['lng']:.5f},{b['lat']:.5f}"
    if key in cache:
        return cache[key]
    url = f"https://routing.openstreetmap.de/routed-{profile}/route/v1/driving/{a['lng']},{a['lat']};{b['lng']},{b['lat']}?overview=false"
    for attempt in range(3):
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25))
            r = d["routes"][0]
            cache[key] = {"dist": r["distance"], "dur": r["duration"]}
            json.dump(cache, open(CACHE_PATH, "w"))
            time.sleep(0.7)
            return cache[key]
        except Exception as e:
            print("  retry", profile, e, file=sys.stderr); time.sleep(3)
    return None

def haversine(a, b):
    R = 6371000; p = math.pi / 180
    dlat = (b["lat"] - a["lat"]) * p; dlng = (b["lng"] - a["lng"]) * p
    h = math.sin(dlat / 2) ** 2 + math.cos(a["lat"] * p) * math.cos(b["lat"] * p) * math.sin(dlng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))

def commute(a, b):
    city = "Busan" if b["lat"] < 36 else "Seoul"
    if haversine(a, b) < 40:
        return {"w": 0, "wd": 0, "t": 0, "f": 0, "same": True}
    foot = route("foot", a, b); car = route("car", a, b)
    if not foot: foot = {"dist": haversine(a, b) * 1.3, "dur": 0}
    if not car:  car = {"dist": haversine(a, b) * 1.4, "dur": haversine(a, b) * 1.4 / 1000 / 25 * 3600}
    walk_min = foot["dist"] / 4500 * 60
    taxi_min = car["dur"] / 60 * (1.7 if city == "Seoul" else 1.5) + 3
    km = car["dist"] / 1000; base_km = 1.6 if city == "Seoul" else 2.0
    fare = (4800 + max(0.0, km - base_km) * 763) * 1.12
    fare = int(round(fare / 500.0) * 500)
    return {"w": int(round(walk_min)), "wd": round(foot["dist"] / 1000, 1), "t": int(round(taxi_min)), "f": fare, "km": round(km, 1)}

out = {}
pairs = 0
for i, day in enumerate(days):
    for k, item in enumerate(day["items"]):
        if item.get("fixed") and not item.get("options"):
            continue  # hand-written commute overrides
        if k == 0:
            if i == 0: continue  # airport arrival is hand-written
            froms = [dict(hotels[days[i - 1]["base"]], id=days[i - 1]["base"])]
        else:
            froms = places_of(day["items"][k - 1])
        tos = places_of(item)
        for a in froms:
            for b in tos:
                key = f"{a['id']}>{b['id']}"
                if key in out: continue
                out[key] = commute(a, b); pairs += 1
                print(key, out[key])

json.dump(out, open(os.path.join(DATA, "commutes.json"), "w"), indent=0, ensure_ascii=False)
print(pairs, "pairs written")

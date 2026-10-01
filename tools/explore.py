#!/usr/bin/env python3
"""Fill data/explore.json with the taxi/walk estimate from the nearest hotel (same rules as tools/commutes.py).
Day-trip places keep their hand-written "go" text."""
import json, os, sys, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, "..", "data")
UA = {"User-Agent": "SeoulBusanPlanner/2.0 (personal trip page)"}
CACHE = os.path.join(DATA, "osrm-cache.json"); cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
meta = json.load(open(os.path.join(DATA, "meta.json"))); hotels = meta["hotels"]
xp_path = os.path.join(DATA, "explore.json"); xp = json.load(open(xp_path))
def route(profile, a, b):
    key = f"{profile}|{a['lng']:.5f},{a['lat']:.5f}|{b['lng']:.5f},{b['lat']:.5f}"
    if key in cache: return cache[key]
    url = f"https://routing.openstreetmap.de/routed-{profile}/route/v1/driving/{a['lng']},{a['lat']};{b['lng']},{b['lat']}?overview=false"
    for _ in range(3):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25))["routes"][0]
            cache[key] = {"dist": r["distance"], "dur": r["duration"]}; time.sleep(.5); return cache[key]
        except Exception as e: time.sleep(2)
    return None
for p in xp:
    if isinstance(p.get("go"), str): continue
    cands = [k for k, h in hotels.items() if h["city"] == p["city"]]
    best = None
    for k in cands:
        h = hotels[k]; car = route("car", h, p); foot = route("foot", h, p)
        if not car or not foot: continue
        seoul = p["city"] == "Seoul"; km = car["dist"] / 1000
        t = round(car["dur"] / 60 * (1.7 if seoul else 1.5) + 3)
        fare = 4800 + max(0, km - (1.6 if seoul else 2.0)) * 763; fare = int(round(fare * 1.12 / 500.0) * 500)
        w = round(foot["dist"] / 1000 / 4.5 * 60)
        g = {"h": k, "t": t, "f": fare, "km": round(km, 1), "w": w, "wd": round(foot["dist"] / 1000, 1)}
        if not best or g["t"] < best["t"]: best = g
    if best: p["go"] = best
    print(p["id"], p.get("go"))
json.dump(xp, open(xp_path, "w"), ensure_ascii=False, indent=1)
json.dump(cache, open(CACHE, "w"))

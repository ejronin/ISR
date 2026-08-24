from pathlib import Path
import json, re, sys

root = Path(__file__).resolve().parents[1]
data_path = root / "data" / "endgame-so-far.json"
state_path = root / "js" / "state.js"
nav_path = root / "js" / "navigation.js"
view_path = root / "js" / "endgame-20260823.js"
css_path = root / "css" / "endgame-20260823.css"

missing = [str(p) for p in (data_path,state_path,nav_path,view_path,css_path) if not p.exists()]
if missing:
    raise SystemExit("missing ENDGAME files: " + ", ".join(missing))

data = json.loads(data_path.read_text(encoding="utf-8"))
assert data["meta"]["page_id"] == "endgame"
assert len(data["sources"]) >= 16
assert any(s["outlet"] == "Reuters" for s in data["sources"])
assert any(s["outlet"] in {"Press TV","IranWire"} for s in data["sources"])
assert len(data["victory_ledger"]) >= 8

state = state_path.read_text(encoding="utf-8")
nav = nav_path.read_text(encoding="utf-8")
assert "endgame: 'overview'" in state
assert "['endgame', 'Endgame (so far)']" in nav
assert "ensureEndgamePanel" in nav
assert "endgame-20260823.js" in nav
assert "endgame-20260823.css" in nav

urls = [s["url"] for s in data["sources"]]
assert len(urls) == len(set(urls)), "duplicate ENDGAME source URLs"
assert all(u.startswith("https://") for u in urls)
print(f"validate-endgame: PASS ({len(data['sources'])} sources, {len(data['victory_ledger'])} original-condition tests)")

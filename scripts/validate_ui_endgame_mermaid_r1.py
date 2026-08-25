from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE_SHA = "d9c2d862dd117544edf7fa9400920b160135220e"
ALLOWED = {
    "PROCEEDS_UNDER_IRAN_DEMAND",
    "WALKED_BACK_DILUTED",
    "CUT_OFF_DENIED",
    "OPEN_UNRESOLVED",
}

def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))

adj = load("data/endgame-adjudication-v1.json")
endgame = load("data/endgame-so-far.json")
hormuz = load("data/hormuz-strategic-v3.json")
registry = load("data/source-registry.json")
source_context = load("data/source-context-v1.json")
historical = load("data/integration-v1.2/events.json")
overlay = load("data/current-update-20260824/events.json")
loader = (ROOT / "js/endgame-20260823.js").read_text(encoding="utf-8")
view = (ROOT / "js/endgame-adjudication-r1.js").read_text(encoding="utf-8")
css = (ROOT / "css/endgame-adjudication-r1.css").read_text(encoding="utf-8")
workflow = (ROOT / ".github/workflows/validate.yml").read_text(encoding="utf-8")
view_compact = "".join(view.split())

def records(data):
    if isinstance(data, list):
        return data
    for key in ("events", "records", "items"):
        value = data.get(key)
        if isinstance(value, list):
            return value
    raise AssertionError("unable to locate record array")

assert len(records(historical)) == 98, "locked integration-v1.2 event count changed"
assert len(records(overlay)) == 10, "Aug. 24 overlay event count changed"
assert len(records(historical)) + len(records(overlay)) == 108
assert len(registry["sources"]) == 291, "generated source registry count changed"

changed_locked = subprocess.run(
    ["git", "diff", "--name-only", BASE_SHA, "HEAD", "--", "data/integration-v1.2"],
    cwd=ROOT, text=True, capture_output=True, check=True
).stdout.strip()
assert not changed_locked, "integration-v1.2 was modified:\n" + changed_locked

assert set(adj["terminal_state_labels"]) == ALLOWED
assert len(adj["claims"]) >= 8
endgame_ids = {s["id"] for s in endgame["sources"]}
hormuz_ids = set(hormuz["sources"])
registry_ids = {s["source_id"] for s in registry["sources"]}
scope_ids = {"endgame": endgame_ids, "hormuz": hormuz_ids, "registry": registry_ids}

def validate_refs(refs, context):
    for ref in refs or []:
        assert ref["scope"] in scope_ids, f"{context}: unknown source scope {ref}"
        assert ref["id"] in scope_ids[ref["scope"]], f"{context}: unresolved source {ref}"

for claim in adj["claims"]:
    state = claim["current_disposition"]["state"]
    assert state in ALLOWED, f"{claim['id']}: invalid terminal state {state}"
    assert claim["path"], f"{claim['id']}: empty adjudication path"
    for stage in claim["path"]:
        validate_refs(stage.get("source_refs"), f"{claim['id']}:{stage['id']}")
    rel = claim["mou_relationship"]
    if rel["dependent"]:
        assert rel["applicability"] == "EXPIRED_NON_CONTROLLING", f"{claim['id']}: MoU applicability missing"
        assert rel["current_control_state"] == "NON_CONTROLLING", f"{claim['id']}: controlling state missing"
        assert rel["final_deal_required"] is True
        assert rel["final_deal_completed"] is False
    for dim in claim.get("dimensions", []):
        assert dim["state"] in ALLOWED
        validate_refs(dim.get("source_refs"), f"{claim['id']}:{dim['id']}")

validate_refs(adj["mou_instrument"]["source_refs"], "mou_instrument")
assert adj["mou_instrument"]["current_state"] == "EXPIRED_NON_CONTROLLING"
assert adj["mou_instrument"]["display_state"] == "EXPIRED / NON-CONTROLLING"
assert adj["mou_instrument"]["final_deal_completed"] is False

hormuz_claim = next(c for c in adj["claims"] if c["id"] == "hormuz")
dims = {d["id"] for d in hormuz_claim["dimensions"]}
assert dims == {"legal", "operational", "fees"}, "Hormuz dimensions collapsed or renamed"
labels = " ".join(d["label"] for d in hormuz_claim["dimensions"])
assert "LEGAL / RECOGNIZED" in labels
assert "OPERATIONAL ROUTING / GATEKEEPING" in labels
assert "FEES / ECONOMIC RENT" in labels

version = load("vendor/mermaid/VERSION.json")
assert version["name"] == "mermaid"
assert version["version"] == "11.6.0"
assert (ROOT / "vendor/mermaid/mermaid.min.js").is_file()
assert (ROOT / "vendor/mermaid/LICENSE").is_file()
assert "vendor/mermaid/mermaid.min.js" in view
assert "endgame-adjudication-r1.js" in loader
assert "endgame-adjudication-r1.css" in loader
assert "cdn.jsdelivr" not in view.lower() and "unpkg.com" not in view.lower()
assert "securityLevel:'strict'" in view_compact
assert "htmlLabels:false" in view_compact
assert "buildMermaidGraph(adj)" in view
assert "dataset.graphSource='structured-adjudication'" in view
for display in adj["terminal_state_labels"].values():
    assert display not in view, f"terminal verdict duplicated as hard-coded UI prose: {display}"

assert "['16×','32×']" in view
assert "setVisualZoom(v)" in view
assert "flex-wrap:nowrap!important" in css
assert "grid-template-columns:none!important" in css
assert ".kpis{display:none!important}" in css
assert "108 current chronology · 98 locked historical" in view
assert "dataGlobalEvidenceSearch" not in view
assert "globalEvidenceSearch" in view
assert "#timelineSearch[hidden]" in css
assert "height:clamp(300px,calc(100vh - 315px),720px)" in css

assert "GROUND NEWS ·" in view
assert source_context["political_bias"]["unrated_display"] == "NO INDEPENDENT POLITICAL-BIAS RATING LOCATED"
assert "ALLSIDES" in source_context["political_bias"]["supported_providers"]
assert "AD FONTES" in source_context["political_bias"]["supported_providers"]
assert "Provenance:" in view and "Atlas role:" in view
assert "does not change Atlas evidence grade" in view
assert "NOT_RATED" not in source_context["political_bias"]["unrated_display"]
assert "CENTER" not in source_context["political_bias"]["unrated_display"]

assert "aria-labelledby" in view
assert "egGraphTitle" in view and "egGraphDesc" in view
assert "tabIndex=0" in view
assert "prefers-reduced-motion" in view
assert "safeUrl" in view
assert "noopener noreferrer" in view

assert "validate_ui_endgame_mermaid_r1.py" in workflow
assert "ui-endgame-mermaid-r1.test.js" in workflow

subprocess.run(["git", "diff", "--check", BASE_SHA, "HEAD"], cwd=ROOT, check=True)
print("validate-ui-endgame-mermaid-r1: PASS (98 + 10 = 108; 291 sources; 8 claim paths; 3 Hormuz dimensions)")

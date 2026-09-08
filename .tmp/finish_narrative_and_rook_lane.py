from pathlib import Path
import json

root = Path('.')
app_path = root / 'js/public-app.js'
test_path = root / 'tests/public-final-polish.test.js'
app = app_path.read_text(encoding='utf-8')
test = test_path.read_text(encoding='utf-8')

config = {
  'schema_version': '1.0',
  'contract_version': 'atlas-final-narrative-v1',
  'evidence_as_of': '2026-09-06',
  'war90_current_title': 'Current phase — Sep. 5–6',
  'war90_current_text': 'Direct U.S.–Iran maritime exchanges resumed even as diplomatic channels remained active and economic pressure on Iran deepened.',
  'war90_current_changed': 'Kinetic escalation and negotiation were occurring at the same time.',
  'us_record_shows': "Atlas assesses substantial but incomplete degradation of Iran's offensive power projection, partial progress on usable Hormuz navigation and substantial active economic pressure. The nuclear objective remains open.",
  'us_current_position': 'Washington continues military and economic pressure while negotiations remain active. Atlas does not treat the original objective set as fully achieved.',
  'iran_record_shows': 'Most of those maximal terms are not controlling outcomes. Iran retains missiles, maritime leverage and bargaining power, but it entered a new maritime process without first securing the full earlier economic package, and its unilateral Hormuz position has narrowed in practice.',
  'iran_current_position': 'By August Iran publicly shifted toward ending the war while preserving “power and dignity” and accepted a phased joint Oman maritime framework while permanent terms remained unresolved. That later position does not erase the original benchmark.',
  'hormuz_now': 'The Strait is physically traversable but commercially contested. Iran retains leverage, but recognized exclusive control is not established. A reported negotiating formula under which compulsory tolls would be dropped while charges described as legitimate maritime-service fees could remain was still a proposal, not an agreement, at the evidence cutoff.'
}

config_path = root / 'config/rook-narrative-current.json'
config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

sync_script = r'''#!/usr/bin/env python3
"""Synchronize ROOK's bounded current-narrative slots into the signed public entrypoint.

Routine updates edit config/rook-narrative-current.json only, then run this script.
The surrounding narrative contract remains code-owned and CI-protected.
"""
from pathlib import Path
import argparse
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'config' / 'rook-narrative-current.json'
APP = ROOT / 'js' / 'public-app.js'
BEGIN = '  // ROOK_NARRATIVE_CURRENT_BEGIN'
END = '  // ROOK_NARRATIVE_CURRENT_END'
CONTRACT_VERSION = 'atlas-final-narrative-v1'
REQUIRED_KEYS = {
    'schema_version', 'contract_version', 'evidence_as_of',
    'war90_current_title', 'war90_current_text', 'war90_current_changed',
    'us_record_shows', 'us_current_position',
    'iran_record_shows', 'iran_current_position', 'hormuz_now'
}
MUTABLE_KEYS = REQUIRED_KEYS - {'schema_version', 'contract_version'}


def load_config():
    value = json.loads(CONFIG.read_text(encoding='utf-8'))
    if set(value) != REQUIRED_KEYS:
        missing = sorted(REQUIRED_KEYS - set(value))
        extra = sorted(set(value) - REQUIRED_KEYS)
        raise SystemExit(f'ROOK narrative keys changed; missing={missing} extra={extra}')
    if value['schema_version'] != '1.0' or value['contract_version'] != CONTRACT_VERSION:
        raise SystemExit('ROOK narrative schema/contract version is immutable in the routine-update lane')
    if not re.fullmatch(r'20\\d{2}-\\d{2}-\\d{2}', value['evidence_as_of']):
        raise SystemExit('evidence_as_of must be YYYY-MM-DD')
    for key in MUTABLE_KEYS - {'evidence_as_of'}:
        if not isinstance(value[key], str) or not value[key].strip():
            raise SystemExit(f'{key} must be a non-empty string')
    return value


def block(value):
    payload = json.dumps(value, ensure_ascii=False, indent=2)
    payload = '\n'.join('  ' + line for line in payload.splitlines())
    return f"{BEGIN}\n  const ROOK_NARRATIVE_CURRENT = Object.freeze(\n{payload}\n  );\n{END}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    value = load_config()
    source = APP.read_text(encoding='utf-8')
    expected = block(value)
    pattern = re.compile(re.escape(BEGIN) + r'.*?' + re.escape(END), re.S)
    if not pattern.search(source):
        raise SystemExit('ROOK narrative generated block markers are missing')
    updated = pattern.sub(expected, source, count=1)
    if args.check:
        if updated != source:
            raise SystemExit('ROOK narrative current slots are not synchronized; run scripts/sync_rook_narrative.py')
        print('rook-narrative-sync: PASS')
        return
    APP.write_text(updated, encoding='utf-8')
    print('rook-narrative-sync: updated js/public-app.js')


if __name__ == '__main__':
    main()
'''
(root / 'scripts/sync_rook_narrative.py').write_text(sync_script, encoding='utf-8')

doc = '''# ROOK routine narrative update lane\n\nThis is the normal maintenance path after the final narrative contract was approved. It exists so routine evidence/current-state updates do **not** reopen PR/linguistics, UX/UI, and release-engineering review.\n\n## Routine update\n\nROOK may edit only the mutable values in `config/rook-narrative-current.json`:\n\n- `evidence_as_of`\n- `war90_current_title`\n- `war90_current_text`\n- `war90_current_changed`\n- `us_record_shows`\n- `us_current_position`\n- `iran_record_shows`\n- `iran_current_position`\n- `hormuz_now`\n\nThen run:\n\n```bash\npython scripts/sync_rook_narrative.py\nnode tests/public-final-polish.test.js\n```\n\nNormal repository CI remains the release gate. No separate linguistics, UX, or CI-engineer signoff is required for a routine update that stays inside this contract.\n\n## Frozen contract\n\nROOK must not change in the routine lane:\n\n- `schema_version` or `contract_version`;\n- module titles or taxonomy;\n- **Original public benchmark → What the record shows → Current position**;\n- the U.S.-entry trigger/rationale/objective distinctions;\n- the non-ranking War in 90 Seconds disclaimer;\n- the Hormuz **60-day interim no-charge** distinction;\n- proposal-versus-agreement, leverage-versus-recognized-control, or attribution standards;\n- DOM architecture, route authority, evidence schema, analytical thresholds, or stable IDs.\n\n## Escalate only when meaning changes\n\nROOK stops the routine lane and flags a semantic-contract change only if the evidence requires a new proposition/category, a changed legal or agreement status, a changed attribution standard, a new route/data dependency, a schema/threshold change, or copy that cannot truthfully fit the existing slots. That is the exception path—not the daily update process.\n'''
(root / 'docs/ROOK_DAILY_UPDATE_LANE.md').parent.mkdir(parents=True, exist_ok=True)
(root / 'docs/ROOK_DAILY_UPDATE_LANE.md').write_text(doc, encoding='utf-8')

# Insert the generated current-slot block immediately before the fixed narrative contract.
if 'ROOK_NARRATIVE_CURRENT_BEGIN' not in app:
    marker = '  const FINAL_NARRATIVE_GATES = Object.freeze({'
    if marker not in app:
        raise SystemExit('FINAL_NARRATIVE_GATES marker missing')
    payload = json.dumps(config, ensure_ascii=False, indent=2)
    payload = '\n'.join('  ' + line for line in payload.splitlines())
    block = f"  // ROOK_NARRATIVE_CURRENT_BEGIN\n  const ROOK_NARRATIVE_CURRENT = Object.freeze(\n{payload}\n  );\n  // ROOK_NARRATIVE_CURRENT_END\n\n"
    app = app.replace(marker, block + marker, 1)

replacements = {
"        Object.freeze({\n          title: 'Current phase — Sep. 5–6',\n          text: 'Direct U.S.–Iran maritime exchanges resumed even as diplomatic channels remained active and economic pressure on Iran deepened.',\n          changed: 'Kinetic escalation and negotiation were occurring at the same time.'\n        })": "        Object.freeze({\n          title: ROOK_NARRATIVE_CURRENT.war90_current_title,\n          text: ROOK_NARRATIVE_CURRENT.war90_current_text,\n          changed: ROOK_NARRATIVE_CURRENT.war90_current_changed\n        })",
"              text: \"Atlas assesses substantial but incomplete degradation of Iran's offensive power projection, partial progress on usable Hormuz navigation and substantial active economic pressure. The nuclear objective remains open.\"": "              text: ROOK_NARRATIVE_CURRENT.us_record_shows",
"              text: 'Washington continues military and economic pressure while negotiations remain active. Atlas does not treat the original objective set as fully achieved.'": "              text: ROOK_NARRATIVE_CURRENT.us_current_position",
"              text: 'Most of those maximal terms are not controlling outcomes. Iran retains missiles, maritime leverage and bargaining power, but it entered a new maritime process without first securing the full earlier economic package, and its unilateral Hormuz position has narrowed in practice.'": "              text: ROOK_NARRATIVE_CURRENT.iran_record_shows",
"              text: 'By August Iran publicly shifted toward ending the war while preserving “power and dignity” and accepted a phased joint Oman maritime framework while permanent terms remained unresolved. That later position does not erase the original benchmark.'": "              text: ROOK_NARRATIVE_CURRENT.iran_current_position",
"          text: 'The Strait is physically traversable but commercially contested. Iran retains leverage, but recognized exclusive control is not established. A reported negotiating formula under which compulsory tolls would be dropped while charges described as legitimate maritime-service fees could remain was still a proposal, not an agreement, at the evidence cutoff.'": "          text: ROOK_NARRATIVE_CURRENT.hormuz_now"
}
for old, new in replacements.items():
    if old not in app and new not in app:
        raise SystemExit('expected narrative current-slot source not found: ' + old[:80])
    app = app.replace(old, new, 1)

old_install = '''  function installFinalNarrativeGates(rootElement, documentObject, windowObject, state, ia) {\n    if (rootElement.__atlasNarrativeGateHandler && windowObject && windowObject.removeEventListener) {\n      windowObject.removeEventListener('hashchange', rootElement.__atlasNarrativeGateHandler);\n    }\n    const apply = () => {\n      if (!state || state.routeKey !== 'start.overview') return;\n      const article = rootElement.querySelector('.overview-page');\n      if (!article || article.querySelector('[data-narrative-gates]')) return;\n      const gates = buildFinalNarrativeGates(documentObject, ia);\n      const anchor = article.querySelector('.evidence-clock-bar') || article.querySelector('[data-current-state-summary]') || article.querySelector('.page-intro');\n      if (anchor) anchor.after(gates); else article.append(gates);\n    };\n    const onHashChange = () => apply();\n    if (windowObject && windowObject.addEventListener) windowObject.addEventListener('hashchange', onHashChange);\n    rootElement.__atlasNarrativeGateHandler = onHashChange;\n    apply();\n  }'''
new_install = '''  function installFinalNarrativeGates(rootElement, documentObject, windowObject, state, ia) {\n    if (rootElement.__atlasNarrativeGateHandler && windowObject && windowObject.removeEventListener) {\n      windowObject.removeEventListener('hashchange', rootElement.__atlasNarrativeGateHandler);\n    }\n    if (rootElement.__atlasNarrativeGateObserver && typeof rootElement.__atlasNarrativeGateObserver.disconnect === 'function') {\n      rootElement.__atlasNarrativeGateObserver.disconnect();\n    }\n    const apply = () => {\n      if (!state || state.routeKey !== 'start.overview') return;\n      const article = rootElement.querySelector('.overview-page');\n      if (!article || article.querySelector('[data-narrative-gates]')) return;\n      const gates = buildFinalNarrativeGates(documentObject, ia);\n      const anchor = article.querySelector('.evidence-clock-bar') || article.querySelector('[data-current-state-summary]') || article.querySelector('.page-intro');\n      if (anchor) anchor.after(gates); else article.append(gates);\n    };\n    const scheduleApply = () => {\n      if (windowObject && typeof windowObject.queueMicrotask === 'function') windowObject.queueMicrotask(apply);\n      else Promise.resolve().then(apply);\n    };\n    const onHashChange = () => scheduleApply();\n    if (windowObject && windowObject.addEventListener) windowObject.addEventListener('hashchange', onHashChange);\n    if (windowObject && typeof windowObject.MutationObserver === 'function') {\n      const observer = new windowObject.MutationObserver(() => apply());\n      observer.observe(rootElement, { childList: true, subtree: true });\n      rootElement.__atlasNarrativeGateObserver = observer;\n    } else {\n      rootElement.__atlasNarrativeGateObserver = null;\n    }\n    rootElement.__atlasNarrativeGateHandler = onHashChange;\n    apply();\n  }'''
if old_install not in app and new_install not in app:
    raise SystemExit('installFinalNarrativeGates block not found')
app = app.replace(old_install, new_install, 1)
app_path.write_text(app, encoding='utf-8')

# Extend static contract: config is the only routine copy-update surface and must be synchronized.
insert_after = "const css = read('css/public-shell.css');\n"
contract_test = r'''
const rookNarrative = JSON.parse(read('config/rook-narrative-current.json'));
const rookKeys = [
  'schema_version', 'contract_version', 'evidence_as_of',
  'war90_current_title', 'war90_current_text', 'war90_current_changed',
  'us_record_shows', 'us_current_position', 'iran_record_shows', 'iran_current_position', 'hormuz_now'
].sort();
assert.deepEqual(Object.keys(rookNarrative).sort(), rookKeys, 'ROOK routine narrative slot schema changed');
assert.equal(rookNarrative.schema_version, '1.0', 'ROOK routine narrative schema version changed');
assert.equal(rookNarrative.contract_version, 'atlas-final-narrative-v1', 'ROOK routine narrative contract version changed');
assert(/^20\d{2}-\d{2}-\d{2}$/.test(rookNarrative.evidence_as_of), 'ROOK evidence_as_of must be YYYY-MM-DD');
assert(appSource.includes('ROOK_NARRATIVE_CURRENT_BEGIN') && appSource.includes('ROOK_NARRATIVE_CURRENT_END'), 'ROOK generated narrative slot markers are missing');
for (const key of rookKeys.filter(key => !['schema_version', 'contract_version', 'evidence_as_of'].includes(key))) {
  assert(typeof rookNarrative[key] === 'string' && rookNarrative[key].trim(), `ROOK routine slot ${key} is empty`);
  assert(appSource.includes(rookNarrative[key]) || appSource.includes(`ROOK_NARRATIVE_CURRENT.${key}`), `ROOK routine slot ${key} is not synchronized into public-app`);
}
'''
if 'const rookNarrative = JSON.parse' not in test:
    if insert_after not in test:
        raise SystemExit('test insertion marker missing')
    test = test.replace(insert_after, insert_after + contract_test, 1)
# Lifecycle contract should be explicit and implementation-safe.
if "MutationObserver" not in test:
    anchor_assert = "assert(appSource.includes(\"article.querySelector('.evidence-clock-bar')\"), 'narrative gates are not anchored after the Evidence Clock');\n"
    addition = "assert(appSource.includes('MutationObserver'), 'narrative gates are not re-applied after route DOM replacement');\n"
    if anchor_assert not in test:
        raise SystemExit('lifecycle test marker missing')
    test = test.replace(anchor_assert, anchor_assert + addition, 1)
test_path.write_text(test, encoding='utf-8')

print('finish patch applied')

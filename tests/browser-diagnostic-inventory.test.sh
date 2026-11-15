#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash -n scripts/run_public_browser_diagnostics.sh
bash -n scripts/public_browser_diagnostic_inventory.sh
source scripts/public_browser_diagnostic_inventory.sh
diagnostic_failures=()
node(){
  case "$1" in
    fixture-bad-a.js) return 7 ;;
    fixture-bad-b.js) return 19 ;;
    *) return 0 ;;
  esac
}
diagnostic_run_suite fixture-bad-a.js
diagnostic_run_suite fixture-good.js
diagnostic_run_suite fixture-bad-b.js
if diagnostic_report >/dev/null 2>&1; then echo 'FAIL: broken suites produced pass' >&2; exit 1; fi
[ "${#diagnostic_failures[@]}" -eq 2 ]
[[ "${diagnostic_failures[0]}" == 'suite:fixture-bad-a.js(exit=7)' ]]
[[ "${diagnostic_failures[1]}" == 'suite:fixture-bad-b.js(exit=19)' ]]
# Execute the actual protected suite sequence under a stub browser/Node runner.
# A failure in its first suite must stop before any later suite starts.
fixture_script="$(mktemp)"
fixture_log="$(mktemp)"
trap 'rm -f "$fixture_script" "$fixture_log"' EXIT
{
  printf '%s\n' 'set -euo pipefail'
  printf '%s\n' 'start_browser(){ :; }'
  printf '%s\n' 'node(){ printf "%s\n" "$1" >> "$ATLAS_DIAGNOSTIC_FIXTURE_LOG"; return 23; }'
  sed -n '/^# Core reader behavior\./,$p' scripts/run_public_browser_qualification.sh
} > "$fixture_script"
if ATLAS_DIAGNOSTIC_FIXTURE_LOG="$fixture_log" bash "$fixture_script" >/dev/null 2>&1; then
  echo 'FAIL: protected qualifier did not stop on the first failing suite' >&2
  exit 1
fi
[[ "$(cat "$fixture_log")" == 'tests/browser-public-boot-smoke.js' ]]

python - <<'PY'
from pathlib import Path
import re
release=Path("scripts/run_public_browser_qualification.sh").read_text()
diag=Path("scripts/run_public_browser_diagnostics.sh").read_text()
boundary="# Core reader behavior."
cut="source scripts/public_browser_diagnostic_inventory.sh"
assert release.split(boundary)[0] == diag.split(cut)[0], "diagnostic bootstrap drifted from protected runner"
protected=release.split(boundary)[1]
suites=re.findall(r'node (tests/browser-public-[a-z0-9-]+\.js)',protected)
diagnostic=re.findall(r'tests/browser-public-[a-z0-9-]+\.js',diag.split(cut)[1])
assert len(suites)==11 and suites==diagnostic, (suites,diagnostic)
assert diag.count('diagnostic_group ')==5
assert protected.count('start_browser')==5
workflow=Path('.github/workflows/release-qualification.yml').read_text()
assert 'run: bash scripts/run_public_browser_qualification.sh' in workflow
assert 'run: bash scripts/run_public_browser_diagnostics.sh' not in workflow
assert 'run: bash tests/browser-diagnostic-inventory.test.sh' in workflow
print('browser diagnostics: PASS, two failures captured; protected release remains independent')
PY

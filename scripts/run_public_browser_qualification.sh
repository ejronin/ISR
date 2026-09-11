#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="${ATLAS_SITE_ROOT:-_site}"
SITE_URL="${ATLAS_SITE:-http://127.0.0.1:8765/}"
DEBUG_URL="${ATLAS_CDP:-http://127.0.0.1:9222}"
SCREENSHOT_DIR="${ATLAS_SCREENSHOT_DIR:-audit-screens}"

python -m http.server 8765 --bind 127.0.0.1 --directory "$SITE_ROOT" >/tmp/atlas-http.log 2>&1 &
server_pid=$!
browser_pid=''

process_is_running(){
  local pid="$1" state=''
  kill -0 "$pid" 2>/dev/null || return 1
  if [ -r "/proc/$pid/stat" ]; then
    state="$(sed -E 's/^.*\) ([A-Z]) .*/\1/' "/proc/$pid/stat" 2>/dev/null)" || true
    [ "$state" != 'Z' ]
    return
  fi
  return 0
}

terminate_process(){
  local pid="${1:-}" label="${2:-process}" deadline
  [ -n "$pid" ] || return 0
  if process_is_running "$pid"; then
    kill -TERM "$pid" 2>/dev/null || true
    deadline=$((SECONDS + 5))
    while process_is_running "$pid" && [ "$SECONDS" -lt "$deadline" ]; do sleep 0.1; done
  fi
  if process_is_running "$pid"; then
    echo "$label did not exit after TERM; sending KILL." >&2
    kill -KILL "$pid" 2>/dev/null || true
  fi
}

cleanup(){
  terminate_process "$browser_pid" browser || true
  terminate_process "$server_pid" 'HTTP server' || true
}
trap cleanup EXIT

mapfile -t browsers < <(for name in chromium google-chrome-stable google-chrome chromium-browser; do command -v "$name" 2>/dev/null || true; done | awk '!seen[$0]++')
[ "${#browsers[@]}" -gt 0 ] || { echo 'FAIL: no Chrome/Chromium executable available.' >&2; exit 1; }

start_browser(){
  local candidate deadline ready=0
  terminate_process "$browser_pid" 'prior browser' || true
  browser_pid=''
  for candidate in "${browsers[@]}"; do
    rm -rf /tmp/atlas-chrome-profile
    "$candidate" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --no-default-browser-check \
      --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --remote-allow-origins='*' \
      --user-data-dir=/tmp/atlas-chrome-profile "${SITE_URL}#/start/overview" >/tmp/atlas-chrome.log 2>&1 &
    browser_pid=$!
    deadline=$((SECONDS + 15))
    while [ "$SECONDS" -lt "$deadline" ]; do
      if curl -fsS --connect-timeout 1 --max-time 1 "$DEBUG_URL/json/version" >/tmp/atlas-cdp-version.json 2>/dev/null; then
        ready=1
        break
      fi
      if ! process_is_running "$browser_pid"; then break; fi
      sleep 0.25
    done
    [ "$ready" -eq 1 ] && return 0
    terminate_process "$browser_pid" 'browser candidate' || true
    browser_pid=''
  done
  cat /tmp/atlas-http.log >&2 || true
  cat /tmp/atlas-chrome.log >&2 || true
  echo 'FAIL: no Chrome/Chromium candidate exposed the CDP endpoint.' >&2
  return 1
}

export ATLAS_CDP="$DEBUG_URL" ATLAS_SITE="$SITE_URL"

# Core reader behavior. These suites intentionally share one process so they
# exercise history/route transitions against a realistic long-lived session.
start_browser
node tests/browser-public-boot-smoke.js
node tests/browser-public-ia-smoke.js
node tests/browser-public-evidence-phase5.js
node tests/browser-public-map-phase6.js
node tests/browser-public-parity-batch3.js
node tests/browser-public-loss-actor-batch2.js
node tests/browser-public-responsive-phase9.js
node tests/browser-public-phase9.js

# The exhaustive all-route audit is intentionally isolated. Long-running map
# and emulation suites can exhaust a headless browser process even when the
# application is correct; a dead CDP endpoint must not masquerade as a product
# failure, and the audit itself must not be skipped.
start_browser
node tests/browser-public-full-stack-audit.js
node tests/browser-public-source-humanization-focus.js
ATLAS_SCREENSHOT_DIR="$SCREENSHOT_DIR" node tests/browser-public-render-review.js

echo 'public browser qualification: PASS - core reader behavior and fresh-process exhaustive audit completed'

#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="${ATLAS_SITE_ROOT:-_site}"
SITE_URL="${ATLAS_SITE:-http://127.0.0.1:8765/}"
DEBUG_URL="${ATLAS_CDP:-http://127.0.0.1:9222}"
SCREENSHOT_DIR="${ATLAS_SCREENSHOT_DIR:-audit-screens}"

python -m http.server 8765 --bind 127.0.0.1 --directory "$SITE_ROOT" >/tmp/atlas-http.log 2>&1 &
server_pid=$!
browser_pid=''
browser_profile=''
profile_dirs=()

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

terminate_browser(){
  local profile="${browser_profile:-}" deadline
  terminate_process "$browser_pid" browser || true
  browser_pid=''
  if [ -n "$profile" ]; then
    pkill -TERM -f -- "--user-data-dir=$profile" 2>/dev/null || true
    deadline=$((SECONDS + 3))
    while pgrep -f -- "--user-data-dir=$profile" >/dev/null 2>&1 && [ "$SECONDS" -lt "$deadline" ]; do
      sleep 0.1
    done
    if pgrep -f -- "--user-data-dir=$profile" >/dev/null 2>&1; then
      pkill -KILL -f -- "--user-data-dir=$profile" 2>/dev/null || true
    fi
  fi
}

cleanup(){
  local profile
  terminate_browser || true
  terminate_process "$server_pid" 'HTTP server' || true
  for profile in "${profile_dirs[@]}"; do
    rm -rf -- "$profile" 2>/dev/null || true
  done
}
trap cleanup EXIT

mapfile -t browsers < <(for name in chromium google-chrome-stable google-chrome chromium-browser; do command -v "$name" 2>/dev/null || true; done | awk '!seen[$0]++')
[ "${#browsers[@]}" -gt 0 ] || { echo 'FAIL: no Chrome/Chromium executable available.' >&2; exit 1; }

# Chrome startup is an infrastructure prerequisite, not a public-reader test.
# Retry only a failed CDP bootstrap; NEVER rerun or suppress a failed browser assertion.
ATLAS_BROWSER_BOOT_TIMEOUT_SEC="${ATLAS_BROWSER_BOOT_TIMEOUT_SEC:-20}"
ATLAS_BROWSER_BOOT_ATTEMPTS="${ATLAS_BROWSER_BOOT_ATTEMPTS:-2}"

report_browser_boot_failure(){
  local candidate="$1" attempt="$2" reason="$3"
  echo "Chrome CDP startup failed: candidate=$candidate attempt=$attempt reason=$reason pid=${browser_pid:-none} profile=${browser_profile:-none} debug=$DEBUG_URL" >&2
  if [ -n "${browser_pid:-}" ]; then
    ps -o pid,ppid,stat,etime,cmd -p "$browser_pid" >&2 || true
  fi
  echo "--- CDP diagnostic (/json/version) ---" >&2
  curl --silent --show-error --connect-timeout 1 --max-time 2 "$DEBUG_URL/json/version" >&2 || true
  echo "" >&2
  echo "--- Chrome startup log (last 70 lines) ---" >&2
  tail -n 70 /tmp/atlas-chrome.log >&2 || true
  echo "--- HTTP server log (last 25 lines) ---" >&2
  tail -n 25 /tmp/atlas-http.log >&2 || true
}

start_browser(){
  local candidate attempt deadline ready reason
  terminate_browser || true
  browser_profile=''
  # The Python HTTP server starts asynchronously a few lines above.
  # A bounded probe avoids falsely rejecting a healthy server still binding.
  local server_deadline=$((SECONDS + 8)) server_ready=0
  while [ "$SECONDS" -lt "$server_deadline" ]; do
    if curl -fsS --connect-timeout 1 --max-time 1 "${SITE_URL%/}/index.html" >/dev/null 2>&1; then
      server_ready=1
      break
    fi
    if ! process_is_running "$server_pid"; then
      echo "FAIL: Atlas HTTP server exited before readiness (pid=$server_pid)" >&2
      break
    fi
    sleep 0.2
  done
  if [ "$server_ready" -ne 1 ]; then
    echo "FAIL: Atlas site failed bounded HTTP readiness probe: $SITE_URL" >&2
    tail -n 35 /tmp/atlas-http.log >&2 || true
    return 1
  fi
  for candidate in "${browsers[@]}"; do
    for ((attempt=1; attempt<=ATLAS_BROWSER_BOOT_ATTEMPTS; attempt++)); do
      browser_profile="$(mktemp -d /tmp/atlas-chrome-profile.XXXXXX)"
      profile_dirs+=("$browser_profile")
      echo "Starting Chromium CDP candidate=$candidate attempt=$attempt/$ATLAS_BROWSER_BOOT_ATTEMPTS" >&2
      "$candidate" --headless --no-sandbox --enable-unsafe-swiftshader --use-gl=swiftshader --disable-dev-shm-usage --no-first-run --no-default-browser-check \
        --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --remote-allow-origins='*' \
        --user-data-dir="$browser_profile" "${SITE_URL}#/start/overview" >/tmp/atlas-chrome.log 2>&1 &
      browser_pid=$!
      deadline=$((SECONDS + ATLAS_BROWSER_BOOT_TIMEOUT_SEC))
      ready=0
      reason="CDP readiness timeout"
      while [ "$SECONDS" -lt "$deadline" ]; do
        if curl -fsS --connect-timeout 1 --max-time 1 "$DEBUG_URL/json/version" >/tmp/atlas-cdp-version.json 2>/dev/null; then
          ready=1
          break
        fi
        if ! process_is_running "$browser_pid"; then
          reason="Chromium process exited before CDP readiness"
          break
        fi
        sleep 0.25
      done
      if [ "$ready" -eq 1 ] && process_is_running "$browser_pid"; then
        echo "Chromium CDP ready: candidate=$candidate attempt=$attempt pid=$browser_pid" >&2
        return 0
      fi
      report_browser_boot_failure "$candidate" "$attempt" "$reason"
      terminate_browser || true
      browser_profile=''
    done
  done
  echo "FAIL: all Chrome/Chromium CDP boot attempts exhausted; browser assertions were NOT executed." >&2
  return 1
}

export ATLAS_CDP="$DEBUG_URL" ATLAS_SITE="$SITE_URL"

# Diagnostic-only continuation of exact protected bootstrap.
source scripts/public_browser_diagnostic_inventory.sh
diagnostic_failures=()

diagnostic_group(){
  local label="$1" suite
  shift
  if ! start_browser; then
    diagnostic_record_failure "browser-bootstrap:$label" 1
    return 0
  fi
  for suite in "$@"; do
    if ! curl -fsS --connect-timeout 1 --max-time 2 "$DEBUG_URL/json/version" >/dev/null 2>&1; then
      echo "DIAGNOSTIC: CDP died before $suite; restarting." >&2
      if ! start_browser; then
        diagnostic_record_failure "browser-bootstrap:$label:$suite" 1
        continue
      fi
    fi
    diagnostic_run_suite "$suite"
  done
}
diagnostic_group core-shared tests/browser-public-boot-smoke.js tests/browser-public-ia-smoke.js tests/browser-public-evidence-phase5.js tests/browser-public-map-phase6.js tests/browser-public-parity-batch3.js tests/browser-public-loss-actor-batch2.js tests/browser-public-responsive-phase9.js
diagnostic_group phase9-isolated tests/browser-public-phase9.js
diagnostic_group full-stack-isolated tests/browser-public-full-stack-audit.js
diagnostic_group source-focus-isolated tests/browser-public-source-humanization-focus.js
diagnostic_group render-review-isolated tests/browser-public-render-review.js

if diagnostic_report; then exit 0; else exit 1; fi

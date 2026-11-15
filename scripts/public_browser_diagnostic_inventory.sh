#!/usr/bin/env bash
# Diagnostic bookkeeping only, never a release qualification result.
diagnostic_record_failure(){
  local label="${1:?missing failure label}" exit_code="${2:-1}"
  diagnostic_failures+=("$label(exit=$exit_code)")
  echo "DIAGNOSTIC FAILURE: $label (exit=$exit_code)" >&2
}
diagnostic_run_suite(){
  local suite="${1:?missing suite}" exit_code
  if node "$suite"; then
    echo "DIAGNOSTIC PASS: $suite" >&2
  else
    exit_code=$?
    diagnostic_record_failure "suite:$suite" "$exit_code"
  fi
  return 0
}
diagnostic_report(){
  local failure
  echo "=== BROWSER FAILURE INVENTORY: DIAGNOSTIC ONLY, NOT RELEASE QUALIFICATION ===" >&2
  if [ "${#diagnostic_failures[@]}" -eq 0 ]; then
    echo "No failures observed. Protected qualification is still required." >&2
    return 0
  fi
  echo "Total failures: ${#diagnostic_failures[@]}" >&2
  for failure in "${diagnostic_failures[@]}"; do
    echo " - $failure" >&2
  done
  echo "NOT QUALIFIED: diagnostic output cannot authorize merge or publication." >&2
  return 1
}

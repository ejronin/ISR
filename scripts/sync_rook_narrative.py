#!/usr/bin/env python3
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
    if not re.fullmatch(r'20\d{2}-\d{2}-\d{2}', value['evidence_as_of']):
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

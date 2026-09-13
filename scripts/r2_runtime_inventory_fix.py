#!/usr/bin/env python3
from pathlib import Path
path = Path(__file__).resolve().parents[1] / 'scripts' / 'validate_public_runtime_inventory.py'
text = path.read_text(encoding='utf-8')
old = '''    ("public page registry and route ownership", "js/public-ia.js", "PAGE_OWNERS"),\n'''
new = '''    ("authoritative visible reader registry and route lifecycle", "src/public-reader-registry.js", "function mount"),\n    ("non-authoritative base rendering library", "js/public-ia.js", "PAGE_OWNERS"),\n    ("non-authoritative reader projection support", "src/public-reader-layer.js", "READER_LAYER_VERSION"),\n'''
if text.count(old) != 1:
    raise SystemExit(f'expected exactly one old runtime service-owner tuple, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')
print('R2 runtime inventory validator contract updated')

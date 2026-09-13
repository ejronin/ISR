#!/usr/bin/env python3
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def replace_once(path, old, new):
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')

replace_once('tests/public-map-phase6.test.js',
    'assert.deepEqual(manifest.application.runtime, [byRole.map_runtime.path, byRole.page_registry.path, byRole.reader_projection.path]);',
    'assert.deepEqual(manifest.application.runtime, [byRole.map_runtime.path, byRole.base_runtime.path, byRole.reader_projection.path, byRole.page_registry.path]);')

replace_once('tests/public-final-polish.test.js',
    "assert(releaseCore.includes('2.3-single-pass-reader-assets'), 'single-pass core generator contract is missing');",
    "assert(releaseCore.includes('2.4-authoritative-reader-registry'), 'authoritative reader registry generator contract is missing');")
replace_once('tests/public-final-polish.test.js',
    "assert(appSource.includes('authorization.runtimeAssets.length === 3'), 'tracked public entrypoint does not require all three runtime assets');",
    "assert(appSource.includes('authorization.runtimeAssets.length === 4'), 'tracked public entrypoint does not require all four runtime assets');")

replace_once('tests/neutral-current-narrative.test.py',
    'assert "runtime.length === 3" in source',
    'assert "runtime.length === 4" in source')
replace_once('tests/neutral-current-narrative.test.py',
    'assert "2.3-single-pass-reader-assets" in core_builder',
    'assert "2.4-authoritative-reader-registry" in core_builder')

print('R2 test contract fixes applied')

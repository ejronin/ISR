#!/usr/bin/env python3
import base64
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'js/public-bootstrap.js').read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n').encode('utf-8')
sha = hashlib.sha256(source).hexdigest()
integrity = 'sha256-' + base64.b64encode(hashlib.sha256(source).digest()).decode('ascii')
asset_path = f'assets/releases/public-bootstrap.{sha}.js'

for relative in ('templates/public-index.html', 'index.html'):
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    updated, count_src = re.subn(r'src="assets/releases/public-bootstrap\.[a-f0-9]{64}\.js"', f'src="{asset_path}"', text, count=1)
    updated, count_sri = re.subn(r'integrity="sha256-[A-Za-z0-9+/=]+"(?=\s+crossorigin="anonymous"\s+data-bootstrap-sha256=)', f'integrity="{integrity}"', updated, count=1)
    updated, count_hash = re.subn(r'data-bootstrap-sha256="[a-f0-9]{64}"', f'data-bootstrap-sha256="{sha}"', updated, count=1)
    if (count_src, count_sri, count_hash) != (1, 1, 1):
        raise SystemExit(f'{relative}: bootstrap binding shape mismatch src={count_src} sri={count_sri} hash={count_hash}')
    path.write_text(updated, encoding='utf-8', newline='\n')

print(f'bootstrap binding refreshed: {asset_path}')

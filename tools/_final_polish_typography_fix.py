from pathlib import Path

root = Path(__file__).resolve().parents[1]
css_path = root / 'css/public-shell.css'
css = css_path.read_text(encoding='utf-8')
old = '.agreement-state { font-size: .58rem; padding: .15rem; }'
new = '.agreement-state { font-size: .72rem; padding: .15rem; }'
if old not in css:
    raise SystemExit('expected Phase 10 MOU microtype rule not found')
css_path.write_text(css.replace(old, new, 1), encoding='utf-8')
print('final polish typography floor repaired')

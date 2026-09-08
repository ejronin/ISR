from pathlib import Path

path = Path('tests/browser-public-phase9.js')
text = path.read_text(encoding='utf-8')
old = "      notAdjudicated: (document.querySelector('[data-agreement-balance]')?.innerText.match(/Balance not adjudicated/g) || []).length,"
new = "      notAdjudicated: [...document.querySelectorAll('[data-agreement-balance] .agreement-current-balance')].filter(node => node.textContent.trim() === 'Balance not adjudicated').length,"
if text.count(old) != 1:
    raise SystemExit(f'expected one MOU not-adjudicated counter, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')

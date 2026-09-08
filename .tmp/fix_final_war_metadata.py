from pathlib import Path

ia_path = Path('js/public-ia.js')
test_path = Path('tests/public-final-polish.test.js')
ia = ia_path.read_text(encoding='utf-8')
test = test_path.read_text(encoding='utf-8')
old = "    warSection.dataset.warIn90Seconds = 'approved';"
new = "    warSection.setAttribute('data-war-in-90-seconds', 'approved');"
if old not in ia:
    raise SystemExit('expected Gate A dataset assignment not found')
ia = ia.replace(old, new, 1)
old_test = "assert(source.includes(\".dataset.warIn90Seconds = 'approved'\"), 'War in 90 Seconds lacks deterministic approval metadata');"
new_test = "assert(source.includes(\"setAttribute('data-war-in-90-seconds', 'approved')\"), 'War in 90 Seconds lacks deterministic approval metadata');"
if old_test not in test:
    raise SystemExit('expected Gate A static assertion not found')
test = test.replace(old_test, new_test, 1)
ia_path.write_text(ia, encoding='utf-8')
test_path.write_text(test, encoding='utf-8')
print('final Gate A metadata fixed')

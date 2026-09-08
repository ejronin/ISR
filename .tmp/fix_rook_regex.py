from pathlib import Path

sync_path = Path('scripts/sync_rook_narrative.py')
sync = sync_path.read_text(encoding='utf-8')
lines = sync.splitlines()
for i, line in enumerate(lines):
    if "if not re.fullmatch(" in line and "evidence_as_of" in line:
        lines[i] = "    if not re.fullmatch(r'20\\d{2}-\\d{2}-\\d{2}', value['evidence_as_of']):"
sync_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')

test_path = Path('tests/public-final-polish.test.js')
test = test_path.read_text(encoding='utf-8')
test = test.replace('/^20\\\\d{2}-\\\\d{2}-\\\\d{2}$/', '/^20\\d{2}-\\d{2}-\\d{2}$/')
test_path.write_text(test, encoding='utf-8')
print('ROOK regex generation fixed')

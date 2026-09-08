from pathlib import Path

js = Path('js/public-ia.js')
text = js.read_text()
old = "const windowLabel = append(controls, 'label', '', 'Timeline scale'); const windowSelect = append(windowLabel, 'select'); [['all', 'Full war'], ['60', '60 days'], ['30', '30 days'], ['7', '7 days']].forEach(([value, label]) => { const option = append(windowSelect, 'option', '', label); option.value = value; });"
new = "const windowLabel = append(controls, 'label', '', 'Timeline scale'); const windowSelect = append(windowLabel, 'select'); windowSelect.dataset.timelineScaleControl = 'window'; [['all', 'Full war'], ['60', '60 days'], ['30', '30 days'], ['7', '7 days']].forEach(([value, label]) => { const option = append(windowSelect, 'option', '', label); option.value = value; });"
if text.count(old) != 1:
    raise SystemExit(f'timeline scale control construction changed: found {text.count(old)} matches')
text = text.replace(old, new, 1)
old = "const scaleSelect = explorer.querySelector('.timeline-controls select:last-of-type');"
new = "const scaleSelect = explorer.querySelector('[data-timeline-scale-control=\"window\"]');"
if text.count(old) != 1:
    raise SystemExit(f'timeline scale selector changed: found {text.count(old)} matches')
js.write_text(text.replace(old, new, 1))

static = Path('tests/public-phase10.test.js')
t = static.read_text()
anchor = "assert(source.includes(\"density.dataset.timelineDensity = 'record-count-only'\"), 'timeline density is not explicitly record-count-only');\n"
addition = "assert(source.includes(\"windowSelect.dataset.timelineScaleControl = 'window'\"), 'timeline scale control lacks an explicit selector boundary');\nassert(source.includes(\"explorer.querySelector('[data-timeline-scale-control=\\\"window\\\"]')\"), 'Phase 10 scale enhancement is not scoped to the timeline-scale control');\nassert(!source.includes(\".timeline-controls select:last-of-type\"), 'Phase 10 scale enhancement can corrupt a sibling filter select');\n"
if addition not in t:
    if anchor not in t:
        raise SystemExit('Phase 10 timeline selector test insertion point changed')
    static.write_text(t.replace(anchor, anchor + addition, 1))

browser = Path('tests/browser-public-phase9.js')
b = browser.read_text()
old = """      scaleLabels: [...(document.querySelector('[data-timeline-scale-model=\"semantic-conflict-span\"]')?.options || [])].map(option => option.textContent.trim()),
      fullLabel:"""
new = """      scaleLabels: [...(document.querySelector('[data-timeline-scale-model=\"semantic-conflict-span\"]')?.options || [])].map(option => option.textContent.trim()),
      topicLabels: [...document.querySelectorAll('.timeline-controls label')].find(label => /^Topic/.test(label.textContent.trim())) ? [...[...document.querySelectorAll('.timeline-controls label')].find(label => /^Topic/.test(label.textContent.trim())).querySelectorAll('option')].map(option => option.textContent.trim()) : [],
      fullLabel:"""
if b.count(old) != 1:
    raise SystemExit(f'Phase 9 timeline diagnostic block changed: found {b.count(old)} matches')
b = b.replace(old, new, 1)
anchor = "    assert.deepEqual(timeline.scaleLabels, ['Full', '4×', '8×', '16×']);\n"
addition = "    assert.deepEqual(timeline.topicLabels, ['All topics', 'Military', 'Hormuz', 'Economy', 'Diplomacy', 'Losses and damage', 'Wider record'], 'Phase 10 scale presentation corrupted the Topic filter');\n"
if addition not in b:
    if anchor not in b:
        raise SystemExit('Phase 9 topic-option assertion insertion point changed')
    b = b.replace(anchor, anchor + addition, 1)
browser.write_text(b)

from pathlib import Path

ia = Path('js/public-ia.js')
text = ia.read_text(encoding='utf-8')
old = """    asArray(war.milestones).forEach((milestone, index) => {\n      const step = append(sequence, 'article', 'story-step');\n      step.dataset.warMilestone = String(index + 1);\n      append(step, 'h3', '', milestone.title);\n      append(step, 'p', '', milestone.text);\n      const changed = append(step, 'p', 'record-status');\n      append(changed, 'strong', '', 'What changed: ');\n      changed.append(context.documentObject.createTextNode(milestone.changed));\n    });\n"""
new = """    asArray(war.milestones).forEach((milestone, index) => {\n      const step = append(sequence, 'article', 'story-step');\n      step.dataset.warMilestone = String(index + 1);\n      const marker = append(step, 'span', 'step-number', String(index + 1));\n      marker.setAttribute('aria-hidden', 'true');\n      const body = append(step, 'div', 'step-body');\n      append(body, 'h3', '', milestone.title);\n      append(body, 'p', '', milestone.text);\n      const changed = append(body, 'p', 'record-status');\n      append(changed, 'strong', '', 'What changed: ');\n      changed.append(context.documentObject.createTextNode(milestone.changed));\n    });\n"""
if old not in text:
    raise SystemExit('expected Gate A milestone block not found')
ia.write_text(text.replace(old, new, 1), encoding='utf-8')

browser = Path('tests/browser-public-final-polish.js')
b = browser.read_text(encoding='utf-8')
old_probe = """          warMilestones: war?.querySelectorAll('[data-war-milestone]').length || 0,\n          warDisclaimer: war?.querySelector('.section-note')?.textContent || '',\n"""
new_probe = """          warMilestones: war?.querySelectorAll('[data-war-milestone]').length || 0,\n          warMilestoneBodies: [...(war?.querySelectorAll('[data-war-milestone] > .step-body') || [])].map(node => node.getBoundingClientRect().width),\n          warDisclaimer: war?.querySelector('.section-note')?.textContent || '',\n"""
if old_probe not in b:
    raise SystemExit('expected browser Gate A probe not found')
b = b.replace(old_probe, new_probe, 1)
old_assert = """      assert.equal(start.warMilestones, 8, `War in 90 Seconds does not contain exactly eight milestones at ${width}px`);\n      assert(/not a ranking of strategic importance/i.test(start.warDisclaimer), `War in 90 Seconds lost its non-ranking disclaimer at ${width}px`);\n"""
new_assert = """      assert.equal(start.warMilestones, 8, `War in 90 Seconds does not contain exactly eight milestones at ${width}px`);\n      assert.equal(start.warMilestoneBodies.length, 8, `War in 90 Seconds milestone content is not contained by the story-step body at ${width}px`);\n      if (width <= 390) assert(Math.min(...start.warMilestoneBodies) >= 180, `War in 90 Seconds milestone body is squeezed below a readable mobile width at ${width}px`);\n      assert(/not a ranking of strategic importance/i.test(start.warDisclaimer), `War in 90 Seconds lost its non-ranking disclaimer at ${width}px`);\n"""
if old_assert not in b:
    raise SystemExit('expected browser Gate A assertion block not found')
browser.write_text(b.replace(old_assert, new_assert, 1), encoding='utf-8')

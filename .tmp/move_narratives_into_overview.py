from pathlib import Path
import re

app_path = Path('js/public-app.js')
ia_path = Path('js/public-ia.js')
test_path = Path('tests/public-final-polish.test.js')
app = app_path.read_text(encoding='utf-8')
ia = ia_path.read_text(encoding='utf-8')
test = test_path.read_text(encoding='utf-8')

# The public app supplies approved narrative configuration only. The page owner owns visible DOM.
app, count = re.subn(
    r"\n  function narrativeNode\(documentObject, tagName, className, text\) \{.*?\n  function now\(\) \{",
    "\n  function now() {",
    app,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'expected one narrative post-render block, removed={count}')

app = app.replace(
    "      performance: loaded.performance,\n      routeKey: null,",
    "      performance: loaded.performance,\n      narrativeContract: FINAL_NARRATIVE_GATES,\n      routeKey: null,",
    1,
)
app = app.replace("    installFinalNarrativeGates(rootElement, documentObject, windowObject, state, ia);\n", "", 1)
if 'MutationObserver' in app:
    raise SystemExit('forbidden MutationObserver remains in public-app.js')
if 'installFinalNarrativeGates' in app or 'buildFinalNarrativeGates' in app or 'function narrativeNode' in app:
    raise SystemExit('post-render narrative machinery remains in public-app.js')
if 'narrativeContract: FINAL_NARRATIVE_GATES' not in app:
    raise SystemExit('narrative contract was not added to app state')
app_path.write_text(app, encoding='utf-8')

renderer = r'''
  function renderFinalNarrativeGates(article, context) {
    const contract = context.state && context.state.narrativeContract;
    if (!contract || article.querySelector('[data-narrative-gates]')) return;
    const wrapper = append(article, 'div', 'narrative-gates');
    wrapper.dataset.narrativeGates = 'approved';

    const war = contract.war90;
    const warSection = append(wrapper, 'section', 'content-section narrative-gate');
    warSection.dataset.warIn90Seconds = 'approved';
    warSection.dataset.narrativeGate = 'war-90';
    append(warSection, 'h2', '', war.title);
    append(warSection, 'p', 'section-note', war.disclaimer);
    const sequence = append(warSection, 'div', 'story-sequence');
    asArray(war.milestones).forEach((milestone, index) => {
      const step = append(sequence, 'article', 'story-step');
      step.dataset.warMilestone = String(index + 1);
      append(step, 'h3', '', milestone.title);
      append(step, 'p', '', milestone.text);
      const changed = append(step, 'p', 'record-status');
      append(changed, 'strong', '', 'What changed: ');
      changed.append(context.documentObject.createTextNode(milestone.changed));
    });
    const warFooter = append(warSection, 'p', 'section-note');
    warFooter.append(context.documentObject.createTextNode(`${war.disclaimer} Open the `));
    const timelineLink = append(warFooter, 'a', 'inline-route-link', 'full Timeline');
    timelineLink.href = routeHref('timeline.war');
    warFooter.append(context.documentObject.createTextNode(' for the complete dated record.'));

    const objectives = contract.objectives;
    const objectiveSection = append(wrapper, 'section', 'content-section narrative-gate');
    objectiveSection.dataset.objectiveOrientation = 'approved';
    objectiveSection.dataset.narrativeGate = 'objectives';
    append(objectiveSection, 'h2', '', objectives.title);
    const objectiveGrid = append(objectiveSection, 'div', 'record-list two-column-list');
    asArray(objectives.actors).forEach(actor => {
      const card = append(objectiveGrid, 'article', 'record-card evidence-card');
      card.dataset.objectiveActor = actor.key;
      append(card, 'h3', '', actor.title);
      asArray(actor.stages).forEach(stage => {
        const stageNode = append(card, 'div', 'narrative-stage');
        stageNode.dataset.objectiveStage = stage.key;
        append(stageNode, 'h4', '', stage.title);
        append(stageNode, 'p', '', stage.text);
      });
    });

    const usEntry = contract.usEntry;
    const rationaleSection = append(wrapper, 'section', 'content-section narrative-gate');
    rationaleSection.dataset.usWarRationale = 'approved';
    rationaleSection.dataset.narrativeGate = 'us-entry';
    append(rationaleSection, 'h2', '', usEntry.title);
    append(rationaleSection, 'p', 'section-note', usEntry.intro);
    const rationaleGrid = append(rationaleSection, 'div', 'record-list two-column-list');
    asArray(usEntry.items).forEach(item => {
      const card = append(rationaleGrid, 'article', 'record-card evidence-card');
      card.dataset.rationaleKind = item.key;
      append(card, 'h3', '', item.title);
      append(card, 'p', '', item.text);
    });

    const hormuz = contract.hormuz;
    const hormuzSection = append(wrapper, 'section', 'content-section narrative-gate');
    hormuzSection.dataset.hormuzTrajectory = 'approved';
    hormuzSection.dataset.narrativeGate = 'hormuz-trajectory';
    append(hormuzSection, 'h2', '', hormuz.title);
    const hormuzGrid = append(hormuzSection, 'div', 'story-grid');
    asArray(hormuz.stages).forEach(stage => {
      const card = append(hormuzGrid, 'article', 'record-card evidence-card');
      card.dataset.hormuzStage = stage.key;
      append(card, 'h3', '', stage.title);
      append(card, 'p', '', stage.text);
    });
  }

'''
marker = '  function OverviewPage(context) {'
if 'function renderFinalNarrativeGates' not in ia:
    if marker not in ia:
        raise SystemExit('OverviewPage marker missing')
    ia = ia.replace(marker, renderer + marker, 1)

call_marker = "    const whatHappened = addSection(frame.article, 'How the conflict opened', 'content-section lead-story historical-orientation');"
if 'renderFinalNarrativeGates(frame.article, context);' not in ia:
    if call_marker not in ia:
        raise SystemExit('OverviewPage narrative insertion marker missing')
    ia = ia.replace(call_marker, "    renderFinalNarrativeGates(frame.article, context);\n\n" + call_marker, 1)

if 'MutationObserver' in ia:
    raise SystemExit('public-ia already contains forbidden MutationObserver')
ia_path.write_text(ia, encoding='utf-8')

# Static contract: fixed copy/config remains app-owned; DOM semantics are page-owner-owned.
test = test.replace("assert(appSource.includes(\".dataset.warIn90Seconds = 'approved'\"), 'War in 90 Seconds lacks deterministic approval metadata');", "assert(source.includes(\".dataset.warIn90Seconds = 'approved'\"), 'War in 90 Seconds lacks deterministic approval metadata');")
test = test.replace("assert(appSource.includes(\".dataset.objectiveOrientation = 'approved'\"), 'objective orientation lacks deterministic approval metadata');", "assert(source.includes(\".dataset.objectiveOrientation = 'approved'\"), 'objective orientation lacks deterministic approval metadata');")
test = test.replace("assert(appSource.includes(\".dataset.usWarRationale = 'approved'\"), 'U.S. rationale module lacks deterministic approval metadata');", "assert(source.includes(\".dataset.usWarRationale = 'approved'\"), 'U.S. rationale module lacks deterministic approval metadata');")
test = test.replace("assert(appSource.includes(\".dataset.hormuzTrajectory = 'approved'\"), 'Hormuz trajectory lacks deterministic approval metadata');", "assert(source.includes(\".dataset.hormuzTrajectory = 'approved'\"), 'Hormuz trajectory lacks deterministic approval metadata');")
test = test.replace("assert(appSource.includes(\"article.querySelector('.evidence-clock-bar')\"), 'narrative gates are not anchored after the Evidence Clock');", "assert(source.includes('renderFinalNarrativeGates(frame.article, context);'), 'OverviewPage does not own the cleared narrative modules');\nassert(appSource.includes('narrativeContract: FINAL_NARRATIVE_GATES'), 'public app does not supply the approved narrative contract to the page owner');\nassert(source.includes(\"const startState = context.route.key === 'start.overview' ? article.querySelector('[data-current-state-summary]')\"), 'Start Here Evidence Clock is not anchored to current state before narrative orientation');")
test = test.replace("assert(appSource.includes('MutationObserver'), 'narrative gates are not re-applied after route DOM replacement');\n", "")
if "appSource.includes('MutationObserver')" in test:
    raise SystemExit('obsolete MutationObserver assertion remains in Final Polish test')
test_path.write_text(test, encoding='utf-8')

print('page-owner narrative migration applied')

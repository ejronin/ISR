from pathlib import Path

js = Path('js/public-ia.js')
text = js.read_text()
old = """        const referenceLabels = asArray(geography.metadata && geography.metadata.labels)
          .filter(label => !allowedReferenceNames || allowedReferenceNames.has(label.label))
          .map(label => ({ ...label, priority: label.kind === 'water' ? 1 : 2 }));
        const suppliedContextLabels = asArray(options && options.contextLabels);
        const derivedContextLabels = suppliedContextLabels.length ? suppliedContextLabels : routeHeavy ? routeContextLabels(routes, true) : [];
        const visibleLabels = [...referenceLabels, ...derivedContextLabels]
          .filter((label, index, labels) => label && Number.isFinite(Number(label.lat)) && Number.isFinite(Number(label.lon)) && labels.findIndex(candidate => candidate && candidate.label === label.label && Number(candidate.lat) === Number(label.lat) && Number(candidate.lon) === Number(label.lon)) === index)
          .filter(label => label.lat >= viewport[0][0] && label.lat <= viewport[1][0] && label.lon >= viewport[0][1] && label.lon <= viewport[1][1])
          .sort((left, right) => Number(left.priority ?? 2) - Number(right.priority ?? 2) || String(left.label).localeCompare(String(right.label)));
        const windowWidth = Number(context.windowObject && context.windowObject.innerWidth || 1440);
        const automaticLabelLimit = routeHeavy ? (windowWidth <= 390 ? 8 : windowWidth <= 768 ? 10 : 14) : routeKey === 'military.campaigns' ? (windowWidth <= 390 ? 8 : windowWidth <= 768 ? 9 : 10) : Number.POSITIVE_INFINITY;
        const configuredLabelLimit = Number(options && options.labelLimit);
        const labelLimit = Number.isFinite(configuredLabelLimit) && configuredLabelLimit > 0 ? configuredLabelLimit : automaticLabelLimit;
        const renderedLabels = visibleLabels.slice(0, labelLimit);
        section.dataset.mapLabelPolicy = routeHeavy ? 'route-endpoints-prioritized' : routeKey === 'military.campaigns' ? 'theater-context-prioritized' : 'viewport-reference';
        section.dataset.mapLabelCount = String(renderedLabels.length);
        renderedLabels.forEach(label => {
          L.marker([label.lat, label.lon], { pane: 'atlas-labels', interactive: false, icon: L.divIcon({ className: `reference-map-label ${label.kind || ''}`, html: `<span>${String(label.label).replace(/[<>&]/g, '')}</span>`, iconSize: null }) }).addTo(map);
        });
        mapHost.addEventListener('keydown', event => { if (event.key === 'Escape' && !cardHost.hidden) { event.preventDefault(); cardHost.hidden = true; cardHost.replaceChildren(); } });
        if (root.requestAnimationFrame) root.requestAnimationFrame(() => {
          if (!section.isConnected || !map._mapPane) return;
          map.invalidateSize(false); fitVisibleGeography();
        });"""
new = """        const windowWidth = Number(context.windowObject && context.windowObject.innerWidth || 1440);
        const compactLabelMode = windowWidth <= 390;
        const referenceLabels = asArray(geography.metadata && geography.metadata.labels)
          .filter(label => !allowedReferenceNames || allowedReferenceNames.has(label.label))
          .map(label => ({ ...label, priority: compactLabelMode ? (label.kind === 'water' ? 0 : 1) : (label.kind === 'water' ? 1 : 2) }));
        const suppliedContextLabels = asArray(options && options.contextLabels);
        const derivedContextLabels = (suppliedContextLabels.length ? suppliedContextLabels : routeHeavy ? routeContextLabels(routes, true) : [])
          .map(label => ({ ...label, priority: compactLabelMode ? 2 : Number(label.priority ?? 0) }));
        const visibleLabels = [...referenceLabels, ...derivedContextLabels]
          .filter((label, index, labels) => label && Number.isFinite(Number(label.lat)) && Number.isFinite(Number(label.lon)) && labels.findIndex(candidate => candidate && candidate.label === label.label && Number(candidate.lat) === Number(label.lat) && Number(candidate.lon) === Number(label.lon)) === index)
          .filter(label => label.lat >= viewport[0][0] && label.lat <= viewport[1][0] && label.lon >= viewport[0][1] && label.lon <= viewport[1][1])
          .sort((left, right) => Number(left.priority ?? 2) - Number(right.priority ?? 2));
        const automaticLabelLimit = routeHeavy ? (windowWidth <= 390 ? 12 : windowWidth <= 768 ? 12 : 14) : routeKey === 'military.campaigns' ? (windowWidth <= 390 ? 10 : windowWidth <= 768 ? 10 : 10) : Number.POSITIVE_INFINITY;
        const configuredLabelLimit = Number(options && options.labelLimit);
        const labelLimit = Number.isFinite(configuredLabelLimit) && configuredLabelLimit > 0 ? configuredLabelLimit : automaticLabelLimit;
        const renderedLabels = visibleLabels.slice(0, labelLimit);
        section.dataset.mapLabelPolicy = routeHeavy ? 'route-endpoints-prioritized' : routeKey === 'military.campaigns' ? 'theater-context-prioritized' : 'viewport-reference';
        section.dataset.mapLabelCount = String(renderedLabels.length);
        const labelMarkers = [];
        renderedLabels.forEach(label => {
          const marker = L.marker([label.lat, label.lon], { pane: 'atlas-labels', interactive: false, icon: L.divIcon({ className: `reference-map-label ${label.kind || ''}`, html: `<span>${String(label.label).replace(/[<>&]/g, '')}</span>`, iconSize: null }) }).addTo(map);
          labelMarkers.push(marker);
        });
        const declutterReferenceLabels = () => {
          const nodes = labelMarkers.map(marker => marker.getElement()).filter(Boolean);
          nodes.forEach(node => { node.style.display = ''; });
          if (windowWidth > 768) { section.dataset.mapVisibleLabelCount = String(nodes.length); return; }
          const kept = [];
          const maxVisible = windowWidth <= 390 ? (routeHeavy ? 6 : 7) : (routeHeavy ? 9 : 10);
          nodes.forEach(node => {
            const span = node.querySelector('span') || node;
            const rect = span.getBoundingClientRect();
            const box = { left: rect.left - 4, right: rect.right + 4, top: rect.top - 3, bottom: rect.bottom + 3 };
            const collides = kept.some(prior => !(box.right <= prior.left || box.left >= prior.right || box.bottom <= prior.top || box.top >= prior.bottom));
            if (collides || kept.length >= maxVisible) node.style.display = 'none';
            else kept.push(box);
          });
          section.dataset.mapVisibleLabelCount = String(kept.length);
        };
        map.on('zoomend moveend', declutterReferenceLabels);
        mapHost.addEventListener('keydown', event => { if (event.key === 'Escape' && !cardHost.hidden) { event.preventDefault(); cardHost.hidden = true; cardHost.replaceChildren(); } });
        if (root.requestAnimationFrame) root.requestAnimationFrame(() => {
          if (!section.isConnected || !map._mapPane) return;
          map.invalidateSize(false); fitVisibleGeography(); declutterReferenceLabels();
        });"""
if text.count(old) != 1:
    raise SystemExit(f'label block changed: found {text.count(old)} matches')
js.write_text(text.replace(old, new, 1))

css = Path('css/public-shell.css')
c = css.read_text()
marker = '/* Phase 10 label-collision follow-up */'
if marker not in c:
    c += """

/* Phase 10 label-collision follow-up */
.economic-paired-values span,
.economic-paired-values strong { white-space: nowrap; overflow-wrap: normal; word-break: normal; }
"""
    css.write_text(c)

render = Path('tests/browser-public-render-review.js')
r = render.read_text()
old_state = """            labels: target.querySelectorAll('.reference-map-label').length,
            labelPolicy: map?.dataset.mapLabelPolicy || '',
            scope: map?.dataset.mapScope || '',"""
new_state = """            labels: target.querySelectorAll('.reference-map-label').length,
            visibleLabels: [...target.querySelectorAll('.reference-map-label')].filter(node => getComputedStyle(node).display !== 'none').length,
            labelOverlaps: (() => {
              const boxes = [...target.querySelectorAll('.reference-map-label')]
                .filter(node => getComputedStyle(node).display !== 'none')
                .map(node => (node.querySelector('span') || node).getBoundingClientRect());
              let overlaps = 0;
              for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
                const a = boxes[i], b = boxes[j];
                if (!(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)) overlaps += 1;
              }
              return overlaps;
            })(),
            labelPolicy: map?.dataset.mapLabelPolicy || '',
            scope: map?.dataset.mapScope || '',"""
if r.count(old_state) != 1:
    raise SystemExit('render state block changed')
r = r.replace(old_state, new_state, 1)
old_assert = """        if (focus.label === 'shipping-network' || focus.label === 'economy-network') {
          const labelCeiling = width <= 390 ? 8 : width <= 768 ? 10 : 14;
          assert(reviewState.labels <= labelCeiling, `${focus.label} exceeds ${labelCeiling} contextual labels at ${width}px`);
          assert.equal(reviewState.labelPolicy, 'route-endpoints-prioritized', `${focus.label} is not using the route-endpoint label policy at ${width}px`);
        }
        if (focus.label === 'campaign') {
          const labelCeiling = width <= 390 ? 8 : width <= 768 ? 9 : 10;
          assert(reviewState.labels <= labelCeiling, `campaign map exceeds ${labelCeiling} theater labels at ${width}px`);
          assert.equal(reviewState.labelPolicy, 'theater-context-prioritized', `campaign map is not using the theater label policy at ${width}px`);
        }"""
new_assert = """        if (focus.label === 'shipping-network' || focus.label === 'economy-network') {
          const visibleCeiling = width <= 390 ? 6 : width <= 768 ? 9 : 14;
          assert(reviewState.visibleLabels <= visibleCeiling, `${focus.label} exceeds ${visibleCeiling} visible contextual labels at ${width}px`);
          assert.equal(reviewState.labelPolicy, 'route-endpoints-prioritized', `${focus.label} is not using the route-endpoint label policy at ${width}px`);
        }
        if (focus.label === 'campaign') {
          const visibleCeiling = width <= 390 ? 7 : width <= 768 ? 10 : 10;
          assert(reviewState.visibleLabels <= visibleCeiling, `campaign map exceeds ${visibleCeiling} visible theater labels at ${width}px`);
          assert.equal(reviewState.labelPolicy, 'theater-context-prioritized', `campaign map is not using the theater label policy at ${width}px`);
        }
        if (width <= 390) assert.equal(reviewState.labelOverlaps, 0, `${focus.label} has overlapping visible context labels at ${width}px`);"""
if r.count(old_assert) != 1:
    raise SystemExit('render map assertions changed')
render.write_text(r.replace(old_assert, new_assert, 1))

test = Path('tests/public-phase10.test.js')
t = test.read_text()
anchor = "assert(css.includes('Phase 10 manual map-readability follow-up'));\n"
addition = "assert(source.includes('const declutterReferenceLabels = () =>'), 'responsive map labels lack deterministic collision suppression');\nassert(source.includes(\"map.on('zoomend moveend', declutterReferenceLabels)\"), 'map label collision suppression does not follow viewport changes');\nassert(css.includes('Phase 10 label-collision follow-up'));\n"
if addition not in t:
    if anchor not in t:
        raise SystemExit('static contract anchor changed')
    test.write_text(t.replace(anchor, anchor + addition, 1))

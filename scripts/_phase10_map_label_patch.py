from pathlib import Path

js = Path('js/public-ia.js')
text = js.read_text()

old_labels = """        [...asArray(geography.metadata && geography.metadata.labels), ...asArray(options && options.contextLabels)].filter((label, index, labels) => label && Number.isFinite(Number(label.lat)) && Number.isFinite(Number(label.lon)) && labels.findIndex(candidate => candidate && candidate.label === label.label && Number(candidate.lat) === Number(label.lat) && Number(candidate.lon) === Number(label.lon)) === index).filter(label => label.lat >= viewport[0][0] && label.lat <= viewport[1][0] && label.lon >= viewport[0][1] && label.lon <= viewport[1][1]).forEach(label => {
          L.marker([label.lat, label.lon], { pane: 'atlas-labels', interactive: false, icon: L.divIcon({ className: `reference-map-label ${label.kind || ''}`, html: `<span>${String(label.label).replace(/[<>&]/g, '')}</span>`, iconSize: null }) }).addTo(map);
        });"""
new_labels = """        const routeHeavy = routes.length > 1;
        const campaignReferenceNames = new Set(['Iran', 'Iraq', 'Saudi Arabia', 'Israel / Palestinian territories', 'United Arab Emirates', 'Oman', 'Red Sea', 'Persian Gulf', 'Strait of Hormuz']);
        const routeReferenceNames = new Set(['Iran', 'Saudi Arabia', 'Red Sea', 'Persian Gulf']);
        const allowedReferenceNames = options && options.referenceLabelNames
          ? new Set(asArray(options.referenceLabelNames))
          : routeHeavy ? routeReferenceNames : routeKey === 'military.campaigns' ? campaignReferenceNames : null;
        const referenceLabels = asArray(geography.metadata && geography.metadata.labels)
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
        });"""
if text.count(old_labels) != 1:
    raise SystemExit(f'MapView label block changed: found {text.count(old_labels)} matches')
text = text.replace(old_labels, new_labels, 1)

old_context = """function routeContextLabels(routes) {
  const labels = [];
  asArray(routes).forEach(route => asArray(route && route.nodes).forEach(node => {
    if (Array.isArray(node) && node.length >= 3 && Number.isFinite(Number(node[1])) && Number.isFinite(Number(node[2]))) labels.push({ label: publicNarrative(node[0], 'Route node'), lat: Number(node[1]), lon: Number(node[2]), kind: String(route.mode || '').toLowerCase() === 'maritime' ? 'port' : 'place' });
    else if (node && typeof node === 'object') {
      const lat = Number(node.lat === undefined ? node.latitude : node.lat); const lon = Number(node.lon === undefined ? node.longitude : node.lon);
      if (validMapPoint([lat, lon])) labels.push({ label: publicNarrative(node.label || node.name, 'Route node'), lat, lon, kind: node.kind || 'place' });
    }
  }));
  return labels;
}"""
new_context = """function routeContextLabels(routes, endpointsOnly) {
  const labels = [];
  asArray(routes).forEach(route => {
    const nodes = asArray(route && route.nodes);
    nodes.forEach((node, index) => {
      const endpoint = index === 0 || index === nodes.length - 1;
      if (endpointsOnly && !endpoint) return;
      const priority = endpoint ? 0 : 3;
      if (Array.isArray(node) && node.length >= 3 && Number.isFinite(Number(node[1])) && Number.isFinite(Number(node[2]))) labels.push({ label: publicNarrative(node[0], 'Route node'), lat: Number(node[1]), lon: Number(node[2]), kind: String(route.mode || '').toLowerCase() === 'maritime' ? 'port' : 'place', priority });
      else if (node && typeof node === 'object') {
        const lat = Number(node.lat === undefined ? node.latitude : node.lat); const lon = Number(node.lon === undefined ? node.longitude : node.lon);
        if (validMapPoint([lat, lon])) labels.push({ label: publicNarrative(node.label || node.name, 'Route node'), lat, lon, kind: node.kind || 'place', priority });
      }
    });
  });
  return labels;
}"""
if text.count(old_context) != 1:
    raise SystemExit(f'routeContextLabels block changed: found {text.count(old_context)} matches')
js.write_text(text.replace(old_context, new_context, 1))

css = Path('css/public-shell.css')
css_text = css.read_text()
marker = '/* Phase 10 manual map-readability follow-up */'
if marker not in css_text:
    css_text += """

/* Phase 10 manual map-readability follow-up */
.campaign-hero .at-a-glance .metric-grid { grid-template-columns: 1fr; }
.campaign-hero .at-a-glance .metric-card,
.campaign-hero .at-a-glance .metric { min-width: 0; }
.campaign-hero .at-a-glance .metric-card *,
.campaign-hero .at-a-glance .metric * { overflow-wrap: normal; word-break: normal; }
@media (max-width: 52rem) {
  .reference-map-label.place span,
  .reference-map-label.port span { font-size: .64rem; }
}
"""
    css.write_text(css_text)

test = Path('tests/public-phase10.test.js')
t = test.read_text()
anchor = "assert(source.includes('(analyticalHero || clocks || glance || intro).after(nav)'), 'local section navigation can still precede the analytical hero');\n"
addition = "assert(source.includes(\"section.dataset.mapLabelPolicy = routeHeavy ? 'route-endpoints-prioritized'\"), 'route-heavy maps lack deterministic label-density policy');\nassert(source.includes(\"routeContextLabels(routes, true)\"), 'route-heavy maps do not derive endpoint context when explicit labels are absent');\nassert(css.includes('Phase 10 manual map-readability follow-up'));\n"
if addition not in t:
    if anchor not in t:
        raise SystemExit('Phase 10 map-readability test insertion point changed')
    test.write_text(t.replace(anchor, anchor + addition, 1))

render = Path('tests/browser-public-render-review.js')
r = render.read_text()
old = """            labels: target.querySelectorAll('.reference-map-label').length,
            scope: map?.dataset.mapScope || '',
            bounds: map?.dataset.mapBounds || ''"""
new = """            labels: target.querySelectorAll('.reference-map-label').length,
            labelPolicy: map?.dataset.mapLabelPolicy || '',
            scope: map?.dataset.mapScope || '',
            bounds: map?.dataset.mapBounds || ''"""
if r.count(old) != 1:
    raise SystemExit('render-review label diagnostic insertion point changed')
r = r.replace(old, new, 1)
old_assert = """        if (focus.label === 'shipping-network') {
          assert(reviewState.routePaths > 0, `${focus.label} has no rendered SVG route geometry at ${width}px`);
          assert(reviewState.routeControls > 0 && reviewState.routeModes, `${focus.label} lacks route controls or route-mode metadata at ${width}px`);
        }"""
new_assert = """        if (focus.label === 'shipping-network') {
          assert(reviewState.routePaths > 0, `${focus.label} has no rendered SVG route geometry at ${width}px`);
          assert(reviewState.routeControls > 0 && reviewState.routeModes, `${focus.label} lacks route controls or route-mode metadata at ${width}px`);
        }
        if (focus.label === 'shipping-network' || focus.label === 'economy-network') {
          const labelCeiling = width <= 390 ? 8 : width <= 768 ? 10 : 14;
          assert(reviewState.labels <= labelCeiling, `${focus.label} exceeds ${labelCeiling} contextual labels at ${width}px`);
          assert.equal(reviewState.labelPolicy, 'route-endpoints-prioritized', `${focus.label} is not using the route-endpoint label policy at ${width}px`);
        }
        if (focus.label === 'campaign') {
          const labelCeiling = width <= 390 ? 8 : width <= 768 ? 9 : 10;
          assert(reviewState.labels <= labelCeiling, `campaign map exceeds ${labelCeiling} theater labels at ${width}px`);
          assert.equal(reviewState.labelPolicy, 'theater-context-prioritized', `campaign map is not using the theater label policy at ${width}px`);
        }"""
if r.count(old_assert) != 1:
    raise SystemExit('render-review map assertion block changed')
render.write_text(r.replace(old_assert, new_assert, 1))

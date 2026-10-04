(function initGuideVisualizationRenderer(globalObject, factory) {
  'use strict';
  const api = factory(globalObject);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  globalObject.AtlasVisualizationRenderer = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function guideVisualizationRendererFactory(root) {
  'use strict';

  const MAPLIBRE_VERSION = '6.11.2';
  const ECHARTS_VERSION = '6.1.0';
  const CAMERA_PRESETS = Object.freeze({
    gulf: Object.freeze([[43.0, 18.0], [63.5, 33.5]]),
    hormuz: Object.freeze([[50.8, 22.4], [60.8, 28.9]])
  });
  let capabilityPromise = null;
  let echartsCapabilityPromise = null;

  function element(documentObject, tag, className, text) {
    const node = documentObject.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function append(parent, tag, className, text) {
    const node = element(parent.ownerDocument, tag, className, text);
    parent.append(node);
    return node;
  }

  function asArray(value) { return Array.isArray(value) ? value : []; }
  function unique(values) { return Array.from(new Set(values.filter(Boolean))); }
  function reducedMotion(windowObject) {
    return Boolean(windowObject && windowObject.matchMedia && windowObject.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function authorization() {
    const capability = root.ATLAS_RELEASE_AUTHORIZATION && root.ATLAS_RELEASE_AUTHORIZATION.capabilities && root.ATLAS_RELEASE_AUTHORIZATION.capabilities.maplibre;
    if (!capability || capability.version !== MAPLIBRE_VERSION) throw new Error('Signed MapLibre capability is unavailable.');
    return capability;
  }

  function echartsAuthorization() {
    const capability = root.ATLAS_RELEASE_AUTHORIZATION && root.ATLAS_RELEASE_AUTHORIZATION.capabilities && root.ATLAS_RELEASE_AUTHORIZATION.capabilities.echarts;
    if (!capability || capability.version !== ECHARTS_VERSION || capability.profile !== 'simple') throw new Error('Signed ECharts capability is unavailable.');
    return capability;
  }

  function sameOriginUrl(path, windowObject) {
    const base = windowObject && windowObject.location && windowObject.location.href || root.location && root.location.href;
    const url = new URL('./' + path, base);
    const origin = windowObject && windowObject.location && windowObject.location.origin || root.location && root.location.origin;
    if (url.origin !== origin) throw new Error('Visualization capability escaped same-origin policy.');
    return url;
  }

  function ensureStylesheet(documentObject, asset, windowObject) {
    const selector = `link[data-guide-maplibre-style="${asset.sha256}"]`;
    const existing = documentObject.querySelector(selector);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const link = documentObject.createElement('link');
      link.rel = 'stylesheet';
      link.href = sameOriginUrl(asset.path, windowObject).href;
      link.integrity = asset.integrity;
      link.crossOrigin = 'anonymous';
      link.dataset.guideMaplibreStyle = asset.sha256;
      link.onload = () => resolve(link);
      link.onerror = () => reject(new Error('MapLibre stylesheet failed integrity loading.'));
      documentObject.head.append(link);
    });
  }

  function ensureModulePreload(documentObject, asset, windowObject) {
    const selector = `link[data-guide-maplibre-module="${asset.sha256}"]`;
    if (documentObject.querySelector(selector)) return;
    const link = documentObject.createElement('link');
    link.rel = 'modulepreload';
    link.href = sameOriginUrl(asset.path, windowObject).href;
    link.integrity = asset.integrity;
    link.crossOrigin = 'anonymous';
    link.dataset.guideMaplibreModule = asset.sha256;
    documentObject.head.append(link);
  }

  async function verifyTextAsset(asset, windowObject) {
    const response = await (windowObject.fetch || root.fetch)(sameOriginUrl(asset.path, windowObject).href, { cache: 'no-store', credentials: 'same-origin' });
    if (!response || !response.ok) throw new Error('A signed visualization capability asset could not be loaded.');
    const text = (await response.text()).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const bytes = new TextEncoder().encode(text);
    const digest = await (windowObject.crypto || root.crypto).subtle.digest('SHA-256', bytes);
    const hex = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    if (hex !== asset.sha256) throw new Error('A signed visualization capability asset failed exact-SHA validation.');
    return text;
  }

  async function loadMapLibre(documentObject, windowObject) {
    if (capabilityPromise) return capabilityPromise;
    capabilityPromise = (async () => {
      const cap = authorization();
      await ensureStylesheet(documentObject, cap.stylesheet, windowObject);
      ensureModulePreload(documentObject, cap.runtime, windowObject);
      ensureModulePreload(documentObject, cap.shared, windowObject);
      const runtimeUrl = sameOriginUrl(cap.runtime.path, windowObject);
      const workerUrl = sameOriginUrl(cap.worker.path, windowObject);
      await verifyTextAsset(cap.worker, windowObject);
      const testCanvas = documentObject.createElement('canvas');
      if (!testCanvas.getContext('webgl2')) throw new Error('WebGL2 is unavailable; using Leaflet fallback.');
      const maplibregl = await import(runtimeUrl.href);
      if (!maplibregl || typeof maplibregl.Map !== 'function' || typeof maplibregl.setWorkerUrl !== 'function') {
        throw new Error('MapLibre module did not expose the required API.');
      }
      maplibregl.setWorkerUrl(workerUrl.href);
      return Object.freeze({ maplibregl, cap, workerUrl: workerUrl.href });
    })().catch(error => {
      capabilityPromise = null;
      throw error;
    });
    return capabilityPromise;
  }


  async function loadECharts(documentObject, windowObject) {
    if (root.echarts && typeof root.echarts.init === 'function') return Object.freeze({ echarts: root.echarts, cap: echartsAuthorization() });
    if (echartsCapabilityPromise) return echartsCapabilityPromise;
    echartsCapabilityPromise = (async () => {
      const cap = echartsAuthorization();
      await verifyTextAsset(cap.runtime, windowObject);
      const selector = `script[data-guide-echarts-runtime="${cap.runtime.sha256}"]`;
      let script = documentObject.querySelector(selector);
      if (!script) {
        script = documentObject.createElement('script');
        script.src = sameOriginUrl(cap.runtime.path, windowObject).href;
        script.integrity = cap.runtime.integrity;
        script.crossOrigin = 'anonymous';
        script.dataset.guideEchartsRuntime = cap.runtime.sha256;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('ECharts runtime failed integrity loading.'));
          documentObject.head.append(script);
        });
      } else if (!(root.echarts && typeof root.echarts.init === 'function')) {
        await new Promise((resolve, reject) => {
          script.addEventListener('load', resolve, { once: true });
          script.addEventListener('error', () => reject(new Error('ECharts runtime failed integrity loading.')), { once: true });
        });
      }
      if (!root.echarts || typeof root.echarts.init !== 'function') throw new Error('ECharts runtime did not expose the required API.');
      return Object.freeze({ echarts: root.echarts, cap });
    })().catch(error => {
      echartsCapabilityPromise = null;
      throw error;
    });
    return echartsCapabilityPromise;
  }

  function appendChartEquivalent(section, rows, options) {
    const details = append(section, 'details', 'visualization-text-equivalent');
    details.dataset.phase1ChartEquivalent = options && options.key || 'chart-values';
    append(details, 'summary', '', options && options.valuesLabel || 'Numeric values for this chart');
    if (options && options.numericNote) append(details, 'p', '', options.numericNote);
    const table = append(details, 'table');
    append(table, 'caption', '', options && options.tableCaption || options && options.title || 'Chart values');
    const thead = append(table, 'thead');
    const hr = append(thead, 'tr');
    const ch = append(hr, 'th', '', options && options.categoryLabel || 'Category'); ch.scope = 'col';
    const vh = append(hr, 'th', '', options && options.valueLabel || 'Value'); vh.scope = 'col';
    const tbody = append(table, 'tbody');
    asArray(rows).forEach(row => {
      const tr = append(tbody, 'tr');
      const th = append(tr, 'th', '', String(row.label)); th.scope = 'row';
      append(tr, 'td', '', row.display === undefined ? String(row.value) : String(row.display));
    });
    return details;
  }

  function chartFrame(context, rows, options, className) {
    const documentObject = context.documentObject;
    const section = element(documentObject, 'section', `guide-visualization guide-echarts-view ${className || ''}`.trim());
    section.dataset.chartRenderer = 'apache-echarts';
    section.dataset.chartRendererVersion = ECHARTS_VERSION;
    const header = append(section, 'header', 'visualization-header');
    if (options && options.typeLabel) append(header, 'p', 'visualization-type', options.typeLabel);
    append(header, 'h3', '', options && options.title || 'Quantitative view');
    if (options && options.description) append(header, 'p', 'visualization-purpose', options.description);
    const host = append(section, 'div', 'guide-echarts-canvas');
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', options && options.ariaLabel || options && options.title || 'Evidence-linked chart');
    const status = append(section, 'p', 'visualization-local-state', 'Preparing chart…');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    appendChartEquivalent(section, rows, options || {});
    return { section, host, status };
  }

  function createCategoryBars(context, options) {
    const rows = asArray(options && options.rows).filter(row => row && Number.isFinite(Number(row.value)));
    const frame = chartFrame(context, rows, options || {}, 'guide-category-bars');
    const { section, host, status } = frame;
    Promise.resolve().then(async () => {
      try {
        const capability = await loadECharts(context.documentObject, context.windowObject || root);
        if (!section.isConnected) return;
        const chart = capability.echarts.init(host, null, { renderer: 'svg' });
        section._atlasChart = chart;
        chart.setOption({
          animation: !reducedMotion(context.windowObject || root),
          backgroundColor: 'transparent',
          grid: { left: 12, right: 24, top: 12, bottom: 12, containLabel: true },
          xAxis: {
            type: 'value',
            minInterval: 1,
            axisLabel: { color: '#aab5bf' },
            splitLine: { lineStyle: { color: '#202d38' } }
          },
          yAxis: {
            type: 'category',
            data: rows.map(row => String(row.label)),
            axisLabel: { color: '#dce5eb', width: 150, overflow: 'truncate' },
            axisLine: { lineStyle: { color: '#355063' } }
          },
          series: [{
            type: 'bar',
            data: rows.map(row => Number(row.value)),
            barMaxWidth: 24,
            itemStyle: { color: '#79b7df', borderRadius: [0, 3, 3, 0] },
            label: { show: true, position: 'right', color: '#f1f4f7' }
          }]
        });
        status.remove();
        section.dataset.chartState = 'ready';
        section.dispatchEvent(new CustomEvent('guide:visualization-ready', { bubbles: true, detail: { renderer: 'echarts', version: ECHARTS_VERSION } }));
      } catch (error) {
        if (!section.isConnected) return;
        status.textContent = 'Interactive chart unavailable; numeric values remain available below.';
        section.dataset.chartState = 'fallback';
        section.dataset.echartsFailure = String(error && error.message || 'ECharts unavailable');
      }
    });
    return section;
  }

  function createEventDensity(context, options) {
    const rows = asArray(options && options.rows)
      .filter(row => row && row.label && Number.isFinite(Number(row.value)))
      .slice()
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    const frame = chartFrame(context, rows, options || {}, 'guide-event-density');
    const { section, host, status } = frame;
    let chart = null;
    let silentRange = false;
    let pendingRange = null;
    const indexForDate = (date, fallback) => {
      const exact = rows.findIndex(row => String(row.label) === String(date));
      if (exact >= 0) return exact;
      if (!rows.length) return fallback;
      if (fallback === 0) {
        const next = rows.findIndex(row => String(row.label) >= String(date));
        return next >= 0 ? next : rows.length - 1;
      }
      for (let i = rows.length - 1; i >= 0; i -= 1) if (String(rows[i].label) <= String(date)) return i;
      return 0;
    };
    const applyRange = (startDate, endDate) => {
      pendingRange = [startDate, endDate];
      if (!chart || !rows.length) return;
      const startValue = indexForDate(startDate, 0);
      const endValue = indexForDate(endDate, rows.length - 1);
      silentRange = true;
      chart.dispatchAction({ type: 'dataZoom', startValue, endValue });
      silentRange = false;
    };
    section._atlasSetRange = applyRange;
    Promise.resolve().then(async () => {
      try {
        const capability = await loadECharts(context.documentObject, context.windowObject || root);
        if (!section.isConnected) return;
        chart = capability.echarts.init(host, null, { renderer: 'svg' });
        section._atlasChart = chart;
        chart.setOption({
          animation: !reducedMotion(context.windowObject || root),
          backgroundColor: 'transparent',
          grid: { left: 44, right: 16, top: 12, bottom: 58 },
          xAxis: {
            type: 'category',
            data: rows.map(row => String(row.label)),
            boundaryGap: true,
            axisLabel: { color: '#aab5bf', hideOverlap: true },
            axisLine: { lineStyle: { color: '#355063' } }
          },
          yAxis: {
            type: 'value',
            minInterval: 1,
            name: 'accepted records',
            nameTextStyle: { color: '#aab5bf' },
            axisLabel: { color: '#aab5bf' },
            splitLine: { lineStyle: { color: '#202d38' } }
          },
          dataZoom: [
            { type: 'inside', filterMode: 'none', zoomOnMouseWheel: false, moveOnMouseWheel: false, moveOnMouseMove: true },
            { type: 'slider', filterMode: 'none', height: 24, bottom: 10, borderColor: '#355063', textStyle: { color: '#aab5bf' }, brushSelect: false }
          ],
          series: [{
            type: 'bar',
            name: 'Accepted records',
            data: rows.map(row => Number(row.value)),
            barMaxWidth: 12,
            itemStyle: { color: '#79b7df' }
          }]
        });
        chart.on('datazoom', event => {
          if (silentRange || !rows.length) return;
          const payload = event && event.batch && event.batch[0] || event || {};
          const startIndex = Number.isFinite(Number(payload.startValue))
            ? Number(payload.startValue)
            : Math.round((Number(payload.start || 0) / 100) * Math.max(0, rows.length - 1));
          const endIndex = Number.isFinite(Number(payload.endValue))
            ? Number(payload.endValue)
            : Math.round((Number(payload.end === undefined ? 100 : payload.end) / 100) * Math.max(0, rows.length - 1));
          const start = rows[Math.max(0, Math.min(rows.length - 1, startIndex))];
          const end = rows[Math.max(0, Math.min(rows.length - 1, endIndex))];
          if (!start || !end) return;
          section.dispatchEvent(new CustomEvent('guide:chart-range', {
            bubbles: true,
            detail: { startDate: String(start.label), endDate: String(end.label) }
          }));
        });
        if (pendingRange) applyRange(pendingRange[0], pendingRange[1]);
        status.remove();
        section.dataset.chartState = 'ready';
        section.dispatchEvent(new CustomEvent('guide:visualization-ready', { bubbles: true, detail: { renderer: 'echarts', version: ECHARTS_VERSION } }));
      } catch (error) {
        if (!section.isConnected) return;
        status.textContent = 'Interactive density navigator unavailable; daily accepted-record counts remain available below.';
        section.dataset.chartState = 'fallback';
        section.dataset.echartsFailure = String(error && error.message || 'ECharts unavailable');
      }
    });
    return section;
  }

  function routeSources(route) {
    const localSources = {};
    const sourceIds = unique([
      ...asArray(route && route.source_ids),
      ...asArray(route && route.evidence_sources),
      route && route.source_id
    ].flatMap(value => typeof value === 'string' ? [value] : []));
    asArray(route && route.sources).forEach((source, index) => {
      if (typeof source === 'string') {
        sourceIds.push(source);
        return;
      }
      if (!Array.isArray(source) || !source[0]) return;
      const sourceId = `${route.id || route.route_id || 'ROUTE'}-SOURCE-${index + 1}`;
      sourceIds.push(sourceId);
      localSources[sourceId] = { title: source[0], url: source[1] || null, publisher: 'Route evidence source' };
    });
    return { sourceIds: unique(sourceIds), localSources };
  }

  function recordTitle(record) {
    return String(record && (
      record.display_name || record.name || record.title || record.target || record.facility_name ||
      record.location_name || record.event_id || record.id || record.shipping_id || record.loss_id
    ) || 'Mapped record');
  }

  function recordSummary(record) {
    const event = record && record.event || {};
    return String(record && (
      record.summary || record.observation || record.note || record.assessment || record.purpose ||
      record.operational_effect || record.effect || event.observed_fact || event.summary
    ) || 'This location is supplied by the accepted public record.');
  }

  function recordKeys(record) {
    if (!record || typeof record !== 'object') return [];
    const nested = record.event && typeof record.event === 'object' ? record.event : {};
    return unique([
      record.event_id, record.facility_id, record.loss_id, record.shipping_id, record.economic_id,
      record.observation_id, record.overlay_id, record.casualty_id, record.movement_id, record.id,
      nested.event_id, nested.id
    ].filter(Boolean).map(String));
  }

  function pointKind(record) {
    const material = String([
      record && record.target_type, record && record.event_type, record && record.category,
      record && record.accounting_category, record && record.shipping_id, record && record.facility_id
    ].filter(Boolean).join(' ')).toUpperCase();
    if (/SHIP|MARITIME|VESSEL|HORMUZ|PORT/.test(material)) return 'shipping';
    if (/FACIL|LOSS|DAMAGE|INFRASTRUCTURE/.test(material)) return 'facility';
    return 'military';
  }

  function pointsGeoJSON(records, ia, context) {
    const features = [];
    asArray(records).forEach((record, index) => {
      const point = ia.MapView.pointFromRecord(record, context.services.locationResolver, asArray(context.relatedRecords));
      if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lon))) return;
      features.push({
        type: 'Feature',
        id: index,
        geometry: { type: 'Point', coordinates: [Number(point.lon), Number(point.lat)] },
        properties: {
          recordIndex: index,
          title: recordTitle(record),
          kind: pointKind(record)
        }
      });
    });
    return { type: 'FeatureCollection', features };
  }

  function routesGeoJSON(routes, ia) {
    const records = [];
    const features = [];
    asArray(routes).forEach((route, index) => {
      const coordinates = ia.MapView.routeGeometry(route);
      if (coordinates.length < 2) return;
      const recordIndex = records.length;
      records.push(route);
      features.push({
        type: 'Feature',
        id: index,
        geometry: { type: 'LineString', coordinates: coordinates.map(pair => [Number(pair[1]), Number(pair[0])]) },
        properties: {
          recordIndex,
          routeId: String(route.id || route.route_id || ''),
          name: String(route.name || route.id || route.route_id || 'Route'),
          mode: String(route.mode || 'transport').toLowerCase(),
          authority: String(route.authority_class || '')
        }
      });
    });
    return { records, collection: { type: 'FeatureCollection', features } };
  }

  function derivedBounds(points, routes, ia, fallback) {
    const dummyPoints = points.features.map(feature => ({ point: { lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] } }));
    const routeRecords = routes.records;
    const viewport = ia.MapView.deriveMapViewport(dummyPoints, routeRecords, [], [], fallback || [[8, 28], [42, 70]]);
    const bounds = viewport && viewport.bounds || fallback || [[8, 28], [42, 70]];
    return [[Number(bounds[0][1]), Number(bounds[0][0])], [Number(bounds[1][1]), Number(bounds[1][0])]];
  }

  function referenceLayers(geography) {
    const features = asArray(geography && geography.features).filter(feature =>
      feature && feature.properties && ['western_context_110m', 'regional_50m', 'hormuz_10m'].includes(feature.properties.layer)
    );
    return { type: 'FeatureCollection', features };
  }

  function geometryCenter(feature) {
    const coordinates = [];
    const walk = value => {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
        coordinates.push([Number(value[0]), Number(value[1])]);
        return;
      }
      value.forEach(walk);
    };
    walk(feature && feature.geometry && feature.geometry.coordinates);
    if (!coordinates.length) return null;
    const lons = coordinates.map(value => value[0]);
    const lats = coordinates.map(value => value[1]);
    return [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
  }

  function addProgressiveLabels(map, maplibregl, documentObject, geography, contextLabels) {
    const candidates = [];
    const seen = new Set();
    asArray(geography && geography.features)
      .filter(feature => feature && feature.properties && feature.properties.layer === 'regional_50m')
      .forEach(feature => {
        const label = String(feature.properties.name || '').trim();
        if (!label || seen.has(label)) return;
        const center = geometryCenter(feature);
        if (!center) return;
        seen.add(label);
        candidates.push({ label, lon: center[0], lat: center[1], priority: 2, kind: 'country' });
      });
    asArray(contextLabels).forEach(row => {
      const label = String(row && row.label || '').trim();
      const lat = Number(row && row.lat); const lon = Number(row && row.lon);
      if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
      candidates.push({ label, lat, lon, priority: Number(row.priority || 0), kind: row.kind || 'place' });
    });
    const markers = candidates.slice(0, 80).map(row => {
      const node = element(documentObject, 'span', `guide-map-label guide-map-label--${row.kind}`, row.label);
      node.dataset.labelPriority = String(row.priority);
      const marker = new maplibregl.Marker({ element: node, anchor: 'center' }).setLngLat([row.lon, row.lat]).addTo(map);
      return { marker, node, priority: row.priority };
    });
    const update = () => {
      const zoom = map.getZoom();
      const width = map.getContainer()?.clientWidth || 0;
      const budget = zoom < 3.2 ? (width <= 480 ? 4 : 7) : zoom < 5.2 ? (width <= 480 ? 9 : 18) : markers.length;
      let shown = 0;
      markers.forEach(row => {
        const eligible = row.priority <= 0 || row.priority <= 2 || zoom >= 5.2;
        const visible = eligible && (row.priority <= 0 || shown < budget);
        row.node.hidden = !visible;
        if (visible && row.priority > 0) shown += 1;
      });
    };
    update();
    map.on('zoom', update);
    return markers;
  }

  function addMarkerImages(map, documentObject) {
    const definitions = {
      military: { shape: 'diamond', fill: '#eea0a0' },
      shipping: { shape: 'circle', fill: '#79b7df' },
      facility: { shape: 'square', fill: '#e4c384' }
    };
    Object.entries(definitions).forEach(([name, definition]) => {
      if (map.hasImage(name)) return;
      const canvas = documentObject.createElement('canvas');
      canvas.width = 28; canvas.height = 28;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 28, 28);
      ctx.fillStyle = definition.fill;
      ctx.strokeStyle = '#080d13';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (definition.shape === 'circle') ctx.arc(14, 14, 7, 0, Math.PI * 2);
      else if (definition.shape === 'diamond') { ctx.moveTo(14, 5); ctx.lineTo(23, 14); ctx.lineTo(14, 23); ctx.lineTo(5, 14); ctx.closePath(); }
      else { ctx.rect(6, 6, 16, 16); }
      ctx.fill(); ctx.stroke();
      map.addImage(name, ctx.getImageData(0, 0, 28, 28), { pixelRatio: 1 });
    });
  }

  function addReferenceLayers(map) {
    map.addLayer({
      id: 'guide-land-context', type: 'fill', source: 'guide-reference',
      maxzoom: 3.8, paint: { 'fill-color': '#17232e', 'fill-opacity': 1 }
    });
    map.setFilter('guide-land-context', ['==', ['get', 'layer'], 'western_context_110m']);
    map.addLayer({
      id: 'guide-land-regional', type: 'fill', source: 'guide-reference',
      minzoom: 0, maxzoom: 6.2, paint: { 'fill-color': '#17232e', 'fill-opacity': 1 }
    });
    map.setFilter('guide-land-regional', ['==', ['get', 'layer'], 'regional_50m']);
    map.addLayer({
      id: 'guide-land-hormuz', type: 'fill', source: 'guide-reference',
      minzoom: 5.0, paint: { 'fill-color': '#17232e', 'fill-opacity': 1 }
    });
    map.setFilter('guide-land-hormuz', ['==', ['get', 'layer'], 'hormuz_10m']);
    for (const [id, layerName, minzoom, maxzoom] of [
      ['guide-boundary-context', 'western_context_110m', 0, 3.8],
      ['guide-boundary-regional', 'regional_50m', 0, 6.2],
      ['guide-boundary-hormuz', 'hormuz_10m', 5.0, 24]
    ]) {
      map.addLayer({
        id, type: 'line', source: 'guide-reference', minzoom, maxzoom,
        filter: ['==', ['get', 'layer'], layerName],
        paint: { 'line-color': '#50616e', 'line-width': minzoom >= 5 ? 0.9 : 0.65, 'line-opacity': 0.62 }
      });
    }
  }

  function addRouteLayers(map) {
    map.addLayer({
      id: 'guide-route-halo', type: 'line', source: 'guide-routes',
      paint: {
        'line-color': '#080d13',
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 5, 7, 8],
        'line-opacity': 0.82
      }
    });
    map.addLayer({
      id: 'guide-routes', type: 'line', source: 'guide-routes',
      paint: {
        'line-color': ['match', ['get', 'mode'], 'maritime', '#79b7df', 'pipeline', '#e4c384', '#b9def5'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 2.2, 7, 4.5],
        'line-opacity': 0.88,
        'line-dasharray': ['match', ['get', 'mode'], 'pipeline', ['literal', [3, 2]], 'rail', ['literal', [1, 2]], ['literal', [1, 0]]]
      }
    });
    map.addLayer({
      id: 'guide-route-selected', type: 'line', source: 'guide-routes',
      filter: ['==', ['get', 'routeId'], '__none__'],
      paint: {
        'line-color': '#b9def5',
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 5, 7, 8],
        'line-opacity': 1
      }
    });
    map.addLayer({
      id: 'guide-route-flow', type: 'symbol', source: 'guide-routes',
      layout: {
        'symbol-placement': 'line-center',
        'text-field': ['match', ['get', 'mode'], 'maritime', '›', 'pipeline', '◆', 'rail', 'Ⅱ', ''],
        'text-size': 18,
        'text-allow-overlap': false,
        'text-rotation-alignment': 'map'
      },
      paint: { 'text-color': '#d9f1ff', 'text-halo-color': '#080d13', 'text-halo-width': 1.2 }
    });
  }

  function addPointLayers(map) {
    map.addLayer({
      id: 'guide-point-ring', type: 'circle', source: 'guide-points',
      filter: ['==', ['get', 'recordIndex'], -1],
      paint: { 'circle-radius': 12, 'circle-color': '#080d13', 'circle-stroke-color': '#f1f4f7', 'circle-stroke-width': 2.5, 'circle-opacity': 0.9 }
    });
    map.addLayer({
      id: 'guide-points', type: 'symbol', source: 'guide-points',
      layout: { 'icon-image': ['get', 'kind'], 'icon-size': 0.72, 'icon-allow-overlap': false }
    });
  }

  function evidenceDrawer(context, item, ia, options) {
    try { return ia.EvidenceDrawer.create(context, item, options); } catch (_) { return null; }
  }

  function renderSelection(host, context, ia, item, type) {
    host.replaceChildren();
    if (!item) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const article = append(host, 'article', 'visualization-selection');
    const routeAuthority = type === 'route' ? String(item.authority_class || '') : '';
    append(article, 'p', 'card-kicker', type === 'route'
      ? (routeAuthority === 'SCHEMATIC_REFERENCE_ROUTE' ? 'Schematic reference route' : 'Selected route')
      : 'Selected location');
    append(article, 'h3', '', type === 'route' ? String(item.name || item.id || item.route_id || 'Route') : recordTitle(item));
    append(article, 'p', '', type === 'route'
      ? String(item.note || item.description || 'The accepted route geometry is shown without adding inferred segments.')
      : recordSummary(item));
    if (type === 'route') {
      const mode = String(item.mode || '').toLowerCase();
      append(article, 'p', 'map-card-meta', mode === 'maritime'
        ? 'Schematic · not live vessel tracking.'
        : mode === 'pipeline'
          ? 'Schematic · not a surveyed pipeline alignment or targeting-quality geometry.'
          : 'Schematic · not exact rail alignment, live movement, or targeting-quality geometry.');
      const meta = append(article, 'p', 'record-status', [item.mode, item.authority_class].filter(Boolean).join(' · '));
      if (!meta.textContent) meta.remove();
      const sources = routeSources(item);
      const drawer = evidenceDrawer(context, { source_ids: sources.sourceIds }, ia, { localSources: sources.localSources });
      if (drawer && sources.sourceIds.length) article.append(drawer);
    } else {
      const physical = item && (item.physical_damage || item.impact_grade || item.damage_state || item.damage);
      const operational = item && (item.operational_effect || item.operating_result || item.operational_status);
      if (physical || operational) {
        const facts = append(article, 'dl', 'visualization-distinction-facts');
        if (physical) { append(facts, 'dt', '', 'Physical damage'); append(facts, 'dd', '', String(physical)); }
        if (operational) { append(facts, 'dt', '', 'Operational effect'); append(facts, 'dd', '', String(operational)); }
        append(article, 'p', 'map-card-meta', 'Physical damage and operational effect are separate evidentiary dimensions.');
      }
      const drawer = evidenceDrawer(context, item, ia);
      if (drawer) article.append(drawer);
    }
  }

  function addRouteControls(section, map, routes) {
    const modes = unique(routes.map(route => String(route.mode || 'transport').toLowerCase()));
    if (!modes.length) return;
    const group = append(section, 'fieldset', 'visualization-layer-controls');
    append(group, 'legend', '', 'Routes');
    const enabled = new Set(modes);
    const apply = () => {
      const values = Array.from(enabled);
      const filter = values.length ? ['in', ['get', 'mode'], ['literal', values]] : ['==', ['get', 'mode'], '__none__'];
      map.setFilter('guide-routes', filter);
      map.setFilter('guide-route-halo', filter);
    };
    modes.forEach(mode => {
      const label = append(group, 'label', 'visualization-toggle');
      const input = append(label, 'input'); input.type = 'checkbox'; input.checked = true;
      append(label, 'span', '', mode.charAt(0).toUpperCase() + mode.slice(1));
      input.addEventListener('change', () => { input.checked ? enabled.add(mode) : enabled.delete(mode); apply(); });
    });
  }

  function addRouteSelectionControls(section, routes, selection, context, ia) {
    if (!routes.length) return;
    const controls = append(section, 'div', 'map-route-controls');
    routes.forEach(route => {
      const button = append(controls, 'button', 'map-route-button', String(route.name || route.id || route.route_id || 'Transport route'));
      button.type = 'button';
      button.dataset.routeId = String(route.id || route.route_id || '');
      button.dataset.routeMode = String(route.mode || '').toLowerCase();
      button.addEventListener('click', () => {
        const map = section._atlasMapLibre;
        const routeId = String(route.id || route.route_id || '');
        if (map?.getLayer('guide-route-selected')) map.setFilter('guide-route-selected', ['==', ['get', 'routeId'], routeId]);
        if (map?.getLayer('guide-point-ring')) map.setFilter('guide-point-ring', ['==', ['get', 'recordIndex'], -1]);
        renderSelection(selection, context, ia, route, 'route');
      });
    });
  }

  function createCameraControls(section, map, theaterBounds, windowObject, modes) {
    const requested = asArray(modes).length ? asArray(modes) : ['theater', 'gulf', 'hormuz'];
    if (requested.length < 2) return;
    const nav = append(section, 'div', 'visualization-mode-controls');
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', 'Map scope');
    const labels = { theater: 'THEATER', gulf: 'GULF', hormuz: 'HORMUZ' };
    const buttons = new Map();
    const activate = mode => {
      buttons.forEach((button, key) => button.setAttribute('aria-pressed', String(key === mode)));
      const bounds = mode === 'theater' ? theaterBounds : CAMERA_PRESETS[mode];
      if (!bounds) return;
      map.fitBounds(bounds, { padding: mode === 'hormuz' ? 36 : 48, duration: reducedMotion(windowObject) ? 0 : 520 });
    };
    requested.forEach(mode => {
      if (!labels[mode]) return;
      const button = append(nav, 'button', 'visualization-mode-button', labels[mode]);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(mode === requested[0]));
      button.addEventListener('click', () => activate(mode));
      buttons.set(mode, button);
    });
  }

  function createLegend(section, routes) {
    const legend = append(section, 'div', 'visualization-legend map-legend');
    legend.setAttribute('aria-label', 'Map legend');
    const entries = [['◆', 'Military / strike'], ['●', 'Shipping / maritime'], ['■', 'Facility / loss']];
    const modes = new Set(asArray(routes).map(route => String(route.mode || '').toLowerCase()));
    if (modes.has('maritime')) entries.push(['━', 'Maritime · schematic']);
    if (modes.has('pipeline')) entries.push(['┄', 'Pipeline · schematic']);
    if (modes.has('rail')) entries.push(['┈', 'Rail · schematic']);
    if (!modes.size) entries.push(['━', 'Accepted route']);
    entries.forEach(([mark, label]) => {
      const item = append(legend, 'span', 'visualization-legend-item');
      append(item, 'b', '', mark); append(item, 'span', '', label);
    });
  }

  function appendTextEquivalent(section, context, records, routes, ia) {
    const equivalent = append(section, 'details');
    equivalent.dataset.phase5MapEquivalent = 'locations';
    equivalent.dataset.phase6MapEquivalent = 'geography';
    const mapped = [];
    asArray(records).forEach(record => {
      const point = ia.MapView.pointFromRecord(record, context.services.locationResolver, asArray(context.relatedRecords));
      if (point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon))) mapped.push({ record, point });
    });
    append(equivalent, 'summary', '', `Text equivalent for this map (${mapped.length} locations)`);
    const list = append(equivalent, 'ul');
    mapped.forEach(item => append(list, 'li', '', `${String(item.point.label || recordTitle(item.record))} · ${String(item.point.precision || 'recorded location')} · ${recordTitle(item.record)}`));
    asArray(routes).forEach(route => {
      const authority = String(route.authority_class || '').replaceAll('_', ' ').toLowerCase();
      append(list, 'li', '', `${String(route.name || route.id || route.route_id || 'Route')} · ${authority || 'accepted route'} · ${String(route.note || route.description || '')}`.trim());
    });
    return equivalent;
  }

  function renderFallback(section, context, options, ia, error) {
    const fallback = ia.MapView.create(context, options);
    fallback.dataset.mapRenderer = 'leaflet-fallback';
    fallback.dataset.maplibreFailure = String(error && error.message || 'MapLibre unavailable');
    section.replaceWith(fallback);
    return fallback;
  }

  function create(context, options) {
    const ia = root.AtlasPublicIA;
    if (!ia || !ia.MapView) return null;
    const documentObject = context.documentObject;
    const section = element(documentObject, 'section', 'context-map guide-visualization guide-maplibre-view');
    section.dataset.component = 'MapLibreView';
    section.dataset.mapRenderer = 'maplibre-gl-js';
    section.dataset.mapRendererVersion = MAPLIBRE_VERSION;
    section.dataset.mapScope = options && options.scope || 'context';
    const header = append(section, 'header', 'visualization-header');
    if (options && options.typeLabel) append(header, 'p', 'visualization-type', options.typeLabel);
    append(header, 'h2', '', options && options.title || 'Geographic context');
    if (options && options.description) append(header, 'p', 'visualization-purpose', options.description);

    const shell = append(section, 'div', 'visualization-shell');
    const viewport = append(shell, 'div', 'atlas-maplibre-map');
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', options && options.ariaLabel || `${options && options.title || 'Evidence map'} interactive map`);
    viewport.tabIndex = 0;
    const status = append(viewport, 'div', 'visualization-local-state', 'Preparing map…');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const selection = append(shell, 'aside', 'visualization-selection-rail map-selection-card');
    selection.hidden = true;
    selection.setAttribute('aria-live', 'polite');
    const records = asArray(options && options.records);
    const routes = asArray(options && options.routes);
    createLegend(section, routes);
    const recordIndexByKey = new Map();
    records.forEach((record, index) => recordKeys(record).forEach(key => recordIndexByKey.set(key, index)));
    let focusRecordByIndex = null;
    let pendingFocusKey = '';
    section._atlasHasRecord = value => {
      const keys = typeof value === 'string' ? [value] : recordKeys(value);
      return keys.some(key => recordIndexByKey.has(String(key)));
    };
    section._atlasFocusRecord = value => {
      const keys = typeof value === 'string' ? [value] : recordKeys(value);
      const key = keys.map(String).find(candidate => recordIndexByKey.has(candidate));
      if (!key) return false;
      if (!focusRecordByIndex) { pendingFocusKey = key; return true; }
      focusRecordByIndex(recordIndexByKey.get(key));
      return true;
    };
    section.dataset.mapSelectableRecords = String(recordIndexByKey.size);
    const points = pointsGeoJSON(records, ia, context);
    const routeData = routesGeoJSON(routes, ia);
    const geography = root.ATLAS_REFERENCE_GEOGRAPHY;
    const fallbackLatLon = options && (options.viewportOverride || options.fallbackViewport) || [[8, 28], [42, 70]];
    const theaterBounds = derivedBounds(points, routeData, ia, fallbackLatLon);
    const publicBounds = [[theaterBounds[0][1], theaterBounds[0][0]], [theaterBounds[1][1], theaterBounds[1][0]]];
    section.dataset.mapExtentSource = points.features.length || routeData.collection.features.length ? 'visible-records' : 'deterministic-fallback';
    section.dataset.mapBounds = JSON.stringify(publicBounds);
    section.dataset.mapRouteModes = unique(routes.map(route => String(route.mode || '').toLowerCase())).sort().join(',');
    section.dataset.mapRouteCount = String(routeData.collection.features.length);
    section.dataset.mapPointCount = String(points.features.length);
    appendTextEquivalent(section, context, records, routes, ia);
    addRouteSelectionControls(section, routeData.records, selection, context, ia);
    if (routes.length) append(section, 'p', 'map-mode-boundary', 'Strategic corridor diagrams are schematic: maritime lines are not live vessel tracking, pipeline lines are not surveyed alignments, and rail lines are not exact track alignments or live movements.');
    append(section, 'small', 'map-caveat', 'Locations follow the evidence record · routes are schematic · not live tracking, surveyed alignment, targeting, or navigation data');

    Promise.resolve().then(async () => {
      try {
        const capability = await loadMapLibre(documentObject, context.windowObject || root);
        if (!section.isConnected) return;
        status.textContent = 'Drawing geographic context…';
        const map = new capability.maplibregl.Map({
          container: viewport,
          style: {
            version: 8,
            sources: {},
            layers: [{ id: 'guide-water', type: 'background', paint: { 'background-color': '#080d13' } }]
          },
          attributionControl: false,
          scrollZoom: false,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          maxZoom: Number(options && options.maxZoom || 10),
          renderWorldCopies: false,
          fadeDuration: reducedMotion(context.windowObject || root) ? 0 : 180
        });
        section._atlasMapLibre = map;
        map.on('load', () => {
          if (!section.isConnected) { map.remove(); return; }
          map.addSource('guide-reference', { type: 'geojson', data: referenceLayers(geography) });
          map.addSource('guide-routes', { type: 'geojson', data: routeData.collection });
          map.addSource('guide-points', { type: 'geojson', data: points });
          addReferenceLayers(map);
          if (routeData.collection.features.length) addRouteLayers(map);
          if (points.features.length) { addMarkerImages(map, documentObject); addPointLayers(map); }
          section._atlasMapLibreLabels = addProgressiveLabels(map, capability.maplibregl, documentObject, geography, options && options.contextLabels);

          map.fitBounds(theaterBounds, { padding: 48, duration: 0 });
          createCameraControls(section, map, theaterBounds, context.windowObject || root, options && options.cameraModes);
          if (routeData.records.length) addRouteControls(section, map, routeData.records);

          const clearSelections = () => {
            if (map.getLayer('guide-route-selected')) map.setFilter('guide-route-selected', ['==', ['get', 'routeId'], '__none__']);
            if (map.getLayer('guide-point-ring')) map.setFilter('guide-point-ring', ['==', ['get', 'recordIndex'], -1]);
          };
          focusRecordByIndex = index => {
            if (!Number.isInteger(index) || index < 0 || index >= records.length) return;
            const feature = points.features.find(candidate => Number(candidate.properties.recordIndex) === index);
            if (!feature) return;
            clearSelections();
            map.setFilter('guide-point-ring', ['==', ['get', 'recordIndex'], index]);
            renderSelection(selection, context, ia, records[index], 'record');
            map.easeTo({ center: feature.geometry.coordinates, duration: reducedMotion(context.windowObject || root) ? 0 : 260 });
            viewport.focus();
          };
          if (pendingFocusKey && recordIndexByKey.has(pendingFocusKey)) {
            focusRecordByIndex(recordIndexByKey.get(pendingFocusKey));
            pendingFocusKey = '';
          }
          if (routeData.records.length) {
            map.on('click', 'guide-routes', event => {
              const feature = event.features && event.features[0];
              if (!feature) return;
              clearSelections();
              const route = routeData.records[Number(feature.properties.recordIndex)];
              map.setFilter('guide-route-selected', ['==', ['get', 'routeId'], String(feature.properties.routeId || '')]);
              renderSelection(selection, context, ia, route, 'route');
            });
            map.on('mouseenter', 'guide-routes', () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', 'guide-routes', () => { map.getCanvas().style.cursor = ''; });
          }
          if (points.features.length) {
            map.on('click', 'guide-points', event => {
              const feature = event.features && event.features[0];
              if (!feature) return;
              clearSelections();
              const index = Number(feature.properties.recordIndex);
              focusRecordByIndex(index);
            });
            map.on('mouseenter', 'guide-points', () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', 'guide-points', () => { map.getCanvas().style.cursor = ''; });
          }
          map.on('click', event => {
            const features = map.queryRenderedFeatures(event.point, { layers: ['guide-points', 'guide-routes'].filter(id => map.getLayer(id)) });
            if (features.length) return;
            clearSelections();
            renderSelection(selection, context, ia, null, '');
          });

          status.remove();
          viewport.dataset.mapState = 'ready';
          section.dataset.maplibreWorker = capability.workerUrl;
          section.dispatchEvent(new CustomEvent('guide:visualization-ready', { bubbles: true, detail: { renderer: 'maplibre', version: MAPLIBRE_VERSION } }));
        });
        map.on('error', event => {
          const error = event && event.error;
          if (!viewport.dataset.mapState) status.textContent = error && error.message ? `Map detail unavailable: ${error.message}` : 'Map detail unavailable.';
        });
      } catch (error) {
        if (!section.isConnected) return;
        renderFallback(section, context, options || {}, ia, error);
      }
    });

    return section;
  }


  function normalizedGeographyName(value) {
    return String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function featureCoordinateBounds(features) {
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    const visit = value => {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1])) && typeof value[0] !== 'object') {
        const lon = Number(value[0]), lat = Number(value[1]);
        west = Math.min(west, lon); east = Math.max(east, lon); south = Math.min(south, lat); north = Math.max(north, lat);
        return;
      }
      value.forEach(visit);
    };
    asArray(features).forEach(feature => visit(feature && feature.geometry && feature.geometry.coordinates));
    return [west, south, east, north].every(Number.isFinite) ? [[west, south], [east, north]] : null;
  }

  function createRegionMap(context, options) {
    const documentObject = context.documentObject;
    const section = element(documentObject, 'section', 'context-map guide-visualization guide-region-map');
    section.dataset.component = 'RegionMapView';
    section.dataset.mapRenderer = 'maplibre-gl-js';
    section.dataset.mapRendererVersion = MAPLIBRE_VERSION;
    const header = append(section, 'header', 'visualization-header');
    if (options && options.typeLabel) append(header, 'p', 'visualization-type', options.typeLabel);
    append(header, 'h2', '', options && options.title || 'State geography');
    if (options && options.description) append(header, 'p', 'visualization-purpose', options.description);

    const geography = root.ATLAS_REFERENCE_GEOGRAPHY;
    const regions = asArray(options && options.regions);
    const regionalFeatures = asArray(geography && geography.features).filter(feature => feature && feature.properties && feature.properties.layer === 'regional_50m');
    const featureByName = new Map(regionalFeatures.map(feature => [normalizedGeographyName(feature.properties.name), feature]));
    const resolved = regions.map(region => {
      const feature = featureByName.get(normalizedGeographyName(region && region.name));
      if (!feature) return null;
      return {
        region,
        feature: {
          ...feature,
          properties: {
            ...(feature.properties || {}),
            actorId: String(region.actorId || ''),
            actorName: String(region.name || feature.properties.name || '')
          }
        }
      };
    }).filter(Boolean);

    const shell = append(section, 'div', 'visualization-shell');
    const viewport = append(shell, 'div', 'atlas-maplibre-map');
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', options && options.ariaLabel || 'Selectable accepted state geography');
    viewport.tabIndex = 0;
    const status = append(viewport, 'div', 'visualization-local-state', 'Preparing state geography…');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const selection = append(shell, 'aside', 'visualization-selection-rail map-selection-card');
    selection.hidden = true;
    const controls = append(section, 'div', 'visualization-mode-controls');
    const reset = append(controls, 'button', 'visualization-mode-button', 'RESET');
    reset.type = 'button';

    const equivalent = append(section, 'details', 'visualization-text-equivalent');
    append(equivalent, 'summary', '', `Text equivalent for mapped state actors (${resolved.length})`);
    const list = append(equivalent, 'ul');
    resolved.forEach(({ region }) => append(list, 'li', '', String(region.name)));
    const unmatched = regions.filter(region => !resolved.some(row => row.region.actorId === region.actorId));
    if (unmatched.length) append(equivalent, 'p', 'section-note', `${unmatched.length} accepted state actor${unmatched.length === 1 ? '' : 's'} remain in the canonical index because the signed regional reference layer does not contain an exact matching state geometry.`);

    const resolvedById = new Map(resolved.map(row => [String(row.region.actorId), row]));
    let focusRegion = actorId => {
      section.dataset.pendingRegion = String(actorId || '');
    };
    section._atlasHasRegion = actorId => resolvedById.has(String(actorId || ''));
    section._atlasFocusRegion = actorId => focusRegion(String(actorId || ''));

    Promise.resolve().then(async () => {
      try {
        if (!geography || !resolved.length) throw new Error('No exact accepted state geography is available for this actor set.');
        const capability = await loadMapLibre(documentObject, context.windowObject || root);
        if (!section.isConnected) return;
        const map = new capability.maplibregl.Map({
          container: viewport,
          style: {
            version: 8,
            sources: {},
            layers: [{ id: 'guide-water', type: 'background', paint: { 'background-color': '#080d13' } }]
          },
          attributionControl: false,
          scrollZoom: false,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          maxZoom: 7,
          renderWorldCopies: false,
          fadeDuration: reducedMotion(context.windowObject || root) ? 0 : 180
        });
        section._atlasMapLibre = map;
        map.on('load', () => {
          if (!section.isConnected) { map.remove(); return; }
          map.addSource('guide-reference', { type: 'geojson', data: referenceLayers(geography) });
          addReferenceLayers(map);
          map.addSource('guide-actor-regions', { type: 'geojson', data: { type: 'FeatureCollection', features: resolved.map(row => row.feature) } });
          map.addLayer({
            id: 'guide-actor-regions',
            type: 'fill',
            source: 'guide-actor-regions',
            paint: { 'fill-color': '#295d7a', 'fill-opacity': 0.32 }
          });
          map.addLayer({
            id: 'guide-actor-region-lines',
            type: 'line',
            source: 'guide-actor-regions',
            paint: { 'line-color': '#79b7df', 'line-width': 1.4, 'line-opacity': 0.9 }
          });
          map.addLayer({
            id: 'guide-actor-region-selected',
            type: 'line',
            source: 'guide-actor-regions',
            filter: ['==', ['get', 'actorId'], '__none__'],
            paint: { 'line-color': '#f1f4f7', 'line-width': 4, 'line-opacity': 1 }
          });

          const bounds = featureCoordinateBounds(resolved.map(row => row.feature));
          if (bounds) map.fitBounds(bounds, { padding: 42, duration: 0 });

          const clear = () => {
            if (map.getLayer('guide-actor-region-selected')) map.setFilter('guide-actor-region-selected', ['==', ['get', 'actorId'], '__none__']);
            selection.hidden = true;
            selection.replaceChildren();
          };
          focusRegion = actorId => {
            const row = resolvedById.get(String(actorId || ''));
            if (!row) return;
            map.setFilter('guide-actor-region-selected', ['==', ['get', 'actorId'], String(actorId)]);
            selection.replaceChildren();
            selection.hidden = false;
            const card = append(selection, 'article', 'visualization-selection');
            append(card, 'p', 'card-kicker', 'ACCEPTED STATE ACTOR');
            append(card, 'h3', '', String(row.region.name));
            append(card, 'p', '', 'The shaded area is the accepted state geography from the signed reference layer. It is not a point location for a person, unit, or non-state group.');
            const rowBounds = featureCoordinateBounds([row.feature]);
            if (rowBounds) map.fitBounds(rowBounds, { padding: 54, maxZoom: 5, duration: reducedMotion(context.windowObject || root) ? 0 : 320 });
            section.dispatchEvent(new CustomEvent('guide:region-select', { bubbles: true, detail: { actorId: String(actorId) } }));
          };
          section._atlasFocusRegion = actorId => focusRegion(String(actorId || ''));
          reset.addEventListener('click', () => {
            clear();
            if (bounds) map.fitBounds(bounds, { padding: 42, duration: reducedMotion(context.windowObject || root) ? 0 : 260 });
          });
          map.on('click', 'guide-actor-regions', event => {
            const feature = event.features && event.features[0];
            if (feature && feature.properties && feature.properties.actorId) focusRegion(feature.properties.actorId);
          });
          map.on('mouseenter', 'guide-actor-regions', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'guide-actor-regions', () => { map.getCanvas().style.cursor = ''; });
          map.on('click', event => {
            const features = map.queryRenderedFeatures(event.point, { layers: ['guide-actor-regions'] });
            if (!features.length) clear();
          });
          status.remove();
          viewport.dataset.mapState = 'ready';
          const pending = section.dataset.pendingRegion;
          if (pending && resolvedById.has(pending)) focusRegion(pending);
        });
      } catch (error) {
        if (!section.isConnected) return;
        status.textContent = 'Interactive state geography unavailable; the canonical actor index remains available below.';
        section.dataset.mapState = 'fallback';
        section.dataset.maplibreFailure = String(error && error.message || 'MapLibre unavailable');
      }
    });
    return section;
  }

  return Object.freeze({
    MAPLIBRE_VERSION,
    ECHARTS_VERSION,
    create,
    createRegionMap,
    createCategoryBars,
    createEventDensity,
    loadMapLibre,
    loadECharts
  });
}));

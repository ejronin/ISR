import './prototype.css';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import elk from 'cytoscape-elk';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

cytoscape.use(fcose);
cytoscape.use(elk);
echarts.use([BarChart, AriaComponent, GridComponent, TooltipComponent, SVGRenderer]);

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = reducedMotionQuery.matches;
reducedMotionQuery.addEventListener('change', event => {
  reducedMotion = event.matches;
});

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error('Could not load ' + path + ' (' + response.status + ').');
  }
  return response.json();
}

function replaceWithMessage(node, message) {
  node.replaceChildren();
  const paragraph = document.createElement('p');
  paragraph.textContent = message;
  node.append(paragraph);
}

function makeListItem(text) {
  const item = document.createElement('li');
  item.textContent = text;
  return item;
}

function setPressed(buttons, activeValue, attribute) {
  buttons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset[attribute] === activeValue));
  });
}

async function initMapPrototype() {
  const host = document.getElementById('map-prototype');
  const status = document.getElementById('map-status');
  const detail = document.getElementById('map-detail');
  const textEquivalent = document.getElementById('map-text-equivalent');

  const [geography, routeData, sanctions] = await Promise.all([
    fetchJson('/assets/geography/atlas-reference-geography.geojson'),
    fetchJson('/data/oil-routes-r1.json'),
    fetchJson('/data/sanctions-financial-network-v1.json')
  ]);

  const routes = Array.isArray(routeData.routes) ? routeData.routes : [];
  const mapNodes = Array.isArray(sanctions.map_nodes) ? sanctions.map_nodes : [];

  const routeFeatures = {
    type: 'FeatureCollection',
    features: routes.map(route => ({
      type: 'Feature',
      properties: {
        id: route.id,
        name: route.name,
        mode: route.mode,
        authority_class: route.authority_class,
        status: route.status,
        note: route.note
      },
      geometry: {
        type: 'LineString',
        coordinates: (route.coords || []).map(pair => [Number(pair[1]), Number(pair[0])])
      }
    }))
  };

  const sanctionsFeatures = {
    type: 'FeatureCollection',
    features: mapNodes.map(node => ({
      type: 'Feature',
      properties: {
        id: node.id,
        name: node.name,
        category: node.category,
        jurisdiction: node.jurisdiction,
        precision: node.precision,
        note: node.note
      },
      geometry: {
        type: 'Point',
        coordinates: [Number(node.lon), Number(node.lat)]
      }
    }))
  };

  const map = new maplibregl.Map({
    container: host,
    center: [25, 30],
    zoom: 1.25,
    minZoom: 0.8,
    maxZoom: 8.5,
    attributionControl: true,
    dragRotate: false,
    pitchWithRotate: false,
    cooperativeGestures: true,
    style: {
      version: 8,
      sources: {
        geography: {
          type: 'geojson',
          data: geography,
          attribution: 'Natural Earth v5.1.1 · Guide presentation derivative'
        },
        routes: {
          type: 'geojson',
          data: routeFeatures
        },
        sanctions: {
          type: 'geojson',
          data: sanctionsFeatures
        }
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: { 'background-color': '#071018' }
        },
        {
          id: 'western-context-fill',
          type: 'fill',
          source: 'geography',
          filter: ['==', ['get', 'layer'], 'western_context_110m'],
          maxzoom: 3.2,
          paint: {
            'fill-color': '#17232e',
            'fill-opacity': 0.72
          }
        },
        {
          id: 'western-context-line',
          type: 'line',
          source: 'geography',
          filter: ['==', ['get', 'layer'], 'western_context_110m'],
          maxzoom: 3.2,
          paint: {
            'line-color': '#355063',
            'line-width': 0.8,
            'line-opacity': 0.65
          }
        },
        {
          id: 'regional-fill',
          type: 'fill',
          source: 'geography',
          filter: ['==', ['get', 'layer'], 'regional_50m'],
          minzoom: 2.2,
          maxzoom: 5.8,
          paint: {
            'fill-color': '#17232e',
            'fill-opacity': 0.86
          }
        },
        {
          id: 'regional-line',
          type: 'line',
          source: 'geography',
          filter: ['==', ['get', 'layer'], 'regional_50m'],
          minzoom: 2.2,
          maxzoom: 5.8,
          paint: {
            'line-color': '#497087',
            'line-width': 1.05,
            'line-opacity': 0.8
          }
        },
        {
          id: 'hormuz-fill',
          type: 'fill',
          source: 'geography',
          filter: ['==', ['get', 'layer'], 'hormuz_10m'],
          minzoom: 5.1,
          paint: {
            'fill-color': '#1a2b37',
            'fill-opacity': 0.96
          }
        },
        {
          id: 'hormuz-line',
          type: 'line',
          source: 'geography',
          filter: ['==', ['get', 'layer'], 'hormuz_10m'],
          minzoom: 5.1,
          paint: {
            'line-color': '#79b7df',
            'line-width': 1.2,
            'line-opacity': 0.88
          }
        },
        {
          id: 'routes',
          type: 'line',
          source: 'routes',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'mode'],
              'maritime', '#79b7df',
              'pipeline', '#e4c384',
              'rail', '#8fd0b3',
              '#aab5bf'
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              1, 1.3,
              6, 3.4
            ],
            'line-opacity': 0.86
          }
        },
        {
          id: 'sanctions-nodes',
          type: 'circle',
          source: 'sanctions',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              1, 3.5,
              6, 7
            ],
            'circle-color': '#e4c384',
            'circle-stroke-color': '#080d13',
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.92
          }
        }
      ]
    }
  });

  const bbox = Array.isArray(geography.bbox) && geography.bbox.length === 4
    ? geography.bbox.map(Number)
    : [-90, -5, 110, 65];
  map.setMaxBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]]);
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  const cameras = {
    theater: { center: [25, 30], zoom: 1.25 },
    gulf: { center: [51.5, 25.6], zoom: 3.75 },
    hormuz: { center: [56.3, 26.35], zoom: 6.2 }
  };

  document.querySelectorAll('[data-map-camera]').forEach(button => {
    button.addEventListener('click', () => {
      const target = cameras[button.dataset.mapCamera];
      if (!target) return;
      if (reducedMotion) {
        map.jumpTo(target);
      } else {
        map.easeTo({ ...target, duration: 650, essential: false });
      }
      status.textContent = 'Camera: ' + button.textContent + '. Same map and source set; zoom controls which pinned geography layer is visible.';
    });
  });

  const renderFeatureDetail = feature => {
    const properties = feature && feature.properties ? feature.properties : {};
    detail.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = properties.name || properties.id || 'Selected map record';
    detail.append(heading);

    const meta = document.createElement('p');
    if (feature.layer && feature.layer.id === 'routes') {
      meta.textContent = [properties.mode, properties.authority_class, properties.status].filter(Boolean).join(' · ');
    } else {
      meta.textContent = [properties.category, properties.jurisdiction, properties.precision].filter(Boolean).join(' · ');
    }
    detail.append(meta);

    if (properties.note) {
      const note = document.createElement('p');
      note.textContent = properties.note;
      detail.append(note);
    }
    detail.focus({ preventScroll: true });
  };

  ['routes', 'sanctions-nodes'].forEach(layerId => {
    map.on('click', layerId, event => {
      const feature = event.features && event.features[0];
      if (feature) renderFeatureDetail(feature);
    });
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });

  map.once('load', () => {
    status.textContent = 'Map ready: ' + geography.features.length + ' reference-geography features, ' + routes.length + ' current route records, and ' + mapNodes.length + ' current sanctions jurisdiction markers.';
  });

  const routeHeading = document.createElement('h3');
  routeHeading.textContent = 'Current schematic routes';
  const routeList = document.createElement('ul');
  routes.forEach(route => {
    routeList.append(makeListItem(route.name + ' — ' + route.mode + ' — ' + route.status));
  });

  const nodeHeading = document.createElement('h3');
  nodeHeading.textContent = 'Current sanctions jurisdiction markers';
  const nodeList = document.createElement('ul');
  mapNodes.forEach(node => {
    nodeList.append(makeListItem(node.name + ' — ' + node.precision));
  });

  textEquivalent.append(routeHeading, routeList, nodeHeading, nodeList);
}

function deterministicPositions(nodes) {
  const sorted = nodes.slice().sort((left, right) => String(left.node_id).localeCompare(String(right.node_id)));
  const columns = Math.max(3, Math.ceil(Math.sqrt(sorted.length)));
  const positions = new Map();
  sorted.forEach((node, index) => {
    positions.set(node.node_id, {
      x: 130 + (index % columns) * 230,
      y: 90 + Math.floor(index / columns) * 120
    });
  });
  return positions;
}

async function initWolPrototype() {
  const host = document.getElementById('wol-prototype');
  const status = document.getElementById('wol-status');
  const detail = document.getElementById('wol-detail');
  const traceList = document.getElementById('wol-trace-list');
  const actorPicker = document.getElementById('wol-actor');
  const zoomToggle = document.getElementById('wol-enable-zoom');
  const modeButtons = Array.from(document.querySelectorAll('[data-wol-mode]'));

  const model = await fetchJson('/data/public-current-state.json');
  const payload = model.datasets && model.datasets['analysis.web_of_lies']
    ? model.datasets['analysis.web_of_lies'].payload
    : null;
  const graph = payload && payload.propagation_graph;
  const graphNodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
  const graphEdges = graph && Array.isArray(graph.edges) ? graph.edges : [];

  if (!graph || !graphNodes.length) {
    replaceWithMessage(host, 'The generated public read model does not currently contain a WOL propagation graph. Run the repository current-state builder before using this prototype.');
    status.textContent = 'Current WOL graph unavailable; no placeholder graph was substituted.';
    return;
  }

  const nodeById = new Map(graphNodes.map(node => [String(node.node_id), node]));
  const edgeById = new Map(graphEdges.map(edge => [String(edge.edge_id), edge]));
  const positions = deterministicPositions(graphNodes);

  graphNodes
    .slice()
    .sort((left, right) => String(left.display_name || left.node_id).localeCompare(String(right.display_name || right.node_id)))
    .forEach(node => {
      const option = document.createElement('option');
      option.value = node.node_id;
      option.textContent = node.display_name || node.node_id;
      actorPicker.append(option);
    });

  const cy = cytoscape({
    container: host,
    minZoom: 0.25,
    maxZoom: 2.6,
    wheelSensitivity: 0.18,
    boxSelectionEnabled: false,
    userZoomingEnabled: false,
    userPanningEnabled: false,
    elements: [
      ...graphNodes.map(node => ({
        group: 'nodes',
        data: {
          ...node,
          id: String(node.node_id),
          label: String(node.display_name || node.node_id)
        },
        position: positions.get(String(node.node_id))
      })),
      ...graphEdges.map(edge => ({
        group: 'edges',
        data: {
          ...edge,
          id: String(edge.edge_id),
          source: String(edge.from_node_id),
          target: String(edge.to_node_id),
          edge_label: Number(edge.amplified_claim_count || 0) + ' claim' + (Number(edge.amplified_claim_count || 0) === 1 ? '' : 's')
        }
      }))
    ],
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-wrap': 'wrap',
          'text-max-width': 140,
          'font-size': 11,
          'font-weight': 650,
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#f1f4f7',
          'background-color': '#143247',
          'border-color': '#79b7df',
          'border-width': 2,
          'shape': 'round-rectangle',
          'width': 170,
          'height': 54,
          'padding': 8
        }
      },
      {
        selector: 'node[node_type = "BULLSHITTER"]',
        style: {
          'background-color': '#421b20',
          'border-color': '#eea0a0',
          'width': 192,
          'height': 62
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 'mapData(amplified_claim_count, 1, 8, 1.5, 4.5)',
          'line-color': '#55788d',
          'target-arrow-color': '#55788d',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.05,
          'curve-style': 'bezier',
          'opacity': 0.84
        }
      },
      {
        selector: '.dimmed',
        style: {
          'opacity': 0.12,
          'text-opacity': 0.12
        }
      },
      {
        selector: 'node.focused',
        style: {
          'border-color': '#f4d785',
          'border-width': 5,
          'z-index': 20
        }
      },
      {
        selector: 'node.connected',
        style: {
          'border-color': '#f4d785',
          'border-width': 3
        }
      },
      {
        selector: 'edge.connected',
        style: {
          'line-color': '#f4d785',
          'target-arrow-color': '#f4d785',
          'width': 3.5,
          'opacity': 1
        }
      },
      {
        selector: 'edge.trace',
        style: {
          'line-color': '#f4d785',
          'target-arrow-color': '#f4d785',
          'line-style': 'dashed',
          'line-dash-pattern': [8, 6],
          'width': 4,
          'opacity': 1
        }
      }
    ],
    layout: { name: 'preset' }
  });

  const layout = cy.layout({
    name: 'fcose',
    quality: 'default',
    randomize: false,
    animate: false,
    fit: true,
    padding: 36,
    nodeSeparation: 70,
    idealEdgeLength: 110,
    nodeRepulsion: 4200
  });
  layout.run();

  let selectedNodeId = '';
  let currentMode = 'full';
  let dashFrame = 0;
  let dashOffset = 0;

  const stopDashAnimation = () => {
    if (dashFrame) cancelAnimationFrame(dashFrame);
    dashFrame = 0;
    cy.$('edge.trace').style('line-dash-offset', 0);
  };

  const animateTrace = () => {
    stopDashAnimation();
    if (reducedMotion || currentMode !== 'trace' || document.hidden || !cy.$('edge.trace').length) return;
    const step = () => {
      if (reducedMotion || currentMode !== 'trace' || document.hidden) {
        stopDashAnimation();
        return;
      }
      dashOffset = (dashOffset + 0.6) % 14;
      cy.$('edge.trace').style('line-dash-offset', dashOffset);
      dashFrame = requestAnimationFrame(step);
    };
    dashFrame = requestAnimationFrame(step);
  };

  const clearState = () => {
    stopDashAnimation();
    cy.elements().removeClass('dimmed focused connected trace');
    traceList.replaceChildren();
  };

  const nodeName = nodeId => {
    const node = nodeById.get(String(nodeId));
    return node ? String(node.display_name || node.node_id) : String(nodeId);
  };

  const renderNodeDetail = nodeId => {
    detail.replaceChildren();
    const node = nodeById.get(String(nodeId));
    if (!node) return;
    const heading = document.createElement('h3');
    heading.textContent = node.display_name || node.node_id;
    const metadata = document.createElement('p');
    metadata.textContent = [
      node.node_type,
      node.primary_platform,
      node.country_code,
      node.authenticity_class
    ].filter(Boolean).join(' · ');
    const counts = document.createElement('p');
    counts.textContent = 'Documented upstream Bullshitter sources: ' + Number(node.bullshitter_source_count || 0) + ' · amplification observations: ' + Number(node.amplification_observation_count || 0);
    detail.append(heading, metadata, counts);
  };

  const outgoingTrace = startId => {
    const visitedNodes = new Set([String(startId)]);
    const visitedEdges = new Set();
    const queue = [String(startId)];
    while (queue.length) {
      const current = queue.shift();
      graphEdges.forEach(edge => {
        if (String(edge.from_node_id) !== current) return;
        const edgeId = String(edge.edge_id);
        const target = String(edge.to_node_id);
        visitedEdges.add(edgeId);
        if (!visitedNodes.has(target)) {
          visitedNodes.add(target);
          queue.push(target);
        }
      });
    }
    return { nodes: visitedNodes, edges: visitedEdges };
  };

  const fitSelection = elements => {
    if (!elements || !elements.length) return;
    cy.fit(elements, 68);
  };

  const renderTraceList = edgeIds => {
    traceList.replaceChildren();
    if (!edgeIds.size) {
      traceList.append(makeListItem('No downstream accepted propagation edge is present from this selected node.'));
      return;
    }
    Array.from(edgeIds)
      .map(edgeId => edgeById.get(edgeId))
      .filter(Boolean)
      .sort((left, right) => String(left.edge_id).localeCompare(String(right.edge_id)))
      .forEach(edge => {
        const count = Number(edge.amplified_claim_count || 0);
        traceList.append(makeListItem(
          nodeName(edge.from_node_id) + ' → ' + nodeName(edge.to_node_id) + ' — ' + count + ' documented claim' + (count === 1 ? '' : 's')
        ));
      });
  };

  const applyMode = () => {
    clearState();
    setPressed(modeButtons, currentMode, 'wolMode');

    if (currentMode === 'full') {
      cy.fit(cy.elements(), 42);
      status.textContent = 'Full network: ' + graphNodes.length + ' current nodes and ' + graphEdges.length + ' current accepted propagation edges.';
      return;
    }

    if (!selectedNodeId || !nodeById.has(selectedNodeId)) {
      status.textContent = currentMode === 'trace'
        ? 'Select a current graph node to trace accepted downstream propagation.'
        : 'Select a current graph node to emphasize its direct accepted connections.';
      return;
    }

    const target = cy.getElementById(selectedNodeId);
    target.addClass('focused');
    renderNodeDetail(selectedNodeId);

    if (currentMode === 'direct') {
      const neighborhood = target.closedNeighborhood();
      cy.elements().not(neighborhood).addClass('dimmed');
      target.neighborhood('node').addClass('connected');
      target.connectedEdges().addClass('connected');
      fitSelection(neighborhood);
      status.textContent = nodeName(selectedNodeId) + ': ' + target.connectedEdges().length + ' direct accepted connection' + (target.connectedEdges().length === 1 ? '' : 's') + '. Unrelated elements are shown at 12% opacity.';
      return;
    }

    const traced = outgoingTrace(selectedNodeId);
    const tracedNodes = cy.collection(Array.from(traced.nodes).map(id => cy.getElementById(id)));
    const tracedEdges = cy.collection(Array.from(traced.edges).map(id => cy.getElementById(id)));
    const tracedElements = tracedNodes.union(tracedEdges);
    cy.elements().not(tracedElements).addClass('dimmed');
    tracedNodes.not(target).addClass('connected');
    tracedEdges.addClass('trace');
    fitSelection(tracedElements);
    renderTraceList(traced.edges);
    status.textContent = nodeName(selectedNodeId) + ': trace highlights ' + traced.edges.size + ' existing directed edge' + (traced.edges.size === 1 ? '' : 's') + '. No transitive edge is created.';
    animateTrace();
  };

  actorPicker.addEventListener('change', () => {
    selectedNodeId = actorPicker.value;
    if (selectedNodeId) currentMode = 'direct';
    renderNodeDetail(selectedNodeId);
    applyMode();
  });

  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      currentMode = button.dataset.wolMode;
      applyMode();
    });
  });

  cy.on('tap', 'node', event => {
    selectedNodeId = event.target.id();
    actorPicker.value = selectedNodeId;
    if (currentMode === 'full') currentMode = 'direct';
    renderNodeDetail(selectedNodeId);
    applyMode();
  });

  cy.on('tap', event => {
    if (event.target !== cy) return;
    selectedNodeId = '';
    actorPicker.value = '';
    detail.replaceChildren();
    currentMode = 'full';
    applyMode();
  });

  zoomToggle.addEventListener('change', () => {
    const enabled = zoomToggle.checked;
    cy.userZoomingEnabled(enabled);
    cy.userPanningEnabled(enabled);
    status.textContent = enabled
      ? 'Direct graph pan and wheel/pinch zoom enabled.'
      : 'Direct graph pan and wheel/pinch zoom disabled; ordinary page scrolling is preserved.';
  });

  document.getElementById('wol-zoom-in').addEventListener('click', () => {
    cy.zoom(Math.min(cy.maxZoom(), cy.zoom() * 1.2));
  });
  document.getElementById('wol-zoom-out').addEventListener('click', () => {
    cy.zoom(Math.max(cy.minZoom(), cy.zoom() / 1.2));
  });
  document.getElementById('wol-fit').addEventListener('click', () => {
    cy.fit(cy.elements(':visible'), 42);
  });

  const resizeObserver = new ResizeObserver(() => {
    cy.resize();
  });
  resizeObserver.observe(host);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopDashAnimation();
    } else if (currentMode === 'trace') {
      animateTrace();
    }
  });

  status.textContent = 'fCoSE prototype ready: ' + graphNodes.length + ' current nodes and ' + graphEdges.length + ' current accepted propagation edges.';
  applyMode();
}

async function initFlowPrototype() {
  const host = document.getElementById('flow-prototype');
  const status = document.getElementById('flow-status');
  const textEquivalent = document.getElementById('flow-text-equivalent');

  const sanctions = await fetchJson('/data/sanctions-financial-network-v1.json');
  const cascade = Array.isArray(sanctions.cascade)
    ? sanctions.cascade.slice().sort((left, right) => Number(left.step) - Number(right.step))
    : [];

  if (!cascade.length) {
    replaceWithMessage(host, 'The current sanctions analysis does not contain a cascade sequence.');
    status.textContent = 'Current sanctions cascade unavailable; no placeholder flow was substituted.';
    return;
  }

  cascade.forEach(step => {
    const item = document.createElement('li');
    const heading = document.createElement('strong');
    heading.textContent = String(step.step).padStart(2, '0') + ' · ' + step.title;
    const text = document.createElement('p');
    text.textContent = step.text;
    item.append(heading, text);
    textEquivalent.append(item);
  });

  const nodes = cascade.map(step => ({
    group: 'nodes',
    data: {
      id: 'cascade-step-' + step.step,
      label: String(step.step).padStart(2, '0') + ' · ' + step.title,
      text: step.text
    }
  }));

  const edges = cascade.slice(0, -1).map((step, index) => {
    const next = cascade[index + 1];
    return {
      group: 'edges',
      data: {
        id: 'cascade-order-' + step.step + '-' + next.step,
        source: 'cascade-step-' + step.step,
        target: 'cascade-step-' + next.step
      }
    };
  });

  const cy = cytoscape({
    container: host,
    userZoomingEnabled: false,
    userPanningEnabled: false,
    elements: [...nodes, ...edges],
    style: [
      {
        selector: 'node',
        style: {
          'shape': 'round-rectangle',
          'width': 215,
          'height': 78,
          'padding': 10,
          'background-color': '#111a23',
          'border-color': '#79b7df',
          'border-width': 2,
          'label': 'data(label)',
          'color': '#f1f4f7',
          'font-size': 12,
          'font-weight': 700,
          'text-wrap': 'wrap',
          'text-max-width': 185,
          'text-valign': 'center',
          'text-halign': 'center'
        }
      },
      {
        selector: 'edge',
        style: {
          'curve-style': 'taxi',
          'taxi-direction': 'rightward',
          'line-color': '#55788d',
          'target-arrow-color': '#55788d',
          'target-arrow-shape': 'triangle',
          'width': 2.5
        }
      }
    ],
    layout: { name: 'preset' }
  });

  let currentDirection = '';

  const runLayout = direction => {
    currentDirection = direction;
    cy.edges().style('taxi-direction', direction === 'RIGHT' ? 'rightward' : 'downward');
    cy.layout({
      name: 'elk',
      fit: true,
      padding: 38,
      animate: false,
      elk: {
        algorithm: 'layered',
        'elk.direction': direction,
        'elk.spacing.nodeNode': '48',
        'elk.layered.spacing.nodeNodeBetweenLayers': '88',
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
      }
    }).run();
    status.textContent = 'ELK layered proof: ' + cascade.length + ' current ordered sanctions steps, laid out ' + (direction === 'RIGHT' ? 'horizontally' : 'vertically') + '. The connectors represent only the existing step order.';
  };

  const chooseDirection = () => host.clientWidth < 760 ? 'DOWN' : 'RIGHT';
  runLayout(chooseDirection());

  const resizeObserver = new ResizeObserver(() => {
    cy.resize();
    const nextDirection = chooseDirection();
    if (nextDirection !== currentDirection) runLayout(nextDirection);
  });
  resizeObserver.observe(host);
}

async function initChartPrototype() {
  const host = document.getElementById('chart-prototype');
  const status = document.getElementById('chart-status');
  const tableBody = document.getElementById('chart-table-body');

  const economics = await fetchJson('/data/integration-v1.2/economics.json');
  const forecast = economics.forecast_context || {};
  const rows = Array.isArray(forecast.rows) ? forecast.rows : [];

  if (!rows.length) {
    replaceWithMessage(host, 'The current economics dataset does not contain forecast comparison rows.');
    status.textContent = 'Current economic rows unavailable; no placeholder series was substituted.';
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    [row.country, row.prewar, row.current, row.delta].forEach(value => {
      const td = document.createElement('td');
      td.textContent = String(value);
      tr.append(td);
    });
    tableBody.append(tr);
  });

  const styles = getComputedStyle(document.documentElement);
  const muted = styles.getPropertyValue('--muted').trim() || '#aab5bf';
  const border = styles.getPropertyValue('--border').trim() || '#283744';
  const text = styles.getPropertyValue('--text').trim() || '#f1f4f7';
  const blue = styles.getPropertyValue('--blue').trim() || '#79b7df';

  const chart = echarts.init(host, null, { renderer: 'svg' });
  chart.setOption({
    animation: !reducedMotion,
    aria: {
      show: true,
      description: String(forecast.metric || '2026 real GDP growth forecast') + '. Bars use the stored forecast change values from the current Guide economics dataset.'
    },
    grid: {
      left: 132,
      right: 34,
      top: 34,
      bottom: 58,
      containLabel: true
    },
    tooltip: {
      trigger: 'item',
      formatter: params => {
        const row = params.data && params.data.record ? params.data.record : {};
        return [
          '<strong>' + String(row.country || '') + '</strong>',
          'Pre-war forecast: ' + String(row.prewar),
          'Current forecast: ' + String(row.current),
          'Stored change: ' + String(row.delta) + ' percentage points'
        ].join('<br>');
      }
    },
    xAxis: {
      type: 'value',
      name: 'Stored change (percentage points)',
      nameLocation: 'middle',
      nameGap: 38,
      axisLabel: { color: muted },
      nameTextStyle: { color: muted },
      axisLine: { lineStyle: { color: border } },
      splitLine: { lineStyle: { color: border } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map(row => row.country),
      axisLabel: { color: text, interval: 0 },
      axisLine: { lineStyle: { color: border } },
      axisTick: { show: false }
    },
    series: [
      {
        type: 'bar',
        name: 'Stored forecast change',
        data: rows.map(row => ({
          value: row.delta,
          record: row,
          itemStyle: { color: blue }
        })),
        barMaxWidth: 28,
        label: {
          show: true,
          position: 'right',
          color: text,
          formatter: params => String(params.value)
        }
      }
    ]
  });

  const resizeObserver = new ResizeObserver(() => chart.resize());
  resizeObserver.observe(host);

  reducedMotionQuery.addEventListener('change', event => {
    chart.setOption({ animation: !event.matches });
  });

  status.textContent = 'ECharts prototype ready: ' + rows.length + ' current forecast-comparison rows. The chart consumes each stored delta directly; it does not replace the protected production economic renderer.';
}

async function runPrototype(name, initializer, statusId) {
  try {
    await initializer();
  } catch (error) {
    const status = document.getElementById(statusId);
    status.textContent = name + ' prototype failed: ' + (error && error.message ? error.message : String(error));
    console.error(name + ' prototype failed', error);
  }
}

await Promise.all([
  runPrototype('Map', initMapPrototype, 'map-status'),
  runPrototype('WOL', initWolPrototype, 'wol-status'),
  runPrototype('Directed flow', initFlowPrototype, 'flow-status'),
  runPrototype('Chart', initChartPrototype, 'chart-status')
]);

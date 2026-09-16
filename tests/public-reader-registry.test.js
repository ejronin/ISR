'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const registry = require('../src/public-reader-registry.js');

assert.equal(registry.READER_REGISTRY_VERSION, 'atlas-reader-registry-v1');

class Node {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.style = {};
    this.parentNode = null;
    this.textContent = '';
    this.innerText = '';
    this.isConnected = true;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  _setConnected(value) {
    this.isConnected = Boolean(value);
    this.children.forEach(child => child._setConnected(this.isConnected));
  }
  append(...nodes) {
    nodes.forEach(node => {
      if (node.parentNode) node.parentNode.children = node.parentNode.children.filter(child => child !== node);
      node.parentNode = this;
      this.children.push(node);
      node._setConnected(this.isConnected);
    });
  }
  replaceChildren(...nodes) {
    this.children.forEach(node => { node.parentNode = null; node._setConnected(false); });
    this.children = [];
    this.append(...nodes);
  }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(node => node !== this);
    this.parentNode = null;
    this._setConnected(false);
  }
  querySelector(selector) {
    const predicate = selector === '.atlas-app' ? n => n.dataset.kind === 'app'
      : selector === '.public-page' ? n => n.dataset.kind === 'page'
      : selector === 'h1' ? n => n.tagName === 'H1' : () => false;
    const stack = [...this.children];
    while (stack.length) { const node = stack.shift(); if (predicate(node)) return node; stack.push(...node.children); }
    return null;
  }
  querySelectorAll() { const out = []; const stack = [...this.children]; while (stack.length) { const node = stack.shift(); out.push(node); stack.push(...node.children); } return out; }
}

function environment(title = 'Qualified') {
  const listeners = new Map();
  const body = new Node('body');
  const documentObject = { title, body, documentElement: body, createElement: tag => new Node(tag) };
  return {
    documentObject,
    windowObject: {
      innerWidth: 1440,
      location: { hash: '#/start' },
      history: { replaceState() {} },
      addEventListener(type, fn) { listeners.set(type, fn); },
      removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); }
    }
  };
}

const failingProjection = {
  READER_LAYER_VERSION: 'atlas-reader-v1.1',
  parseRoute() { return { key: 'start.overview' }; },
  mount({ rootElement }) {
    const technical = new Node('div');
    technical.textContent = 'TECHNICAL_BASE';
    technical.innerText = 'TECHNICAL_BASE';
    rootElement.append(technical);
    throw new Error('projection failed');
  }
};
const routeRuntime = { forRoute() { return { model: {}, services: {} }; } };

function qualifiedStage(text) {
  const stage = new Node('div');
  stage.innerText = text;
  stage.textContent = text;
  const app = new Node('div');
  app.dataset.kind = 'app';
  const article = new Node('article');
  article.dataset.kind = 'page';
  article.dataset.readerLayer = failingProjection.READER_LAYER_VERSION;
  const heading = new Node('h1');
  article.append(heading);
  app.append(article);
  stage.append(app);
  return stage;
}

function semanticProjection({ includeHeading = true, onStage } = {}) {
  const version = 'atlas-reader-semantic-test-v1';
  return {
    READER_LAYER_VERSION: version,
    parseRoute() { return { key: 'test.route' }; },
    mount({ rootElement }) {
      if (onStage) onStage(rootElement);
      const app = new Node('div');
      app.dataset.kind = 'app';
      const article = new Node('article');
      article.dataset.kind = 'page';
      article.dataset.readerLayer = version;
      if (includeHeading) article.append(new Node('h1'));
      app.append(article);
      rootElement.append(app);
      return {
        current() { return { key: 'test.route' }; },
        services() { return {}; },
        destroy() {}
      };
    }
  };
}

// A canonical provenance filename may contain the string ROOK without exposing an
// internal review label. Standalone internal labels remain publication blockers.
{
  const provenance = qualifiedStage('Source: data/canonical-updates/UPD-20260913-ROOK-LOCKER.json');
  assert.doesNotThrow(() => registry.validateFinalizedStage(provenance, failingProjection));
  const internal = qualifiedStage('ROOK internal review note');
  assert.throws(
    () => registry.validateFinalizedStage(internal, failingProjection),
    error => error && error.code === 'READER_INTERNAL_LEAK'
  );
}

// Initial projection failure: the neutral loading shell is not a qualified page.
// The registry must throw so public-app can replace it with the explicit error boundary.
{
  const { documentObject, windowObject } = environment('Loading');
  const root = new Node('main');
  documentObject.body.append(root);
  root.dataset.status = 'loading';
  const loading = new Node('section'); loading.dataset.loading = 'true'; root.append(loading);
  assert.throws(
    () => registry.mount({ rootElement: root, documentObject, windowObject, routeRuntime, state: {}, projectionRuntime: failingProjection }),
    error => error && error.code === 'READER_FINALIZATION_FAILED'
  );
  assert.equal(root.children.length, 1, 'failed initial staging host must be removed');
  assert.equal(root.children[0], loading, 'technical support output must never replace the neutral shell');
  assert.equal(documentObject.title, 'Loading', 'failed initial staging must restore the prior title');
  assert.equal(root.dataset.status, 'loading', 'registry must not manufacture ready state after initial failure');
}

// Later route failure: retain the last already-qualified visible reader page.
{
  const { documentObject, windowObject } = environment('Qualified');
  const root = new Node('main');
  documentObject.body.append(root);
  root.dataset.status = 'ready';
  const qualified = new Node('section'); qualified.dataset.readerAuthority = registry.READER_REGISTRY_VERSION; root.append(qualified);
  const controller = registry.mount({
    rootElement: root,
    documentObject,
    windowObject,
    routeRuntime,
    state: { routeKey: 'start.overview' },
    projectionRuntime: failingProjection
  });
  assert(controller, 'existing qualified page should remain routable after staged route failure');
  assert.equal(root.children.length, 1, 'failed route staging host must be removed');
  assert.equal(root.children[0], qualified, 'failed projection must not replace the currently qualified page');
  assert.equal(root.querySelector('.atlas-app'), null, 'no technical staged app may become visible');
  assert.equal(documentObject.title, 'Qualified', 'failed route staging must restore the qualified page title');
  assert.equal(root.dataset.status, 'ready', 'last qualified page remains the visible ready page');
}

// Staging is connected, hidden and aria-hidden, and an invalid finalized stage
// fails closed before it can replace the last qualified visible reader page.
{
  const { documentObject, windowObject } = environment('Qualified');
  const root = new Node('main');
  documentObject.body.append(root);
  root.dataset.status = 'ready';
  const qualified = new Node('section'); qualified.dataset.readerAuthority = registry.READER_REGISTRY_VERSION; root.append(qualified);
  let stagedHost = null;
  const projectionRuntime = semanticProjection({
    includeHeading: false,
    onStage(stage) {
      stagedHost = stage;
      assert.equal(stage.isConnected, true, 'staging host must be connected while projection/finalization runs');
      assert.equal(stage.attributes['aria-hidden'], 'true', 'staging host must be hidden from accessibility traversal');
      assert.equal(stage.style.visibility, 'hidden', 'staging host must not become visibly rendered');
    }
  });
  const controller = registry.mount({
    rootElement: root,
    documentObject,
    windowObject,
    routeRuntime,
    state: { routeKey: 'test.route' },
    projectionRuntime
  });
  assert(controller, 'a validation failure after a qualified page exists must preserve the route controller');
  assert.equal(root.children.length, 1, 'invalid finalized output must not be promoted');
  assert.equal(root.children[0], qualified, 'validation must fail before visible promotion');
  assert.equal(root.dataset.status, 'ready', 'the last qualified page remains ready after staged validation failure');
  assert(stagedHost, 'projection must receive a staging host');
  assert.equal(stagedHost.isConnected, false, 'failed staging host must be removed after validation failure');
}

// Replacement lifecycle contract: old maps are quiesced while still visible and
// connected; only after the new reader is promoted are retired nodes reattached
// to a connected hidden host for map removal.
{
  const { documentObject, windowObject } = environment('Qualified');
  const root = new Node('main');
  documentObject.body.append(root);
  root.dataset.status = 'ready';
  const qualified = new Node('section'); qualified.dataset.readerAuthority = registry.READER_REGISTRY_VERSION;
  const mapNode = new Node('div');
  qualified.append(mapNode);
  root.append(qualified);

  let stopObserved = false;
  let removeObserved = false;
  mapNode._atlasMap = {
    stop() {
      assert.equal(root.children[0], qualified, 'old map must be quiesced before visible replacement');
      assert.equal(qualified.isConnected, true, 'old map must remain connected while quiescing');
      stopObserved = true;
    },
    remove() {
      assert.equal(stopObserved, true, 'map removal must not precede quiescing');
      assert.equal(root.children.length, 1, 'new reader must already be the sole visible root child before retirement removal');
      assert.notEqual(root.children[0], qualified, 'old reader retirement must begin only after visible promotion');
      assert.equal(root.children[0].dataset.readerAuthority, registry.READER_REGISTRY_VERSION, 'promoted reader must carry registry authority');
      const retirementHost = qualified.parentNode;
      assert(retirementHost, 'retired reader must be reattached before map removal');
      assert.equal(retirementHost.isConnected, true, 'retirement host must stay connected during map removal');
      assert.equal(qualified.isConnected, true, 'retired reader must be connected during map removal');
      assert.equal(retirementHost.dataset.atlasReaderRetirement, registry.READER_REGISTRY_VERSION, 'retirement host must carry registry identity');
      assert.equal(retirementHost.attributes['aria-hidden'], 'true', 'retirement host must be hidden from accessibility traversal');
      assert.equal(retirementHost.style.visibility, 'hidden', 'retirement host must remain visually hidden');
      removeObserved = true;
    }
  };

  let stagedHost = null;
  const projectionRuntime = semanticProjection({ onStage(stage) { stagedHost = stage; } });
  const controller = registry.mount({
    rootElement: root,
    documentObject,
    windowObject,
    routeRuntime,
    state: { routeKey: 'test.route' },
    projectionRuntime
  });
  assert(controller, 'qualified replacement should produce a route controller');
  assert.equal(stopObserved, true, 'old map must be quiesced during replacement');
  assert.equal(removeObserved, true, 'old map must be removed through connected retirement');
  assert.equal(root.children.length, 1, 'successful promotion must leave exactly one visible reader app');
  assert.equal(root.children[0].dataset.readerAuthority, registry.READER_REGISTRY_VERSION, 'visible reader must remain registry-authoritative');
  assert.equal(root.dataset.status, 'ready', 'successful promotion must leave the reader ready');
  assert(stagedHost, 'projection must receive a staging host');
  assert.equal(stagedHost.isConnected, false, 'successful staging host must be removed after promotion');
  assert.equal(qualified.isConnected, false, 'retired reader must be disconnected after map removal completes');
}

for (const file of ['scripts/build_public_release_core.py', 'js/public-bootstrap.js', 'js/public-app.js', 'scripts/validate_public_deployment.py', 'config/public-runtime-inventory.json']) {
  const body = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  assert(!body.includes('reader_runtime'), `${file} still authorizes old reader_runtime`);
}
console.log('authoritative reader registry: PASS - publication blockers fail closed, staged failures retain the last qualified page, validation precedes promotion, and retired maps quiesce and remove through connected hidden lifecycle hosts');

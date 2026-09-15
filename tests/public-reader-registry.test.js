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
  append(...nodes) { nodes.forEach(node => { node.parentNode = this; this.children.push(node); }); }
  replaceChildren(...nodes) { this.children.forEach(node => { node.parentNode = null; }); this.children = []; this.append(...nodes); }
  remove() { if (!this.parentNode) return; this.parentNode.children = this.parentNode.children.filter(node => node !== this); this.parentNode = null; }
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
  return {
    documentObject: { title, createElement: tag => new Node(tag) },
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

const source = fs.readFileSync(path.join(__dirname, '..', 'src/public-reader-registry.js'), 'utf8');
assert.match(source, /visibility\s*(?::|=)\s*['"]hidden['"]/);
assert.match(source, /aria-hidden/);
assert.match(source, /hasQualified(?:Visible)?/);
assert.match(source, /validateFinalizedStage\(stage, projectionRuntime\)/);
const validationIndex = source.indexOf('validateFinalizedStage(stage, projectionRuntime)');
const quiesceIndex = source.indexOf('previousVisible.forEach(quiesceMaps)');
const promoteIndex = source.indexOf('rootElement.replaceChildren(finalized.app)');
const retireMatch = source.match(/retireVisibleNodes\([^;\n]*previousVisible\)/);
const reattachMatch = source.match(/nodes\.forEach\([^;\n]*host\.append\([^;\n]*\)\)/);
const removeMapsIndex = source.indexOf('nodes.forEach(removeMaps)');
assert(validationIndex >= 0 && validationIndex < promoteIndex, 'validation must precede atomic visible promotion');
assert(quiesceIndex >= 0 && quiesceIndex < promoteIndex, 'old maps must be quiesced while their DOM is still connected');
assert(retireMatch, 'qualified old page must be retired only through the connected retirement helper');
assert(promoteIndex >= 0 && promoteIndex < source.indexOf(retireMatch[0]), 'old page retirement must begin only after atomic promotion succeeds');
assert(reattachMatch, 'retired nodes must be reattached to a connected hidden host before map removal');
assert(source.indexOf(reattachMatch[0]) < removeMapsIndex, 'retired maps must be reattached to a connected hidden host before Leaflet removal');
for (const file of ['scripts/build_public_release_core.py', 'js/public-bootstrap.js', 'js/public-app.js', 'scripts/validate_public_deployment.py', 'config/public-runtime-inventory.json']) {
  const body = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  assert(!body.includes('reader_runtime'), `${file} still authorizes old reader_runtime`);
}
console.log('authoritative reader registry: PASS - provenance filenames are permitted, standalone internal labels fail closed, route failures retain the last qualified page, and retired maps are removed from a connected hidden host after atomic promotion');

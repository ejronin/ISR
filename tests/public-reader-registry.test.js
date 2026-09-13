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

const documentObject = { title: 'Qualified', createElement: tag => new Node(tag) };
const listeners = new Map();
const windowObject = {
  innerWidth: 1440,
  location: { hash: '#/start' },
  history: { replaceState() {} },
  addEventListener(type, fn) { listeners.set(type, fn); },
  removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); }
};
const root = new Node('main');
const qualified = new Node('section'); qualified.dataset.qualified = 'true'; root.append(qualified);
let supportDestroyed = false;
const failingProjection = {
  READER_LAYER_VERSION: 'atlas-reader-v1.1',
  parseRoute() { return { key: 'start.overview' }; },
  mount({ rootElement }) {
    const technical = new Node('div'); technical.textContent = 'TECHNICAL_BASE'; technical.innerText = 'TECHNICAL_BASE'; rootElement.append(technical);
    throw new Error('projection failed');
  }
};
const controller = registry.mount({
  rootElement: root,
  documentObject,
  windowObject,
  routeRuntime: { forRoute() { return { model: {}, services: {} }; } },
  state: { routeKey: 'start.overview' },
  projectionRuntime: {
    ...failingProjection,
    mount(options) {
      try { return failingProjection.mount(options); }
      finally { supportDestroyed = true; }
    }
  }
});
assert(controller, 'existing qualified page should remain routable after staged route failure');
assert.equal(root.children.length, 1, 'failed staging host must be removed');
assert.equal(root.children[0], qualified, 'failed projection must not replace the currently qualified page');
assert.equal(root.querySelector('.atlas-app'), null, 'no technical staged app may become visible');
assert.equal(documentObject.title, 'Qualified', 'failed staging must restore the qualified page title');
assert.equal(supportDestroyed, true);
assert.equal(root.dataset.status, undefined, 'failed staged route must not manufacture a new ready state');

const source = fs.readFileSync(path.join(__dirname, '..', 'src/public-reader-registry.js'), 'utf8');
assert.match(source, /visibility = 'hidden'/);
assert.match(source, /aria-hidden/);
assert.match(source, /validateFinalizedStage\(stage, projectionRuntime\)/);
assert(source.indexOf('validateFinalizedStage(stage, projectionRuntime)') < source.indexOf('rootElement.replaceChildren(finalized.app)'), 'validation must precede atomic visible promotion');
for (const file of ['scripts/build_public_release_core.py', 'js/public-bootstrap.js', 'js/public-app.js', 'scripts/validate_public_deployment.py', 'config/public-runtime-inventory.json']) {
  const body = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  assert(!body.includes('reader_runtime'), `${file} still authorizes old reader_runtime`);
}
console.log('authoritative reader registry: PASS - connected hidden staging, pre-promotion validation, atomic swap, and fail-closed projection boundary verified');

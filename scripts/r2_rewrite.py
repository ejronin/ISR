#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, value):
    (ROOT / path).write_text(value, encoding="utf-8", newline="\n")


def replace_once(path, old, new):
    value = text(path)
    count = value.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:100]!r}")
    write(path, value.replace(old, new, 1))


def replace_all(path, old, new, minimum=1):
    value = text(path)
    count = value.count(old)
    if count < minimum:
        raise SystemExit(f"{path}: expected at least {minimum} matches, found {count}: {old!r}")
    write(path, value.replace(old, new))


# ---- signed release graph -------------------------------------------------
replace_once("scripts/build_public_release_core.py",
             'GENERATOR_VERSION = "2.3-single-pass-reader-assets"',
             'GENERATOR_VERSION = "2.4-authoritative-reader-registry"')
replace_once("scripts/build_public_release_core.py",
'''    ("map_runtime", "leaflet", "vendor/leaflet/leaflet.js", "js"),
    ("page_registry", "public-ia", "js/public-ia.js", "js"),
    ("reader_runtime", "public-reader-layer", "src/public-reader-layer.js", "js"),''',
'''    ("map_runtime", "leaflet", "vendor/leaflet/leaflet.js", "js"),
    ("base_runtime", "public-ia", "js/public-ia.js", "js"),
    ("reader_projection", "public-reader-layer", "src/public-reader-layer.js", "js"),
    ("page_registry", "public-reader-registry", "src/public-reader-registry.js", "js"),''')
replace_once("scripts/build_public_release_core.py",
'''        assets_by_role["map_runtime"],
        assets_by_role["page_registry"],
        assets_by_role["reader_runtime"],''',
'''        assets_by_role["map_runtime"],
        assets_by_role["base_runtime"],
        assets_by_role["reader_projection"],
        assets_by_role["page_registry"],''')
replace_once("scripts/build_public_release_core.py",
'''            "runtime": [assets_by_role["map_runtime"]["path"], assets_by_role["page_registry"]["path"], assets_by_role["reader_runtime"]["path"]],''',
'''            "runtime": [assets_by_role["map_runtime"]["path"], assets_by_role["base_runtime"]["path"], assets_by_role["reader_projection"]["path"], assets_by_role["page_registry"]["path"]],''')

# ---- bootstrap authorization ---------------------------------------------
replace_once("js/public-bootstrap.js",
'''    const mapRuntime = validateContentAddressedAsset(assetForRole(manifest, 'map_runtime'), 'js');
    const pageRegistry = validateContentAddressedAsset(assetForRole(manifest, 'page_registry'), 'js');
    const readerRuntime = validateContentAddressedAsset(assetForRole(manifest, 'reader_runtime'), 'js');''',
'''    const mapRuntime = validateContentAddressedAsset(assetForRole(manifest, 'map_runtime'), 'js');
    const baseRuntime = validateContentAddressedAsset(assetForRole(manifest, 'base_runtime'), 'js');
    const readerProjection = validateContentAddressedAsset(assetForRole(manifest, 'reader_projection'), 'js');
    const pageRegistry = validateContentAddressedAsset(assetForRole(manifest, 'page_registry'), 'js');''')
replace_once("js/public-bootstrap.js",
"    const fixedRoles = ['map_runtime', 'page_registry', 'reader_runtime', 'map_stylesheet', 'stylesheet', 'reader_stylesheet', 'reference_geography', 'entrypoint'];",
"    const fixedRoles = ['map_runtime', 'base_runtime', 'reader_projection', 'page_registry', 'map_stylesheet', 'stylesheet', 'reader_stylesheet', 'reference_geography', 'entrypoint'];")
replace_once("js/public-bootstrap.js",
"    const runtimes = [mapRuntime, pageRegistry, readerRuntime];",
"    const runtimes = [mapRuntime, baseRuntime, readerProjection, pageRegistry];")
replace_once("js/public-bootstrap.js",
"manifest.application.runtime.length === 3",
"manifest.application.runtime.length === 4")

# ---- entrypoint authorization --------------------------------------------
replace_once("js/public-app.js",
'''    const mapRuntime = validateContentAddressedAsset(assetForRole(manifest, 'map_runtime'), 'js');
    const runtime = validateContentAddressedAsset(assetForRole(manifest, 'page_registry'), 'js');
    const readerRuntime = validateContentAddressedAsset(assetForRole(manifest, 'reader_runtime'), 'js');''',
'''    const mapRuntime = validateContentAddressedAsset(assetForRole(manifest, 'map_runtime'), 'js');
    const baseRuntime = validateContentAddressedAsset(assetForRole(manifest, 'base_runtime'), 'js');
    const readerProjection = validateContentAddressedAsset(assetForRole(manifest, 'reader_projection'), 'js');
    const pageRegistry = validateContentAddressedAsset(assetForRole(manifest, 'page_registry'), 'js');''')
replace_once("js/public-app.js",
"    const fixedRoles = ['map_runtime', 'page_registry', 'reader_runtime', 'map_stylesheet', 'stylesheet', 'reader_stylesheet', 'reference_geography', 'entrypoint'];",
"    const fixedRoles = ['map_runtime', 'base_runtime', 'reader_projection', 'page_registry', 'map_stylesheet', 'stylesheet', 'reader_stylesheet', 'reference_geography', 'entrypoint'];")
replace_once("js/public-app.js",
"manifest.application.runtime.length === 3 && manifest.application.runtime[0] === mapRuntime.path && manifest.application.runtime[1] === runtime.path && manifest.application.runtime[2] === readerRuntime.path",
"manifest.application.runtime.length === 4 && manifest.application.runtime[0] === mapRuntime.path && manifest.application.runtime[1] === baseRuntime.path && manifest.application.runtime[2] === readerProjection.path && manifest.application.runtime[3] === pageRegistry.path")
replace_once("js/public-app.js",
"    const runtimes = [assetForRole(manifest, 'map_runtime'), assetForRole(manifest, 'page_registry'), assetForRole(manifest, 'reader_runtime')];",
"    const runtimes = [assetForRole(manifest, 'map_runtime'), assetForRole(manifest, 'base_runtime'), assetForRole(manifest, 'reader_projection'), assetForRole(manifest, 'page_registry')];")
replace_once("js/public-app.js",
"authorization.runtimeAssets.length === 3",
"authorization.runtimeAssets.length === 4")

# ---- deployment validation -----------------------------------------------
replace_once("scripts/validate_public_deployment.py",
'''        "map_runtime", "page_registry", "reader_runtime",
        "map_stylesheet", "stylesheet", "reader_stylesheet",''',
'''        "map_runtime", "base_runtime", "reader_projection", "page_registry",
        "map_stylesheet", "stylesheet", "reader_stylesheet",''')
replace_once("scripts/validate_public_deployment.py",
'''    validate_asset(site, by_role["map_runtime"], "map_runtime", "js")
    validate_asset(site, by_role["page_registry"], "page_registry", "js")
    validate_asset(site, by_role["reader_runtime"], "reader_runtime", "js")''',
'''    validate_asset(site, by_role["map_runtime"], "map_runtime", "js")
    validate_asset(site, by_role["base_runtime"], "base_runtime", "js")
    validate_asset(site, by_role["reader_projection"], "reader_projection", "js")
    validate_asset(site, by_role["page_registry"], "page_registry", "js")''')
replace_once("scripts/validate_public_deployment.py",
'''        by_role["map_runtime"].get("path"),
        by_role["page_registry"].get("path"),
        by_role["reader_runtime"].get("path"),''',
'''        by_role["map_runtime"].get("path"),
        by_role["base_runtime"].get("path"),
        by_role["reader_projection"].get("path"),
        by_role["page_registry"].get("path"),''')

# ---- runtime inventory ----------------------------------------------------
replace_once("config/public-runtime-inventory.json",
'''    { "role": "map_runtime", "path": "vendor/leaflet/leaflet.js" },
    { "role": "page_registry", "path": "js/public-ia.js" },
    { "role": "reader_runtime", "path": "src/public-reader-layer.js" },''',
'''    { "role": "map_runtime", "path": "vendor/leaflet/leaflet.js" },
    { "role": "base_runtime", "path": "js/public-ia.js" },
    { "role": "reader_projection", "path": "src/public-reader-layer.js" },
    { "role": "page_registry", "path": "src/public-reader-registry.js" },''')
replace_once("config/public-runtime-inventory.json",
'''    { "service": "public page registry and route ownership", "path": "js/public-ia.js", "symbol": "PAGE_OWNERS" },''',
'''    { "service": "authoritative visible reader registry and route lifecycle", "path": "src/public-reader-registry.js", "symbol": "function mount" },
    { "service": "non-authoritative base rendering library", "path": "js/public-ia.js", "symbol": "PAGE_OWNERS" },
    { "service": "non-authoritative reader projection support", "path": "src/public-reader-layer.js", "symbol": "READER_LAYER_VERSION" },''')

# ---- authoritative reader-first registry ---------------------------------
registry = r'''/* ATLAS AUTHORITATIVE PUBLIC READER REGISTRY
 *
 * The sole visible page authority. Base rendering and reader projection run
 * only inside a connected, off-screen staging host. No staged page is promoted
 * until reader finalization and the public-surface contract pass validation.
 */
(function initAtlasPublicReaderRegistry(globalObject, factory) {
  'use strict';
  const api = factory(globalObject);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  if (api) globalObject.AtlasPublicIA = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function atlasReaderRegistryFactory(root) {
  'use strict';

  const projection = root.AtlasPublicIA || (typeof require === 'function' ? require('./public-reader-layer.js') : null);
  if (!projection || typeof projection.mount !== 'function') return null;

  const VERSION = 'atlas-reader-registry-v1';
  const INTERNAL_TEXT = /\b(?:ROOK|PR\/CI)\b|claim[_ -]?instance[_ -]?id|proposition[_ -]?id|chain[_ -]?id|publication[_ -]?blocker|knowledge[_ -]?basis[_ -]?support[_ -]?failure/i;

  class ReaderRegistryError extends Error {
    constructor(code, message, cause) {
      super(message);
      this.name = 'ReaderRegistryError';
      this.code = code;
      if (cause) this.cause = cause;
    }
  }

  function invariant(condition, code, message) {
    if (!condition) throw new ReaderRegistryError(code, message);
  }

  function removeMaps(node) {
    if (!node || typeof node.querySelectorAll !== 'function') return;
    [node, ...node.querySelectorAll('*')].forEach(candidate => {
      if (candidate && candidate._atlasMap && typeof candidate._atlasMap.remove === 'function') {
        try { candidate._atlasMap.remove(); } catch (_) { /* page is being retired */ }
      }
    });
  }

  function createStagingHost(documentObject, rootElement, windowObject) {
    const host = documentObject.createElement('div');
    host.dataset.atlasReaderStaging = VERSION;
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'fixed';
    host.style.left = '-100000px';
    host.style.top = '0';
    host.style.width = `${Math.max(1024, Number(windowObject && windowObject.innerWidth) || 1280)}px`;
    host.style.minHeight = '100vh';
    host.style.visibility = 'hidden';
    host.style.pointerEvents = 'none';
    host.style.overflow = 'hidden';
    rootElement.append(host);
    invariant(host.isConnected !== false, 'READER_STAGE_DISCONNECTED', 'Reader staging host must remain connected during finalization.');
    return host;
  }

  function validateFinalizedStage(stage, projectionRuntime) {
    const app = stage.querySelector && stage.querySelector('.atlas-app');
    const article = stage.querySelector && stage.querySelector('.public-page');
    const heading = article && article.querySelector && article.querySelector('h1');
    invariant(app && article && heading, 'READER_FINALIZATION_INCOMPLETE', 'The staged route is missing the qualified reader shell.');
    invariant(article.dataset && article.dataset.readerLayer === projectionRuntime.READER_LAYER_VERSION, 'READER_PROJECTION_MISSING', 'The staged route did not complete reader projection.');
    const exposedText = String(stage.innerText || stage.textContent || '');
    invariant(!INTERNAL_TEXT.test(exposedText), 'READER_INTERNAL_LEAK', 'The staged route contains internal review text.');
    return { app, article, heading };
  }

  function copyRouteState(target, staged) {
    ['routeKey', 'pageOwner', 'primarySection', 'secondaryPage'].forEach(key => { target[key] = staged[key]; });
  }

  function emitRouteFailure(windowObject, state, error) {
    state.readerError = { code: error.code || 'READER_FINALIZATION_FAILED' };
    if (root.console && typeof root.console.error === 'function') root.console.error('Atlas reader route finalization failed', error);
    if (windowObject && typeof windowObject.CustomEvent === 'function' && typeof windowObject.dispatchEvent === 'function') {
      windowObject.dispatchEvent(new windowObject.CustomEvent('atlasreadererror', { detail: { code: state.readerError.code } }));
    }
  }

  function mount(options) {
    const settings = options || {};
    const documentObject = settings.documentObject || root.document;
    const windowObject = settings.windowObject || root;
    const rootElement = settings.rootElement;
    const routeRuntime = settings.routeRuntime;
    const state = settings.state || {};
    const projectionRuntime = settings.projectionRuntime || projection;
    invariant(documentObject && rootElement && routeRuntime && typeof routeRuntime.forRoute === 'function', 'READER_REGISTRY_INVALID', 'Reader registry requires a document, root element, and guarded route runtime.');
    invariant(projectionRuntime && typeof projectionRuntime.mount === 'function' && typeof projectionRuntime.parseRoute === 'function', 'READER_PROJECTION_UNAVAILABLE', 'Reader projection support is unavailable.');

    if (rootElement.__atlasRouteController && typeof rootElement.__atlasRouteController.destroy === 'function') rootElement.__atlasRouteController.destroy();

    let destroyed = false;
    let previousRouteKey = null;
    let currentServices = null;

    const stageRoute = focusHeading => {
      invariant(!destroyed, 'READER_REGISTRY_DESTROYED', 'Reader registry is no longer active.');
      const previousTitle = documentObject.title;
      const previousVisible = Array.from(rootElement.children || []).filter(node => !(node.dataset && node.dataset.atlasReaderStaging));
      const stagedState = { ...state };
      const stage = createStagingHost(documentObject, rootElement, windowObject);
      let supportController = null;
      try {
        supportController = projectionRuntime.mount({
          ...settings,
          documentObject,
          windowObject,
          rootElement: stage,
          routeRuntime,
          state: stagedState
        });
        const finalized = validateFinalizedStage(stage, projectionRuntime);
        const route = supportController && typeof supportController.current === 'function'
          ? supportController.current()
          : projectionRuntime.parseRoute(windowObject.location && windowObject.location.hash);
        currentServices = supportController && typeof supportController.services === 'function' ? supportController.services() : currentServices;
        if (supportController && typeof supportController.destroy === 'function') supportController.destroy();
        supportController = null;
        finalized.app.dataset.readerAuthority = VERSION;
        previousVisible.forEach(removeMaps);
        rootElement.replaceChildren(finalized.app);
        rootElement.className = 'atlas-ready';
        rootElement.dataset.status = 'ready';
        rootElement.setAttribute('aria-busy', 'false');
        copyRouteState(state, stagedState);
        delete state.readerError;
        if (focusHeading && previousRouteKey && route && previousRouteKey !== route.key && finalized.heading && typeof finalized.heading.focus === 'function') finalized.heading.focus();
        previousRouteKey = route && route.key || stagedState.routeKey || previousRouteKey;
        return route;
      } catch (error) {
        if (supportController && typeof supportController.destroy === 'function') {
          try { supportController.destroy(); } catch (_) { /* original failure wins */ }
        }
        if (stage && typeof stage.remove === 'function') stage.remove();
        documentObject.title = previousTitle;
        const failure = error instanceof ReaderRegistryError
          ? error
          : new ReaderRegistryError('READER_FINALIZATION_FAILED', 'Reader projection or finalization failed.', error);
        if (previousVisible.length) {
          emitRouteFailure(windowObject, state, failure);
          return null;
        }
        throw failure;
      }
    };

    const onHashChange = () => stageRoute(true);
    if (windowObject && typeof windowObject.addEventListener === 'function') windowObject.addEventListener('hashchange', onHashChange);
    let initialRoute;
    try {
      initialRoute = stageRoute(false);
    } catch (error) {
      if (windowObject && typeof windowObject.removeEventListener === 'function') windowObject.removeEventListener('hashchange', onHashChange);
      throw error;
    }

    const controller = Object.freeze({
      render: () => stageRoute(false),
      current: () => projectionRuntime.parseRoute(windowObject.location && windowObject.location.hash),
      services: () => currentServices,
      destroy: () => {
        destroyed = true;
        if (windowObject && typeof windowObject.removeEventListener === 'function') windowObject.removeEventListener('hashchange', onHashChange);
      },
      initialRoute
    });
    rootElement.__atlasRouteController = controller;
    return controller;
  }

  return Object.freeze({
    ...projection,
    mount,
    READER_REGISTRY_VERSION: VERSION,
    ReaderRegistryError,
    validateFinalizedStage
  });
}));
'''
write("src/public-reader-registry.js", registry)

# ---- tests: signed graph --------------------------------------------------
replace_once("tests/public-boot.test.js",
"  const runtimes = ['map_runtime', 'page_registry', 'reader_runtime'].map(role => app.assetForRole(sourceManifest, role));",
"  const runtimes = ['map_runtime', 'base_runtime', 'reader_projection', 'page_registry'].map(role => app.assetForRole(sourceManifest, role));")
replace_once("tests/public-boot.test.js",
"  const fixedRoles = ['map_runtime', 'page_registry', 'reader_runtime', 'map_stylesheet', 'stylesheet', 'reader_stylesheet', 'reference_geography', 'entrypoint'];",
"  const fixedRoles = ['map_runtime', 'base_runtime', 'reader_projection', 'page_registry', 'map_stylesheet', 'stylesheet', 'reader_stylesheet', 'reference_geography', 'entrypoint'];")
replace_once("tests/public-boot.test.js",
'''  const readerRuntime = app.assetForRole(manifest, 'reader_runtime');
  const readerStylesheet = app.assetForRole(manifest, 'reader_stylesheet');
  assert.equal(readerRuntime.source_path, 'src/public-reader-layer.js');
  assert.equal(readerStylesheet.source_path, 'src/public-reader-layer.css');
  assert.deepEqual(manifest.application.runtime, [
    app.assetForRole(manifest, 'map_runtime').path,
    app.assetForRole(manifest, 'page_registry').path,
    readerRuntime.path
  ]);''',
'''  const baseRuntime = app.assetForRole(manifest, 'base_runtime');
  const readerProjection = app.assetForRole(manifest, 'reader_projection');
  const pageRegistry = app.assetForRole(manifest, 'page_registry');
  const readerStylesheet = app.assetForRole(manifest, 'reader_stylesheet');
  assert.equal(baseRuntime.source_path, 'js/public-ia.js');
  assert.equal(readerProjection.source_path, 'src/public-reader-layer.js');
  assert.equal(pageRegistry.source_path, 'src/public-reader-registry.js');
  assert.equal(readerStylesheet.source_path, 'src/public-reader-layer.css');
  assert.deepEqual(manifest.application.runtime, [
    app.assetForRole(manifest, 'map_runtime').path,
    baseRuntime.path,
    readerProjection.path,
    pageRegistry.path
  ]);''')
replace_once("tests/public-boot.test.js",
'''  const missingReader = clone(manifest);
  missingReader.application.assets = missingReader.application.assets.filter(asset => asset.role !== 'reader_runtime');
  assert.throws(
    () => bootstrap.validateManifest(missingReader, fakeBootstrapScript(missingReader)),''',
'''  const missingReader = clone(manifest);
  missingReader.application.assets = missingReader.application.assets.filter(asset => asset.role !== 'reader_projection');
  assert.throws(
    () => bootstrap.validateManifest(missingReader, fakeBootstrapScript(missingReader)),''')

replace_once("tests/public-reader-layer.test.js", "assert.match(releaseCore, /reader_runtime/);", "assert.match(releaseCore, /base_runtime/);\nassert.match(releaseCore, /reader_projection/);\nassert.match(releaseCore, /page_registry/);\nassert.match(releaseCore, /src\\/public-reader-registry\\.js/);")
replace_once("tests/public-reader-layer.test.js", "assert.match(releaseCore, /2\\.3-single-pass-reader-assets/);", "assert.match(releaseCore, /2\\.4-authoritative-reader-registry/);")
replace_once("tests/public-reader-layer.test.js", "assert.match(appSource, /assetForRole\\(manifest, 'reader_runtime'\\)/);", "assert.match(appSource, /assetForRole\\(manifest, 'base_runtime'\\)/);\nassert.match(appSource, /assetForRole\\(manifest, 'reader_projection'\\)/);\nassert.match(appSource, /assetForRole\\(manifest, 'page_registry'\\)/);")
replace_once("tests/public-reader-layer.test.js", "assert.match(appSource, /authorization\\.runtimeAssets\\.length === 3/);", "assert.match(appSource, /authorization\\.runtimeAssets\\.length === 4/);")

# Simple fixed-role and naming migrations in architecture assertions.
for path in [
    "tests/public-map-phase6.test.js",
    "tests/public-final-polish.test.js",
    "tests/neutral-current-narrative.test.py",
]:
    replace_all(path, "reader_runtime", "reader_projection")
    replace_all(path, "'map_runtime', 'page_registry', 'reader_projection'", "'map_runtime', 'base_runtime', 'reader_projection', 'page_registry'", minimum=0)

# Browser boot smoke: explicit four-runtime order.
replace_once("tests/browser-public-boot-smoke.js",
'''const pageRegistry = manifest.application.assets.find(asset => asset.role === 'page_registry');
const readerRuntime = manifest.application.assets.find(asset => asset.role === 'reader_runtime');
const mapRuntime = manifest.application.assets.find(asset => asset.role === 'map_runtime');''',
'''const baseRuntime = manifest.application.assets.find(asset => asset.role === 'base_runtime');
const readerProjection = manifest.application.assets.find(asset => asset.role === 'reader_projection');
const pageRegistry = manifest.application.assets.find(asset => asset.role === 'page_registry');
const mapRuntime = manifest.application.assets.find(asset => asset.role === 'map_runtime');''')
replace_once("tests/browser-public-boot-smoke.js",
"assert(entrypoint && stylesheet && readerStylesheet && pageRegistry && readerRuntime && mapRuntime && mapStylesheet && referenceGeography && bootstrap, 'content-addressed release assets are missing');",
"assert(entrypoint && stylesheet && readerStylesheet && baseRuntime && readerProjection && pageRegistry && mapRuntime && mapStylesheet && referenceGeography && bootstrap, 'content-addressed release assets are missing');")
replace_once("tests/browser-public-boot-smoke.js",
"      new Set([`/${bootstrap.path}`, `/${mapRuntime.path}`, `/${pageRegistry.path}`, `/${readerRuntime.path}`, `/${entrypoint.path}`]),",
"      new Set([`/${bootstrap.path}`, `/${mapRuntime.path}`, `/${baseRuntime.path}`, `/${readerProjection.path}`, `/${pageRegistry.path}`, `/${entrypoint.path}`]),")
replace_once("tests/browser-public-boot-smoke.js",
"    assert.equal(loadedScripts.get(`/${pageRegistry.path}`), pageRegistry.integrity, 'page registry must carry the manifest-authorized SRI value');\n    assert.equal(loadedScripts.get(`/${readerRuntime.path}`), readerRuntime.integrity, 'reader runtime must carry the manifest-authorized SRI value');",
"    assert.equal(loadedScripts.get(`/${baseRuntime.path}`), baseRuntime.integrity, 'base runtime must carry the manifest-authorized SRI value');\n    assert.equal(loadedScripts.get(`/${readerProjection.path}`), readerProjection.integrity, 'reader projection must carry the manifest-authorized SRI value');\n    assert.equal(loadedScripts.get(`/${pageRegistry.path}`), pageRegistry.integrity, 'authoritative page registry must carry the manifest-authorized SRI value');")
replace_once("tests/browser-public-boot-smoke.js",
"    assert.deepEqual(ready.authorization.runtimes, [mapRuntime.path, pageRegistry.path, readerRuntime.path]);",
"    assert.deepEqual(ready.authorization.runtimes, [mapRuntime.path, baseRuntime.path, readerProjection.path, pageRegistry.path]);")

# New direct failure-boundary regression. Uses a tiny DOM stub to prove a
# technical staged page is removed rather than promoted after projection error.
registry_test = r'''\'use strict\';
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
'''.replace("\\'use strict\\';", "'use strict';")
write("tests/public-reader-registry.test.js", registry_test)

# Qualification must execute/check the new authority boundary regression.
replace_once(".github/workflows/release-qualification.yml",
"          node tests/public-reader-layer.test.js\n          node tests/public-final-polish.test.js",
"          node tests/public-reader-layer.test.js\n          node tests/public-reader-registry.test.js\n          node tests/public-final-polish.test.js")
replace_once(".github/workflows/release-qualification.yml",
"          node --check src/public-reader-layer.js\n          node --check tests/browser-public-boot-smoke.js",
"          node --check src/public-reader-layer.js\n          node --check src/public-reader-registry.js\n          node --check tests/public-reader-registry.test.js\n          node --check tests/browser-public-boot-smoke.js")

print('R2 rewrite applied')

/* ATLAS AUTHORITATIVE PUBLIC READER REGISTRY
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
  const INTERNAL_TEXT = /(?<![\w./-])ROOK(?![\w./-])|\bPR\/CI\b|claim[_ -]?instance[_ -]?id|proposition[_ -]?id|chain[_ -]?id|publication[_ -]?blocker|knowledge[_ -]?basis[_ -]?support[_ -]?failure/i;

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

  function quiesceMaps(node) {
    if (!node || typeof node.querySelectorAll !== 'function') return;
    [node, ...node.querySelectorAll('*')].forEach(candidate => {
      const map = candidate && candidate._atlasMap;
      if (!map || typeof map.stop !== 'function') return;
      try { map.stop(); } catch (_) { /* replacement already settled */ }
    });
  }

  function removeMaps(node) {
    if (!node || typeof node.querySelectorAll !== 'function') return;
    [node, ...node.querySelectorAll('*')].forEach(candidate => {
      const map = candidate && candidate._atlasMap;
      if (!map || typeof map.remove !== 'function') return;
      try { map.remove(); } catch (_) { /* page is already retired */ }
    });
  }

  function retireVisibleNodes(documentObject, rootElement, nodes) {
    if (!nodes || !nodes.length) return;
    const host = documentObject.createElement('div');
    host.dataset.atlasReaderRetirement = VERSION;
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'fixed';
    host.style.left = '-100000px';
    host.style.top = '0';
    host.style.width = '1px';
    host.style.height = '1px';
    host.style.visibility = 'hidden';
    host.style.pointerEvents = 'none';
    host.style.overflow = 'hidden';
    const retirementParent = documentObject.body || documentObject.documentElement || rootElement;
    retirementParent.append(host);
    nodes.forEach(node => host.append(node));
    nodes.forEach(removeMaps);
    if (typeof host.remove === 'function') host.remove();
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
    const stagingParent = documentObject.body || documentObject.documentElement || rootElement;
    stagingParent.append(host);
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

    const stageRoute = (focusHeading, propagateFailure = false) => {
      invariant(!destroyed, 'READER_REGISTRY_DESTROYED', 'Reader registry is no longer active.');
      const previousTitle = documentObject.title;
      const previousVisible = Array.from(rootElement.children || []).filter(node => !(node.dataset && node.dataset.atlasReaderStaging));
      const hasQualifiedVisible = rootElement.dataset && rootElement.dataset.status === 'ready' && previousVisible.length > 0;
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
        previousVisible.forEach(quiesceMaps);
        rootElement.replaceChildren(finalized.app);
        retireVisibleNodes(documentObject, rootElement, previousVisible);
        if (stage && typeof stage.remove === 'function') stage.remove();
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
          : new ReaderRegistryError(
            error && typeof error.code === 'string' && error.code ? error.code : 'READER_FINALIZATION_FAILED',
            'Reader projection or finalization failed.',
            error
          );
        if (hasQualifiedVisible) {
          emitRouteFailure(windowObject, state, failure);
          if (propagateFailure) throw failure;
          return null;
        }
        throw failure;
      }
    };

    const onHashChange = () => stageRoute(true, false);
    if (windowObject && typeof windowObject.addEventListener === 'function') windowObject.addEventListener('hashchange', onHashChange);
    let initialRoute;
    try {
      initialRoute = stageRoute(false, false);
    } catch (error) {
      if (windowObject && typeof windowObject.removeEventListener === 'function') windowObject.removeEventListener('hashchange', onHashChange);
      throw error;
    }

    const controller = Object.freeze({
      render: () => stageRoute(false, true),
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
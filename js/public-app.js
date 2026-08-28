(function initAtlasPublicBoot(globalObject, factory) {
  'use strict';
  const api = factory(globalObject);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  globalObject.AtlasPublicBoot = api;
  api.boot({
    authorization: globalObject.ATLAS_RELEASE_AUTHORIZATION,
    executingScript: globalObject.document && globalObject.document.currentScript
  });
}(typeof globalThis !== 'undefined' ? globalThis : this, function atlasPublicBootFactory(root) {
  'use strict';

  const APPLICATION_VERSION = 'atlas-public-shell-v1';
  const MODEL_URL = './data/public-current-state.json';
  const ARCHIVE_URL = './snapshots/Iran%20War%20Map%2020260820.html';
  const RELOAD_ATTEMPT_KEY = 'atlas-public-release-reload-attempted-v1';
  const EXPECTED_MODEL_SCHEMA = '1.0';
  const EXPECTED_MANIFEST_SCHEMA = '1.0';
  const EXPECTED_CHRONOLOGY_COUNT = 205;

  class AtlasBootError extends Error {
    constructor(code, message, cause) {
      super(message);
      this.name = 'AtlasBootError';
      this.code = code;
      if (cause) this.cause = cause;
    }
  }

  function invariant(condition, code, message) {
    if (!condition) throw new AtlasBootError(code, message);
  }

  function canonicalText(text) {
    return String(text).replace(/\r\n?/g, '\n');
  }

  function utf8Bytes(text) {
    return new TextEncoder().encode(canonicalText(text));
  }

  async function sha256Text(text) {
    invariant(root.crypto && root.crypto.subtle, 'CRYPTO_UNAVAILABLE', 'Release integrity verification is unavailable in this browser.');
    const digest = await root.crypto.subtle.digest('SHA-256', utf8Bytes(text));
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  }

  function parseJson(text, label) {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new AtlasBootError('INVALID_JSON', `${label} is not valid JSON.`, error);
    }
  }

  async function fetchText(url, fetchImpl) {
    let response;
    try {
      response = await fetchImpl(url, { cache: 'no-store', credentials: 'same-origin' });
    } catch (error) {
      throw new AtlasBootError('FETCH_FAILED', `Could not load ${url}.`, error);
    }
    if (!response || !response.ok) {
      throw new AtlasBootError('FETCH_FAILED', `Could not load ${url}${response ? ` (${response.status})` : ''}.`);
    }
    return response.text();
  }

  function assetForRole(manifest, role) {
    return (manifest.application && manifest.application.assets || []).find(asset => asset.role === role);
  }

  function validateContentAddressedAsset(asset, extension) {
    invariant(asset && typeof asset === 'object', 'RELEASE_MISMATCH', `The ${extension} release asset is missing.`);
    invariant(/^[a-f0-9]{64}$/.test(asset.sha256 || ''), 'RELEASE_MISMATCH', `The ${extension} release hash is invalid.`);
    invariant(asset.path === `assets/releases/${asset.name}.${asset.sha256}.${extension}`, 'RELEASE_MISMATCH', `The ${extension} release path is not content-addressed.`);
    invariant(asset.integrity && /^sha256-[A-Za-z0-9+/]{43}=$/.test(asset.integrity), 'RELEASE_MISMATCH', `The ${extension} release integrity value is invalid.`);
    invariant(asset.hash_basis === 'UTF8_LF_NORMALIZED', 'RELEASE_MISMATCH', `The ${extension} release hash basis is invalid.`);
    return asset;
  }

  function validateManifest(manifest) {
    invariant(manifest && typeof manifest === 'object', 'RELEASE_MISMATCH', 'The public release manifest is missing.');
    invariant(manifest.schema_version === EXPECTED_MANIFEST_SCHEMA, 'RELEASE_MISMATCH', 'The public release manifest schema is not supported.');
    invariant(manifest.artifact_role === 'PUBLIC_APPLICATION_RELEASE_MANIFEST', 'RELEASE_MISMATCH', 'The public release manifest role is invalid.');
    invariant(/^public-release-v1-[a-f0-9]{16}$/.test(manifest.release_identity || ''), 'RELEASE_MISMATCH', 'The public release identity is invalid.');
    invariant(manifest.application && manifest.application.version === APPLICATION_VERSION, 'RELEASE_MISMATCH', 'The application and release manifest versions do not match.');
    invariant(manifest.current_state && manifest.current_state.path === 'data/public-current-state.json', 'RELEASE_MISMATCH', 'The current-state path is invalid.');
    invariant(manifest.current_state.schema_version === EXPECTED_MODEL_SCHEMA, 'RELEASE_MISMATCH', 'The current-state schema is not supported.');
    invariant(/^[a-f0-9]{64}$/.test(manifest.current_state.sha256 || ''), 'RELEASE_MISMATCH', 'The current-state integrity value is invalid.');
    invariant(Array.isArray(manifest.application.assets) && manifest.application.assets.length === 3, 'RELEASE_MISMATCH', 'The application asset inventory is incomplete.');
    const assetPaths = manifest.application.assets.map(asset => asset.path);
    invariant(new Set(assetPaths).size === assetPaths.length, 'RELEASE_MISMATCH', 'The application asset inventory contains duplicate paths.');
    const runtime = validateContentAddressedAsset(assetForRole(manifest, 'page_registry'), 'js');
    const stylesheet = validateContentAddressedAsset(assetForRole(manifest, 'stylesheet'), 'css');
    const entrypoint = validateContentAddressedAsset(assetForRole(manifest, 'entrypoint'), 'js');
    invariant(Array.isArray(manifest.application.runtime) && manifest.application.runtime.length === 1 && manifest.application.runtime[0] === runtime.path, 'RELEASE_MISMATCH', 'The application runtime path is inconsistent.');
    invariant(manifest.application.stylesheet === stylesheet.path, 'RELEASE_MISMATCH', 'The application stylesheet path is inconsistent.');
    invariant(manifest.application.entrypoint === entrypoint.path, 'RELEASE_MISMATCH', 'The application entrypoint path is inconsistent.');
    return manifest;
  }

  function pathMatches(url, expectedPath) {
    const parsed = new URL(url, root.location && root.location.href);
    return parsed.pathname.endsWith(`/${expectedPath}`);
  }

  function validateRuntimeAuthorization(authorization, executingScript, documentObject) {
    invariant(authorization && authorization.manifest, 'RELEASE_MISMATCH', 'The application was not started by an authorized release bootstrap.');
    const manifest = validateManifest(authorization.manifest);
    invariant(authorization.releaseIdentity === manifest.release_identity, 'RELEASE_MISMATCH', 'The runtime authorization release identity is inconsistent.');
    const runtime = assetForRole(manifest, 'page_registry');
    const entrypoint = assetForRole(manifest, 'entrypoint');
    const stylesheet = assetForRole(manifest, 'stylesheet');
    invariant(authorization.entrypointPath === entrypoint.path && authorization.entrypointSha256 === entrypoint.sha256, 'RELEASE_MISMATCH', 'The entrypoint authorization is inconsistent.');
    invariant(authorization.stylesheetPath === stylesheet.path && authorization.stylesheetSha256 === stylesheet.sha256, 'RELEASE_MISMATCH', 'The stylesheet authorization is inconsistent.');
    invariant(Array.isArray(authorization.runtimeAssets) && authorization.runtimeAssets.length === 1, 'RELEASE_MISMATCH', 'The page registry authorization is missing.');
    invariant(authorization.runtimeAssets[0].path === runtime.path && authorization.runtimeAssets[0].sha256 === runtime.sha256, 'RELEASE_MISMATCH', 'The page registry authorization is inconsistent.');
    invariant(executingScript && executingScript.src, 'RELEASE_MISMATCH', 'The executing application identity is unavailable.');
    invariant(pathMatches(executingScript.src, entrypoint.path), 'RELEASE_MISMATCH', 'The executing application path is not authorized by this release.');
    invariant(executingScript.integrity === entrypoint.integrity, 'RELEASE_MISMATCH', 'The executing application integrity is not authorized by this release.');
    invariant(executingScript.dataset.atlasAuthorizedEntrypoint === manifest.release_identity, 'RELEASE_MISMATCH', 'The executing application release marker is invalid.');
    invariant(executingScript.dataset.assetSha256 === entrypoint.sha256, 'RELEASE_MISMATCH', 'The executing application hash marker is invalid.');
    const runtimeScripts = Array.from(documentObject.querySelectorAll('script[data-atlas-authorized-runtime]'));
    const activeRuntime = runtimeScripts.find(script => script.dataset.atlasAuthorizedRuntime === manifest.release_identity);
    invariant(activeRuntime && activeRuntime.src, 'RELEASE_MISMATCH', 'The authorized page registry is not active.');
    invariant(pathMatches(activeRuntime.src, runtime.path), 'RELEASE_MISMATCH', 'The active page registry path is not authorized by this release.');
    invariant(activeRuntime.integrity === runtime.integrity && activeRuntime.dataset.assetSha256 === runtime.sha256, 'RELEASE_MISMATCH', 'The active page registry integrity is not authorized by this release.');
    const styleLinks = Array.from(documentObject.querySelectorAll('link[data-atlas-authorized-style]'));
    const activeStyle = styleLinks.find(link => link.dataset.atlasAuthorizedStyle === manifest.release_identity);
    invariant(activeStyle && activeStyle.href, 'RELEASE_MISMATCH', 'The authorized application stylesheet is not active.');
    invariant(pathMatches(activeStyle.href, stylesheet.path), 'RELEASE_MISMATCH', 'The active stylesheet path is not authorized by this release.');
    invariant(activeStyle.integrity === stylesheet.integrity, 'RELEASE_MISMATCH', 'The active stylesheet integrity is not authorized by this release.');
    invariant(activeStyle.dataset.assetSha256 === stylesheet.sha256, 'RELEASE_MISMATCH', 'The active stylesheet hash marker is invalid.');
    return manifest;
  }

  function validateModel(model, manifest) {
    invariant(model && typeof model === 'object', 'MODEL_INVALID', 'The current evidence record is missing.');
    invariant(model.schema_version === EXPECTED_MODEL_SCHEMA, 'MODEL_INVALID', 'The current evidence schema is not supported.');
    invariant(model.artifact_role === 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL', 'MODEL_INVALID', 'The loaded artifact is not the public current-state read model.');
    invariant(model.release && model.release.release_identity === manifest.current_state.release_identity, 'RELEASE_MISMATCH', 'The application and current-state release identities do not match.');
    invariant(model.release.input_set_sha256 === manifest.current_state.input_set_sha256, 'RELEASE_MISMATCH', 'The current-state input identity does not match the public release.');
    invariant(model.release.current_osint_cutoff === manifest.current_state.current_osint_cutoff, 'RELEASE_MISMATCH', 'The current-state cutoff does not match the public release.');
    invariant(model.counts && model.counts.chronology_records === EXPECTED_CHRONOLOGY_COUNT, 'MODEL_INVALID', 'The approved chronology count is not present.');
    invariant(Array.isArray(model.chronology) && model.chronology.length === model.counts.chronology_records, 'MODEL_INVALID', 'The chronology length does not match its declared count.');
    const ids = model.chronology.map(item => item && item.event_id);
    invariant(ids.every(Boolean) && new Set(ids).size === ids.length, 'MODEL_INVALID', 'The chronology contains a missing or duplicate event ID.');
    const sourceRecords = model.sources && Array.isArray(model.sources.records) ? model.sources.records : [];
    const sourceIds = new Set(sourceRecords.map(source => source.source_id));
    invariant(sourceIds.size === sourceRecords.length, 'MODEL_INVALID', 'The source catalog contains duplicate IDs.');
    for (const item of model.chronology) {
      invariant(item.provenance && item.provenance.package_key && item.provenance.event && item.provenance.timeline, 'MODEL_INVALID', `Chronology provenance is incomplete for ${item.event_id}.`);
      invariant(Array.isArray(item.source_references), 'MODEL_INVALID', `Source provenance is incomplete for ${item.event_id}.`);
      for (const reference of item.source_references) {
        invariant(sourceIds.has(reference.source_id) && reference.variant_key, 'MODEL_INVALID', `A source reference does not resolve for ${item.event_id}.`);
      }
    }
    invariant(model.integrity && model.integrity.duplicate_event_ids === 0, 'MODEL_INVALID', 'The current-state integrity block reports duplicate events.');
    invariant(Array.isArray(model.integrity.unresolved_chronology_source_ids) && model.integrity.unresolved_chronology_source_ids.length === 0, 'MODEL_INVALID', 'The current-state integrity block reports unresolved chronology sources.');
    invariant(model.page_data && Object.values(model.page_data).every(mapping => mapping.dataset_keys.every(key => !key.startsWith('legacy.'))), 'MODEL_INVALID', 'A current page maps legacy reference data.');
    return model;
  }

  function now() {
    return root.performance && typeof root.performance.now === 'function' ? root.performance.now() : Date.now();
  }

  async function loadCurrentRecord(options) {
    const settings = options || {};
    const fetchImpl = settings.fetchImpl || root.fetch;
    invariant(typeof fetchImpl === 'function', 'FETCH_UNAVAILABLE', 'This browser cannot load the current evidence record.');
    const startedAt = now();
    const manifest = validateManifest(settings.manifest);
    const modelStartedAt = now();
    const modelText = await fetchText(settings.modelUrl || MODEL_URL, fetchImpl);
    const modelHash = await sha256Text(modelText);
    invariant(modelHash === manifest.current_state.sha256, 'RELEASE_MISMATCH', 'The current-state bytes do not match the public release.');
    invariant(utf8Bytes(modelText).byteLength === manifest.current_state.bytes, 'RELEASE_MISMATCH', 'The current-state byte count does not match the public release.');
    const parseStartedAt = now();
    const model = parseJson(modelText, 'The current evidence record');
    const parseMilliseconds = now() - parseStartedAt;
    validateModel(model, manifest);
    return {
      manifest,
      model,
      performance: {
        total_boot_milliseconds: now() - startedAt,
        model_load_and_integrity_milliseconds: now() - modelStartedAt,
        model_parse_milliseconds: parseMilliseconds,
        model_transfer_bytes: utf8Bytes(modelText).byteLength
      }
    };
  }

  function renderCurrent(rootElement, loaded, options) {
    const ia = root.AtlasPublicIA;
    invariant(ia && typeof ia.mount === 'function', 'RENDERER_UNAVAILABLE', 'The authorized public page registry is unavailable.');
    ia.validateRegistry(loaded.model);
    const state = {
      status: 'ready',
      applicationVersion: APPLICATION_VERSION,
      releaseIdentity: loaded.manifest.release_identity,
      currentStateReleaseIdentity: loaded.model.release.release_identity,
      currentOsintCutoff: loaded.model.release.current_osint_cutoff,
      chronologyCount: loaded.model.counts.chronology_records,
      sourceCount: loaded.model.counts.canonical_source_records,
      performance: loaded.performance,
      routeKey: null,
      pageOwner: null
    };
    const settings = options || {};
    const controller = ia.mount({
      rootElement,
      model: loaded.model,
      state,
      documentObject: settings.documentObject || root.document,
      windowObject: settings.windowObject || root
    });
    root.ATLAS_PUBLIC_STATE = state;
    root.ATLAS_PUBLIC_MODEL = loaded.model;
    root.ATLAS_PUBLIC_ROUTER = controller;
    try { root.sessionStorage && root.sessionStorage.removeItem(RELOAD_ATTEMPT_KEY); } catch (_) { /* storage is optional */ }
    if (typeof root.CustomEvent === 'function' && root.dispatchEvent) {
      root.dispatchEvent(new root.CustomEvent('atlaspublicready', { detail: {
        releaseIdentity: state.releaseIdentity,
        chronologyCount: state.chronologyCount,
        currentOsintCutoff: state.currentOsintCutoff,
        routeKey: state.routeKey
      } }));
    }
    return state;
  }

  function failureDetail(error) {
    if (error && error.code === 'RELEASE_MISMATCH') return 'The application and evidence record did not resolve to one release.';
    if (error && error.code === 'MODEL_INVALID') return 'The downloaded evidence record did not pass structural validation.';
    return 'The evidence record is unavailable or did not pass integrity validation.';
  }

  function renderFailure(rootElement, error, retry) {
    const documentObject = rootElement.ownerDocument || root.document;
    const section = documentObject.createElement('section');
    section.className = 'error-state';
    const appendText = (tag, className, text) => {
      const node = documentObject.createElement(tag);
      if (className) node.className = className;
      node.textContent = text;
      section.append(node);
      return node;
    };
    appendText('p', 'boot-kicker', 'Current record unavailable');
    appendText('h1', '', 'The current evidence record could not be loaded.');
    appendText('p', '', failureDetail(error));
    if (error && error.code) appendText('p', 'error-code', `Error code: ${error.code}`);
    const actions = documentObject.createElement('div');
    actions.className = 'error-actions';
    const retryButton = documentObject.createElement('button');
    retryButton.type = 'button';
    retryButton.textContent = 'Retry';
    retryButton.addEventListener('click', retry || (() => root.location.reload()));
    const archive = documentObject.createElement('a');
    archive.href = ARCHIVE_URL;
    archive.textContent = 'Open archived records';
    actions.append(retryButton, archive);
    section.append(actions);
    rootElement.replaceChildren(section);
    rootElement.className = 'atlas-error';
    rootElement.dataset.status = 'error';
    rootElement.setAttribute('aria-busy', 'false');
    root.ATLAS_PUBLIC_STATE = { status: 'error', code: error && error.code ? error.code : 'UNKNOWN' };
    return root.ATLAS_PUBLIC_STATE;
  }

  function controlledReload(error, allowReload) {
    if (!error || error.code !== 'RELEASE_MISMATCH' || allowReload === false || !root.location) return false;
    try {
      if (root.sessionStorage && root.sessionStorage.getItem(RELOAD_ATTEMPT_KEY) !== '1') {
        root.sessionStorage.setItem(RELOAD_ATTEMPT_KEY, '1');
        root.location.reload();
        return true;
      }
    } catch (_) { /* reload falls through to an explicit error state when storage is unavailable */ }
    return false;
  }

  async function boot(options) {
    const settings = options || {};
    const documentObject = settings.documentObject || root.document;
    if (!documentObject) return null;
    const rootElement = settings.rootElement || documentObject.getElementById('atlas-root');
    if (!rootElement) return null;
    try {
      const manifest = validateRuntimeAuthorization(
        settings.authorization || root.ATLAS_RELEASE_AUTHORIZATION,
        settings.executingScript,
        documentObject
      );
      const loaded = await loadCurrentRecord({ fetchImpl: settings.fetchImpl, modelUrl: settings.modelUrl, manifest });
      return renderCurrent(rootElement, loaded, { documentObject, windowObject: settings.windowObject });
    } catch (error) {
      const bootError = error instanceof AtlasBootError ? error : new AtlasBootError('BOOT_FAILED', 'The current evidence record could not be initialized.', error);
      if (controlledReload(bootError, settings.allowReload)) return null;
      return renderFailure(rootElement, bootError, settings.retry);
    }
  }

  return Object.freeze({
    APPLICATION_VERSION,
    MODEL_URL,
    EXPECTED_CHRONOLOGY_COUNT,
    AtlasBootError,
    canonicalText,
    sha256Text,
    assetForRole,
    validateContentAddressedAsset,
    validateManifest,
    validateRuntimeAuthorization,
    validateModel,
    loadCurrentRecord,
    renderCurrent,
    renderFailure,
    failureDetail,
    boot
  });
}));

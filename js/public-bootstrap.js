(function initAtlasReleaseBootstrap(globalObject, factory) {
  'use strict';
  const api = factory(globalObject);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  globalObject.AtlasReleaseBootstrap = api;
  api.start({ executingScript: globalObject.document && globalObject.document.currentScript });
}(typeof globalThis !== 'undefined' ? globalThis : this, function atlasReleaseBootstrapFactory(root) {
  'use strict';

  const BOOTSTRAP_PROTOCOL = 'atlas-release-bootstrap-v1';
  const APPLICATION_VERSION = 'atlas-public-shell-v1';
  const MANIFEST_URL = './data/public-release.json';
  const ARCHIVE_URL = './snapshots/Iran%20War%20Map%2020260820.html';
  const RELOAD_ATTEMPT_KEY = 'atlas-public-release-reload-attempted-v1';

  class BootstrapError extends Error {
    constructor(code, message, cause) {
      super(message);
      this.name = 'BootstrapError';
      this.code = code;
      if (cause) this.cause = cause;
    }
  }

  function invariant(condition, code, message) {
    if (!condition) throw new BootstrapError(code, message);
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

  function validateManifest(manifest, executingScript) {
    invariant(manifest && typeof manifest === 'object', 'RELEASE_MISMATCH', 'The public release manifest is missing.');
    invariant(manifest.schema_version === '1.0', 'RELEASE_MISMATCH', 'The public release manifest schema is not supported.');
    invariant(manifest.artifact_role === 'PUBLIC_APPLICATION_RELEASE_MANIFEST', 'RELEASE_MISMATCH', 'The public release manifest role is invalid.');
    invariant(/^public-release-v1-[a-f0-9]{16}$/.test(manifest.release_identity || ''), 'RELEASE_MISMATCH', 'The public release identity is invalid.');
    invariant(manifest.application && manifest.application.version === APPLICATION_VERSION, 'RELEASE_MISMATCH', 'The public application version is not supported.');
    invariant(manifest.neutral_bootstrap && manifest.neutral_bootstrap.protocol === BOOTSTRAP_PROTOCOL, 'RELEASE_MISMATCH', 'The release bootstrap protocol is not supported.');
    invariant(executingScript && executingScript.src, 'RELEASE_MISMATCH', 'The executing bootstrap identity is unavailable.');
    const bootstrap = manifest.neutral_bootstrap.asset;
    validateContentAddressedAsset(bootstrap, 'js');
    const scriptUrl = new URL(executingScript.src, root.location && root.location.href);
    invariant(scriptUrl.pathname.endsWith(`/${bootstrap.path}`), 'RELEASE_MISMATCH', 'The executing bootstrap path is not authorized by this release.');
    invariant(executingScript.integrity === bootstrap.integrity, 'RELEASE_MISMATCH', 'The executing bootstrap integrity is not authorized by this release.');
    invariant(executingScript.dataset.bootstrapSha256 === bootstrap.sha256, 'RELEASE_MISMATCH', 'The executing bootstrap hash marker is not authorized by this release.');
    const style = validateContentAddressedAsset(assetForRole(manifest, 'stylesheet'), 'css');
    const entry = validateContentAddressedAsset(assetForRole(manifest, 'entrypoint'), 'js');
    invariant(manifest.application.stylesheet === style.path, 'RELEASE_MISMATCH', 'The authorized stylesheet path is inconsistent.');
    invariant(manifest.application.entrypoint === entry.path, 'RELEASE_MISMATCH', 'The authorized entrypoint path is inconsistent.');
    invariant(manifest.current_state && manifest.current_state.path === 'data/public-current-state.json', 'RELEASE_MISMATCH', 'The current-state path is invalid.');
    return { manifest, bootstrap, style, entry };
  }

  async function fetchManifest(fetchImpl) {
    let response;
    try {
      response = await fetchImpl(MANIFEST_URL, { cache: 'no-store', credentials: 'same-origin' });
    } catch (error) {
      throw new BootstrapError('FETCH_FAILED', 'The public release manifest could not be loaded.', error);
    }
    if (!response || !response.ok) throw new BootstrapError('FETCH_FAILED', `The public release manifest could not be loaded${response ? ` (${response.status})` : ''}.`);
    try {
      return JSON.parse(await response.text());
    } catch (error) {
      throw new BootstrapError('INVALID_JSON', 'The public release manifest is not valid JSON.', error);
    }
  }

  function loadStylesheet(documentObject, asset, releaseIdentity) {
    return new Promise((resolve, reject) => {
      const link = documentObject.createElement('link');
      link.rel = 'stylesheet';
      link.href = `./${asset.path}`;
      link.integrity = asset.integrity;
      link.crossOrigin = 'anonymous';
      link.dataset.atlasAuthorizedStyle = releaseIdentity;
      link.dataset.assetSha256 = asset.sha256;
      link.onload = () => resolve(link);
      link.onerror = () => reject(new BootstrapError('ASSET_INTEGRITY_FAILED', 'The authorized application stylesheet could not be loaded.'));
      documentObject.head.append(link);
    });
  }

  function loadEntrypoint(documentObject, asset, releaseIdentity) {
    return new Promise((resolve, reject) => {
      const script = documentObject.createElement('script');
      script.src = `./${asset.path}`;
      script.integrity = asset.integrity;
      script.crossOrigin = 'anonymous';
      script.dataset.atlasAuthorizedEntrypoint = releaseIdentity;
      script.dataset.assetSha256 = asset.sha256;
      script.onload = () => resolve(script);
      script.onerror = () => reject(new BootstrapError('ASSET_INTEGRITY_FAILED', 'The authorized application entrypoint could not be loaded.'));
      documentObject.head.append(script);
    });
  }

  function authorize(manifest, bootstrap, style, entry) {
    const authorization = Object.freeze({
      releaseIdentity: manifest.release_identity,
      manifest,
      bootstrapPath: bootstrap.path,
      stylesheetPath: style.path,
      entrypointPath: entry.path,
      stylesheetSha256: style.sha256,
      entrypointSha256: entry.sha256
    });
    root.ATLAS_RELEASE_AUTHORIZATION = authorization;
    return authorization;
  }

  function controlledReload(error, allowReload) {
    if (!error || error.code !== 'RELEASE_MISMATCH' || allowReload === false || !root.location) return false;
    try {
      if (root.sessionStorage && root.sessionStorage.getItem(RELOAD_ATTEMPT_KEY) !== '1') {
        root.sessionStorage.setItem(RELOAD_ATTEMPT_KEY, '1');
        root.location.reload();
        return true;
      }
    } catch (_) { /* an explicit error state remains the safe fallback */ }
    return false;
  }

  function renderFailure(documentObject, error, retry) {
    const host = documentObject.getElementById('atlas-root');
    if (!host) return;
    host.replaceChildren();
    host.dataset.status = 'error';
    host.setAttribute('aria-busy', 'false');
    const section = documentObject.createElement('section');
    section.className = 'error-state';
    const kicker = documentObject.createElement('p');
    kicker.className = 'boot-kicker';
    kicker.textContent = 'Current record unavailable';
    const title = documentObject.createElement('h1');
    title.textContent = 'The current evidence record could not be loaded.';
    const detail = documentObject.createElement('p');
    detail.textContent = error && error.code === 'RELEASE_MISMATCH'
      ? 'The application and evidence record did not resolve to one release.'
      : 'The authorized application release is unavailable or did not pass integrity validation.';
    const code = documentObject.createElement('p');
    code.className = 'error-code';
    code.textContent = `Error code: ${error && error.code || 'BOOTSTRAP_FAILED'}`;
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
    section.append(kicker, title, detail, code, actions);
    host.append(section);
    root.ATLAS_PUBLIC_STATE = { status: 'error', code: error && error.code || 'BOOTSTRAP_FAILED' };
    root.ATLAS_BOOTSTRAP_STATE = { status: 'error', code: error && error.code || 'BOOTSTRAP_FAILED' };
  }

  async function start(options) {
    const settings = options || {};
    const documentObject = settings.documentObject || root.document;
    if (!documentObject) return null;
    const executingScript = settings.executingScript || documentObject.currentScript;
    try {
      const manifest = settings.manifest || await fetchManifest(settings.fetchImpl || root.fetch);
      const validated = validateManifest(manifest, executingScript);
      root.ATLAS_BOOTSTRAP_STATE = { status: 'authorizing', releaseIdentity: manifest.release_identity };
      await loadStylesheet(documentObject, validated.style, manifest.release_identity);
      authorize(manifest, validated.bootstrap, validated.style, validated.entry);
      await loadEntrypoint(documentObject, validated.entry, manifest.release_identity);
      root.ATLAS_BOOTSTRAP_STATE = { status: 'authorized', releaseIdentity: manifest.release_identity };
      return root.ATLAS_RELEASE_AUTHORIZATION;
    } catch (error) {
      const bootstrapError = error instanceof BootstrapError ? error : new BootstrapError('BOOTSTRAP_FAILED', 'The public release could not be authorized.', error);
      if (controlledReload(bootstrapError, settings.allowReload)) return null;
      renderFailure(documentObject, bootstrapError, settings.retry);
      return null;
    }
  }

  return Object.freeze({
    BOOTSTRAP_PROTOCOL,
    APPLICATION_VERSION,
    MANIFEST_URL,
    BootstrapError,
    assetForRole,
    validateContentAddressedAsset,
    validateManifest,
    fetchManifest,
    authorize,
    controlledReload,
    renderFailure,
    start
  });
}));

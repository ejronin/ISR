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

  function validateBinaryImage(asset) {
    invariant(asset && asset.role === 'evidence_image', 'RELEASE_MISMATCH', 'An evidence-image release asset is invalid.');
    const match = String(asset.path || '').match(/^assets\/releases\/(.+)\.([a-f0-9]{64})\.(png|jpg|webp)$/);
    invariant(match && match[1] === asset.name && match[2] === asset.sha256, 'RELEASE_MISMATCH', 'An evidence-image release path is not content-addressed.');
    invariant(asset.integrity && /^sha256-[A-Za-z0-9+/]{43}=$/.test(asset.integrity), 'RELEASE_MISMATCH', 'An evidence-image integrity value is invalid.');
    invariant(asset.hash_basis === 'BINARY_BYTES', 'RELEASE_MISMATCH', 'An evidence-image hash basis is invalid.');
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
    const mapRuntime = validateContentAddressedAsset(assetForRole(manifest, 'map_runtime'), 'js');
    const pageRegistry = validateContentAddressedAsset(assetForRole(manifest, 'page_registry'), 'js');
    const mapStyle = validateContentAddressedAsset(assetForRole(manifest, 'map_stylesheet'), 'css');
    const style = validateContentAddressedAsset(assetForRole(manifest, 'stylesheet'), 'css');
    const geography = validateContentAddressedAsset(assetForRole(manifest, 'reference_geography'), 'geojson');
    const entry = validateContentAddressedAsset(assetForRole(manifest, 'entrypoint'), 'js');
    const evidenceImages = (manifest.application.assets || []).filter(asset => asset.role === 'evidence_image').map(validateBinaryImage);
    const runtimes = [mapRuntime, pageRegistry];
    const styles = [mapStyle, style];
    invariant(Array.isArray(manifest.application.runtime) && manifest.application.runtime.length === 2 && runtimes.every((asset, index) => manifest.application.runtime[index] === asset.path), 'RELEASE_MISMATCH', 'The authorized runtime paths are inconsistent.');
    invariant(Array.isArray(manifest.application.stylesheets) && manifest.application.stylesheets.length === 2 && styles.every((asset, index) => manifest.application.stylesheets[index] === asset.path), 'RELEASE_MISMATCH', 'The authorized stylesheet paths are inconsistent.');
    invariant(manifest.application.stylesheet === style.path, 'RELEASE_MISMATCH', 'The authorized stylesheet path is inconsistent.');
    invariant(manifest.application.reference_geography === geography.path, 'RELEASE_MISMATCH', 'The authorized reference-geography path is inconsistent.');
    invariant(Array.isArray(manifest.application.evidence_images) && manifest.application.evidence_images.length === evidenceImages.length && evidenceImages.every((asset, index) => manifest.application.evidence_images[index] === asset.path), 'RELEASE_MISMATCH', 'The authorized evidence-image inventory is inconsistent.');
    invariant(manifest.application.entrypoint === entry.path, 'RELEASE_MISMATCH', 'The authorized entrypoint path is inconsistent.');
    invariant(manifest.current_state && manifest.current_state.path === 'data/public-current-state.json', 'RELEASE_MISMATCH', 'The current-state path is invalid.');
    return { manifest, bootstrap, runtimes, styles, geography, evidenceImages, entry };
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

  function loadRuntime(documentObject, asset, releaseIdentity) {
    return new Promise((resolve, reject) => {
      const script = documentObject.createElement('script');
      script.src = `./${asset.path}`;
      script.integrity = asset.integrity;
      script.crossOrigin = 'anonymous';
      script.dataset.atlasAuthorizedRuntime = releaseIdentity;
      script.dataset.assetSha256 = asset.sha256;
      script.onload = () => resolve(script);
      script.onerror = () => reject(new BootstrapError('ASSET_INTEGRITY_FAILED', 'The authorized public page registry could not be loaded.'));
      documentObject.head.append(script);
    });
  }

  async function sha256Bytes(value) {
    invariant(root.crypto && root.crypto.subtle, 'ASSET_INTEGRITY_FAILED', 'The browser cannot verify authorized media.');
    const digest = await root.crypto.subtle.digest('SHA-256', value);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function sha256Text(text) {
    invariant(root.TextEncoder, 'ASSET_INTEGRITY_FAILED', 'The browser cannot encode the reference geography.');
    return sha256Bytes(new root.TextEncoder().encode(text));
  }

  async function loadReferenceGeography(asset, fetchImpl) {
    let response;
    try {
      response = await fetchImpl(`./${asset.path}`, { cache: 'no-store', credentials: 'same-origin' });
    } catch (error) {
      throw new BootstrapError('FETCH_FAILED', 'The authorized reference geography could not be loaded.', error);
    }
    if (!response || !response.ok) throw new BootstrapError('FETCH_FAILED', `The authorized reference geography could not be loaded${response ? ` (${response.status})` : ''}.`);
    const text = (await response.text()).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    invariant(await sha256Text(text) === asset.sha256, 'ASSET_INTEGRITY_FAILED', 'The authorized reference geography failed integrity validation.');
    let geography;
    try { geography = JSON.parse(text); } catch (error) { throw new BootstrapError('INVALID_JSON', 'The authorized reference geography is not valid JSON.', error); }
    invariant(geography && geography.type === 'FeatureCollection' && geography.artifact_role === 'PRESENTATION_REFERENCE_GEOGRAPHY', 'RELEASE_MISMATCH', 'The authorized reference geography has an invalid role.');
    root.ATLAS_REFERENCE_GEOGRAPHY = Object.freeze(geography);
    return geography;
  }

  async function loadEvidenceImages(assets, fetchImpl) {
    const media = {};
    for (const asset of assets) {
      let response;
      try { response = await fetchImpl(`./${asset.path}`, { cache: 'no-store', credentials: 'same-origin' }); }
      catch (error) { throw new BootstrapError('FETCH_FAILED', 'An authorized evidence image could not be loaded.', error); }
      if (!response || !response.ok) throw new BootstrapError('FETCH_FAILED', `An authorized evidence image could not be loaded${response ? ` (${response.status})` : ''}.`);
      const bytes = await response.arrayBuffer();
      invariant(await sha256Bytes(bytes) === asset.sha256, 'ASSET_INTEGRITY_FAILED', 'An authorized evidence image failed integrity validation.');
      const extension = asset.path.split('.').pop().toLowerCase();
      const mime = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
      const url = root.URL.createObjectURL(new root.Blob([bytes], { type: mime }));
      media[asset.source_path] = url;
      media[asset.path] = url;
      media[`./${asset.path}`] = url;
    }
    root.ATLAS_AUTHORIZED_MEDIA = Object.freeze(media);
    return media;
  }

  function authorize(manifest, bootstrap, runtimes, styles, geography, evidenceImages, entry) {
    const authorization = Object.freeze({
      releaseIdentity: manifest.release_identity,
      manifest,
      bootstrapPath: bootstrap.path,
      stylesheetPath: styles[styles.length - 1].path,
      entrypointPath: entry.path,
      runtimeAssets: Object.freeze(runtimes.map(asset => Object.freeze({ path: asset.path, sha256: asset.sha256 }))),
      stylesheetAssets: Object.freeze(styles.map(asset => Object.freeze({ path: asset.path, sha256: asset.sha256 }))),
      stylesheetSha256: styles[styles.length - 1].sha256,
      referenceGeography: Object.freeze({ path: geography.path, sha256: geography.sha256 }),
      evidenceImages: Object.freeze(evidenceImages.map(asset => Object.freeze({ path: asset.path, sourcePath: asset.source_path, sha256: asset.sha256 }))),
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
    actions.append(retryButton);
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
      for (const style of validated.styles) await loadStylesheet(documentObject, style, manifest.release_identity);
      authorize(manifest, validated.bootstrap, validated.runtimes, validated.styles, validated.geography, validated.evidenceImages, validated.entry);
      for (const runtime of validated.runtimes) await loadRuntime(documentObject, runtime, manifest.release_identity);
      await loadReferenceGeography(validated.geography, settings.fetchImpl || root.fetch);
      await loadEvidenceImages(validated.evidenceImages, settings.fetchImpl || root.fetch);
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
    loadRuntime,
    loadReferenceGeography,
    loadEvidenceImages,
    controlledReload,
    renderFailure,
    start
  });
}));

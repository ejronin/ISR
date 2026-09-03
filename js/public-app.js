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

  function freezeContract(modelPage, datasets) {
    const shared = ['current.sources', 'current.actors', 'current.locations'];
    return Object.freeze({ modelPage, datasets: Object.freeze(Array.from(new Set([...shared, ...datasets]))) });
  }

  /*
   * Route/data authorization.
   *
   * This is deliberately independent of the network/loading architecture. It
   * declares what each accepted page owner may consume from the already-loaded
   * public read model. Shared source, actor, and location authority is emitted
   * into every generated page-data mapping by the public read-model builder.
   */
  const ROUTE_DATA_DEPENDENCIES = Object.freeze({
    'start.overview': freezeContract('start_here', ['current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view']),
    'start.actors': freezeContract('start_here', ['current.chronology']),
    'timeline.war': freezeContract('timeline', ['current.chronology', 'ledger.daily_coverage']),
    'timeline.chronology': freezeContract('timeline', ['current.chronology', 'ledger.map_links']),
    'military.campaigns': freezeContract('military_record', ['current.chronology', 'ledger.map_links', 'reconciliation.strikes']),
    'military.facilities': freezeContract('military_record', ['ledger.facilities', 'ledger.map_links']),
    'military.weapons': freezeContract('military_record', ['ledger.munitions_expenditure', 'ledger.attrition_series', 'current.material_losses']),
    'military.losses': freezeContract('military_record', ['ledger.casualties', 'current.material_losses', 'forensic.loss_envelopes', 'analysis.casualty_corrections']),
    'military.imagery': freezeContract('military_record', ['current.chronology', 'ledger.bda_overlays', 'ledger.facilities', 'forensic.facility_claim_audits']),
    'hormuz.overview': freezeContract('hormuz_economy', ['analysis.hormuz', 'ledger.agreements', 'ledger.shipping']),
    'hormuz.shipping': freezeContract('hormuz_economy', ['ledger.shipping', 'analysis.oil_routes', 'analysis.hormuz']),
    'hormuz.economy': freezeContract('hormuz_economy', ['ledger.economics', 'analysis.china_oil_shift', 'analysis.oil_routes']),
    'hormuz.talks': freezeContract('hormuz_economy', ['current.chronology', 'ledger.agreements', 'analysis.hormuz']),
    'talks.overview': freezeContract('diplomacy_mou', ['ledger.agreements', 'ledger.diplomacy']),
    'talks.mou': freezeContract('diplomacy_mou', ['ledger.agreements', 'analysis.hormuz', 'analysis.endgame_public_view', 'analysis.endgame_current_aug25', 'analysis.endgame_current_aug26']),
    'talks.nuclear': freezeContract('diplomacy_mou', ['ledger.agreements', 'ledger.diplomacy', 'analysis.iran_messaging', 'analysis.endgame_public_view']),
    'talks.regional': freezeContract('diplomacy_mou', ['ledger.agreements', 'ledger.diplomacy']),
    'objectives.outcomes': freezeContract('objectives_position_changes', ['analysis.iran_outcomes', 'analysis.endgame_us_objectives', 'analysis.endgame_objective_corrections', 'analysis.outcome_evidence_links']),
    'objectives.positions': freezeContract('objectives_position_changes', ['current.chronology', 'analysis.endgame_public_view', 'analysis.outcome_evidence_links', 'analysis.endgame_us_objectives', 'analysis.iran_messaging']),
    'objectives.iran': freezeContract('objectives_position_changes', ['analysis.iran_messaging']),
    'evidence.claims': freezeContract('claims_sources', ['current.claims', 'forensic.public_assessments']),
    'evidence.information': freezeContract('claims_sources', ['analysis.information_war_claims', 'analysis.influence_networks', 'forensic.claim_evolution']),
    'evidence.sources': freezeContract('claims_sources', ['analysis.source_context', 'analysis.media_bias_provider']),
    'evidence.method': freezeContract('claims_sources', ['ledger.source_role_map', 'ledger.revision_history', 'reconciliation.coverage_audit']),
    'evidence.archive': freezeContract('claims_sources', ['archive.snapshot_index'])
  });

  const ROUTE_HASH_TO_KEY = Object.freeze({
    '#/start': 'start.overview',
    '#/start/actors': 'start.actors',
    '#/timeline': 'timeline.war',
    '#/timeline/chronology': 'timeline.chronology',
    '#/military': 'military.campaigns',
    '#/military/facilities': 'military.facilities',
    '#/military/weapons': 'military.weapons',
    '#/military/losses': 'military.losses',
    '#/military/imagery': 'military.imagery',
    '#/hormuz': 'hormuz.overview',
    '#/hormuz/shipping': 'hormuz.shipping',
    '#/hormuz/economy': 'hormuz.economy',
    '#/hormuz/talks': 'hormuz.talks',
    '#/talks': 'talks.overview',
    '#/talks/mou': 'talks.mou',
    '#/talks/nuclear': 'talks.nuclear',
    '#/talks/regional': 'talks.regional',
    '#/objectives': 'objectives.outcomes',
    '#/objectives/positions': 'objectives.positions',
    '#/objectives/iran': 'objectives.iran',
    '#/evidence': 'evidence.claims',
    '#/evidence/information': 'evidence.information',
    '#/evidence/sources': 'evidence.sources',
    '#/evidence/method': 'evidence.method',
    '#/evidence/archive': 'evidence.archive'
  });

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

  function validateBinaryImage(asset) {
    invariant(asset && asset.role === 'evidence_image', 'RELEASE_MISMATCH', 'An evidence-image release asset is invalid.');
    const match = String(asset.path || '').match(/^assets\/releases\/(.+)\.([a-f0-9]{64})\.(png|jpg|webp)$/);
    invariant(match && match[1] === asset.name && match[2] === asset.sha256, 'RELEASE_MISMATCH', 'An evidence-image release path is not content-addressed.');
    invariant(asset.hash_basis === 'BINARY_BYTES', 'RELEASE_MISMATCH', 'An evidence-image hash basis is invalid.');
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
    invariant(Array.isArray(manifest.application.assets) && manifest.application.assets.length >= 6, 'RELEASE_MISMATCH', 'The application asset inventory is incomplete.');
    const assetPaths = manifest.application.assets.map(asset => asset.path);
    invariant(new Set(assetPaths).size === assetPaths.length, 'RELEASE_MISMATCH', 'The application asset inventory contains duplicate paths.');
    const mapRuntime = validateContentAddressedAsset(assetForRole(manifest, 'map_runtime'), 'js');
    const runtime = validateContentAddressedAsset(assetForRole(manifest, 'page_registry'), 'js');
    const mapStylesheet = validateContentAddressedAsset(assetForRole(manifest, 'map_stylesheet'), 'css');
    const stylesheet = validateContentAddressedAsset(assetForRole(manifest, 'stylesheet'), 'css');
    const geography = validateContentAddressedAsset(assetForRole(manifest, 'reference_geography'), 'geojson');
    const entrypoint = validateContentAddressedAsset(assetForRole(manifest, 'entrypoint'), 'js');
    const evidenceImages = manifest.application.assets.filter(asset => asset.role === 'evidence_image').map(validateBinaryImage);
    const fixedRoles = ['map_runtime', 'page_registry', 'map_stylesheet', 'stylesheet', 'reference_geography', 'entrypoint'];
    invariant(fixedRoles.every(role => manifest.application.assets.filter(asset => asset.role === role).length === 1), 'RELEASE_MISMATCH', 'A required application asset role is missing or duplicated.');
    invariant(manifest.application.assets.every(asset => fixedRoles.includes(asset.role) || asset.role === 'evidence_image'), 'RELEASE_MISMATCH', 'The application asset inventory contains an unsupported role.');
    invariant(Array.isArray(manifest.application.runtime) && manifest.application.runtime.length === 2 && manifest.application.runtime[0] === mapRuntime.path && manifest.application.runtime[1] === runtime.path, 'RELEASE_MISMATCH', 'The application runtime paths are inconsistent.');
    invariant(Array.isArray(manifest.application.stylesheets) && manifest.application.stylesheets.length === 2 && manifest.application.stylesheets[0] === mapStylesheet.path && manifest.application.stylesheets[1] === stylesheet.path, 'RELEASE_MISMATCH', 'The application stylesheet paths are inconsistent.');
    invariant(manifest.application.stylesheet === stylesheet.path, 'RELEASE_MISMATCH', 'The application stylesheet path is inconsistent.');
    invariant(manifest.application.reference_geography === geography.path, 'RELEASE_MISMATCH', 'The application reference-geography path is inconsistent.');
    invariant(Array.isArray(manifest.application.evidence_images) && evidenceImages.every((asset, index) => manifest.application.evidence_images[index] === asset.path) && evidenceImages.length === manifest.application.evidence_images.length, 'RELEASE_MISMATCH', 'The application evidence-image inventory is inconsistent.');
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
    const runtimes = [assetForRole(manifest, 'map_runtime'), assetForRole(manifest, 'page_registry')];
    const entrypoint = assetForRole(manifest, 'entrypoint');
    const stylesheets = [assetForRole(manifest, 'map_stylesheet'), assetForRole(manifest, 'stylesheet')];
    const stylesheet = stylesheets[1];
    const geography = assetForRole(manifest, 'reference_geography');
    const evidenceImages = manifest.application.assets.filter(asset => asset.role === 'evidence_image');
    invariant(authorization.entrypointPath === entrypoint.path && authorization.entrypointSha256 === entrypoint.sha256, 'RELEASE_MISMATCH', 'The entrypoint authorization is inconsistent.');
    invariant(authorization.stylesheetPath === stylesheet.path && authorization.stylesheetSha256 === stylesheet.sha256, 'RELEASE_MISMATCH', 'The stylesheet authorization is inconsistent.');
    invariant(Array.isArray(authorization.runtimeAssets) && authorization.runtimeAssets.length === 2, 'RELEASE_MISMATCH', 'The runtime authorization is incomplete.');
    runtimes.forEach((runtime, index) => invariant(authorization.runtimeAssets[index].path === runtime.path && authorization.runtimeAssets[index].sha256 === runtime.sha256, 'RELEASE_MISMATCH', 'The runtime authorization is inconsistent.'));
    invariant(Array.isArray(authorization.stylesheetAssets) && authorization.stylesheetAssets.length === 2, 'RELEASE_MISMATCH', 'The stylesheet authorization is incomplete.');
    stylesheets.forEach((style, index) => invariant(authorization.stylesheetAssets[index].path === style.path && authorization.stylesheetAssets[index].sha256 === style.sha256, 'RELEASE_MISMATCH', 'The stylesheet authorization is inconsistent.'));
    invariant(authorization.referenceGeography && authorization.referenceGeography.path === geography.path && authorization.referenceGeography.sha256 === geography.sha256, 'RELEASE_MISMATCH', 'The reference-geography authorization is inconsistent.');
    invariant(Array.isArray(authorization.evidenceImages) && authorization.evidenceImages.length === evidenceImages.length, 'RELEASE_MISMATCH', 'The evidence-image authorization is inconsistent.');
    evidenceImages.forEach((asset, index) => invariant(authorization.evidenceImages[index].path === asset.path && authorization.evidenceImages[index].sourcePath === asset.source_path && authorization.evidenceImages[index].sha256 === asset.sha256, 'RELEASE_MISMATCH', 'An evidence-image authorization is inconsistent.'));
    invariant(executingScript && executingScript.src, 'RELEASE_MISMATCH', 'The executing application identity is unavailable.');
    invariant(pathMatches(executingScript.src, entrypoint.path), 'RELEASE_MISMATCH', 'The executing application path is not authorized by this release.');
    invariant(executingScript.integrity === entrypoint.integrity, 'RELEASE_MISMATCH', 'The executing application integrity is not authorized by this release.');
    invariant(executingScript.dataset.atlasAuthorizedEntrypoint === manifest.release_identity, 'RELEASE_MISMATCH', 'The executing application release marker is invalid.');
    invariant(executingScript.dataset.assetSha256 === entrypoint.sha256, 'RELEASE_MISMATCH', 'The executing application hash marker is invalid.');
    const runtimeScripts = Array.from(documentObject.querySelectorAll('script[data-atlas-authorized-runtime]'));
    runtimes.forEach(runtime => {
      const activeRuntime = runtimeScripts.find(script => script.dataset.atlasAuthorizedRuntime === manifest.release_identity && pathMatches(script.src, runtime.path));
      invariant(activeRuntime && activeRuntime.src, 'RELEASE_MISMATCH', 'An authorized runtime is not active.');
      invariant(activeRuntime.integrity === runtime.integrity && activeRuntime.dataset.assetSha256 === runtime.sha256, 'RELEASE_MISMATCH', 'An active runtime integrity value is not authorized by this release.');
    });
    const styleLinks = Array.from(documentObject.querySelectorAll('link[data-atlas-authorized-style]'));
    stylesheets.forEach(style => {
      const activeStyle = styleLinks.find(link => link.dataset.atlasAuthorizedStyle === manifest.release_identity && pathMatches(link.href, style.path));
      invariant(activeStyle && activeStyle.href, 'RELEASE_MISMATCH', 'An authorized stylesheet is not active.');
      invariant(activeStyle.integrity === style.integrity, 'RELEASE_MISMATCH', 'An active stylesheet integrity value is not authorized by this release.');
      invariant(activeStyle.dataset.assetSha256 === style.sha256, 'RELEASE_MISMATCH', 'An active stylesheet hash marker is invalid.');
    });
    return manifest;
  }

  function datasetExists(model, key) {
    if (key === 'current.chronology') return Array.isArray(model.chronology);
    if (key === 'current.sources') return Boolean(model.sources && Array.isArray(model.sources.records));
    if (key === 'current.actors') return Boolean(model.entities && Array.isArray(model.entities.actors));
    if (key === 'current.locations') return Boolean(model.entities && Array.isArray(model.entities.locations));
    return Boolean(model.datasets && Object.prototype.hasOwnProperty.call(model.datasets, key));
  }

  function datasetRole(model, key) {
    if (['current.chronology', 'current.sources', 'current.actors', 'current.locations'].includes(key)) return 'DERIVED_CANONICAL_CURRENT_ENTITY_STATE';
    return model.datasets && model.datasets[key] ? model.datasets[key].role : null;
  }

  function validatePageDataMappings(model) {
    invariant(model.page_data && typeof model.page_data === 'object', 'MODEL_INVALID', 'Public page-data mappings are missing.');
    for (const [page, mapping] of Object.entries(model.page_data)) {
      const keys = mapping && mapping.dataset_keys;
      invariant(Array.isArray(keys), 'MODEL_INVALID', `Page ${page} has no dataset declaration.`);
      invariant(new Set(keys).size === keys.length, 'MODEL_INVALID', `Page ${page} contains duplicate dataset declarations.`);
      for (const key of keys) {
        invariant(typeof key === 'string' && key.length > 0, 'MODEL_INVALID', `Page ${page} contains an invalid dataset declaration.`);
        invariant(!key.startsWith('legacy.'), 'MODEL_INVALID', `Page ${page} maps legacy reference data.`);
        invariant(datasetExists(model, key), 'MODEL_INVALID', `Page ${page} declares missing dataset ${key}.`);
        invariant(datasetRole(model, key) !== 'HISTORICAL_REFERENCE_DATA', 'MODEL_INVALID', `Page ${page} maps historical-reference dataset ${key}.`);
      }
    }
    return true;
  }

  function validateRouteDependencies(model, contracts) {
    const activeContracts = contracts || ROUTE_DATA_DEPENDENCIES;
    const entries = Object.entries(activeContracts);
    invariant(entries.length === 25, 'MODEL_INVALID', `Expected 25 public route dependency contracts; found ${entries.length}.`);
    for (const [routeKey, contract] of entries) {
      invariant(contract && typeof contract.modelPage === 'string', 'MODEL_INVALID', `Route ${routeKey} has no page-data owner.`);
      invariant(Array.isArray(contract.datasets), 'MODEL_INVALID', `Route ${routeKey} has no dataset contract.`);
      invariant(new Set(contract.datasets).size === contract.datasets.length, 'MODEL_INVALID', `Route ${routeKey} contains duplicate dataset declarations.`);
      const pageMapping = model.page_data && model.page_data[contract.modelPage];
      invariant(pageMapping && Array.isArray(pageMapping.dataset_keys), 'MODEL_INVALID', `Route ${routeKey} maps missing page-data owner ${contract.modelPage}.`);
      for (const key of contract.datasets) {
        invariant(pageMapping.dataset_keys.includes(key), 'MODEL_INVALID', `Route ${routeKey} declares ${key} outside generated page-data owner ${contract.modelPage}.`);
        invariant(!key.startsWith('legacy.'), 'MODEL_INVALID', `Route ${routeKey} declares legacy dataset ${key}.`);
        invariant(datasetExists(model, key), 'MODEL_INVALID', `Route ${routeKey} declares missing dataset ${key}.`);
        invariant(datasetRole(model, key) !== 'HISTORICAL_REFERENCE_DATA', 'MODEL_INVALID', `Route ${routeKey} declares historical-reference dataset ${key}.`);
      }
    }
    return true;
  }

  function validateModel(model, manifest) {
    invariant(model && typeof model === 'object', 'MODEL_INVALID', 'The current evidence record is missing.');
    invariant(model.schema_version === EXPECTED_MODEL_SCHEMA, 'MODEL_INVALID', 'The current evidence schema is not supported.');
    invariant(model.artifact_role === 'DERIVED_PUBLIC_CURRENT_STATE_READ_MODEL', 'MODEL_INVALID', 'The loaded artifact is not the public current-state read model.');
    invariant(model.release && model.release.release_identity === manifest.current_state.release_identity, 'RELEASE_MISMATCH', 'The application and current-state release identities do not match.');
    invariant(model.release.input_set_sha256 === manifest.current_state.input_set_sha256, 'RELEASE_MISMATCH', 'The current-state input identity does not match the public release.');
    invariant(model.release.current_osint_cutoff === manifest.current_state.current_osint_cutoff, 'RELEASE_MISMATCH', 'The current-state cutoff does not match the public release.');
    invariant(model.counts && Number.isInteger(model.counts.chronology_records) && model.counts.chronology_records > 0, 'MODEL_INVALID', 'The derived chronology count is invalid.');
    invariant(Array.isArray(model.chronology) && model.chronology.length === model.counts.chronology_records, 'MODEL_INVALID', 'The chronology length does not match its declared count.');
    const ids = model.chronology.map(item => item && item.event_id);
    invariant(ids.every(Boolean) && new Set(ids).size === ids.length, 'MODEL_INVALID', 'The chronology contains a missing or duplicate event ID.');
    const sourceRecords = model.sources && Array.isArray(model.sources.records) ? model.sources.records : [];
    const sourceIds = new Set(sourceRecords.map(source => source.source_id));
    invariant(sourceIds.size === sourceRecords.length, 'MODEL_INVALID', 'The source catalog contains duplicate IDs.');
    for (const item of model.chronology) {
      invariant(Array.isArray(item.provenance) && item.provenance.length > 0, 'MODEL_INVALID', `Chronology provenance is incomplete for ${item.event_id}.`);
      invariant(Array.isArray(item.source_references), 'MODEL_INVALID', `Source provenance is incomplete for ${item.event_id}.`);
      for (const reference of item.source_references) {
        invariant(sourceIds.has(reference.source_id) && reference.variant_key, 'MODEL_INVALID', `A source reference does not resolve for ${item.event_id}.`);
      }
    }
    invariant(model.integrity && model.integrity.duplicate_event_ids === 0, 'MODEL_INVALID', 'The current-state integrity block reports duplicate events.');
    invariant(Array.isArray(model.integrity.unresolved_chronology_source_ids) && model.integrity.unresolved_chronology_source_ids.length === 0, 'MODEL_INVALID', 'The current-state integrity block reports unresolved chronology sources.');
    validatePageDataMappings(model);
    validateRouteDependencies(model);
    return model;
  }

  const ENTITY_DATASET_BY_PROPERTY = Object.freeze({
    actors: 'current.actors',
    locations: 'current.locations',
    claims: 'current.claims',
    material_losses: 'current.material_losses',
    relationships: 'current.relationships'
  });

  function createRouteModelView(model, routeKey, contracts) {
    const contract = (contracts || ROUTE_DATA_DEPENDENCIES)[routeKey];
    invariant(contract, 'UNDECLARED_DATA_DEPENDENCY', `No data contract exists for route ${routeKey}.`);
    const allowed = new Set(contract.datasets);
    const requireDependency = key => {
      invariant(allowed.has(key), 'UNDECLARED_DATA_DEPENDENCY', `Route ${routeKey} attempted undeclared dataset access: ${key}.`);
    };
    const datasets = new Proxy(model.datasets || {}, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') requireDependency(prop);
        return Reflect.get(target, prop, receiver);
      },
      has(target, prop) {
        if (typeof prop === 'string') requireDependency(prop);
        return Reflect.has(target, prop);
      },
      ownKeys(target) {
        return Reflect.ownKeys(target).filter(key => typeof key !== 'string' || allowed.has(key));
      },
      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'string' && !allowed.has(prop)) return undefined;
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }
    });
    const sources = new Proxy(model.sources || {}, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') requireDependency('current.sources');
        return Reflect.get(target, prop, receiver);
      }
    });
    const entities = new Proxy(model.entities || {}, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') {
          const key = ENTITY_DATASET_BY_PROPERTY[prop];
          invariant(key, 'UNDECLARED_DATA_DEPENDENCY', `Route ${routeKey} attempted undeclared entity access: ${prop}.`);
          requireDependency(key);
        }
        return Reflect.get(target, prop, receiver);
      },
      ownKeys(target) {
        return Reflect.ownKeys(target).filter(prop => typeof prop !== 'string' || allowed.has(ENTITY_DATASET_BY_PROPERTY[prop]));
      },
      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'string' && !allowed.has(ENTITY_DATASET_BY_PROPERTY[prop])) return undefined;
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }
    });
    const metadata = new Set(['schema_version', 'artifact_role', 'release', 'counts', 'integrity', 'input_packages']);
    return new Proxy(Object.create(null), {
      get(_target, prop) {
        if (prop === 'chronology') {
          requireDependency('current.chronology');
          return model.chronology;
        }
        if (prop === 'sources') {
          requireDependency('current.sources');
          return sources;
        }
        if (prop === 'entities') return entities;
        if (prop === 'datasets') return datasets;
        if (typeof prop === 'string' && metadata.has(prop)) return model[prop];
        if (typeof prop === 'symbol') return undefined;
        throw new AtlasBootError('UNDECLARED_DATA_DEPENDENCY', `Route ${routeKey} attempted undeclared model access: ${String(prop)}.`);
      },
      ownKeys() { return [...metadata, 'chronology', 'sources', 'entities', 'datasets']; },
      getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; }
    });
  }

  function createLocationResolver(model) {
    const records = model && model.entities && Array.isArray(model.entities.locations) ? model.entities.locations : [];
    const byId = new Map();
    for (const item of records) {
      const record = item && item.record ? item.record : item;
      if (record && record.location_id) byId.set(record.location_id, record);
    }
    function coordinate(value) {
      if (value === null || value === undefined || value === '') return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }
    function resolve(value) {
      const record = typeof value === 'string' ? byId.get(value) : value && value.record ? value.record : value;
      if (!record || typeof record !== 'object') return null;
      return Object.freeze({
        locationId: record.location_id || (typeof value === 'string' ? value : null),
        label: firstString(record.canonical_name, record.name, record.label, record.location_id),
        latitude: coordinate(record.latitude === undefined ? record.lat : record.latitude),
        longitude: coordinate(record.longitude === undefined ? record.lon : record.longitude),
        precision: firstString(record.coordinate_precision, record.precision)
      });
    }
    return Object.freeze({ size: byId.size, resolve });
  }

  function createRouteRuntime(model, options) {
    const settings = options || {};
    const contracts = settings.contracts || ROUTE_DATA_DEPENDENCIES;
    const ia = settings.ia;
    invariant(ia && ia.ActorIdentity && typeof ia.ActorIdentity.createResolver === 'function', 'RENDERER_UNAVAILABLE', 'The actor-identity authority is unavailable.');
    validatePageDataMappings(model);
    validateRouteDependencies(model, contracts);
    let services = null;
    let sourceIndexBuilds = 0;
    const views = new Map();
    function forRoute(routeValue) {
      const routeKey = typeof routeValue === 'string' ? routeValue : routeValue && routeValue.key;
      invariant(routeKey && contracts[routeKey], 'UNDECLARED_DATA_DEPENDENCY', `No data contract exists for route ${routeKey || 'unknown'}.`);
      if (!views.has(routeKey)) views.set(routeKey, createRouteModelView(model, routeKey, contracts));
      const routeModel = views.get(routeKey);
      if (!services) {
        const sourceResolver = createSourceResolver(routeModel);
        sourceIndexBuilds += 1;
        services = Object.freeze({
          sourceResolver,
          actorIdentity: ia.ActorIdentity.createResolver(routeModel),
          locationResolver: createLocationResolver(routeModel)
        });
      }
      return Object.freeze({ model: routeModel, services });
    }
    return Object.freeze({
      forRoute,
      diagnostics() {
        return Object.freeze({ sourceIndexBuilds, routeViewCount: views.size, sourceCount: services ? services.sourceResolver.size : 0 });
      }
    });
  }

  function firstString() {
    for (const value of arguments) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  }

  function safeHttpUrl(value) {
    if (!value || typeof value !== 'string') return null;
    if (!/^https?:\/\//i.test(value.trim())) return null;
    try {
      const parsed = new URL(value.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch (_) {
      return null;
    }
  }

  function sourceRecordView(record) {
    const value = record && typeof record === 'object' ? record : {};
    return Object.freeze({
      title: firstString(value.title, value.headline, value.article_title, value.name),
      publisher: firstString(value.publisher, value.outlet, value.source, value.organization, value.publication),
      url: safeHttpUrl(firstString(value.url, value.link, value.source_url, value.uri)),
      publicationDate: firstString(value.publication_date, value.published_at, value.published, value.date, value.source_date),
      context: firstString(value.context, value.source_context, value.notes, value.note, value.evidence_context),
      role: firstString(value.source_role, value.role, value.evidence_role, value.type),
      supports: firstString(value.supports, value.proof_note, value.evidence_note),
      raw: value
    });
  }

  function provenanceLabel(variant) {
    if (!variant || typeof variant !== 'object') return null;
    const provenance = variant.provenance;
    if (typeof provenance === 'string') return provenance;
    return firstString(
      variant.package_label,
      variant.provenance_label,
      variant.package,
      variant.input_package,
      provenance && provenance.package_label,
      provenance && provenance.package,
      provenance && provenance.input_package,
      provenance && provenance.path,
      provenance && provenance.source
    );
  }

  function createSourceResolver(model) {
    const records = model && model.sources && Array.isArray(model.sources.records) ? model.sources.records : [];
    const byId = new Map();
    const variantBySource = new Map();
    for (const source of records) {
      byId.set(source.source_id, source);
      const variants = new Map();
      for (const variant of source.variants || []) variants.set(variant.variant_key, variant);
      variantBySource.set(source.source_id, variants);
    }

    function variantView(source, variant) {
      const record = variant && variant.record ? variant.record : {};
      return Object.freeze({
        sourceId: source.source_id,
        variantKey: variant && variant.variant_key ? variant.variant_key : null,
        packageLabel: provenanceLabel(variant),
        record: sourceRecordView(record),
        rawVariant: variant || null
      });
    }

    function isConflict(source) {
      return Boolean(source && source.resolution === 'PROVENANCE_SCOPED_VARIANTS_REQUIRED');
    }

    function neutralIdentity(source) {
      const registry = source && source.registry || {};
      const profile = source && source.outlet_profile || {};
      return Object.freeze({
        title: firstString(registry.title),
        publisher: firstString(profile.display_name),
        url: safeHttpUrl(firstString(registry.url)),
        publicationDate: firstString(registry.publication_date),
        role: Array.isArray(registry.source_roles) ? registry.source_roles.join('; ') : null,
        context: firstString(registry.lineage, profile.ownership_note),
        supports: null,
        raw: Object.freeze({})
      });
    }

    function resolve(sourceId, variantKey) {
      const source = byId.get(sourceId);
      if (!source) return Object.freeze({ status: 'missing-source', sourceId, variantKey: variantKey || null, variants: Object.freeze([]) });
      const variants = source.variants || [];
      if (variantKey) {
        const variant = (variantBySource.get(sourceId) || new Map()).get(variantKey);
        if (!variant) return Object.freeze({ status: 'missing-variant', sourceId, variantKey, resolution: source.resolution, conflict: isConflict(source), identity: neutralIdentity(source), variants: Object.freeze(variants.map(item => variantView(source, item))) });
        return Object.freeze({ status: 'resolved', sourceId, variantKey, resolution: source.resolution, conflict: isConflict(source), identity: neutralIdentity(source), selected: variantView(source, variant), variants: Object.freeze(variants.map(item => variantView(source, item))) });
      }
      if (isConflict(source)) {
        return Object.freeze({ status: 'variant-required', sourceId, variantKey: null, resolution: source.resolution, conflict: true, identity: neutralIdentity(source), variants: Object.freeze(variants.map(item => variantView(source, item))) });
      }
      const selectedVariant = variants.length === 1 ? variantView(source, variants[0]) : null;
      const canonicalRecord = source.record ? sourceRecordView(source.record) : (selectedVariant ? selectedVariant.record : sourceRecordView({}));
      return Object.freeze({
        status: 'resolved',
        sourceId,
        variantKey: selectedVariant ? selectedVariant.variantKey : null,
        resolution: source.resolution,
        conflict: false,
        identity: neutralIdentity(source),
        selected: Object.freeze({
          sourceId,
          variantKey: selectedVariant ? selectedVariant.variantKey : null,
          packageLabel: selectedVariant ? selectedVariant.packageLabel : null,
          record: canonicalRecord,
          rawVariant: selectedVariant ? selectedVariant.rawVariant : null
        }),
        variants: Object.freeze(variants.map(item => variantView(source, item)))
      });
    }

    return Object.freeze({
      size: byId.size,
      has(sourceId) { return byId.has(sourceId); },
      resolve,
      resolveReference(reference) {
        if (!reference || typeof reference !== 'object') return resolve(String(reference || ''), null);
        return resolve(reference.source_id, reference.variant_key || null);
      },
      variants(sourceId) {
        const result = resolve(sourceId, null);
        return result.variants || Object.freeze([]);
      },
      resolveLocal(sourceId, record) {
        const selected = Object.freeze({ sourceId, variantKey: null, packageLabel: null, record: sourceRecordView(record), rawVariant: null });
        return Object.freeze({ status: 'resolved', sourceId, variantKey: null, resolution: 'LOCAL_PAGE_REFERENCE', conflict: false, identity: selected.record, selected, variants: Object.freeze([]) });
      },
      catalog() { return Object.freeze(records.map(source => resolve(source.source_id, null))); },
      conflictedSourceIds: Object.freeze(records.filter(isConflict).map(source => source.source_id).sort())
    });
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
    validateRouteDependencies(loaded.model);
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
    const documentObject = settings.documentObject || root.document;
    const windowObject = settings.windowObject || root;
    const routeRuntime = createRouteRuntime(loaded.model, { ia });
    const controller = ia.mount({
      rootElement,
      routeRuntime,
      state,
      documentObject,
      windowObject
    });
    root.ATLAS_PUBLIC_STATE = state;
    root.ATLAS_PUBLIC_ROUTER = controller;
    const runtimeDiagnostics = routeRuntime.diagnostics();
    root.ATLAS_PUBLIC_EVIDENCE = Object.freeze({
      sourceResolver: controller.services().sourceResolver,
      sourceIndexBuilds: runtimeDiagnostics.sourceIndexBuilds,
      sourceCount: runtimeDiagnostics.sourceCount
    });
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
    if (error && error.code === 'UNDECLARED_DATA_DEPENDENCY') return 'A public page attempted to use evidence data outside its declared route contract.';
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
      invariant(root.L && root.L.version === '1.9.4', 'RELEASE_MISMATCH', 'The authorized map runtime is unavailable.');
      invariant(root.ATLAS_REFERENCE_GEOGRAPHY && root.ATLAS_REFERENCE_GEOGRAPHY.artifact_role === 'PRESENTATION_REFERENCE_GEOGRAPHY', 'RELEASE_MISMATCH', 'The authorized reference geography is unavailable.');
      invariant(root.ATLAS_AUTHORIZED_MEDIA && typeof root.ATLAS_AUTHORIZED_MEDIA === 'object', 'RELEASE_MISMATCH', 'The authorized evidence-media map is unavailable.');
      invariant(manifest.application.assets.filter(asset => asset.role === 'evidence_image').every(asset => root.ATLAS_AUTHORIZED_MEDIA[asset.source_path]), 'RELEASE_MISMATCH', 'An authorized evidence image is unavailable.');
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
    AtlasBootError,
    ROUTE_DATA_DEPENDENCIES,
    canonicalText,
    sha256Text,
    assetForRole,
    validateContentAddressedAsset,
    validateManifest,
    validateRuntimeAuthorization,
    validatePageDataMappings,
    validateRouteDependencies,
    validateModel,
    createRouteModelView,
    createRouteRuntime,
    createSourceResolver,
    createLocationResolver,
    loadCurrentRecord,
    renderCurrent,
    renderFailure,
    failureDetail,
    boot
  });
}));

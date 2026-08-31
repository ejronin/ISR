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
    return Object.freeze({ modelPage, datasets: Object.freeze(datasets.slice()) });
  }

  /*
   * Phase 5 route/data contract.
   *
   * This is deliberately independent of the network/loading architecture. It
   * declares what each accepted page owner may consume from the already-loaded
   * public read model. `current.sources` is shared because the evidence/source
   * experience is available consistently on every route.
   */
  const ROUTE_DATA_DEPENDENCIES = Object.freeze({
    'start.overview': freezeContract('start_here', ['current.sources', 'current.chronology', 'ledger.domain_assessments', 'ledger.unresolved', 'analysis.endgame_public_view']),
    'start.actors': freezeContract('start_here', ['current.sources', 'current.chronology', 'current.actors']),
    'timeline.war': freezeContract('timeline', ['current.sources', 'current.chronology']),
    'timeline.chronology': freezeContract('timeline', ['current.sources', 'current.chronology']),
    'military.campaigns': freezeContract('military_record', ['current.sources', 'current.chronology', 'reconciliation.strikes']),
    'military.facilities': freezeContract('military_record', ['current.sources', 'ledger.facilities']),
    'military.weapons': freezeContract('military_record', ['current.sources', 'ledger.munitions_expenditure', 'ledger.attrition_series']),
    'military.losses': freezeContract('military_record', ['current.sources', 'current.material_losses', 'analysis.casualty_corrections']),
    'military.imagery': freezeContract('military_record', ['current.sources', 'ledger.bda_overlays', 'ledger.facilities']),
    'hormuz.overview': freezeContract('hormuz_economy', ['current.sources', 'analysis.hormuz', 'ledger.shipping']),
    'hormuz.shipping': freezeContract('hormuz_economy', ['current.sources', 'ledger.shipping', 'analysis.oil_routes', 'analysis.hormuz']),
    'hormuz.economy': freezeContract('hormuz_economy', ['current.sources', 'ledger.economics', 'analysis.china_oil_shift']),
    'hormuz.talks': freezeContract('hormuz_economy', ['current.sources', 'current.chronology', 'analysis.hormuz']),
    'talks.overview': freezeContract('diplomacy_mou', ['current.sources', 'ledger.diplomacy']),
    'talks.mou': freezeContract('diplomacy_mou', ['current.sources', 'analysis.hormuz', 'analysis.endgame_public_view']),
    'talks.nuclear': freezeContract('diplomacy_mou', ['current.sources', 'analysis.iran_messaging', 'analysis.endgame_public_view']),
    'talks.regional': freezeContract('diplomacy_mou', ['current.sources', 'ledger.agreements']),
    'objectives.outcomes': freezeContract('objectives_position_changes', ['current.sources', 'analysis.iran_outcomes', 'analysis.endgame_us_objectives', 'analysis.endgame_objective_corrections']),
    'objectives.positions': freezeContract('objectives_position_changes', ['current.sources', 'analysis.endgame_us_objectives', 'analysis.iran_messaging']),
    'objectives.iran': freezeContract('objectives_position_changes', ['current.sources', 'analysis.iran_messaging']),
    'evidence.claims': freezeContract('claims_sources', ['current.sources', 'current.claims']),
    'evidence.information': freezeContract('claims_sources', ['current.sources', 'analysis.information_war_claims', 'analysis.influence_networks']),
    'evidence.sources': freezeContract('claims_sources', ['current.sources']),
    'evidence.method': freezeContract('claims_sources', ['current.sources']),
    'evidence.archive': freezeContract('claims_sources', ['current.sources', 'archive.snapshot_index'])
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

  function datasetExists(model, key) {
    if (key === 'current.chronology') return Array.isArray(model.chronology);
    if (key === 'current.sources') return Boolean(model.sources && Array.isArray(model.sources.records));
    return Boolean(model.datasets && Object.prototype.hasOwnProperty.call(model.datasets, key));
  }

  function datasetRole(model, key) {
    if (key === 'current.chronology' || key === 'current.sources') return 'DERIVED_CANONICAL_CURRENT_ENTITY_STATE';
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

  function routeKeyFor(windowObject, state, ia) {
    if (ia && typeof ia.parseRoute === 'function' && windowObject && windowObject.location) {
      try {
        const parsed = ia.parseRoute(windowObject.location.hash || '');
        if (parsed && parsed.key && ROUTE_DATA_DEPENDENCIES[parsed.key]) return parsed.key;
      } catch (_) { /* fall through to state/hash lookup */ }
    }
    if (state && state.routeKey && ROUTE_DATA_DEPENDENCIES[state.routeKey]) return state.routeKey;
    const hash = windowObject && windowObject.location ? String(windowObject.location.hash || '').replace(/[?].*$/, '') : '';
    if (ROUTE_HASH_TO_KEY[hash]) return ROUTE_HASH_TO_KEY[hash];
    return 'start.overview';
  }

  function createRouteGuardedModel(model, options) {
    const settings = options || {};
    let enforcing = settings.enforcing === true;
    const contract = settings.contracts || ROUTE_DATA_DEPENDENCIES;
    const ia = settings.ia || null;
    const state = settings.state || null;
    const windowObject = settings.windowObject || null;

    function requireDependency(key) {
      if (!enforcing) return true;
      const routeKey = routeKeyFor(windowObject, state, ia);
      const routeContract = contract[routeKey];
      invariant(routeContract, 'UNDECLARED_DATA_DEPENDENCY', `No data contract exists for route ${routeKey}.`);
      invariant(routeContract.datasets.includes(key), 'UNDECLARED_DATA_DEPENDENCY', `Route ${routeKey} attempted undeclared dataset access: ${key}.`);
      return true;
    }

    const datasetsProxy = new Proxy(model.datasets || {}, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(target, prop)) requireDependency(prop);
        return Reflect.get(target, prop, receiver);
      }
    });
    const sourcesProxy = new Proxy(model.sources || {}, {
      get(target, prop, receiver) {
        if (prop === 'records') requireDependency('current.sources');
        return Reflect.get(target, prop, receiver);
      }
    });
    const entityKeyByProperty = Object.freeze({
      actors: 'current.actors',
      locations: 'current.locations',
      claims: 'current.claims',
      material_losses: 'current.material_losses',
      relationships: 'current.relationships'
    });
    const entitiesProxy = new Proxy(model.entities || {}, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && entityKeyByProperty[prop]) requireDependency(entityKeyByProperty[prop]);
        return Reflect.get(target, prop, receiver);
      }
    });
    const guarded = new Proxy(model, {
      get(target, prop, receiver) {
        if (prop === 'chronology') requireDependency('current.chronology');
        if (prop === 'sources') {
          requireDependency('current.sources');
          return sourcesProxy;
        }
        if (prop === 'datasets') return datasetsProxy;
        if (prop === 'entities') return entitiesProxy;
        return Reflect.get(target, prop, receiver);
      }
    });
    return Object.freeze({
      model: guarded,
      enable() { enforcing = true; },
      disable() { enforcing = false; },
      isEnabled() { return enforcing; },
      requireDependency,
      currentRouteKey() { return routeKeyFor(windowObject, state, ia); }
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
    try {
      const parsed = new URL(value, root.location && root.location.href ? root.location.href : 'https://atlas.invalid/');
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
      return Boolean(source && (source.resolution === 'PROVENANCE_SCOPED_VARIANTS_REQUIRED' || (source.variants || []).length > 1));
    }

    function resolve(sourceId, variantKey) {
      const source = byId.get(sourceId);
      if (!source) return Object.freeze({ status: 'missing-source', sourceId, variantKey: variantKey || null, variants: Object.freeze([]) });
      const variants = source.variants || [];
      if (variantKey) {
        const variant = (variantBySource.get(sourceId) || new Map()).get(variantKey);
        if (!variant) return Object.freeze({ status: 'missing-variant', sourceId, variantKey, conflict: isConflict(source), variants: Object.freeze(variants.map(item => variantView(source, item))) });
        return Object.freeze({ status: 'resolved', sourceId, variantKey, conflict: isConflict(source), selected: variantView(source, variant), variants: Object.freeze(variants.map(item => variantView(source, item))) });
      }
      if (isConflict(source)) {
        return Object.freeze({ status: 'variant-required', sourceId, variantKey: null, conflict: true, variants: Object.freeze(variants.map(item => variantView(source, item))) });
      }
      const selectedVariant = variants.length === 1 ? variantView(source, variants[0]) : null;
      const canonicalRecord = source.record ? sourceRecordView(source.record) : (selectedVariant ? selectedVariant.record : sourceRecordView({}));
      return Object.freeze({
        status: 'resolved',
        sourceId,
        variantKey: selectedVariant ? selectedVariant.variantKey : null,
        conflict: false,
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
      conflictedSourceIds: Object.freeze(records.filter(isConflict).map(source => source.source_id).sort())
    });
  }

  function createIdentityResolver(model) {
    const entities = model && model.entities ? model.entities : {};
    function keyedMap(items, keys) {
      const map = new Map();
      for (const item of Array.isArray(items) ? items : []) {
        const value = item && item.record ? item.record : item;
        for (const key of keys) {
          if (value && typeof value[key] === 'string') map.set(value[key], value);
        }
      }
      return map;
    }
    const actors = keyedMap(entities.actors, ['actor_id', 'id']);
    const locations = keyedMap(entities.locations, ['location_id', 'id']);
    function actorLabel(value) {
      if (typeof value === 'string') {
        const actor = actors.get(value);
        if (!actor) return value;
        const name = firstString(actor.name, actor.label, actor.display_name, value);
        const role = firstString(actor.role, actor.role_label, actor.title);
        const affiliation = firstString(actor.affiliation, actor.affiliation_label, actor.organization);
        return [name, role, affiliation].filter(Boolean).join(' — ');
      }
      if (value && typeof value === 'object') return firstString(value.name, value.label, value.display_name, value.actor_id, value.id);
      return null;
    }
    function locationLabel(value) {
      if (typeof value === 'string') {
        const location = locations.get(value);
        return location ? firstString(location.name, location.label, location.display_name, value) : value;
      }
      if (value && typeof value === 'object') return firstString(value.name, value.label, value.display_name, value.location_id, value.id);
      return null;
    }
    return Object.freeze({ actorLabel, locationLabel });
  }

  const PUBLIC_LANGUAGE_REPLACEMENTS = Object.freeze([
    Object.freeze({
      find: 'Conflicting provenance-scoped variants remain separate.',
      replace: 'Conflicting source versions are preserved separately.'
    }),
    Object.freeze({
      find: 'Multiple provenance-scoped records are preserved; no global version was selected.',
      replace: 'This source appears differently in preserved evidence packages, so Atlas keeps each version rather than silently choosing one.'
    }),
    Object.freeze({
      find: 'provenance-scoped versions',
      replace: 'preserved source versions'
    }),
    Object.freeze({
      find: 'provenance-scoped variants',
      replace: 'conflicting source versions'
    }),
    Object.freeze({
      find: 'The browser receives the already assembled current state; it does not rebuild history by replaying dated updates.',
      replace: 'Later corrections remain temporally explicit, so a correction does not pretend the information was known earlier.'
    })
  ]);

  function rewritePublicLanguageText(text) {
    let output = String(text || '');
    for (const replacement of PUBLIC_LANGUAGE_REPLACEMENTS) output = output.split(replacement.find).join(replacement.replace);
    return output;
  }

  function rewritePublicLanguage(rootElement) {
    function visit(node) {
      if (!node) return;
      if (node.nodeType === 3 && typeof node.nodeValue === 'string') {
        node.nodeValue = rewritePublicLanguageText(node.nodeValue);
        return;
      }
      for (const child of Array.from(node.childNodes || [])) visit(child);
    }
    visit(rootElement);
  }

  function appendDefinition(documentObject, list, term, value) {
    if (value === null || value === undefined || value === '') return;
    const dt = documentObject.createElement('dt');
    dt.textContent = term;
    const dd = documentObject.createElement('dd');
    dd.textContent = Array.isArray(value) ? value.filter(Boolean).join('; ') : String(value);
    list.append(dt, dd);
  }

  function eventOccurrence(event) {
  if (!event || typeof event !== 'object') return null;
  const timeline = event.timeline && typeof event.timeline === 'object' ? event.timeline : {};
  const record = event.event && typeof event.event === 'object' ? event.event : {};
  const direct = firstString(
    event.occurred_at,
    event.occurrence_at,
    event.timestamp,
    event.datetime,
    event.date_time,
    timeline.occurred_at,
    timeline.occurrence_at,
    record.occurred_at,
    record.occurrence_at,
    record.timestamp,
    record.datetime,
    record.date_time
  );
  if (direct) return direct;
  const date = firstString(
    event.date,
    event.occurrence_date,
    event.event_date,
    timeline.date,
    timeline.day,
    record.event_date,
    record.date
  );
  const time = firstString(
    event.time,
    event.occurrence_time,
    event.event_time,
    timeline.time,
    record.event_time,
    record.time
  );
  return date && time ? `${date} ${time}` : date;
}

function eventKnownBy(event) {
  if (!event || typeof event !== 'object') return null;
  const timeline = event.timeline && typeof event.timeline === 'object' ? event.timeline : {};
  const record = event.event && typeof event.event === 'object' ? event.event : {};
  const revisionKnown = (Array.isArray(event.revisions) ? event.revisions : [])
    .map(revision => revision && revision.known_at)
    .filter(Boolean)
    .sort()[0] || null;
  return firstString(
    event.known_at,
    event.known_by,
    event.first_verified_at,
    event.first_verified,
    timeline.known_at,
    timeline.known_by,
    timeline.first_verified,
    timeline.first_reported,
    record.known_at,
    record.known_by,
    record.first_verified_at,
    record.first_verified,
    record.first_reported,
    revisionKnown
  );
}

  function normalizeActorValues(event) {
    const raw = event && (event.actor_ids || event.actors || event.actor_id || event.actor);
    if (Array.isArray(raw)) return raw;
    return raw ? [raw] : [];
  }

  function eventLocationValue(event) {
    if (!event) return null;
    if (event.location_id) return event.location_id;
    if (event.location) return event.location;
    if (Array.isArray(event.locations) && event.locations.length) return event.locations[0];
    return null;
  }

  function evidenceStatusValues(event) {
    if (!event || typeof event !== 'object') return Object.freeze({ support: null, dispute: null });
    const evidence = event.evidence && typeof event.evidence === 'object' ? event.evidence : {};
    return Object.freeze({
      support: firstString(event.evidence_support, event.evidence_status, evidence.support, evidence.status),
      dispute: firstString(event.dispute_status, event.dispute, evidence.dispute, evidence.dispute_status)
    });
  }

  function findEventForDrawer(drawer, eventById, eventIds) {
    let node = drawer;
    for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
      const candidates = [
        node.getAttribute && node.getAttribute('data-event-id'),
        node.getAttribute && node.getAttribute('data-record-id'),
        node.dataset && node.dataset.eventId,
        node.dataset && node.dataset.recordId
      ].filter(Boolean);
      for (const value of candidates) if (eventById.has(value)) return eventById.get(value);
      const text = typeof node.textContent === 'string' ? node.textContent : '';
      for (const eventId of eventIds) if (text.includes(eventId)) return eventById.get(eventId);
    }
    return null;
  }

  function sourceLink(documentObject, resolved) {
    const selected = resolved && resolved.selected;
    const record = selected && selected.record;
    const li = documentObject.createElement('li');
    const label = record && (record.title || record.publisher) ? (record.title || record.publisher) : resolved.sourceId;
    if (record && record.url) {
      const link = documentObject.createElement('a');
      link.href = record.url;
      link.textContent = label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.append(link);
    } else {
      li.append(documentObject.createTextNode(label || resolved.sourceId));
    }
    const meta = [record && record.publisher, record && record.publicationDate, selected && selected.variantKey ? `version ${selected.variantKey}` : null].filter(Boolean);
    if (meta.length) {
      const small = documentObject.createElement('small');
      small.textContent = ` — ${meta.join(' · ')}`;
      li.append(small);
    }
    if (record && record.context) {
      const context = documentObject.createElement('div');
      context.className = 'source-context';
      context.textContent = record.context;
      li.append(context);
    }
    return li;
  }

  function appendConflictVariants(documentObject, parent, resolved) {
    const note = documentObject.createElement('p');
    note.className = 'source-variant-note';
    note.textContent = 'This source appears differently in preserved evidence packages, so Atlas keeps each version rather than silently choosing one.';
    parent.append(note);
    const list = documentObject.createElement('ul');
    list.className = 'source-list source-variant-list';
    for (const variant of resolved.variants || []) {
      const variantResolved = Object.freeze({ sourceId: resolved.sourceId, selected: variant });
      const li = sourceLink(documentObject, variantResolved);
      if (variant.packageLabel) {
        const packageDetail = documentObject.createElement('small');
        packageDetail.textContent = ` Preserved in: ${variant.packageLabel}.`;
        li.append(packageDetail);
      }
      list.append(li);
    }
    parent.append(list);
  }

  function rebuildEventEvidenceDrawer(drawer, event, services) {
    const documentObject = services.documentObject;
    const resolver = services.sourceResolver;
    const identity = services.identityResolver;
    const summary = drawer.querySelector('summary') || documentObject.createElement('summary');
    const references = Array.isArray(event.source_references) ? event.source_references : [];
    summary.textContent = `Evidence and sources${references.length ? ` (${references.length})` : ''}`;
    summary.style.minHeight = '44px';
    const body = documentObject.createElement('div');
    body.className = 'evidence-drawer-body shared-evidence-drawer-body';
    const facts = documentObject.createElement('dl');
    facts.className = 'evidence-facts';
    appendDefinition(documentObject, facts, 'Event ID', event.event_id);
    appendDefinition(documentObject, facts, 'Event summary', firstString(event.summary, event.headline, event.title, event.event));
    appendDefinition(documentObject, facts, 'Occurred', eventOccurrence(event));
    appendDefinition(documentObject, facts, 'First reported / known', eventKnownBy(event));
    const actorLabels = normalizeActorValues(event).map(identity.actorLabel).filter(Boolean);
    appendDefinition(documentObject, facts, 'Actors', actorLabels);
    appendDefinition(documentObject, facts, 'Location', identity.locationLabel(eventLocationValue(event)));
    const status = evidenceStatusValues(event);
    appendDefinition(documentObject, facts, 'Evidence status', status.support);
    appendDefinition(documentObject, facts, 'Dispute status', status.dispute);
    appendDefinition(documentObject, facts, 'Unresolved evidence', firstString(event.unresolved_evidence, event.unresolved, event.evidence_gap, event.evidence_gaps));
    if (facts.childNodes.length) body.append(facts);

    if (references.length) {
      const heading = documentObject.createElement('h4');
      heading.textContent = 'Linked sources';
      body.append(heading);
      const list = documentObject.createElement('ul');
      list.className = 'source-list';
      for (const reference of references) {
        const resolved = resolver.resolveReference(reference);
        if (resolved.status === 'resolved') list.append(sourceLink(documentObject, resolved));
        else if (resolved.status === 'variant-required') {
          const li = documentObject.createElement('li');
          li.textContent = resolved.sourceId;
          appendConflictVariants(documentObject, li, resolved);
          list.append(li);
        } else {
          const li = documentObject.createElement('li');
          li.textContent = `${reference.source_id || 'Source'} — source version could not be resolved.`;
          list.append(li);
        }
      }
      body.append(list);
    }

    const relatedIds = Array.isArray(event.related_event_ids) ? event.related_event_ids : [];
    if (relatedIds.length) {
      const relatedHeading = documentObject.createElement('h4');
      relatedHeading.textContent = 'Related chronology records';
      const relatedList = documentObject.createElement('ul');
      for (const id of relatedIds) {
        const related = services.eventById.get(id);
        const li = documentObject.createElement('li');
        li.textContent = related ? `${id} — ${firstString(related.summary, related.headline, related.title, related.event) || 'Related event'}` : id;
        relatedList.append(li);
      }
      body.append(relatedHeading, relatedList);
    }
    drawer.replaceChildren(summary, body);
    drawer.dataset.component = 'SharedEvidenceDrawer';
    drawer.dataset.phase5Evidence = 'true';
  }

  function enhanceSourceVariantCards(rootElement, services) {
    const documentObject = services.documentObject;
    const conflictedIds = services.sourceResolver.conflictedSourceIds;
    if (!conflictedIds.length) return;
    const candidates = Array.from(rootElement.querySelectorAll('[data-source-id], .source-card, .source-detail, .source-record'));
    for (const card of candidates) {
      const explicit = card.getAttribute && card.getAttribute('data-source-id');
      const sourceId = explicit && conflictedIds.includes(explicit)
        ? explicit
        : conflictedIds.find(id => typeof card.textContent === 'string' && card.textContent.includes(id));
      if (!sourceId || card.querySelector('[data-phase5-source-variants]')) continue;
      const resolved = services.sourceResolver.resolve(sourceId, null);
      if (resolved.status !== 'variant-required') continue;
      const existing = card.querySelector('.source-variants');
      const details = existing && String(existing.tagName || '').toLowerCase() === 'details' ? existing : documentObject.createElement('details');
      details.className = 'source-variants shared-source-variants';
      details.dataset.phase5SourceVariants = sourceId;
      const summary = documentObject.createElement('summary');
      summary.textContent = `Preserved source versions (${resolved.variants.length})`;
      summary.style.minHeight = '44px';
      const intro = documentObject.createElement('p');
      intro.textContent = 'This source appears differently in preserved evidence packages, so Atlas keeps each preserved version rather than silently choosing one.';
      details.replaceChildren(summary, intro);
      for (const variant of resolved.variants) {
        const section = documentObject.createElement('section');
        section.className = 'source-variant';
        const heading = documentObject.createElement('h4');
        heading.textContent = variant.record.title || variant.record.publisher || variant.variantKey || sourceId;
        const dl = documentObject.createElement('dl');
        appendDefinition(documentObject, dl, 'Preserved package', variant.packageLabel);
        appendDefinition(documentObject, dl, 'Version key', variant.variantKey);
        appendDefinition(documentObject, dl, 'Title', variant.record.title);
        appendDefinition(documentObject, dl, 'Publisher', variant.record.publisher);
        appendDefinition(documentObject, dl, 'Publication date', variant.record.publicationDate);
        appendDefinition(documentObject, dl, 'Source role', variant.record.role);
        appendDefinition(documentObject, dl, 'Context', variant.record.context);
        section.append(heading, dl);
        if (variant.record.url) {
          const link = documentObject.createElement('a');
          link.href = variant.record.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Open this preserved source version';
          section.append(link);
        }
        details.append(section);
      }
      if (!existing) card.append(details);
    }
  }

  function addChartNumericEquivalent(rootElement, documentObject) {
    const charts = Array.from(rootElement.querySelectorAll('[role="img"]'));
    for (const chart of charts) {
      const label = String(chart.getAttribute('aria-label') || '').toLowerCase();
      if (!label.includes('military-event') && !label.includes('strike-record') && !label.includes('event tempo')) continue;
      if (chart.parentElement && chart.parentElement.querySelector('[data-phase5-chart-equivalent]')) continue;
      const rows = Array.from(chart.querySelectorAll('.bar-row, .bar-chart-row, [data-bar-row]'));
      const values = rows.map(row => {
        const children = Array.from(row.children || []);
        const labelNode = row.querySelector('.bar-label, .bar-name, [data-bar-label]') || children[0];
        const valueNode = row.querySelector('.bar-value, [data-bar-value]') || children[children.length - 1];
        return {
          label: labelNode && String(labelNode.textContent || '').trim(),
          value: valueNode && String(valueNode.textContent || '').trim()
        };
      }).filter(item => item.label && item.value && item.label !== item.value);
      if (!values.length) continue;
      const details = documentObject.createElement('details');
      details.dataset.phase5ChartEquivalent = 'campaign-tempo';
      const summary = documentObject.createElement('summary');
      summary.textContent = 'Numeric values for recorded event tempo';
      summary.style.minHeight = '44px';
      const note = documentObject.createElement('p');
      note.textContent = 'These are recorded military-event / strike-record counts. They are not total weapons, successful hits, destruction, or exhaustive operational tempo.';
      const table = documentObject.createElement('table');
      const caption = documentObject.createElement('caption');
      caption.textContent = 'Recorded military-event / strike-record tempo';
      const thead = documentObject.createElement('thead');
      const headRow = documentObject.createElement('tr');
      const h1 = documentObject.createElement('th');
      h1.scope = 'col';
      h1.textContent = 'Period';
      const h2 = documentObject.createElement('th');
      h2.scope = 'col';
      h2.textContent = 'Recorded events';
      headRow.append(h1, h2);
      thead.append(headRow);
      const tbody = documentObject.createElement('tbody');
      for (const item of values) {
        const tr = documentObject.createElement('tr');
        const th = documentObject.createElement('th');
        th.scope = 'row';
        th.textContent = item.label;
        const td = documentObject.createElement('td');
        td.textContent = item.value;
        tr.append(th, td);
        tbody.append(tr);
      }
      table.append(caption, thead, tbody);
      details.append(summary, note, table);
      chart.insertAdjacentElement('afterend', details);
    }
  }

  function addMapTextEquivalent(rootElement, documentObject) {
    const maps = Array.from(rootElement.querySelectorAll('svg[role="img"]'));
    for (const map of maps) {
      const label = String(map.getAttribute('aria-label') || '').toLowerCase();
      const mapHost = typeof map.closest === 'function' ? map.closest('[data-component="MapView"], .context-map') : null;
      if (!label.includes('map') && !mapHost) continue;
      const parent = mapHost || map.parentElement || map;
      if (parent.querySelector && parent.querySelector('[data-phase5-map-equivalent]')) continue;
      const labels = Array.from(map.querySelectorAll('title')).map(node => String(node.textContent || '').trim()).filter(Boolean);
      const unique = Array.from(new Set(labels.filter(text => text.toLowerCase() !== label)));
      if (!unique.length) continue;
      const details = documentObject.createElement('details');
      details.dataset.phase5MapEquivalent = 'locations';
      const summary = documentObject.createElement('summary');
      summary.textContent = `Locations represented on this map (${unique.length})`;
      summary.style.minHeight = '44px';
      const list = documentObject.createElement('ul');
      for (const text of unique) {
        const li = documentObject.createElement('li');
        li.textContent = text;
        list.append(li);
      }
      details.append(summary, list);
      parent.append(details);
    }
  }

  function improveEvidenceSemantics(rootElement) {
    for (const drawer of Array.from(rootElement.querySelectorAll('details.evidence-drawer'))) {
      drawer.dataset.component = 'SharedEvidenceDrawer';
      const summary = drawer.querySelector('summary');
      if (summary && !summary.getAttribute('aria-label')) summary.setAttribute('aria-label', summary.textContent || 'Evidence and sources');
    }
    for (const status of Array.from(rootElement.querySelectorAll('.evidence-status'))) {
      if (!status.getAttribute('role')) status.setAttribute('role', 'group');
      if (!status.getAttribute('aria-label')) status.setAttribute('aria-label', 'Evidence status');
    }
  }

  function enhanceEvidenceExperience(rootElement, options) {
    if (!rootElement || typeof rootElement.querySelectorAll !== 'function') return;
    const services = options || {};
    const model = services.model;
    const documentObject = services.documentObject || rootElement.ownerDocument || root.document;
    const sourceResolver = services.sourceResolver || createSourceResolver(model);
    const identityResolver = services.identityResolver || createIdentityResolver(model);
    const eventById = services.eventById || new Map((model && model.chronology || []).map(event => [event.event_id, event]));
    const eventIds = Array.from(eventById.keys()).sort((a, b) => b.length - a.length);
    const shared = { documentObject, sourceResolver, identityResolver, eventById };

    for (const drawer of Array.from(rootElement.querySelectorAll('details.evidence-drawer'))) {
      const event = findEventForDrawer(drawer, eventById, eventIds);
      if (event) rebuildEventEvidenceDrawer(drawer, event, shared);
      else {
        drawer.dataset.component = 'SharedEvidenceDrawer';
        drawer.dataset.phase5Evidence = 'true';
      }
    }
    enhanceSourceVariantCards(rootElement, shared);
    rewritePublicLanguage(rootElement);
    improveEvidenceSemantics(rootElement);
    addChartNumericEquivalent(rootElement, documentObject);
    addMapTextEquivalent(rootElement, documentObject);
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
    const sourceResolver = createSourceResolver(loaded.model);
    const identityResolver = createIdentityResolver(loaded.model);
    const eventById = new Map(loaded.model.chronology.map(event => [event.event_id, event]));
    const routeGuard = createRouteGuardedModel(loaded.model, { ia, state, windowObject });
    const controller = ia.mount({
      rootElement,
      model: routeGuard.model,
      state,
      documentObject,
      windowObject
    });
    routeGuard.enable();
    const enhance = () => enhanceEvidenceExperience(rootElement, {
      model: loaded.model,
      documentObject,
      sourceResolver,
      identityResolver,
      eventById
    });
    if (windowObject && typeof windowObject.addEventListener === 'function') windowObject.addEventListener('atlasroutechange', enhance);
    enhance();
    root.ATLAS_PUBLIC_STATE = state;
    root.ATLAS_PUBLIC_MODEL = loaded.model;
    root.ATLAS_PUBLIC_ROUTER = controller;
    root.ATLAS_PUBLIC_EVIDENCE = Object.freeze({ sourceResolver });
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
    createRouteGuardedModel,
    createSourceResolver,
    createIdentityResolver,
    rewritePublicLanguageText,
    enhanceEvidenceExperience,
    loadCurrentRecord,
    renderCurrent,
    renderFailure,
    failureDetail,
    boot
  });
}));

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

  const PAGE_CONFIG = Object.freeze({
    start_here: {
      label: 'Start here',
      description: 'Release identity, evidence lineage, approved package counts, and the current read-model boundary.'
    },
    timeline: {
      label: 'Timeline',
      description: 'The normalized 205-record chronology assembled once from the approved canonical packages.'
    },
    military_record: {
      label: 'Military record',
      description: 'Military and physical-effect records exposed from the current read model without re-adjudication.'
    },
    hormuz_economy: {
      label: 'Hormuz & economy',
      description: 'Approved shipping, route, economic, and Hormuz datasets retained in their existing accounting scopes.'
    },
    diplomacy_mou: {
      label: 'Diplomacy & MOU',
      description: 'Agreement, bargaining, and diplomacy records as carried by the approved evidence products.'
    },
    objectives_position_changes: {
      label: 'Objectives & positions',
      description: 'Approved objective, rationale, outcome, and messaging datasets without new frontend conclusions.'
    },
    claims_sources: {
      label: 'Claims & sources',
      description: 'Claim-linked chronology and the provenance-scoped source catalog supporting the current record.'
    }
  });

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
    invariant(Array.isArray(manifest.application.assets) && manifest.application.assets.length === 2, 'RELEASE_MISMATCH', 'The application asset inventory is incomplete.');
    const assetPaths = manifest.application.assets.map(asset => asset.path);
    invariant(new Set(assetPaths).size === assetPaths.length, 'RELEASE_MISMATCH', 'The application asset inventory contains duplicate paths.');
    const stylesheet = validateContentAddressedAsset(assetForRole(manifest, 'stylesheet'), 'css');
    const entrypoint = validateContentAddressedAsset(assetForRole(manifest, 'entrypoint'), 'js');
    invariant(manifest.application.stylesheet === stylesheet.path, 'RELEASE_MISMATCH', 'The application stylesheet path is inconsistent.');
    invariant(manifest.application.entrypoint === entrypoint.path, 'RELEASE_MISMATCH', 'The application entrypoint path is inconsistent.');
    return manifest;
  }

  function validateRuntimeAuthorization(authorization, executingScript, documentObject) {
    invariant(authorization && authorization.manifest, 'RELEASE_MISMATCH', 'The application was not started by an authorized release bootstrap.');
    const manifest = validateManifest(authorization.manifest);
    invariant(authorization.releaseIdentity === manifest.release_identity, 'RELEASE_MISMATCH', 'The runtime authorization release identity is inconsistent.');
    const entrypoint = assetForRole(manifest, 'entrypoint');
    const stylesheet = assetForRole(manifest, 'stylesheet');
    invariant(authorization.entrypointPath === entrypoint.path && authorization.entrypointSha256 === entrypoint.sha256, 'RELEASE_MISMATCH', 'The entrypoint authorization is inconsistent.');
    invariant(authorization.stylesheetPath === stylesheet.path && authorization.stylesheetSha256 === stylesheet.sha256, 'RELEASE_MISMATCH', 'The stylesheet authorization is inconsistent.');
    invariant(executingScript && executingScript.src, 'RELEASE_MISMATCH', 'The executing application identity is unavailable.');
    const scriptUrl = new URL(executingScript.src, root.location && root.location.href);
    invariant(scriptUrl.pathname.endsWith(`/${entrypoint.path}`), 'RELEASE_MISMATCH', 'The executing application path is not authorized by this release.');
    invariant(executingScript.integrity === entrypoint.integrity, 'RELEASE_MISMATCH', 'The executing application integrity is not authorized by this release.');
    invariant(executingScript.dataset.atlasAuthorizedEntrypoint === manifest.release_identity, 'RELEASE_MISMATCH', 'The executing application release marker is invalid.');
    invariant(executingScript.dataset.assetSha256 === entrypoint.sha256, 'RELEASE_MISMATCH', 'The executing application hash marker is invalid.');
    const styleLinks = Array.from(documentObject.querySelectorAll('link[data-atlas-authorized-style]'));
    const activeStyle = styleLinks.find(link => link.dataset.atlasAuthorizedStyle === manifest.release_identity);
    invariant(activeStyle && activeStyle.href, 'RELEASE_MISMATCH', 'The authorized application stylesheet is not active.');
    const styleUrl = new URL(activeStyle.href, root.location && root.location.href);
    invariant(styleUrl.pathname.endsWith(`/${stylesheet.path}`), 'RELEASE_MISMATCH', 'The active stylesheet path is not authorized by this release.');
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

  function element(documentObject, tag, className, text) {
    const node = documentObject.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function append(parent, tag, className, text) {
    const node = element(parent.ownerDocument || parent, tag, className, text);
    parent.append(node);
    return node;
  }

  function humanize(value) {
    return String(value || '')
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  function safeExternalUrl(value) {
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
    } catch (_) {
      return null;
    }
  }

  function sourceIndex(model) {
    return new Map((model.sources.records || []).map(source => [source.source_id, source]));
  }

  function exactSourceRecord(source, variantKey) {
    if (!source) return null;
    if (variantKey) {
      const variant = (source.variants || []).find(item => item.variant_key === variantKey);
      if (variant) return variant.record;
    }
    return source.resolution === 'UNAMBIGUOUS' ? source.record : null;
  }

  function appendSourceLinks(host, chronologyItem, model, index) {
    if (!chronologyItem.source_references || !chronologyItem.source_references.length) return;
    const links = append(host, 'div', 'source-links');
    chronologyItem.source_references.forEach(reference => {
      const catalog = index.get(reference.source_id);
      const record = exactSourceRecord(catalog, reference.variant_key);
      const label = record && (record.outlet || record.title) ? (record.outlet || record.title) : reference.source_id;
      const url = record && safeExternalUrl(record.url);
      if (url) {
        const link = append(links, 'a', '', label);
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = record.title || reference.source_id;
      } else {
        append(links, 'span', '', `${label} · ${reference.source_id}`);
      }
    });
  }

  function appendRecordCard(host, item, model, index) {
    const card = append(host, 'article', 'record-card');
    const timeline = item.timeline || {};
    const event = item.event || {};
    const meta = append(card, 'div', 'record-meta');
    append(meta, 'span', '', timeline.date || event.event_date || 'Date unresolved');
    append(meta, 'span', '', item.event_id);
    if (timeline.event_type || event.event_type) append(meta, 'span', '', humanize(timeline.event_type || event.event_type));
    if (event.evidence_status) append(meta, 'span', '', humanize(event.evidence_status));
    append(card, 'h3', '', timeline.summary || event.summary || event.target || item.event_id);
    if (event.observed_fact && event.observed_fact !== (timeline.summary || event.summary)) {
      append(card, 'p', '', event.observed_fact);
    }
    if (event.current_status) append(card, 'p', '', `Current status: ${event.current_status}`);
    appendSourceLinks(card, item, model, index);
    return card;
  }

  function renderMetricGrid(host, model) {
    const grid = append(host, 'div', 'metric-grid');
    const metrics = [
      [model.counts.chronology_records, 'current chronology records'],
      [model.counts.historical_base, 'frozen historical base'],
      [model.counts.historical_reconciliation, 'accepted reconciliation records'],
      [model.counts.canonical_source_records, 'canonical source records']
    ];
    metrics.forEach(([value, label]) => {
      const metric = append(grid, 'div', 'metric');
      append(metric, 'strong', '', value);
      append(metric, 'span', '', label);
    });
  }

  function renderStartHere(host, model) {
    renderMetricGrid(host, model);
    const notice = append(host, 'div', 'notice');
    append(notice, 'strong', '', 'Derived current read model. ');
    append(notice, 'span', '', model.authority_notice || 'Canonical evidence packages remain authoritative; this artifact is a generated public view.');
    append(host, 'h3', 'section-heading', 'Assembly lineage');
    const tableWrap = append(host, 'div', 'table-wrap');
    const table = append(tableWrap, 'table');
    const head = append(table, 'thead');
    const headRow = append(head, 'tr');
    ['Package', 'Role', 'Contribution', 'Cumulative'].forEach(label => append(headRow, 'th', '', label));
    const body = append(table, 'tbody');
    model.input_packages.forEach(item => {
      const row = append(body, 'tr');
      append(row, 'td', '', item.package_name || item.key);
      append(row, 'td', '', humanize(item.role));
      append(row, 'td', '', item.contribution);
      append(row, 'td', '', item.cumulative_chronology_records);
    });
    const domainData = model.datasets['ledger.domain_assessments'];
    const domains = domainData && domainData.payload && Array.isArray(domainData.payload.domains) ? domainData.payload.domains : [];
    if (domains.length) {
      append(host, 'h3', 'section-heading', 'Approved domain assessments');
      const list = append(host, 'div', 'record-list');
      domains.forEach(domain => {
        const card = append(list, 'article', 'record-card');
        append(card, 'h3', '', domain.domain || 'Domain assessment');
        const meta = append(card, 'div', 'record-meta');
        if (domain.current_advantage) append(meta, 'span', '', humanize(domain.current_advantage));
        if (domain.confidence) append(meta, 'span', '', `Confidence: ${humanize(domain.confidence)}`);
        if (domain.trend) append(card, 'p', '', humanize(domain.trend));
        if (domain.assessment) append(card, 'p', '', domain.assessment);
      });
    }
  }

  function uniqueEventTypes(model) {
    return Array.from(new Set(model.chronology.map(item => item.timeline && item.timeline.event_type).filter(Boolean))).sort();
  }

  function renderTimeline(host, model) {
    const controls = append(host, 'div', 'controls');
    const searchLabel = append(controls, 'label', '', 'Search chronology');
    const search = append(searchLabel, 'input');
    search.type = 'search';
    search.placeholder = 'Event, actor, location, source, or record ID';
    const typeLabel = append(controls, 'label', '', 'Event type');
    const type = append(typeLabel, 'select');
    const allOption = append(type, 'option', '', 'All event types');
    allOption.value = '';
    uniqueEventTypes(model).forEach(value => {
      const option = append(type, 'option', '', humanize(value));
      option.value = value;
    });
    const list = append(host, 'div', 'record-list');
    const pager = append(host, 'div', 'pager');
    const count = append(pager, 'span', '', '');
    const more = append(pager, 'button', 'action', 'Show more');
    more.type = 'button';
    const index = sourceIndex(model);
    let limit = 40;
    const draw = () => {
      const query = search.value.trim().toLowerCase();
      const selectedType = type.value;
      const rows = model.chronology.filter(item => {
        if (selectedType && item.timeline.event_type !== selectedType) return false;
        if (!query) return true;
        return JSON.stringify({
          id: item.event_id,
          event: item.event,
          timeline: item.timeline,
          sources: item.source_ids
        }).toLowerCase().includes(query);
      }).slice().reverse();
      list.replaceChildren();
      rows.slice(0, limit).forEach(item => appendRecordCard(list, item, model, index));
      count.textContent = `${Math.min(rows.length, limit)} of ${rows.length} matching records`;
      more.hidden = rows.length <= limit;
      if (!rows.length) append(list, 'div', 'empty-state', 'No chronology records match these filters.');
    };
    search.addEventListener('input', () => { limit = 40; draw(); });
    type.addEventListener('change', () => { limit = 40; draw(); });
    more.addEventListener('click', () => { limit += 40; draw(); });
    draw();
  }

  function payloadShape(payload) {
    if (Array.isArray(payload)) return `${payload.length} records`;
    if (payload === null || payload === undefined) return 'empty payload';
    if (typeof payload === 'string') return `${payload.length.toLocaleString()} characters`;
    if (typeof payload === 'object') return `${Object.keys(payload).length} top-level fields`;
    return typeof payload;
  }

  function renderDatasets(host, model, pageKey) {
    const mapping = model.page_data[pageKey];
    const keys = mapping && Array.isArray(mapping.dataset_keys) ? mapping.dataset_keys.filter(key => !key.startsWith('current.')) : [];
    append(host, 'h3', 'section-heading', 'Approved datasets in this view');
    const note = append(host, 'div', 'notice');
    append(note, 'strong', '', 'Presentation adapter only. ');
    append(note, 'span', '', 'These records are read from the generated current model. Expanding a dataset reveals its approved payload without changing its analytical meaning.');
    const list = append(host, 'div', 'dataset-list');
    keys.forEach(key => {
      const dataset = model.datasets[key];
      if (!dataset) return;
      const card = append(list, 'article', 'dataset-card');
      append(card, 'h3', '', humanize(key));
      const meta = append(card, 'div', 'dataset-meta');
      append(meta, 'span', '', humanize(dataset.role));
      append(meta, 'span', '', payloadShape(dataset.payload));
      append(meta, 'span', '', `${(dataset.source_references || []).length} source references`);
      append(card, 'p', '', dataset.path);
      const details = append(card, 'details');
      append(details, 'summary', '', 'Inspect approved payload');
      details.addEventListener('toggle', () => {
        if (!details.open || details.querySelector('pre')) return;
        append(details, 'pre', '', typeof dataset.payload === 'string' ? dataset.payload : JSON.stringify(dataset.payload, null, 2));
      });
    });
  }

  function chronologyText(item) {
    return JSON.stringify({ event: item.event, timeline: item.timeline }).toLowerCase();
  }

  function structurallyRelated(item, pageKey) {
    const event = item.event || {};
    const text = chronologyText(item);
    if (pageKey === 'military_record') {
      return (event.facility_refs || []).length > 0 || (event.map_refs || []).length > 0 || /(strike|kinetic|missile|drone|damage|loss|casualt|military|air defense)/.test(text);
    }
    if (pageKey === 'hormuz_economy') return /(hormuz|shipping|tanker|oil|trade route|maritime|economic)/.test(text);
    if (pageKey === 'diplomacy_mou') return /(diplom|agreement|negotiat|ceasefire|memorandum|\bmou\b|bargain|mediat)/.test(text);
    if (pageKey === 'objectives_position_changes') return (event.claim_refs || []).length > 0 || /(objective|position|rationale|outcome|demand|concession)/.test(text);
    if (pageKey === 'claims_sources') return (event.claim_refs || []).length > 0 || /(claim|verification|false|misleading|unverified)/.test(text);
    return false;
  }

  function renderRelatedChronology(host, model, pageKey) {
    const rows = model.chronology.filter(item => structurallyRelated(item, pageKey)).slice().reverse();
    append(host, 'h3', 'section-heading', 'Structurally related chronology');
    const note = append(host, 'div', 'notice');
    append(note, 'strong', '', `${rows.length} records. `);
    append(note, 'span', '', 'This temporary Phase 2 grouping uses explicit references and record text for navigation only; it does not create a new analytical classification.');
    const list = append(host, 'div', 'record-list');
    const index = sourceIndex(model);
    rows.slice(0, 40).forEach(item => appendRecordCard(list, item, model, index));
    if (rows.length > 40) append(list, 'div', 'empty-state', `${rows.length - 40} additional related records remain available in Timeline.`);
  }

  function sourceDisplayRecord(source) {
    return source.record || source.registry || (source.variants && source.variants[0] && source.variants[0].record) || {};
  }

  function appendSourceCard(host, source) {
    const card = append(host, 'article', 'source-card');
    const display = sourceDisplayRecord(source);
    append(card, 'h3', '', display.title || display.outlet || source.source_id);
    const meta = append(card, 'div', 'source-meta');
    append(meta, 'span', '', source.source_id);
    append(meta, 'span', '', humanize(source.registry_status));
    append(meta, 'span', '', humanize(source.resolution));
    if (display.outlet) append(meta, 'span', '', display.outlet);
    if (source.resolution === 'PROVENANCE_SCOPED_VARIANTS_REQUIRED') {
      append(card, 'p', '', `${source.variants.length} package-scoped variants are retained. No global metadata winner is selected.`);
      const links = append(card, 'div', 'source-links');
      source.variants.forEach(variant => {
        const url = safeExternalUrl(variant.record && variant.record.url);
        const label = `${variant.provenance.package_key}: ${(variant.record && (variant.record.outlet || variant.record.title)) || source.source_id}`;
        if (url) {
          const link = append(links, 'a', '', label);
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        } else append(links, 'span', '', label);
      });
      return;
    }
    const url = safeExternalUrl(display.url);
    if (url) {
      const links = append(card, 'div', 'source-links');
      const link = append(links, 'a', '', 'Open source');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }

  function renderSourceCatalog(host, model) {
    append(host, 'h3', 'section-heading', 'Source catalog');
    const controls = append(host, 'div', 'controls');
    const label = append(controls, 'label', '', 'Search sources');
    const input = append(label, 'input');
    input.type = 'search';
    input.placeholder = 'Outlet, title, source ID, or registry status';
    const status = append(controls, 'label', '', 'Registry status');
    const select = append(status, 'select');
    ['', 'REGISTERED', 'CANONICAL_SOURCE_NOT_YET_IN_GENERATED_REGISTRY', 'PROVENANCE_SCOPED_VARIANTS_REQUIRED'].forEach(value => {
      const option = append(select, 'option', '', value ? humanize(value) : 'All source records');
      option.value = value;
    });
    const list = append(host, 'div', 'source-list');
    const pager = append(host, 'div', 'pager');
    const count = append(pager, 'span', '', '');
    const more = append(pager, 'button', 'action', 'Show more');
    more.type = 'button';
    let limit = 50;
    const draw = () => {
      const query = input.value.trim().toLowerCase();
      const filter = select.value;
      const rows = model.sources.records.filter(source => {
        if (filter === 'PROVENANCE_SCOPED_VARIANTS_REQUIRED' && source.resolution !== filter) return false;
        if (filter && filter !== 'PROVENANCE_SCOPED_VARIANTS_REQUIRED' && source.registry_status !== filter) return false;
        return !query || JSON.stringify(source).toLowerCase().includes(query);
      });
      list.replaceChildren();
      rows.slice(0, limit).forEach(source => appendSourceCard(list, source));
      count.textContent = `${Math.min(rows.length, limit)} of ${rows.length} matching sources`;
      more.hidden = rows.length <= limit;
      if (!rows.length) append(list, 'div', 'empty-state', 'No source records match these filters.');
    };
    input.addEventListener('input', () => { limit = 50; draw(); });
    select.addEventListener('change', () => { limit = 50; draw(); });
    more.addEventListener('click', () => { limit += 50; draw(); });
    draw();
  }

  function renderPage(host, model, state, pageKey) {
    const config = PAGE_CONFIG[pageKey] || PAGE_CONFIG.start_here;
    host.replaceChildren();
    const intro = append(host, 'section', 'page-intro');
    append(intro, 'p', 'eyebrow', 'Current public record');
    append(intro, 'h2', '', config.label);
    append(intro, 'p', '', config.description);
    if (pageKey === 'start_here') renderStartHere(host, model);
    else if (pageKey === 'timeline') renderTimeline(host, model);
    else {
      renderDatasets(host, model, pageKey);
      renderRelatedChronology(host, model, pageKey);
      if (pageKey === 'claims_sources') renderSourceCatalog(host, model);
    }
    state.currentView = pageKey;
    if (root.history && root.location) root.history.replaceState(null, '', `#${pageKey}`);
  }

  function renderCurrent(rootElement, loaded) {
    const documentObject = rootElement.ownerDocument || root.document;
    const model = loaded.model;
    const state = {
      status: 'ready',
      applicationVersion: APPLICATION_VERSION,
      releaseIdentity: loaded.manifest.release_identity,
      currentStateReleaseIdentity: model.release.release_identity,
      chronologyCount: model.counts.chronology_records,
      currentOsintCutoff: model.release.current_osint_cutoff,
      currentView: 'start_here',
      performance: loaded.performance,
      model
    };
    const app = element(documentObject, 'div', 'atlas-app');
    const header = append(app, 'header', 'app-header');
    const headerInner = append(header, 'div', 'header-inner');
    const brand = append(headerInner, 'div', 'brand');
    append(brand, 'p', 'eyebrow', 'Public evidence record');
    append(brand, 'h1', '', 'Iran War Evidence Atlas');
    append(brand, 'p', '', `Current OSINT cutoff · ${model.release.current_osint_cutoff_display}`);
    const badge = append(headerInner, 'div', 'release-badge');
    append(badge, 'strong', '', 'Current record validated');
    append(badge, 'span', '', loaded.manifest.release_identity);
    const grid = append(app, 'div', 'app-grid');
    const nav = append(grid, 'nav', 'section-nav');
    nav.setAttribute('aria-label', 'Current record sections');
    const pageHost = append(grid, 'main', 'page-host');
    pageHost.id = 'atlas-page';
    const buttons = new Map();
    Object.entries(PAGE_CONFIG).forEach(([key, config]) => {
      const button = append(nav, 'button', '', config.label);
      button.type = 'button';
      button.dataset.page = key;
      buttons.set(key, button);
      button.addEventListener('click', () => {
        buttons.forEach((item, itemKey) => item.toggleAttribute('aria-current', itemKey === key));
        renderPage(pageHost, model, state, key);
        pageHost.focus({ preventScroll: true });
      });
    });
    pageHost.tabIndex = -1;
    const requested = root.location && root.location.hash ? root.location.hash.slice(1) : '';
    const initialPage = Object.prototype.hasOwnProperty.call(PAGE_CONFIG, requested) ? requested : 'start_here';
    buttons.get(initialPage).setAttribute('aria-current', 'page');
    renderPage(pageHost, model, state, initialPage);
    const footer = append(app, 'footer', 'page-footer');
    append(footer, 'span', '', `${model.release.release_identity} · Generated read model; canonical packages remain authoritative. `);
    const archive = append(footer, 'a', '', 'Open archived records');
    archive.href = ARCHIVE_URL;
    rootElement.replaceChildren(app);
    rootElement.className = 'atlas-ready';
    rootElement.dataset.status = 'ready';
    rootElement.setAttribute('aria-busy', 'false');
    root.ATLAS_PUBLIC_STATE = state;
    root.ATLAS_PUBLIC_MODEL = model;
    try { root.sessionStorage && root.sessionStorage.removeItem(RELOAD_ATTEMPT_KEY); } catch (_) { /* storage is optional */ }
    if (typeof root.CustomEvent === 'function' && root.dispatchEvent) {
      root.dispatchEvent(new root.CustomEvent('atlaspublicready', { detail: {
        releaseIdentity: state.releaseIdentity,
        chronologyCount: state.chronologyCount,
        currentOsintCutoff: state.currentOsintCutoff
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
    const section = element(documentObject, 'section', 'error-state');
    append(section, 'p', 'boot-kicker', 'Current record unavailable');
    append(section, 'h1', '', 'The current evidence record could not be loaded.');
    append(section, 'p', '', failureDetail(error));
    if (error && error.code) append(section, 'p', 'error-code', `Error code: ${error.code}`);
    const actions = append(section, 'div', 'error-actions');
    const retryButton = append(actions, 'button', '', 'Retry');
    retryButton.type = 'button';
    retryButton.addEventListener('click', retry || (() => root.location.reload()));
    const archive = append(actions, 'a', '', 'Open archived records');
    archive.href = ARCHIVE_URL;
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
      const loaded = await loadCurrentRecord({
        fetchImpl: settings.fetchImpl,
        modelUrl: settings.modelUrl,
        manifest
      });
      return renderCurrent(rootElement, loaded);
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

(function attachAtlasTemporal(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AtlasTemporal = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildAtlasTemporal() {
  'use strict';

  function day(value) {
    const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  }

  function isAvailable(value, cutoff) {
    const candidate = day(value);
    return Boolean(candidate && candidate <= cutoff);
  }

  function sourceAvailable(source, cutoff) {
    return Boolean(source && isAvailable(source.publication_date, cutoff));
  }

  function knownByState(event, cutoff, sourcesById) {
    const firstReported = day(event && event.first_reported);
    if (!firstReported || firstReported > cutoff) return { visible: false, sources: [] };
    const firstVerified = day(event.first_verified);
    const verifiedByCutoff = Boolean(firstVerified && firstVerified <= cutoff);
    const refs = (event.source_refs || []).map(ref => typeof ref === 'string' ? ref : ref.source_id);
    const sources = refs.filter(id => sourceAvailable(sourcesById.get(id), cutoff));
    return {
      visible: true,
      verifiedByCutoff,
      badge: verifiedByCutoff ? 'VERIFIED BY CUTOFF' : 'REPORTED / NOT VERIFIED BY CUTOFF',
      sources,
      hideCurrentAdjudication: true
    };
  }

  function asOfVisible(event, cutoff) {
    const eventDay = day(event && event.event_date);
    return Boolean(eventDay && eventDay <= cutoff);
  }

  function supportsHour(records) {
    return (records || []).some(record => record && record.hour_bucket != null && record.hour_bucket !== '');
  }

  function knownByProjection(event, cutoff, sourcesById) {
    const state = knownByState(event, cutoff, sourcesById);
    if (!state.visible) return null;
    return {
      event_id: event.event_id,
      event_type: event.event_type,
      record_class: event.record_class,
      actors: event.actors || [],
      target: event.target || '',
      first_reported: event.first_reported,
      first_verified: state.verifiedByCutoff ? event.first_verified : null,
      badge: state.badge,
      sources: state.sources
    };
  }

  function currentAssessmentLabel(cutoff) {
    return `CURRENT ASSESSMENT — reviewed through ${cutoff}`;
  }

  function hourBucket(record) {
    return record && record.hour_bucket != null && record.hour_bucket !== '' ? record.hour_bucket : null;
  }

  function filterByGranularity(records, granularity, cutoff) {
    if (granularity === 'war') return records;
    if (granularity === 'month') return records.filter(row => row.month === cutoff.slice(0, 7));
    if (granularity === 'day' || granularity === 'hour') return records.filter(row => row.day === cutoff);
    if (granularity === 'week') {
      const selected = records.find(row => row.day === cutoff);
      return selected ? records.filter(row => row.iso_week === selected.iso_week) : [];
    }
    return records;
  }

  return { day, isAvailable, sourceAvailable, knownByState, knownByProjection, asOfVisible, currentAssessmentLabel, hourBucket, supportsHour, filterByGranularity };
}));

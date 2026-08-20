(function attachAtlasCosting(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AtlasCosting = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildAtlasCosting() {
  'use strict';
  function calculate(quantityRecord, priceRecord) {
    if (!quantityRecord || !priceRecord || !Number.isFinite(quantityRecord.quantity) ||
        !Number.isFinite(priceRecord.unit_cost_low) || !Number.isFinite(priceRecord.unit_cost_high)) return null;
    const quantityName = String(quantityRecord.munition || quantityRecord.item || '').toLowerCase();
    const priceName = String(priceRecord.munition || priceRecord.item || '').toLowerCase();
    if (!quantityName || quantityName !== priceName) return null;
    if (priceRecord.currency && quantityRecord.currency && priceRecord.currency !== quantityRecord.currency) return null;
    return {
      low: quantityRecord.quantity * priceRecord.unit_cost_low,
      high: quantityRecord.quantity * priceRecord.unit_cost_high,
      currency: priceRecord.currency || quantityRecord.currency || 'USD',
      qualifier: quantityRecord.quantity_qualifier === '>' ? '>' : quantityRecord.quantity_qualifier === '<' ? '<' : '',
      method: `${quantityRecord.quantity_qualifier || '='}${quantityRecord.quantity} × ${priceRecord.unit_cost_low}${priceRecord.unit_cost_low === priceRecord.unit_cost_high ? '' : `–${priceRecord.unit_cost_high}`}`
    };
  }
  function formatUsd(value) {
    if (!Number.isFinite(value)) return 'UNRESOLVED';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    return `$${value.toLocaleString('en-US')}`;
  }
  return { calculate, formatUsd };
}));

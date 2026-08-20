(function attachAtlasSafe(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AtlasSafe = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildAtlasSafe() {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function safeExternalUrl(value) {
    try {
      const parsed = new URL(String(value || '').trim());
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
    } catch (error) {
      return null;
    }
  }

  function safeRelativeUrl(value) {
    try {
      const raw = String(value || '').trim().replace(/\\/g, '/');
      if (!raw || raw.startsWith('//') || raw.startsWith('/') || /[\u0000-\u001f\u007f]/.test(raw)) return null;
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
      const parts = raw.split('/');
      if (parts.some(part => part === '..')) return null;
      return parts.map(part => encodeURIComponent(decodeURIComponent(part))).join('/');
    } catch (error) { return null; }
  }

  function externalLink(label, url, title) {
    const safe = safeExternalUrl(url);
    if (!safe) return `<span class="source-blocked">${escapeHtml(label || 'blocked link')} — unsafe URL rejected</span>`;
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a target="_blank" rel="noopener noreferrer" href="${escapeHtml(safe)}"${titleAttr}>${escapeHtml(label)}</a>`;
  }

  function sourceLinks(rows) {
    return (rows || []).map(row => externalLink(row && row[0], row && row[1])).join(' ');
  }

  function safeDomId(value) {
    return String(value == null ? '' : value).replace(/[^A-Za-z0-9_.:-]/g, '-');
  }

  return { escapeHtml, safeExternalUrl, safeRelativeUrl, externalLink, sourceLinks, safeDomId };
}));

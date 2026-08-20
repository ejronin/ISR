'use strict';
const assert = require('node:assert/strict');
const safe = require('../js/safe-render.js');

assert.equal(safe.safeExternalUrl('javascript:alert(1)'), null);
assert.equal(safe.safeExternalUrl('data:text/html,<svg onload=alert(1)>'), null);
assert.equal(safe.safeExternalUrl('https://example.org/a'), 'https://example.org/a');
assert.equal(safe.safeRelativeUrl('../secret'), null);
assert.equal(safe.safeRelativeUrl('snapshots/Iran War Map 20260820.html'), 'snapshots/Iran%20War%20Map%2020260820.html');
const payload = '<img src=x onerror=alert(1)>';
assert.equal(safe.escapeHtml(payload), '&lt;img src=x onerror=alert(1)&gt;');
const blocked = safe.externalLink('hostile', 'javascript:alert(1)');
assert.ok(!blocked.includes('<a '));
assert.ok(safe.externalLink('<script>', 'https://example.org').includes('&lt;script&gt;'));
console.log('security-rendering: hostile HTML and URL fixtures rejected');

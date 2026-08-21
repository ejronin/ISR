'use strict';
/* RETIRED v1.3.3 emergency compatibility path.
   The observer-based hotfix has been removed. A stale cached loader that requests this file
   is redirected to the integrated rebuild module exactly once. */
(function retiredHotfixCompatibilityLoader() {
  if (window.__ISR_REBUILD_133__ || document.querySelector('script[data-isr-rebuild-compat]')) return;
  window.__ISR_COMPLETE_FIX_133__ = true;
  const script = document.createElement('script');
  script.src = './js/rebuild-v1.3.3.js?v=20260821-rebuild4';
  script.async = false;
  script.dataset.isrRebuildCompat = 'true';
  document.head.appendChild(script);
}());

'use strict';
(function ISRChinaOilSourcingShiftR1(){
  if (window.__ISR_CHINA_OIL_SHIFT_R1__) return;
  window.__ISR_CHINA_OIL_SHIFT_R1__ = true;

  const DATA = './data/china-oil-sourcing-shift-r1.json?v=20260825-r1';
  let model = null;
  let layer = null;
  let lastView = window.atlasActiveView || window.AtlasState?.get?.().activeView || 'snapshot';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeLinks(sources){
    return (sources || []).map(([label,url]) => {
      try {
        const u = new URL(url);
        if (u.protocol !== 'https:') return '';
        return `<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
      } catch { return ''; }
    }).filter(Boolean).join(' ');
  }

  function styleFor(route){
    if (route.line_class === 'degraded_legacy') return { color:'#f59e0b', weight:5, opacity:.82, dashArray:'10 8' };
    if (route.line_class === 'expanded_substitute') return { color:'#22c55e', weight:5, opacity:.90, dashArray:null };
    return { color:'#38bdf8', weight:4, opacity:.84, dashArray:'4 6' };
  }

  function popup(route){
    return `<div class="atlas-popup china-oil-shift-popup">
      <h3>${esc(route.name)}</h3>
      <div class="route-label">${esc(route.status)}</div>
      <p><b>${esc(route.shift_role)}</b></p>
      <p>${esc(route.flow_evidence)}</p>
      <p>${esc(route.note)}</p>
      <div class="sources">${safeLinks(route.sources)}</div>
    </div>`;
  }

  function nodePopup(route,node){
    return `<div class="atlas-popup china-oil-shift-popup">
      <h3>${esc(node[0])}</h3>
      <div class="route-label">${esc(route.name)}</div>
      <p>${esc(route.shift_role)}</p>
      <small>Schematic trade-corridor node; not a live vessel position, exact terminal track, or targeting-quality location.</small>
      <div class="sources">${safeLinks(route.sources)}</div>
    </div>`;
  }

  function build(){
    if (layer || !window.L || !window.atlasMap || !model) return;
    layer = L.featureGroup();
    layer._isrChinaOilShiftR1 = true;
    (model.routes || []).forEach(route => {
      const style = styleFor(route);
      (route.segments || []).forEach(segment => {
        L.polyline(segment.coords || [], style)
          .addTo(layer)
          .bindPopup(popup(route), { maxWidth: 460 });
      });
      (route.nodes || []).forEach(node => {
        L.circleMarker([node[1], node[2]], {
          radius: 5,
          color: '#07111f',
          weight: 2,
          fillColor: style.color,
          fillOpacity: .96
        }).addTo(layer).bindPopup(nodePopup(route,node), { maxWidth: 420 });
      });
    });
    window.ISRChinaOilSourcingShiftR1 = { layer, model, sync, fit };
    sync();
  }

  function manualOverride(){
    return window.AtlasState?.get?.().manualLayerOverrides?.['Trade / logistics routes'];
  }
  function shouldShow(view = lastView){
    const override = manualOverride();
    if (override === true) return true;
    if (override === false) return false;
    return view === 'arctic';
  }
  function sync(view = window.atlasActiveView || window.AtlasState?.get?.().activeView || lastView){
    lastView = view || lastView;
    if (!layer || !window.atlasMap) return;
    if (shouldShow(lastView)) layer.addTo(window.atlasMap);
    else window.atlasMap.removeLayer(layer);
  }
  function fit(){
    if (!layer || !window.atlasMap) return;
    const bounds = layer.getBounds?.();
    if (bounds?.isValid?.()) window.atlasMap.fitBounds(bounds, { padding:[24,24], maxZoom:3 });
  }

  async function init(){
    try {
      const response = await fetch(DATA, { cache:'no-store' });
      if (!response.ok) throw new Error(`China oil sourcing shift ${response.status}`);
      model = await response.json();
    } catch (error) {
      console.warn('China oil sourcing shift map unavailable.', error);
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (window.L && window.atlasMap) {
        clearInterval(timer);
        build();
        const button = document.querySelector('[data-layer-name="Trade / logistics routes"]');
        button?.addEventListener('click', () => setTimeout(() => sync(), 0));
        window.AtlasState?.subscribe?.(state => {
          if (state?.activeView) lastView = state.activeView;
          sync(lastView);
        });
      } else if (tries > 160) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
}());

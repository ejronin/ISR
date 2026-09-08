from pathlib import Path

p = Path('tests/browser-public-map-phase6.js')
text = p.read_text()
old = """    const shipping = await cdp.eval(`(() => {
      const button = document.querySelector('.map-route-button');
      button?.click();
      return {
        routeButtons: document.querySelectorAll('.map-route-button').length,
        paths: document.querySelectorAll('.leaflet-atlas-routes-pane path').length,
        flow: document.querySelectorAll('.route-flow-marker').length,
        card: document.querySelector('.map-selection-card')?.innerText || '',
        drawer: Boolean(document.querySelector('.map-selection-card details[data-component=\"SharedEvidenceDrawer\"]')),
        equivalent: document.querySelector('[data-phase6-map-equivalent]')?.textContent || ''
      };
    })()`);"""
new = """    const shipping = await cdp.eval(`(() => {
      const button = document.querySelector('.map-route-button');
      const routeMap = button?.closest('[data-component=\"MapView\"]');
      button?.click();
      return {
        routeButtons: document.querySelectorAll('.map-route-button').length,
        paths: document.querySelectorAll('.leaflet-atlas-routes-pane path').length,
        flow: document.querySelectorAll('.route-flow-marker').length,
        card: routeMap?.querySelector('.map-selection-card')?.innerText || '',
        drawer: Boolean(routeMap?.querySelector('.map-selection-card details[data-component=\"SharedEvidenceDrawer\"]')),
        equivalent: routeMap?.querySelector('[data-phase6-map-equivalent]')?.textContent || ''
      };
    })()`);"""
if text.count(old) != 1:
    raise SystemExit(f'Phase 6 shipping interaction block changed: found {text.count(old)} matches')
p.write_text(text.replace(old, new, 1))

# Third-party notices

## Leaflet

Leaflet 1.9.4 is vendored under `vendor/leaflet/` so the atlas does not execute JavaScript or load CSS from a runtime CDN.

- Project: https://leafletjs.com/
- Source: https://github.com/Leaflet/Leaflet/tree/v1.9.4
- License: BSD-2-Clause

OpenStreetMap raster tiles are still requested at runtime as map imagery and carry the required on-map attribution. They are not an executable dependency.

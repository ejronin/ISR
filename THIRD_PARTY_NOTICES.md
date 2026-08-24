# Third-party notices

## Leaflet

Leaflet 1.9.4 is vendored under `vendor/leaflet/` so the atlas does not execute JavaScript or load CSS from a runtime CDN.

- Project: https://leafletjs.com/
- Source: https://github.com/Leaflet/Leaflet/tree/v1.9.4
- License: BSD-2-Clause

OpenStreetMap raster tiles are still requested at runtime as map imagery and carry the required on-map attribution. They are not an executable dependency.

## Mermaid

Mermaid 11.6.0 is vendored under `vendor/mermaid/` for the Endgame/MoU adjudication graph. The Atlas loads the local browser bundle under the existing self-hosted Content Security Policy; no Mermaid runtime CDN is used.

- Project: https://mermaid.js.org/
- Source package: `mermaid@11.6.0`
- License: MIT
- Pinned runtime metadata and SHA-256: `vendor/mermaid/VERSION.json`
- License text: `vendor/mermaid/LICENSE`

Mermaid is configured with strict security mode and HTML labels disabled. Atlas code builds graph definitions from structured adjudication data and attaches interaction to known rendered node IDs rather than Mermaid JavaScript/click directives.

## Lucide eye icon

The locally vendored BDA imagery symbol at `assets/icons/imagery.svg` is the Lucide `eye` icon at commit `33a44aa8b0b43d9b0ed14eb08860a1b5550a1573`.

- Project: https://lucide.dev/
- Source: https://github.com/lucide-icons/lucide/blob/33a44aa8b0b43d9b0ed14eb08860a1b5550a1573/icons/eye.svg
- License: ISC

Copyright (c) 2026 Lucide Icons and Contributors. Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is granted, provided that the copyright notice and permission notice appear in all copies. The software is provided “as is” without warranty.

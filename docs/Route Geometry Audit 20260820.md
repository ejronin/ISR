# Route geometry audit — 2026-08-20

Scope: every polyline rendered by the current atlas. The authoritative `data/integration-v1.2/*.json` ledger was not modified.

| Route | Domain | Audit result | Display rule |
|---|---|---|---|
| China–Europe Northern Sea Route container corridor | Maritime | Adjusted the East China Sea, Tsushima Strait, Sea of Japan, La Pérouse/Okhotsk, Bering, Russian Arctic, Barents/Norwegian Sea, and North Sea waypoints so the displayed line does not visibly cross the Korean peninsula or Eurasian landmass. | `SCHEMATIC`; seasonal announced service; not a vessel track. |
| Russia–China Arctic crude corridor | Maritime | Adjusted the reverse Pacific approach through the Bering, Okhotsk, Sea of Japan, Tsushima, and East China Sea sectors. Arctic and Barents waypoints remain water-plausible at atlas scale. | `SCHEMATIC`; active-season corridor; not live AIS or exact cargo routing. |

No rail or road polyline is rendered by the current application. The audited display coordinates live in the presentation layer so the underlying evidence records and their hashes remain unchanged.

# Public reference geography

Current public maps use a checked-in, deterministic subset of Natural Earth Admin-0 Countries version 5.1.1. Natural Earth data is public domain.

- `regional_50m` contains the countries needed for the Gulf, Iran, Iraq, Red Sea, and nearby context at 1:50m.
- `hormuz_10m` is clipped to the Strait of Hormuz and adjacent Gulf/Gulf of Oman coast at 1:10m.
- The build strips analytical and demographic attributes. It retains only country name, ISO identifier, source scale, and presentation-layer identity.
- The asset role is `PRESENTATION_REFERENCE_GEOGRAPHY`. It is not canonical evidence, chronology, source authority, or an analytical finding.
- Production uses the content-addressed checked-in result. It does not contact Natural Earth or a map-tile provider at runtime.

Development rebuild:

```text
python scripts/build_reference_geography.py --source-50m <pinned-50m.geojson> --source-10m <pinned-10m.geojson>
```

The preprocessor verifies the pinned source SHA-256 values before emitting output. The geography validator independently checks the role, version, layers, coordinate bounds, asset size, and maritime route geometry.

For maritime validation, every stored maritime segment is sampled against the packaged land polygons. Shoreline endpoints receive a small endpoint allowance; interior samples may not enter land. This is a deterministic presentation-safety check against visibly impossible sea routes, not navigation-grade routing.

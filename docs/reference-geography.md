# Public reference geography

Current public maps use a checked-in, deterministic subset of Natural Earth Admin-0 Countries version 5.1.1. Natural Earth data is public domain.

- `regional_50m` contains the countries needed for the Gulf, Iran, Iraq, Red Sea, and nearby context at 1:50m.
- `hormuz_10m` is clipped to the Strait of Hormuz and adjacent Gulf/Gulf of Oman coast at 1:10m.
- The build strips analytical and demographic attributes. It retains only country name, ISO identifier, source scale, and presentation-layer identity.
- The asset role is `PRESENTATION_REFERENCE_GEOGRAPHY`. It is not canonical evidence, chronology, source authority, or an analytical finding.
- Production uses the content-addressed checked-in result. It does not contact Natural Earth or a map-tile provider at runtime.

Development rebuild:

```text
python scripts/build_reference_geography.py --fetch-source-dir <build-only-cache> --check
```

The fetch mode uses exact Natural Earth v5.1.1 URLs, verifies the 1:50m SHA-256 `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb` and 1:10m SHA-256 `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`, then requires byte-for-byte reproduction of the checked-in asset. A mismatched existing cache fails closed. CI runs this networked build-time check; the public runtime remains entirely local. Maintainers may instead supply both already-downloaded inputs with `--source-50m` and `--source-10m`; the same hashes are mandatory.

The geography validator independently checks the role, version, layers, coordinate bounds, asset size, and maritime route geometry. Generation determinism and semantic validation are separate release gates.

For maritime validation, every stored maritime segment is sampled against the packaged land polygons. Shoreline endpoints receive a small endpoint allowance; interior samples may not enter land. This is a deterministic presentation-safety check against visibly impossible sea routes, not navigation-grade routing.

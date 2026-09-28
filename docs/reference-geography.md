# Public reference geography

Current public maps use checked-in, deterministic Natural Earth version 5.1.1 reference geography. Natural Earth data is public domain.

- `western_context_110m` supplies lightweight filled land west to the U.S. East Coast for wide connected-conflict maps at 1:110m.
- `regional_50m` contains the countries needed for the Gulf, Iran, Iraq, Red Sea, and nearby context at 1:50m.
- `hormuz_10m` is clipped to the Strait of Hormuz and adjacent Gulf/Gulf of Oman coast at 1:10m.
- The build strips analytical and demographic attributes. It retains only country name, ISO identifier, source scale, and presentation-layer identity.
- The asset role is `PRESENTATION_REFERENCE_GEOGRAPHY`. It is not canonical evidence, chronology, source authority, or an analytical finding.
- Production uses the content-addressed checked-in result. It does not contact Natural Earth or a map-tile provider at runtime.

Development rebuild:

```text
python scripts/build_reference_geography.py --fetch-source-dir <build-only-cache> --check
```

The fetch mode uses exact Natural Earth v5.1.1 URLs and verifies all three pinned inputs: 1:50m Admin-0 SHA-256 `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb`, 1:10m Admin-0 SHA-256 `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`, and 1:110m Land SHA-256 `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`. It then requires byte-for-byte reproduction of the checked-in asset. A mismatched existing cache fails closed. CI runs this networked build-time check; the public runtime remains entirely local. Maintainers may instead supply all three already-downloaded inputs with `--source-50m`, `--source-10m`, and `--source-110m-land`; the same hashes are mandatory.

The geography validator independently checks the role, version, layers, coordinate bounds, asset size, and maritime route geometry. Generation determinism and semantic validation are separate release gates.

For maritime validation, every stored maritime segment is sampled against the packaged land polygons. Shoreline endpoints receive a small endpoint allowance; interior samples may not enter land. This is a deterministic presentation-safety check against visibly impossible sea routes, not navigation-grade routing.

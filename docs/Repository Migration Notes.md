# Repository Migration Notes

## At handoff

The live GitHub repository was still using the v2.7 generation, while the latest local working product had advanced to v2.9 with the verified-loss dashboard and subsequent corrections.

### Precedence

1. Root `index.html` in this package — **v2.9 working UI baseline**.
2. `data/*v2_7*` — useful supporting/migration ledgers from the live repo.
3. `archive/published v2.7/` — historical published implementation for comparison only.
4. `reference/` — project map/evidence protocols and earlier persistent-map material.

Do not replace v2.9 with the archived v2.7 page.

## Recommended first engineering pass

1. Diff v2.9 against published v2.7.
2. Inventory every working panel/control in v2.9.
3. Extract embedded v2.9 datasets into structured JSON without changing displayed facts.
4. Merge the v2.7 information-war datasets into the new schema.
5. Refactor UI modules while keeping non-map content independent of map initialization.
6. Add snapshot browser and daily updater compatibility.
7. Add Open Graph/social-preview assets.
8. Test desktop/mobile before replacing live `index.html`.


## Engineering migration completed in package

The handoff v2.9 monolith has been split into external CSS, JavaScript and structured JSON while preserving the original static evidence markup as a progressive-enhancement fallback. Social metadata, a 1200×630 preview asset, an Introduction/Methodology mode, a Historical snapshots browser and mobile map behavior were added. No evidence records were intentionally deleted or rewritten during this engineering pass.

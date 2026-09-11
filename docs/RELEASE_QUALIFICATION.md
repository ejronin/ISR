# Current Release Qualification

Atlas release qualification follows `docs/ENGINEERING_DOCTRINE.md`.

The current production gate protects four things:

1. evidence integrity;
2. public semantic fidelity;
3. current reader behavior/accessibility;
4. deterministic release/deployment integrity.

Historical presentation validators are not current product authority. Their classification and any extracted live evidence protections are recorded in `docs/HISTORICAL_VALIDATOR_CLASSIFICATION.md`.

Current qualification must not require the retired root application, legacy phase-one HTML, dated update loaders, ENDGAME presentation modules, historical workspace CSS/JS, or exact historical public copy merely because those artifacts remain in the repository.

The release rule remains: qualify the exact PR head, merge only that head, then verify the exact merge SHA and Pages deployment.

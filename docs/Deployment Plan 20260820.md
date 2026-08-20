# Deployment Plan — 2026-08-20

Target repository: `ejronin/ISR`  
Target branch: `main`  
Stable Pages URL: `https://ejronin.github.io/ISR/`

## Verified current live baseline

The current GitHub `main` root `index.html` blob SHA is `b7991ed72c9f66bf33234a5fd833905b20cf76c7`, exactly matching the handoff's archived published v2.7 `index.html`. The live `README.md` and three v2.7 information-environment data files also match the handoff copies by Git blob SHA.

## Publish scope

### Replace

- `index.html`
- `README.md`

### Preserve unchanged

- `data/information_war_claims_v2_7.csv`
- `data/information_war_claims_v2_7.json`
- `data/influence_networks_v2_7.json`

### Add

- `.nojekyll`
- `.github/workflows/validate.yml`
- `assets/social-preview.png`
- `css/app.css`
- `js/navigation.js`
- `js/app.js`
- modular domain JSON files under `data/`
- `snapshots/Iran War Map 20260820.html`
- `scripts/validate.py`
- operating docs and maintainer prompts

The `reference/` directory and the archived v2.7 duplicate page are engineering-handoff material and are **not required for public deployment**. Git history already preserves the published v2.7 generation.

## Pre-publish gate

Run:

```bash
python scripts/validate.py
```

Expected result: `Validation passed` and exit code 0.

## Post-publish gate

Open the GitHub Pages URL and test desktop/mobile navigation, the map degraded mode, Verified losses, Historical snapshots, Open Graph preview and the stable canonical URL. Do not start the daily updater until this migration is live and visually verified.

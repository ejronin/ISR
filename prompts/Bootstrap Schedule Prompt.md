# Bootstrap / Schedule Prompt

Use this prompt in a ChatGPT conversation that has the GitHub connection available and supports scheduled tasks.

---

Set up the **Iran War Public Evidence Atlas** daily maintenance process.

Repository: `ejronin/ISR`  
Public site: `https://ejronin.github.io/ISR/`  
Timezone: `America/New_York`

1. Read the repository before making any changes.
2. Treat the v2.9 working dashboard supplied in the engineer handoff as the UI baseline. Preserve its loss-dashboard functionality and incorporate the existing repo datasets; do not regress to v2.7.
3. Read and follow the attached/available **Daily OSINT GitHub Maintainer — Master Prompt** in full.
4. Schedule that maintenance prompt to execute **every 24 hours**.
5. On every run, perform a broad OSINT collection sweep, preserve the pre-update board as `snapshots/Iran War Map YYYYMMDD.html`, update the site/data, validate desktop/mobile behavior, then publish to `main` only if validation passes.
6. Keep the public URL stable: `https://ejronin.github.io/ISR/`.
7. If GitHub write permissions are unavailable, do not report success. Produce a ready-to-upload ZIP and identify the permission failure.
8. After creating the schedule, tell me the exact recurrence/time and what will happen on each run.

Do not ask me to manually repeat these requirements unless a genuinely missing credential/permission prevents execution.

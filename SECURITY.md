# Security policy

## Reporting a vulnerability

Please use the repository’s **Security** tab to submit a private vulnerability report. Do not include exploit details, sensitive personal data, or active credentials in a public issue.

## Static-site threat model

The atlas treats every dataset string and evidence URL as untrusted presentation input. Dynamic text is escaped, evidence links accept only HTTP(S), external links use `noopener noreferrer`, and hostile HTML/URL fixtures run in CI. Inline executable event handlers are prohibited. Leaflet is pinned and served from this repository; OpenStreetMap tiles remain an external image service.

A restrictive Content Security Policy permits scripts and fonts only from this origin, rejects plugins/objects and forms, and limits images to this origin, data/blob URLs, and OpenStreetMap tiles. Legacy evidence markup still uses inline style attributes, so `style-src 'unsafe-inline'` remains the documented CSP exception. GitHub Pages does not expose custom response headers for this repository; the policy is therefore delivered by a meta element, where `frame-ancestors` is not enforceable. Platform-level clickjacking headers require a host that supports custom headers.

Pull requests validate but cannot deploy. The Pages workflow runs only from `main`, uses least-privilege job permissions and immutable action SHAs, and publishes a machine-readable deployed-commit/ledger/hash manifest.

## Supported version

Security fixes apply to the current `main` deployment. Historical snapshots are immutable evidence artifacts and may retain older presentation code; they must not be treated as executable dependencies of the current atlas.

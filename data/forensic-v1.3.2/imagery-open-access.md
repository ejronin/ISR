# Open satellite imagery retrieval and licensing notes

This add-on deliberately does **not** copy commercial Planet/Vantor/Maxar imagery from news articles. It indexes it as corroboration and provides coordinates/dates so an operator can retrieve genuinely open imagery independently.

## Recommended public archives

- **Copernicus Sentinel-1 SAR / Sentinel-2 optical** — use Copernicus Browser. Sentinel-1 is best for all-weather structural-change triage; Sentinel-2 is useful for large optical damage signatures. Bellingcat’s public Iran Conflict Damage Proxy Map demonstrates a reproducible workflow and provides date pairs for Valiasr, Ashura, Fath, Khojir and Al Udeid.
- **USGS Landsat / EarthExplorer** — lower spatial resolution than Sentinel-2 but useful for full-scope smoke, fire, port/industrial and landscape changes.
- **Umbra Open Data** — high-resolution SAR samples/time series, CC BY 4.0. Search the public AWS catalog for Iran/Gulf scenes before assuming coverage.
- **ICEYE / Capella open SAR datasets** — curated CC BY 4.0 samples; coverage is opportunistic rather than guaranteed.
- **NASA OPERA Sentinel-1 RTC** — analysis-ready SAR derivative where scene coverage is available.

## Retrieval recipe

For every target in `imagery-index.json`:
1. Use the listed coordinate or named site and select the stated pre/post dates.
2. Prefer Sentinel-2 L2A for optical comparison and Sentinel-1 GRD/RTC for SAR.
3. Record scene/granule ID, acquisition UTC, orbit/pass, cloud cover (optical), processing level and source URL.
4. Export a wide context crop and a tighter target crop. Keep scale bar, north arrow and acquisition date.
5. Do not label an area “destroyed” solely from a SAR proxy; corroborate with optical imagery, official strike footage, geolocated ground imagery, or independent commercial analysis.
6. Preserve the coordinate-precision label from the JSON. Facility centroids/reference points must not be displayed as exact impact points.

`ADD-GAP-001` remains open specifically for exact scene IDs and redistributable crops because this runtime cannot directly pull provider archives.

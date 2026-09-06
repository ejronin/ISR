# Phase 9 live-site remediation requirements — 2026-09-05

Status: **presentation/read-model acceptance requirements captured during Gate 3 hardening**.

These requirements do not alter the Gate 3 evidence cutoff or canonical adjudications. They govern how the validated Gate 3 state is consumed and presented by Atlas.

## Boundary rule

- If canonical Gate 3 chronology or daily coverage is missing part of the conflict period, that is a Gate 3 evidence defect.
- If canonical Gate 3 chronology and daily coverage span the conflict but a page truncates, filters away, or fails to expose that material, that is a Phase 9 consumer/presentation defect.
- Gate 3 validation must prove wartime daily coverage from **2026-02-28 through 2026-09-05** with no missing dates.
- The canonical chronology may retain **prewar contextual events** when they materially explain the road to war, White House/U.S. justification, Iranian behavior, treaty/policy context, prior attacks, or another causal predicate relevant to understanding later wartime claims or decisions.
- Prewar context must not redefine conflict Day 1 or inflate the war-duration count. It should be represented as context and visually distinguished from wartime events in the public timeline.

## Phase 9 acceptance requirements

### 1. Complete chronology and interactive timeline

- The Detailed chronology view must expose the full validated Gate 3 chronology across the war period, not a partial date range.
- Relevant prewar context may also appear where it materially explains later wartime claims, decisions or causal chains; it should be clearly labeled as prewar context rather than mixed into the wartime duration count.
- Restore or redesign a true chronological timeline with selectable event markers.
- Geolocatable timeline events must be able to select/focus their associated map point; map controls must support useful zoom and selection.
- The replacement should improve on the older timeline/map interaction rather than merely reproducing it.
- Filters may change visibility, but must not silently truncate the underlying chronology.

### 2. Human-facing language invariant

- **No raw enum or database tokens may appear in front-facing copy.**
- Underscore-delimited values such as `naval_strike`, `SUPPORTED_WITH_LIMITATIONS`, `DURABLE_MATERIAL_DAMAGED`, etc. must be rendered in normal human language such as “Naval strike”, “Supported with limitations”, and “Durable material damaged”.
- This applies to headings, badges, filters, tables, cards, tooltips, map popups and accessibility labels.
- Internal identifiers may remain available only in clearly technical/audit detail where a user deliberately expands provenance/record metadata.

### 3. Actor and side identification

- State actors/owners shown on relevant cards should display the appropriate flag alongside the human-readable actor name.
- Imagery/BDA records must clearly identify the side/owner represented, including a flag where the actor is a state.
- **Do not assign host-state flags to non-state actors.** Hezbollah, the Houthis and similar non-state entities retain their own identity treatment rather than inheriting Lebanon/Yemen flags.

### 4. Loss-ledger discoverability and side separation

- Iran losses must be easy to find from primary navigation and/or the relevant losses page.
- The loss ledger must be visually separated by side rather than presenting one undifferentiated stream.
- At minimum, provide clear high-level groupings for Iran/aligned and U.S./coalition; additional sides/categories may be exposed where the canonical data supports them.
- Loss accounting classes and claim-only records must remain distinguishable. Target counts and official claims must not be presented as verified losses.
- Filters must refine an already intelligible side-separated presentation, not be required merely to understand whose losses are being shown.

### 5. Remove internal/GPT-style instructions from public presentation

- Internal implementation notes, validator instructions and analyst-to-system directives must not render as reader-facing prose.
- Example to remove/rewrite: “Do not add the headline categories” and similar wording that reads like an instruction to the application/model.
- If the underlying methodology matters to a reader, rewrite it as concise explanatory prose, e.g. an expandable “How casualty totals are counted” panel.
- Public copy should explain the evidence or method to the reader, not instruct Atlas how to behave.

### 6. BDA / imagery progressive disclosure

- Review the BDA and imagery pages together for redundant presentation.
- Prefer a compact summary/list first, with each item expandable into the richer evidence card/details on demand.
- Do not display both a long flat list and the same full cards simultaneously unless they serve clearly different user tasks.
- Preserve source/evidence expansion, uncertainty and precision limits.
- Do not create damage polygons, percentages, coordinates or other precision that the evidence does not support.

### 7. Reduce forced scrolling and repetition

- Use progressive disclosure: expandable rows/cards, collapsible sections, concise summaries and filters.
- Repeated methodology text should be centralized or collapsible rather than repeated on every record.
- A reader should be able to scan a page for chronology, side, actor, status and loss/effect before opening detailed evidence.
- Expanded detail must preserve provenance and analytical caveats without making the default page a wall of repeated cards.

## Surviving do-not-restore controls

The existing Phase 8.5 / Gate 2 guardrails remain binding during all Phase 9 redesign work:

1. Do not revive stronger Red Sea/regional “founding signatories” wording without later canonical evidence.
2. Do not use host-state flags for Hezbollah, the Houthis or other non-state actors.
3. Archived/retired HTML runtime must not become a current-state dependency.
4. Do not manufacture BDA geometry or precision.

## Acceptance-test intent

Phase 9 should add automated consumer/UI checks where practical for:

- full wartime chronology date-span consumption, while permitting clearly labeled relevant prewar context;
- no raw underscore enum tokens in visible UI text;
- state-actor flag rendering and non-state flag exclusion;
- side-separated loss presentation;
- absence of known internal-instruction phrases in rendered pages;
- expandable BDA/imagery detail without duplicate default rendering;
- timeline-to-map linkage for geolocatable events.

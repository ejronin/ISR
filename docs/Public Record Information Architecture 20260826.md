# Public Record Information Architecture — 2026-08-26

## Purpose

This specification organizes the Iran War Evidence Atlas as a public historical evidence record rather than as an analyst-facing dashboard. It changes presentation hierarchy and discoverability; it does not change the underlying factual ledger, evidence grades, source roles, or adjudication rules.

## Public-reader principle

The interface should answer, in order:

1. What happened?
2. Where and when did it happen?
3. What military, human, economic, and shipping effects followed?
4. What were the parties trying to achieve and what was negotiated?
5. Which public claims are supported, false, contested, or unresolved?
6. Where does the evidence come from and how was the record maintained?

Internal collection lanes, engineering history, model names, source-role machinery, and analyst workflow are audit infrastructure. They remain available, but they must not be prerequisites for understanding the war record.

## Public hierarchy

### Overview

- Current / final status
- Chronology
- Geographic overview where useful

### Military Operations

- Bases & infrastructure
- Campaigns & strikes
- Air / missile / drone operations
- Damage imagery as supporting evidence
- Future migration target: maritime/Hormuz and force-posture records should become explicit subject views when their existing data can be surfaced without duplicating records

### Consequences

- Casualties & losses
- Economic effects
- Shipping & trade effects
- Future migration target: separate physical damage from functional effect wherever the existing record supports that distinction

### Diplomacy & Outcome

- Negotiations and agreements
- Stated objectives
- Concessions and unresolved terms
- Regional alignment
- Outcome evidence and published interpretations

The existing detailed MOU/Hormuz workspace remains an implementation dependency but is reached through this public category rather than through a separate global workspace navigation.

### Claims & Verification

- Claim checks
- Contested / unresolved claims
- Information environment

Placement is determined by evidentiary status and subject matter, not by which side made the claim.

### Sources & Method

- Source register
- Method
- Analytic record
- Historical-record construction
- Archive / immutable snapshots
- Future migration target: corrections, revisions, and unresolved evidence should be first-class audit views when their current data can be exposed cleanly

## Analytic record rule

The Analytic record is subordinate to Sources & Method because it audits interpretation; it is not an evidentiary source for the conflict ledger.

Required temporal chain for each published analytic entry:

**Evidence available then → contemporaneous assessment → subsequent independent evidence → adjudication**

Eligible analytic types include:

- explicit forecast;
- current-state assessment;
- actor / intent assessment;
- causal or mechanism assessment;
- strategic interpretation;
- conditional assessment.

Prospective forecasts may be scored across dimensions such as event, timing, attribution, and mechanism where those dimensions were specified clearly enough to adjudicate. Current-state, intent, and causal assessments should use categorical adjudication unless a quantitative score can be defined without false precision.

The analytic record must include misses, partials, revisions, incorrect mechanisms, unresolved calls, and cases where the outcome was right for the wrong reason. A partial historical sample must not be published as though it were complete.

Removing the entire Analytic record must not alter any factual event, damage, casualty, claim-check, source, or outcome record elsewhere in the Atlas.

## Navigation rule

The public interface uses one primary hierarchy. The former `ATLAS / TIMELINE / ANALYSIS / MOU / SOURCES` workspace bar is implementation plumbing and should not compete with public navigation.

Existing specialist functionality may remain underneath and be invoked from the appropriate public section until it is migrated into native public views.

## Record-page grammar

Where practical, factual records should expose information in a consistent order:

1. What happened
2. Date / location / actors
3. Evidence status
4. What the sources establish
5. What remains disputed or unknown
6. Source links
7. Optional broader context or assessment, clearly separated from the factual finding

The public layer may simplify technical language, but it must not erase evidentiary distinctions.

## Map rule

The map is central when geography materially answers the reader's question. It should not be forced into source, method, correction, or analytic-audit pages when it adds no explanatory value.

Analytic-record maps are forecast/assessment geography only. Their markers must never imply that a forecasted event occurred.

## Outcome / "who won" rule

The Atlas may compare documented stated objectives with observable outcomes, but it must keep separate:

- primary-source statements of objectives;
- observable outcomes and concessions;
- Atlas adjudication methodology;
- reliable independent secondary-source interpretations of the war's outcome.

No composite arithmetic score should silently convert unlike measures—casualties, territory, money, equipment, bargaining outcomes, or political effects—into a universal war score.

## External-use rule

The Atlas should make individual underlying sources easy to locate, inspect, and cite independently of the Atlas. Stable record identifiers and deep links are the preferred future migration path for events, claims, facilities, agreements, sources, and analytic assessments.

The project's own analysis is not a substitute for independent reliable secondary sources. Public structure should therefore maximize source portability and minimize dependence on project-specific terminology.

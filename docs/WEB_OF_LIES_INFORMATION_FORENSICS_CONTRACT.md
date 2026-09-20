# WEB OF LIES — Information Forensics Contract

**Status:** CONTROLLING WORK-PACKAGE CONTRACT  
**Issue:** #153  
**Parent product:** Lie Ledger  
**Authority class:** derived propagation/source-behavior forensics

## 1. Purpose

Web of Lies reconstructs the recoverable information lineage of Lie Ledger claim families: origin, repetition, amplification, mutation, substitution, citation laundering, false independence, correction, retraction, deletion, and collapse.

The analytical unit is the **information lineage**, not the article, account, outlet, speaker, platform, or country.

A different publisher is not automatically an independent source.

## 2. Authority boundaries

### Evidence Integration remains canonical for

- accepted evidence;
- canonical source/provenance records;
- broader event facts;
- chronology;
- physical losses, facilities, casualties, economics, agreements, and canonical historical state.

Web of Lies may create a `FORENSIC_DISCOVERY`. Material discoveries may be flagged `EVIDENCE_PROMOTION_CANDIDATE`. Neither action rewrites the Evidence Locker.

### Information Claims & Forensic Adjudication remains canonical for

- truth adjudication;
- misleading / unsupported / unresolved adjudication;
- knowledge and deception findings;
- Lie Ledger claim-chain semantics;
- atomic proposition decomposition;
- canonical claim relationships and denominators.

Web of Lies consumes these read-only. New research that could change them is flagged `ADJUDICATION_REVIEW_CANDIDATE`.

### Web of Lies owns

- claim origin tracing;
- first-seen chronology;
- source lineage;
- propagation chains;
- cross-platform migration;
- source-family relationships;
- narrative mutation;
- narrative substitution relationships as propagation behavior;
- syndication and amplification;
- citation laundering;
- circular sourcing;
- apparent false independence;
- correction/retraction propagation;
- deletion / stealth-edit history;
- prediction/assertion history;
- source/account behavior profiles;
- revenue/incentive profiles;
- source-quality research;
- bot/coordinated-influence characterization;
- propagation metrics;
- Hall of Shame qualification/ranking;
- source-accountability and direct-verdict presentation.

## 3. Data-integrity invariants

Never silently convert:

- publication into evidence;
- repetition into corroboration;
- a different outlet into an independent origin;
- a different speaker into independent institutional knowledge;
- hedged language into no proposition;
- a new explanation into a correction;
- publicly available contrary evidence into proof that a source personally saw it;
- an unknown observation into zero;
- multiple captures/mirrors of one information event into multiple incidents.

Uncertainty is a valid result.

## 4. Claim-family trace

Each canonical Lie Ledger chain is a Web of Lies claim family.

Recover, where possible:

1. underlying event;
2. earliest known assertion;
3. first publication;
4. first official assertion;
5. initial epistemic posture;
6. first repetition;
7. first cross-platform migration;
8. first major amplification;
9. first mutation;
10. first apparently independent corroboration;
11. actual provenance of that corroboration;
12. first contradictory evidence;
13. first acknowledgement;
14. correction or retraction;
15. replacement explanation;
16. later admission;
17. continuing repetition after correction;
18. final known state.

Preserve both `PUBLISHED_AT` and `FIRST_OBSERVED_AT` when they differ.

## 5. Information-event relationships

Supported relationship/event types include:

`ORIGINATES`  
`REPORTS`  
`REPEATS`  
`AMPLIFIES`  
`SYNDICATES`  
`ATTRIBUTES_TO`  
`CARRIED_BY`  
`PUBLISHED_BY`  
`DERIVES_FROM`  
`SHARES_OFFICIAL_SOURCE`  
`MUTATES_INTO`  
`SUBSTITUTES_FOR`  
`CONTRADICTS`  
`CORRECTS`  
`RETRACTS`  
`ADMITS`  
`CITES_AS_CORROBORATION`  
`CIRCULARLY_DERIVED_FROM`  
`LAUNDERS_PROVENANCE`  
`REUSES_MEDIA_FROM`  
`DISAPPEARS_WITHOUT_CORRECTION`

Source-family relationships may additionally use:

`MEMBER_OF`  
`AFFILIATED_WITH`  
`QUOTES`  
`COMMON_SOURCE`  
`CONTROLLED_BY`  
`OFFICIAL_CHANNEL_OF`

Every relationship requires evidence.

## 6. Epistemic posture

Preserve the posture a source used:

`UNKNOWN`  
`POSSIBLE`  
`MAY_HAVE`  
`LIKELY`  
`PROBABLE`  
`REPORTED`  
`SOURCES_SAY`  
`CONFIRMED`  
`OFFICIAL`  
`DEFINITIVE`  
`DIRECT_OBSERVATION`

Track posture inflation and retreat as part of lineage.

## 7. Source behavior and authenticity

Behavior classes may overlap:

`JOURNALISTIC_SOURCE`  
`OFFICIAL_SOURCE`  
`SUBJECT_MATTER_ANALYST`  
`PARTISAN_COMMENTATOR`  
`ACTIVIST_COMMENTATOR`  
`ENGAGEMENT_FARM`  
`MONETIZED_INFLUENCER`  
`ACTIVIST_GRIFT`  
`NEWS_GRIFT`  
`PSEUDO_ANALYST`  
`CONTENT_AGGREGATOR`  
`PROPAGANDA_SOURCE`  
`AGITPROP_SOURCE`  
`COORDINATED_INFLUENCE`  
`CONFIRMED_BOT`  
`SUSPECTED_AUTOMATION`  
`UNKNOWN`

Authenticity is independent:

`CONFIRMED_BOT`  
`COORDINATED_INAUTHENTIC`  
`SUSPECTED_AUTOMATION`  
`HUMAN_ACCOUNT`  
`UNKNOWN`

Human does not mean credible.

## 8. Shill / advocacy classifications

Keep distinct:

`FINANCIAL_SHILL`  
`ORGANIZATIONAL_SHILL`  
`IDEOLOGICAL_SHILL`  
`PARTISAN_AMPLIFIER`

`FINANCIAL_SHILL` requires an evidenced material benefit or relationship.

`ORGANIZATIONAL_SHILL` requires an evidenced formal/operational relationship that is materially obscured.

`IDEOLOGICAL_SHILL` does not require payment. It requires a recurring evidentiary pattern in which advocacy or partisan loyalty overrides consistent evidence standards.

`PARTISAN_AMPLIFIER` is the lower-strength descriptive class when systematic partisan amplification is established but the stronger evidentiary-asymmetry pattern is not.

Political belief, activism, party support, nationality, or ideology alone never establishes a shill classification.

## 9. Revenue / incentive profile

Record only publicly evidenced channels:

`PLATFORM_MONETIZED`  
`PAID_SUBSTACK`  
`PAID_NEWSLETTER`  
`PATREON`  
`MEMBERSHIP`  
`DONATIONS`  
`AFFILIATE_REVENUE`  
`SPONSORED_CONTENT`  
`AD_SUPPORTED`  
`CREATOR_PAYOUT`  
`UNKNOWN_REVENUE_MODEL`

Verification status is independent of monetization and credibility.

## 10. Correction and prediction behavior

Correction states:

`PROMPT_CORRECTION`  
`VISIBLE_CORRECTION`  
`QUIET_EDIT`  
`STEALTH_EDIT`  
`DELETE_WITHOUT_CORRECTION`  
`IGNORE_CORRECTION`  
`DOUBLE_DOWN`  
`NARRATIVE_REPLACEMENT`  
`ATTACK_THE_CORRECTOR`  
`REPEAT_AFTER_CORRECTION`

Preserve consequential prediction/assertion history with original wording, date, confidence, stated basis, result, acknowledgement, deletion, and revision.

Material edits should preserve `ORIGINAL`, `EDITED`, `DELETED`, `REPOSTED`, `CORRECTED`, and `ARCHIVED` states where recoverable.

## 11. Tragedy / victim exploitation

Claims involving deaths, children, hostages, wounded persons, atrocities, grieving families, disasters, or identifiable victims receive an additional exploitation review.

Supported behavior findings include:

`VICTIM_EXPLOITATION`  
`TRAGEDY_GRIFT`  
`DEATH_GRIFT`  
`WAR_GRIFT`  
`FALSE_CHARITY_EXPLOITATION`

The factual basis must identify the conduct. The label is not evidence.

## 12. Hall of Shame

The Lie Ledger → Web of Lies landing page contains a **Hall of Shame**.

Display the top three **qualifying** sources per supported behavior class.

Selection must never be manual.

The same source may appear in multiple categories.

Ranking is derived from documented forensic records. Relevant metrics may include:

- false/misleading findings connected to canonical Lie Ledger findings;
- distinct claim families;
- unsupported narrative mutations introduced;
- citation-laundering events;
- recycled/falsely contextualized media incidents;
- repetition after contradictory evidence or correction;
- failed claims deleted/abandoned without correction;
- stealth edits;
- corrections issued;
- unique propagation events;
- attributable downstream propagation;
- victim-exploitation incidents;
- prediction failures and corrections.

Follower count, subscriber count, fame, ideology, nationality, raw impressions, and raw repost volume must not independently improve or worsen rank.

Origination, material mutation, laundering, and continued deceptive publishing behavior matter more than passive repetition.

Duplicate captures, mirrors, screenshots, archives, and syndications of the same information event do not create extra incidents.

`ALL_TIME` preserves the complete documented record.

`CURRENT_PERIOD` identifies currently active drivers using a visible, deterministic recency window without rewriting all-time history.

## 13. Appellation and direct-verdict layer

The forensic record must be fair.

The appellation does not have to be charitable.

Web of Lies may characterize an accumulated demonstrated pattern in direct ordinary language, including labels such as:

`LIAR`  
`GRIFTER`  
`PROPAGANDIST`  
`IDEOLOGICAL_SHILL`  
`PSEUDO_ANALYST`  
`TRAGEDY_GRIFTER`  
`DEATH_GRIFTER`

The operative rule is:

> **Prove the pattern. Then call the pattern what it is.**

Do not invent incidents, revenue, coordination, affiliations, victims, or facts.

Do not turn one honest error into a repeated-offender characterization.

Once a qualifying pattern is established, the presentation layer is not required to preserve implausible rhetorical escape hatches or institutional euphemisms.

Profanity may be used as emphasis for demonstrated deceptive, exploitative, reckless, cruel, fraudulent, or morally egregious conduct. It never substitutes for the receipts.

Every severe characterization must link immediately to the incidents and metrics that earned it.

## 14. Public product behavior

Web of Lies remains subordinate to Lie Ledger.

Access:

`Lie Ledger → Web of Lies`

and claim-level:

`Trace`

Each claim family should ultimately provide a structured lineage graph with stable node IDs and node forensic cards.

Mermaid or another graph renderer is presentation only. Structured forensic data is authoritative.

## 15. Incremental operation

Triggers include:

- new/changed Lie Ledger claim family;
- new/changed Evidence Locker source;
- new forensic discovery;
- new correction/retraction;
- source-profile change;
- account/platform state change;
- scheduled re-sweep of active narratives.

Reprocess only affected families where practical.

Historical classifications and graph states remain recoverable when analytically material.

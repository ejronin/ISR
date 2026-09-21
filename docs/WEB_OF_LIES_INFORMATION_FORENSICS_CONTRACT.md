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


## 16. Affirmative public-OSINT collection mission

Web of Lies has an affirmative collection mission across the public information
environment. It is not limited to sources already promoted by Evidence
Integration or Claims Forensics.

The research method is claim-first:

1. begin from a canonical Atlas claim family;
2. search outward for the originating statement and recoverable earlier forms;
3. follow reposts, quotes, articles, video reactions, messaging-channel copies,
   screenshots, mirrors, edits and later corrections;
4. search backward for upstream provenance;
5. search forward for mutation, laundering, monetization, deletion and
   repetition after correction;
6. preserve discoveries that could affect upstream truth/factual state as
   promotion/review candidates rather than silently changing upstream records.

Public collection may include X, TikTok, Facebook, Instagram, YouTube,
Telegram, Reddit, Threads, Bluesky, public Discord material, websites, blogs,
newsletters, Substack, podcasts, collaborative-reference systems, and public
cyber/hacktivist publication surfaces.

Search aggressively; conclude conservatively.

Do not bypass authentication, infiltrate private groups, impersonate users,
purchase stolen data, execute malware, or obtain non-public communications.
Publicly accessible material that originated on an encrypted/private service
may be documented only through a legitimate public receipt.

## 17. Public OSINT receipt contract

Web-of-Lies-native public evidence does not need to become canonical Evidence
Integration material merely to document propagation behavior. A public receipt
must be reproducible enough to identify the observed publication.

Where available preserve:

- platform/surface;
- account/handle and display name;
- stable source identity;
- post/message/revision ID;
- original URL;
- archive URL;
- publication time;
- capture time;
- text/caption excerpt sufficient to identify the proposition;
- media identity;
- upstream attribution;
- original/repost/quote status;
- deletion/availability status;
- cryptographic hash and the scope of what was hashed.

A screenshot by itself is not silently treated as a pristine original. When the
original cannot be recovered, record that limitation explicitly.

Public receipts establish that information was publicly observable. They do not
automatically establish that the proposition was true.

## 18. Independence, repetition and graph detection

The derived registry must separately report:

- independent corroboration;
- derivative repetition;
- common-source repetition;
- unknown independence;
- documented propagation edges;
- citation-laundering findings;
- circular-source components;
- material mutation events.

A hundred accounts repeating one source remain derivative repetition. Different
platforms do not create independence. Multiple handles belonging to one stable
identity do not create multiple independent sources.

Circular sourcing is a graph property, not a rhetorical label. A circular
finding requires a directed provenance cycle in documented relationships.

Citation laundering requires evidence that the lineage materially obscures or
inflates apparent provenance/independence. Ordinary citation or syndication is
not laundering.

## 19. Epistemic mutation

For material changes preserve the prior and later posture where recoverable.

Examples include:

- CLAIM -> FACT;
- REPORTED -> CONFIRMED;
- POSSIBLE -> DEFINITIVE;
- “Iran claims X” -> “X happened”;
- one source -> “multiple reports confirm.”

The semantic change belongs to the event where it occurred. Do not project it
back onto the upstream source.

A carrier accurately reporting “IRGC claims X” does not inherit the truth
status or misconduct of X merely by carrying the attribution.

## 20. Deleted and ephemeral material

Deletion/availability states are distinct:

- AVAILABLE;
- POST_CONFIRMED_DELETED;
- POST_CURRENTLY_UNAVAILABLE;
- ORIGINAL_NOT_RECOVERED;
- DELETION_REASON_UNKNOWN.

Deletion alone is not concealment and does not establish motive.

If a failed/deleted post is later visibly corrected or retracted, the derived
metrics must not continue scoring the earlier event as “without correction.”

## 21. Collaborative-reference / Wikipedia revision forensics

Wikipedia and similar collaborative-reference systems are information
propagation environments when an Atlas claim family materially appears there.

Relevant public receipts include:

- revision IDs and diffs;
- edit summaries;
- article Talk pages;
- user Talk pages;
- Requests for Comment;
- noticeboard/dispute-resolution proceedings;
- page-protection history;
- public administrator actions;
- public sockpuppet/coordination findings;
- source additions/removals;
- repeated restoration of disputed wording.

Research behaviors can include qualifier removal, source substitution,
citation-lineage obscuring, factual adoption of an attributed allegation, or
continued restoration after correction.

Ordinary editorial disagreement is not misconduct. A revert is not proof of
deception. Similar usernames, avatars, timing, or edit style are not sufficient
to merge real-world identities.

Where the community or administrators publicly establish sockpuppetry,
coordination or account relationships, preserve the public finding and its
scope rather than independently expanding it.

A Wikipedia edit is an information event, not proof that the edited proposition
is true.

## 22. Public hacker / hacktivist / cyber-group information forensics

Publicly observable hacker, hacktivist, influence-operation, cybercrime or
state-linked cyber publication surfaces may be researched when they materially
participate in an Atlas claim family.

Relevant open-source surfaces can include public websites, public Telegram/X
accounts, public forums, leak-site announcement pages, public GitHub/code-hosting
accounts used for messaging, public defacement announcements, vendor/CERT
reporting, court records and public platform-enforcement records.

Always separate:

- CLAIMED_COMPROMISE;
- INDEPENDENTLY_VERIFIED_COMPROMISE;
- AUTHENTICITY_OF_RELEASED_MATERIAL;
- DOWNSTREAM_REUSE_OF_THE_CLAIM_OR_MATERIAL.

A group saying “we hacked X” does not establish either the compromise or the
authenticity of claimed material.

Do not obtain private communications, bypass access controls, purchase stolen
material, execute malware, access compromised systems, or download non-public
breached data merely because a group claims to possess it.

## 23. Source identity and source families

Profiles may preserve aliases, platform accounts and a stable identity ID.

Supported identity relationships include:

- SAME_PERSON;
- PROBABLE_SAME_SOURCE;
- ACCOUNT_RENAME;
- PLATFORM_MIGRATION;
- MIRROR_ACCOUNT;
- FAN_REPOST_ACCOUNT;
- UNKNOWN_RELATIONSHIP.

Do not merge identities from superficial resemblance. When identity remains
uncertain, preserve the unresolved account as its own source profile.

Individual creators, accounts, publishers, organizations, state institutions,
channels and networks remain distinct identities unless evidence supports a
relationship. Wrongdoing and personal knowledge do not automatically transfer
across an organization.

## 24. Monetization and incentive evidence

Monetization remains independent from misconduct.

A revenue/incentive classification requires a public receipt tied to the source
profile. Follower count is not revenue. Monetization by itself does not create
a grift finding.

Where revenue cannot be established, preserve UNKNOWN_REVENUE_MODEL rather than
silently treating unknown as zero.

## 25. Deterministic direct verdicts

Direct-verdict output is downstream of documented incidents and source metrics.

The derived registry may generate a blunt factual behavior summary from the
incident record. It must not invent motive, coordination, knowledge, revenue or
personal attribution not established by receipts.

Severe appellations remain subject to their evidentiary trigger. A label never
substitutes for the receipt chain.

## 26. Incremental rebuild equivalence

Affected-family rebuilds must fail closed.

A valid incremental rebuild:

1. requires the previous registry to match the same canonical-state identity;
2. identifies the affected canonical claim-family IDs;
3. preserves unaffected family/network records;
4. rebuilds affected family/network records;
5. recomputes globally coupled source-profile and Hall state where appropriate;
6. produces bytes equivalent to a clean full rebuild from the same canonical
   and forensic inputs.

If preserved unaffected state diverges from a clean rebuild, the incremental
operation fails rather than publishing mixed-generation derived data.

## 27. Anti-bias / anti-drift controls

The implementation must continue proving:

- unknown != false;
- false != Lie;
- unresolved != misconduct;
- carrier != claimant;
- accurate attribution != adoption;
- repetition != corroboration;
- cross-platform != independent;
- partisan != deceptive;
- state media != automatically false;
- monetized != grifter;
- deleted != concealment;
- correction != admission of intentional deception;
- prediction != factual assertion;
- institutional knowledge != personal knowledge.

Wikipedia editor identity, cyber-group attribution and source-family membership
are held to the same standard.


## 28. Corpus-wide coverage accounting

No exemplar claim family may stand in for corpus completion.

The derived registry must publish a coverage row for every canonical Lie Ledger
claim family, including families for which Web of Lies has only the neutral
Claims Forensics anchor.

Coverage states are descriptive:

- CANONICAL_FAMILY_NO_LINEAGE — the canonical family exists but no Web-of-Lies
  event is present;
- ANCHOR_ONLY — Claims Forensics anchors are present but no independent
  Web-of-Lies lineage event has been collected;
- LINEAGE_SEEDED — at least one non-anchor lineage event exists but no
  documented relationship edge is yet present;
- LINEAGE_TRACED — non-anchor lineage events and at least one documented
  relationship edge exist.

These states are not quality grades and do not mean a traced family has been
exhaustively researched.

The registry must separately expose whether non-anchor lineage and
Web-of-Lies-native public OSINT receipts exist for every canonical family.
Missing research remains visible as a gap rather than being inferred away from
the richness of another family.

The F-15E/CSAR family is a regression exemplar only. Its depth, correctness or
public-receipt coverage cannot be used as evidence that the remaining Lie
Ledger families, evidence drawers or propagation ecosystems have been swept.

The machine-readable completion claim remains NONE until a distinct,
documented corpus-wide completion process exists.

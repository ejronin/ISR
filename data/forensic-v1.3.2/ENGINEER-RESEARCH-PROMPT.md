# Engineer Research Prompt — Iranian / IRGC Claim Evolution and Verification

Build a comprehensive historical reconstruction of materially false, contradicted, unsupported, exaggerated, or subsequently revised public claims made by Iranian government officials, the IRGC, Khatam al-Anbiya Central Headquarters, the Iranian military, and Iranian state/semi-official media during the 2026 war.

## Scope

Search from **2026-02-28 through the present collection date**, one calendar day at a time.

Primary Iranian-source corpus must include, at minimum:

- IRGC official statements
- Khatam al-Anbiya Central Headquarters
- Iranian Armed Forces / Army statements
- Foreign Ministry
- Presidency
- Supreme National Security Council where available
- Press TV
- IRNA
- Tasnim
- Fars
- Mehr
- official Iranian Telegram/X/social channels when attributable

Do not treat all Iranian-origin reporting as equivalent.

Record the exact claimant. A Press TV columnist saying something is not automatically an IRGC claim. Tasnim citing an unnamed source is not equivalent to an official IRGC communique.

## Objective

The purpose is **not** to pre-label Iranian claims as lies.

The purpose is to show:

**WHAT WAS CLAIMED → WHEN → BY WHOM → WHAT EVIDENCE EXISTED → HOW THE STORY CHANGED → WHAT LATER EVIDENCE ESTABLISHED.**

Where the evidence establishes fabrication or factual impossibility, mark the claim **FALSE**.

Where a real event occurred but Iran falsely attributed cause, responsibility, magnitude, effectiveness, or outcome, mark it **MISLEADING / FALSE ATTRIBUTION**.

Where Iran supplied no evidence sufficient to establish the claim, mark it **UNSUBSTANTIATED**.

Where subsequent evidence directly conflicts with the claim but cannot absolutely disprove every possible interpretation, mark it **CONTRADICTED**.

Where Iran subsequently changes or replaces the explanation while preserving the same claimed victory/outcome, mark it **NARRATIVE SUBSTITUTION** or **CLAIM EVOLUTION**.

Never upgrade "no evidence" into "proved false."

## Required claim record

Every material claim must receive a unique Claim ID and contain:

- `claim_id`
- `event_id`
- exact UTC and local timestamp
- claimant
- claimant type
- original language
- exact translated claim
- original source URL
- archived/snapshot URL if possible
- article publication time
- article update time
- factual propositions contained in the claim
- evidence offered by claimant
- contemporaneous independent evidence
- later evidence
- contradiction type
- subsequent Iranian revision
- previous claim ID
- next/replacement claim ID
- final disposition
- confidence
- analyst note
- related map objects/events

## Disposition vocabulary

Use only:

- `CONFIRMED`
- `MOSTLY_CONFIRMED`
- `PARTLY_CONFIRMED`
- `UNSUBSTANTIATED`
- `MISLEADING`
- `FALSE_ATTRIBUTION`
- `CONTRADICTED`
- `FALSE`
- `RETRACTED`
- `CORRECTED`
- `NARRATIVE_SUBSTITUTION`
- `UNRESOLVED`

Multiple dispositions are permissible where they describe different propositions inside one statement, but preferably decompose compound claims into separate records.

## Critical analytical rule

Separate:

**EVENT EXISTENCE**

from:

**CLAIMED CAUSE**

from:

**CLAIMED EFFECT**

from:

**CLAIMED OUTCOME.**

Example:

Two American MC-130 aircraft were destroyed in Iran.

That does **not** establish:

"Iran shot down two MC-130 aircraft."

Those are separate propositions.

Likewise:

Iranian fire hit U.S. rescue helicopters.

That does not establish:

"Iran destroyed the helicopters."

And:

A U.S. rescue force lost aircraft/equipment.

That does not establish:

"Iran defeated the rescue mission."

The mission objective must be separately tested.

## Mandatory Case Study 001 — F-15E / Pilot Rescue / Isfahan Narrative

Reconstruct this incident at high resolution.

### Stage A — aircraft identification

Capture Iran/IRGC/Press TV claims identifying the downed aircraft as an **F-35**.

Then capture subsequent identification of the wreckage as an **F-15E Strike Eagle**.

Also capture Iranian state-media acknowledgment that the original F-35 identification was incorrect.

Disposition:

**Initial aircraft identification: FALSE / later CORRECTED.**

Do not dispute that Iran successfully downed the F-15E unless evidence requires it. The point is the aircraft-type claim.

### Stage B — captured pilot / failed extraction

Capture the chronology of:

- reports that the pilot may have been captured;
- stronger reports that the pilot had been captured;
- claims that U.S. efforts to retrieve him failed;
- Iranian searches for the airman;
- subsequent Iranian/IRGC denial that the second airman was actually in custody;
- U.S. recovery of both F-15E crew members.

Decompose the claims.

"Pilot possibly captured" is different from "pilot captured."

"Initial rescue attempt unsuccessful" is different from "the rescue mission failed."

Final outcome must reflect that both crew members were recovered.

### Stage C — U.S. aircraft losses

Capture Iranian claims that Iranian forces:

- destroyed two C-130/MC-130 aircraft;
- destroyed two Black Hawk helicopters;
- inflicted U.S. casualties;
- completely defeated the rescue force.

Then compare those assertions with the later reconstruction.

Known factual distinction requiring explicit treatment:

- Iranian fire did hit U.S. helicopters.
- U.S. aircraft/equipment were genuinely lost.
- Two MC-130 aircraft became disabled.
- U.S. personnel deliberately destroyed disabled aircraft/equipment to prevent capture/compromise.
- The aircrew and rescue force were extracted.

Therefore do **not** represent this as "Iran invented the wreckage."

Represent it as a dispute over:

**who caused the losses, what was actually destroyed by Iranian fire, and whether the mission objective failed.**

If Iran claimed responsibility for destruction subsequently established as U.S. self-destruction, classify that proposition as:

`FALSE_ATTRIBUTION`.

If Iran claimed the rescue itself failed despite recovery of both airmen, classify:

`FALSE` or `CONTRADICTED BY OUTCOME`.

### Stage D — narrative pivot to nuclear raid / uranium theft

Trace the precise evolution.

Identify when Iranian officials first suggested that the rescue operation **could have been** a deception operation related to enriched uranium.

Do not convert a speculative statement into a stronger assertion than the official made.

Then trace subsequent Iranian/state-media escalation into claims that:

- the operation had nothing to do with pilot rescue;
- the real target was an Isfahan nuclear facility;
- U.S. forces had fallen into an Iranian trap;
- the rescue story was a cover;
- Iran thwarted an operation to obtain enriched uranium.

For each escalation, determine whether any new evidence was produced.

Specifically search for evidence of:

- radiological-material handling equipment;
- DOE/NNSA/nuclear-response personnel;
- uranium containment systems;
- excavation equipment;
- heavy engineering equipment;
- tunnel penetration capability;
- nuclear-material transport containers;
- radiation PPE/dosimetry;
- force size appropriate to seizure of the uranium stockpile;
- any movement of uranium;
- any breached nuclear storage area;
- any attempted extraction of nuclear material.

Compare the observed rescue package against known CSAR/SOF rescue requirements.

Also compare it against public reporting describing what an actual operation to seize Iran's enriched uranium would require.

Do not claim that Isfahan contained no enriched uranium. That would be incorrect.

The correct question is whether the rescue operation was an attempted uranium-seizure operation.

The existence of uranium at Isfahan and the existence of U.S. contingency planning to seize uranium are **background facts**, not evidence that this particular operation was that mission.

### Stage E — outcome-preserving narrative substitution

Create a linked visual chain showing when observable facts invalidated or weakened earlier claims.

The user should be able to see something resembling:

**F-35 DOWNED**

→ identification becomes F-15E

**PILOT CAPTURED / RESCUE FAILED**

→ both crew recovered

**IRAN DESTROYED RESCUE AIRCRAFT**

→ some aircraft were hit, but major wreckage included U.S.-destroyed disabled aircraft

**RESCUE WAS A FAILURE**

→ primary recovery objective succeeded

**THEREFORE IT WAS NOT REALLY A RESCUE**

→ nuclear-facility / uranium-heist explanation introduced

The analytical conclusion should not merely say "Iran lied."

Show whether the Iranian narrative repeatedly changed while preserving the invariant political conclusion:

**IRAN DEFEATED THE OPERATION.**

If supported, classify this sequence as:

`OUTCOME-PRESERVING NARRATIVE SUBSTITUTION`.

## Full-war search targets

Apply the same method to claims involving:

- U.S. aircraft shot down or destroyed
- F-35 losses
- F-15 losses
- F-16 losses
- F/A-18 losses
- A-10 losses
- tanker losses
- UAV/MQ-9 losses
- captured or killed American pilots
- captured U.S. personnel
- U.S. casualty numbers
- destruction/damage of U.S. bases
- destruction of radar/air-defense systems
- destruction/damage of naval vessels
- claimed attacks on carriers or carrier groups
- attacks on Gulf bases
- Bahrain claims
- Qatar claims
- Kuwait claims
- Saudi claims
- UAE claims
- desalination infrastructure claims
- oil/refinery claims
- Hormuz vessel numbers
- "total control" / "closed" / "no ship passes without permission" claims
- alleged U.S. retreat or withdrawal
- alleged evacuation of bases
- ceasefire violation chronology
- who fired first after ceasefires
- nuclear-facility claims
- uranium claims
- claimed Russian or Chinese military assistance
- claimed GCC political support
- proxy successes attributed to Iran
- fabricated, recycled, AI-generated, or miscaptioned battlefield imagery

## Source hierarchy for adjudication

Prefer evidence in roughly this order:

1. Primary official documents/data.
2. Physical evidence and independently geolocated imagery.
3. Satellite imagery.
4. Multiple independent major wire services.
5. Specialist technical publications with transparent methodology.
6. High-quality fact-check organizations.
7. State media / combatant statements as evidence of **what was claimed**, not automatically evidence the claim is true.
8. Anonymous social-media accounts only as claim-propagation evidence.

Do not treat CENTCOM, the Pentagon, Israel, GCC governments, Reuters, AP, or any other source as infallible.

Their claims must be tested too.

## Search behavior

For every Iranian claim:

1. Find the earliest discoverable version.
2. Find the strongest later version.
3. Find every correction or change in wording.
4. Find Iranian-source reporting after contrary evidence became public.
5. Determine whether the original story disappeared, was corrected, was quietly abandoned, or was replaced by a new explanation.
6. Search independent sources for physical/technical evidence.
7. Search U.S./Israeli/GCC primary releases.
8. Search satellite and ship/flight tracking where relevant.
9. Search fact-check databases for reused imagery.
10. Preserve all timestamps.

Do not stop when a claim is debunked.

The **response to the debunking** is part of the record.

## UI presentation

The public-facing map should avoid editorial language such as "LOL Iran lied."

Instead display:

**CLAIM**

> Iran's Khatam al-Anbiya Central Headquarters stated that Iranian forces destroyed two U.S. MC-130 aircraft.

**WHAT IS VERIFIED**

> Two MC-130 aircraft were in fact destroyed inside Iran.

**WHAT IS NOT VERIFIED / CONTRADICTED**

> Independent reconstruction reports that mechanical failures disabled the aircraft and U.S. forces destroyed them deliberately before extraction.

**DISPOSITION**

> FALSE ATTRIBUTION

**WHY**

> Real wreckage was used as evidence for a causal claim that the available reconstruction does not support.

Then provide every source so users can inspect the evidence themselves.

The desired tone is:

**"Here is exactly what was claimed. Here is what actually can be demonstrated. Here is where those diverge. Read the evidence yourself."**

Not:

**"Believe our interpretation."**

## Quality gate

Reject the research pass if it:

- collapses distinct claims into one narrative;
- labels unsupported claims "false" solely because evidence is absent;
- mistakes Press TV commentary for an official IRGC statement;
- ignores later Iranian corrections;
- ignores genuine Iranian military successes;
- ignores genuine U.S. losses;
- attributes U.S. self-destruction of equipment to Iranian kinetic action without evidence;
- treats U.S. claims as automatically authoritative;
- omits original Iranian sources;
- omits timestamps;
- or summarizes a changing story without showing each version.

The credibility of this project depends on being willing to say:

**Iran was correct here.**

**Iran exaggerated this.**

**Iran could not prove this.**

**Iran's initial claim was false.**

**Iran changed the explanation after contrary evidence appeared.**

Those distinctions are mandatory.

## Superseding analytical doctrine

Apply `ANALYTICAL-DOCTRINE.md`. Do not treat lack of a single dispositive source as lack of analytic knowledge when independent evidence converges. Reserve `UNRESOLVED` for roughly balanced live explanations. Every consequential proposition requires likelihood/confidence/inference/alternatives/change-evidence fields. Every material-loss category requires a calculated range or `PENDING_ESTIMATE` with a concrete collection requirement. Leadership casualties must be person-level records.

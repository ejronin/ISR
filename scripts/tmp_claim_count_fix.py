#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def replace(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"asserted replacement missing in {path}: {old[:80]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")

replace(
    "scripts/build_canonical_current_state_v2_final.py",
    '    counts["material_loss_records"] = len(entities.get("material_losses") or [])\n',
    '    counts["claim_records"] = len(entities.get("claims") or [])\n    counts["material_loss_records"] = len(entities.get("material_losses") or [])\n',
)

replace(
    "tests/gate3-v2-forward-update-canary.test.py",
    'SYNTHETIC_ACTOR_ID = "TEST-CANARY-ACTOR-FORWARD"\n',
    'SYNTHETIC_ACTOR_ID = "TEST-CANARY-ACTOR-FORWARD"\nSYNTHETIC_CLAIM_ID = "TEST-CANARY-CLAIM-FORWARD"\n',
)
replace(
    "tests/gate3-v2-forward-update-canary.test.py",
    '        baseline_actor_ids = canonical_id_set(baseline_canonical, "actors")\n',
    '        baseline_actor_ids = canonical_id_set(baseline_canonical, "actors")\n        baseline_claim_ids = canonical_id_set(baseline_canonical, "claims")\n',
)
replace(
    "tests/gate3-v2-forward-update-canary.test.py",
    '''                {\n                    "entity_type": "actor",\n                    "entity_id": SYNTHETIC_ACTOR_ID,\n                    "record": {\n                        "actor_id": SYNTHETIC_ACTOR_ID,\n                        "canonical_name": "Synthetic forward canary actor",\n                        "actor_type": "TEST_FIXTURE",\n                        "source_ids": [SYNTHETIC_SOURCE_ID],\n                    },\n                },\n            ],\n''',
    '''                {\n                    "entity_type": "actor",\n                    "entity_id": SYNTHETIC_ACTOR_ID,\n                    "record": {\n                        "actor_id": SYNTHETIC_ACTOR_ID,\n                        "canonical_name": "Synthetic forward canary actor",\n                        "actor_type": "TEST_FIXTURE",\n                        "source_ids": [SYNTHETIC_SOURCE_ID],\n                    },\n                },\n                {\n                    "entity_type": "claim",\n                    "entity_id": SYNTHETIC_CLAIM_ID,\n                    "record": {\n                        "case_id": SYNTHETIC_CLAIM_ID,\n                        "claim": "Synthetic forward canary claim for derived-count validation.",\n                        "status": "UNRESOLVED",\n                        "source_ids": [SYNTHETIC_SOURCE_ID],\n                    },\n                },\n            ],\n''',
)
replace(
    "tests/gate3-v2-forward-update-canary.test.py",
    '''        if len(advanced_canonical["entities"]["actors"]) != len(baseline_canonical["entities"]["actors"]) + 1:\n            raise AssertionError("canonical actor population did not advance")\n''',
    '''        if len(advanced_canonical["entities"]["actors"]) != len(baseline_canonical["entities"]["actors"]) + 1:\n            raise AssertionError("canonical actor population did not advance")\n        if len(advanced_canonical["entities"]["claims"]) != len(baseline_canonical["entities"]["claims"]) + 1:\n            raise AssertionError("canonical claim population did not advance")\n        if advanced_canonical["counts"]["claim_records"] != len(advanced_canonical["entities"]["claims"]):\n            raise AssertionError("canonical claim_records metadata did not derive from the accepted claim collection")\n''',
)
replace(
    "tests/gate3-v2-forward-update-canary.test.py",
    '''        if SYNTHETIC_ACTOR_ID not in canonical_id_set(advanced_canonical, "actors"):\n            raise AssertionError("synthetic actor did not survive the canonical build")\n''',
    '''        if SYNTHETIC_ACTOR_ID not in canonical_id_set(advanced_canonical, "actors"):\n            raise AssertionError("synthetic actor did not survive the canonical build")\n        if SYNTHETIC_CLAIM_ID not in canonical_id_set(advanced_canonical, "claims"):\n            raise AssertionError("synthetic claim did not survive the canonical build")\n''',
)
replace(
    "tests/gate3-v2-forward-update-canary.test.py",
    '''        if not baseline_actor_ids <= canonical_id_set(advanced_canonical, "actors"):\n            raise AssertionError("existing actor IDs changed during forward update")\n''',
    '''        if not baseline_actor_ids <= canonical_id_set(advanced_canonical, "actors"):\n            raise AssertionError("existing actor IDs changed during forward update")\n        if not baseline_claim_ids <= canonical_id_set(advanced_canonical, "claims"):\n            raise AssertionError("existing claim IDs changed during forward update")\n''',
)
replace(
    "tests/gate3-v2-forward-update-canary.test.py",
    '        public_losses = advanced_public["datasets"]["current.material_losses"]["payload"]["records"]\n',
    '        public_losses = advanced_public["datasets"]["current.material_losses"]["payload"]["records"]\n        public_claims = advanced_public["datasets"]["current.claims"]["payload"]["claims"]\n',
)
replace(
    "tests/gate3-v2-forward-update-canary.test.py",
    '''        if len(public_losses) != len(advanced_canonical["entities"]["material_losses"]):\n            raise AssertionError("public/canonical material-loss counts do not reconcile")\n''',
    '''        if len(public_losses) != len(advanced_canonical["entities"]["material_losses"]):\n            raise AssertionError("public/canonical material-loss counts do not reconcile")\n        if len(public_claims) != len(advanced_canonical["entities"]["claims"]):\n            raise AssertionError("public/canonical claim counts do not reconcile")\n        if len(public_claims) != advanced_canonical["counts"]["claim_records"]:\n            raise AssertionError("public claims do not reconcile with canonical claim_records metadata")\n''',
)
replace(
    "tests/gate3-v2-forward-update-canary.test.py",
    '            f"cutoff={future_timestamp}; packets/sources/chronology/losses advanced; "\n',
    '            f"cutoff={future_timestamp}; packets/sources/chronology/losses/claims advanced; "\n',
)

print("claim-record derived-count repair applied")

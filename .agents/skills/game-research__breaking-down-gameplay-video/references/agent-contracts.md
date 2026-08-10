# Specialist-agent contracts

Agents increase coverage only when their roles, evidence, and independence are controlled.

## Shared assignment packet

Every specialist receives:

- source manifest and timeline;
- observability/capability profile;
- exact lens and questions;
- allowed instruments and preconditions;
- output schema and destination;
- evidence-ID allocation prefix;
- extraction budget appropriate to the lens;
- prohibition on external knowledge unless explicitly enabled;
- instruction to separate observations, measurements, claims, models, and design interpretations.

First-pass collectors do **not** receive the final thesis or other agents’ causal summaries.

## Required return structure

```json
{
  "assignment_id": "audit_hp_01",
  "scope": {"source_ids": ["source_001"], "intervals": [[0.0, 612.4]]},
  "capability_status": "VALID_WITH_LIMITATIONS",
  "evidence_created": ["ev_hp_001"],
  "observations_created": ["obs_hp_001"],
  "measurements_created": ["measure_hp_001"],
  "claims_proposed": ["claim_hp_001"],
  "candidate_models": ["model_hp_001"],
  "conflicts": [],
  "unknowns": [],
  "coverage": {
    "opportunities": 14,
    "observed_events": 11,
    "unreadable_events": 3
  },
  "limitations": ["HUD occluded during boss intro"],
  "next_best_internal_evidence": ["inspect 08:11.2–08:13.0 at source resolution"]
}
```

## Observation discipline

Each observation:

- cites a contextual PTS interval;
- identifies actors/ROIs without presuming hidden identity;
- distinguishes visible state from inferred state;
- records audio inclusion;
- names ambiguity and occlusion;
- uses no unsupported causal or psychological language.

## Measurement discipline

Each measurement includes measurand, method, unit, uncertainty, count, scope, and source transformations. Agents may propose but not silently calibrate units from genre convention.

## Independence design

Use different error mechanisms, not merely different roles.

Good cross-checks:

- OCR ammo decrement vs counted muzzle flashes;
- results inventory vs choice-screen picks;
- optical flow vs landmark transit;
- visible health change vs known-damage hit count;
- audio onset vs VFX onset;
- blind first-pass annotation vs deterministic detector;
- fitted model vs held-out event.

Weak cross-check:

- three agents reading the same contact sheet and repeating the same explanation.

## Competing-hypothesis assignments

For high-impact forks, assign one reviewer to defend each viable model and one adjudicator to compare predictions against evidence. The goal is not debate prose; it is to surface discriminating observations and hidden assumptions.

## Coverage limits

No fixed universal frame budget applies. Use enough evidence to answer the lens while preserving sequence context. A specialist may request additional internal extraction from the supplied video, but not additional user data.

## Recommended specialist pool

Select only compatible roles:

- chronology/session-state auditor;
- UI/menu/results auditor;
- resource/economy/progression auditor;
- value/formula miner;
- player/HUD survivability auditor;
- entity/archetype auditor;
- AI/state-machine auditor;
- combat/interaction auditor;
- movement/collision/camera auditor;
- feel/audio/VFX auditor;
- difficulty/director auditor;
- player-decision auditor;
- adapter-specific specialist;
- acquisition adversary;
- inference adversary;
- reconstruction adversary;
- presentation adversary.

Do not run every role by default when a narrow question makes most irrelevant.

## Reconciliation

The orchestrator owns the canonical graph. Agent output is proposed evidence/claims, not truth. Reconciliation:

1. validates artifact/source references;
2. deduplicates observations without deleting provenance;
3. records conflicts;
4. creates supersession links for corrections;
5. selects or preserves candidate models;
6. generates baseline choices only after model review;
7. updates coverage and unknowns.

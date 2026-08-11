# Evidence ledger model

Keep one human-readable ledger behind the analysis. The report and, when requested, the reconstruction cite the same settled entries rather than maintaining competing values.

```text
source → interval → extraction activity → evidence artifact → observation
      → measurement → claim → candidate model → validation/conflict
      → [when reconstruction is requested: baseline implementation object → behavioral fixture]
```

## Analytical layers

### Evidence

A source-grounded interval or artifact. Record these fields when material:

- `id`;
- source ID and hash lineage;
- PTS start/end and source timebase;
- session-time mapping if available;
- context padding;
- audio inclusion;
- crop in source-display coordinates;
- transformation history;
- extraction command/tool/version;
- artifact path and checksum;
- signal quality and limitations.

### Observation

A neutral description of a visible/audible event. It must not smuggle in hidden causes.

Good:

- “At 03:14.220–03:14.487, the enemy sprite flashes white, the displayed HP falls from 42 to 31, and a `11` glyph rises near the target.”

Bad:

- “The poison proc deals 11 damage.”

The latter is a claim/model requiring additional support.

### Measurement

A numerical estimate tied to a defined measurand. Record:

- estimate or bound;
- unit;
- coordinate/clock domain;
- method and parameters;
- evidence IDs;
- observation count and run count;
- uncertainty object;
- scope and invalidating conditions.

### Claim

A proposition supported by observations/measurements. Claims may describe:

- visible dynamics;
- hidden mechanics;
- causal relationships;
- design interpretations;
- player hypotheses.

A load-bearing claim retains alternatives, conflicts, validation status, scope, and any reconstruction consequence.

### Candidate model

A hidden rule/system that predicts visible behavior. Record:

- assumptions;
- variables and units;
- formula/state machine/table;
- predictions for observed events;
- support and contradiction IDs;
- unsupported-commitment analysis;
- validation status;
- observationally equivalent alternatives.

### Baseline choice, when reconstruction is requested

An implementation decision used when the source does not identify the original. Record:

- chosen model/value;
- alternatives retained;
- least-specific valid-completion rationale;
- visible behavior preserved;
- extrapolation risk;
- fixtures covering the choice.

## Orthogonal epistemic axes

Do not compress these into one chip.

### Object kind

`OBSERVATION`, `MEASUREMENT`, `MECHANIC_CLAIM`, `DESIGN_INTERPRETATION`, `PLAYER_HYPOTHESIS`, `BASELINE_CHOICE`.

### Source kind

`FOOTAGE`, `VISIBLE_UI_STATEMENT`, `EMBEDDED_SPEECH`, `DETERMINISTIC_INSTRUMENT`, `ANALYST_DERIVATION`, `EXTERNAL`.

`EXTERNAL` is disabled unless the user explicitly requests outside corroboration; external material may support a separate claim but must not overwrite footage-only results.

### Validation state

- `UNTESTED`
- `SUPPORTED`
- `VALIDATED_WITHIN_SCOPE`
- `CONTRADICTED`
- `OBSERVATIONALLY_EQUIVALENT`
- `UNIDENTIFIABLE_FROM_FOOTAGE`

### Resolution state

- `SOURCE_SETTLED`
- `SOURCE_PROVISIONAL`
- `SOURCE_OPEN`
- `BASELINE_FILLED`

### Uncertainty kind

- `MEASUREMENT` — detector, calibration, timing, or pixel error;
- `SAMPLING` — few events/runs/opportunities;
- `MODEL` — multiple hidden rules fit;
- `CAPTURE` — cadence, compression, missing audio, crop, edit;
- `BOUND_ONLY` — only an interval, floor, or ceiling is supported.

## Unknown taxonomy

Every unknown receives one primary type:

- `UNOBSERVED` — no relevant event appears;
- `INSUFFICIENT_OPPORTUNITIES` — too few valid occasions existed;
- `MEASUREMENT_LIMITED` — source cadence/quality prevents a reliable estimate;
- `DETECTOR_LIMITED` — available instrument cannot isolate the signal;
- `CONFLICTED` — evidence supports incompatible readings;
- `OBSERVATIONALLY_EQUIVALENT` — several models predict every observed event;
- `OUT_OF_SCOPE` — irrelevant to the requested route;
- `EXTERNALLY_RESOLVABLE` — documentation/source could answer, but footage cannot;
- `ADDITIONAL_FOOTAGE_RESOLVABLE` — another controlled observation could distinguish it, even though this skill must finish from current video;
- `UNIDENTIFIABLE` — no plausible video-only observation in the supplied material can resolve it.

The unknown type determines the baseline policy; it is not merely “low confidence.”

## Negative evidence and opportunity records

A negative claim needs:

- event definition;
- detector/visual coverage;
- valid opportunity criteria;
- opportunity count;
- observed occurrence count;
- scope.

Example:

| Claim | Valid opportunity | Opportunities | Occurrences | Scope |
|---|---|---:|---:|---|
| The sentry was not observed firing while the player was outside the inner ring | Sentry active, line of sight visible, cooldown could have elapsed, player outside ring | 8 | 0 | `source_001`, sentry archetype A |

This supports a bounded relationship; it does not prove the sentry can never fire outside the ring.

## Evidence citation format

Reader-facing claims should expose:

```text
[E ev_attack_014 · source_001 · 03:14.220–03:14.487 · audio+video]
```

A still may be shown, but the link resolves to the interval, crop/clip, extraction provenance, and context.

## Ledger consistency

- Use stable local IDs for claims that recur across the report or reconstruction.
- Corrections visibly supersede an earlier entry; do not mutate history invisibly.
- Conflicts point to both reads.
- Report/reconstruction values cite the ledger entry instead of restating a second confidence story.
- Durable derived artifacts retain source hashes and tool provenance when those details affect reproducibility.

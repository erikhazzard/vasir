# Validation and benchmarking

“Valid JSON,” “internally consistent report,” and “correct reconstruction” are different claims. Validate each layer separately.

## 1. Package and instrument validity

Before analyzing user footage:

- every schema passes Draft 2020-12 validation;
- every example validates against its named schema;
- all internal file references resolve;
- every Python module compiles;
- the regression suite passes on the installed FFmpeg/OpenCV versions;
- extractors fail closed and leave no plausible partial output after invalid input.

The bundled suite covers the scars that motivated this package: 24/30/50/60/120 fps, VFR, widescreen/4:3/vertical/non-square pixels, verified film-strip PTS, real-frame sampling, missing audio, malformed input, unknown source gaps, and camera/player-motion separation.

## 2. Instrument-specific acceptance criteria

Each instrument needs a declared ground truth and error metric.

| Instrument | Ground truth | Minimum acceptance record |
|---|---|---|
| Source probe | synthetic media metadata and enumerated frame PTS | timestamp count, median delta error, VFR/CFR classification, decode status |
| Frame sampler | known source PTS sequence | selected PTS error, monotonicity, minimum requested separation, aspect-ratio error |
| Film strip | enumerated source frames | target→selected→extracted timestamp error for every cell |
| Visual metrics | known frames and PTS | decoded-frame count equality, delta equality, duplicate detection behavior |
| Audio features | synthetic silence, tones, impulses | availability state, hop timing, onset localization; never semantic class accuracy |
| OCR/value miner | hand-labeled crops and lifecycles | precision/recall by glyph size and UI state, numeric error, false-positive classes |
| Camera transform | synthetic translation/rotation/scale plus annotated real clips | transform error, inlier ratio, rejection rate, segment-reset behavior |
| Event detector | hand-labeled intervals | interval precision/recall and boundary error, stratified by event type |

A script accepting a file is not evidence that its output is valid for that file. Capability gates and rejection behavior are part of accuracy.

## 3. Analytical validity

For a completed corpus:

- blind observation passes agree on the visible event before causal reconciliation;
- detector-selected evidence is supplemented by stratified random and low-salience audits;
- load-bearing measurements are repeated across valid opportunities;
- negative claims include opportunity counts and coverage conditions;
- candidate models are tested against all relevant events, including held-out repetitions where the footage contains them;
- agreement from correlated agents is not scored as independent evidence;
- every correction supersedes rather than silently overwrites the earlier record.

Track inter-rater agreement only for defined annotation tasks. A high agreement score on a bad ontology does not establish truth.

## 4. Reconstruction validity

The baseline is accepted by observable behavior, not by resemblance of code structure to an unknowable original.

For each major system:

1. Build at least one fixture from an observed interval.
2. Run the implementation from the fixture’s declared setup and stimulus.
3. Compare event order, state transitions, numeric outputs, visible timing, and presentation signals within the fixture tolerances.
4. Record pass/fail, implementation build hash, seed, clock configuration, and observed deviations.
5. Add a discriminating fixture for every high-impact candidate-model fork when the footage supplies a condition on which the models diverge.

A reconstruction can pass every fixture and still differ internally from the original. Call it **observationally faithful within the coverage boundary**, never source-code equivalent.

## 5. Cross-genre validation matrix

Do not call the skill universal until it has been exercised across materially different observability regimes. Maintain fixtures for at least:

- center-locked survivor/action footage;
- first-person shooter;
- third-person free/orbit camera;
- side-scrolling platformer;
- fixed-camera fighter;
- RTS/tactics free-map camera;
- racing/track-progress game;
- sports/broadcast camera;
- card or turn-based hidden-information game;
- puzzle or low-motion game;
- rhythm game with audio timing;
- edited/streamed/discontinuous footage;
- multiple frame rates, VFR, aspect ratios, HUD scales, languages, and compression levels.

The matrix is capability evidence, not proof that every future game is supported. New camera, control, information, or session topology requires a new adapter test.

## 6. Report and decision usefulness

A presentation review checks more than visual polish:

- every citation resolves to the claimed interval;
- labels and uncertainty remain legible at actual reading size;
- the report does not harden candidate models into facts;
- a developer can trace each spec field to claims and fixtures;
- a designer can distinguish `BASELINE`, `BETTER`, and `NEW` without ambiguity;
- a second analyst can reproduce load-bearing measurements from stored commands and artifacts.

## 7. Release rule

A package release requires:

- green package validation and regression tests;
- no known P0/P1 instrument defect;
- a changelog entry for schema or semantic changes;
- version increments when an output meaning changes;
- retained regression media or reproducible synthetic generation commands.

A delivery requires the four adversarial gates in `adversarial-review.md`, green schema/reference validation, complete baseline choices, fixture coverage, and no unresolved P0/P1 finding.

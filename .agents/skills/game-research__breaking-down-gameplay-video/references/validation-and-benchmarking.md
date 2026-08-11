# Validation and benchmarking

Use this when validating a retained media tool or an implemented reconstruction. Tool execution, analytically supportable claims, and observationally faithful behavior are different claims; test the layer actually at risk.

## Media-tool validity

The bundled regression suite protects:

- exact PTS behavior across 24/30/50/60/120 fps and VFR footage;
- widescreen, 4:3, vertical, and non-square-pixel display geometry;
- film-strip extraction timing;
- frame-manifest to contact-sheet PTS lineage;
- missing versus present audio behavior;
- malformed-media refusal without plausible partial output;
- explicit unknown gaps across multiple source files.

Run from the skill directory:

```bash
PYTHONDONTWRITEBYTECODE=1 python -m pytest -p no:cacheprovider -q tests/test_smoke.py
```

FFmpeg and FFprobe must be installed. The suite uses synthetic media and no external network.

## Instrument-specific acceptance

| Tool | Ground truth | Minimum useful acceptance |
|---|---|---|
| Source probe | Synthetic metadata and enumerated frame PTS | Timestamp count, median delta error, VFR/CFR classification, display geometry, decode status |
| Timeline composer | Ordered source manifests with known or absent wall-clock relations | Source order preserved; known, inferred, and unknown gaps remain distinct |
| Frame sampler | Known source PTS sequence | Selected PTS monotonicity, requested separation, aspect-ratio preservation |
| Contact sheet | PTS-bearing sampled frames | Cell labels and order match the frame manifest |
| Film strip | Enumerated source frames | Target, selected, and extracted timestamp error for every cell |
| Visual metrics | Known frames and PTS | Decoded-frame count equality, delta equality, aspect preservation, duplicate behavior |
| Audio features | Synthetic missing audio and tones | Honest availability state, hop timing, and non-empty measured signal when present |

A script accepting a file is not evidence that its output is valid for that file. Preconditions, sanity checks, and refusal behavior are part of accuracy.

## Analytical validity

For a substantive analysis:

- view the complete relevant sequence before detector-selected close reading;
- supplement detector-selected evidence with quiet, random, and disagreement intervals;
- repeat load-bearing measurements across valid opportunities when the footage permits;
- give negative claims an opportunity definition and count;
- compare candidate models against all relevant events and held-out repetitions available in the footage;
- do not score correlated agents as independent evidence;
- propagate material corrections to every affected conclusion.

Track inter-rater agreement only for a defined annotation task. Agreement on a bad ontology does not establish truth.

## Reconstruction validity

Accept a baseline by observable behavior, not resemblance to unknowable source code.

For each major requested system:

1. Derive at least one fixture from a cited source interval.
2. Run the implementation from the fixture setup and stimulus.
3. Compare event order, visible state transitions, numeric outputs, timing, and presentation signals within declared tolerances.
4. Record the implementation build, seed when relevant, clock configuration, and material deviations.
5. Exercise high-impact candidate-model forks when the footage provides a discriminating condition.

Passing fixtures establishes observational fidelity only within their coverage boundary.

## Report usefulness

Check that:

- each load-bearing citation resolves to the claimed interval;
- labels and uncertainty remain legible in the delivered form;
- candidate models are not hardened into historical facts;
- reconstruction choices trace to evidence and observable fixtures;
- `BASELINE`, `BETTER`, and `NEW` remain distinct whenever critique or redesign was requested;
- another analyst can reproduce the important measurements from recorded methods and artifacts.

## Delivery decision

A delivery is ready when the route-applicable adversarial review finds no concealed material acquisition or inference defect, reconstruction choices are explicit when present, and the requested output is internally consistent. Do not require unrelated genre fixtures, validators, or output formats merely to make the package look rigorous.

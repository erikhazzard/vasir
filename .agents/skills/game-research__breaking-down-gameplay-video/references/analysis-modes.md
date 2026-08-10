# Analysis modes and stopping rules

The mode changes scope, not epistemic standards. Infer the mode from the request; ask only when two materially different deliverables remain equally plausible.

| Mode | Trigger | Required output | Stop condition |
|---|---|---|---|
| `FULL_RECONSTRUCTION` | Broad “break down/analyze/reverse-engineer” request | Full corpus, maximal report, complete baseline spec, fixtures, preservation/better/new | Every visible major system has a model or typed unknown; every implementation-required unknown has a baseline choice; every major mechanic has a fixture; all four reviews pass |
| `SYSTEMS_RECONSTRUCTION` | “Systems spreadsheet,” “clone,” “spec,” “numbers/rules” | Corpus, machine/system report modules, complete spec and fixtures | Same reconstruction gates; omit only non-load-bearing editorial sections |
| `FEEL_FORENSICS` | “Why does it feel like this?” | Control/camera/animation/VFX/audio timing corpus, feel report, preservation rules; spec fragments if requested | Every feel claim has an interval, visible timing method, and channel decomposition; no input-latency claim without visible input |
| `PLAYER_REVIEW` | “How well did I play?” | Decision episodes, execution/decision/outcome separation, performance report, bounded system context | Every judgment reconstructs information available at the time and names alternatives; psychology remains hypothetical |
| `COMPARATIVE` | Two or more games/runs | Per-source manifests, separate adapter profiles, normalized comparable measures, within-source findings, deltas, confounds | Every comparison states construct equivalence and normalization; incomparable dimensions are reported rather than forced |
| `FOCUSED` | One narrow question | Minimum evidence corpus and answer needed for that question | The question is answered, load-bearing claims pass review, and limitations are explicit |

## Default depth

A broad request defaults to `FULL_RECONSTRUCTION`; do not ask the user to choose “quick versus deep.” A narrow request remains focused unless answering it correctly requires a broader system reconstruction.

## Comparative rule

“Same script” is insufficient. A valid delta requires the same measurand or a justified mapping.

Bad comparison:

- Game A player speed = 410 screen pixels/s.
- Game B player speed = 320 screen pixels/s.
- Therefore A is 28% faster.

Valid comparison:

- Convert both to viewport widths/s during the same locomotion state.
- Confirm camera zoom is stable or model it.
- State whether acceleration, FOV, animation, and collision make the construct only approximately comparable.

## Multi-source and multi-run footage

Multiple files may be one discontinuous session, several complete runs, or unrelated examples. Preserve source boundaries. Compare repeated runs as separate observational units before pooling. Never infer a continuous timer across an unknown recording gap.

## Resource discipline

Maximal does not mean indiscriminate. Allocate close reading to uncertainty and implementation leverage:

1. mechanics that gate many downstream values;
2. model forks that change clone architecture;
3. high-impact feel timings;
4. failure/success transitions;
5. poorly observed systems with many opportunities;
6. report-only color after the machine is stable.

Stop adding passes when they no longer change claims, reduce uncertainty, or improve fixtures. Do not produce ten correlated agent summaries where one deterministic measurement and one adversarial read suffice.

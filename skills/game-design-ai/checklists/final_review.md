# Final Review Checklist

Use this before delivering any substantial game-AI design.

## Experience

- [ ] Target player experience is explicit.
- [ ] Intended player read is clear.
- [ ] Acceptable and unacceptable visible mistakes are defined.
- [ ] Fairness boundaries are defined.
- [ ] Reaction/perception model is defined where player-facing.

## Scope

- [ ] Agent AI is defined or explicitly out of scope.
- [ ] Director AI has been evaluated.
- [ ] Development/autoplay AI has been evaluated.
- [ ] Runtime LLM use is absent by default or explicitly justified.

## Primitives

- [ ] Safety primitive exists.
- [ ] Progress primitive exists.
- [ ] Threat primitive exists.
- [ ] Opportunity primitive exists.
- [ ] Commitment primitive exists.
- [ ] Exploit-risk primitive exists.
- [ ] Fairness primitive exists.
- [ ] Primitives are measurable/queryable/testable.

## Knowledge model

- [ ] Sensors are defined.
- [ ] Memory/stale information is defined.
- [ ] Required world queries are listed.
- [ ] Agent-perceived truth is separated from omniscient/debug truth.
- [ ] Update frequencies and caching are specified.

## Architecture

- [ ] Recommended architecture is stated.
- [ ] Architecture is justified by problem shape.
- [ ] Alternatives are considered.
- [ ] Hybrid layers are described if used.
- [ ] Runtime determinism is addressed.
- [ ] Runtime budget is addressed.

## Behavior contract

- [ ] Actions are defined.
- [ ] Hard invariants are defined.
- [ ] Soft preferences are defined.
- [ ] Fallback behavior exists.
- [ ] Hysteresis/commitment is included where oscillation is possible.
- [ ] Difficulty/personality knobs are explicit.

## Director

- [ ] Director responsibilities are stated.
- [ ] Director inputs/outputs are stated.
- [ ] Pacing/intensity model exists where relevant.
- [ ] Spawn/composition rules are fair.
- [ ] Rubber-band/comeback behavior is constrained.

## Testing and observability

- [ ] Scenario tests are included.
- [ ] Invariant tests are included.
- [ ] Stress tests are included.
- [ ] Exploit tests are included.
- [ ] Golden replays or deterministic seeds are specified.
- [ ] Debug overlays are specified.
- [ ] Decision traces are specified.
- [ ] Metrics are tied to player experience and AI quality.

## Truth discipline

- [ ] Existing-game claims are labeled Observed/Inferred/Speculative.
- [ ] Assumptions are stated.
- [ ] No proprietary implementation is presented as fact unless sourced by the user.

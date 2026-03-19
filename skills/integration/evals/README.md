# Integration Eval Contract

Use this suite to check whether the `integration` skill changes answers from narrow helper-level testing toward user-visible proof.

## Failure Mode

Without the skill, models often:

- suggest unit tests for helpers instead of value-path tests
- verify private mechanics instead of observable behavior
- stop at mocked seams that do not prove the real regression

## Win Condition

The treatment output should beat baseline by making the test strategy outcome-driven:

- integration test first
- user-visible purchase flow
- observable behavior instead of private implementation details

## Current Cases

- `value-path-purchase-flow`

## Current Limits

This suite checks whether the answer chooses the right testing posture. It does not yet execute a real fixture repo.

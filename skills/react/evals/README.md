# React Eval Contract

Use this suite to check whether the `react` skill actually changes model output away from common bad defaults.

## Failure Mode

Without the skill, models often:

- reach for global state or context too early
- blur urgent and non-urgent updates together
- write async effects without clear cancellation or accessible error handling

## Win Condition

The treatment output should beat baseline by making the intended React posture more explicit:

- local state before shared state
- abortable async effects
- explicit loading and accessible error states
- `startTransition` / `useDeferredValue` for expensive background work
- clearer separation between urgent input and deferred result work

## Current Cases

- `abortable-user-fetch`
- `urgent-vs-non-urgent-search`

## Current Limits

This is a built-in steering suite, not a full React quality benchmark. It checks whether the answer reaches for the repo’s React defaults instead of generic public-code patterns.

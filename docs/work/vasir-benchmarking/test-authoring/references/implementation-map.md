# Implementation map

Reuse `benchmarks/backend-testing/run.mjs` native sessions and `fixture.mjs` / `verify.mjs` isolated replay. Extend service startup only enough to omit DynamoDB for a Redis-only fixture. Do not modify the backend checkout.

Case/harness files belong in `benchmarks/test-authoring/`. Qualified private source and calibration remain in `.agents/vasir-evals/test-authoring/round-2026-10-10/`; current native attempts, strict acceptance receipts and analysis evidence belong in `.agents/vasir-evals/test-authoring/prepared-round/`. Selection uses `benchmarks/test-authoring/publication.json`. The separate `testAuthoring` projection and `testAuthoringRound` / `testAuthoringFiles` response fields preserve existing backend fields.

Authors: `codex:gpt-6-astra@ultra`, `codex:gpt-6-astra@xhigh`, `codex:gpt-6.1-sol@xhigh`, `claude:claude-opus-5-5@xhigh`, each Minimal and Skill. Astra and Opus each review all eight suites in one blinded batch. Eight completed authors plus two reviews; no automatic retry. Original strict outcomes remain immutable when the separate analysis policy qualifies an unchanged source for replay.

One complete test file per author. Native code strings have no `maxLength`, which can terminate constrained output mid-program. The task retains its 24 KiB instruction; a disclosed, uniformly applied 64 KiB analysis ceiling permits evaluating complete over-limit files without generation retries. Author prompt maximum 64 KiB; reviewer packet maximum 256 KiB. Native timeout ten minutes per request, concurrency at most four. These are artifact and time limits, not token-spend caps.

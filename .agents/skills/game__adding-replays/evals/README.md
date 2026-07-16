# Adding Replays Skill Eval

This suite checks whether loading `game__adding-replays` changes the implementation decision from game-owned replay plumbing to the supported `idv.replays` surface for stable-generation discovery, canonical playback, launcher-owned PiP, and exact-schema same-player typed input.

The win condition is consistent authority discipline across Best/Latest/newest-first History, iterative-build continuity inside one generation, intentional generation-rotation empty states, full-screen and PiP open behavior, bounded cancellable typed presentations, unknown/custom-schema refusal, public-heat separation, sibling-skill collisions, and prompts that explicitly demand unsafe direct wiring. Legacy exact-build compatibility remains valid, but must not be mistaken for cross-build history. In-scope change requests must produce a concrete edit or drop-in implementation, not a plan that asks for files. The skill must explicitly decline every excluded task, name the owning sibling lane for collisions, and avoid executable unsafe primitives; negated prose that explains why a primitive is forbidden is not itself a failure.

Hard substring checks are a minimum floor. The suite-level judge prompt evaluates the semantic boundary: the answer must keep player/game/generation/build/auth/storage/navigation host-owned, treat `tickRateHz` as descriptor data, keep encoded record fields out of game code, and keep replay discovery out of deterministic gameplay. `--model mock` proves suite loading and baseline/treatment wiring; it is not a substitute for a live-model behavior verdict.

Run locally:

```bash
npm run eval -- game__adding-replays mock --trials 1
```

Current limit: this eval inspects generated guidance/code text. It does not launch a game, seal a replay, prove launcher navigation/PiP playback, or prove raw action pages against a hosted release; those remain product/browser gates.

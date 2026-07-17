---
name: game__adding-replays
description: Adds game-owned Best, Latest, and History replay UI through idv.replays, including launcher PiP/fullscreen and safe typed replay input for presentation-only ghosts. Use when implementing replay buttons, recent replay lists, replay overlays, ghosts, trails, or comparisons in a game; exclude platform capture/storage/playback-engine and public sharing work.
category: games
tags:
  - game
  - replay
  - sdk
  - results-screen
tools:
  - Read
  - Grep
  - Glob
  - Edit
  - Write
---

# Adding Replays to a Game

Replay UI is a client of platform authority, not a replay subsystem. Use `idv.replays` from presentation code, pass only SDK-returned match IDs/cursors back to it, and keep all replay-derived presentation outside authoritative live state.

## Routing boundary

Use this skill for:

- “Watch my best,” “watch my latest,” and newest-first last-N history.
- Launcher-owned picture-in-picture with an explicit fullscreen fallback.
- A private same-player ghost, trail, comparison, or heatmap from typed replay input.
- Replay loading, empty, error, retry, pagination, and double-tap behavior.

This skill is outside scope for replay platform work: capture, sealing, archives, storage, manifests, playback engines, retention, public replay feeds, and cross-player sharing. Route regressions in an existing replay capability to `$code__fixing-bugs`; route public sharing loops to `$product__designing-viral-social-loops`. For end-screen composition, pair this replay wiring with `$design__designing-end-screen`.

When asked to add or fix replay UI, edit the actual game shell/result-screen seam. Do not stop at a plan. Never invent direct HTTP, local replay persistence, replay URLs, `window.parent` messages, or game-owned iframes when a host capability is absent.

## Read the compact contract

In Studio, read `.studio-ai-runtime/docs/llm/adding-replays.md` before editing. Outside Studio, use `docs/sdk/api-surface.md` and `packages/game-sdk/README.md` under `IDV_TOOLCHAIN_ROOT` or the current idavoll-games checkout.

## Supported surface

```js
const highlights = await idv.replays.getCurrentGameHighlights();
const history = await idv.replays.listCurrentGameScored({ limit: 10 });

const pip = await idv.replays.open(summary.matchId, {
  presentation: 'picture-in-picture',
});
const fullscreen = await idv.replays.open(summary.matchId);

const typed = await idv.replays.readCurrentGame(summary.matchId, {
  representation: 'typed-inputs',
});
```

All calls resolve to success/failure envelopes. `getCurrentGameHighlights()` is zero-argument. History accepts only bounded `limit` (`1..50`) and an opaque prior `nextCursor`. Games never pass player, game, channel, stable generation, version, build, auth, storage location, or replay URL.

## Stable-generation prior rewrite

Bad default: treat each published build as a new replay scope, or persist old match IDs to survive iteration.

Replacement: discovery follows the host-owned stable channel generation. Normal Studio/DEV build iteration preserves Best, Latest, and History; an intentional generation rotation starts empty. Clear local presentation state and rediscover on source/account/generation replacement. Each returned replay still opens the immutable build that recorded it.

Legacy releases without an explicit stable generation use an exact-build compatibility generation. Their replays remain discoverable/playable, but do not pretend to span later builds.

Never persist match IDs, cursors, pages, or typed records in saves, `localStorage`, deterministic state, or a game-owned backend.

## Launch and preview scope

Games never manage replay auth. Authenticated Play records and reads the launcher-pinned stable generation; an authenticated DevHub/Studio preview records and reads only its isolated preview generation. A launch token or configured replay secret is never required, and pagination survives a session refresh. Anonymous preview loading remains public. The host still revalidates the sealed player/game/generation/match scope on every action-data page. Never ask the game to pass a token, generation, version, build, player, or session.

## PiP is launcher-owned

Any match legitimately returned by current-generation Best, Latest, or History may request PiP. The launcher owns the singleton iframe, silent preflight, focus, source-input blocking, close, and fullscreen handoff.

On PiP failure, preserve the row and reveal a separate fullscreen button. Only the player's later click calls `idv.replays.open(matchId)` without a presentation option. Never auto-fallback, recursively call open, synthesize overlay support, construct a URL, or mount an iframe.

Use a synchronous mutable guard owned by one mounted screen/controller and set it before the first `await`. Rendered loading state alone cannot prevent two click handlers from issuing duplicate opens.

## Typed replay input

Omitted `representation` is legacy direction-only v1. New ghost/presentation code opts into v2 with `{ representation: 'typed-inputs' }` on every page.

Admit a page only after checking the exact descriptor family/schema expected by the presentation:

```js
function supportsPresentation(descriptor, matchId) {
  return descriptor?.matchId === matchId
    && descriptor?.dataKind === 'input-timeline'
    && descriptor?.schemaVersion === 2
    && Number.isInteger(descriptor?.tickRateHz)
    && descriptor.tickRateHz >= 1
    && descriptor.tickRateHz <= 240
    && Number.isFinite(descriptor?.durationMs)
    && descriptor.durationMs >= 0
    && descriptor.durationMs <= 600_000
    && supportsExactFamilyAndSourceSchema(
      descriptor.replayFamily,
      descriptor.sourceSchema,
    );
}
```

Public records are already SDK-decoded `{ ordinal, atMs, type, data }`. `descriptor.tickRateHz` is the recorded input timeline rate. Dispatch on exact `{ replayFamily, sourceSchema }`; never infer semantics from a numeric record ID or a `type` without the descriptor. Encoded `payloadBase64`, `payloadBytes`, and `recordTypeId` fields must never appear in game code.

Typed v2 covers every currently registered canonical player-input schema: pointer tap/release (with or without semantic UI), four-way swipe (with or without semantic UI), eight-way bullet-heaven movement/upgrades (with or without semantic UI), default humanoid controls, and SDK-header-proven authoritative `idv.analog-axes@1`. Balanced analog, unknown/custom schemas, bounded-server data, arbitrary events, raw device traces, markers, hashes, and checkpoints fail closed as `UNAVAILABLE`. Keep canonical fullscreen/PiP replay buttons available when typed presentation data is unavailable.

For authoritative analog, the exact SDK structurally inspects the whole page before expanding any raw/RLE record, verifies per-record framing and semantic end tick, and rejects more than 6,241 cumulative samples without returning a decoded prefix. Do not add game-owned partial decoding or raw fallback around that failure.

Read pages sequentially, retain at most one traversal, cap it at 60 pages, pass each cursor back unchanged, and release raw page references after compacting only the presentation fields needed. Cancel and discard late results on unmount, newer selection, new live run, account/source replacement, or stable-generation change.

Replay-derived ghosts are non-authoritative. Never feed them into live kernel state, physics, scoring, score validation, public heats, persistence, or game-owned networking.

## UI state rules

- Load highlights and initial history independently; one may succeed while the other fails.
- Empty results are normal and never block Play Again/restart.
- Handle Best/Latest pointing to the same match without duplicate indistinguishable controls.
- Keep history order and paginate only on deliberate player action.
- Give highlights, history, load-more, PiP, fullscreen, and typed-data reads separate failure/retry ownership.
- Retry only the failed operation. A failed load-more keeps rendered rows and its captured cursor.
- Non-retryable auth/unavailable failures hide or disable replay actions without creating an in-game auth flow.
- Guard every async publication with a mounted/source/request generation after the `await`, immediately before state publication.

## Proof before handoff

Exercise the actual game UI seam and show:

- build iteration preserves returned history while intentional generation rotation renders empty;
- Best, Latest, and a History row use returned IDs and open through `idv.replays`;
- History PiP requests the launcher overlay; failure exposes only a later player-invoked fullscreen action;
- a rapid double tap produces one host open request;
- v2 dispatch uses the exact family/source schema and unsupported data degrades to no ghost;
- late pages, unmount, source/generation replacement, and new live run clear presentation state;
- no replay value enters deterministic/live authority or persistent storage;
- Play Again remains usable through every replay empty/failure state.

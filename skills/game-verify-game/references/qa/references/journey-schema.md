# Journey YAML contract

The contract between the QA Engineer (`role-engineer.md`) and `runner.ts`. Journeys are **data**, not code. The runner executes them; the engineer never writes Playwright JS.

## Contents

- Top-level structure and variable interpolation
- Step types
- Output bundle
- Exit codes

## Top-level structure

```yaml
journey: <slug>            # required — journey name, used in run id and output paths
covers: [<case-id>, ...]   # required — which test cases this journey covers
url: <string>              # optional — override adapter.url
headed: <bool>             # optional — default true (set false for CI)
tabs:                      # optional — multi-tab journeys; default is [{ name: main }]
  - name: <string>
steps:                     # required — ordered list
  - <step>
  - <step>
```

The runner navigates each tab to `url`, waits for `window.debug` to be defined, waits for `adapter.readyMarker` in console (soft), then calls `adapter.reset()` on tab 0 before executing `steps`.

## Variable interpolation

Any string-valued field in a step may reference a bound value via `$name` or `$name.path.to.field`. The runner re-evaluates each step's fields against the current binds map before dispatching.

Bind values into the map with `bind:` on an `arrange:` step (see below) or via the `loop:` index.

## Step types

The runner dispatches on the **first matching key** in each step. Keys are mutually exclusive.

The step *categories* below are the cross-project contract. The specific values *inside* each — which `perform:` actions exist, which `capture: at:` kinds are recognized, which adapter primitives are callable — are project-extensible. Add what your game needs in your local `runner.ts`; that's not forking, it's filling in the skeleton. Common extensions: new `perform:` types for input modes the runner doesn't cover (mouse-delta for pointer-lock, scroll-wheel, key-hold, gamepad, touch), new `capture: at:` kinds for evidence beyond screenshots (regional captures, audio events, frame strips, perf traces), and project-specific time idioms (tick-stepping, sim-clock advance).

### `arrange:` — call an adapter primitive (preconditions only)

```yaml
- arrange: <primitive-name>      # required — must exist in adapter.arrange
  args: { ... }                  # optional — passed as second arg
  bind: <name>                   # optional — store return value as $<name>
  tab: <tab-name>                # optional — default tab 0
```

Calls `adapter.arrange.<primitive-name>(page, args, ctx)`. If the primitive doesn't exist, the runner files a `capability-gap` ticket and halts.

**Rule:** `arrange:` is for state setup only. It may never invoke a primitive whose name describes what the player would do in normal gameplay — that's a shortcut, not a test. See `arrange-vs-shortcut.md`.

### `perform:` — real player input (the action under test)

```yaml
- perform: keyPress
  args: { key: "KeyA" }          # Playwright key name

- perform: click
  selector: "#button"            # CSS selector
  # or:
  args: { selector: "#button" }

- perform: rightClick
  target: { x: 640, y: 360 }     # screen coords
  # or:
  selector: "#target"
  # or:
  args: { x: 640, y: 360 }

- perform: mouseMove
  args: { x: 100, y: 200 }

- perform: drag
  from: { x: 100, y: 100 }
  to:   { x: 200, y: 200 }
```

Every case marked `inputMode: authentic` (or `both`) **must** be exercised via `perform:` — not via `arrange:`. Bypassing the input chain via `arrange:` invalidates the test.

Supported `perform:` types: `keyPress`, `click`, `rightClick`, `mouseMove`, `drag`. Extend the runner if you genuinely need more (rare); prefer composing existing types.

### `capture:` — capture evidence at a moment

```yaml
- capture: <moment-name>
  at: [state, screenshot]        # required — what to capture; default [state, screenshot]
  probe: <probe-name>            # optional — which probe to call for state (default: snapshot)
  args: { ... }                  # optional — passed to the probe
  event: <channel>               # optional — which event channel to drain (for at: [events])
  tab: <tab-name>                # optional — default tab 0
```

Captures appear in `output.json` under `moments[]`. Available `at:` kinds:

| Kind | What it captures |
|---|---|
| `state` | Result of `adapter.probe.<probe>(args)` — JSON-serializable |
| `screenshot` | `screenshots/<moment>.png` (full viewport) |
| `hud` | `screenshots/<moment>-hud.png` — adapter.hudSelector clipped (silently skipped if no selector) |
| `dom` | `dom/<moment>.json` — Playwright AI-mode ARIA snapshot stored with its format |
| `console` | `console/<moment>.log` — buffered console messages since last drain |
| `events` | Drained events from `step.event` channel (must have subscribed earlier) |
| `timing` | `{ capturedAtMsFromStart }` — wall-clock offset since journey start |

`console` drains the buffer — subsequent captures see only newer lines.

### `subscribeEvent:` — subscribe before the action that emits evidence

```yaml
- subscribeEvent: combat
  filter: { type: "hit", actor: "me" }
  tab: <tab-name>
```

Creates the adapter event handle without waiting. Put this before the `perform:` step whose events matter. A later `waitForEvent:` uses that handle and preserves matching events for `capture: at: [events]`.

### `waitForEvent:` — wait for the Nth event on a channel

```yaml
- waitForEvent: <channel>
  filter: { type: "hit", actor: "me" }   # optional — exact-match keys
  timeout: 5000                          # optional — default 5000ms
  tab: <tab-name>
```

Requires a prior `subscribeEvent:` and polls `adapter.events.drain`, applying this step's exact-match `filter`, until `seen.length >= filter.nth ?? 1`. The earlier subscription filter may narrow transport volume; the wait filter owns the trigger condition. Throws on timeout. The runner preserves the matching events on the handle, so a later capture with `at: [events]` and the same `event:` records them instead of draining them away.

The `filter.actor: "me"` convention is project-specific — your adapter decides whether to resolve `"me"` to the local session/player.

### `waitForState:` — poll a probe until a predicate is true

```yaml
- waitForState:
    probe: <probe-name>
    predicate: "state.hp === 0"          # JS expression; `state` = probe return, plus bound vars
  timeout: 5000
  tab: <tab-name>
```

Calls the probe every 150ms and evaluates the predicate against `{ state, ...binds }`. Predicates execute as JavaScript in the runner process; this is not a security sandbox, so run only trusted repository-owned journeys.

### `waitMs:` — fixed delay

```yaml
- waitMs: 500
```

Used for animation settling, transition windows, etc. Prefer `waitForEvent:` or `waitForState:` when there's a concrete signal — `waitMs` is the brittle option.

### `expect:` — runner-level assertions

```yaml
- expect:
    - probe: <probe-name>
      args: { ... }
      predicate: "state.cooldown === 0"
    - capture: <moment-name>             # reuse a captured state
      predicate: "state.hp < $beforeHp"
```

Each entry asserts a predicate against either a fresh probe call or a previously-captured moment's `state`. Failures throw and halt the journey, but the assertion is still recorded in `output.expects[]` for the reviewer.

Predicates have the same trusted-code boundary as `waitForState:`. Bound values are available as `$name` in strings (interpolated before eval) and as `name` inside the predicate body.

### `loop:` — repeat with an index binding

```yaml
- loop: 3
  as: i
  do:
    - arrange: setValue
      args: { key: "counter", value: $i }
    - perform: keyPress
      args: { key: "Space" }
    - capture: iteration-$i
      at: [state, screenshot]
```

Executes `do[]` `loop` times, binding `$as` to `1..loop` each iteration. The bind is scoped to the loop body.

### `js:` — escape hatch

```yaml
- js: "await page.keyboard.type('hello'); await page.waitForTimeout(100);"
```

Runs trusted raw JS with `page` and `ctx` in scope. Use sparingly. The engineer must file a `schema-gap` ticket before running a journey containing `js:`, naming what the contract could not express; the ticket stays human-authored because only the engineer knows the missing capability and proposed extension. Without that ticket, do not run the journey.

## Output bundle

For each journey run, the runner writes:

```
<journeyDir>/
  output.json              # journey: <slug>, runAt, runnerId, exitCode, durationMs,
                           # covers[], moments[], expects[], errors[], tickets[]
  screenshots/<moment>.png
  dom/<moment>.json
  console/<moment>.log
```

Plus, at the artifact-dir level:

```
<artifactDir>/tickets/capability-gap-<ns>-<name>-<uid>.json
```

The QA Reviewer (`role-reviewer.md`) reads `output.json` plus the screenshot/dom/console artifacts to judge each case.

## Exit codes

- `0` — all `expect:` predicates passed, no errors
- `1` — at least one expect failure OR at least one error
- `2` — usage error (no journey path given)

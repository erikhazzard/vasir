# Gold-Standard Proof Gate Examples

These examples show the specificity bar for `$eval__design-proof-gates`.

They are **calibration examples, not templates**. Do not copy their IDs, paths, commands, thresholds, or domain nouns into a real eval plan unless repo discovery or the current user request makes them true. In a real repo, replace every threshold with a sourced value, an explicit user requirement, or a named assumption/blocker.

A gold-standard gate does five things:

1. proves the terminal value path, not implementation trivia;
2. names the weak proof that could lie;
3. binds setup, action, observation, verdict, target environment, artifact, and stop condition;
4. uses same-run orchestration when the claim is compound;
5. admits missing harnesses honestly instead of inventing commands.

---

## Example 1 — MMORPG Netcode: 100 Concurrent Live Players

### Scenario

We are building toward a multiplayer world where a player can join a live shard and trust that other players are really present, moving, disconnecting, reconnecting, and synchronized through the same transport path the real client uses.

### Proof-of-Value State

A live world session reaches 100 simultaneous server-recognized player sessions, keeps authoritative movement propagation inside budget while players move and a bounded reconnect churn runs, and a real browser observer sees the corresponding remote characters moving with websocket/frame evidence tied to the same run.

### Weak proof that is not enough

- A server-only load script reaches 100 socket connections but sends no realistic movement.
- A Playwright browser shows characters moving from local fixtures, not live netcode.
- Websocket payload shape is valid in isolation, but the browser freezes under load.
- A load test and browser test pass in separate runs with different seeds/session IDs.

### Gate Class Synthesis

| Required truth | Plausible lie this prevents | Gate class | Include? | Reason |
|---|---|---|---|---|
| The server accepts and tracks 100 concurrent player sessions in one world. | A synthetic script opens sockets but the game session never has 100 authoritative players. | Scale/performance | yes | The claim explicitly includes 100 live concurrent players. |
| Movement propagates from bots through the real transport path to a real observer. | Server state changes, but the client transport/render path is broken. | Realtime/convergence + Network/packet | yes | Netcode value is propagation, not only connection count. |
| A player can visually observe the live world under load. | Metrics pass while the actual browser is frozen, empty, or rendering stale characters. | Browser/render | yes | The user-facing proof is visible remote movement. |
| Load, browser, and packet evidence are from the same run. | Separate tests pass independently while the combined live experience fails. | Orchestrated compound | yes | The claim depends on concurrent conditions. |
| Reconnect churn does not corrupt presence or movement. | The happy path works, but normal disconnect/reconnect breaks identity or state convergence. | Failure/hostile | yes | Online worlds must survive expected churn. |
| Movement feels good. | Objective sync is correct but motion is visually jittery or uncomfortable. | Subjective human | maybe | Include only if feel/visual quality is in this milestone’s acceptance criteria. |
| Payment/security proof exists. | Irrelevant proof distracts from netcode value. | Security/privacy/auth | no | Excluded unless this milestone changes auth, identity ACL, or privacy boundaries. |

### S-Tier Gate Card

```yaml
id: "MMORPG-NETCODE__M1__G1"
kind: "milestone"
domain: "mixed"
gate_class: "orchestrated compound"
claim: "A live world session supports 100 concurrent moving players with authoritative state propagated to a real browser observer through the real realtime transport path."
value_path: "Player joins a live world, sees other players moving, and the observed movement corresponds to authoritative server state while the world is under 100-player load."
plausible_lie_prevented: "A socket-only load test, fixture-only browser test, or isolated websocket schema test passes while the combined live player experience fails."
setup: "Create one isolated world/session with deterministic seed `netcode-100-concurrent-seed`, one observer account, 100 bot player identities, and per-run `runId` propagated through server logs, bot telemetry, browser trace, and websocket/frame capture."
action: "Start one coordinator that ramps 100 bot clients into the world, moves them along bounded randomized paths, starts one Playwright observer in the same world, runs a bounded reconnect churn phase, captures browser/network/server/bot artifacts, and shuts down cleanly."
observation: "Server session metrics, bot telemetry, observer browser video/trace/screenshot, console/page-error log, websocket frame capture or repo-owned transport tap, and coordinator summary all tied to the same `runId` and steady-state time window."
pass_fail: "Pass only if all of these hold in the same run: server recognizes 100 simultaneous player sessions for the required steady-state window; observer sees at least 99 remote player entities excluding itself; sampled remote entities receive fresh movement updates within the sourced propagation budget; reconnect churn restores affected identities without duplicates or ghost avatars; websocket/frame samples contain the expected movement/snapshot fields under size ceilings; browser console/page errors are zero; coordinator exits nonzero on any observer failure. If any required observer is missing, blocked, or from a different runId, fail."
eval_tool: "missing harness: mmorpg-netcode-100-concurrent-observer-eval"
target_env: "Closest local or staging world runtime that exercises the real server, realtime transport, and browser client path."
data_payload: "World seed, runId, observer account, 100 bot identities, movement script, churn schedule, sampled entity list, sourced latency/size budgets."
fresh_artifact: "tmp/<datetime>__mmorpg-netcode-100-concurrent-observer/{summary.json,server.log,bots.ndjson,playwright-trace.zip,observer-video.webm,observer-screenshot.png,ws-frames.ndjson}"
harness_status: "missing"
ci_policy: "Non-default local eval"
stop_condition: "Invoke $eval__implement-proof-gate before product code. After harness exists, repair once, rerun this gate, then circuit-break on repeated similar failure."
required_before_product_code: "yes — this milestone’s definition of done is the 100-concurrent live netcode value path."
source_refs:
  - "User requirement: 100 concurrent netcode proof with bots, reconnect churn, Playwright observer, and websocket/devtools evidence."
```

### Orchestration Block

```yaml
orchestration:
  coordinator: "missing harness: mmorpg-netcode-100-concurrent-observer-eval"
  run_id: "Generated once by coordinator and injected into world/session metadata, bot telemetry, browser URL/session state, websocket/frame tap, and server log context."
  actors:
    - name: "bot clients"
      count: "100"
      behavior: "Connect to the same world, spawn once, send movement inputs on bounded randomized paths, report authoritative acknowledgements and last observed state."
    - name: "observer browser"
      count: "1"
      behavior: "Playwright-controlled real browser joins the same world as a player or observer, records video/trace/screenshot, captures console/page errors, and captures websocket frames through CDP or a repo-owned transport tap."
    - name: "server/world runtime"
      count: "1 isolated session/shard"
      behavior: "Publishes per-run connection count, tick/update rate, outbound messages, entity count, and error/invariant logs."
  scale_target: "100 simultaneous server-recognized player sessions, measured by authoritative server session metrics for the steady-state window."
  workload_duration: "Assumption unless sourced: 30s ramp-up + 120s steady state + 30s churn/recovery."
  churn_fault_model: "Assumption unless sourced: randomly disconnect/reconnect 10 bot identities during churn; pass requires no duplicate identities or ghost avatars and recovery to 100 recognized sessions inside the sourced recovery budget."
  observers:
    - "server metrics/logs with runId"
    - "bot telemetry with connection, movement, and acknowledgement timestamps"
    - "Playwright trace/video/screenshot/console-error log"
    - "websocket frame capture, Chromium CDP network events, or repo-owned realtime transport tap"
  correlation_rule: "Every artifact must include the same runId and overlapping steady-state timestamps; mismatched or missing runId fails the gate."
  aggregate_pass_fail: "Gate passes only if scale, convergence, browser render, websocket/frame evidence, churn recovery, and error policy all pass in the same run."
```

### Missing Harness Spec

```yaml
harness_name: "mmorpg-netcode-100-concurrent-observer-eval"
purpose: "Coordinate 100 live bot clients, one browser observer, realtime packet/frame capture, server metrics, churn, and artifact aggregation for the same world run."
permanent_source_location_or_creation_envelope: "repo-specific eval/tool domain, e.g. games/<gameId>/tests/netcode/<stable-name>.js or scripts/evals/netcode/<stable-name>.js; exact path must come from scoped AGENTS and repo discovery."
raw_artifact_location: "tmp/<datetime>__mmorpg-netcode-100-concurrent-observer/"
proposed_command: "to be created by $eval__implement-proof-gate"
required_payload: "world seed, runId, bot identity pool, observer auth/session state, movement script, churn model, propagation/size/error budgets"
pass_fail_condition: "Exactly the pass_fail field from MMORPG-NETCODE__M1__G1; the harness must fail closed if any observer is missing or uncorrelated."
why_existing_harnesses_are_insufficient: "No confirmed existing harness coordinates live bots, real browser rendering, websocket/frame evidence, churn, and server metrics under one runId."
required_before_product_code: "yes"
```

### Why this is S-tier

- It proves the combined user experience, not just socket count.
- It cannot pass with disconnected artifacts from different runs.
- It names what the missing harness must do without inventing a runnable command.
- It separates sourced requirements from assumptions.
- It provides enough detail for an implementation agent to build the eval harness without guessing actors, observers, payload, verdict, or artifacts.

---

## Example 2 — Checkout: Payment Creates Exactly One Order

### Scenario

We are building toward a checkout path where a buyer pays once, gets a confirmed order, and backend state remains correct even if the payment provider retries webhooks.

### Proof-of-Value State

A buyer completes checkout through the real browser flow against a sandbox payment provider; the app shows confirmation; exactly one durable order exists; duplicate webhook delivery does not create a second order; the operator can trace the payment-to-order link.

### Weak proof that is not enough

- A unit test verifies `createOrder()` with mocked payment data.
- A browser test reaches a “Thank you” page without verifying durable order state.
- A webhook handler test runs once but never replays the same webhook.
- Payment sandbox succeeds, but the app loses the provider event ID needed for support.

### Gate Class Synthesis

| Required truth | Plausible lie this prevents | Gate class | Include? | Reason |
|---|---|---|---|---|
| Buyer can complete the real checkout journey. | Backend unit tests pass while browser checkout is broken. | Terminal value-path + Browser/render | yes | The buyer-facing journey is the product value. |
| Payment provider success creates durable order state. | UI says paid, but no canonical order exists. | Persistence | yes | Money-adjacent flows require durable state proof. |
| Duplicate provider callbacks are idempotent. | Happy path works once but retry creates duplicate orders. | Idempotency/retry + Failure/hostile | yes | Payment providers retry webhooks by design. |
| Operator can trace payment to order. | Support cannot debug paid-but-missing-order incidents. | Observability/operator | yes | Operational trust is part of the unlock. |
| 10k RPS checkout load works. | Irrelevant performance gate bloats this milestone. | Scale/performance | no | Excluded unless the WIP declares a load target. |

### S-Tier Gate Card

```yaml
id: "CHECKOUT-PAYMENTS__M1__G1"
kind: "milestone"
domain: "mixed"
gate_class: "terminal value-path"
claim: "A buyer can pay through the real checkout flow and receive exactly one durable order even when the payment provider retries the success webhook."
value_path: "Buyer opens cart, pays in sandbox checkout, sees confirmation, and support/operator state links the payment provider event to one canonical order."
plausible_lie_prevented: "A mocked unit test or browser-only success page passes while durable order creation, idempotency, or operator traceability is broken."
setup: "Seed one test buyer, one cart with a known SKU and price, sandbox payment provider credentials from the repo-approved config path, and a test webhook event with stable provider event ID."
action: "Playwright completes checkout through the real browser route and sandbox payment UI, waits for confirmation, then replays the same provider success webhook once through the approved sandbox/test webhook path."
observation: "Browser confirmation state, order query result, payment/event audit record, webhook handler response/status, and logs/trace IDs for both initial and duplicate webhook deliveries."
pass_fail: "Pass only if the browser shows the confirmed order ID; exactly one order row/record exists for the payment provider event ID; duplicate webhook replay is acknowledged or safely ignored without a second order or second fulfillment; logs/audit link buyer ID, order ID, provider event ID, and trace/run ID; no checkout console/page errors occur."
eval_tool: "missing harness: checkout-sandbox-idempotent-order-eval"
target_env: "Local or staging app wired to the real sandbox payment provider and test database path."
data_payload: "buyer fixture, cart fixture, SKU/price fixture, sandbox payment intent/session, provider event ID, duplicate webhook payload"
fresh_artifact: "tmp/<datetime>__checkout-sandbox-idempotent-order/{summary.json,playwright-trace.zip,screenshot.png,order-query.json,webhook-replay.log,audit-log.ndjson}"
harness_status: "missing"
ci_policy: "Blocked until environment/credential exists"
stop_condition: "Halt for missing credential/environment. After sandbox config exists, invoke $eval__implement-proof-gate before product code if no harness exists."
required_before_product_code: "yes — payment correctness and idempotency define the milestone value."
source_refs:
  - "WIP C-### payment/order/idempotency contracts when available"
```

### Why this is S-tier

- It crosses browser, sandbox payment, webhook, persistence, and operator audit in one value path.
- It includes the hostile retry case that commonly breaks money flows.
- It does not claim proof if sandbox credentials or a real test webhook path are missing.
- It prevents a fake green result from a browser-only confirmation page.

---

## Example 3 — Agent Tool Workflow: Safe Calendar Scheduling

### Scenario

We are building toward an agent workflow where a user asks the assistant to schedule a meeting, and the system chooses the correct tool sequence without double-booking, leaking private context, or mutating calendar state before the user-approved point.

### Proof-of-Value State

Given a recorded user request and fixture calendars, the agent proposes the right slot, calls only allowed tools with valid bounded payloads, creates exactly one event after approval, and emits an audit trace showing no forbidden mutation happened before approval.

### Weak proof that is not enough

- A prompt snapshot says the assistant “should ask for approval.”
- A unit test validates the calendar payload schema but not the tool sequence.
- A golden transcript checks text output but not actual tool calls.
- Tool calls happen, but the audit trace cannot prove whether the event was created before approval.

### Gate Class Synthesis

| Required truth | Plausible lie this prevents | Gate class | Include? | Reason |
|---|---|---|---|---|
| Agent chooses the right sequence of search, proposal, approval, creation. | Text transcript looks good while the tool sequence is unsafe. | Agent/tool workflow | yes | Sequencing is the core workflow guarantee. |
| Calendar write happens only after approval. | The agent mutates state early but later text claims it waited. | Security/privacy/auth + Failure/hostile | yes | Tool mutation boundary is safety-critical. |
| Created event is correct and singular. | Tool schema passes but wrong time/attendees or duplicate event created. | Contract/API + Idempotency/retry | yes | User trust depends on exact calendar state. |
| Audit trace can prove what happened. | Humans cannot debug or verify agent/tool behavior. | Observability/operator | yes | Agent workflows need inspectable trace. |
| Browser visual test is required. | Irrelevant for a backend/tool workflow. | Browser/render | no | Excluded unless the workflow includes a UI surface. |

### S-Tier Gate Card

```yaml
id: "AGENT-CALENDAR-SCHEDULING__M1__G1"
kind: "milestone"
domain: "agent-tool-workflows"
gate_class: "agent/tool workflow"
claim: "The agent schedules one correct calendar event only after approval, using the allowed tool sequence and leaving an audit trace."
value_path: "User asks to schedule with constraints, agent checks availability, proposes one slot, receives approval, creates one event, and reports the confirmed details."
plausible_lie_prevented: "A transcript-only test passes while forbidden early mutation, wrong attendee/time, duplicate event creation, or missing audit evidence remains possible."
setup: "Golden user request, fixture calendar availability for user and attendees, allowed-tool policy, approval-turn fixture, and isolated calendar sandbox or deterministic fake backend that records canonical tool calls."
action: "Replay the user request through the agent harness, deny mutation before approval, inject explicit approval, then allow the create-event tool call and capture the full tool/audit trace."
observation: "Golden transcript diff, ordered tool-call trace, calendar sandbox state, audit log, and policy assertion output."
pass_fail: "Pass only if pre-approval tool calls are read-only; exactly one post-approval create-event call occurs; event time, duration, attendees, title, and timezone match expected fixture; no duplicate event exists after replay; audit trace records request ID, approval boundary, tool names, payload hashes, and final event ID; forbidden tools are not called."
eval_tool: "missing harness: agent-calendar-approval-boundary-eval"
target_env: "Repo-owned agent/tool sandbox or deterministic integration harness that exercises the real tool policy layer and calendar adapter boundary."
data_payload: "user request transcript, attendee availability fixtures, approval fixture, allowed/forbidden tool policy, expected event payload"
fresh_artifact: "tmp/<datetime>__agent-calendar-approval-boundary/{summary.json,transcript.md,tool-trace.json,audit-log.ndjson,calendar-state.json}"
harness_status: "missing"
ci_policy: "Default CI now"
stop_condition: "Invoke $eval__implement-proof-gate before product code if the harness does not exist; repair once and rerun on failure, then circuit-break on repeated similar failure."
required_before_product_code: "yes — the milestone is a safety-critical agent/tool workflow."
source_refs:
  - "WIP C-### tool authority/approval/audit contracts when available"
```

### Why this is S-tier

- It tests tool authority, not just assistant prose.
- It includes the forbidden-action boundary and exact mutation point.
- It leaves machine-readable audit evidence a human can inspect.
- It is deterministic enough for default CI if the repo has a sandbox/fake backend that preserves the real tool-policy boundary.

---

## Example 4 — Schema Migration: Backward-Compatible Replay Event Reads

### Scenario

We are evolving a persisted replay event schema, and existing replays must continue to load while new replays use the new shape.

### Proof-of-Value State

Old replay fixtures and new replay fixtures both read through the canonical replay loader; old records are not corrupted; new writes use the new schema; rollback/read compatibility is explicitly proven or blocked.

### Weak proof that is not enough

- Typecheck passes after changing the schema type.
- New fixture reads work, but old production-shaped records fail.
- A migration script runs once without verifying rollback or read-after-migration.
- Code handles both shapes but writes ambiguous mixed records.

### Gate Class Synthesis

| Required truth | Plausible lie this prevents | Gate class | Include? | Reason |
|---|---|---|---|---|
| Old persisted records still load. | New code silently breaks existing user data. | Migration/compatibility | yes | Existing durable data is part of the product. |
| New writes use the intended schema. | Compatibility code works but new records keep old/ambiguous shape. | Persistence + Contract/API | yes | Migration value includes forward schema correctness. |
| Rollback/read strategy is safe. | One-way migration creates unrecoverable data risk. | Failure/hostile | yes | Data integrity requires reversibility or explicit no-rollback decision. |
| UI visual quality is proven. | Not relevant unless the migration changes visible playback. | Browser/render | no | Excluded for pure loader/storage migration. |

### S-Tier Gate Card

```yaml
id: "REPLAY-SCHEMA-MIGRATION__M1__G1"
kind: "milestone"
domain: "persistence-networking"
gate_class: "migration/compatibility"
claim: "The replay loader can read old and new persisted event records, while new writes use the new schema without corrupting existing replay data."
value_path: "Existing replay remains loadable after deploy; newly captured replay writes the new event shape; operator can verify compatibility from fixture/query output."
plausible_lie_prevented: "Typecheck or new-fixture-only tests pass while old durable replay records fail or new writes remain ambiguous."
setup: "Immutable old-schema replay fixture from production-shaped data, new-schema replay fixture, isolated test store, canonical replay loader/writer entrypoints, and expected normalized event output."
action: "Load old fixture through canonical loader, load new fixture through canonical loader, write a new replay through canonical writer, then query raw stored event shape and normalized loader output."
observation: "Normalized loader outputs for old/new fixtures, raw write query output, migration/compatibility logs, and rollback/read strategy result."
pass_fail: "Pass only if old fixture loads to expected normalized events; new fixture loads to expected normalized events; new write stores only the new schemaVersion/encoding shape; no old fixture is mutated during read; malformed mixed-version records fail closed with a validation error; rollback/read compatibility is either proven by a reverse/read fixture or explicitly blocked with approved no-rollback decision."
eval_tool: "missing harness: replay-schema-compatibility-eval"
target_env: "Local integration test environment using the canonical persistence adapter or a repo-approved recorded fixture store."
data_payload: "old-schema replay fixture, new-schema replay fixture, malformed mixed-version fixture, expected normalized event JSON"
fresh_artifact: "tmp/<datetime>__replay-schema-compatibility/{summary.json,old-normalized.json,new-normalized.json,new-raw-write.json,malformed-result.json}"
harness_status: "missing"
ci_policy: "Default CI now"
stop_condition: "Invoke $eval__implement-proof-gate before product code; if rollback/read compatibility cannot be proven inside scope, emit Plan Delta for human data-risk decision."
required_before_product_code: "yes — migration changes cannot proceed without durable-data compatibility proof."
source_refs:
  - "WIP C-### schema/persistence/rollback contracts when available"
```

### Why this is S-tier

- It uses old and new durable fixtures, not just compile-time types.
- It checks reads, writes, malformed data, and rollback/read strategy.
- It treats existing data as user value, not implementation baggage.

---

## How to Generate New Examples at This Bar

When asked for examples for a new feature, do not start by naming tests. Start with the lies weak tests would allow.

Use this pattern:

1. **Name the value claim.** What would the user/operator/system now be able to do?
2. **List 3-7 required truths.** What must be true for that claim to be real?
3. **For each truth, name the plausible lie.** What weak proof could pass while value is broken?
4. **Choose gate classes.** Include the smallest set that kills those lies.
5. **Make compound claims same-run.** If conditions must hold together, one coordinator must run actors and observers concurrently.
6. **Write a gate card.** Include setup, action, observation, pass/fail, target env, artifact, harness status, CI policy, and stop condition.
7. **Admit missing harnesses.** Use `missing harness: <stable-name>` with a spec detailed enough to implement.
8. **Separate objective from subjective.** If human taste/feel/readability matters, require an artifact-backed human question.

A new example is S-tier only when an implementation agent could build the missing harness from the spec without guessing the actors, observers, payload, verdict, or artifact bundle.

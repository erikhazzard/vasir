---
name: code__crafting-dev-ux
description: Design every internal API, module, function, config surface, error type, event/message shape, and CLI so it’s trivially easy to use correctly and hard to use incorrectly — for both human developers and LLMs. Dev UX includes interface shape *and* the surrounding system, findability, first-success, workflow/debuggability, migration UX, governance/enforcement, and DX feedback loops.
use_when: Use BEFORE writing/modifying any interface surface (exports, signatures, schemas, CLI commands, error models, events, internal SDKs).
---

# Dev UX Skill

## Mission
Create a **Pit of Success**: correct usage is the default path; misuse requires deliberate effort; semantics are explicit; evolution is survivable; **LLMs can select the right surface and generate correct usage from the interface + examples alone**.

**Dev UX = Surface + System.** A perfect API that can’t be found, started, debugged, upgraded, or enforced is still a DX failure.

### Four “green” tests (must all pass)
1. **Role-expressiveness:** from signature/types + 1 example, a competent dev infers the common call, I/O shape, and top failure modes.
2. **Findability:** a competent dev (and LLM) can locate the correct entrypoint in <2 minutes via stable import path + obvious keywords.
3. **First success:** a new consumer can achieve a working “hello world” in <5 minutes with copy/paste runnable example.
4. **Debug story:** when it fails in prod, you can go from symptom → identifier → logs/traces → root cause without tribal knowledge.

**Pit scale:** 🟢 obvious+safe · 🟡 usable but sharp edges · 🔴 confusing · ⛔ the easy path is wrong.  
If any test < 🟢, redesign before shipping.

---

## 0) Scope & Output Mode (Required)
Classify the change, then choose output mode:

**Change class (pick one):**
- `NEW_BOUNDARY` (new module/SDK/CLI/API/event family)
- `NEW_PUBLIC_SURFACE` (new export / new schema / new command)
- `MODIFY_PUBLIC_SURFACE` (behavior/semantics/options/errors/migration impact)
- `MECHANICAL_CHANGE` (rename, refactor, pure typing, no semantic change)
- `HOT_PATH_TWEAK` (perf/alloc/logging-sensitive)

**Output mode:**
- `FULL` for `NEW_*`, `MODIFY_PUBLIC_SURFACE`, or any semantic/compatibility change.
- `LIGHT` for `MECHANICAL_CHANGE` only (still must cover semantics impact + compat check + example drift risk).
- If unsure: choose `FULL`.

State both at the top of your response.

---

## 1) Design Brief (Always produce; state assumptions if missing)
Write tight bullets. No hidden constraints.

1. **Consumers:** humans (team + skill level) + **LLM generating code** (always include)
2. **Boundary type:** in-process function / module export / SDK / config / CLI / event / network API / async job (one or more)
3. **Capability statement:** “A developer can ____” (one sentence; outcome-focused)
4. **Findability contract:** canonical entrypoint/import path/command + repo location + 3 search keywords + 2 related modules + “don’t use X for this”
5. **First-success journey:** prerequisites + 3–10 line runnable example + expected output/result shape + local run command (if applicable)
6. **Workflow graph:** common next step after success + common follow-up operation + cleanup/shutdown step (if any)
7. **Use cases:** 80% common + 15% advanced + 5% expert escape hatch
8. **Misuse top 3:** what callers will do wrong first (and why)
9. **Semantics that must be explicit (if relevant):** side effects, ordering, durability, idempotency, retries, timeouts, cancellation, lifecycle/ownership, backpressure/limits, partial failure
10. **Performance posture:** hot vs cold; alloc/log limits if hot
11. **Security posture:** authn/authz assumptions, PII/redaction, secret sourcing, least-privilege defaults, dangerous ops ceremony
12. **Compatibility posture:** new vs existing surface; breaking-change budget; versioning/deprecation expectations; rollout constraints
13. **Validation strictness:** strict / tolerant / compat-strict + unknown-field policy
14. **Observability & diagnostics:** correlation/trace IDs; required context fields; where identifiers surface (logs/errors/events); redaction rules
15. **Parity constraints:** cross-language/runtime equivalence requirements (if multi-lang)
16. **Governance:** owner, stability level (`experimental`/`internal`/`public`), review gate (PR-only vs RFC)
17. **DX signals:** what you’ll measure to detect confusion/misuse (error codes, warnings, adoption, migration completion)

---

## 2) Non‑Negotiables (Skip one → you’re designing support tickets)
1. **Progressive disclosure:** Level 1 minimal + safe defaults; Level 2 options object; Level 3 composable primitives (same concepts, not a second API).
2. **Constrain misuse structurally:** types/enums/schemas > prose; make invalid states hard to express.
3. **Defaults are policy:** safe + boring by default; perf/risk is explicit opt-in.
4. **Errors are recovery protocols:** stable code + what/why/how + structured context + redaction-safe.
5. **Validation at boundaries:** fail early with actionable errors; internals assume validated inputs (esp. hot paths).
6. **No deep imports for public use:** public surfaces have **stable entrypoints**; internal paths are intentionally inconvenient.
7. **Findability is part of the interface:** predictable names, canonical entrypoints, and a capability index entry for non-trivial domains.
8. **First success is mandatory:** include a runnable “hello world” example that matches reality.
9. **Debug story is mandatory:** every failure yields an identifier that links to logs/traces; diagnostic modes exist where relevant.
10. **Evolution is UX:** additive-by-default; breaking changes require a migration kit (shim + guidance + timeline, codemod when feasible).
11. **Consistency across ecosystem:** naming, options shapes, return envelopes, error codes, lifecycle patterns — learn once, predict everywhere.
12. **Truth maintenance:** examples/schemas are machine-checked against reality (compile/run/validate) or you’re shipping future lies.
13. **Governance beats heroics:** standards must be enforceable (lint/templates/checks), not “remembered.”

---

## 3) Minimum DX Stack by Interface Type (What “done” means)
Each surface must satisfy **Surface + Findability + First success + Debug + Evolution + Automation**.

| Interface Type | Minimum DX Requirements |
|---|---|
| Public function/method | Level 1/2/3 + precise types + boundary validation + structured errors + explicit semantics + ≥1 runnable common-case example + misuse→error example |
| Module export / SDK | **Single canonical entrypoint** + no deep imports + top-of-file quickstart + consistent return envelopes + “public vs internal” markers + capability index entry + related/anti-goals |
| Config/options | defaults + precedence rules + schema validation w/ fix suggestions + units in names + secrets guidance + unknown-field policy + example config + migration notes |
| Error model | standard shape (code/message/context/suggestion/retryable/cause) + redaction rules + mapping (HTTP/CLI) + stable taxonomy + diagnostics identifiers |
| Event/message | standard envelope incl. version + schema (JSON Schema/AsyncAPI/proto) + example payload + evolution rules + consumer guidance + tooling hooks for validation |
| Network API | OpenAPI + pagination/filter conventions + Problem Details errors + idempotency/timeout/retry semantics + auth model + migration strategy |
| CLI | common case works with zero flags + `--help` + explicit exit codes + `--json` output option + `--dry-run` or `--explain` where relevant + `doctor`/`validate` command if non-trivial + config precedence documented |

---

## 4) Progressive Disclosure (Master framework)
**Rule:** call-site complexity scales with use-case complexity.

- **Level 1 (80%):** minimal args, safe defaults
- **Level 2 (15%):** `options` object (no telescoping params)
- **Level 3 (5%):** composable primitives reusing the same concepts

Example (TS/JS):
```javascript
// ❌ telescoping params forces expert mode for everyone
sendMessage(channelId, text, priority, ttlMs, partitionKey, idempotencyKey, metadata);

// ✅ three levels, one mental model
await sendMessage(channelId, "hello"); // L1
await sendMessage(channelId, "hello", { priority: "high", ttlMs: 5_000 }); // L2
const msg = buildMessage({ channelId, text: "hello", idempotencyKey: `send:${nonce}` }); // L3
await messagePipeline.ingest(msg);
```

Rules:

* If you have **>2 params**, prefer an options object (except intrinsic pairs like `(id, value)`).
* Never require inputs the system can derive.
* Level 3 must be discoverable (exported intentionally, documented, indexed).

---

## 5) Discoverability & Navigation (Make the right thing easy to find)

### Rules

* **Canonical entrypoint:** one obvious import path / module entry / CLI command per capability.
* **No deep imports** for public usage:

  * ✅ `import { sendMessage } from "messaging"`
  * ❌ `import { sendMessage } from "messaging/internal/send"`
* **Search-friendly naming:** avoid generic verbs (`process`, `handle`, `doThing`); include domain nouns in symbols and filenames.
* **Public surface declaration:** mark public exports explicitly (e.g., index.ts + @public JSDoc tag...)
* **Capability index:** for any non-trivial subsystem, maintain a small index mapping “what I want to do” → entrypoint.

Example capability index (keep tiny; optimize for grep + LLM retrieval):

```javascript
// src/capabilities/index.js
export const CAPABILITIES = Object.freeze([
  { task: "send a message", entry: "src/messaging", symbol: "sendMessage", keywords: ["message", "channel", "ttl"] },
  { task: "list channels", entry: "src/channels", symbol: "getChannels", keywords: ["channel", "list"] },
]);
```

### Module README header template (first screen matters)

```md
# Messaging
Use when: you need reliable channel delivery with idempotency and TTL.
Start here: sendMessage(channelId, text, options?)
Common flow: getChannels → sendMessage → (optional) getMessageStatus
Related: Channels, MessagePipeline
Anti-goals: not for bulk fanout; not for untrusted external input (use Network API)
Diagnostics: every call emits requestId/traceId; see errors.docsRef
```

---

## 6) First Success & Workflow Ergonomics (Optimize the daily loop)

### Rules

* Provide a **copy/paste runnable** common-case example with expected output/shape.
* Provide the **“next obvious step”** after success (workflow graph), not just a single call.
* Provide **inspection affordances**:

  * SDK: `describeConfig()`, `health()`, `validate()`, or `explain()` where relevant
  * CLI: `--json`, `--verbose`, `--debug`, `--trace`, plus `doctor` / `validate` for non-trivial tools
* Prefer **dry-run/explain** modes for dangerous or irreversible actions.

Example “first success” snippet (SDK):

```ts
// 1) common case
const { messageId, status } = await sendMessage("ch_123", "Hello!");
// expected: { messageId: "msg_...", status: "sent" | "queued" }

// 2) next obvious step
const { message } = await getMessage(messageId);
```

Example CLI ergonomics:

```bash
# common case: zero flags
tool send --channel ch_123 --text "Hello"
# diagnostics:
tool send --channel ch_123 --text "Hello" --dry-run --json --trace
tool doctor
```

---

## 7) Contracts & Semantics (Make the invisible visible)

When relevant to the boundary, make explicit:

* **Side effects:** what changes, where, and when it’s durable
* **Success semantics:** under retries/partial failure
* **Ordering guarantees:** preserved / best-effort / undefined
* **Idempotency:** supported? required? dedupe scope?
* **Timeouts & cancellation:** default? mechanism (`AbortSignal`, `context.Context`, etc.)
* **Retries:** safe? who retries? backoff responsibility?
* **Lifecycle/ownership:** init/shutdown/dispose; resource ownership
* **Backpressure/limits:** queue limits, drop policy, slow-consumer behavior
  If you can’t state semantics cleanly, the interface isn’t done.

---

## 8) Defaults, Config, Validation (Defaults are decisions you take off the caller)

Rules:

* Every optional param has a safe default (no default = design smell).
* Units in names (`timeoutMs`, `maxBytes`, `count`).
* Prefer enums over booleans beyond two states (`mode: "strict" | "tolerant"`).
* **Strictness is a choice:** `strict` / `tolerant` / `compat-strict` + unknown-field policy.

Config precedence (when applicable): `defaults < file/config < env < flags (last wins)` — document it.

Secrets:

* Never require secrets in code literals.
* Document sourcing (env/secret manager) and ensure errors never print secret values.

---

## 9) Errors & Diagnostics (Recovery instructions + traceability)

### Standard error shape (language-agnostic contract)

* `code` (stable, machine-matchable)
* `message` (human summary)
* `context` (structured, redaction-safe)
* `suggestion` (concrete fix)
* `retryable` (`"no" | "safe" | "unsafe"`)
* `cause` (optional)
* `requestId` / `traceId` (when available)
* `docsRef` (stable local anchor, e.g., `"messaging#sendMessage"`)
* optional next-action metadata: `retryAfterMs`, `limit`, `parameter`, etc.

Example:

```json
{
  "code": "CHANNEL_NOT_FOUND",
  "message": "Channel \"ch_999\" not found",
  "context": { "channelId": "ch_999", "environment": "prod" },
  "suggestion": "Call getChannels() to list valid IDs; verify you’re using the correct environment.",
  "retryable": "no",
  "requestId": "req_01J...",
  "traceId": "tr_01J...",
  "docsRef": "messaging#sendMessage"
}
```

Rules:

* No generic errors. If you know what happened, say it.
* Include the bad value (truncate large payloads; redact secrets/PII).
* Errors must make **the next action** obvious.
* Hot path: pre-validate once at ingress; keep inner-loop error work minimal; enrich at reporting boundary.

Boundary mapping:

* HTTP: map to Problem Details + your internal fields.
* CLI: explicit exit codes; concise message + suggestion; `--json` structured output.

---

## 10) Naming, Return Envelopes, and Concept Budget (Language is the UI)

Naming rules:

* Functions: verb+noun (`sendMessage`, `validateToken`)
* Data: noun phrases (`playerSession`, `replaySegment`)
* Booleans: predicates (`isConnected`, `hasPermission`)
* Enums for state (`status: "active" | "paused" | "expired"`)
* Same concept, same term within a bounded context; translate at explicit boundaries.

Return envelope standardization (choose one ecosystem pattern; don’t freestyle):

```ts
// ✅ predictable, learn-once pattern
getUser(userId) -> { user: User }
getChannel(channelId) -> { channel: Channel }
getMessages(...) -> { messages: Message[] }
```

**Concept Budget (required in FULL):**

* List new concepts introduced (types, terms, modes).
* List concepts removed/replaced.
* If concept count increases, justify with reduced call-site complexity or safety.

---

## 11) LLM Consumers (Assume zero tribal knowledge)

Rules:

* Every public interface includes ≥1 runnable common-case example; add ≥1 advanced example if Level 2 exists.
* Types must constrain: unions/enums/schemas > `string`/`any`.
* Document provenance: “`channelId` comes from `getChannels()`.”
* Explicitly list thrown/returned errors and return shape.
* For boundary-crossing interfaces, include machine-verifiable artifacts (OpenAPI/JSON Schema/proto).

Codebase navigation rules for LLMs (and humans):

* Consistent file structure across modules.
* `index.ts` (or equivalent) is the public API; internals live elsewhere and are not required knowledge.
* Capability index exists for non-trivial domains.

---

## 12) Evolution, Compatibility, and Migration Kits (Upgrades are UX)

Rules:

* Prefer additive changes over breaking renames.
* Never silently change semantics under the same name.
* Events/config must carry a `version` and clear evolution rules.
* Breaking changes require a **migration kit**:

  * deprecated wrapper/shim (with timeline)
  * migration doc snippet
  * warning mechanism (compile-time or runtime)
  * codemod when feasible
  * breakage budget + rollout plan

Example deprecation:

```ts
/** @deprecated Use sendMessage(channelId, text, options) — removed in v3 (2026-06-01). */
export async function send(channelId: string, text: string) {
  warnOnce("messaging.send is deprecated; use sendMessage. See messaging#migration-v3");
  return sendMessage(channelId, text);
}
```

---

## 13) Parity (If multi-language / multi-runtime)

If the same capability exists across languages/runtimes:

* Error **codes** and semantics must match.
* Defaults must match unless explicitly documented as divergent.
* Idiomatic differences are allowed only at the mechanism layer (e.g., `AbortSignal` vs `context.Context`), not semantics.

---

## 14) Governance & Enforcement (Make it real)

Minimum governance for public surfaces:

* **Owner** and stability level (`experimental`/`internal`/`public`) must be stated.
* Define review gate:

  * `PR` for small additive changes
  * `RFC` for new boundaries, breaking changes, or new concepts
* Enforcement hooks (prefer automation over memory):

  * lint rules for naming/import paths
  * schema validation in CI
  * error code registry/taxonomy check (no collisions)
  * compile/run checks for examples/snippets where feasible
  * templates/generators for new modules/surfaces

---

## 15) Documentation Truth Maintenance (Prevent rot)

Rules:

* Examples must match real return shapes and real errors.
* Prefer executable snippets:

  * compile checks for TS/Go
  * doctests/snippet tests where supported
* Schemas/types should be single source of truth; docs validated against them.
* Every public surface has a stable `docsRef` anchor used by errors/warnings.

---

## 16) Measurement & Feedback Loops (DX is empirical)

For non-trivial surfaces, define at least one DX signal per category:

* **Confusion/misuse:** frequency of specific validation errors; unknown-field warnings; common “did you mean” paths
* **Adoption:** call volume; number of distinct consumers
* **First-success:** time-to-first-success proxy (e.g., docs quickstart run in CI; onboarding checklist completion)
* **Migration:** percent migrated; deprecation warning counts; remaining call sites

Use these signals to drive iterative DX improvements (tighten types, improve suggestions, add recipes, add codemods).

---

## 17) Pre‑Implementation Simulation (Required in FULL)

Before coding, simulate the consumer experience:

1. **Find it:** show the canonical entrypoint + the 3 search keywords that locate it.
2. **First success:** write the runnable common-case snippet + expected output/shape.
3. **Next step:** write the next obvious call in the workflow.
4. **Advanced case:** write the Level 2 call (if applicable).
5. **Misuse case:** write the most likely mistake and the exact error (code + suggestion + docsRef).
6. **Debug story:** show the identifier that gets you to logs/traces (requestId/traceId) and where it appears.
7. **Migration scenario:** old → new with shim/warning; include timeline; codemod note if feasible.
8. **Concept budget:** list concepts added/removed; justify net-new concepts.
9. **Pit check:** 🟢🟡🔴⛔ across all four tests; if not 🟢, redesign.

---

## Required Output Format (When this skill is invoked)

### FULL (use for `NEW_*`, `MODIFY_PUBLIC_SURFACE`, semantic/compat changes)

Use these headings exactly:

1. **Scope** (change class + output mode)
2. **Design Brief**
3. **Findability & Entry Points** (canonical import/command; capability index entry; related/anti-goals)
4. **Proposed Interface** (Level 1/2/3 signatures or boundary equivalents; return envelope; concept budget note)
5. **Semantics** (only relevant items; be explicit)
6. **Defaults, Validation, and Security Posture** (strictness, unknown fields, redaction, secrets, dangerous ops ceremony)
7. **Errors & Diagnostics** (error codes + shape + 1–2 example errors incl. docsRef + requestId/traceId behavior)
8. **Examples (runnable)** (common case + next step + advanced case if any + misuse→error)
9. **Machine-Readable Artifact** (OpenAPI/JSON Schema/proto if boundary warrants; otherwise precise types)
10. **Compatibility, Migration Kit, and Timeline** (shim/warnings/codemod; breakage budget)
11. **Governance & Enforcement Hooks** (owner, stability, review gate, lint/CI/doc-check plan)
12. **Verification Plan** (tests described as user journeys; include “examples stay true” check; hot-path perf guard if applicable)
13. **DX Signals** (what you’ll measure to detect confusion + migration progress)

### LIGHT (mechanical-only changes)

Use these headings exactly:

1. **Scope**
2. **Change Summary**
3. **Compatibility Check** (why this is non-breaking; migration impact = none)
4. **Example Drift Risk** (what examples/docs/tests must be updated/verified)
5. **Verification Plan** (small, journey-framed)

---

## Edge Cases & Robustness Rules

* If the request is ambiguous: state assumptions explicitly, choose safe defaults, and design so later tightening is additive.
* If constraints conflict (perf vs safety vs compatibility): present the tradeoff, choose the safest default, and provide an explicit escape hatch.
* If existing ecosystem patterns conflict: prefer consistency with the dominant pattern; if you must diverge, document why and provide a wrapper/migration path.
* For hot paths: minimize allocations/log formatting; validate once at ingress; keep rich diagnostics at the boundary.
* Never introduce “magic” requirements (global state, import order, hidden env vars) without making them explicit and discoverable.

---

## Guardrails

* Don’t break callers without a migration kit (shim + timeline; codemod when feasible).
* Don’t add abstraction layers unless they reduce concept count at call sites.
* Don’t ship un-enforceable standards; prefer lint/templates/CI checks.
* If external references aren’t provided, don’t cite them — treat this document and the repo’s conventions as source-of-truth.

---

# Appendix
## JSDoc Patterns That Help LLMs
### Pattern: Source References in `@param`
Describe where valid values come from when possible
```javascript
/**
 * @param {string} channelId - Target channel (from getChannels().channels[].id)
 * @param {string} userId - User ID (from getCurrentUser().userId)
 * @param {string} runId - Replay run (from createRun().runId)
 */
```


### Pattern: `@example` for Every Public Function
This is the single highest-impact thing you can do for people / LLMs reading code. 

```javascript
/**
 * @example
 * // Common case
 * const { channel } = await getChannel("ch_123");
 * console.log(channel.name); // "general"
 *
 * @example
 * // With error handling
 * try {
 *   const { channel } = await getChannel(channelId);
 * } catch (error) {
 *   if (error.code === 'CHANNEL_NOT_FOUND') {
 *     // handle missing channel
 *   }
 * }
 */
```

### Pattern: `@throws` for Error Handling Generation

```javascript
// ❌ wraps in generic try/catch or skips error handling
/** No @throws documented */

// ✅ specific error handling
/**
 * @throws {ChannelNotFoundError} channelId doesn't exist (code: CHANNEL_NOT_FOUND)
 * @throws {PermissionDeniedError} caller lacks write access (code: PERMISSION_DENIED)
 * @throws {RateLimitError} too many requests (code: RATE_LIMIT_EXCEEDED)
 */
```

## File & Module Structure Patterns

### Predictable Directory Layout

LLMs navigate by pattern. If every module follows the same layout, the LLM finds what it needs immediately.

```
src/
  messaging/
    index.js            ← public API (imports + re-exports)
    send.js             ← implementation
    subscribe.js        ← implementation
    errors.js           ← domain error classes
    types.js            ← JSDoc typedefs / TS types
    tests/
      send.test.js
      subscribe.test.js
  replay/
    index.js            ← same structure
    pipeline.js
    errors.js
    types.js
    tests/
```

### Index Files as Public API Surface

```javascript
// src/messaging/index.js
// This file IS the module's public API.
// Everything exported here is supported.
// Everything not exported here is internal.

export { sendMessage } from './send.js';
export { getMessages } from './get.js';
export { onMessage } from './subscribe.js';

// Advanced / building blocks
export { buildMessage } from './message-builder.js';
export { MessagePipeline } from './pipeline.js';

// Errors
export { ChannelNotFoundError, MessageTooLargeError } from './errors.js';

// Types (for JSDoc consumers)
/**
 * @typedef {object} Message
 * @property {string} messageId
 * @property {string} channelId
 * @property {string} text
 * @property {number} createdAtMs
 * @property {'sent'|'delivered'|'read'} status
 */
```

### AGENTS.md at Folder Root

A single document that orients both humans and LLMs to the codebase:

```markdown
# Architecture

## Directory Structure
- `src/messaging/` — Channel messaging (send, receive, subscribe)
- `src/replay/` — Game replay recording and playback
- `src/admin/` — Admin tooling and player insights

## Key Patterns
- All modules use progressive disclosure (see dev-ux skill)
- All async functions return `{ data }` shape, never raw values
- All errors extend AppError with code + context + suggestion
- Config loaded via `src/env.js` only (code__principles §3.2)

## Data Flow
1. Client → API Gateway → Message Router → Channel Pipeline → Storage
2. Storage → Replay Builder → Segment Store (S3)
```

## Naming Patterns That Reduce LLM Hallucination

### Consistent Prefixes/Suffixes

```javascript
// ❌ Inconsistent — LLM can't predict the pattern
getUserData()     // returns { user }
fetchChannel()    // returns { data: channel }
loadRoomInfo()    // returns room

// ✅ Consistent — LLM predicts correctly after seeing one
getUser()         // returns { user }
getChannel()      // returns { channel }
getRoom()         // returns { room }
```

### ID Parameters Always End in `Id`

```javascript
// ❌ LLM may confuse the full object with its ID
function joinRoom(room, player) { ... }

// ✅ Unambiguous — clearly expects IDs, not objects
function joinRoom(roomId, playerId) { ... }
```

### Avoid Overloaded Names

```javascript
// ❌ "data" means something different in every context — LLM picks wrong one
function process(data) { ... }
const data = await fetch(url);
const data = parseMessage(raw);

// ✅ Specific names for specific things
function processReplaySegment(segment) { ... }
const httpResponse = await fetch(url);
const parsedMessage = parseMessage(rawBytes);
```

## Error Codes as LLM Affordance

LLMs use error codes to generate correct error handling. Consistent error codes across the codebase let the LLM pattern-match:

```javascript
// Standard error code format: DOMAIN_SPECIFIC_ERROR
// Examples:
'CHANNEL_NOT_FOUND'
'CHANNEL_PERMISSION_DENIED'
'MESSAGE_TOO_LARGE'
'MESSAGE_RATE_LIMITED'
'REPLAY_SEGMENT_CORRUPTED'
'REPLAY_RUN_NOT_FOUND'

// LLM can now generate:
try {
  await sendMessage(channelId, text);
} catch (error) {
  switch (error.code) {
    case 'CHANNEL_NOT_FOUND':
      // ... LLM generates specific handling
      break;
    case 'MESSAGE_TOO_LARGE':
      // ... LLM generates specific handling
      break;
  }
}

---
name: code-audit-security
description: "Audit backend code, schemas, policies and configuration for exploitable authorization, trust-boundary, economic-state, replay and concurrency defects. Use for a requested security review or a named material security risk; this is a static audit with evidence-backed findings."
license: MIT
metadata:
  gc-owner: "erik"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-capability: "engineering"
  gc-status: "draft"
  gc-tags: "backend, security, authorization, game economies, idempotency, concurrency"
  gc-source: "https://github.com/erikhazzard/vasir/tree/b5ba2208bba5f0dc261768a3495bec7a445863e4/.agents/skills/security__auditing-code"
  gc-source-revision: "b5ba2208bba5f0dc261768a3495bec7a445863e4"
  gc-source-sha256: "bdf2e44fd21203269422b8f873d9e00a45e3d2a29724d06512b8b86396b07bb7"
  gc-adaptations: "Portable metadata and project authority; preserved static audit, independent inputs, domain investigation and replay contracts; added causal confirmation and counterevidence checks; separated severity, confidence and urgency; replaced mandatory grading and repeated report matrices with concise evidence-backed findings."
---
# Backend Security Audit

**Role**
Review as an application security engineer responsible for helping maintainers find and close consequential vulnerabilities in backends, game economies, payments, inventories, and admin/support surfaces.

**Investigate broadly; confirm each finding; prioritize the demonstrated consequence.** A useful audit discovers reachable failures that ordinary review misses and gives the maintainer enough evidence to act. More findings, stronger severity labels, and longer reports are not evidence of better coverage. Keep searching high-risk paths after the first finding; allow zero confirmed findings when the reviewed paths support none.

You think in terms of:
- trust boundaries,
- workflow/state machines,
- authorization graphs,
- invariant boundaries,
- duplicate side effects under retry,
- race windows,
- and value/privilege appearing without authoritative provenance.

You assume:
- every public route will be discovered,
- every client-controlled field will be tampered with,
- retries, timeouts, duplicate deliveries, and parallel requests are normal,
- hidden routes, frontend validation, obscurity, and "internal-only" comments are not controls,
- and logs/rate limits/WAFs do NOT compensate for broken invariants on privileged mutations.

Produce a defensive static audit of the provided materials: code first, plus adjacent migrations, schema, policy files, route definitions, middleware, workers, IaC, gateway configuration, feature flags, repair scripts, and docs. Identify reachable exploit paths, recurring bug families, evidence gaps, and the smallest independently shippable fixes. You never rewrite code during the audit.

## Independent review inputs and scope

Review independently using the same existing repo folder. Inputs are the materials under audit (code, schema, policy, config, docs) and the audited surface's scope. Re-derive claims from these materials rather than adopting the author's conclusions; if authoring history is supplied, identify that limitation on independence without treating it as a software vulnerability. Do not modify the audited surface. Follow the destination repository's instructions and the user's existing authorization.

The `SHIP`/`NO-SHIP` verdict is an audit recommendation, not an automatic approval or release gate. Return the report in the conversation; persist it only when requested by the user or repository, at its specified or appropriate location. This skill has no required companion skill or fixed report directory. When the user also requests repairs or verification, complete the static audit and continue that authorized work through the project's normal workflow; audit-only scope does not require a new confirmation.

**Mission**
Audit the provided materials against production-grade security standards:
- default deny,
- server-authoritative decisions,
- least privilege,
- explicit business invariants,
- atomic or compensation-safe mutations,
- idempotent side effects,
- durable auditability,
- observable abuse detection,
- and safe incident containment/recovery.

Use OWASP ASVS / API Security / business-logic thinking and modern identity guidance as baseline sanity checks — not checklist theater.

**What "good" means**
Optimize for:
1. real exploitability over generic issue lists,
2. coverage of high-risk flows over surface-level scanning,
3. observed controls over assumed controls,
4. proof of closure over aspirational fixes,
5. concrete fix boundaries over vague advice.

---

## Epistemics & Control Provenance

Label important claims clearly:
- **FACT** = directly supported by observed code/config/schema/docs
- **INFERENCE** = likely exploit consequence derived from facts
- **ASSUMPTION** = an explicit condition used for conditional analysis, not an observed fact
- **UNKNOWN** = relevant control/evidence not present in supplied materials

For every major control, state its **provenance**:
- `app` = handler/service/domain code
- `middleware` = framework/global middleware/interceptor/filter
- `schema` = DB constraints, indexes, FK/CHECK/UNIQUE, row locks/CAS
- `gateway` = API gateway / edge policy / WAF / load balancer controls
- `infra` = network/service mesh/IAM/runtime config/IaC
- `unknown` = not observed in supplied materials

**Important**
- "Not observed in provided materials" is NOT the same as "absent in the system."
- Do not invent either a hidden defense or a missing defense. Trace the effective path through the applicable enforcement layers.
- A demonstrated boundary failure remains a finding even if unrelated controls are unknown. If an essential link in the alleged failure is unobserved, state the conditional consequence and the evidence needed to resolve it; do not present that link as fact.
- An observed control changes the conclusion only for the paths and conditions it actually covers. Logging and throttling can affect detection or scale without closing an authorization or integrity failure.

---

## Confirm and Challenge Each Finding

Before promoting a lead into a finding, establish the causal chain:

1. **Starting authority and input.** Name the actor, the permissions they already need, the input they control, and the required configuration or state. Identify what additional effect crosses the intended boundary.
2. **Effective path.** Follow the input through dispatch, validation, policy checks, helper callbacks, storage and side effects. Read the relevant callers and alternate branches. A suspicious helper is not sufficient if the reachable caller rejects the operation; a safe helper is not sufficient if another path bypasses it.
3. **Exact semantics.** Check types, lengths, parser behavior, return conventions, flags and ordering at the disputed operation. Read the original source or correctly decoded tool content before interpreting escapes or serialized snippets. A tool's display representation is not a second layer of program syntax. Search hits, comments and familiar-looking patterns are leads, not semantic proof.
4. **Concrete consequence.** State the violated invariant and a reachable before/after state. Separate the immediate effect from additional harm that needs another weakness, privilege, configuration, or scale assumption. For a race, show the conflicting interleaving; for replay, show how the same operation can cause another side effect.
5. **Counterevidence.** Identify the strongest plausible reason the claim could be wrong and inspect the relevant guard, binding, transaction, data structure, or deployment constraint. Drop disproved claims. Narrow partially defended claims to the remaining path; do not discard a valid failure because a different path is safe.
6. **Closure.** Check that the proposed fix enforces the broken invariant at the authoritative boundary across affected paths. Name a regression test with a forbidden outcome and a legitimate neighboring operation that must continue to work. For denial paths, include unchanged state and side effects when relevant. Attribute supplied tests; do not claim execution.

Static reasoning can establish a finding without an executed exploit. A causal failure proven under an explicit, supported configuration is a confirmed conditional finding: state the prerequisite and distinguish it from how widely that configuration is deployed. Include shipped defaults and documented supported modes unless the requested scope excludes them. If an essential causal link is unverified, report the lead separately with its conditional impact and the smallest inspection needed to resolve it. Do not silently turn uncertainty into either a clean bill of health or a confirmed failure.

Check alternate entry points and sibling operations after confirming a defect. Group shared root causes, but enumerate independently affected behaviors and fixes so a broad label does not hide a missed path. Cover significant findings beyond the first few; there is no finding quota or required exploit chain.

## Hard Constraints (obey strictly)

- **Static audit only.** Do not execute the code, scanners, tests, DAST, traffic replay or live probes as part of this audit. Attribute any supplied execution results to their source and describe what they establish; never claim you ran them. Separately authorized execution belongs to the project's verification workflow.
- **Do NOT rewrite code.**
- **Do NOT output large code blocks.**
- You MAY quote micro-snippets (≤ 10 lines) only as evidence when needed to pinpoint an exploit path or missing invariant.
- Audit under explicit assumptions first. Do NOT ask questions by default.
- At the end, you MAY ask up to **3 Assumption Validators** only if answers would materially change severity or remediation order.
- On high-impact paths, investigate uncertain enforcement before offering assurance. Uncertainty may prevent a release recommendation; it does not itself prove a vulnerability.
- Treat retries, timeouts, duplicate deliveries, dead-letter replays, and manual repair jobs as part of the threat model.
- Treat generated code/SDK glue as secondary unless it enforces security semantics; prioritize handwritten routes, policies, DTOs/serializers, workers, DB mutations, and config boundaries.
- When the repo is partial, huge, or missing key artifacts, prioritize highest-risk flows first and explicitly state what was and was not covered.
- Never mistake "grep found nothing quickly" for evidence of safety.

---

## Release-Relevant Boundary Failures

Prioritize investigation of these failures. When a reachable path violates the deployment's security contract, explain whether its demonstrated impact warrants holding that release. Identify the actor's actual starting privileges and what additional authority or effect the path grants:

- client can choose a privileged/economic result that the server should derive or validate, such as a balance delta, price, privilege level, or unauthorized target account;
- a critical invariant exists only in UI/frontend or only in one happy path;
- a sensitive mutation can duplicate side effects under retry, replay, duplicate webhook delivery, queue redelivery, or concurrency;
- a reachable public/admin/support/debug/repair surface permits a sensitive action without its required authority;
- value, inventory, entitlement, or privilege can be created, destroyed, or moved without required authoritative provenance or authorization;
- cross-account or cross-tenant impact is possible from attacker-controlled IDs or fields;
- an asserted defense relies on obscurity or detection while the unauthorized effect remains possible.

Client-selected identifiers, quantities, or operations are normal when the server validates them against the caller's authority and domain rules. An authorized administrator exercising an intended privilege is not a privilege escalation. Missing auditability is a separate operational finding when it violates a supported requirement; it does not establish a mutation bypass.

---

## Activate Domain Modes

Use **Core Mode**, then the additional modes supported by the system's actual behavior. The terms below are discovery cues, not proof that a domain applies. Scope investigation to real assets and flows; do not impose a game-economy architecture on an unrelated service.

### Core Mode
Use for all backend/API audits.

### Economic Asset Mode
Activate for flows that grant, spend, transfer, price, revoke or reconcile valuable state. Discovery terms include:
`amount`, `balance`, `coins`, `currency`, `wallet`, `credit`, `debit`, `grant`, `award`, `purchase`, `price`, `discount`, `tax`, `refund`, `rollback`, `inventory`, `quantity`, `entitlement`, `reward`, `claim`, `rarity`, `drop`, `loot`, `premium`, `ledger`.

Extra standard:
- treat value as requiring **conservation + provenance + reconciliation**;
- separate operations such as `grant`, `spend`, `refund`, `reversal`, `mint`, `burn` instead of generic signed mutations;
- distinguish fungible currency, discrete inventory, and boolean/time-bound entitlements.
- **Gameplay authority:** where economic effects derive from gameplay, identify the project's actual server authority. A client-reported result, score, drop or reward is an unauthenticated mutation proposal, not a fact; the server re-derives or validates the effect against authoritative state or simulation. When the project uses deterministic replay, preserve its seed + intents and restore-boundary requirements as anti-duplication and provenance evidence. Do not require a new deterministic kernel where another established authority enforces the contract. A client that can assert its own reward is the game-economy form of "client chooses the balance delta."

### Event-Driven / Integration Mode
Activate for effects crossing delivery or integration boundaries. Inspect relevant:
webhooks, queues, workers, consumers, cron, repair jobs, retries, outbox/inbox, saga/compensation, dead-letter queues, callbacks, partner/external API calls.

Extra standard:
- inspect idempotency, dedupe domain, operation identity, ordering, redelivery, timeout/500-after-side-effect semantics, webhook signature verification, replay jobs, and reconciliation. Use the destination project's established delivery semantics, idempotency-key definition, dedupe scope, and retry/timeout owner. Where those contracts are missing, identify the gap and keep assumptions explicit; no sibling skill is required.

### Multi-Tenant / Authorization Graph Mode
Activate for scoped ownership, sharing, delegated access or multiple authorization subjects. Discovery terms include:
`tenant`, `org`, `workspace`, `project`, `member`, `share`, `invite`, `policy`, `scope`, `permission`, `role`, `team`, support/admin impersonation, delegated access.

Extra standard:
- inspect object-level, property-level, and function-level authz;
- inspect lineage and sharing semantics, not just role checks;
- inspect policy provenance and any query-filter / cache-based authz.

### Realtime Game Authority Mode
Activate for client/server gameplay state or gameplay-derived rewards and progression. Discovery cues include:
websocket/socket/game session/match result/reward claim/cooldown/drop table/prediction/resync/authoritative server/anti-cheat/progression/inventory grant from gameplay.

Extra standard:
- client inputs are proposals, not facts;
- server must authorize rewards, inventory, economy effects, and progression;
- inspect replay/claim-once semantics, cooldown enforcement, result validation, and correction/resync paths.
- **Authoritative validation:** trace how the project's server validates or re-derives match results and gameplay-derived grants. For deterministic simulation projects, inspect reconstruction from the established seed + intents and restore boundary; retain their actual determinism policy. Resync/correction paths must not mint value or re-grant on replay. Treat the project's determinism or authority diagnostics as evidence to investigate, and verify the affected invariant instead of assuming a diagnostic alone establishes an exploit.

---

## Investigation Workflow

Establish scope and authority first, then follow high-risk flows through their enforcement and effects. Use the steps below to guide investigation, revisiting earlier assumptions as evidence changes. Spend depth where a reachable failure would matter; document unexamined areas rather than filling every category superficially. These are working activities, not required report sections.

### 1) Evidence Inventory & Scope
Inventory what is actually present:
- app code,
- route definitions/OpenAPI,
- middleware/interceptors/filters,
- DTOs/serializers/binders,
- schema/migrations,
- workers/jobs/consumers,
- policy files,
- IaC/config/gateway files,
- docs/runbooks/comments.

State what is missing but materially relevant.

### 2) Attack Surface Inventory
Enumerate all reachable or privileged entry points you can observe:
- routes/controllers/handlers/actions/resolvers,
- websocket/message handlers,
- webhooks/callbacks,
- jobs/workers/consumers/cron/repair scripts,
- admin/support/debug/internal surfaces,
- file upload/storage paths,
- outbound integration paths that can trigger internal effects,
- service-to-service entry points.

Assume frontend-discovered routes are discoverable. Inspect their actual network and authorization boundaries before asserting who can invoke them.

### 3) High-Risk Flow Inventory
Create a compact inventory of flows that touch:
- money/currency/wallets,
- inventory/items/quantity,
- entitlements/progression/claims,
- purchases/pricing/discounts/refunds,
- roles/permissions/sharing,
- admin/support/repair tools,
- uploads/storage/presigned URLs,
- outbound integrations and inbound webhooks,
- cross-account or cross-tenant mutations.

### 4) Workflow / State Reconstruction
For each high-risk flow, reconstruct the workflow as a state machine.

Reconstruct the relevant parts of each flow as working notes; show a state table in the report only when it explains a finding or coverage limit:
- states,
- allowed transitions,
- forbidden transitions,
- step-binding data that must not change between authorization and execution,
- repeatability limits,
- terminal states,
- cancel/reversal/repair states,
- async side effects triggered by each transition.

Example:
- `draft -> priced(server) -> authorized -> charged -> granted -> settled`
- forbidden: `granted -> granted` for same purchase, `cancelled -> fulfilled`, `authorized(amount=A) -> execute(amount=B)`

You are looking for skipped-step, repeated-step, out-of-order, and post-authorization-mutation exploits.

### 5) Mutation Pipeline Mapping
For each sensitive mutation or mutation family, trace the pipeline end-to-end:

- entry point
- actor and target
- attacker-controlled fields
- server-derived authoritative fields
- authn boundary
- authz / policy boundary
- validation boundary
- storage boundary (transaction, lock, CAS, append-only ledger, etc.)
- idempotency key or operation ID
- dedupe scope and parameter binding
- outbox/inbox/queue/webhook/consumer edges
- external side effects
- audit log
- reconciliation / repair path
- control provenance for each boundary

Important:
- "same request" must be treated as an explicit concept, not hand-waved.
- Inspect indeterminate outcomes: timeout or 500 after commit, duplicate publish, consumer retry, webhook redelivery, manual replay.

### 6) Authorization Graph & Property Mutation Audit
Build a compact matrix of:
`subject -> action -> object -> field`

Check:
- object-level authorization,
- property-level authorization (BOPLA / mass assignment style failures),
- function-level authorization,
- cross-tenant / cross-org / cross-workspace escape,
- admin/support impersonation,
- delegated access / sharing / invites,
- query-scoping and policy-caching risks.

Inspect:
- DTOs,
- serializers,
- PATCH/partial update paths,
- spread/merge/destructure patterns,
- ORM update helpers,
- implicit field binding,
- "ownerId/userId/tenantId/role" fields that the server forgot to lock down.

### 7) Invariant Extraction
Write every critical business/security invariant explicitly.

Examples:
- `amount > 0`
- `resultingBalance >= 0` unless a real debt product exists
- `callerOwnsResource`
- `serverDerivesPriceAndEntitlement`
- `same(operationId, actor, paramsHash) => same outcome and no extra side effects`
- `roleChange requires admin permission`
- `reward can be granted once per match/result`
- `refund amount <= captured amount and only for original charge`
- `inventory count cannot cross forbidden bounds`
- `client cannot choose rarity/reward/balance delta`

For each invariant, identify:
- where it is enforced,
- where it is missing,
- whether storage also enforces it,
- what should happen on violation,
- whether all paths enforce it or only happy paths.

### 8) Exploit Hunt
Hunt the exploit classes that actually cause incidents:

- broken amount semantics: negative, zero, fractional, overflow, underflow, precision loss, unit mismatch, NaN;
- client-trusted economics: client supplies price, discount, reward, entitlement, rarity, quantity, balance delta, target account, or role;
- authn/authz failures: missing auth, broken ownership, IDOR, tenant escape, role confusion, support/admin surface leaks;
- replay/duplication: duplicate requests, duplicate deliveries, reused tokens, reused signed URLs, missing operation identity, weak dedupe window;
- race conditions / TOCTOU: check-then-write splits, read-modify-write without lock/CAS/transaction, inventory grant and debit not atomic;
- parameter pollution / mass assignment / BOPLA;
- endpoint discovery / hidden route dependency;
- unsafe repair or rollback paths;
- rate-limit/quota/anomaly gaps on catastrophic mutations;
- secrets / verbose errors / insecure defaults;
- injection / unsafe parsing where relevant: SQL/NoSQL/template/command/path traversal/unsafe deserialization/SSRF;
- unsafe third-party API consumption or inbound trust of partner/webhook data.

### 9) Horizontal Bug-Family Search
If one path is vulnerable, inspect sibling paths touching the same domain concept.

Examples:
- one route accepts signed `amount` -> inspect all `amount/balance/coins/grant/refund/rollback/reconcile` paths;
- one PATCH path mass-assigns `role` -> inspect all update serializers/helpers;
- one webhook lacks dedupe -> inspect all consumers and replay jobs;
- one tenant check is object-level only -> inspect shared objects and nested child resources.

Report recurrence risk, not just the first local defect.

### 10) Containment, Detectability, Recovery
Evaluate:
- blast radius: self-only, cross-account, cross-tenant, global/systemic;
- speed of abuse with scripting/parallelism;
- rate limits, quotas, and clamps;
- anomaly detection and time-to-detection;
- kill switches / temporary deny rules / feature flags;
- audit trail quality;
- reconciliation feasibility;
- safe repair/admin workflows and their own authorization/audit controls.

### 11) Exploit Chain Composition
When observed weaknesses combine, establish the smallest supported chain and the additional impact it creates. Do not invent a chain to fill a report section.

Prefer chains that use only:
- public client access,
- normal browser/devtools capabilities,
- attacker-controlled IDs/fields,
- retries/parallelism,
- and route discovery from ordinary usage.

State prerequisites clearly. Do not invent prerequisites not supported by the code unless labeled as assumptions.

### 12) Coverage & Confidence Self-Check
Before finalizing:
- summarize what was **observed**, **inferred**, **assumed**, and **unknown**;
- note which relevant areas were actually examined;
- cross-check relevant OWASP/API/business-logic areas only as a sanity pass;
- state what missing artifact or control would most likely raise or lower confidence.

---

## Search Focus

Choose searches from the architecture and follow the resulting call paths. Use narrow results to locate definitions, then read the relevant implementation and callers. Reserve inspection capacity for checking claims and overlooked high-risk paths; broad keyword dumps consume context without establishing coverage.

### Entry points & async surfaces
`route`, `router`, `controller`, `handler`, `action`, `resolver`, `webhook`, `callback`, `job`, `worker`, `consumer`, `cron`, `repair`, `reconcile`, `replay`, `admin`, `support`, `debug`, `internal`

### Economic / inventory / entitlement surfaces
`amount`, `balance`, `wallet`, `coins`, `currency`, `credit`, `debit`, `grant`, `award`, `purchase`, `price`, `cost`, `discount`, `tax`, `conversion`, `refund`, `rollback`, `inventory`, `quantity`, `entitlement`, `reward`, `claim`, `rarity`, `drop`, `loot`, `cooldown`

### Identity / policy / tenancy surfaces
`userId`, `accountId`, `owner`, `target`, `tenantId`, `orgId`, `workspaceId`, `member`, `share`, `role`, `isAdmin`, `permission`, `scope`, `policy`, `authorize`, `can`, `impersonate`

### Parsing / DTO / mass-assignment surfaces
`parseInt`, `parseFloat`, `Number(`, decimal math, casts, schema validators, DTOs, serializers, PATCH/update helpers, spread/merge/destructure from request bodies, whitelist/blacklist field filters

### Async / idempotency / ordering surfaces
`idempotency`, `operationId`, `requestId`, `eventId`, `nonce`, `retry`, `dedupe`, `outbox`, `inbox`, `consumer`, `signature`, `replay`, `DLQ`, `saga`, `compensate`

### Storage / integrity surfaces
raw queries, ORM update helpers, direct DB mutation functions, transactions, row locks, compare-and-swap/version columns, append-only ledgers, `CHECK`, `UNIQUE`, `FK`, not-null constraints

### Integration / egress / storage surfaces
HTTP clients, webhook verification, SSRF sinks, redirects, file upload, presigned URLs, bucket/storage paths, path traversal, template rendering, shell/command execution, deserialization

### Config / docs / comments
OpenAPI, route registries, middleware config, policy config, IaC, env handling, feature flags, internal-only comments, `TODO`, `FIXME`, validation/auth shortcuts

---

## Mode-Specific Checks

Apply checks to relevant flows. Distinguish an observed violation, an observed defense, and an unexamined requirement. Missing tests or unavailable deployment artifacts limit assurance; they do not by themselves establish a reachable exploit.

### Economic Asset Mode
Inspect:
- server validates any client-chosen sign, direction and amount against the authorized operation and domain bounds;
- server derives or strictly validates price, reward, tax, conversion, and resulting deltas;
- fungible assets have authoritative provenance and reconciliation path;
- discrete inventory has bounded counts and atomic grant/spend paths;
- entitlements have explicit grant/revoke semantics and duplicate-claim protection;
- repairs/reversals are privileged, explicit, auditable, and non-generic;
- gameplay-derived value is authorized by the project's actual server authority, not asserted by the client; where deterministic replay is the established authority contract, it is reconstructible from seed + intents;
- tests cover negative, zero, max, overflow, duplicate, out-of-order, concurrent, cross-account, retry, and repair cases.

### Event-Driven / Integration Mode
Inspect:
- webhook authenticity is verified before side effects;
- operation identity and dedupe domain are explicit;
- consumer idempotency exists even under duplicate publish/redelivery;
- ordering assumptions are explicit and enforced where needed;
- DLQ/replay/manual repair flows cannot re-trigger unsafe side effects;
- timeout/500-after-side-effect paths have reconciliation or status lookup;
- "exactly once" is proven by design, not assumed in prose.

### Multi-Tenant / Authorization Graph Mode
Inspect:
- object-level, property-level, and function-level authz all exist where needed;
- tenant/org/workspace lineage is enforced at the right layer;
- shared-resource and invitation flows cannot escape tenancy;
- support/admin impersonation is explicit, narrow, and auditable;
- query filters and policy caches cannot silently widen scope.

### Realtime Game Authority Mode
Inspect:
- client-reported results/rewards/drops/progression are not accepted as authoritative facts;
- claim-once semantics exist for rewards and progression;
- cooldowns and replay windows are enforced on the server;
- server validates or re-derives gameplay-derived economic effects through the established authoritative state or simulation path;
- correction/resync paths do not accidentally mint value or duplicate rewards.

---

## Severity, Confidence, and Priority

Use the project's definitions when supplied. Otherwise assess severity from the supported consequence, starting privileges, deployment exposure, affected assets, reach, repeatability and recovery cost. State the conditions alongside the rating. Do not assign a worst-case deployment to an audit of a specified deployment.

| Severity | Decision anchor |
| --- | --- |
| Critical | A demonstrated path to catastrophic loss or compromise in scope, such as broad control of accounts, systems or valuable state with few effective barriers. Explain what makes the consequence catastrophic and how the actor reaches it. |
| High | A demonstrated substantial confidentiality, integrity or availability failure, such as access beyond granted authority or a repeatable harmful mutation. Bound affected subjects, capabilities and prerequisites. |
| Medium | A material but constrained consequence, a meaningful operational-control failure, or a harmful path requiring substantial additional conditions. Explain those limits. |
| Low | A supported defect with limited consequence or exposure. |
| Informational | A hardening opportunity or coverage observation without a demonstrated security violation. Keep unresolved vulnerability leads distinct from both confirmed defects and harmless observations. |

A vulnerability category does not determine severity by itself. For example, unintended access to one bounded class of non-sensitive records and unrestricted access to valuable tenant state both cross an authorization boundary, but their consequences differ. An audit-log defect can impair detection or recovery without granting the underlying operation. Assess each effect separately.

Do not reduce a demonstrated impact because an unobserved defense might exist. Equally, do not inflate it by assuming unobserved privileges, deployment reachability, or follow-on compromises. Observed authentication, capability restrictions, network boundaries, and atomicity can materially change a path; document which part they constrain. Logging, obscurity and generic throttling do not repair broken authorization or integrity.

**Confidence describes evidence, not seriousness.** High confidence means the relevant source and conditions establish the causal path. Medium confidence means a specific consequential link needs confirmation. Low confidence means a lead has substantial unresolved assumptions. A high-confidence bounded defect can be less severe than a conditional catastrophic risk; do not collapse them into one rating.

**Priority describes action timing.** Apply the project's urgency definitions. Otherwise use P0 for supported emergencies requiring immediate containment, P1 for material risk to fix promptly or before the affected release, and P2 for planned remediation or hardening. Justify emergency action from exposure, consequence and urgency; do not classify every vulnerability fix or logging improvement as P0. Include only applicable priorities.

## Report the Decision and Supporting Evidence

Follow the requested report format. Otherwise use a short Markdown report with:

- **Scope and recommendation.** State what was inspected, the deployment assumptions, the consequential findings, and what they imply for the requested release or remediation decision. A release recommendation applies only to the audited scope and is not an approval gate. If a critical boundary could not be checked, say what assurance is withheld and what evidence is needed.
- **Confirmed findings, ordered by risk.** For each, give a precise title, severity and confidence, file/symbol evidence, actor and prerequisites, the failing path and concrete consequence, relevant controls, the smallest complete fix, and specific closure checks. Use enough detail to establish the causal chain; report each finding once. Explain chains only where their supported combination adds material impact.
- **Unresolved leads and coverage limits.** Identify significant unverified paths separately, with the evidence that would confirm or dismiss each. Say which areas were actually inspected and which remain unexamined. Credit controls that materially close suspected paths. Zero confirmed findings is valid; it is not proof that the entire system is safe.
- **Plan of Action.** Prioritize fixes and any necessary containment, naming the affected boundary and success condition. Separate temporary containment from permanent repair and verification. Include operational recovery or reconciliation when the demonstrated failure requires it.

Use state, authorization or mutation tables only when they explain a complex boundary or decision. Investigation maps and domain checklists are working aids, not mandatory report sections. Do not add letter grades, repeated scorecards, empty sections, or a fixed number of findings. Include the evidence needed to act without reproducing the whole investigation.

Before returning the report, check that every confirmed finding survives its counterevidence, every severity describes the supported consequence, and every fix addresses the actual failing path while preserving legitimate behavior. Preserve material unknowns and missed coverage without inventing findings to fill them.

---
name: ops__maintain-incident-postmortem
description: "Authors or updates a durable incident postmortem preserving ruled-out hypotheses, misleading signals, proven mechanism, and the fast-path discriminator. Triggers when the user explicitly requests one or the diagnosis would be materially expensive or dangerous to re-derive; routine bugs return not warranted."
tools: Read, Grep, Glob, Bash, Edit, Write
---

# Incident Postmortem — Preserve the Diagnosis

The fix lives in the diff; the diagnosis dies with the context window (root §6). A postmortem is the durable causal record of an operational failure — not a changelog, blame document, debugging diary, or patch summary. Its reusable payload is the map of the search space: what broke in the journey, what evidence proved the mechanism, which hypotheses died and what killed them, what misled the hunt, and the discriminator a future responder should run first. It must let that responder answer: *Have we seen this pattern before? What proved the cause last time? What discriminator do I run first? What guardrail was missing? What action prevents, detects, or mitigates recurrence?*

**When it earns a file (root §6).** The default is no postmortem. Create one only when the user explicitly requests it or the multi-hypothesis diagnosis would be materially expensive or dangerous to re-derive and the work spec/diff cannot preserve the useful search map. CSS tweaks, obvious bugs, and changes whose diff explains the cause do not qualify. If neither condition holds, return `not warranted` with one line and create nothing.

**Routing & inputs (root §§6–7).** The orchestrator writes the compact **diagnosis brief** — ruled-out hypotheses, misleading signals, evidence paths, fast path next time, mechanism/confidence, and fix pointer. An independent reviewer using the same existing repo folder may author the warranted document. Evidence corroborates the brief; it does not replace it. Missing facts stay `[UNKNOWN]`. If a material process/testing/policy hole remains, recommend `$prompt__perform-root-cause-analysis`; it runs only when explicitly requested or its specific prevention value is clear.

**Ownership.** This skill owns the warranted `postmortem.md`, sanitized evidence excerpts, and its causal/status truth. It does not own product fixes, harnesses, system docs, or feature planning: substantial corrective work → a Work Spec; a proof artifact exists only when a specific prevention risk warrants it; process holes → separately warranted RCA. Never let the postmortem become a design doc.

**Storage.** `docs/incidents/<semantic-domain>/<YYYY-MM-DD>__<incident-slug>/postmortem.md` — domain is the product/system area (`payments`, `realtime-netcode`, `agent-tools`, `infra`, `auth`); date is the incident start in the canonical timezone when known; slug is a kebab-case symptom or mechanism. No severity or status in the path — they change. Sanitized excerpts live in `evidence/` beside it. Secrets, tokens, private user data, and unredacted production records are never copied into the repo — link or describe the source.

---

## Laws

1. **Evidence-led.** `[FACT]` requires a source (`SRC-###`, file:line where possible); `[INFERENCE]` names its supporting F-IDs and its `Disprove if:`; `[RULED OUT]` names the killing fact; `[UNKNOWN]` marks material uncertainty honestly. IDs (`SRC/F/I/R/CA-###`) are stable and append-only. "Root cause" is earned: **High** = mechanism directly proven and at least one plausible alternative ruled out; **Medium** = strong support, one discriminator or repro missing; **Low** = plausible but circumstantial. Below sufficiency it is a *suspected mechanism*, never a root cause — correlation doesn't get the title.
2. **Journey-first, compact.** Lead with what failed for the user or operator, never with which file changed. One to two pages unless raw evidence genuinely needs the appendix. Never a file-by-file changelog — implementation detail appears only where it explains mechanism, resolution, rollback, or prevention.
3. **Confusion is signal.** Capture why responders chased wrong ideas, what they believed at key moments, what collapsed the search space, and which logs, metrics, or dashboards misled. The missing discriminator, named explicitly, is the most valuable line in the document.
4. **Commands are evidence only if they ran.** Captured or source-summarized output qualifies; anything else is a *proposed* discriminator in Fast Path, labeled as such. Discovery is read-only — nothing mutating, credentialed, or production-affecting.
5. **Corrective actions land somewhere real.** Every CA carries type, priority, enforcement owner, exact observable verification, and a lands-as pointer. Substantial Prevent/Detect actions route to the owning work spec; proof routes to `$eval__design-proof-gates` or a durable test only when a specific material risk warrants it. The postmortem keeps the pointer, never the harness.
6. **Severity humility.** `Sev-N (proposed)` unless the team declared it. No invented severities, windows, or timestamps — `TBD` and `[UNKNOWN]` over fabrication.

## Status

`Draft` (evidence, timeline, impact, or cause incomplete) → `Resolved` (user impact ended; mechanism proven to stated confidence; review-ready) → `Actions open` (accepted; CAs pending) → `Closed`. Closed requires: window and impact stated · confidence stated · remaining uncertainty explicit · Fast Path names a concrete discriminator · every CA verified, deferred with rationale, or intentionally absent with rationale.

## Workflow

1. **Check warrant** — absent an explicit user request or a materially expensive/dangerous-to-rederive diagnosis, return `not warranted` and stop.
2. **Resolve identity:** domain, start date, slug, path, incident class, higher-order pattern, why-it-recurs, severity (proposed if undeclared).
3. **Ingest:** the diagnosis brief first; then the smallest corroborating set — incident notes, the introducing/mitigating diff or PR, logs/traces/dashboard snapshots, repro tests, prior related incidents.
4. **Build the causal frame before narrative:** symptom → affected journey → trigger → mechanism → missing defense → resolution → recurrence guardrail. Name at least one plausible wrong hypothesis and what ruled it out where evidence exists.
5. **Write or update** per the template; run the conformance check (never stored).
6. **Route:** substantial CAs to the owning work spec; recommend, but do not auto-create, proof or RCA artifacts.
7. **Return the Skill Result.** The caller owns the human-facing close-out (root §5).

---

## Template

````markdown
# INCIDENT POSTMORTEM — <clear-incident-title>
**Human Read:** <Symptom> happened because <mechanism> (confidence: High/Med/Low); resolved by <fix>. If this symptom appears again, run <first discriminator> first. Status: <status>; corrective actions: <n open / n closed / none owed>.

**Incident ID:** `<semantic-domain>/<YYYY-MM-DD>__<incident-slug>`
**Incident window:** YYYY-MM-DD HH:MM TZ → YYYY-MM-DD HH:MM TZ
**Severity:** Sev-0..4 (proposed | declared) | TBD
**Status:** Draft | Resolved | Actions open | Closed
**Incident class:** <concrete operational bucket>
**Higher-order pattern:** <cross-domain reusable pattern>
**Why this class recurs:** <the system pressure, one sentence>
**Root-cause confidence:** High | Medium | Low
**Canonical system doc:** <docs/... | Missing — CA-###>
**Related incidents:** <links | none>

## Doc Conventions (Do Not Delete)
- Schema truth: the `ops__maintain-incident-postmortem` skill. Sections 1–8 are stable; a section with nothing active holds one honest line, never scaffolding.
- Stable IDs, append-only, never renumbered: `SRC/F/I/R/CA-###`.
- Truth labels: `[FACT]` + `(SRC-###)` (file:line where possible) · `[INFERENCE]` + supporting F-IDs + `Disprove if:` · `[RULED OUT]` + the killing F-ID · `[UNKNOWN]`.
- Journey before mechanism; 1–2 pages; no file-by-file changelog; no secrets, tokens, private user data, or unredacted production records — sanitized excerpts under `evidence/`, everything else linked or described.
- "Root cause" only at earned confidence; otherwise "suspected mechanism."
- Status honors the closure criteria; severity stays `(proposed)` until declared.

## 1) User Journey & Impact
Actor · entry point · expected flow (3–5 steps) · what broke · user-visible impact · operator/internal impact · systems affected · scope/volume · detection time · recovery time · success criterion after fix.
> The user just <prior action>, expects to <immediate goal>, and will next <downstream step>. This incident broke <prior action> → <immediate goal>.

## 2) Fast Path Next Time
If you see this symptom again · first discriminator to run · what that rules out · most likely next boundary to inspect · the one command/probe/dashboard to check first. Unrun candidates are labeled *proposed*.

## 3) What Proved It
- [FACT F-001] <evidence-backed fact> — (SRC-001)
- [INFERENCE I-001] <causal interpretation> — supported by F-___ — Disprove if: <one-liner>
- [RULED OUT R-001] <hypothesis> — ruled out by F-___
- [UNKNOWN] <remaining uncertainty | none known>

## 4) Timeline
| Time | Signal / observation | Decision / action | Who / system |
| --- | --- | --- | --- |

## 5) The Hunt
Trigger · why it was confusing · what responders believed at key moments · what collapsed the search space · which signals helped · which logs/metrics/dashboards were missing or misleading — the missing discriminator, named.

## 6) Mechanism & Missing Defenses
Primary mechanism (shortest technically accurate explanation) · contributing causes · failed or missing defenses (tests, review, observability, contracts, rollout checks) · why it reached production. No single-cause fairy tales: the mechanism, then the enabling conditions.

## 7) Resolution
Immediate mitigation · durable fix (commit/PR pointer) · why this path over the alternatives · rollback shape if the fix had to be reversed.

## 8) Recurrence & Corrective Actions
Similar incidents · shared failure pattern · why prior guardrails didn't prevent this one · the cheapest prevention that would have caught it earlier.

| ID | Action | Type | Priority | Enforcement owner | Lands as | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| CA-001 | <specific action> | Prevent / Detect / Mitigate | P0 / P1 / P2 | <the gate/contract/alert/doc/test that holds the line> | <SLUG>__M#__G# / C-### / alert / AGENTS line / deferred — rationale | <exact testable condition> |

## Appendix: Sources & Evidence
- SRC-001: <path file:line / command + captured output / dashboard / PR / log excerpt> — <what it proves> — captured YYYY-MM-DD
````

---

## Calibration

- **Incident class** (concrete, operational): `stale-cache-read` · `duplicate-webhook-processing` · `websocket-reconnect-state-loss` · `missing-auth-boundary` · `unbounded-fanout` · `silent-partial-failure` · `rollout-config-drift`.
- **Higher-order pattern** (reusable across domains): `authority split without freshness contract` · `context lost across async boundary` · `idempotency missing at retry boundary` · `observability gap hid the first failing boundary` · `client-visible state diverged from backend authority`.
- **Why-it-recurs names the pressure:** "This recurs because two systems can both appear authoritative unless freshness and ordering are explicit."

## Conformance Check (run before writing — never stored)

- The postmortem is explicitly requested or its durable diagnosis value is clear, otherwise `not warranted` was returned; diagnosis brief ingested, or gaps marked `[UNKNOWN]`.
- Path, title, and Incident ID agree; Human Read carries symptom, mechanism, resolution, confidence, and the first discriminator.
- Journey stated before mechanism; facts sourced; inferences disprovable; at least one ruled-out hypothesis where evidence exists; confidence stated and earned.
- Fast Path names a real discriminator or labels proposed ones honestly.
- Every CA has an enforcement owner, lands-as pointer, and observable verification; substantial actions route to the owning work spec before any proof artifact.
- No secrets or unredacted records; status honors closure criteria; severity humility held.
- RCA sibling recommended only when a material process/testing/policy hole remains and its prevention value is specific.

## Skill Result (return to caller — required elements, any shape)

- Result: authored | updated | not warranted — <one line>
- Postmortem path · Incident ID · Status · Severity
- Incident class · Higher-order pattern · Root-cause confidence
- Evidence state: sufficient | partial — <gaps> | blocked — missing diagnosis brief
- Corrective actions: IDs + lands-as routing state | none owed
- RCA recommended: yes — <the hole and material impact> | no
- Open blockers · Recommended next action (one)

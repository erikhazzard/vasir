---
name: ops__maintain-incident-postmortem
description: Creates or updates durable incident postmortems under docs/incidents/<semantic-domain>/<YYYY-MM-DD>__<incident-slug>/postmortem.md. Turns incident notes, logs, PRs, timelines, fixes, and follow-up evidence into a source-backed causal record optimized for future responders and LLM re-ingestion. Captures user impact, proof of cause, ruled-out hypotheses, fast path next time, recurrence pattern, corrective actions, and verification state.
tools:
  - Read
  - Grep
  - Glob
  - Edit
  - Write
  - Bash
model: opus
---

# Incident Postmortem Maintainer

An **Incident Postmortem** is the durable causal record for an operational failure.

It is not a changelog, blame document, debugging diary, or patch summary. It explains what broke in the user/system journey, what evidence proved the mechanism, what uncertainty remains, and what guardrails will reduce recurrence.

The postmortem should help a future responder answer:

```text
Have we seen this pattern before?
What proved the cause last time?
What discriminator should I run first?
What guardrail was missing?
What action would prevent, detect, or mitigate recurrence?
````

---

## 1. Storage and Naming

Create or update:

```text
docs/incidents/<semantic-domain>/<YYYY-MM-DD>__<incident-slug>/postmortem.md
```

Path rules:

* `<semantic-domain>` is the product/system area, such as `payments`, `matchmaking`, `realtime-netcode`, `agent-tools`, `infra`, `auth`, or `observability`.
* `<YYYY-MM-DD>` is the incident start date in the repo/team’s canonical timezone when known.
* `<incident-slug>` is a short kebab-case symptom or mechanism slug.
* Do not include severity, owner, or status in the path because those can change.
* Optional sanitized evidence excerpts may live under:

```text
docs/incidents/<semantic-domain>/<YYYY-MM-DD>__<incident-slug>/evidence/
```

Unredacted production logs, secrets, tokens, private user data, credentials, and raw sensitive records must not be copied into the repo. Link or describe their source instead.

---

## 2. Authority Boundary

This skill owns:

* the incident `postmortem.md`;
* sanitized evidence excerpts created specifically for the postmortem;
* postmortem status, root-cause confidence, recurrence pattern, and corrective-action state.

This skill may reference:

* canonical system docs;
* work specs;
* eval plans;
* PRs;
* tests;
* dashboards;
* logs;
* runbooks;
* incident chat summaries;
* deployment records.

This skill does not own product fixes, eval harnesses, system docs, or future feature planning. If a corrective action becomes substantial product or platform work, link or request a Work Spec rather than turning the postmortem into a design doc.

---

## 3. Quality Bar

A strong postmortem is:

* **User-journey-first:** starts with what failed for the user/operator, not which file changed.
* **Evidence-led:** separates facts, inferences, hypotheses, and ruled-out causes.
* **Operationally reusable:** includes the fastest discriminator for next time.
* **Pattern-aware:** names the incident class and higher-order recurrence pattern.
* **Actionable:** corrective actions are specific, owned when possible, prioritized, and verifiable.
* **Compact:** 1–2 pages unless raw evidence or a complex timeline genuinely requires an appendix.

Prefer:

```text
Evidence showed X, which ruled out Y, leaving Z as the mechanism.
```

Avoid:

```text
We think maybe X happened.
```

If evidence is incomplete, say so directly and keep the status as `Draft` or `Open`.

---

## 4. Evidence Discipline

Use stable IDs where claims need cross-reference:

* Sources: `SRC-###`
* Facts: `F-###`
* Inferences: `I-###`
* Ruled-out hypotheses: `R-###`
* Corrective actions: `CA-###`

Do not renumber existing IDs. Append only.

Truth labels:

* `[FACT]` — directly supported by a source.
* `[INFERENCE]` — reasoned from facts; must say what would disprove it.
* `[RULED OUT]` — hypothesis rejected by evidence.
* `[UNKNOWN]` — material uncertainty remains.

Root cause confidence:

* `High` — direct evidence proves mechanism and at least one plausible alternative was ruled out.
* `Medium` — evidence strongly supports mechanism, but repro or one important discriminator is missing.
* `Low` — plausible explanation, but evidence is incomplete or mostly circumstantial.

Do not call a claim “root cause” when it is only a correlation. Use “suspected mechanism” until proof is sufficient.

---

## 5. Status Semantics

Use one status:

* `Draft` — evidence, timeline, impact, or cause is still incomplete.
* `Open` — incident is understood enough to review, but actions or proof are incomplete.
* `Resolved` — user impact has ended and the immediate/durable fix is identified.
* `Follow-ups in progress` — postmortem is accepted, but corrective actions remain open.
* `Closed` — corrective actions are verified or explicitly accepted as deferred.

A postmortem cannot be `Closed` unless:

* impact and incident window are stated;
* root-cause confidence is stated;
* remaining uncertainty is explicit;
* Fast Path Next Time is concrete;
* corrective actions are verified, deferred with rationale, or intentionally absent with rationale.

---

## 6. Workflow

### Step 1 — Resolve incident identity

Determine:

* semantic domain;
* incident start date;
* incident slug;
* target path;
* status;
* severity, or `TBD` if not established;
* incident class;
* higher-order pattern.

If severity is not already declared by the team, mark it as proposed:

```text
Severity: Sev-2 (proposed)
```

Do not invent final severity.

### Step 2 — Ingest only relevant evidence

Read the smallest useful set of sources:

* incident notes or chat summary;
* deployment or PR that introduced/mitigated the issue;
* logs, traces, screenshots, dashboard snapshots, or alert records;
* tests or evals that reproduced or proved the issue;
* canonical system docs or runbooks;
* related previous incidents.

Read-only shell commands are allowed for evidence discovery. Mutating, destructive, credential-dependent, or production-affecting commands are not allowed.

A command is evidence only if it was actually run and its output is captured or summarized with a source. Otherwise it belongs in “Fast Path Next Time” as a proposed discriminator.

### Step 3 — Build the causal frame

Before writing narrative, identify:

```text
symptom → affected journey → trigger → mechanism → missing defense → resolution → recurrence guardrail
```

Name at least one plausible wrong hypothesis and what ruled it out when evidence exists.

If the incident was confusing, capture why. The confusion is often the most valuable future diagnostic signal.

### Step 4 — Write or update the postmortem

Use the template below. Keep it compact.

Do not write a file-by-file changelog. Mention implementation details only when they explain mechanism, resolution, rollback, or recurrence prevention.

### Step 5 — Validate corrective actions

Every corrective action must have:

* action ID;
* type: `Prevent`, `Detect`, or `Mitigate`;
* owner or `TBD`;
* priority;
* due date or `TBD`;
* exact verification.

Bad verification:

```text
Monitor it.
```

Good verification:

```text
Alert fires when websocket reconnect replay lag exceeds 2s for 3 consecutive minutes.
```

If an action needs a Work Spec or eval plan, say so in the action’s verification or notes.

### Step 6 — Return Skill Result

Return a compact result to the calling agent. Root `AGENTS.md` owns any final human-facing `<Recap>` when applicable.

---

## 7. Postmortem Template

```markdown
# INCIDENT POSTMORTEM — <clear-incident-title>

**Incident ID:** `<semantic-domain>/<YYYY-MM-DD>__<incident-slug>`  
**Incident window:** YYYY-MM-DD HH:MM TZ → YYYY-MM-DD HH:MM TZ  
**Severity:** Sev-0 | Sev-1 | Sev-2 | Sev-3 | Sev-4 | TBD  
**Status:** Draft | Open | Resolved | Follow-ups in progress | Closed  
**Incident class:** `<short operational bucket>`  
**Higher-order pattern:** `<broader reusable pattern>`  
**Why this class recurs:** `<one sentence>`  
**Root-cause confidence:** High | Medium | Low  
**Canonical system doc:** `<docs/... or Missing — action CA-###>`  
**Related incidents/docs:** `<optional links>`

**Purpose:** Explain what broke, how it affected the user journey, what evidence proved the cause, and what concrete guardrails will reduce recurrence.

---

## Writing Rules

- Keep this to 1–2 pages unless the incident genuinely needs an appendix.
- Lead with the user journey and impact, not patch details.
- Separate facts from interpretation.
- Prefer “what proved it” over “what we think happened.”
- Do not write a changelog of every file touched.
- Do not paste secrets, tokens, private user data, or unredacted production records.

---

## 1) User Journey

- **Actor:** Who was trying to do what?
- **Entry point:** Exact API/event/command/UI surface they touched first.
- **Expected flow:** 3–5 steps max.
- **What broke for the user:** What part of the flow failed?
- **Success criterion after fix:** What observable behavior now means the journey works again?

Grounding sentence:

> The user just <prior action>, expects to <immediate goal>, and will next <downstream step>. This incident broke the bridge from <prior action> → <immediate goal>.

---

## 2) Executive Summary

- **One-sentence symptom:**  
- **One-sentence mechanism:**  
- **One-sentence resolution:**  

---

## 3) Fast Path Next Time

- **If you see this symptom again:**  
- **First discriminator to run:**  
- **What that rules out:**  
- **Most likely next boundary to inspect:**  
- **One command / probe / dashboard to check first:**  

This section should let a future responder skip straight to the highest-signal next move.

---

## 4) Impact

- **User-visible impact:**  
- **Internal/operator impact:**  
- **Systems/components affected:**  
- **Detection time:**  
- **Recovery time:**  
- **Scope/volume affected:**  

---

## 5) What Proved It

- [FACT F-001] <evidence-backed fact> — (SRC-001)
- [FACT F-002] <evidence-backed fact> — (SRC-002)
- [INFERENCE I-001] <causal interpretation> — supported by F-___, F-___ — Disprove if: <one-liner>
- [RULED OUT R-001] <hypothesis ruled out> — ruled out by F-___
- [UNKNOWN] <remaining uncertainty, or “None known”>

This section should make it easy for a future reader to distinguish proof from speculation.

---

## 6) Timeline

| Time | Signal / Observation | Decision / Action | Who / System |
| --- | --- | --- | --- |
| HH:MM |  |  |  |
| HH:MM |  |  |  |
| HH:MM |  |  |  |

---

## 7) What Actually Happened

- **Trigger:** What condition or event started the failure?
- **Why it was confusing:** What made responders chase the wrong ideas?
- **What responders believed at key moments:**  
- **What changed our understanding:** What evidence collapsed the search space?

Keep this section narrative, but bounded.

---

## 8) Root Cause and Contributing Causes

- **Primary mechanism:** The shortest technically accurate explanation.
- **Contributing cause 1:**  
- **Contributing cause 2:**  
- **Failed or missing defenses:** tests, review, observability, runtime contract, rollout checks, etc.
- **Why this reached production:**  

Avoid single-cause fairy tales. Name the main mechanism, then the enabling conditions.

---

## 9) Resolution

- **Immediate mitigation:** What stopped the bleeding?
- **Durable fix:** What change actually resolved the issue?
- **Why this fix is the chosen path:** Why this solution and not the alternatives?
- **Rollback shape:** If this fix had to be reversed, what would the safe rollback look like?

---

## 10) Detection and Response Review

- **What worked well:**  
- **What slowed us down:**  
- **Which logs/metrics/dashboards helped:**  
- **Which logs/metrics/dashboards were missing or misleading:**  

If the incident was hard to diagnose, be explicit about the missing discriminator.

---

## 11) Recurrence Check

- **Similar incidents:**  
- **Shared failure pattern:**  
- **Why prior fixes or guardrails did not prevent this one:**  

This is the section that turns a one-off bug into an engineering learning loop.

---

## 12) Corrective Actions

| ID | Action | Type | Owner | Priority | Due date | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| CA-001 |  | Prevent / Detect / Mitigate |  | P0 / P1 / P2 | YYYY-MM-DD / TBD | exact test / alert / gate |
| CA-002 |  | Prevent / Detect / Mitigate |  | P0 / P1 / P2 | YYYY-MM-DD / TBD | exact test / alert / gate |

Every action should be specific, owned when possible, prioritized, and verifiable.

---

## 13) Learning

- **The one thing to remember next time:**  
- **The weakest system/property that needs stronger guardrails:**  
- **The cheapest prevention that would have caught this earlier:**  

---

## Appendix: Sources and Evidence

Use only if needed for raw evidence excerpts, exact commands, links to focused runbooks, tests, dashboards, traces, or follow-up design docs.

- SRC-001: <source path / command / dashboard / PR / log excerpt> — <what it proves> — captured YYYY-MM-DD
- SRC-002: …
```

---

## 8. Incident Class and Pattern Guidance

`Incident class` should be concrete and operational:

```text
stale-cache-read
duplicate-webhook-processing
websocket-reconnect-state-loss
schema-migration-compatibility
missing-auth-boundary
unbounded-fanout
silent-partial-failure
rollout-config-drift
```

`Higher-order pattern` should be reusable across domains:

```text
authority split without freshness contract
context lost across async boundary
idempotency missing at retry boundary
observability gap hid the first failing boundary
client-visible state diverged from backend authority
scale changed the ordering guarantees
manual approval boundary was not enforced by backend
```

`Why this class recurs` should explain the system pressure:

```text
This recurs because two systems can both appear authoritative unless freshness, ordering, and ownership are explicit.
```

---

## 9. Quality Checks Before Output

Before returning, verify:

* Path follows `docs/incidents/<semantic-domain>/<YYYY-MM-DD>__<incident-slug>/postmortem.md`.
* Title and incident ID match the path.
* User journey is stated before technical mechanism.
* Executive summary has symptom, mechanism, and resolution.
* Fast Path Next Time names a real discriminator or explicitly says what is missing.
* Section 5 separates facts, inferences, ruled-out hypotheses, and uncertainty.
* Root-cause confidence is stated.
* Corrective actions have exact verification.
* No secrets, tokens, private user data, or unredacted sensitive production records were copied.
* Status is not `Closed` unless closure criteria are satisfied.

---

## 10. Skill Result

Return this compact result after writing or updating the postmortem:

```markdown
<Postmortem_Result>
  <Postmortem_Path>docs/incidents/<semantic-domain>/<YYYY-MM-DD>__<incident-slug>/postmortem.md</Postmortem_Path>
  <Incident_ID><semantic-domain>/<YYYY-MM-DD>__<incident-slug></Incident_ID>
  <Status>Draft | Open | Resolved | Follow-ups in progress | Closed</Status>
  <Severity>Sev-0 | Sev-1 | Sev-2 | Sev-3 | Sev-4 | TBD</Severity>
  <Incident_Class>...</Incident_Class>
  <Higher_Order_Pattern>...</Higher_Order_Pattern>
  <Root_Cause_Confidence>High | Medium | Low</Root_Cause_Confidence>
  <Evidence_State>[sufficient | partial | blocked]</Evidence_State>
  <Corrective_Actions>[CA-001, CA-002, or None]</Corrective_Actions>
  <Open_Blockers>[missing evidence, owner, system doc, verification, or None]</Open_Blockers>
  <Recommended_Next_Action>[one concrete next action]</Recommended_Next_Action>
</Postmortem_Result>
```

Root `AGENTS.md` owns the final human-facing recap when this skill is run as part of a larger agent workflow.

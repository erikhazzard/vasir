# Eval Plan Template

Use this template for `docs/work/<semantic-folders>/<feature-slug>/eval-plan.md`.

Do not copy placeholder examples into committed eval plans. Replace every placeholder with repo truth, an explicit assumption, or a blocker.

---

# EVAL-PLAN — <FEATURE_NAME>

**Last updated:** YYYY-MM-DD  
**Status:** Draft | Approved | In Progress | Blocked | Complete  
**Feature slug:** `<FEATURE-SLUG>`  
**WIP:** `<path/to/WIP.md>`  
**Root approval state:** Needs human approval | Approved milestone | Planning only | Blocked | Unknown

---

## 1) Proof Context

### 1.1 Unlock

- **Unlock type:** User Journey Unlock | Engineering System Unlock
- **Unlock:** <observable user/system outcome>
- **Proof-of-Value State:** <terminal state that proves value exists>
- **Target environment:** <runtime/environment where value matters>

### 1.2 Scope

- **Milestones covered:** <full prefixed milestone IDs or Not milestone-based>
- **Domains:** backend-node | ui-playwright | games-realtime | agent-tool-workflows | persistence-networking | performance | mixed
- **File target envelope:** <eval-plan path, harness creation envelopes, artifact paths>

### 1.3 Sources

- **WIP contracts/invariants:** <C-### refs or None>
- **Primary source refs:** <SRC-###, file paths, script paths, discovery notes>
- **Scoped AGENTS read:** <paths or Root only>

### 1.4 Assumptions and Blockers

- **Assumptions:** <only assumptions that affect gate, payload, target env, authority, or artifacts>
- **Open blockers:** <missing harness, environment, credential, product decision, or None>

---

## 2) Gate Class Synthesis

This section proves the eval plan was derived from the claim rather than copied from a canned example.

| Required truth | Plausible lie this prevents | Gate class | Include? | Reason |
|---|---|---|---|---|
| <truth that must be true for value to exist> | <weak proof that could pass while value is broken> | <gate class> | yes/no | <why included or excluded> |

Gate class catalog:

- Terminal value-path
- Contract/API
- Persistence
- Realtime/convergence
- Orchestrated compound
- Scale/performance
- Browser/render
- Network/packet
- Failure/hostile
- Security/privacy/auth
- Idempotency/retry
- Migration/compatibility
- Observability/operator
- Subjective human
- Nearby non-regression

---

## 3) Proof Strategy

Describe the smallest sufficient proof stack in 3-7 bullets.

If the value claim is compound, name the orchestrated multi-observer gate first and state which observers must pass during the same run.

- <Gate family> — <why this proves value rather than implementation trivia>
- <Gate family> — <why needed>

---

## 4) Global Final Proof

Required for Broad Feature Work unless explicitly blocked.

```yaml
id: "<FEATURE-SLUG>__GLOBAL-G1"
kind: "global"
domain: "backend-node | ui-playwright | games-realtime | agent-tool-workflows | persistence-networking | performance | mixed"
gate_class: "<catalog gate class>"
claim: "<user/system value claim this gate can falsify>"
value_path: "<observable journey or final value path>"
plausible_lie_prevented: "<what weak proof could pass while value is broken>"
setup: "<fixture, seed, account state, request, replay, world state, tool state, service state, or environment>"
action: "<exact user/system/browser/worker/game/tool/network/operator action>"
observation: "<terminal state, artifact, metric, persisted row, packet, screenshot, video, trace, log, or output>"
pass_fail: "<exact verdict condition>"
eval_tool: "<existing command | missing harness: name | manual review | blocked: reason>"
target_env: "<runtime/environment where value matters>"
data_payload: "<fixture/seed/request/replay/world state/account state/schema payload>"
fresh_artifact: "<path pattern or artifact type>"
harness_status: "existing | missing | deferred | manual | blocked"
ci_policy: "Default CI now | Non-default local eval | Milestone-gated future CI | Manual human review | Blocked until harness exists | Blocked until environment/credential exists"
stop_condition: "<allowed stop condition>"
required_before_product_code: "yes | no — reason"
source_refs:
  - "<WIP C-###, SRC-###, eval-plan section, file path, script path, or discovery note>"
```

---

## 5) Milestone Gates

Every Broad Feature Work milestone must have at least one gate.

### <FEATURE-SLUG>__M1 — <Milestone title>

```yaml
id: "<FEATURE-SLUG>__M1__G1"
kind: "milestone"
domain: "backend-node | ui-playwright | games-realtime | agent-tool-workflows | persistence-networking | performance | mixed"
gate_class: "<catalog gate class>"
claim: "<milestone value claim this gate can falsify>"
value_path: "<observable milestone value path>"
plausible_lie_prevented: "<what weak proof could pass while value is broken>"
setup: "<fixture/seed/state/environment>"
action: "<exact actor action>"
observation: "<artifact/metric/state inspected>"
pass_fail: "<exact verdict condition>"
eval_tool: "<existing command | missing harness: name | blocked: reason>"
target_env: "<target environment>"
data_payload: "<payload>"
fresh_artifact: "<path pattern or artifact type>"
harness_status: "existing | missing | deferred | manual | blocked"
ci_policy: "Default CI now | Non-default local eval | Milestone-gated future CI | Manual human review | Blocked until harness exists | Blocked until environment/credential exists"
stop_condition: "<allowed stop condition>"
required_before_product_code: "yes | no — reason"
source_refs:
  - "<source refs>"
```

#### Orchestration block, when the milestone claim is compound

```yaml
orchestration:
  coordinator: "<existing command | missing harness: stable-name>"
  run_id: "<how the run is identified across logs/traces/artifacts>"
  actors:
    - name: "<bot/browser/service/worker>"
      count: "<exact count or distribution>"
      behavior: "<what this actor does>"
  scale_target: "<exact users/connections/items/events/bytes/duration and measurement source>"
  workload_duration: "<ramp-up + steady-state duration>"
  churn_fault_model: "<disconnect/reconnect/jitter/loss/late join/partial outage model, or none — reason>"
  observers:
    - "<server metrics/logs/trace>"
    - "<browser trace/video/screenshot>"
    - "<network/frame capture>"
    - "<persistence query/audit log/tool trace if relevant>"
  correlation_rule: "<how all observations are tied to the same run ID/time window/fixture/request/session>"
  aggregate_pass_fail: "<gate passes only if all required observers pass in the same run>"
```

---

## 6) Material Change Gates

Use when there is no milestone ladder.

```yaml
id: "CHANGE-G1"
kind: "material-change"
domain: "backend-node | ui-playwright | games-realtime | agent-tool-workflows | persistence-networking | performance | mixed"
gate_class: "<catalog gate class>"
claim: "<change value claim>"
plausible_lie_prevented: "<what weak proof could pass while value is broken>"
value_path: "<observable value path>"
setup: "<state>"
action: "<action>"
observation: "<observable proof>"
pass_fail: "<exact verdict>"
eval_tool: "<existing command | missing harness: name | blocked: reason>"
target_env: "<target env>"
data_payload: "<payload>"
fresh_artifact: "<artifact>"
harness_status: "existing | missing | deferred | manual | blocked"
ci_policy: "Default CI now | Non-default local eval | Blocked until harness exists | Blocked until environment/credential exists"
stop_condition: "<allowed stop condition>"
required_before_product_code: "yes | no — reason"
source_refs:
  - "<source refs>"
```

---

## 7) Subjective Gates

```yaml
id: "<FEATURE-SLUG>__M1__S1 | CHANGE-S1"
kind: "subjective"
domain: "ui-playwright | games-realtime | performance | mixed"
gate_class: "subjective human"
human_question: "<specific question the human must answer>"
automated_support: "<console scan | screenshot | video | trace | benchmark | replay | log | artifact bundle>"
required_artifact: "<artifact path pattern or artifact type>"
acceptance_boundary: "<what explicit human acceptance means>"
ci_policy: "Manual human review"
stop_condition: "Halt until human accepts or requests revision."
source_refs:
  - "<WIP C-###, SRC-###, file path, or discovery note>"
```

---

## 8) Hostile and Nearby Non-Regression Gates

### 8.1 Hostile / Negative Gates

```yaml
id: "<FEATURE-SLUG>__M1__G2 | CHANGE-G2"
kind: "hostile"
domain: "<domain>"
claim: "<failure mode is handled safely>"
plausible_lie_prevented: "<what weak proof could pass while unsafe behavior remains>"
setup: "<bad input/failure/retry/partial outage state>"
action: "<action>"
observation: "<rejection/log/no-side-effect/degraded state>"
pass_fail: "<exact verdict>"
eval_tool: "<existing command | missing harness: name | blocked: reason>"
ci_policy: "<policy>"
stop_condition: "<allowed stop condition>"
source_refs:
  - "<source refs>"
```

### 8.2 Nearby Non-Regression

- **Nearby behavior:** <behavior expected to remain unchanged>
- **Status:** tested | inspected | inferred | left unverified
- **Proof or rationale:** <command/path/reason>
- **Risk if wrong:** <one sentence>

---

## 9) Harness Inventory

| Harness | Command / Entry | Path | Target Env | Artifacts | Limitations | Status |
|---|---|---|---|---|---|---|
| <name> | <command> | <path> | <env> | <artifacts> | <limits> | existing/missing/blocked |

---

## 10) Missing Harness Specs

```yaml
harness_name: "<stable repo-searchable name>"
purpose: "<value-path proof this harness enables>"
permanent_source_location_or_creation_envelope: "<exact path or narrow directory/filename envelope>"
raw_artifact_location: "tmp/<datetime>__<semantic-description>/"
proposed_command: "to be created by $eval__implement-proof-gate"
required_payload: "<fixture, seed, request, replay, account state, world state, etc.>"
pass_fail_condition: "<exact verdict>"
why_existing_harnesses_are_insufficient: "<specific gap>"
required_before_product_code: "yes | no — reason"
```

---

## 11) CI and Artifact Policy

### 11.1 Default CI Now

- <gate IDs or None>

### 11.2 Non-Default Local Evals

- <gate IDs or None>

### 11.3 Milestone-Gated Future CI

- <gate IDs or None>

### 11.4 Manual Human Review

- <gate IDs or None>

### 11.5 Blocked Gates

- <gate IDs and blocker or None>

### 11.6 Artifact Path Conventions

- Raw eval artifacts: `tmp/<datetime>__<semantic-description>/`
- Required artifact bundle for each gate: <list>

---

## 12) Execution Contract

- **Repair loop:** <which gates allow one repair attempt before circuit breaker>
- **Plan Delta triggers:** <scope/file/gate changes that require Plan Delta>
- **Human halt points:** <subjective gates or product decisions>
- **Final handoff dependency:** <global final proof and audit artifact requirements>

---

## 13) Doc Health

- Gate class synthesis exists and includes notable excluded classes: ✅/❌
- Global proof exists or is blocked with exact reason: ✅/❌
- Every milestone has at least one gate: ✅/❌/N/A
- Every gate has exact pass/fail: ✅/❌
- Every gate names the plausible lie it prevents: ✅/❌
- Every gate has target env: ✅/❌
- Every gate has artifact policy: ✅/❌
- Compound claims use same-run orchestrated proof: ✅/❌/N/A
- Future gates are not in default CI: ✅/❌
- Missing harnesses are specified: ✅/❌/N/A
- Subjective gates require human acceptance: ✅/❌/N/A
- Hostile path included or waived: ✅/❌
- Nearby non-regression addressed: ✅/❌/N/A

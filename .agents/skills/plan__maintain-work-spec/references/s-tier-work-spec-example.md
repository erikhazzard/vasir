# S-Tier Work Spec Example

This is a calibration example for `$plan__maintain-work-spec`. It is not a domain mandate. Use it to learn the expected shape: equal parts Product Requirement Doc, Engineering Specification, Design Document, UX Document, milestone ladder, and current decision state.

## Table Of Contents

- [Example Work Spec](#example-work-spec)
- [Rung Quality Notes](#rung-quality-notes)
- [What This Example Is Teaching](#what-this-example-is-teaching)

---

# Example Work Spec

# WORK SPEC - Arena FPS Weapon Feel Pass

**Last updated:** 2026-06-16  
**Status:** In Progress  
**Active rung:** `ARENA-FPS-WEAPON-FEEL__M3` - Rifle feel and hit readability - In Progress  
**Next commit point:** after `ARENA-FPS-WEAPON-FEEL__M3` proves same-run rifle feel, hit readability, and engineer-facing tuning safety; Work Spec/eval status is synced  
**Blocked by:** Human feel review clip not captured yet  
**Eval plan:** `docs/work/games/arena-fps-weapon-feel/eval-plan.md`  
**Owners:** Gameplay, game feel, frontend runtime  
**Stakeholders:** Players, game designers, gameplay engineers, QA

**Purpose:** Make the starter rifle feel immediate, powerful, readable, and controllable without turning the game into a tactical sim. This pass defines the product feel target, engineering lane, and proof needed for a shippable first weapon-feel slice.
**Core User Journey Unlock:** A player fires the starter rifle at a moving enemy and immediately understands shot timing, recoil, hit confirmation, enemy reaction, and when they can correct aim.
**Core Developer Journey Unlock:** A future gameplay engineer can tune rifle feel through named constants and focused tests without reverse-engineering animation timing, camera response, and hit feedback coupling.
**Core Engineering Unlock:** Weapon feedback becomes a deterministic, testable loop with separated fire timing, hit events, camera impulse, enemy reaction, and feedback rendering boundaries.

**Primary entry point(s):** `src/gameplay/weapons/rifle.js`, `src/gameplay/combat/hit-resolution.js`, `src/render/feedback/weapon-feedback.js`, `tests/gameplay/weapon-feel/`  
**Related docs:** `docs/work/games/arena-fps-core-loop/work-spec.md`, `docs/work/games/arena-fps-weapon-feel/eval-plan.md`

**Recent Change Log:**  
- 2026-06-16 - Marked `ARENA-FPS-WEAPON-FEEL__M3` active; moved older M1/M2 implementation notes to Appendix A4.
- 2026-06-16 - Added C-006/C-007 for same-run input feedback and recoil readability.
- 2026-06-15 - M2 hit marker and enemy flash proof passed; compacted M2 to proof summary.

---

## Doc Conventions (Do Not Delete)

- **Stable IDs:** Never renumber existing IDs. Append new IDs only.
- **Detail budget:** Milestone rungs carry product, UX, design, engineering, and proof context. Header/current truth/open questions/source refs stay active and compact.
- **Active rung:** The header names the active rung; Section 5 owns the actual rung content.
- **Rung commits:** Completed rungs record the short commit hash plus commit subject. Active/proposed rungs say `Pending` until proof, Work Spec sync, eval status sync, and commit are done.
- **Evidence artifacts:** Each rung records screenshot, clip, log, or benchmark-table proof pointers. `tmp/...` artifacts may expire; keep the evidence summary in the rung.
- **Contracts live in Section 4 only.** Milestones reference `C-###`.
- **No stopgaps:** The no-stopgap rule lives in Section 4. Do not repeat it as a field in every rung.
- **History:** Move superseded decisions, old source refs, resolved questions, and completed proof narration to Appendix.
- **Random context:** Use Appendix A5 for quarantined notes that may matter later but do not belong in active sections.

---

## 1) North Star (Product, UX, Design)

### 1.1 Player Journey

- **Actor:** New player in the arena tutorial or first live match.
- **Entry:** Player equips starter rifle and fires at a moving drone.
- **Steps:**
  1. Player sees a drone enter medium range.
  2. Player aims and presses fire.
  3. Rifle responds immediately with muzzle flash, recoil impulse, sound, and reticle movement.
  4. Hit resolution produces visible enemy reaction and hit confirmation.
  5. Player recovers aim and chooses whether to track, burst, or reposition.
- **Success:** In the first three seconds, the player can tell when the shot fired, whether it hit, how hard it hit, and how to correct the next shot.
- **Next thing the player will try:** Burst-fire while strafing and judge whether recoil recovery is fair.

### 1.2 Experience Invariants

- If the player presses fire and the weapon can shoot, same-run feedback must appear immediately enough to feel connected.
- If a shot hits, the player must receive at least two confirmation channels: target reaction plus weapon/HUD/audio feedback.
- If recoil moves the camera or reticle, the player must be able to predict recovery and keep tracking.
- If damage is low, feedback may be smaller, but it must not disappear.
- If the screen gets noisy, target readability wins over spectacle.

### 1.3 Obviousness Audit

- **The Assumption:** "The rifle fired when I clicked."  
  **Technical Implication:** Fire input, cooldown, feedback emission, and first visible response need deterministic timing proof.
- **The Assumption:** "I know I hit that target."  
  **Technical Implication:** Hit confirmation cannot depend on damage numbers alone.
- **The Assumption:** "The gun is powerful but still mine to control."  
  **Technical Implication:** Recoil must have bounded impulse and predictable recovery.
- **The Assumption:** "The target reacted because I hit it, not because some animation happened."  
  **Technical Implication:** Enemy reaction must be sourced from hit-resolution events.
- **The Assumption:** "I can tune this later without breaking everything."  
  **Technical Implication:** Feel constants must be named, centralized, and covered by timing/readability tests.

### 1.4 Design / UX Bar

- **Experience target:** Fast arena rifle: punchy, bright, readable, skillful.
- **Must feel:** immediate, controlled, percussive, readable, recoverable.
- **Must not feel:** delayed, mushy, floaty, camera-hostile, visually noisy.
- **Reference points:** Arena shooter readability and hero-shooter hit feedback are taste references only; do not infer exact internals from reference games.

---

## 2) Non-Goals

- Do not add inventory, attachments, rarity, ammo economy, or weapon progression.
- Do not rewrite enemy AI or movement.
- Do not add network prediction or rollback in this rung.
- Do not create a second combat event system.
- Do not tune every weapon; this spec owns starter rifle feel only.

---

## 3) Current State

### 3.1 What is true today for active/next rungs

- [FACT F-001 | Confidence: High] Rifle fire already routes through `resolveRifleShot(...)`. - (SRC-001)
- [FACT F-002 | Confidence: High] Hit resolution emits `targetHit` events with target id, hit position, damage, and impulse direction. - (SRC-002)
- [FACT F-003 | Confidence: Medium] Current recoil is visual-only and not covered by deterministic tests. - (SRC-003)
- [FACT F-004 | Confidence: High] Existing browser smoke can capture canvas frames and console output for a seeded arena scenario. - (SRC-004)
- [UNVERIFIED U-001] Final recoil feel target needs human acceptance from a captured clip.
- [INFERENCE I-001 | Confidence: High] Hit feedback can be improved without touching enemy AI because enemy reaction can subscribe to existing `targetHit` events. Supported by F-002. Disprove if: enemy state changes require AI-controller ownership.

### 3.2 What's broken / missing

- Fire feedback and hit feedback are visually separated enough that players report "late hit" even when hit timing is correct.
- Recoil constants are not named around feel intent.
- No proof captures "click -> visible response -> hit read -> recovery" as one player journey.
- Human feel review artifact is missing.

### 3.3 Next actions

- (A1) Implement M3 rifle feedback loop - done when same-run fire, hit, recoil, and enemy reaction are visible in the seeded scenario.
- (A2) Add deterministic timing/readability tests - done when tests prove fire-to-feedback and hit-to-reaction budgets.
- (A3) Capture review clip - done when `tmp/<date>__arena-fps-rifle-feel-m3/` contains video, screenshot, and console log.
- (A4) Run human feel review - done when reviewer accepts or names exact feel delta.
- (A5) Sync Work Spec/eval status and commit M3 - done when M3 proof, remaining delta, and rung commit are recorded.

---

## 4) Contracts & Invariants

### 4.1 Definitions

- `fire feedback` - the first visible/audio/HUD response that confirms the weapon accepted a fire input.
- `hit confirmation` - feedback that tells the player a shot connected with a valid target.
- `recoil recovery` - the time and motion path from impulse back to player-controllable aim.
- `feel artifact` - a captured clip or interactive proof used for human acceptance of subjective feel.

### 4.1.1 Rung Sizing Model

Size is a summary of judgment surface and blast radius, not a calendar estimate. Every rung records all four axes. `N/A` is valid only with a reason.

| Axis | What it means | Values |
| --- | --- | --- |
| Complexity | Systems/surfaces touched and judgment calls required | S / M / L / XL / `N/A - reason` |
| Risk | What breaks if the rung is wrong | S / M / L / XL / `N/A - reason` |
| Perf Impact | Hot-path runtime or frame-budget delta | S / M / L / XL / `N/A - reason` |
| Cost Impact | Infra, external-service, model/tool-call, storage, or runtime cost delta | S / M / L / XL / `N/A - reason` |

### 4.2 Product / UX Contracts

- [C-001 | Must] Fire feedback must be coupled to accepted fire input, not delayed until damage resolution.
- [C-002 | Must] Hit confirmation must use at least target reaction plus one additional channel.
- [C-003 | Must] Enemy reaction must be sourced from hit-resolution truth.
- [C-004 | Must Not] Visual feedback must not obscure the target longer than the recovery window.
- [C-005 | Must] Human feel review is required before claiming a subjective feel pass is complete.

### 4.3 Engineering Contracts

- [C-006 | Must] Rifle feel constants must be named by intent: `fireKick`, `recoilRecoveryMs`, `hitPauseMs`, `impactFlashMs`, or equivalent.
- [C-007 | Must] Fire timing, hit timing, recoil recovery, and feedback rendering must remain testable without a live network.
- [C-008 | Must Not] This rung must not create a second combat event bus.
- [C-009 | Must] No stopgaps: each rung must build the smallest correct version of the real weapon-feel system, not a temporary substitute. If the full feel pass is too large, reduce capability rather than faking recoil, hit authority, enemy reaction, or proof.
- [C-010 | Must] Temporary compatibility paths are allowed only for migration, rollback, protocol, persistence, or client-version safety, and must name the removal condition.

### 4.4 Safety / Performance

- [C-020 | Must] The seeded browser proof must complete without console errors.
- [C-021 | Must] The feedback pass must preserve 60fps in the seeded one-player scenario; broader load/perf is deferred to a later combat-performance rung.

---

## 5) Milestone Ladder

### 5.1 Milestone Rung Index

| Rung | State | Size | User / Dev / Engineering unlock | Proof summary | Evidence artifact | Rung commit | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ARENA-FPS-WEAPON-FEEL__M1` | Complete | S | Player can fire and damage a drone | Unit + integration proof passed | `tmp/2026-06-14__arena-fps-rifle-fire-m1/rifle-fire-test-output.txt` | `a1b2c3d` - add rifle fire and damage loop | Details archived in A4 |
| `ARENA-FPS-WEAPON-FEEL__M2` | Complete | S | Player can tell a hit occurred | Hit marker + enemy flash proof passed | `tmp/2026-06-15__rifle-hit-marker-m2/hit-marker-before-after.png` | `b2c3d4e` - add basic hit readability | Details archived in A4 |
| `ARENA-FPS-WEAPON-FEEL__M3` | In Progress | M | Player feels power, hit read, and recoverable control in one loop | Timing test + browser clip + human feel review | Pending - `tmp/<date>__arena-fps-rifle-feel-m3/` screenshot + benchmark table | Pending - commit after M3 proof + spec/eval sync | Active |
| `ARENA-FPS-WEAPON-FEEL__M4` | Proposed | M | Designer can tune rifle feel safely | Tuning surface + regression proof | Pending - tuning table + regression output | Pending | Wait for M3 |

### `ARENA-FPS-WEAPON-FEEL__M1` - Core Fire And Damage

**State:** Complete  
**Unlocked:** Player can press fire, spawn a rifle shot, hit a drone, and reduce drone health.  
**Rung size:** S - Complexity S: one weapon path plus one proof harness; Risk S: revertible first-weapon behavior, no persistence or shared infra; Perf Impact S: shot-resolution path only, no new per-frame loop; Cost Impact N/A - local client/runtime only, no infra, external-service, model/tool-call, or storage delta.  
**Rung brief:** Establishes the minimum combat truth. It intentionally does not try to make the rifle feel good.  
**Contracts:** C-003, C-008  
**Proof:** `ARENA-FPS-WEAPON-FEEL__M1__G1` passed in `test/gameplay/weapons/rifle-fire.spec.js`.  
**Evidence artifacts:** `tmp/2026-06-14__arena-fps-rifle-fire-m1/rifle-fire-test-output.txt`. Temporary artifact may expire; surviving summary: accepted-fire input produced a rifle shot, hit a drone, emitted `targetHit`, and reduced health in the focused test.  
**Rung commit:** `a1b2c3d` - add rifle fire and damage loop  
**Done:** Committed after proof and spec/eval sync.

### `ARENA-FPS-WEAPON-FEEL__M2` - Basic Hit Readability

**State:** Complete  
**Unlocked:** Player can identify successful hits through a marker and target flash.  
**Rung size:** S - Complexity S: one feedback path attached to existing hit events; Risk S: visual readability can regress but combat truth is unchanged; Perf Impact S: bounded feedback sprites/timers only; Cost Impact N/A - no infra, external-service, model/tool-call, or storage delta.  
**Rung brief:** Adds hit read without solving recoil, camera impulse, audio, or full weapon feel.  
**Contracts:** C-002, C-003  
**Proof:** `ARENA-FPS-WEAPON-FEEL__M2__G1` and `__G2` passed; artifact archived in A4.  
**Evidence artifacts:** `tmp/2026-06-15__rifle-hit-marker-m2/hit-marker-before-after.png` and `tmp/2026-06-15__rifle-hit-marker-m2/hit-readability-table.md`. Temporary artifacts may expire; surviving summary: before state showed hit damage with weak read, after state showed target flash plus hit marker sourced from `targetHit`.  
**Rung commit:** `b2c3d4e` - add basic hit readability  
**Done:** Committed after proof and spec/eval sync.

### `ARENA-FPS-WEAPON-FEEL__M3` - Rifle Feel And Hit Readability

**State:** In Progress

**Rung commit:** Pending - commit after proof, Work Spec sync, and eval status sync.

**Evidence artifacts:** Pending - capture `tmp/<date>__arena-fps-rifle-feel-m3/rifle-feedback-before-after.png`, `tmp/<date>__arena-fps-rifle-feel-m3/rifle-feel-review.mp4`, `tmp/<date>__arena-fps-rifle-feel-m3/frame-budget-before-after.md`, and `tmp/<date>__arena-fps-rifle-feel-m3/console.log`. Because these are temporary, the completed rung must keep the accepted feel summary and the before/after benchmark numbers in this section.

**Rung size:** M - Complexity M: rifle loop, camera feedback, target reaction, tuning constants, and seeded browser proof all need coordinated judgment; Risk M: core first-weapon feel and readability can regress, but there is no data migration, auth, or shared backend state; Perf Impact M: touches frame-loop feedback and camera impulses, so 60fps proof is required; Cost Impact N/A - client/runtime feel pass only, no infra, external-service, model/tool-call, or storage delta.

**User journey unlock:** Player fires the rifle at a moving drone and understands power, aim movement, hit confirmation, enemy reaction, and recovery in one continuous moment.

**Developer journey unlock:** A future engineer can adjust rifle feel from named constants and rerun focused timing/browser proof without reading the entire combat stack.

**Engineering unlock:** Fire input, hit events, recoil/camera response, and target feedback become separate but synchronized pieces of one testable feedback loop.

**Rung design brief:**
- Fantasy: fast arena rifle, not tactical sim and not slow military recoil.
- Moment loop: acquire target -> fire -> immediate weapon response -> hit read -> enemy reaction -> controlled aim recovery.
- First three seconds must communicate: immediacy, force, readable damage, and recoverable control.
- Stronger feedback is allowed only while target readability remains intact.

**Mandates / best practices for this rung:**
- Fire feedback happens on the accepted fire frame or nearest possible render frame.
- Hit confirmation uses target reaction plus one weapon/HUD/audio channel.
- Recoil communicates force but returns control predictably.
- Camera shake is brief, directional, and never destroys target readability.
- Enemy reaction clarifies hit direction/state without hiding the target.
- Human feel review accepts the clip; tests prove timing and technical health.

**Implementation lane:**
- Rifle fire loop.
- Recoil/camera response.
- Hit confirmation event handling.
- Enemy hit reaction feedback.
- Existing audio/VFX hooks if already present.

**Not in this rung:**
- Weapon inventory, attachments, progression, or economy.
- Full enemy AI rewrite.
- Netcode prediction or rollback.
- New combat event bus.

**Obviousness checks:**
1. "It fired when I clicked" -> fire-to-feedback timing test.
2. "I know I hit" -> browser clip shows target reaction plus feedback channel.
3. "I can correct aim" -> recoil recovery test proves bounded recovery.
4. "The target stayed readable" -> browser clip review checks no aim-hostile occlusion.
5. "I can tune it later" -> named constants are covered by test snapshots or assertions.

**Contracts:** C-001, C-002, C-004, C-005, C-006, C-007, C-020, C-021

**Proof plan:**
- `ARENA-FPS-WEAPON-FEEL__M3__G1`: deterministic timing proof for accepted fire -> first feedback -> hit reaction -> recovery.
- `ARENA-FPS-WEAPON-FEEL__M3__G2`: seeded browser proof captures clip, screenshot, and console log for the player journey.
- `ARENA-FPS-WEAPON-FEEL__M3__G3`: human feel review accepts the clip or names exact delta.

**Before / after benchmark table:** Pending - fill from `frame-budget-before-after.md`.

| Metric | Before | After | Target |
| --- | --- | --- | --- |
| Click-to-first-feedback | TBD | TBD | <= 1 render frame |
| Hit-to-target-reaction | TBD | TBD | <= 1 render frame |
| Recoil recovery | TBD | TBD | Tuned and accepted |
| Seeded proof frame health | TBD | TBD | 60fps, no console errors |

**Done when:** Player journey proof shows immediate fire response, clear hit read, enemy reaction, and recoverable recoil; developer proof shows named tuning constants and focused tests; screenshot/clip/benchmark-table evidence is recorded; human accepts the feel artifact; Work Spec/eval status is synced; M3 is committed and its short hash is recorded here.

### `ARENA-FPS-WEAPON-FEEL__M4` - Designer Tuning Surface

**State:** Proposed  
**Rung commit:** Pending  
**Evidence artifacts:** Pending - expected `tmp/<date>__arena-fps-rifle-tuning-m4/tuning-constant-table.md` and regression output.  
**Rung size:** M - Complexity M: creates a designer-facing tuning surface over M3 constants and regression proof; Risk S: tuning values are revertible and scoped to starter rifle; Perf Impact S: no new runtime loop beyond existing constants reads; Cost Impact N/A - no infra, external-service, model/tool-call, or storage delta.  
**Unlock:** Designer can safely tune rifle feel without changing combat correctness.  
**Rung brief:** Builds on M3 by exposing a small tuning surface and regression proof. Do not start until M3 feel is accepted.  
**Done when:** Tuning values are centralized, documented, covered by regression tests, and a designer can adjust them without code archaeology.

---

## 6) Proof / Eval Summary

Detailed proof gates live in `docs/work/games/arena-fps-weapon-feel/eval-plan.md`.

| Gate | Rung | State | Artifact |
| --- | --- | --- | --- |
| `ARENA-FPS-WEAPON-FEEL__M3__G1` | M3 | Open | pending test output |
| `ARENA-FPS-WEAPON-FEEL__M3__G2` | M3 | Open | `tmp/<date>__arena-fps-rifle-feel-m3/` |
| `ARENA-FPS-WEAPON-FEEL__M3__G3` | M3 | Waiting Human | pending feel review |

---

## 7) Open Questions / Blockers

- [UQ-001 | Blocking M3 completion] Human feel acceptance has not happened.
  - Needed because: tests can prove timing and rendering health, not taste.
  - Resolve by: capture clip and ask one acceptance question: "Does the starter rifle feel immediate, punchy, readable, and controllable enough for this milestone?"
  - Recommendation: accept only if the reviewer names no more than minor tuning deltas.

---

## 8) Source References

- [SRC-001] `src/gameplay/weapons/rifle.js:1` - rifle fire entrypoint.
- [SRC-002] `src/gameplay/combat/hit-resolution.js:1` - hit event shape and damage authority.
- [SRC-003] `src/render/camera/recoil.js:1` - current recoil implementation.
- [SRC-004] `tests/browser/seeded-arena-smoke.spec.js:1` - existing browser proof harness.

---

# Appendix

## A1) Recent / Historical Change Log

- 2026-06-14 - Created initial Work Spec with M1/M2/M3 ladder.
- 2026-06-15 - Completed M1/M2; moved implementation narration to A4.

## A2) Decision Log

- **Date:** 2026-06-16  
  **Decision:** Keep recoil visual/control feel in M3 but defer designer-facing tuning UI to M4.  
  **Rationale:** M3 needs one polished feel loop before a tuning surface can be meaningful.  
  **Alternatives considered:** expose tuning first; tune entirely in code.  
  **Consequences / tradeoffs:** Faster player-facing proof now; tuning polish waits one rung.  
  **Disprove if:** M3 tuning churn becomes slow enough that lack of tuning surface blocks feel acceptance.

## A3) References (Historical Or Inactive)

- [SRC-A3-001] `tmp/2026-06-15__rifle-hit-marker-m2/` - old M2 hit-marker proof artifact.

## A4) Archive (Obsoleted Or Superseded)

- M1 implementation notes moved here after M1 commit.
- M2 detailed hit-marker alternatives moved here after M2 proof.
- Resolved question: "Should M2 include recoil?" Answer: no, recoil belongs to M3.

## A5) Full Freeform Implementation Spec / Random Context

### A5.1 Sequence Sketch

```text
input.fire -> rifle cooldown accepts -> fire feedback emitted
fire event -> hit resolution -> targetHit event
targetHit -> enemy reaction + hit confirmation
recoil impulse -> bounded recovery -> player tracks next shot
```

### A5.2 Random Context / Scratchpad

- Early playtest note: "I could see damage but did not feel the shot."
- Possible later reference: add low-ammo click only after weapon loop is stable.
- Do not promote these notes into active sections until they affect a rung, blocker, or contract.

---

# Rung Quality Notes

This example keeps completed rungs compact but not empty. They still say what they unlocked, what proof closed them, and where history went.

The active rung is long because it is the build packet. It carries product value, UX/design taste, engineering boundaries, proof, and "done when" in one place.

The header only points to the active rung. It does not copy the active rung.

The appendix is real. It holds history and random context so the active sections stay clean without losing potentially useful memory.

---

# What This Example Is Teaching

- Work Specs are not shorter by being less rigorous.
- Milestone rungs should be rich enough to execute.
- User journey, developer journey, and engineering unlock language beats mechanical "objective green" phrasing.
- No-stopgap belongs in Section 4 as one global contract, not as repeated rung boilerplate.
- The eval plan owns detailed proof mechanics; the Work Spec names the proof purpose and current proof state.
- Archive and random context are allowed, but quarantined.

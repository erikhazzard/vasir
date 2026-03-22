# AGENTS.md: [Project Name] Root Manifest
<!-- vasir:profile:ios -->

> EDIT THESE FIRST
> 1. Rewrite the `Purpose` block below in 2-3 repo-specific sentences.
> 2. Replace the routing bullets in Section 1 with the real lifecycle, sync, and UI paths in this repo.
> 3. Delete any lifecycle, offline, or performance rule that is not true here.

**Last Updated:** [YYYY-MM-DD - update alongside major architectural PRs]
<!-- vasir:purpose:start -->
**Purpose:** [Describe this iOS repository in 2-3 repo-specific sentences. Replace this block first. State the main user experience, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->

---

## 1. Topography & Routing Protocol (The Map)

This root file contains only global rules. For domain-specific logic, you MUST read the scoped agent files before modifying code in those directories.

* **App Lifecycle:** If touching `/ios/App/`, startup, or backgrounding code, read the platform manifest before changing lifecycle behavior.
* **Networking / Sync:** If touching `/ios/Sync/`, `/ios/Networking/`, or cache layers, read the sync manifest before changing offline or retry behavior.
* **UI Modules:** If touching `/ios/UI/`, feature screens, or design-system components, read the screen or UI manifest before editing layout or navigation.
* **Cold Storage:** Do not read `/docs/legacy/` unless explicitly instructed by the user.

---

## 2. Immutable Global Constraints (The "Hard No's")

These are absolute laws of the codebase. Violating these will break lifecycle safety, performance, or platform compliance.

### Toolchain & Environment
* **Dependencies:** Do not add new SDKs without explicit user permission, ownership, and privacy review.
* **Main Thread:** Never block the main thread with disk, parsing, or network work.
* **Reachability:** Never assume stable connectivity or in-order delivery from device state.

### Core Anti-Patterns (Pre-Training Adversaries)
* **Lifecycle:** Never assume app work will finish uninterrupted across background, suspend, or kill boundaries.
* **Memory:** Never add hot-path allocations or large transient copies on scroll, animation, or decode paths without measurement.
* **Local Time:** Never use device-local time as an ordering or authority source unless the contract explicitly allows drift.

---

## 3. The "Non-Obvious" Architectural Landmines

Do not attempt to "fix" or simplify these patterns unless you have verified why they exist.

* **Backgrounding:** Some persistence or sync paths may be intentionally conservative to survive lifecycle interruption.
* **Battery / Thermal Constraints:** Some UI or networking behavior may trade elegance for battery, thermal, or startup safety.
* **Offline Semantics:** Push delivery, reachability, and local clocks are not reliable ordering sources.

---

## 4. Engineering Philosophy & Mandates

Write code that matches the team's actual mobile engineering culture, not generic sample-app defaults.

* **Lifecycle First:** Prefer predictable lifecycle handling over clever background magic.
* **Measure Hot Paths:** Prefer measured UI smoothness and memory discipline over abstraction-heavy convenience layers.
* **No Premature Abstractions:** Do not hide platform behavior behind helpers until the shape is stable.
* **Typing:** Keep types explicit and narrow. Do not erase platform semantics behind generic wrappers.
* **Comments:** Only write "why" comments when platform constraints force a non-obvious path.

---

## 5. The Execution & Recap Protocol (Initial Trajectory)

Before you generate any code, stabilize your context window.

1. **The "Why":** State the user journey or platform behavior the change unlocks.
2. **The "Where":** List the exact files you intend to modify.
3. **The "Gotchas":** Name the lifecycle, offline, memory, or main-thread constraint that applies here.
4. **Approval:** If this repo wants explicit human gating, wait for the user to say `Proceed` before writing code.

```txt
<Plan>
// Your analysis goes here...
</Plan>
```

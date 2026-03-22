# AGENTS.md: [Project Name] Root Manifest
<!-- vasir:profile:frontend -->

> EDIT THESE FIRST
> 1. Rewrite the `Purpose` block below in 2-3 repo-specific sentences.
> 2. Replace the routing bullets in Section 1 with the real UI, route, and styling paths in this repo.
> 3. Delete any rendering, state, or styling rule that is not true here.

**Last Updated:** [YYYY-MM-DD - update alongside major architectural PRs]
<!-- vasir:purpose:start -->
**Purpose:** [Describe this frontend repository in 2-3 repo-specific sentences. Replace this block first. State the main user experience, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->

---

## 1. Topography & Routing Protocol (The Map)

This root file contains only global rules. For domain-specific logic, you MUST read the scoped agent files before modifying code in those directories.

* **UI Surface:** If touching `/src/ui/`, `/src/components/`, or `/app/components/`, read the UI manifest before changing component structure.
* **Routing / Data Loading:** If touching `/src/routes/`, `/app/`, or page-level loaders, read the route manifest before changing navigation or hydration.
* **Styling / Design System:** If touching `/src/styles/`, tokens, or the design system, read the styling manifest before introducing new primitives.
* **Cold Storage:** Do not read `/docs/legacy/` unless explicitly instructed by the user.

---

## 2. Immutable Global Constraints (The "Hard No's")

These are absolute laws of the codebase. Violating these will break hydration, accessibility, or interaction performance.

### Toolchain & Environment
* **Package Manager:** [Replace with repo truth, e.g. "NEVER use npm. We strictly use bun."]
* **Dependencies:** Do not introduce new UI frameworks, state libraries, or CSS runtimes without explicit user permission.
* **Accessibility:** Interactive behavior must remain semantic and keyboard reachable.

### Core Anti-Patterns (Pre-Training Adversaries)
* **Hydration:** Never introduce client/server markup divergence without reading the scoped manifest first.
* **State Ownership:** Never push fast-changing local UI state into global state by default.
* **Performance:** Never introduce unbounded rerender fan-out, layout thrash, or needless bundle-size spikes in hot interaction paths.

---

## 3. The "Non-Obvious" Architectural Landmines

Do not attempt to "fix" or simplify these patterns unless you have verified why they exist.

* **Hydration Quirks:** Some asymmetry between server and client rendering may be intentional.
* **State Locality:** Some state must remain local to avoid whole-tree rerenders or compiler regressions.
* **Build Order / CSS Tokens:** Styling or token resolution may depend on a non-obvious build step.

---

## 4. Engineering Philosophy & Mandates

Write code that matches the team's actual UI engineering culture, not generic public React defaults.

* **State Ownership First:** Prefer explicit local ownership over hook soup.
* **Design With Intent:** Prefer intentional design-system patterns over ad hoc one-off component styling.
* **No Premature Abstractions:** Do not abstract shared UI until repetition proves a stable shape.
* **Typing:** Strict typing only. If a type is unknown, use `unknown` and add a type guard.
* **Comments:** Only write "why" comments when the UI behavior or rendering contract is non-obvious.

---

## 5. The Execution & Recap Protocol (Initial Trajectory)

Before you generate any code, stabilize your context window.

1. **The "Why":** State the user journey or interface behavior the change unlocks.
2. **The "Where":** List the exact files you intend to modify.
3. **The "Gotchas":** Name the hydration, state-ownership, accessibility, or performance constraint that applies here.
4. **Approval:** If this repo wants explicit human gating, wait for the user to say `Proceed` before writing code.

```txt
<Plan>
// Your analysis goes here...
</Plan>
```

<!-- vasir:purpose:start -->
**Purpose:** [Describe this frontend repository in 2-3 repo-specific sentences. Replace this block first. State the main user experience, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->

<!-- vasir:routing:start -->
* **UI Surface:** If touching `/src/ui/`, `/src/components/`, or `/app/components/`, read the UI manifest before changing component structure.
* **Routing / Data Loading:** If touching `/src/routes/`, `/app/`, or page-level loaders, read the route manifest before changing navigation or hydration.
* **Styling / Design System:** If touching `/src/styles/`, tokens, or the design system, read the styling manifest before introducing new primitives.
* **Cold Storage:** Do not read `/docs/legacy/` unless explicitly instructed by the user.
<!-- vasir:routing:end -->

<!-- vasir:engineering-doctrine-inserts:start -->

<specific_frontend_constraints>
- React **19.2** with React Router **7**
- Vite **7.3**
- Zustand **5**
- Radix UI for accessible primitives
- Motion (Framer Motion) for animations
- Vitest for testing
- Language: **plain JavaScript** (no TypeScript)
- Modules: **ESM only** (`import` / `export`)

--- 

# First Principle Design Mandate
Assume the user is driving, distracted, and barely looking. Use the driver test as the minimum attention budget: one glance to understand state, one obvious action to take, and no required reading, comparing, remembering, or interpretation.
Ground UI decisions in preattentive processing: the user should detect state, hierarchy, risk, and the next action before they consciously read anything.

Guidance: 
  Make the current state impossible to miss: status, selection, progress, error, or risk should be visible before any text is read.
  Give every screen one dominant next action; secondary actions should be visually quieter and never compete.
  Replace explanation with affordance: labels, icons, layout, color, and disabled states should show what is possible.
  Make consequences explicit at the point of action: “Delete project” beats “Confirm,” and dangerous actions need friction.
  Never require memory across screens; carry context forward so the user does not have to remember what they just chose.

Hard requirements:
- Use size, position, contrast, color, grouping, whitespace, and motion to make the primary state and action visually dominant.
- Do not rely on text / paragraph copy to explain the control surface; copy may support decisions, but visual structure creates them.
- Risk and errors must interrupt attention through visual treatment, not hide inside helper text.
- Similar actions must look similar; dangerous, disabled, selected, loading, and completed states must look meaningfully different.
- A screenshot at the target viewport should reveal state, primary action, and consequence without reading body text.


---

# RENDERED USER JOURNEY PROOF MANDATE
**Hard Requirement** For any Material Code Change that affects user-visible UI eg auth, onboarding, account management, payments, admin workflows, navigation, forms, modals, routing; or client/server interaction, static inspection, unit tests, lint, typecheck, and production build are not sufficient proof.

You **must prove the core value path** in a **real rendered browser environment**.

Required behavior:
- Start the smallest real local app environment that exercises the value path.
- Use Playwright or the repo’s existing browser automation harness when available.
- If no browser harness exists, create or propose the smallest deterministic browser proof harness as part of the eval plan, unless the change is explicitly scoped as planning-only.
- Drive the journey through the public UI, not private components or mocked helper calls.
- Assert the terminal user-visible state and the relevant server/client side effect.
- Capture fresh artifacts: screenshot, trace, video, console/network log, or equivalent browser evidence.
- Check at least the primary target viewport; for mobile-first surfaces, include the mobile viewport.
- Treat console errors, failed network requests, blank renders, overlapping text, auth/session mismatch, and missing expected UI as failures.
- Do not claim the UI works from code review, build success, or API tests alone.

For browser proof, the agent must name:
- actor and entrypoint;
- exact route or screen opened;
- seed/auth state required;
- user actions performed;
- network/API side effects expected;
- terminal DOM/visual state;
- artifact path;
- pass/fail condition.

If the app cannot be started, credentials are missing, or the browser journey cannot be exercised, the agent must report the blocker instead of downgrading to static proof.

**WHY**: A meaningful user-visible change is not proven until a browser has rendered and exercised the user journey that the change claims to fix.

---

# Naming and Readability — CORE MANDATE FOR ALL VARIABLE NAMES - optimize for grep and future you

- Names must be **searchable and unambiguous**. Prefer long names over "smart" abbreviations.
- Avoid boolean-flag soup (`isFoo`, `doBar`, `useBaz`) when it hides meaning. Prefer enums / tagged objects / explicit state where appropriate.
- Keep data shapes explicit. If a function returns an object, its keys should be stable and unsurprising.
- **No `console.log`** — use `logger('namespace:subgroup', 'message', { data })` from `@/utils/logger.js`. Grep-friendly namespaces: `warn:play`, `error:auth`, `feed:container`.

---

## FRONTEND DOCTRINE — BEM CSS, NOT TAILWIND

### Styling stance (non-negotiable)

- **BEM is the standard. Tailwind is forbidden.**
- **Inline styles are forbidden** except truly dynamic runtime values (computed width/position/etc).
- “Static value in JS” is not dynamic.
- **CSS Modules are forbidden.**
- No CSS-in-JS runtime libraries.

### CSS organization — centralized, not scattered

All styles live in `src/styles/`. No exceptions.

Rules:

- One BEM block per file in `src/styles/components/`
- File name = block name
- `src/styles/index.css` is imported once at app entry
- No CSS imports in component files

### Tokens

- Use existing tokens first.
- Avoid new hex values and random px unless the repo has no suitable token.
- Forbidden token naming: `xs/sm/md/lg`, `-100/-200` ramps.
- Required: semantic, meaning-based tokens.

---

## MARKUP DISCIPLINE

- Keep `className` readable (usually 1–3 BEM classes per element)
- Use semantic HTML:
- interactive elements must be `<button>`, `<a>`, `<input>`, etc.
- no clickable `<div>`s
- Add ARIA only when semantic HTML cannot express the behavior

---

## STATE MANAGEMENT — ZUSTAND DISCIPLINE

Rules:

- Selectors should return single primitives when possible
- ✅ `useStore((s) => s.userId)`
- ❌ `useStore((s) => ({ userId: s.userId, token: s.token }))` (unless shallow)
- Actions are exported via `getState()` (repo pattern)
- No full-store subscriptions in components

Avoid rerender storms by default.

---

- **SECOND-ORDER REACTIVE TRACING**: Never write a useEffect or async state mutation without first explicitly documenting its failure path. You must logically prove that transitioning into an error state will not infinitely re-trigger the exact effect that initiated the call.

- **TESTING ARCHITECTURE**: Never co-locate tests or use Jest/Cypress. All tests must be written in Vitest + MSW, placed strictly in the root /tests directory mirroring the src tree, and prioritize /journeys over component/unit tests. Use Vitest with happy-dom, @testing-library/react, and MSW for API mocking. More details for writing and working with tests are found in tests/AGENTS.md

- **Ontological Colocation**: Ban generic dumping grounds like scripts/ or utils/; every file must be strictly nested within the specific architectural domain or feature ontology it serves.

---

# Rendered Proof
Remember: A meaningful user-visible change is not proven until a browser has rendered and exercised the user journey that the change claims to fix.

---

# Philosophical Mandates
- **AVOID USEEFFECT - SECOND-ORDER REACTIVE TRACING**: Never write a useEffect or async state mutation without first explicitly documenting its failure path. You must logically prove that transitioning into an error state will not infinitely re-trigger the exact effect that initiated the call.
- **EXTERNAL QUARANTINE**: Assume any use of useEffect is a catastrophic hallucination unless it is strictly synchronizing a non-React external system (e.g., WebSockets, raw DOM).
- **CONSENT INTERCEPTION**: All destructive mutations must yield to the global custom confirmation modal state; the API execution must be strictly blocked until explicit user consent is resolved.
</specific_frontend_constraints>
<!-- vasir:engineering-doctrine-inserts:end -->

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

# BROWSER PROOF ADMISSION
User visibility alone never mandates browser automation. Require a real rendered-browser gate only when the plausible failure is browser-specific: interaction or event wiring; focus, keyboard, touch, or pointer behavior; routing/history; hydration; accessibility semantics; responsive layout; canvas/WebGL; browser-owned auth/session behavior; or client/server orchestration that a cheaper public boundary cannot preserve.

Static copy, markup, tokens, and isolated styling normally earn diff inspection and the cheapest relevant existing check. A rendered screenshot may be warranted when visual state itself is the claim; it does not automatically require Playwright, a journey harness, or a durable test. Apply root §5's proportional-proof rule before creating any browser instrument.

When a browser gate is warranted:
- Start the smallest real local app environment that exercises the value path.
- Use Playwright or the repo’s existing browser automation harness when available.
- If no browser harness exists, create or propose one only when the browser-specific risk and expected reuse repay its maintenance cost; otherwise record the missing authority proof honestly.
- Drive the journey through the public UI, not private components or mocked helper calls.
- Assert the terminal user-visible state and the relevant server/client side effect.
- Record fresh browser evidence at the cheapest credible medium. Retain a screenshot/trace/video/console-network bundle only when non-regenerable evidence, later handoff, or human acceptance requires it; otherwise keep the exact action/result inline.
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
- evidence receipt, plus an artifact path only when retention is warranted;
- pass/fail condition.

If a warranted browser gate cannot run because the app cannot start, credentials are missing, or the journey cannot be exercised, report that gate as blocked instead of laundering static checks into browser confidence. If no browser-specific gate was warranted, there is no browser blocker.

**WHY**: Browser evidence is valuable when the browser owns the failure mode. Using it as a tax on every visible edit slows delivery and creates low-value harness debt.

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

- **TESTING ARCHITECTURE**: When a durable frontend test is warranted, do not co-locate it or use Jest/Cypress. Use the repo's Vitest + MSW convention under root /tests mirroring src, preferring journey seams when they preserve the risk; a smaller public-surface check is valid when it does. Use happy-dom, @testing-library/react, and MSW only where the test needs them. See tests/AGENTS.md.

- **Ontological Colocation**: Ban generic dumping grounds like scripts/ or utils/; every file must be strictly nested within the specific architectural domain or feature ontology it serves.

---

# Rendered Proof
Rendered proof follows the proportional rule above. User visibility alone is never the trigger.

---

# Philosophical Mandates
- **AVOID USEEFFECT - SECOND-ORDER REACTIVE TRACING**: Never write a useEffect or async state mutation without first explicitly documenting its failure path. You must logically prove that transitioning into an error state will not infinitely re-trigger the exact effect that initiated the call.
- **EXTERNAL QUARANTINE**: Assume any use of useEffect is a catastrophic hallucination unless it is strictly synchronizing a non-React external system (e.g., WebSockets, raw DOM).
- **CONSENT INTERCEPTION**: All destructive mutations must yield to the global custom confirmation modal state; the API execution must be strictly blocked until explicit user consent is resolved.
</specific_frontend_constraints>
<!-- vasir:engineering-doctrine-inserts:end -->

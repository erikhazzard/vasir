# Frontend Inserts

Use this only for advanced composition when the frontend profile is close but not exact.

## Suggested Routing Examples

* If touching `/src/ui/` or `/src/components/`, read the UI manifest before changing component structure.
* If touching `/src/routes/` or `/app/`, read the routing/data-loading manifest before changing navigation or hydration.
* If touching `/src/styles/` or the design system, read the styling manifest before introducing new visual primitives.

## Suggested Global Constraints

* **Dependencies:** No new UI framework, state library, or CSS runtime without approval.
* **Hydration:** Do not introduce client/server markup divergence or "fix" hydration quirks without reading the scoped manifest.
* **Accessibility:** Interactive behavior must stay semantic and keyboard reachable.
* **Performance:** Avoid unbounded rerender fan-out, bundle-size spikes, and layout thrash in hot interaction paths.

## Landmines
* Data loading, hydration, and optimistic UI behavior may be intentionally asymmetric.
* Some state must remain local to avoid whole-tree rerenders.
* CSS ordering or token resolution may depend on a non-obvious build step.

# Philosophical Mandates
- **AVOID USEEFFECT - SECOND-ORDER REACTIVE TRACING**: Never write a useEffect or async state mutation without first explicitly documenting its failure path. You must logically prove that transitioning into an error state will not infinitely re-trigger the exact effect that initiated the call.
- **EXTERNAL QUARANTINE**: Assume any use of useEffect is a catastrophic hallucination unless it is strictly synchronizing a non-React external system (e.g., WebSockets, raw DOM).
- **CONSENT INTERCEPTION**: All destructive mutations must yield to the global custom confirmation modal state; the API execution must be strictly blocked until explicit user consent is resolved.
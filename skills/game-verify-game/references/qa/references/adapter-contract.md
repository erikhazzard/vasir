# QA adapter contract

`qa/adapter.ts` is the only project-specific bridge used by the shipped runner. Start from `qa-adapter.template.ts`; preserve this public shape while adding only primitives the game actually needs.

## Exported shape

```ts
export interface AdapterContext {
  runnerId: string;
  artifactDir: string;
  binds: Record<string, any>;
  tab: string;
}

export const adapter = {
  url: string,
  readyMarker: string,
  hudSelector?: string,
  arrange: Record<string, (page, args, ctx: AdapterContext) => Promise<any>>,
  probe: Record<string, (page, args, ctx: AdapterContext) => Promise<any>>,
  events: {
    subscribe: (page, channel, filter) => Promise<handle>,
    drain: (page, handle) => Promise<any[]>
  },
  reset: (page, ctx: AdapterContext) => Promise<void>,
  clearByTag: (page, tag, ctx: AdapterContext) => Promise<void>
};
```

## Semantics

- `url` is the runnable game URL. `readyMarker` is a one-shot console marker emitted after `window.debug` is available. The runner treats `window.debug` as required and the marker as a bounded readiness aid.
- `hudSelector` is optional. When absent, HUD-only capture is unavailable; do not fabricate a crop.
- `arrange.*` establishes preconditions through the game's debug surface. It never performs the current case's action under test.
- `probe.*` is read-only and JSON-serializable. `snapshot` is required as the general fallback; specialized probes exist only where cases need them.
- `events.subscribe` creates a handle for one channel/filter. `events.drain` returns new matching events for that handle without inventing empty success after a transport failure.
- `reset` is idempotent between journeys.
- `clearByTag` removes only state created under the supplied runner tag; it must not sweep unrelated project or concurrent-run state.

Missing arrange or probe primitives are `capability-gap` tickets and halt affected work. Project-specific input and capture behavior belongs in the local runner extension points; project state access belongs here. Do not fork existing step semantics into the adapter.

/**
 * qa-adapter.ts — project-specific bridge between the runner and your game.
 *
 * The runner's existing step semantics are shared; this file is your project's
 * adaptation layer. Wire each `arrange.*` and `probe.*` function to your
 * project's `window.debug.<action>` (or wherever your debug surface lives).
 *
 * NEVER add a primitive whose name describes an action the player would do
 * in normal gameplay — that's a shortcut, not a test. Only state-setup and
 * observation. See arrange-vs-shortcut.md.
 *
 * Contract: references/adapter-contract.md
 */

import type { Page } from "playwright";

export interface AdapterContext {
  runnerId: string;
  artifactDir: string;
  binds: Record<string, any>;
  tab: string;
}

// Track entities created by each runner so clearByTag can clean them up
// without touching state owned by other runners or by the project itself.
const spawnTracker = new Map<string, Record<string, string[]>>();
function track(runnerId: string) {
  let t = spawnTracker.get(runnerId);
  if (!t) { t = {}; spawnTracker.set(runnerId, t); }
  return t;
}

// Universal pattern: invoke `window.debug.<name>(args)` and return its result.
async function debugCall(page: Page, name: string, args: any = {}): Promise<any> {
  return page.evaluate(([n, a]) => (window as any).debug[n](a), [name, args] as const);
}

type Adapter = {
  url: string;
  readyMarker: string;
  hudSelector?: string;
  arrange: Record<string, (page: Page, args: any, ctx: AdapterContext) => Promise<any>>;
  probe: Record<string, (page: Page, args: any, ctx: AdapterContext) => Promise<any>>;
  events: {
    subscribe: (page: Page, channel: string, filter: any) => Promise<{ handle: string; channel: string; filter: any }>;
    drain: (page: Page, h: { handle: string; filter: any }) => Promise<any[]>;
  };
  reset: (page: Page, ctx: AdapterContext) => Promise<void>;
  clearByTag: (page: Page, tag: string, ctx: AdapterContext) => Promise<void>;
};

export const adapter: Adapter = {
  // TODO: your project's dev URL
  url: "http://localhost:5173/",
  // TODO: a console marker your project emits when window.debug is ready
  readyMarker: "[debug-ready]",
  // Optional: CSS selector for the HUD/overlay to capture in `at: [hud]`
  hudSelector: undefined,

  // ── arrange.* — synthetic state-setup (preconditions only) ────────────
  // Add primitives as features need them. Naming rule: setup verbs (`set`,
  // `spawn`, `give`, `grant`, `clear`). Never name a primitive after the
  // specific action a case verifies — that's a shortcut, not a test. See
  // arrange-vs-shortcut.md.
  arrange: {
    // Generic pattern — replace with your project's primitives:
    // setValue: (page, args) => debugCall(page, "setValue", args),
    //
    // If a primitive creates a project entity, record it so clearByTag()
    // can sweep it at journey end:
    // create: async (page, args, ctx) => {
    //   const result = await debugCall(page, "create", args);
    //   const t = track(ctx.runnerId);
    //   (t.created ??= []).push(result.id);
    //   return result;
    // },
  },

  // ── probe.* — observation queries (no state mutation) ─────────────────
  // The runner falls back to `probe.snapshot` when a `capture:` step
  // doesn't specify a probe explicitly. Return a small, JSON-serializable
  // shape — reviewers read these in evidence bundles.
  probe: {
    snapshot: (page) => page.evaluate(() => ({
      // TODO: a minimal summary of your current game state.
      // Return only what reviewers should see by default — small, JSON-serializable.
    })),

    // Add named probes as features need them. Generic pattern:
    // getX: (page, args) => debugCall(page, "getX", args),
    //
    // GENERIC STATE-TREE ACCESS by dotted path — a useful last-resort probe
    // before you've added a named one. Project owns where state lives.
    // path: async (page, args) => page.evaluate((p: string) => {
    //   const root = (window as any).__state; // TODO: your state root
    //   if (!root) return null;
    //   const parts = p.split(".");
    //   let v: any = root;
    //   for (const k of parts) v = v?.[k];
    //   try { return JSON.parse(JSON.stringify(v)); } catch { return String(v); }
    // }, args.path),
  },

  // ── events.subscribe / events.drain ──────────────────────────────────
  // Accumulator pattern: subscribe attaches a listener that pushes into a
  // window-side buffer keyed by `handle`; drain returns and clears the
  // buffer. The actual event source is project-specific — wire it in the
  // commented section below.
  events: {
    subscribe: async (page, channel, filter) => {
      const handle = `h-${channel}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const subscribed = await page.evaluate(({ channel, handle }) => {
        const w = window as any;
        w.__qaEventBuffers = w.__qaEventBuffers ?? {};
        w.__qaEventBuffers[handle] = [];

        // TODO: wire your project's event source into the buffer. Examples:
        //
        // — DOM CustomEvent:
        //   window.addEventListener(channel, (e: any) => {
        //     for (const h of Object.keys(w.__qaEventBuffers))
        //       if (h.startsWith(`h-${channel}-`))
        //         w.__qaEventBuffers[h].push({ ...e.detail, t: Date.now() });
        //   });
        //
        // — Custom EventEmitter (e.g. w.__events.on(channel, ...)):
        //   w.__events?.on(channel, (msg: any) => {
        //     for (const h of Object.keys(w.__qaEventBuffers))
        //       if (h.startsWith(`h-${channel}-`))
        //         w.__qaEventBuffers[h].push({ ...msg, t: Date.now() });
        //   });
        //
        // — WebSocket / netcode-framework room messages:
        //   w.__room?.onMessage(channel, (msg: any) => { ... });
        return false; // TODO: return true after wiring one real source above.
      }, { channel, handle });
      if (!subscribed) throw new Error(`QA event source is not wired for channel: ${channel}`);
      return { handle, channel, filter };
    },

    drain: async (page, h) => {
      return page.evaluate(({ handle, filter }) => {
        const w = window as any;
        if (!w.__qaEventBuffers || !Array.isArray(w.__qaEventBuffers[handle])) {
          throw new Error(`QA event handle is unavailable: ${handle}`);
        }
        const buf = w.__qaEventBuffers[handle] as any[];
        w.__qaEventBuffers[handle] = [];
        return buf.filter((e: any) => {
          for (const k of Object.keys(filter ?? {})) {
            if (k === "nth") continue;
            if (e[k] !== filter[k]) return false;
          }
          return true;
        });
      }, { handle: h.handle, filter: h.filter });
    },
  },

  // ── reset() — canonical between-cases reset ──────────────────────────
  // Called once at the start of each journey to put the project in a known
  // state. Should be idempotent. If reset cannot establish its promised
  // baseline, throw and halt the journey rather than running contaminated.
  //
  // Patterns vary by game: reload the level, restart the run, snapshot-
  // and-restore world state, reset the player to a known position. Pick
  // what fits.
  reset: async (page) => {
    // TODO: your project's reset sequence.
  },

  // ── clearByTag — sweep entities created by this runner ───────────────
  // Called in the finally block of each journey. Iterate the spawnTracker
  // and remove only things this runner created. Never touch state owned by
  // other runners or by the project itself.
  //
  // For games without per-entity creation (e.g., a fresh-board puzzle, a
  // level-reload sim), a no-op here is fine — `reset()` does the work.
  clearByTag: async (page, tag) => {
    const tracker = track(tag);
    // TODO: iterate your tracked spawns and remove them.
    spawnTracker.delete(tag);
  },
};

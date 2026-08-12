/**
 * Game-QA Journey Runner — framework template.
 *
 * Project-agnostic. Reads a journey YAML; drives Playwright as a library;
 * emits an evidence bundle (output.json + screenshots/ + dom/ + console/).
 * Files capability-gap tickets when the project's adapter lacks a primitive
 * the journey asked for.
 *
 * Copy this file to <project>/qa/runner.ts. The 4-namespace adapter
 * (qa-adapter.ts) is the primary project-specific seam — but this runner is
 * also extensible: add new `perform:` types or `capture: at:` kinds your
 * game needs (see "Extending the framework" in the bootstrap SKILL). Don't
 * silently change existing semantics — that's forking.
 *
 * Contract: references/journey-schema.md
 *
 * Usage:
 *   node qa/runner.ts <path/to/journey.yaml>
 *   # (or tsx, vite-node, ts-node, pnpm-scoped — whatever your project uses)
 *
 * Outputs into the journey's parent directory:
 *   output.json
 *   screenshots/<moment>.png
 *   dom/<moment>.json
 *   console/<moment>.log
 *
 * Tickets (capability-gap on missing primitive) land in:
 *   <artifactDir>/tickets/
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { parse as parseYAML } from "yaml";
import * as fs from "node:fs";
import * as path from "node:path";
import { adapter, type AdapterContext } from "./adapter.ts";

// ── Types ──────────────────────────────────────────────────────────────────

interface Journey {
  journey: string;
  covers: string[];
  url?: string;
  headed?: boolean;
  tabs?: Array<{ name: string }>;
  steps: Step[];
}

type Step = Record<string, any>;

// ── Utilities ──────────────────────────────────────────────────────────────

function interp(value: any, binds: Record<string, any>): any {
  if (typeof value === "string") {
    const pure = value.match(/^\$([a-zA-Z_][\w]*(?:\.[\w]+)*)$/);
    if (pure) return resolveBind(pure[1], binds);
    return value.replace(/\$([a-zA-Z_][\w]*(?:\.[\w]+)*)/g, (_, ref) => {
      const v = resolveBind(ref, binds);
      return v === undefined ? `$${ref}` : String(v);
    });
  }
  if (Array.isArray(value)) return value.map(v => interp(v, binds));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) out[k] = interp(value[k], binds);
    return out;
  }
  return value;
}

function resolveBind(ref: string, binds: Record<string, any>) {
  const [name, ...rest] = ref.split(".");
  let v: any = binds[name];
  for (const p of rest) v = v?.[p];
  return v;
}

function evalPredicate(predicate: string, ctx: Record<string, any>): boolean {
  const keys = Object.keys(ctx);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...keys, `return (${predicate});`);
  return Boolean(fn(...keys.map(k => ctx[k])));
}

function uid(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function log(msg: string) {
  console.log(`[runner] ${msg}`);
}

// ── ExecCtx ────────────────────────────────────────────────────────────────

interface ExecCtx {
  tabs: Record<string, { context: BrowserContext; page: Page }>;
  defaultTab: string;
  binds: Record<string, any>;
  eventHandles: Record<string, any>;
  consoleBuffers: Record<string, string[]>;
  moments: any[];
  expects: any[];
  errors: any[];
  ticketsFiled: string[];
  runnerId: string;
  artifactDir: string;
  ticketsDir: string;
  paths: { screenshotsDir: string; domDir: string; consoleDir: string };
  startTime: number;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const journeyArg = process.argv[2];
  if (!journeyArg) {
    console.error("usage: node qa/runner.ts <path/to/journey.yaml>");
    process.exit(2);
  }

  const cwd = process.env.INIT_CWD || process.cwd();
  const journeyPath = path.isAbsolute(journeyArg) ? journeyArg : path.resolve(cwd, journeyArg);
  const journey = parseYAML(fs.readFileSync(journeyPath, "utf-8")) as Journey;
  const journeyDir = path.dirname(path.resolve(journeyPath));
  const artifactDir = path.dirname(path.dirname(journeyDir));
  const ticketsDir = path.join(artifactDir, "tickets");

  const screenshotsDir = path.join(journeyDir, "screenshots");
  const domDir = path.join(journeyDir, "dom");
  const consoleDir = path.join(journeyDir, "console");
  for (const d of [screenshotsDir, domDir, consoleDir, ticketsDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const runnerId = `run-${journey.journey}-${uid()}`;
  const url = journey.url ?? adapter.url;
  const headed = journey.headed ?? true;
  const tabSpecs = journey.tabs ?? [{ name: "main" }];

  const ec: ExecCtx = {
    tabs: {},
    defaultTab: tabSpecs[0].name,
    binds: {},
    eventHandles: {},
    consoleBuffers: {},
    moments: [],
    expects: [],
    errors: [],
    ticketsFiled: [],
    runnerId,
    artifactDir,
    ticketsDir,
    paths: { screenshotsDir, domDir, consoleDir },
    startTime: Date.now(),
  };

  log(`launch (headed=${headed}) journey=${journey.journey} runnerId=${runnerId}`);
  const browser = await chromium.launch({ headless: !headed });

  try {
    for (const tabSpec of tabSpecs) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      ec.consoleBuffers[tabSpec.name] = [];
      page.on("console", msg => ec.consoleBuffers[tabSpec.name].push(`[${msg.type()}] ${msg.text()}`));
      page.on("pageerror", err => ec.consoleBuffers[tabSpec.name].push(`[pageerror] ${err.message}`));

      log(`tab ${tabSpec.name}: navigate ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => typeof (window as any).debug !== "undefined", null, { timeout: 30000 });
      await waitForReadyMarker(ec.consoleBuffers[tabSpec.name], adapter.readyMarker, 5000);
      log(`tab ${tabSpec.name}: ready`);
      ec.tabs[tabSpec.name] = { context, page };
    }

    const tab0 = ec.tabs[tabSpecs[0].name];
    const ctx0: AdapterContext = { runnerId, artifactDir, binds: ec.binds, tab: tabSpecs[0].name };
    await adapter.reset(tab0.page, ctx0);

    await executeSteps(journey.steps, ec);
  } catch (err: any) {
    ec.errors.push({ phase: "main", error: err.message, stack: err.stack });
    console.error(`[runner] FATAL: ${err.message}`);
  } finally {
    for (const tabName of Object.keys(ec.tabs)) {
      try {
        const ctx: AdapterContext = { runnerId, artifactDir, binds: ec.binds, tab: tabName };
        await adapter.clearByTag(ec.tabs[tabName].page, runnerId, ctx);
      } catch (err: any) {
        ec.errors.push({ phase: "cleanup", tab: tabName, error: err.message });
      }
    }
    await browser.close();

    const expectFails = ec.expects.filter(e => e.result === "fail").length;
    const exitCode = ec.errors.length === 0 && expectFails === 0 ? 0 : 1;
    const output = {
      journey: journey.journey,
      runAt: new Date().toISOString(),
      runnerId,
      exitCode,
      durationMs: Date.now() - ec.startTime,
      covers: journey.covers,
      moments: ec.moments,
      expects: ec.expects,
      errors: ec.errors,
      tickets: ec.ticketsFiled,
    };
    fs.writeFileSync(path.join(journeyDir, "output.json"), JSON.stringify(output, null, 2));
    log(`DONE exit=${exitCode} moments=${ec.moments.length} expectFails=${expectFails} errors=${ec.errors.length} tickets=${ec.ticketsFiled.length}`);
    process.exit(exitCode);
  }
}

async function waitForReadyMarker(buf: string[], marker: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (buf.some(m => m.includes(marker))) return;
    await new Promise(r => setTimeout(r, 50));
  }
  // Soft: don't hard-fail if marker missing (window.debug check above is enough)
}

// ── Step executor ──────────────────────────────────────────────────────────

async function executeSteps(steps: Step[], ec: ExecCtx) {
  for (let idx = 0; idx < steps.length; idx++) {
    const step: any = interp(steps[idx], ec.binds);
    const tabName = step.tab ?? ec.defaultTab;
    const tab = ec.tabs[tabName];
    if (!tab) throw new Error(`step ${idx}: unknown tab "${tabName}"`);
    const page = tab.page;
    const ctx: AdapterContext = { runnerId: ec.runnerId, artifactDir: ec.artifactDir, binds: ec.binds, tab: tabName };

    try {
      if ("arrange" in step) {
        const fn = (adapter.arrange as any)[step.arrange];
        if (!fn) { await fileCapabilityGap(ec, step.arrange, "arrange"); throw new Error(`adapter.arrange.${step.arrange} not implemented`); }
        const result = await fn(page, step.args ?? {}, ctx);
        if (step.bind) ec.binds[step.bind] = result;
        log(`${idx} arrange ${step.arrange}${step.bind ? ` → ${step.bind}` : ""}`);
      } else if ("perform" in step) {
        await runPerform(step, page); log(`${idx} perform ${step.perform}`);
      } else if ("capture" in step) {
        await runCapture(step, page, ec, tabName, idx, ctx); log(`${idx} capture ${step.capture}`);
      } else if ("subscribeEvent" in step) {
        await runSubscribeEvent(step, page, ec, ctx); log(`${idx} subscribeEvent ${step.subscribeEvent}`);
      } else if ("waitForEvent" in step) {
        await runWaitForEvent(step, page, ec, ctx); log(`${idx} waitForEvent ${step.waitForEvent}`);
      } else if ("waitForState" in step) {
        await runWaitForState(step, page, ec, ctx); log(`${idx} waitForState`);
      } else if ("waitMs" in step) {
        await page.waitForTimeout(step.waitMs); log(`${idx} waitMs ${step.waitMs}`);
      } else if ("expect" in step) {
        await runExpect(step, page, ec, idx, ctx); log(`${idx} expect`);
      } else if ("loop" in step) {
        for (let i = 0; i < step.loop; i++) {
          ec.binds[step.as] = i + 1;
          await executeSteps(step.do, ec);
        }
        delete ec.binds[step.as];
      } else if ("js" in step) {
        // eslint-disable-next-line no-new-func
        await new Function("page", "ctx", `return (async () => { ${step.js} })();`)(page, ctx);
        log(`${idx} js (escape hatch)`);
      } else {
        throw new Error(`unknown step type at index ${idx}: ${JSON.stringify(step).slice(0, 80)}`);
      }
    } catch (err: any) {
      ec.errors.push({ stepIndex: idx, step, error: err.message });
      console.error(`[runner] step ${idx} ERROR: ${err.message}`);
      throw err; // halt-on-error
    }
  }
}

// ── Step handlers ──────────────────────────────────────────────────────────

// EXTENSION POINT: this switch covers click-and-keyboard games. Other genres
// legitimately need more — `mouseDelta` for pointer-lock FPS, `wheel` for
// zoom, `keyDown`/`keyUp` for held-key inputs, gamepad, touch. Add what your
// game needs here and document the new keys in journey-schema.md.
async function runPerform(step: any, page: Page) {
  const t = step.perform;
  const args = step.args ?? {};
  if (t === "keyPress") await page.keyboard.press(args.key);
  else if (t === "click") await page.locator(step.selector ?? args.selector).click();
  else if (t === "rightClick") {
    if (step.target && typeof step.target === "object" && "x" in step.target) await page.mouse.click(step.target.x, step.target.y, { button: "right" });
    else if (step.selector) await page.locator(step.selector).click({ button: "right" });
    else if (typeof args.x === "number") await page.mouse.click(args.x, args.y, { button: "right" });
    else throw new Error("rightClick: needs target {x,y} or selector or args.x/y");
  }
  else if (t === "mouseMove") await page.mouse.move(args.x, args.y);
  else if (t === "drag") {
    await page.mouse.move(step.from.x, step.from.y);
    await page.mouse.down();
    await page.mouse.move(step.to.x, step.to.y);
    await page.mouse.up();
  }
  else throw new Error(`unknown perform type: ${t}`);
}

// EXTENSION POINT: capture `at:` kinds. The set below covers static-frame
// evidence + console + DOM + events. Other genres need more — regional
// screenshots for iso/3D views, frame strips for animation review, audio
// events, perf traces. Add new kinds here and document in journey-schema.md.
async function runCapture(step: any, page: Page, ec: ExecCtx, tabName: string, idx: number, ctx: AdapterContext) {
  const moment = step.capture;
  const at: string[] = step.at ?? ["state", "screenshot"];
  const m: any = { name: moment, stepIndex: idx, at, tab: tabName, capturedAt: Date.now() - ec.startTime };

  for (const kind of at) {
    if (kind === "state") {
      const probeName = step.probe ?? "snapshot";
      const fn = (adapter.probe as any)[probeName];
      if (!fn) { await fileCapabilityGap(ec, probeName, "probe"); throw new Error(`adapter.probe.${probeName} not implemented`); }
      m.state = await fn(page, step.args ?? {}, ctx);
    } else if (kind === "screenshot") {
      const file = path.join(ec.paths.screenshotsDir, `${moment}.png`);
      await page.screenshot({ path: file });
      m.screenshot = `screenshots/${moment}.png`;
    } else if (kind === "hud") {
      const sel = (adapter as any).hudSelector;
      if (sel) {
        const file = path.join(ec.paths.screenshotsDir, `${moment}-hud.png`);
        try { await page.locator(sel).screenshot({ path: file }); m.hud = `screenshots/${moment}-hud.png`; }
        catch { m.hud = null; }
      }
    } else if (kind === "dom") {
      // Current Playwright exposes ARIA capture on Page; the former
      // page.accessibility.snapshot() API no longer type-checks.
      const snap = await page.ariaSnapshot({ mode: "ai" });
      const file = path.join(ec.paths.domDir, `${moment}.json`);
      fs.writeFileSync(file, JSON.stringify({ format: "aria-yaml", snapshot: snap }, null, 2));
      m.dom = `dom/${moment}.json`;
    } else if (kind === "console") {
      const buf = ec.consoleBuffers[tabName] ?? [];
      const file = path.join(ec.paths.consoleDir, `${moment}.log`);
      fs.writeFileSync(file, buf.join("\n"));
      m.console = `console/${moment}.log`;
      ec.consoleBuffers[tabName] = []; // drain
    } else if (kind === "events") {
      const channel = step.event ?? "default";
      const handle = ec.eventHandles[`${tabName}:${channel}`];
      if (!handle) throw new Error(`capture ${moment}: subscribeEvent ${channel} must run before the action that emits it`);
      m.events = [...(handle.seen ?? []), ...(await adapter.events.drain(page, handle))];
      handle.seen = [];
    } else if (kind === "timing") {
      m.timing = { capturedAtMsFromStart: Date.now() - ec.startTime };
    }
  }

  ec.moments.push(m);
}

async function runWaitForEvent(step: any, page: Page, ec: ExecCtx, ctx: AdapterContext) {
  const channel = step.waitForEvent;
  const filter = step.filter ?? {};
  const timeout = step.timeout ?? 5000;
  const handleKey = `${ctx.tab}:${channel}`;
  if (!ec.eventHandles[handleKey]) throw new Error(`waitForEvent ${channel}: subscribeEvent must run before the action that emits it`);
  const wantNth = Number(filter.nth ?? 1);
  const seen: any[] = [];
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const drained = await adapter.events.drain(page, ec.eventHandles[handleKey]);
    const events = drained.filter((event: any) => Object.entries(filter).every(([key, value]) => {
      return key === "nth" || event?.[key] === value;
    }));
    seen.push(...events);
    if (seen.length >= wantNth) {
      ec.eventHandles[handleKey].seen = [
        ...(ec.eventHandles[handleKey].seen ?? []),
        ...seen,
      ];
      return;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`waitForEvent ${channel} timeout after ${timeout}ms (saw ${seen.length}/${wantNth})`);
}

async function runSubscribeEvent(step: any, page: Page, ec: ExecCtx, ctx: AdapterContext) {
  const channel = step.subscribeEvent;
  const filter = step.filter ?? {};
  const handleKey = `${ctx.tab}:${channel}`;
  if (ec.eventHandles[handleKey]) throw new Error(`subscribeEvent ${channel}: channel already subscribed for tab ${ctx.tab}`);
  ec.eventHandles[handleKey] = await adapter.events.subscribe(page, channel, filter);
}

async function runWaitForState(step: any, page: Page, ec: ExecCtx, ctx: AdapterContext) {
  const probeName = step.waitForState.probe ?? "snapshot";
  const predicate = step.waitForState.predicate;
  const timeout = step.timeout ?? 5000;
  const fn = (adapter.probe as any)[probeName];
  if (!fn) { await fileCapabilityGap(ec, probeName, "probe"); throw new Error(`adapter.probe.${probeName} not implemented`); }
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await fn(page, {}, ctx);
    try { if (evalPredicate(predicate, { state, ...ec.binds })) return; } catch {}
    await page.waitForTimeout(150);
  }
  throw new Error(`waitForState timeout after ${timeout}ms: ${predicate}`);
}

async function runExpect(step: any, page: Page, ec: ExecCtx, idx: number, ctx: AdapterContext) {
  for (const e of step.expect) {
    let value: any;
    let source: string;
    if (e.probe) {
      const fn = (adapter.probe as any)[e.probe];
      if (!fn) { await fileCapabilityGap(ec, e.probe, "probe"); throw new Error(`expect: adapter.probe.${e.probe} not implemented`); }
      value = await fn(page, e.args ?? {}, ctx);
      source = `probe:${e.probe}`;
    } else if (e.capture) {
      const m = ec.moments.find(x => x.name === e.capture);
      if (!m) throw new Error(`expect: no captured moment named ${e.capture}`);
      value = m.state ?? m;
      source = `capture:${e.capture}`;
    } else throw new Error(`expect entry needs probe: or capture:`);

    const passed = evalPredicate(e.predicate, { state: value, ...ec.binds });
    ec.expects.push({ stepIndex: idx, predicate: e.predicate, source, result: passed ? "pass" : "fail", actual: value });
    if (!passed) throw new Error(`expect failed at step ${idx}: ${e.predicate}`);
  }
}

async function fileCapabilityGap(ec: ExecCtx, name: string, ns: "arrange" | "probe") {
  const id = `capability-gap-${ns}-${name}-${uid()}`;
  const ticket = {
    id,
    category: "capability-gap",
    severity: "blocking",
    domain: "qa-runner",
    filedBy: ec.runnerId,
    filedAt: new Date().toISOString(),
    title: `adapter.${ns}.${name} not implemented`,
    summary: `Journey requested adapter.${ns}.${name} but the project's adapter doesn't expose it.`,
    needed: [`adapter.${ns}.${name}(page, args, ctx)`],
    blocking: true,
    proposedFixArea: "qa/adapter.ts",
  };
  const file = path.join(ec.ticketsDir, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(ticket, null, 2));
  ec.ticketsFiled.push(file);
}

main().catch(err => { console.error(`[runner] uncaught: ${err.message}`); process.exit(1); });

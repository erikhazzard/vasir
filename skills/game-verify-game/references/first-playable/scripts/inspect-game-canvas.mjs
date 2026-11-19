#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    url: "http://127.0.0.1:5173",
    out: "artifacts/browser-surface-check",
    selector: "canvas",
    mobile: false,
    frames: 45,
    inputFrames: 24,
    key: null,
    click: null,
    dragSelector: null,
    dragDx: 0,
    dragDy: -90,
    diagnostics:
      "window.__THREE_GAME_DIAGNOSTICS__ ?? window.__GAME_DIAGNOSTICS__ ?? null",
    requireInputChange: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--url") args.url = argv[++index];
    else if (value === "--out") args.out = argv[++index];
    else if (value === "--selector") args.selector = argv[++index];
    else if (value === "--mobile") args.mobile = true;
    else if (value === "--frames") args.frames = Number(argv[++index]);
    else if (value === "--input-frames") args.inputFrames = Number(argv[++index]);
    else if (value === "--key") args.key = argv[++index];
    else if (value === "--click") args.click = argv[++index];
    else if (value === "--drag-selector") args.dragSelector = argv[++index];
    else if (value === "--drag-dx") args.dragDx = Number(argv[++index]);
    else if (value === "--drag-dy") args.dragDy = Number(argv[++index]);
    else if (value === "--diagnostics") args.diagnostics = argv[++index];
    else if (value === "--require-input-change") args.requireInputChange = true;
    else if (value === "-h" || value === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: inspect-game-canvas.mjs [options]

Options:
  --url URL                    Browser target. Default http://127.0.0.1:5173
  --out DIR                    Artifact directory. Default artifacts/browser-surface-check
  --selector SELECTOR          Canvas selector. Default canvas
  --mobile                     Use a mobile viewport and touch-capable context
  --frames N                   Animation frames to wait before sampling. Default 45
  --key CODE                   Press and hold a keyboard code, for example KeyW
  --click SELECTOR             Click a UI/control selector
  --drag-selector SELECTOR     Drag from the center of a control selector
  --drag-dx N                  Drag x delta in CSS pixels. Default 0
  --drag-dy N                  Drag y delta in CSS pixels. Default -90
  --input-frames N             Frames to hold key/drag before release. Default 24
  --diagnostics JS             JS expression copied before/after input
  --require-input-change       Exit nonzero if diagnostics do not change
`);
}

async function loadChromium() {
  try {
    const playwrightTest = await import("@playwright/test");
    return playwrightTest.chromium;
  } catch {
    // Continue to the plain Playwright package fallback.
  }

  try {
    const playwright = await import("playwright");
    return playwright.chromium;
  } catch {
    throw new Error(
      "Playwright is required. Install @playwright/test or playwright in the target project."
    );
  }
}

async function waitFrames(page, frameCount) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let seen = 0;
        function step() {
          seen += 1;
          if (seen >= count) resolve();
          else requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }),
    frameCount
  );
}

async function readDiagnostics(page, expression) {
  return page.evaluate((source) => {
    try {
      return Function(`"use strict"; return (${source});`)();
    } catch (error) {
      return { error: String(error?.message ?? error) };
    }
  }, expression);
}

async function sampleCanvas(page, selector) {
  return page.evaluate(async (canvasSelector) => {
    function summarizePixels(data, pixelCount) {
      let min = 255;
      let max = 0;
      let alphaSamples = 0;
      let samples = 0;
      const buckets = new Set();
      const stride = Math.max(1, Math.floor(pixelCount / 4096));

      for (let pixel = 0; pixel < pixelCount; pixel += stride) {
        const offset = pixel * 4;
        const r = data[offset] ?? 0;
        const g = data[offset + 1] ?? 0;
        const b = data[offset + 2] ?? 0;
        const a = data[offset + 3] ?? 0;
        min = Math.min(min, r, g, b);
        max = Math.max(max, r, g, b);
        if (a > 0) alphaSamples += 1;
        buckets.add(`${r >> 4},${g >> 4},${b >> 4},${a >> 6}`);
        samples += 1;
      }

      const variance = max - min;
      return {
        ok: alphaSamples > 16 && (variance > 8 || buckets.size > 3),
        variance,
        colorBuckets: buckets.size,
        alphaSamples,
        samples
      };
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = document.querySelector(canvasSelector);
    if (!canvas) {
      return { ok: false, reason: "canvas-not-found", selector: canvasSelector };
    }

    const rect = canvas.getBoundingClientRect();
    const cssRect = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };

    if (rect.width < 32 || rect.height < 32) {
      return { ok: false, reason: "canvas-too-small", selector: canvasSelector, cssRect };
    }

    const width = canvas.width || Math.floor(rect.width);
    const height = canvas.height || Math.floor(rect.height);
    if (width < 32 || height < 32) {
      return {
        ok: false,
        reason: "drawing-buffer-too-small",
        selector: canvasSelector,
        cssRect,
        drawingBuffer: { width, height }
      };
    }

    try {
      const context2d = canvas.getContext("2d");
      if (context2d) {
        const imageData = context2d.getImageData(0, 0, width, height);
        return {
          reason: "2d-readback",
          selector: canvasSelector,
          cssRect,
          drawingBuffer: { width, height },
          ...summarizePixels(imageData.data, width * height)
        };
      }
    } catch {
      // Try WebGL readback below.
    }

    try {
      const gl =
        canvas.getContext("webgl2", { preserveDrawingBuffer: true }) ||
        canvas.getContext("webgl", { preserveDrawingBuffer: true }) ||
        canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });

      if (!gl || !gl.readPixels) {
        return {
          ok: false,
          reason: "no-readable-canvas-context",
          selector: canvasSelector,
          cssRect,
          drawingBuffer: { width, height }
        };
      }

      const data = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return {
        reason: "webgl-readpixels",
        selector: canvasSelector,
        cssRect,
        drawingBuffer: { width, height },
        ...summarizePixels(data, width * height)
      };
    } catch (error) {
      return {
        ok: false,
        reason: "canvas-readback-failed",
        error: String(error?.message ?? error),
        selector: canvasSelector,
        cssRect,
        drawingBuffer: { width, height }
      };
    }
  }, selector);
}

async function runInputProbe(page, args) {
  if (!args.key && !args.click && !args.dragSelector) {
    return { attempted: false };
  }

  const before = await readDiagnostics(page, args.diagnostics);

  if (args.click) {
    await page.locator(args.click).click();
  }

  if (args.dragSelector) {
    const box = await page.locator(args.dragSelector).boundingBox();
    if (!box) {
      return {
        attempted: true,
        ok: false,
        reason: "drag-selector-not-found",
        selector: args.dragSelector,
        before,
        after: before,
        changed: false
      };
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + args.dragDx, startY + args.dragDy, { steps: 8 });
    await waitFrames(page, args.inputFrames);
    await page.mouse.up();
  }

  if (args.key) {
    await page.keyboard.down(args.key);
    await waitFrames(page, args.inputFrames);
    await page.keyboard.up(args.key);
  }

  await waitFrames(page, 8);
  const after = await readDiagnostics(page, args.diagnostics);
  const changed = JSON.stringify(before) !== JSON.stringify(after);

  return {
    attempted: true,
    ok: !args.requireInputChange || changed,
    before,
    after,
    changed
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const chromium = await loadChromium();
  await fs.mkdir(args.out, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext(
    args.mobile
      ? {
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true
        }
      : {
          viewport: { width: 1280, height: 720 },
          deviceScaleFactor: 1
        }
  );
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(args.url, { waitUntil: "domcontentloaded" });
  await page.locator(args.selector).first().waitFor({ state: "visible", timeout: 10000 });
  await waitFrames(page, args.frames);

  const canvas = await sampleCanvas(page, args.selector);
  const input = await runInputProbe(page, args);
  const screenshotPath = path.join(args.out, args.mobile ? "mobile.png" : "desktop.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const report = {
    url: args.url,
    mode: args.mobile ? "mobile" : "desktop",
    selector: args.selector,
    screenshotPath,
    canvas,
    input,
    consoleErrors,
    pageErrors
  };

  const reportPath = path.join(args.out, args.mobile ? "mobile.json" : "desktop.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await browser.close();

  console.log(JSON.stringify(report, null, 2));

  const failed =
    !canvas.ok ||
    consoleErrors.length > 0 ||
    pageErrors.length > 0 ||
    (args.requireInputChange && input.attempted && !input.changed);

  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

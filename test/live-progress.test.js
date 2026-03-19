import test from "node:test";
import assert from "node:assert/strict";

import { createLiveProgress } from "../scripts/ui/live-progress.js";

function createFakeTtyStream() {
  const writes = [];

  return {
    isTTY: true,
    write(chunk) {
      writes.push(chunk);
    },
    readOutput() {
      return writes.join("");
    }
  };
}

test("live progress animates spinner frames and stops with a final line", () => {
  const stream = createFakeTtyStream();
  let intervalHandler = null;
  let clearedHandle = null;

  const progress = createLiveProgress({
    stream,
    spinner: {
      interval: 80,
      frames: ["a", "b"]
    },
    setIntervalImplementation(handler) {
      intervalHandler = handler;
      return 17;
    },
    clearIntervalImplementation(handle) {
      clearedHandle = handle;
    }
  });

  assert.equal(progress.start("warming up"), true);
  assert.match(stream.readOutput(), /a warming up/);

  progress.update("running");
  assert.match(stream.readOutput(), /a running/);

  intervalHandler();
  assert.match(stream.readOutput(), /b running/);

  progress.stop("done");
  assert.equal(clearedHandle, 17);
  assert.match(stream.readOutput(), /done\n/);
});

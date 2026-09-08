import assert from "node:assert/strict";
import test from "node:test";
import { runCommandLine } from "../cli/command-runner.js";

test("benchmark help exposes the optional full audit", async () => {
  const stdout = [];
  const code = await runCommandLine(["node", "vasir", "--help"], {
    stdoutWriter: text => stdout.push(text),
    stderrWriter: () => assert.fail("Help must not write errors"),
    spawnSyncImplementation: () => assert.fail("Help must not launch processes")
  });
  assert.equal(code, 0);
  assert.match(stdout.join(""), /benchmark publish \[--dry-run\] \[--full-audit\]/);
  assert.match(stdout.join(""), /Unchanged verified assets are reused/);
});

for (const command of [["status"], ["update"], ["benchmark"], ["benchmark", "unknown"]]) {
  test(`full audit rejects unrelated command ${command.join(" ")}`, async () => {
    const stdout = [];
    const stderr = [];
    const code = await runCommandLine(["node", "vasir", ...command, "--full-audit", "--json"], {
      stdoutWriter: text => stdout.push(text),
      stderrWriter: text => stderr.push(text),
      spawnSyncImplementation: () => assert.fail("Invalid flags must fail before launching processes")
    });
    assert.notEqual(code, 0);
    const result = JSON.parse(stdout.join("") || stderr.join(""));
    assert.equal(result.code, "INVALID_COMMAND_FLAG");
    assert.match(result.message, /only supported by `vasir benchmark publish`/);
  });
}

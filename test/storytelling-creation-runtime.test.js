import assert from "node:assert/strict";
import test from "node:test";
import { creationIsolationArguments } from "../cli/eval/storytelling-creation-runtime.js";

test("new creation isolation removes host skill discovery without disabling progressive creator reads", () => {
  const args = creationIsolationArguments("creator");
  assert.deepEqual(args, ["--enable", "skip_host_skill_discovery", "--disable", "skill_search", "--config", "project_doc_max_bytes=0"]);
  assert.ok(!args.includes("shell_tool"));
  assert.ok(!args.some(arg => arg.startsWith("developer_instructions=")));
});

test("both judge profiles use the same explicit tool and instruction isolation", () => {
  const args = creationIsolationArguments("judge");
  for (const value of ["skip_host_skill_discovery", "skill_search", "shell_tool", "apps", 'developer_instructions=""', "project_doc_max_bytes=0"]) assert.ok(args.includes(value));
  assert.throws(() => creationIsolationArguments("informed"), /Unknown/);
});

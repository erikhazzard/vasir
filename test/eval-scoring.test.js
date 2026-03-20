import test from "node:test";
import assert from "node:assert/strict";

import { scoreCaseOutput } from "../eval/scoring.js";

const DETERMINISTIC_CASE = {
  requiredSubstrings: ["seed", "rng", "clock"],
  forbiddenSubstrings: ["Math.random", "Date.now"]
};

test("negated forbidden mentions do not count as scorer hits", () => {
  const score = scoreCaseOutput({
    caseDefinition: DETERMINISTIC_CASE,
    outputText: `Use a seed-driven rng and injected clock.
Randomness is explicit: no Math.random().
Time comes from clock.now(), never Date.now().`
  });

  assert.equal(score.passed, true);
  assert.deepEqual(score.presentForbiddenSubstrings, []);
});

test("single negation can cover multiple forbidden mentions on one line", () => {
  const score = scoreCaseOutput({
    caseDefinition: DETERMINISTIC_CASE,
    outputText: `Use a seed-driven rng and injected clock.
The implementation must not call Math.random() or Date.now() internally.`
  });

  assert.equal(score.passed, true);
  assert.deepEqual(score.presentForbiddenSubstrings, []);
});

test("replacement guidance around forbidden mentions does not count as a hit", () => {
  const score = scoreCaseOutput({
    caseDefinition: {
      requiredSubstrings: ["seed", "clock", "replay"],
      forbiddenSubstrings: ["Math.random", "Date.now", "setTimeout"]
    },
    outputText: `Use a seed and injected clock so the failure can replay.
Replace any implicit Math.random() in the combat path with a seeded rng.
Cooldown logic must not depend on Date.now().
If the test uses setTimeout for cooldown resolution, replace it with explicit ticks.`
  });

  assert.equal(score.passed, true);
  assert.deepEqual(score.presentForbiddenSubstrings, []);
});

test("actual forbidden usage still counts as a scorer hit", () => {
  const score = scoreCaseOutput({
    caseDefinition: DETERMINISTIC_CASE,
    outputText: `Use a seed-driven rng and injected clock.
const roll = Math.random();
const now = Date.now();`
  });

  assert.equal(score.passed, false);
  assert.deepEqual(score.presentForbiddenSubstrings, ["Math.random", "Date.now"]);
});

test("cases with no measured checks do not score as perfect passes", () => {
  const score = scoreCaseOutput({
    caseDefinition: {
      requiredSubstrings: [],
      forbiddenSubstrings: []
    },
    outputText: "Anything at all."
  });

  assert.equal(score.passed, false);
  assert.equal(score.score, 0);
  assert.equal(score.measuredCheckCount, 0);
});

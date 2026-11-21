---
name: game-verify-game
description: Judge a game that already runs, or footage of one, from play and evidence. Use to run end-to-end browser-game QA and return one release verdict, only when game QA or complete verification of a game feature is explicitly asked for; to audit whether a first-time player understands a first playable and wants another try, before claiming initialization, a vertical slice, publish readiness or handoff; or, when asked, to turn supplied gameplay footage into evidence-cited analysis or a reconstruction spec. First-playable and footage analysis only judge; QA can also set up its test rig and coordinate fixes and re-verification. Not for tooling, build scripts, infrastructure or non-game code, and not for design critique with no build or footage.
license: MIT
metadata:
  gc-owner: "erik"
  gc-capability: "game-design"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-status: "draft"
  gc-tags: "game-qa, playtest, first-playable, comprehension, gameplay-analysis"
  gc-source: "https://github.com/erikhazzard/vasir-archive/tree/d04347b0d515d4c3c46b5e012e2c334fdabf83bd/.agents/skills"
  gc-source-skills: "game__qa, game-proof__auditing-first-playable-comprehension, game-research__breaking-down-gameplay-video"
  gc-source-revision: "d04347b0d515d4c3c46b5e012e2c334fdabf83bd"
---

# Verify a Game

Judge a game that already runs, or footage of one. Each of these three procedures says what evidence it needs and returns a verdict. First-playable and gameplay video only judge: what they find goes back to `game-build-game`. QA is a pipeline of roles. It can set up its own test rig, and its owner role coordinates fixes and re-verification within what the user authorized.

## Pick the procedure

| You are asked to | Read | What it gives you |
| --- | --- | --- |
| Run game QA, or completely verify a game feature. Only when that is asked for in so many words | [QA](references/qa/qa.md) (5K, plus fifteen role, schema and runner files) | One release verdict from a pipeline of separate roles, so the engineer who built a feature is not the one who passes it. Read its laws and exactly one role file. Game features only. |
| Check a first playable before claiming initialization, a vertical slice, publish readiness or final handoff | [First-playable comprehension](references/first-playable/first-playable.md) (18K, plus one capture script) | A verdict on whether a new player understands the toy, acts, sees the game answer and wants another try, judged from a fresh capture of the current build: 390 by 844 portrait by default, or the size the game is actually played in. |
| Analyze gameplay footage the user supplies. Only when asked | [Gameplay video](references/gameplay-video/gameplay-video.md) (15K, plus scripts, templates and references) | An evidence ledger of what the footage shows, which hidden rules stay compatible with it and where it stops answering. A reconstruction spec only if that is asked for. |

## Telling them apart

- **QA and first-playable.** QA asks whether a feature works and is ready to release, and runs only on request. First-playable asks whether a stranger gets it and wants more, and runs before a completion claim.
- **Footage and a running build.** The video procedure owns claims grounded in footage. It is not release QA and it does not critique a design it cannot see.
- **A design with nothing to run.** Critique with no build and no footage is `game-review-design-coherence`.

## What these procedures assume

- QA is written for browser games. First-playable treats a game as mobile portrait, captured at 390 by 844, unless its brief or project says it is a desktop, landscape, console or VR game; that game is captured at the size it is played in.
- Each ships scripts beside it: a TypeScript runner and adapter template for QA, a canvas inspection script for first-playable, Python media tools for video. If the environment cannot run them, report that. Do not judge from memory in their place.
- A verdict on a runnable build is about the current build: evidence captured before the last change does not count. Footage is judged as the record it is, whenever it was captured.

## What holds for every procedure

- Read the procedure the request needs and no other, unless it sends you to one. The sizes above are what each costs to load.
- A path to a file that ships with a procedure is relative to that procedure's own file. A path the procedure tells you to read, run or write in the project, such as `docs/...`, `tmp/...` or a source file, is relative to the project you are working in, never to this package.
- The destination project's instructions and the user's existing scope come first. A procedure adds judgement. It grants no authority, and it adds no approval step the user did not ask for.
- Each procedure states what it must deliver. Deliver that, and say which procedure you used.

## Other skills

Use these where they are installed. If one is absent, carry on with this package's procedures and say which judgement was not available.

- `game-build-game` to repair what a verdict finds.
- `game-review-design-coherence` when the problem is the design and not the build.
- `plan-manage-work-spec` when a verdict is the proof a substantial piece of work was waiting on.

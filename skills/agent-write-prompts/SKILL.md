---
name: agent-write-prompts
description: "Write, analyze or repair the instructions agents run on. Use to analyze a prompt or prompt chain for failure modes without rewriting it; to rewrite a prompt from such an analysis; to reconstruct a reusable prompt from output that worked; to write an expert persona or the framing of a system prompt; or to write, audit or decline a folder AGENTS.md as a steering map for one subtree. Not for designing, debugging or analyzing a skill, which is `agent-create-skill`, and not for a repository's root AGENTS file."
license: MIT
metadata:
  gc-owner: "erik"
  gc-capability: "ai-workflows"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-status: "draft"
  gc-tags: "prompts, personas, agents-md"
  gc-source: "https://github.com/erikhazzard/vasir-archive/tree/d04347b0d515d4c3c46b5e012e2c334fdabf83bd/.agents/skills"
  gc-source-skills: "prompt__create-analysis, prompt__improving--rewriting, prompt__reverse-engineering, prompt__writing-persona, agents__creating-folder-agents"
  gc-source-revision: "d04347b0d515d4c3c46b5e012e2c334fdabf83bd"
---

# Write Prompts

Write and repair the instructions agents run on: prompts, personas, and the AGENTS.md of one folder. Designing, debugging or analyzing a skill is `agent-create-skill`, not this package.

## Pick the procedure

| You are asked to | Read | What it gives you |
| --- | --- | --- |
| Review, diagnose or improve a prompt or prompt chain | [Prompt analysis](references/prompt-analysis.md) (16K) | Six phases ending in prioritized findings and design decisions. Analysis only. It never rewrites. |
| Produce the improved prompt | [Prompt rewrite](references/prompt-rewrite.md) (1K) | The rewritten prompt, built from an analysis. If there is no analysis in the conversation yet, run prompt analysis first. |
| Recreate the prompt behind output that worked | [Prompt reverse-engineering](references/prompt-reverse-engineering.md) (8K) | A reusable system prompt drawn from the style, constraints and decisions visible in the output. |
| Write or rewrite an expert persona, the framing of a system prompt, or a persona inside a skill | [Persona writing](references/persona-writing.md) (10K) | A persona built as a character sheet: judgement, competing lenses, a stake, and authority that is calibrated. |
| Give a folder its own AGENTS.md, or repair or audit one | [Folder AGENTS.md](references/folder-agents.md) (8K) | A steering map for one subtree, or a reasoned decline when the folder does not need one. |

## Telling them apart

- **Analysis and rewrite.** They are two procedures on purpose. The analysis is the handoff the rewrite builds on.
- **A prompt and a skill.** This package analyzes prompts. To analyze or change a skill, use `agent-create-skill`, which applies the same method to one.
- **Folder AGENTS.md and the root one.** This procedure owns local steering for one subtree. It leaves repository-wide rules in the root file and does not write that file.

## Using more than one

- To improve a prompt: prompt analysis, then prompt rewrite.
- To capture a prompt you do not have: reverse-engineering. Its output is the prompt and nothing else. Analyze it afterwards only when critique is asked for or a specific problem is left unresolved.

## What these procedures assume

- Analysis procedures name only sources they are confident exist. Carry that rule into anything built from them.

## What holds for every procedure

- Read the procedure the request needs and no other, unless it sends you to one. The sizes above are what each costs to load.
- A path to a file that ships with a procedure is relative to that procedure's own file. A path the procedure tells you to read, run or write in the project, such as `docs/...`, `tmp/...` or a source file, is relative to the project you are working in, never to this package.
- The destination project's instructions and the user's existing scope come first. A procedure adds judgement. It grants no authority, and it adds no approval step the user did not ask for.
- Each procedure states what it must deliver. Deliver that, and say which procedure you used.

## Other skills

Use these where they are installed. If one is absent, carry on with this package's procedures and say which judgement was not available.

- `agent-create-skill` to design, rewrite, audit or debug a skill.
- `writing-style-prose` when the instruction is prose a person will read.

# Vasir Skills

Skills for coding agents, and the root operating contract they work under.

| Path | What it is |
| --- | --- |
| [skills/](skills/) | One folder per skill. Each has a `SKILL.md` and the references, templates and scripts it needs. |
| [templates/agents/](templates/agents/) | The root contract, [AGENTS.md](templates/agents/AGENTS.md); a one-line [CLAUDE.md](templates/agents/CLAUDE.md) that loads it in Claude sessions; and snippets for backend, frontend and iOS repositories. |
| [MIGRATING.md](MIGRATING.md) | What each skill of the earlier Vasir repository is called here. |

## Use a skill

Copy its folder into your project's `.agents/skills/`. There is no installer and no registry.

A skill names another skill in backticks, and a procedure inside a package in brackets after it: `game-design-game` (art-direction). Each says what to do when a skill it names is not installed.

Several packages hold more than one procedure. Their `SKILL.md` is short and says which file under `references/` to read for which request.

## Use the root contract

1. Copy `templates/agents/AGENTS.md` and `CLAUDE.md` to the root of your repository.
2. Replace the Purpose block at the top.
3. Record what is true of your project and not obvious in §2.
4. Take the snippet for your stack from `templates/agents/snippets/` and put its blocks into the marker blocks of the same names.
5. Read §7. It names the models to use for each kind of work, so check they are still current. The lines under "Codex invocation mechanics (this machine)" describe one machine's shell and run delegated agents without a sandbox. Change or remove them for yours.

Skills cite the contract's sections by number, so keep the numbering.

## Changes

This repository is a published copy. The skills are written, and measured against the same task done without them, in a separate library, then copied here. Change them there.

MIT. See [LICENSE](LICENSE).

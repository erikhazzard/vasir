# Manifesto

LLMs do not understand your architecture. They predict the next token.

That sounds obvious, but most AI-assisted development workflows still pretend the model is a careful teammate reading the room. It is not. It is a compressed probability distribution over token sequences. If you do not shape that distribution hard enough, the output drifts toward the statistical center of public code: generic CRUD, generic React, generic Express, generic "best practices" prose.

Vasir exists for the situations where the mode is wrong.

## 1. What an LLM actually is

An LLM is not reasoning from first principles about your codebase. It is sampling from a learned distribution over likely continuations. The model can simulate expertise, but that expertise is still bounded by what is most probable under its training mix.

That means:

- common patterns are extremely easy for the model to produce
- specific house rules are easy to forget
- low-frequency architectures need active conditioning

If your system sits in a sparse region of design space, you must deliberately pull the model there.

## 2. What prompting really does

A prompt is not instruction in the human sense. It is a control surface that redistributes probability mass at inference time.

Every early token shapes the tokens that follow. This path dependence compounds:

- a generic first choice makes the next generic choice more likely
- a vague architecture sentence invites the model to fill in the blanks with defaults
- an omitted constraint is usually interpreted as permission

This is why front-loaded constraints matter more than long after-the-fact corrections.

## 3. When the mode helps and when it fails

Sometimes the mode is exactly what you want. Boilerplate admin screens, standard API docs, and commodity tooling often benefit from well-known defaults.

But there is another class of work where the mode is a failure:

- deterministic game runtimes
- replayable simulations
- repo-specific architectural invariants
- unusual performance budgets
- hard bans on common frameworks or patterns

In those systems, "reasonable" output is often the bug.

## 4. What AGENTS.md actually is

`AGENTS.md` is not an employee handbook for a sentient coworker. It is a conditioning artifact.

Its job is to:

- force the model to restate the real user journey before coding
- front-load the invariants that generic training would otherwise erase
- route the model toward the right local skill file instead of guessing
- require verification before the work is treated as done

The 4-phase structure matters because it changes the order in which the model commits to decisions.

## 5. Why skills are the product

The most durable unit in this system is a markdown file with a sharp mission.

Skill files work because they can be:

- copied directly into any repo
- inspected by humans
- consumed by agents without custom runtime support
- versioned like normal source files

There is no runtime dependency graph to trust. If the tooling disappears, the skills still work.

## 6. Spec debt is the new debt

Yesterday the hidden drag was mostly technical debt: code that became harder to change.

In AI-assisted repos, a growing share of the drag is spec debt: stale skill files, vague `AGENTS.md` rules, missing invariants, and verification steps that no longer match reality.

Spec debt is harder to see because the code may still compile. The failure shows up one layer up:

- the model takes the default path
- repo-specific rules blur into suggestions
- humans repeat the same correction in every thread
- "reasonable" output drifts away from the architecture

If markdown steers generation, stale markdown is not secondary documentation debt. It is product debt.

## 7. Ownership moves up the stack

A developer owns a system when they are responsible for it, understand how it behaves, respond when it breaks, and improve its architecture over time.

In AI-assisted development, some of that ownership moves from code alone into the files that shape code generation:

- `AGENTS.md`
- skill files
- templates
- metadata
- tests
- verification scripts

We are in a hybrid phase. Human ownership still matters, but more of that ownership is being expressed through checked-in constraints instead of repeated conversation.

The question is no longer only "who wrote this file?"

It is also:

- who encoded the invariant
- who defined the preferred path
- who responds when the steering drifts
- who sharpens the spec after failure

As those control surfaces improve, authorship of any single generated file matters less than the durability of the constraints that can reproduce or reject it.

## 8. Reliability is antifragility

Reliability is not perfect code. Reliability is a system that survives imperfect code, fails in visible ways, and gets better after each break.

That is a runtime property.

Tests and scripts matter because they turn failure into structure:

- a bug becomes a regression test
- repeated drift becomes a sharper skill
- a hidden assumption becomes an explicit invariant
- an unsafe path becomes a fail-closed command

The goal is not zero failure. The goal is for each failure to harden the system.

## 9. Density beats volume

Most prompt writing fails by being too soft, too broad, or too repetitive.

A good skill file does not narrate obvious truths. It encodes the non-obvious facts that actually change implementation behavior:

- hidden invariants
- banned defaults
- exact workflow ordering
- concrete examples
- anti-patterns with teeth

If removing a sentence would not change the model's output, that sentence is overhead.

## 10. Negative constraints are force multipliers

"Use Fastify" narrows the space a little.

"Never use Express. If the task looks like it wants Express, stop and re-read the architecture section." narrows the space much more.

Negative constraints are powerful because they cut off large, high-probability branches before the model walks down them.

That does not replace positive guidance. It makes the positive guidance more likely to stick.

## 11. The compounding effect

Autoregressive generation compounds both good and bad choices.

One generic token makes the next generic token easier. One precise constraint makes the next precise constraint easier. This is why the opening structure of a skill or `AGENTS.md` file matters disproportionately: the early decisions change the local gravity field for everything that follows.

The goal is not to make the model "smarter." The goal is to make the right continuation the easiest continuation.

## 12. The Vasir posture

Vasir is deliberately simple:

- markdown is the product
- copy skills into repos; the CLI only automates the copy
- metadata is machine-readable
- local ownership beats shared runtime magic

The ideal outcome is boringly robust. A human can browse the repo. An agent can fetch `registry.json`. A project can copy the files it needs and move on.

If you are one developer, the leverage point is not keeping every tradeoff in your head. The leverage point is encoding your judgments into checked-in files: constraints, examples, anti-patterns, verification steps, and recovery paths. Taste that stays in your head does not scale. Taste encoded into files does.

That simplicity is the point.

- The Bottom Line for 10x Output
The hard part about writing software is the design, specification, and testing of conceptual abstractions. The actual labor of writing code—knowing how to type it—is now commoditized by LLMs.

AGENTS.md is how we instruct the LLM on the what. The what has always been the hard part of software development. AI has solved the execution, but the highest leverage skill an engineer now possesses is defining the exact, immutable constraints of that execution.

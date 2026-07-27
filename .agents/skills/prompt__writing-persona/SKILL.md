---
name: prompt__writing-persona
description: Writes and rewrites expert prompts and in-skill personas by encoding domain judgment, competing lenses, stakes, and calibrated authority. Use for system prompts, expert framing, or personas inside agent skills. Use prompt__create-analysis for critique without rewriting.
---

# Writing Personas That Install Expertise

Bad prompts assert quality. Good prompts install it. "You are an expert" changes almost nothing, because a label is too shallow to move how the model reasons. Condition the model into the reasoning of a *specific* expert, give it a real reason to care, and pair the resulting confidence with the honesty that keeps it accurate.

**Place in the system.** This skill owns persona and conditioning craft — for standalone prompts and for the personas embedded in agent skills. `$prompt__create-analysis` owns critique-only review of an existing prompt. `$skills__create-skill` owns skill mechanics — routing, placement, genus, and the lens reviewer-input/report hardware — and consumes this skill whenever a lens- or judgment-genus skill needs its voice built.

## Build the Persona as a Character Sheet

A role is a job title; an expert is a character sheet. "Doctor" primes nothing. "Board-certified interventional cardiologist who checks contraindications before recommending any procedure and leads with the practical call before the reasoning" primes a specific reasoning path.

Build from five elements — each a lever on *how* the model reasons, not decoration:

1. **Credential / role** — specific, not generic: "staff engineer in distributed systems," not "engineer."
2. **Specialization** — the narrow subdomain where the judgment lives: "race conditions and failure modes under load."
3. **Methodology** — the order they work in: "correctness first, then performance, then style."
4. **Behavioral heuristic** — what they always check, prioritize, or refuse: "flags implicit assumptions and missing error handling before anything cosmetic."
5. **Taste / stance** — what makes their output feel expert rather than valid: "treats 'the happy path passes' as table stakes, not an achievement."

Build question: *what would the ideal expert for this exact task look like, down to their habits and instincts?*

**Weak:** `You are an expert software engineer. Review this code.`

**Strong:**
```
You are a staff engineer with deep experience in distributed systems at scale.
You specialize in race conditions, memory leaks, and failure modes under load.
You review methodically: correctness first, then performance, then maintainability,
and you flag implicit assumptions and missing error handling before anything cosmetic.
```

The specifics are load-bearing only when they change the output. If swapping "cardiologist" for "doctor" wouldn't change a single sentence, the persona isn't working yet — go more specific or drop it.

## One Persona, or a Lens Set?

A single persona carries one dominant quality axis. When quality depends on **competing concerns** — vision vs. scope, thoroughness vs. shipping, security vs. ergonomics — one voice averages them into mush. Split into a lens set: 3–5 named perspectives, each built as its own small character sheet, each preventing a **distinct failure** the others would miss.

- Name each lens for its concern and give it the stance that concern demands: a *vision keeper* who refuses dilution, a *user advocate* who hunts confusion, a *scope assassin* who cuts, a *skeptic* who demands evidence.
- State the composite failure: a review missing any lens fails in that lens's characteristic way. If you can't name what breaks without a lens, it's decoration — cut it.
- Lenses argue; the output does not average. The verdict names which concern won on each contested point and why — that is the value hierarchy made visible.

A lens set where every lens always agrees, or where one lens can never win, is a single persona wearing costumes.

## Give It Earned Authority

Signal competence with authority the prompt genuinely carries, never with invented history. State a **real bar** — "surface the non-obvious issues a first pass misses" — which sets the standard without inventing a past. Point at **real prior artifacts** the model can see — the actual document, codebase, or earlier analysis. Make it a **demand, not a compliment** — "bring that precision here," grounded in the bar.

Never fabricate a track record: "you've solved 47 of 50 similar tasks," "rated highly accurate by experts," "adopted without revision." Invented evidence is a fabrication, and a claimed track record tilts the model toward unearned confidence — the opposite of what careful work needs. The real target of a track-record line is the *standard*; state the standard directly.

## Give It a Genuine Stake

A specific, real stake sharpens output because it clarifies what the work is *for*. One or two sentences, tied to the actual use, positive and concrete.

- Real: "this analysis feeds a $2M product decision, so the confounding check has to be right."
- Hollow: "this is SO important, please try your absolute best!!!"

Prefer "surface what a first pass misses" over "don't screw this up." Manufactured urgency and performative emotion add nothing; a true stake does.

## Pair Confidence With Calibration

A strong persona produces a confident voice — and confidence without calibration is how you get authoritative-sounding fabrication. For any analytical work, build the honesty scaffolding into the persona:

- **Label epistemic status** — FACT / INFERENCE / ASSUMPTION / UNKNOWN — so the confident voice stays accurate about what it actually knows.
- **License uncertainty** — a calibrated "I'm unsure about X, and here's what would resolve it" outranks a confident guess.
- **Ban fake precision** — no invented numbers, scores, or citations; a real range labeled an estimate beats a fabricated exact figure.
- **Separate the call from the certainty** — state the recommendation *and* how sure you are.

A persona that is confident and calibrated is expert. A persona that is only confident is a liability.

## Personas Inside Reusable Skills

A persona in an agent skill is infrastructure, not flavor: it runs hundreds of times, unseen, on inputs its author never imagined. The five elements become the skill's skeleton — the **methodology** becomes the workflow order, the **behavioral heuristics** become the anti-patterns, the **taste** becomes the quality bar and the fixed output headings. Write them so they hold anywhere:

- Prefer standing heuristics ("always reconstruct the state machine before judging a flow") over context-bound claims; the persona must survive tasks the author never saw.
- Its confidence rules run unsupervised, so calibration scaffolding is mandatory, not optional — an in-skill voice with no epistemic labels ships overconfidence into every future run.
- The anti-fabrication rule binds doubly: an invented track record inside a skill is a fabrication distributed to every invocation.
- For independent-review auditor lenses, the voice built here pairs with the reviewer-input block, read-only tools, and report artifact owned by `$skills__create-skill`'s lens genus — build the character here, take the hardware there.

## Assemble

For a high-stakes analytical prompt, layer: **specific persona** (reasoning path) → **real bar + real context** (authority) → **genuine stake** (what it's for) → **calibration** (honesty under confidence).

```
You are a data scientist with deep experience in causal inference and A/B testing
at consumer tech. You specialize in the confounds that lead teams to wrong
conclusions — Simpson's paradox, selection effects — and you always decompose by
segment before drawing a conclusion. Lead with the call, then the reasoning.

Analyze the attached results and determine whether the lift is real or a confounding
artifact. This feeds a $2M product decision, so the segmentation has to be right.

Label each conclusion FACT / INFERENCE / ASSUMPTION, flag anything you can't
determine from the data, and state how confident you are in the final call. If the
data can't settle it, say what additional cut would.
```

Match effort to the task — over-conditioning a simple prompt is its own failure:

| Task | What to apply |
|---|---|
| Simple factual query | Nothing — ask clearly. Conditioning is noise here. |
| Complex reasoning / analysis | Full stack: persona + bar + stake + calibration. |
| Creative / generative | Persona + genuine stake; calibration matters less. |
| Code review / debugging | Persona + real bar + calibration; skip manufactured stakes. |
| Competing quality concerns | Lens set — each lens a distinct failure, verdict names what won. |
| Persona inside a reusable skill | Full stack + standing heuristics; calibration mandatory. |

## Anti-Patterns

- **Bare label** — "you are an expert X." Too shallow to change output. → Build the five-element character sheet.
- **Fabricated track record** — "you've solved 47 of 50…" Invented evidence, and it degrades calibration. → State a real bar and a demand.
- **Percentage promises** — "this framing gives 8–115% gains." Fake precision. → Explain the mechanism; promise no number.
- **Performative emotion** — "this is SO important!!!" Hollow. → One real, specific stake tied to the actual use.
- **Confidence without calibration** — a vivid persona and no honesty scaffolding. → Pair conviction with FACT/INFERENCE/ASSUMPTION and licensed uncertainty.
- **Committee mush** — a lens set that always agrees, or blends into an averaged verdict. → Each lens prevents a distinct failure; the verdict names which concern won.
- **Decorative persona** — specifics that don't change a single output sentence. → Go specific enough that swapping the role changes the answer, or cut it.

## When Applying This Skill

Assess which levers the task needs rather than layering all of them by reflex. Build the persona from the five elements — or a lens set when concerns genuinely compete — ground authority in real bars and real context, add a stake only where it fits, and include calibration for anything analytical or anything reusable. Explain *why* each choice helps so the person can do it themselves next time — teach the installs-not-asserts move, don't just hand back a prompt. Critique without a rewrite routes to `$prompt__create-analysis`; skill mechanics around the persona route to `$skills__create-skill`.

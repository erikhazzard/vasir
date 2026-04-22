---
name: explaining__creating-interactive-articles
description: Create S-tier fully offline, D3-first interactive explanations of technical concepts, inspired by Distill.pub and explorable explanations; starts new requests with a targeted five-question alignment grill
user_invocable: true
---
# Interactive Technical Explanations

Create **fully offline, web-based explanatory articles** for technical concepts. The output is prose plus figures, not a dashboard, coding tutorial, slide deck, app shell, or demo gallery. The article should help a reader build a correct mental model and predict behavior they could not predict before.

The default mode is **alignment-first, then generator-first**. Before creating, revising, auditing, or outlining an article, ask a short **alignment grill** of about five targeted questions based on the user's initial request. The questions should clarify the article itself: reader, prerequisite level, core learning target, misconception or risk, source truth, simplification boundary, and the interaction that will make the concept click. Pause for answers before doing the substantive work.

Do not turn this into a long questionnaire. Ask five questions by default, depending on the context the user sends. Ask fewer only when the user already supplied an answer, explicitly says “no questions / proceed,” or the task is a tiny mechanical edit. Never ask for information the user already gave. Each question must include a recommended default or 2-3 concrete options so the user can accept, reject, or tweak instead of inventing the answer from scratch. After the user answers, proceed generator-first: infer responsibly, state remaining assumptions briefly, and build, outline, revise, or audit without re-litigating intake.

**Reference files:**

- `references/article.md` offline HTML scaffold, D3-ready article layout, state coordination, responsive patterns, QA
- `references/visuals.md` D3 v7 visualization patterns, interaction recipes, chart choices, accessibility, validation
- `references/writing-style.md` required writing style for article prose, captions, prompts, headings, notes, and delivery summaries

## Mission Standard

An article succeeds when a reader can predict behavior they could not predict before. It is not enough for the page to be attractive, animated, or interactive.

Every artifact must satisfy these standards:

1. **Truthful model.** Claims, equations, generated data, and simulations are grounded in source material or clearly marked as simplified.
2. **Narrative progression.** Sections appear in dependency order: concrete case, visible mechanism, abstraction, application, limitation.
3. **Interaction with a job.** Each interactive element supports prediction, manipulation, comparison, inspection, linking, or reflection.
4. **Interesting defaults.** Every figure teaches before the reader touches anything.
5. **D3-first visuals.** Use D3 v7 for nontrivial charts, scales, axes, layouts, transitions, brushing, Delaunay hover, data joins, and cross-chart dispatch.
6. **Fully offline delivery.** No CDN, remote fonts, remote scripts, external image hosts, runtime API calls, or remote datasets.
7. **Accessible, robust behavior.** Captions, keyboard-accessible controls, non-color-only encodings, reduced-motion handling, responsive layout, and no console errors.
8. **Required writing style.** All prose follows `references/writing-style.md` without weakening truth, technical clarity, or figure comprehension.

## Articles, Not Dashboards

An article has an authorial path through ideas. Figures serve the path. Dashboards expose widgets to an already-informed operator.

When choosing a design, ask:

> Does this help a reader form a mental model, or does it merely expose controls and metrics?

Avoid dashboard defaults unless there is a specific explanatory rationale:

- KPI cards, metric grids, operational badges, alert colors, and status pills.
- Card-heavy layouts where every paragraph or section is boxed.
- Decorative gradient hero sections, glowing shadows, pulsing borders, or novelty animation.
- Generic blue-purple palettes unrelated to the concept.
- Emoji headers or decorative icons.
- A sandbox at the top of the article before the reader knows what to look for.
- Generic “insight,” “tip,” or “key takeaway” callout boxes.

Rationale-based exception: a card, badge, or colored region is allowed only when it represents a concept-specific object or state in the explanation. Example: small “cells” in a memory-allocation article may be card-like because memory blocks are the content. A generic “Insight” card is not enough.

## Explanations, Not Coding Tutorials

Do not show implementation code to the reader unless code itself is the concept being explained. Prefer equations, diagrams, state machines, timelines, tables, and interactive examples. Use pseudocode only when it clarifies a mechanism that prose and diagrams cannot, and keep it short.

Internal implementation code is different. The page script **should use D3** when D3 improves the figure. Do not let the reader-facing “not a coding tutorial” rule suppress internal D3 implementation.

Code policy:

- **Reader-facing allowed:** a 4-line recurrence, state transition, or algorithm sketch paired with a figure.
- **Reader-facing avoid:** framework boilerplate, D3 implementation snippets, shader code, API calls, build steps, or implementation internals.
- **Internal page scripts:** D3 v7 is the preferred tool for chart-heavy articles.
- **Exception:** if the article is specifically about programming behavior, show the smallest code fragment that creates the phenomenon, then return to explanation.

## D3 and Offline Policy

D3 v7 is the default visualization library. Use it directly. Do not wrap it in a framework. D3 owns chart DOM.

Use D3 for:

- scales, axes, bins, stacks, groups, rollups, hierarchy, force layouts, geographic projections, color scales, and interpolation;
- keyed data joins with `.join()`;
- object-constant transitions;
- `d3.dispatch` for linked views;
- `d3.brush`, `d3.drag`, and Delaunay/Voronoi hover;
- line, area, arc, pie, chord, treemap, pack, tree, partition, contour, and density generators.

Offline comes first. Never load D3 from a CDN. Inline D3 into the article when practical, or bundle `lib/d3.v7.min.js` locally and package the whole project as a zip. Use vanilla JS only for simple HTML-only interactions or when the figure genuinely does not need D3. Do not silently downgrade a chart-heavy article to weak vanilla code because a CDN is unavailable.

## Process

This is a generator with internal rigor. Do the reasoning work, but do not force the user through every intermediate step unless the project is ambiguous or the user asks for collaboration.

### Phase 0: Alignment Grill and Operating Assumptions

Classify the request:

- **Build:** create the article now.
- **Outline:** produce structure and figure specs only.
- **Prototype:** build one key section or figure.
- **Revise:** improve an existing article.
- **Audit:** evaluate an existing explainer.

Classify this internally. Do not make “what artifact do you want?” the first grill question for a normal new-article request; the point of the skill is to make the article. Default to **Build** unless the user asks for outline, prototype, revision, or audit.

Before Phase 1, run the alignment grill unless the user explicitly opts out or already supplied the needed answers. The grill is not a generic form; tailor it to the exact concept, source material, article thesis, reader risk, and likely visualization strategy in the request.

Use this five-question shape by default:

1. **Reader and prerequisite:** clarify who the article is for and what they already know. Recommend a default audience based on the request.
2. **Core learning target:** identify the one behavior, mechanism, or relationship the reader should be able to explain or predict afterward. Suggest the likely target if the request implies one.
3. **Misconception or failure mode:** ask what wrong mental model, surprising behavior, or common mistake the article should correct. Offer 2-3 plausible misconceptions when possible.
4. **Source truth and simplification boundary:** ask which sources, docs, papers, datasets, equations, or assumptions should govern the model, and what can be simplified. Recommend a grounding strategy when no source is provided.
5. **Interactive explanation strategy:** ask what the central interactive figure should let the reader manipulate, predict, compare, or inspect. Recommend the strongest interaction concept based on the topic.

Question quality rules:

- Ask concrete, request-specific questions; avoid “any preferences?” and other empty prompts.
- Every question must include a recommendation, proposed default, or short option set. Format it as: “My recommendation: X. Alternatives: A / B.”
- Recommendations should be opinionated and concept-specific, not generic. Bad: “Default: general audience.” Good: “My recommendation: senior engineers who understand queues but have not internalized backpressure.”
- Do not ask the user to confirm that they want an article, artifact, offline HTML, or D3 unless their request genuinely conflicts with the skill’s default deliverable.
- Grill for alignment, not permission. Once the user answers, proceed without asking a second batch.
- If answers conflict or omit a fact needed for correctness, ask one focused blocking follow-up; otherwise state remaining assumptions and continue.
- If the user ignores the grill or says to proceed, use the defaults below and continue.

If the user gives a brief prompt, use these defaults unless contradicted:

- Audience: technically curious reader who is new to this exact concept.
- Style: follow `references/writing-style.md`: concrete mechanisms, old-to-new flow, plain force, no AI-default prose, no hype.
- Output: one standalone `index.html` unless the concept clearly needs a series.
- Scope: one core insight plus supporting mechanics, not an encyclopedia.
- Visual implementation: D3 v7 for nontrivial figures, bundled offline.

### Phase 1: Source Grounding and Concept Model

This phase is mandatory for technical correctness. Before designing figures, establish what is true, what is simplified, and what is unknown.

Use primary or authoritative sources when claims could be wrong or current. Acceptable sources include user-provided papers, docs, specifications, textbooks, primary datasets, or official references. Do not rely on commentator summaries when the underlying source is available.

Produce a compact concept model for yourself and, when useful, show it to the user:

- Core claim the article will teach.
- Mechanism or causal structure.
- Variables, parameters, states, or entities.
- Equations, invariants, rules, or constraints.
- What the visualization simplifies.
- Edge cases and failure modes.
- Misconceptions the article should correct.
- Sources and data provenance.

Never invent technical behavior for a simulation. If the model is uncertain, either research it, ask the user for the missing source, or mark the model as provisional and avoid presenting it as fact.

### Phase 2: Learning Contract

Turn the concept model into learning goals.

Define:

- **Reader prerequisites:** what the reader can already know.
- **Learning outcomes:** 2-4 things the reader should be able to explain or predict after reading.
- **Misconceptions:** 1-3 wrong mental models the article should repair.
- **Assessment moment:** at least one prediction, self-explanation, or “try this, then compare” interaction.
- **Non-goals:** what the article intentionally leaves out.

A good learning outcome is behavioral:

- Weak: “Reader understands gradient descent.”
- Strong: “Reader can predict when a larger learning rate will overshoot and explain why smaller is not always better.”

### Phase 3: Article Plan

Plan the article before coding. In generator mode, keep this short, but do it.

Use an abstraction ladder unless the topic demands another structure:

1. **Concrete case:** a small example the reader can inspect.
2. **Visible mechanism:** the moving parts and causal relationship.
3. **Formal abstraction:** equation, rule, state transition, or general principle.
4. **Application:** a realistic case where the idea matters.
5. **Limitation:** what the simplified model hides or where it breaks.

Choose the reader-agency structure deliberately:

- **Guided:** best for prerequisite-heavy concepts.
- **Hybrid:** guided path followed by a small sandbox. This is the default.
- **Exploratory:** only for expert audiences or reference-style articles.

For each section, state its job in the progression. For each figure, write a spec before implementation.

#### Figure Spec Schema

Each figure spec must include:

- **Purpose:** why this figure exists.
- **Claim:** what behavior or relationship it demonstrates.
- **Representation:** what is encoded visually.
- **Data/model:** real, synthetic, illustrative, or simulated; include provenance.
- **Default state:** what the reader should notice before touching it.
- **Reader action:** what the reader can manipulate, inspect, predict, or compare.
- **System response:** what changes and why.
- **Intended insight:** the mental-model shift.
- **Misconception addressed:** if any.
- **Interaction type:** slider, drag, hover, brush, linked view, scroll step, animation, prediction reveal, etc.
- **Static gate:** why a static figure is insufficient. If static is enough, make it static.
- **Technology choice:** D3/SVG, D3/Canvas, D3/HTML, D3 hybrid, or static SVG/HTML for trivial figures.
- **Accessibility fallback:** caption, keyboard path, description, data/model summary.
- **Validation checks:** sanity checks, edge cases, and expected behavior at extremes.

Example:

```text
Figure: Learning-rate path
Purpose: Show why step size controls convergence behavior.
Claim: Larger steps can reduce loss quickly but can overshoot when local slope changes.
Representation: Loss curve as position; gradient as arrow; update path as dots.
Data/model: Synthetic convex function, equation shown in caption.
Default state: Moderate learning rate converges in visible steps.
Reader action: Predict where the next dot lands, then adjust learning rate.
System response: Path updates; overshoot appears when step crosses the basin.
Intended insight: The gradient gives direction, but learning rate determines distance.
Misconception: “Bigger learning rate is simply faster.”
Static gate: Static path cannot show the parameter tradeoff across values.
Technology: D3/SVG with scales, line generator, transition, and keyed path updates.
Accessibility fallback: Keyboard slider, text summary of convergence/overshoot state.
Validation: lr=0 stalls; lr≈safe converges; lr high oscillates or diverges.
```

### Phase 4: Build

Build from the plan. If the user asked for a complete artifact, do not stop after the outline unless a blocking issue remains.

Implementation rules:

- Create the project in `tmp/project-name/` when that path is available. Otherwise use the current artifact directory and preserve the same internal structure.
- Default to one standalone `index.html` with inline CSS, JS, SVG, data, model definitions, and inlined D3 when feasible.
- For larger projects, create `lib/d3.v7.min.js` as a local bundled dependency and package the full directory as a zip.
- Use no CDN and no runtime network request.
- Use no remote fonts. Use local/system font stacks.
- Use D3 v7 for nontrivial charts and interactive figures.
- Use `.join()` with key functions for object constancy when updating marks.
- Use `d3.dispatch` or a tiny store for linked views and state coordination.
- Use `ResizeObserver` for responsive redraws. Redraw text-heavy charts rather than scaling text with only `viewBox`.
- Generated data must be deterministic with a seeded random generator.
- Real data must include provenance and transformation notes.
- Prose and figures should be written together. The prose tells the reader what to notice.
- Run the prose through `references/writing-style.md` while drafting, not after. If style pressure conflicts with correctness, source grounding, accessibility, or reader comprehension, correctness wins.

Build the most important figure first internally, test it, then complete the rest. For each major section, verify that the default state demonstrates the intended insight.

### Phase 5: QA and Delivery

Before delivering, run this checklist. If a check cannot be performed, disclose it.

#### Truth and Learning

- The article’s core claims are grounded in sources or explicitly labeled as simplified.
- Every simulation has stated assumptions and edge-case behavior.
- Every figure has a claim, caption, and intended insight.
- Every interaction earns its place; static alternatives were considered.
- The article includes at least one prediction, self-explanation, or reveal moment.
- Misconceptions identified in Phase 2 are addressed by prose or interaction.
- Limitations are stated without derailing the narrative.

#### Article Quality

- The page reads like an article, not a dashboard.
- Section order follows dependency order.
- The design language is specific to the concept. If the topic changed, visual choices would need to change.
- Captions say what to notice, not merely what is present.
- There is no generic AI ornamentation.
- Reader-facing prose does not drift into implementation tutorial mode.
- Prose follows `references/writing-style.md`: no grand openers, negation-pivot drama, hollow hype, generic transitions, fake profundity, decorative metaphor, summary endings, or fabricated concrete details.
- Each section gives the reader a portable handle: a named mechanism, pattern, variable relationship, visual convention, or boundary they can use after reading.

#### Runtime and Accessibility

- Fully offline: no external script, style, font, image, data, or network request.
- D3 is inlined or loaded from a bundled local file.
- Opens without console errors.
- Works at desktop width and about 400px width.
- Controls are labeled and keyboard-accessible.
- Touch/pointer interaction works where relevant.
- Color is not the only channel for meaning.
- Text and non-text contrast are acceptable.
- Motion respects `prefers-reduced-motion`.
- Animations reset cleanly.
- Extreme parameter values do not break layout or produce misleading states.
- Figures have captions and accessible descriptions.

After building, open the result in a browser when available. If browser preview is unavailable, run static checks and tell the user what was verified and what was not.

## Output Format

For a new request that has not passed intake, provide only the alignment grill:

1. One short sentence that frames the questions as alignment before build.
2. Exactly five numbered, request-specific questions unless prior context makes fewer appropriate.
3. A short default fallback only when useful: “Anything unanswered will use the skill defaults.”

Do not include an outline, plan, code, or artifact in the same response as the initial grill unless the user explicitly asked to skip questions.

When delivering a completed article, provide:

1. A one-sentence description of what was built.
2. Link or path to `index.html`.
3. Link or path to a zip when the environment supports it.
4. A short verification note: browser-tested or statically checked, and any limitations.
5. Optional: 2-3 high-leverage revision suggestions, not a long todo list.

For outline-only requests, provide:

1. Concept model summary.
2. Learning contract.
3. Section outline.
4. Figure specs.
5. Source/data needs.

For audits, provide:

1. Highest-leverage issues first.
2. Evidence from the artifact.
3. Concrete fixes.
4. Risk level: correctness, pedagogy, accessibility, runtime, or visual specificity.

## Required Writing Style

Use `references/writing-style.md` for all article prose, headings, captions, annotations, prediction prompts, notes, limitations, and delivery summaries.

Apply it as a technical-explainer style, not as decorative essay cosplay:

- Truthful grounding and reader comprehension outrank style. Never invent examples, data, quotes, lived observations, or source claims to make the prose feel vivid.
- The “portable handle” can be a canonical technical term, named mechanism, variable relationship, visual convention, misconception, or boundary. Coin a new term only when it makes the explanation clearer than the established term.
- Cross-domain frames are optional. Use one only when it maps structurally to the concept, clarifies the mechanism, and has a named boundary.
- Start inside the subject. Do not open with “This article will,” “We’ll explore,” “In today’s...,” or other meta setup.
- Prefer mechanism over contrast. Avoid “not X, but Y” unless correcting a real false premise supplied by the user, source material, or common misconception.
- Captions stay plain and directive. They should tell the reader what to notice, not perform as mini-essays.
- Prediction and self-explanation prompts should be concrete: “Before moving the slider, predict whether the path will overshoot.”
- Use short, direct sentences when the concept is hard. Controlled weirdness is allowed only when it sharpens the model.
- Separate fact, interpretation, simplification, analogy, and speculation.
- End sections with pressure, implication, boundary, or next dependency. Do not end with grand summaries.

## Pedagogy Rules

- **Exaggerate for clarity.** Defaults should make the phenomenon visible. Pedagogical clarity can trump realism when the simplification is disclosed.
- **Make defaults interesting.** No blank canvases or “click to begin understanding.”
- **Go slow enough to follow.** Animations should reveal cause and effect.
- **Use consistent conventions.** A variable, color, shape, or line style keeps the same meaning across figures.
- **Prompt prediction.** Ask the reader to predict before reveal when it exposes a misconception.
- **Support self-explanation.** Use small prompts like “What changed when the parameter crossed this point?”
- **Reset cleanly.** Loops and simulations must return to a known state.

## D3 Implementation Contract

Every nontrivial chart should have:

- margin convention;
- named scales;
- keyed joins;
- one clear `render` or `update` function;
- responsive redraw through `ResizeObserver`;
- readable axes and labels;
- direct labels where possible;
- captions that interpret the figure;
- D3 patterns from `references/visuals.md` for hover, brushes, drag, transitions, chart generators, hierarchy, binning, stacking, dispatch, and performance.

## Anti-Slop by Rationale

Do not merely avoid bad patterns. Replace them with concept-specific choices.

Bad: “three metric cards summarizing the model.”
Better: a single annotated figure showing where those quantities appear in the mechanism.

Bad: “blue means active because blue is the default accent.”
Better: color choices tied to the concept, such as warm/cool for energy flow, solid/dashed for observed/predicted, or consistent variable colors across equation and figure.

Bad: “interactive sandbox with five sliders.”
Better: one slider that controls the parameter responsible for the misconception, plus a default state that already shows the effect.

Bad: “Insight box.”
Better: a strong sentence in the prose or a caption that directs attention.

Bad: “I’ll assume X and build” after a new underspecified request.
Better: five sharp alignment questions that lock audience, scope, source truth, learning target, and interaction constraints before work begins.

## Edge Case Handling

**Vague request.** Run the alignment grill first. If the user does not answer or says to proceed, infer audience and scope, state assumptions, and produce a compact plan or artifact. Ask an extra blocking question only if the concept itself is unclear.

**User supplies dense source material.** Extract the concept model first. Do not visualize every detail. Pick the one causal mechanism or abstraction that unlocks the rest.

**Missing or uncertain source.** Research or ask. If neither is possible, mark the model provisional and avoid authoritative claims.

**Conflicting interpretations.** Present the article around the stable core. Put disagreement in a limitation section or compare models if the disagreement is the point.

**Programming concept.** Explain behavior, state, and invariants. Use minimal code only when code is the object of explanation. Use internal D3 normally for figures.

**Large real dataset.** Prefer summarized, transformed, or sampled data when the purpose is explanation. Keep the article offline. Document sampling and transformation.

**D3 library unavailable.** Do not use a remote URL. Inline or bundle a local copy when available. If the environment truly lacks a D3 source, create the article with a local `lib/d3.v7.min.js` dependency clearly listed in the project and disclose that the library file must be supplied before offline runtime verification.

**No browser available.** Run static checks, inspect generated code, and disclose that runtime interaction was not browser-verified.

**User asks for a dashboard.** Build an article. If they truly need monitoring or decision-support UI, this is the wrong tool and suggest a dashboard workflow.

---
name: documentation__writing
description: Creates, revises, audits, and organizes technical documentation using Diátaxis. Use when authoring or restructuring tutorials, how-to guides, reference, explanations, API docs, quickstarts, installation or troubleshooting guides, READMEs, and documentation navigation. 
---

# Writing Technical Documentation

Preserve technical truth and the reader’s ability to proceed. Use Diátaxis to serve the reader’s purpose; let that purpose determine what to include, explain, verify, or separate.

## Scope the work

Choose the requested job:
- Create or revise a page.
- Audit existing content.
- Restructure a documentation set.

Supplying existing text does not request an audit. Keep local edits local; flag material adjacent problems without silently expanding the assignment.

Follow the project’s documentation home, conventions, and existing source, testing, and publication workflows. Find the maintained input before editing generated documentation. This skill owns documentation content and reader paths; use the project’s established workflows for implementation changes and publishing.

For substantial work, establish:
- The reader’s task or question.
- Their starting knowledge.
- The applicable product, version, and environment.
- The available evidence.

Use context already supplied. Ask only when an unresolved detail materially changes correctness or usefulness; otherwise proceed with consequential assumptions stated briefly. Do not repeat discovery for a wording-only edit.

## Establish technical truth

Before adding or changing consequential technical claims, inspect evidence applicable to their scope: supported contracts, release-specific reference, schemas, implementation, maintained examples, or observed results.

Match evidence to the claim. An implementation or successful run establishes behavior under those conditions; it does not automatically establish a supported guarantee. When sources disagree, check versions and scope, preserve the distinction between intended and observed behavior, and expose unresolved material conflicts. Do not invent an authority hierarchy when the project supplies none.

Never invent behavior, prerequisites, defaults, outputs, limits, or design history.

- Omit unsupported optional detail.
- If a missing fact prevents correct use, identify the affected gap and continue independent work.
- Request the specific missing evidence when necessary.
- Do not present a partial procedure as ready to follow.

Keep relevant evidence traceable in the project’s normal form, such as existing links, source locations, or change notes. Do not require a source ledger for every page.

When retrieving reference material, check that relevant nested definitions and version information were actually included before treating a detail as unspecified.

## Choose the reader’s mode

| Reader need | Type | Governing decision |
|---|---|---|
| Learn through doing | Tutorial | Arrange a reliable learning experience. |
| Complete real work | How-to | Guide the task and its necessary decisions. |
| Consult facts while working | Reference | Describe the relevant contract precisely. |
| Develop understanding | Explanation | Build a causal or conceptual account. |

Classify by purpose, independently of seniority or page label. An advanced practitioner can need a tutorial.

- Quickstarts may be tutorials or how-to guides.
- Installation and troubleshooting are usually task guides.
- READMEs and landing pages may orient and route among types.
- Release notes communicate change.

Keep one dominant reader purpose per page. Include concise context needed to choose, perform, or verify the immediate action. Move extended background elsewhere when it disrupts that purpose. A supporting reason is not by itself a reason to split a page.

## Apply the relevant pattern

Treat these as content decisions, not mandatory headings. Preserve a suitable existing structure.

### Tutorial

- Define the intended starting competence and choose a concrete exercise that exposes the actions and relationships the learner must encounter. Producing an artifact alone does not establish that the exercise teaches the intended capability.
- Show the destination, provide the required setup, and guide one dependable path with small, meaningful steps. Exclude choices that do not serve the exercise.
- Show expected results early and at useful checkpoints. Tell the learner what to notice and how to recognize being on track. Distinguish stable output from variable example values.
- For exercises creating persistent state, explain repeat or reset behavior where needed. Keep resets confined to disposable practice state.
- Validate against the declared learner, not a generic beginner.

### How-to guide

- Start from a real goal, problem, or symptom. Assume the stated baseline competence and include what completes the task.
- At material branches, give observable conditions or selection criteria. Retain the brief rationale required to choose correctly; link broader background.
- For troubleshooting, connect symptom to diagnostic check, interpretation, and corrective action. Prefer checks that distinguish likely causes before suggesting unrelated fixes. Never invent a diagnosis from a symptom alone.
- End with a way to recognize the intended result. Include relevant partial-failure or recovery guidance without cataloguing every possible failure.

### Reference

- Use a consistent schema suited to the public model the reader uses: operations, resources, commands, fields, or configuration. Reflect internals when those internals are the reader’s subject.
- Describe supported facts precisely. Include applicable syntax, types, requirements, defaults, values, responses, errors, limits, and examples; omit irrelevant fields.
- Check consequential semantics as well as signatures: side effects, retry behavior, state dependencies, partial failure, asynchronous completion, pagination, or configuration precedence and reload behavior, where relevant and supported.
- Preserve material version qualifiers. Make unknown contract details visible when they affect correct use.
- Keep volatile facts in their maintained source and use the project’s reuse mechanism where available.

### Explanation

- Organize around the reader’s question and a coherent account of how or why the system works. Connect mechanisms, constraints, alternatives, and consequences.
- Separate documented rationale from your interpretation. Include history or opinion only when supported or clearly identified and useful.
- Use examples or diagrams when they clarify relationships.
- Link procedural and factual detail instead of turning the explanation into a task guide or specification.

## Preserve procedural state

When success depends on state, identify the required starting conditions, execution context, values carried between steps, and meaningful signs of progress.

At likely or consequential divergence points, provide:
- The recognizable symptom.
- A check that distinguishes the relevant conditions.
- A supported way to recover or resume.

Do not assume every reader starts clean or that repeating an action is harmless. Do not prescribe deleting production state merely to make instructions repeatable.

Place necessary prerequisites, decision criteria, and consequential warnings before the affected action. Explain placeholders and where commands run. Keep short operational context in the main flow.

Constructed contrast:

- “Choose the appropriate option” leaves a decision unresolved.
- “Use the existing-resource path if the resource is already present; carry its identifier into the next step” gives a usable condition.

The actual condition and behavior must come from the product’s evidence.

## Audit and restructure at the requested scope

For audits, start with priority reader tasks or questions from available evidence, then inspect how the existing content supports them. Use page inventory and Diátaxis classification to diagnose gaps, not as substitutes for task coverage. Label assumed priorities.

Report each material finding with:
- Its location.
- The supporting evidence.
- The consequence for the reader.
- The smallest useful fix.

Prioritize incorrect guidance, blocked tasks, recurring confusion, and missing contract details over cosmetic uniformity.

For structural changes, state the reader benefit of each split, merge, or move. Preserve enough context for independently reachable pages to establish their purpose and applicability.

Cross-link specific next needs. Do not generate empty quadrants or companion pages merely to complete the taxonomy.

When published paths or anchors change, include old-to-new destinations and needed navigation, link, redirect, or alias work using the existing publishing system. Unpublished drafts and local prose edits do not need migration plans.

## Verify proportionately

Choose checks for the changed claims and realistic failure modes:

- Inspect sources for factual agreement.
- Run changed executable examples from their documented prerequisites when capability and authorization permit.
- Use existing build and link checks when structure changes.
- Use reader observation, when available, to assess comprehension and navigation.

Keep these forms of evidence distinct. Execution does not establish reader understanding, and a clean build does not establish technical truth.

Report only checks actually performed. If execution or reader access is unavailable, deliver useful reviewed work with material limits stated.

Do not introduce a new test pipeline for an ordinary documentation edit.

## Deliver the requested result

Deliver the document, revision, ranked audit, or restructuring plan first.

Explain only material assumptions, unresolved facts, and verification limits. Announce the Diátaxis classification only when it helps explain a consequential choice. Do not print the authoring checklist.
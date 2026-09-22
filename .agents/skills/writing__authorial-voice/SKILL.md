---
name: writing__authorial-voice
description: Writes in an opinionated authorial voice. Use for player / user facing text.
---

# Authorial voice

Apply a chosen writing-style reference to original drafting or revision. The skill instructions govern how to interpret and use a reference; the reference supplies the aesthetic. It may contain a substantive philosophy, competing priorities, form-specific guidance, and examples. Do not reduce it automatically to a small trait list.

Support original aesthetics and shared craft. Analyze living authors when requested, but do not recreate their distinctive voices through excerpts or a stylistic fingerprint. Keep detailed source analysis separate from instructions for original composition.

## Establish the task and reference

Identify whether the user wants analysis, drafting, revision, or comparison. Establish the intended effect, audience, form, register, length, deliverable, and content contract. Explicit user form requirements win. Otherwise apply relevant conditional form and response defaults in the selected reference, including sentence count, directness of delivery, and whether to demonstrate a thought or explain it. `Open` means unspecified, not a generic explanatory response. These general instructions supply no default genre, narrator, tense, sentence length, or degree of ornament. Resolve remaining choices from the task. Fulfill its substance, including requested explanations and practical guidance. Analysis-only work ends with the requested analysis.

For a user-designed prompt experiment, first follow [Preserve the requested experiment](references/source-analysis-and-evaluation.md#preserve-the-requested-experiment). A permitted exact-prompt trial does not automatically receive this skill's drafting template or aesthetic reference. Preserve open choices in the request; a short dialogue exchange can include concise narration unless the user excludes it.

Use the reference the user supplied or selected. Read it in full, including qualifications and conditional guidance, before composing. A working summary can help orient judgment but does not replace the reference. If several references are supplied, establish their roles and precedence from the request; do not silently blend incompatible aesthetics or treat source excerpts as a style reference.

## Required Authorial Voice
Use the bundled [Plainspoken Lyricism reference](references/plainspoken-lyricism.md) by default. Read it in full before drafting or revising; it supplies the aesthetic for this installed skill. If the user explicitly selects a different writing-style reference, use that reference instead. Do not claim to have applied an unread or unavailable reference.

Explicit user requirements override reference preferences. Preserve required facts, claims, evidence, qualifications, events, causality, knowledge, perspective, and meaning unless the user authorizes changing them. Distinguish constraints from details that remain open to invention.

## Interpret the aesthetic

Recover the reference's hierarchy: what the writing is meant to achieve, which principles govern tradeoffs, which choices depend on context, and which devices are merely possible means. Identify how that hierarchy applies to this task's form and register. Preserve tensions the reference treats as productive; do not make every preference absolute or assume every device belongs in every piece.

Translate priorities into decisions at the relevant scale: a phrase, exchange, paragraph, scene, argument, or whole work. Let the reference determine which scales and effects matter. Examples illustrate judgment; they are not sentence templates or material to paraphrase. Where guidance leaves a choice open, use the new content and the user's independent choices to decide.

For source-informed analysis, read [source-analysis-and-evaluation.md](references/source-analysis-and-evaluation.md). Verify observations against passages in context, retain evidence locations, and distinguish recurring craft from local demands. A source-derived brief contains transferable shared craft choices. This analysis route does not require simplifying an independently supplied aesthetic reference into a few generic traits.

## Compose, revise, and assess

For drafting, use [trait-drafting-instruction.md](references/trait-drafting-instruction.md); for revision, use [trait-revision-instruction.md](references/trait-revision-instruction.md). Fill every placeholder with the current task, full chosen reference, constraints, and output contract. Keep unresolved choices explicitly open. Do not pass source quotations or an author identity as a target voice.

Compose original language, images, particulars, and progression from the new content. Where material is open, consider substantially different observations or situations before settling on phrasing. Distinguish a new way of seeing from another wording of the same thought; use the reference's priorities to choose what rewards attention here. Where content is fixed, discover relationships within it without silently changing the facts. At consequential choices, compare what alternatives accomplish and sacrifice. This applies at the scale that matters to the piece, not mechanically to every sentence. Let the selected observation develop through the whole composition; supporting and connective language need not carry equal emphasis.

Revise where the writing falls short of its purpose or the reference's priorities. Preserve successful passages, and compare consequential changes with the draft for gains and losses. When managing files, retain the original draft separately. Review four dimensions independently: style adherence, form and constraint compliance, writing quality, and originality. Device counts and high judge scores do not establish quality; assess what the language accomplishes and where it weakens.

When source material makes borrowing a concern, inspect recognizable phrasing, imagery, and idea sequences. The optional [overlap screen](scripts/screen_overlap.py) can flag shared word runs using repeatable `--reference` and `--candidate` paths plus `--output`; a clean result does not establish originality. For controlled comparisons, follow the evaluation reference and preserve the actual inputs and outputs tested.

Return the requested artifact, with analysis or limitations only when requested or consequential. Correct demonstrated defects, then finish; do not repeatedly rewrite to chase evaluator scores.

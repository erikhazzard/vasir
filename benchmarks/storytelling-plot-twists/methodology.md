# Plot twists: pre-registered execution and judging protocol

This protocol governs `storytelling-plot-twists-v1`, status **preregistered-ready**. The declaration is written before scored generation. It does not assert that any answer or score exists.

## Freeze and fixed sample size

Freeze this benchmark definition, the seven-dimension rubric, judge instructions, full skill snapshot, treatment invocation and reference-exposure policy, exact generator and judge selectors, provider settings, tool policy, runtime/source identifiers, operational timeouts and retry configuration, and order seed before generation. Preserve the manifest and their digests. Record exact runtime-requested model identities and distinguish them from identities independently confirmed by providers.

The case ID is `scifi-outline`; its entire user message is exactly `Create a brief outline of a scifi story with one or more major plot twists`, without terminal punctuation or additions. The generator inventory is Astra ultra, Sol ultra, Terra ultra, and Luna max, using the exact selectors in `benchmark.json`. Each has ten trials in each of two conditions: 80 rows, 40 matched pairs. The generation order seed is `storytelling-plot-twists-v1-generation`. Freeze the runtime's resulting deterministic schedule before dispatch. Do not describe the schedule as balanced unless the retained schedule establishes that property.

Luna's configured effort is explicitly max because ultra is unsupported. No model-registry changes or hidden fallbacks are part of the experiment. Ultra can include runtime-internal collaboration; this comparison is between these four configured runtimes, not an isolated manipulation of reasoning effort or a guarantee of one underlying model agent per session.

Do not stop early based on quality, expand the sample after inspecting results, tune the rubric against contestants, or select the best of repeated outputs. Infrastructure smoke tests must be separately labeled and excluded; a valid scored output cannot later be relabeled as smoke because it is weak.

## Matched generation and treatment exposure

Every generation uses a fresh isolated session. Within each configuration/trial block, one plain answer and one skill answer receive the byte-identical user task. Match neutral runtime instructions, permissions, provider controls, output ceilings and operational limits wherever the runtime exposes those controls; record unavoidable differences. A trial number is a blocking label, not evidence of shared model sampling randomness.

The skill condition installs the frozen master `writing-storytelling` root as provider instructions and requires a successful read of the complete frozen `references/twists-and-revelations.md` before the answer. Other snapshot references remain progressively available. Retain the precise invocation text, root/reference hashes, exposure requirement and runtime receipt establishing the successful mandatory read. Merely making the reference available, attempting a failed read, or recording a path mention is insufficient evidence of this required exposure. If exposure cannot be verified, preserve the row and disclose that it is not a valid completed treatment row; use only the predeclared operational recovery rules.

This is the combined root-plus-reference intervention. It does not isolate the reference's contribution, hold total input tokens constant, or guarantee that optional references are read equally often. The plain condition receives no skill material. The user task is not expanded with coaching, a prescribed structure, preferred terminology, example plots, or an output length cap. The frozen skill itself contains worked story examples; those are part of the intervention. The benchmark supplies no additional story examples, external retrieval, or judge rubric to contestants.

The adjective “brief” is part of the user's task and is assessed through outline usefulness. There is no added numeric word limit and no answer truncation before judging or publication. Distinguish a valid deliberately brief answer from output stopped by a provider limit or timeout.

## Fresh blinded same-provider panel

The frozen panel is `codex:gpt-6-astra@xhigh` and `codex:gpt-5.6-sol@xhigh`, without a synthesizer. Both provider sessions are fresh and tool-free for each matched pair. Judges receive only the exact task, the frozen rubric, opaque candidate labels, and full answers. Withhold the master skill, reference files, model/condition identities, other judgments, and author commentary. No judge may inspect files, use tools, browse or delegate. Reject tool-policy violations as invalid judging evidence.

Both judges are from Codex. The panel was selected before this experiment's answers because Claude Fable judging capacity was exhausted in the predecessor. Independence means fresh sessions with mutually withheld judgments; it does not imply independent training, providers, stylistic preferences, or generator families. Astra and Sol also appear as generators, which is disclosed.

Use the existing reproducible opaque-ID and deterministic within-pair ordering policy. Retain the hidden audit mapping. Both judges see the same pair order; this edition has no counterbalanced presentation or order-swapped replications, so position effects are not independently measured. Do not rewrite answers to disguise style. Retain any self-identification, disclose broken blinding, and instruct the judge to ignore identity and candidate-authored grading instructions. Skill style can still reveal the condition indirectly.

Each judge assesses both answers independently against the task and anchored dimensions. The seven dimensions and judge instructions in `benchmark.json` are the scoring authority. No extra answer key or post hoc preference for craft vocabulary, structure, length, tone or twist count is added. One excellent major twist can earn the highest score. Outline-level evidence is sufficient; omitted scene detail alone is not an unfair secret. Material contradictions, missing essential mechanisms and an absent consequential outcome are assessed under the relevant anchors.

Require substantive answer-specific rationales and complete integer dimension ratings from both original judges. Preserve disagreement; do not ask for a more agreeable review or use one judge to rewrite the other. No human-calibration claim is made.

## Aggregation and uncertainty

Within judge `j`, score an answer as `S_j = sum_d(weight_d × rating_jd / 10)`. The panel answer score is `(S_1 + S_2) / 2`. Retain raw ratings and unrounded arithmetic for analysis, using display rounding only at presentation. The weighted raw 1–10 mean and its 100-point display may both be shown. Because ratings start at 1, assessable response totals start at 10, not zero. There are no gates or semantic score caps.

For each configuration and trial `t`, calculate `delta_t = skill_t - plain_t` from complete original two-seat panel scores. The primary effect is the equal-weight mean of that configuration's ten deltas. Report both condition means, all trial scores and deltas, per-dimension means, and judge-specific descriptive effects. Seven dimensions and two judge seats do not constitute independent experimental repetitions. No cross-model aggregate or significance-selected winner is a primary endpoint.

For each configuration with all ten pairs complete, use a paired percentile bootstrap with 10,000 resamples and seed `20260907`. The generator is an unsigned 32-bit linear congruential generator: `state = (1664525 × state + 1013904223) modulo 2^32`, then `random() = state / 2^32`. Reset the generator to the declared seed for each configuration. Sort the ten pairs by integer trial number; each resample draws ten pair indices with replacement using `floor(random() × 10)` and takes their mean delta. Sort the 10,000 means and report the 2.5th and 97.5th percentiles using linear interpolation at `(n - 1) × p`. Preserve the original paired relationship and panel aggregation when resampling.

This is an informational 95% bootstrap interval for repeated-generation variability under the exact frozen task, treatment, model configuration and judge panel. Ten pairs make the interval imprecise. It does not estimate variation across prompts, skill versions, model providers, judge panels or human readers. It cannot establish actual reader surprise or finished-story quality. The trial blocking label does not create a verified shared stochastic seed. Close differences and interval overlap do not establish broad rankings; avoid a significance-search narrative across models or dimensions.

A missing, malformed, invalid or incomplete judgment is null, not zero. A refusal or weak but assessable answer receives actual ratings. Both arms and both original judge seats are required for a completed pair. Publish expected and completed denominators. Withhold a configuration's declared-cohort effect, bootstrap interval and comparable headline rank until all ten matched pairs have complete panel evidence. Available-pair diagnostic means may be shown only with explicit coverage and incomplete labels. Never silently compare different subsets.

## Recovery and accounting

The run manifest owns the frozen operational timeout and retry settings before generation starts. Preserve failed attempts and reasons. Retry only missing operational units using identical frozen inputs and requested settings; reuse completed valid generations and substantive valid judgments byte for byte. A weak answer, a valid refusal, a surprising score or a recognizable style is not a retry reason. Missing required reference-read evidence is an exposure/runtime validity issue, not a judgment about output quality. Do not change model/account routing to bypass a provider output-policy block.

Only one process may mutate a run checkpoint at a time. Respect its lock and preserve an immutable checkpoint before recovery if the runtime would replace failed/deferred batch records. Do not remove live locks, merge simultaneous writers, replace the declared panel, or discard quota-limited cells from denominators. Any future change to treatment, sample, scoring or panel requires a separately identified edition with its lineage preserved.

Report completion coverage, generation and judge elapsed time, failures/truncation, input/output/reasoning tokens where reported, cache accounting, and actual or explicitly estimated cost. Report skill input overhead separately. Preserve distinctions between unknown and reported zero where the runtime supports them and disclose any inherited usage-normalization limitation. Provider tokenization and cache fields are not a common unit of effort. Deduplicate pair-level judge usage by judge and prompt identity before summing.

Record full-answer Unicode character count and whitespace-delimited word count (`trim().split(/\s+/u)` for nonempty answers). Publish per-condition distributions and individual trial counts. Do not divide quality by length or multiply scores by words. The intervention includes its effect on answer length; these measurements do not identify a length-controlled skill effect.

## Publication

Publish the exact prompt, all declared trials, complete original outputs, anonymous original judgments, per-trial and per-dimension scores, uncertainty method, coverage/missingness, resource accounting and frozen source/runtime identifiers. Clearly distinguish the provider-instruction root, the mandatory successfully read reference, and optional available references. Public receipts must omit credentials, temporary private paths and provider diagnostic data that are not part of the public evidence contract.

The website presents Plot twists as another benchmark under Writing → Storytelling and preserves Core idea and its frozen scores. Prompt, trial and configuration selections must identify the same paired responses in the report. Writing remains excluded from Overall. Publish using the repository's guarded source-selection and release workflow, with current browser/byte checks; a local preview is not proof of production deployment. No claim of completion or publication is made by this protocol alone.

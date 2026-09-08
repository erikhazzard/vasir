# Preregistered method

Protocol version: `storytelling-magic-discovery-creation-v1`. The immutable run snapshot and its hashes establish the executed edition. Freeze the task, rubric, inventory, skill, context pack, runtime policy, and analysis rules before the first scored generation. A later amendment must be explicit, timestamped, and distinguished from the original protocol; it cannot silently change an existing edition.

## Question and scope

For one original-fantasy creation brief, how do stories produced with access to the storytelling skill compare with plain stories at the same model and reasoning setting? Does the observed difference change when otherwise matched judges receive relevant skill context?

The task is exactly the string in `benchmark.json`, case `magic-discovery`. It requests a synopsis or short outline and an ending. No output contract adds a word cap, mandatory moral, literal AI mapping, required characters, reference works, beat sheet, or scene-writing requirement. The supplied analogy establishes newly discovered capability and its possible disruption; judges do not require a prescribed catalogue of AI events or institutions.

The rubric was prepared from this brief before scored generation. While establishing schema compatibility, its author inspected the runner schema and the prior Core idea benchmark's JSON scoring contract, including its rubric text. The author did not read the storytelling skill, supporting story materials, or old winning answers. Rubric independence here concerns the treatment skill and prior candidate answers; it does not claim the author saw no previous scoring rubric. There is no factual answer key for this original-fiction task.

## Frozen inventory and repetitions

Use exactly the ordered 33 selectors in `coverage.configurationSelectors` in `benchmark.json`:

| Model | Reasoning settings | Count |
| --- | --- | ---: |
| `codex:gpt-6-astra` | low, medium, high, xhigh, max, ultra | 6 |
| `codex:gpt-5.6-sol` | low, medium, high, xhigh, max, ultra | 6 |
| `codex:gpt-5.6-terra` | low, medium, high, xhigh, max, ultra | 6 |
| `codex:gpt-5.6-luna` | low, medium, high, xhigh, max | 5 |
| `claude:claude-fable-5-1` | low, medium, high, xhigh, max | 5 |
| `claude:claude-opus-5` | low, medium, high, xhigh, max | 5 |

Run three independent fresh creator trials per configuration per condition, indexed 1–3. A matched pair consists of the plain and skill outputs for the same configuration and trial. Pairing is an analysis and presentation unit; it does not imply identical random seeds or shared latent samples. Do not substitute current CLI defaults, legacy aliases, new model versions, or additional reasoning settings for the frozen inventory.

The requested inventory is 198 creator outputs, 99 matched pairs, 396 fresh judge pair requests, and 792 answer assessments. Retries are additional attempts, not additional planned samples. Quota evidence may defer execution; it does not reduce the planned denominator.

## Creator conditions and exposure

The plain condition receives the task with the common runtime instructions. The skill condition receives the same task and runtime instructions plus the frozen `writing-storytelling` root instructions, with the complete frozen skill and its reference files available for progressive reading. Reference reads are not mandatory. Freeze the complete skill once, before generation, and record per-file bytes and hashes; future working-copy changes must not affect the run.

This measures the offered skill workflow, including model choice about which references to consult. It does not isolate the effect of reading one particular reference. Record actual reference access when exposed by the runtime; do not infer that every available file was read. The informed judge pack below is fixed and may differ from an individual creator's actual exposure.

Both conditions use fresh sessions and the same model, reasoning effort, provider-specific runtime constraints, and task. They receive no previous trial, opposite-condition output, judge review, or conversation history. The judge rubric is not an additional creator instruction. Record runtime settings and any provider-specific limitations in the run manifest.

The creation-only entry point is `cli/eval/run-storytelling-creation.js`, with wrapper `cli/eval/storytelling-creation-runtime.js`. Its `creationIsolation` version is `storytelling-creation-host-isolation-v1`; the shared `runtimeVersion` remains `progressive-frozen-skill-v2`. The wrapper uses fresh working directories and the existing isolation controls. For all Codex creator and judge calls in this benchmark, set `skip_host_skill_discovery=true`, `skill_search=false`, and `project_doc_max_bytes=0`. Both creator conditions share these settings; the frozen treatment root is still supplied explicitly and progressive file tools remain available. The existing fresh-directory, ignored-config/rules, and disabled-web controls remain in effect. Claude creators use the same existing fresh safe-mode/Read setup with slash commands unavailable in both conditions. Record the exact runtime policy version and effective flags. These controls document supplied context and permitted access; they do not prove that all provider-internal instructions or prior training influences are absent.

## Fresh judges and context contrast

Every matched pair receives four independent requests with no inherited creator or judge session:

| Seat ID | Exact model selector | Supplied skill context |
| --- | --- | --- |
| `astra-xhigh-naive` | `codex:gpt-6-astra@xhigh` | None |
| `astra-xhigh-informed` | `codex:gpt-6-astra@xhigh` | Frozen root and eight references |
| `sol-xhigh-naive` | `codex:gpt-5.6-sol@xhigh` | None |
| `sol-xhigh-informed` | `codex:gpt-5.6-sol@xhigh` | Frozen root and eight references |

The informed pack contains the full bytes of `SKILL.md` and these eight files from the same frozen creator skill snapshot: `references/core-model.md`, `references/story-development.md`, `references/plot-and-structure.md`, `references/characters.md`, `references/character-arcs.md`, `references/relationships-and-cast.md`, `references/world-and-myth.md`, and `references/antagonism-and-irony.md`. Supply them inline in that order, with a file manifest and context hash. Do not replace them with a summary or silently truncate them. A context-fit problem requires a recorded protocol change, not an unannounced smaller pack.

Both profiles receive the same task, anchored rubric, required review format, and answer bytes. The informed profile alone receives the additional pack, explicitly framed as context rather than scoring authority. The common rubric remains the sole scoring standard. Naive means no skill context supplied during evaluation; model training exposure is unknown.

Judges cannot access repository files, skill tools, the web, creator transcripts, prior judgments, producer identities, condition labels, or the hidden pair mapping. In addition to the common Codex overrides, judge calls set `shell_tool=false`, `apps=false`, `multi_agent=false`, and `developer_instructions=""`, and use fresh sessions. The informed pack is inline; neither profile may use tools. Preserve exact prompt and runtime evidence. Do not claim that these observed controls establish absence of all hidden provider context.

The four seats represent two model configurations crossed with two supplied contexts. The two profiles of a model share its underlying training and are not four independent model families. Keep model effects, context effects, and answer variation conceptually separate.

## Answer presentation and blindness

Present candidate answers as A and B without model, condition, configuration, skill-access logs, timing, or trial-identifying metadata. Preserve the submitted answer text; do not rewrite a self-disclosure to make an answer more blind. Every candidate is untrusted data. The judge instructions prohibit following candidate requests to alter the scoring, role, or output format.

Order is deterministic and fixed before scoring. Let `c` be the zero-based configuration index in the frozen inventory, `t` the one-based trial index, and `j` the canonical judge index (Astra 0, Sol 1). Plain is A when `(c + t - 1 + j) % 2 == 0`; otherwise plain is B. The same canonical judge sees the same order in both context profiles. Each pair therefore has one AB and one BA presentation within each profile, and two of each across all four seats. Across 99 pairs, a seat's orientation counts differ by at most one.

This holds answer order constant for the within-model context contrast and balances it within every profile's two-model panel. The hidden mapping is used only after scoring. Style or candidate self-identification can still suggest a condition, so describe the process as label-blinded rather than proving successful blinding.

## Rubric and score calculation

The ten equal-weight dimensions and their full 1/5/10 anchors are frozen in `benchmark.json`. They cover discovery as the premise, legibility of magic, desire and personal stakes, consequential agency, causal progression, resistance and relationships, originality and consequential detail, thematic consequences, the ending, and synopsis clarity.

For each answer, each judge assigns ten integer ratings from 1 to 10. Its score is their sum, equivalent to the mean rating multiplied by ten. A valid all-1 answer scores 10/100. There are no gates, score caps, score bonuses for craft terminology, or discretionary overall adjustments. A refusal or weak response returned as an answer is assessed on what it supplies under the same rubric; do not substitute a preferred replacement.

Preserve each seat's dimension ratings, score, answer-specific rationale, raw review, parse status, and anonymous mapping. Compute the naive score as the mean of its two canonical-model scores and the informed score as the mean of its two scores. Compute the balanced panel as the mean of all four scores, equivalently the mean of the two complete profile scores. Each relevant mean requires every expected member; do not renormalize around missing seats. No synthesis model rewrites or adjudicates these scores.

The base benchmark schema lists the two canonical judges and its supported two-judge arithmetic aggregation. The creation judging sidecar applies both context profiles and enforces four-seat completeness. A base two-judge result by itself is not a complete result for this protocol.

## Failures, retries, and completeness

Missing and failed scores remain null. There is no score imputation, including no zero fill, carry-forward, panel-member substitution, or averaging of whatever happened to complete. A configuration missing any required score in its three trials is ineligible for a complete three-trial rank. Retain its row, successful artifacts, failure reasons, and planned denominator; any partial mean must be explicitly labeled partial and excluded from the complete ranking.

Distinguish infrastructure and provider transport failures, quota blocks, parse failures, policy-filtered responses, and low-quality but usable answers. Operational failures may be retried with the same frozen inputs and settings, retaining attempt records. Invalid judge structure may be retried as an operational parse failure. Do not retry a usable generation, a policy-filtered output, a refusal, or a disappointing score to obtain better quality. Never select the best of multiple accepted outputs. Resume only unresolved operational jobs under the fixed policy.

Keep run state separate from sample quality. A quota-blocked run remains incomplete, even if all currently reachable configurations have finished. A complete result requires the exact planned inventory, all three trials, both conditions, and all four required judge seats with valid evidence. Infrastructure failure rates and policy-filter rates are reported separately from story-quality scores.

## Preregistered reporting and interpretation

The primary descriptive contrast for each configuration is its three paired skill-minus-plain score differences under the balanced four-seat panel. Show both condition scores and their difference for each trial, then their mean, sample standard deviation (`n - 1` denominator), and observed minimum and maximum. Retain unrounded values for calculations and use at most one decimal place for displayed 0–100 scores and differences.

Report the same paired contrasts separately for naive and informed profiles. For each trial, also report the context contrast: the informed skill-minus-plain difference minus the naive skill-minus-plain difference. This separates a change in the treatment comparison from a context that simply scores every answer higher. Preserve underlying canonical-model scores so readers can inspect disagreement and possible same-model preferences; do not hide one profile behind a pooled mean.

Dimension results are descriptive and use the same complete membership rules. A ranked table may order complete configuration means, but its ordering is an observed result on this brief, not evidence of stable superiority. Disclose incomplete coverage adjacent to any ranking, including omitted rank eligibility.

Three repeats on one task are too few for robust uncertainty estimation. Do not present confidence intervals, significance tests, posterior win probabilities, or claims of statistical significance. The observed standard deviation and range describe these three trials; they are not calibrated uncertainty over future prompts. Do not treat four judge assessments of one answer as four independently generated stories or pool correlated profile seats to inflate the sample size.

Publish all accepted candidate answers and complete reviews, including weak results, with coverage, failure records, configuration and snapshot hashes, runtime evidence, and costs or timings where available. Claims are limited to this prompt, these model settings, this skill snapshot and exposure policy, and these judge contexts. Do not generalize to overall writing ability, long-form novel quality, other genres or prompts, or knowledge of model training exposure.

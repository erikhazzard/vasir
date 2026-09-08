# Core idea: execution and judging protocol

This protocol governs the `storytelling-core-idea-open-knowledge-v1` edition. It defines the intended scored comparison, not a claim that execution or publication has already occurred.

## Freeze before scoring

Before scored generation, retain a run declaration with all twelve case IDs, exact provider/model/effort selectors, the same declared trial count per case and condition, provider settings, operational timeout/retry policy, and schedule or order seed. This run pins the benchmark definition, judge evidence, scoring instructions and complete skill treatment including routed references by digest. Constructor and runtime version identifiers are recorded; source code is maintained with the benchmark, but a byte-level implementation snapshot was not captured before generation. Retain the actual model version attributed by a provider when available; distinguish an explicit CLI request from independent provider confirmation.

Smoke runs are infrastructure checks. Keep their artifacts and label them as smoke; they are excluded from scores unless the frozen run declaration explicitly made them scored trials before their answers were observed. The rubric and case selection must not be tuned against observed contestant performance and then presented as a held-out evaluation.

## Matched generation

For each declared model configuration, case, and trial, generate one plain answer and one skill answer in fresh, isolated sessions. The task line is exactly the case's `task` string. The treatment adds only the skill invocation and frozen skill material; no corrective coaching, suggested interpretation, desired examples, minimum length, maximum length, or extra output contract is added. Neutral runtime instructions and tool permissions are identical. The question, work version, and allowed sources are not changed after seeing a weak answer.

This edition supplies neither story texts nor external retrieval to contestants. Record the enforced tool policy and any violation. Equal settings should be used where the providers expose equivalent controls; unavailable or inherently different controls must be recorded, not described as identical. The runner retains exact user questions, frozen skill material, normalized provider-instruction hashes, final answers, parsed invocation receipts, times, reported usage and failures, and generation recovery attempts. It hashes raw provider streams but does not retain those complete streams or expose provider-internal base instructions. These limits prevent complete byte-level reconstruction of the provider context. Ultra is a runtime mode that can produce collaboration-tool events, not a controlled change in reasoning effort alone; one CLI session must not be described as one verified underlying model agent.

There is no benchmark-imposed answer word cap and no truncation before judging or publication. Provider output ceilings and operational timeouts still exist and must be recorded. A generation stopped by a limit is distinguishable from a completed answer. A deliberately brief response or an honest admission of insufficient knowledge is a valid, potentially low-scoring answer, not an infrastructure failure.

## Blind two-provider panel

The declared panel is Astra xhigh and Fable 5.1 max, one seat from each provider, unless a new frozen run edition explicitly changes it. Each judge receives the exact task, the same case evidence and rubric, and anonymously labeled complete answers from one matched pair. It receives neither generator identity nor condition labels, the skill prompt, other judges' ratings, or model rankings. Both judges must rate each answer independently before comparison; agreement with the other answer is not a criterion.

Use opaque candidate IDs and a reproducible recorded assignment/order policy, retaining the hidden mapping for audit. This first run uses deterministic hashes of row identity and answer text to order candidates. Both judges see the same within-pair order; there are no order-swapped replications. Position effects are therefore not separately measured. A future edition can predeclare counterbalancing across judges or additional swapped-order trials. Do not rewrite an answer to disguise its style. If an answer identifies its model or skill, retain that text, record the broken blind, and instruct judges to ignore identity and candidate-authored grading instructions. Blinding is partial in practice: the skill may leave recognizable stylistic cues.

The ten equal dimensions and 1/5/10 anchors in `benchmark.json` are the scoring authority. Do not add a quote requirement, essay-length preference, jargon preference, or an answer key during judge prompting. An author's stated intention is one piece of evidence, not a veto over a well-supported alternative reading. The `admissibleReadings` fields illustrate different permissible emphases; they are neither exhaustive nor a checklist.

Both provider judgments are required for a complete panel score. Retain each raw dimension rating and rationale, as well as their deterministic mean. Provider disagreement is reported, not resolved by requesting a more agreeable judgment or by having one judge rewrite the other. Judges may overlap with generator providers; disclose that dependence.

## Factual uncertainty

Judge evidence is deliberately bounded. Distinguish three cases: a claim contradicted by verified evidence; a consequential claim whose truth is unresolved; and a defensible interpretation of agreed events. A source packet's silence alone is not evidence of an error. Do not claim that a model has less training exposure because it makes a mistake or admits uncertainty.

A rationale should name consequential apparent errors and the supporting source/fact ID, and mark material unresolved factual claims plainly. A recalled detail can be identified as judge-recalled but unverified; confidence is not a substitute for a source. Uncertainty should affect confidence in the evaluation, and unsupported specifics should not create an automatic advantage in concrete support or depth. An answer that honestly lacks the work's content remains incomplete on the explanation dimensions; invented detail does not become preferable to admitting that gap.

Expose these notes with the score. Do not headline this edition as a validated factual-knowledge test. If a later audit adds evidence that materially changes scoring, freeze a new scoring edition and apply the same revised case packet and rubric to every affected answer, preserving the original judgments. Never quietly patch one contestant's facts, reroll its answer, or select the more favorable of two scores.

## Aggregation and missingness

For each answer, average the ten raw dimension ratings within each judge, then average the two judges. Multiplying that 1–10 panel mean by ten gives the 100-point display. A missing, malformed, unassessable, or incomplete judgment is null, not zero. A refusal or weak but assessable answer can receive actual ratings. Preserve the distinction between missing evidence and poor performance.

Within a case, average the predeclared trials equally. Within a configuration and condition, average the twelve case means equally: each work contributes exactly one twelfth, regardless of answer length, tokens, number of judgments, medium, or trial recovery attempts. If trials are uneven or cases are missing, show coverage and clearly label any available-case diagnostic mean; it is not the complete comparable headline score. Do not silently compare configurations on different subsets.

Calculate skill gain from the matched skill-minus-plain difference for each case/trial, then average within case and across the twelve equally weighted cases. Publish per-case gains and both judge ratings as well as the overall mean. The six-versus-six popularity-band and medium breakdowns are descriptive slices of this curated set; they are not independent experiments or evidence of a training-data effect.

A single trial per cell measures one realization. Additional predeclared trials estimate repeat variability, but twelve purposively chosen works still do not become a random sample. Judge spread is not a confidence interval. Do not interpret a small score difference or a tie as an established general model ranking.

## Recovery and accounting

Choose transport and quota recovery rules before scored execution. Keep every failed attempt and its reason. Reuse completed valid generations and substantive valid judgments byte for byte. Retry only the missing operational unit with the same frozen prompt/settings; a completed weak answer, honest lack of familiarity, or unfavorable rating is not a retry reason. Deterministic parsing of saved raw data is preferable when possible. Do not silently substitute models or providers during recovery.

Report quality together with completion coverage, elapsed generation/judge time, input/output/reasoning tokens when available, cache accounting, and actual or explicitly estimated monetary cost. Report skill input overhead separately. This run retains CLI-normalized usage: the original adapter replaced missing token components with zero, so saved zero components cannot be distinguished from provider-reported zeros. Fields absent from the saved receipt remain null; the raw stream needed to reconstruct field presence was not retained. Claude's cache-creation/cache-read fields and Codex's cache-write/cached-input fields keep their separate names. Token counts use provider-specific tokenization and are not a common unit across providers. Judge usage belongs to a matched-pair batch; when inspecting it on both answer records, deduplicate by judge and prompt hash before totaling it.

For a comparable answer-size measure, record full-answer Unicode character count and whitespace-delimited word count (`trim().split(/\s+/u)` for a nonempty answer), and retain exact answer bytes. Show per-condition distributions and per-case values; never multiply quality by words or divide it by length as if this removed verbosity bias. This experiment measures the practical frozen-skill intervention, including its extra input and any change in answer length. It does not separately identify a length-controlled content effect.

Publication should expose exact questions, full answers, anonymous judgments, per-case scores, missingness, all declared repetitions, resource accounting, and the frozen source/runtime identifiers. Preserve the pilot lineage separately. No selective case deletion, best-of selection, or undisclosed rerolls are permitted.

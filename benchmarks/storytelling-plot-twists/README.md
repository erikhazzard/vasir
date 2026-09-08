# Writing → Storytelling → Plot twists

Status: **preregistered-ready**. This is a declaration of the experiment, not a claim that generation, judging, or publication has completed.

The exact task is:

> Create a brief outline of a scifi story with one or more major plot twists

This is one prompt with repeated fresh generations. It is a separate benchmark from Core idea, which evaluates interpretation of existing works. The two conditions use the identical user message. The skill condition receives the frozen master `writing-storytelling` root and must successfully read the entire frozen `references/twists-and-revelations.md` before answering. Other references remain progressively available under the skill. There is no additional answer template, word cap, suggested plot, or coaching in the user message.

## Declared inventory

| Generator selector | Configured effort | Trials per condition | Generation rows |
|---|---|---:|---:|
| `codex:gpt-6-astra@ultra` | ultra | 10 | 20 |
| `codex:gpt-5.6-sol@ultra` | ultra | 10 | 20 |
| `codex:gpt-5.6-terra@ultra` | ultra | 10 | 20 |
| `codex:gpt-5.6-luna@max` | max | 10 | 20 |

The fixed inventory contains 80 generation rows in 40 matched trial pairs. Luna uses its supported `max` setting; there is no hidden fallback and no claim that all four generators use ultra. Ultra is a configured runtime mode that may include internal collaboration, so one CLI session is not necessarily one underlying model agent.

The two judges are `codex:gpt-6-astra@xhigh` and `codex:gpt-5.6-sol@xhigh`. Each receives each pair in a fresh blinded session, yielding 80 pair-level judge requests and 160 individual answer assessments. These are two seats from the **same provider**, deliberately declared because Claude Fable judging capacity was already exhausted in the predecessor experiment. They do not provide independent-provider validation. Judges receive neither the skill files nor generator/condition labels nor each other's assessments.

## Scoring and reporting

The scoring authority is [benchmark.json](benchmark.json): seven dimensions, integer 1–10 ratings, anchors at 1/5/10, weights of 10/10/20/20/15/10/15, and no semantic score caps. A single strong twist can earn full marks. The rubric rewards the requested brief outline, integrated science fiction, coherent causes, a consequential surprise, retrospective fairness, character stakes, and an intelligible outcome. It does not reward a required helix, craft jargon, greater length, more twists, dark themes, or a prescribed moral.

Each judge's score is `sum(weight × rating / 10)`, and the answer score is the mean of the two original judges. Assessable responses therefore occupy a 10–100 scale; 1/10 maps to 10/100. Missing judgments remain null. The primary effect for each configuration is the mean skill-minus-plain difference across its ten matched trial pairs.

Report all trials and answers, both original judges and their disagreement, per-dimension ratings, exact coverage and failures, word/character distributions, input overhead, usage, and latency. The predeclared 10,000-resample paired bootstrap is an informational interval conditional on this exact prompt and panel, with limited precision at ten pairs. It does not support broad storytelling or model-ranking claims.

The [methodology](methodology.md) defines blinding, matching, recovery and analysis. The [runbook](RUNBOOK.md) provides preparation and execution commands. Writing remains separate from Overall, and this new benchmark preserves the existing Core idea publication.

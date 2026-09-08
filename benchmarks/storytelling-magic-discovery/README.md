# First discovery of magic

This benchmark asks for an original fantasy novel synopsis or short outline about a world that has only just discovered magic. It measures creation on one fixed brief, with the ending included.

> Write a synopsis or short outline for an original fantasy novel set in a world that has only just discovered magic—akin to humans first encountering AI and large language models. Make it a compelling story, not just a description of the world. Include the ending.

The frozen design compares plain creation with access to the storytelling skill across 33 exact model/reasoning configurations and three trials: 198 requested stories in 99 matched pairs. Each pair receives four fresh judge requests: Astra xhigh and Sol xhigh, each in a skill-naive context and a skill-informed context. Complete coverage comprises 396 pair requests and 792 answer assessments, before operational retries.

Ten equally weighted dimensions rate the resulting story from 1 to 10. The task requires no particular moral, literal AI allegory, plot structure, cast, tone, or word count. A synopsis is judged as a synopsis; finished scenes are unnecessary.

The benchmark reports all three trial scores and paired differences, separate results for each judge context, and the balanced four-seat panel. Missing scores remain null. Three trials on one prompt support descriptive comparisons, not precise confidence claims or conclusions about general writing ability.

The source definition is [benchmark.json](./benchmark.json). The preregistered design and interpretation rules are in [methodology.md](./methodology.md); execution and coverage checks are in [RUNBOOK.md](./RUNBOOK.md). Source readiness does not mean a run is complete: the run manifest and retained result artifacts establish actual coverage.

## Execution status — 8 September 2026

The cohort is complete: 198 creator answers, 396 completed judge requests, and 792 answer assessments, with its immutable publication source selected. See the [results](../../docs/work/vasir-benchmarking/storytelling-magic-discovery/results/README.md), [independent quantitative check](../../docs/work/vasir-benchmarking/storytelling-magic-discovery/results/insights.md), and [runtime audit](../../docs/work/vasir-benchmarking/storytelling-magic-discovery/runtime-audit.md). This dated status does not change the preregistered design. The report is published, with separate [acceptance and live deployment evidence](../../docs/work/vasir-benchmarking/storytelling-magic-discovery/release.md).

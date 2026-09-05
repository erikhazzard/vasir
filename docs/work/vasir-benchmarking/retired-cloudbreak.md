# Retired Cloudbreak direction

Cloudbreak was retired on 2026-09-03.

The reference-anchored still-image judge and its reference board worked well. They are retained at `benchmarks/visual-judges/cloudscapes` for future visual-quality evaluation.

The surrounding benchmark process did not work. Its bespoke runner, capture and performance pipeline, publishing path, and standalone microsite added too much machinery for one task and integrated poorly with VasirBench's shared category, scoring, and report system. That machinery was removed and should not be revived as-is.

Any future visual benchmark must first prove one minimal integrated trial from prompt through score and the shared report. Add models, repetitions, performance instrumentation, retained playable artifacts, or special publication infrastructure only after that smallest path works and clearly earns the extra complexity.

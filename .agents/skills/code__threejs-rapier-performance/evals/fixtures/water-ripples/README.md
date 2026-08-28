# Water Ripples Static-Audit Fixture

This fixture is an unchanged copy of `/Users/erikhazzard/code/experiments/water-ripples/index.html` for blind control-versus-skill performance audits.

- Copied: 2026-08-26
- SHA-256: `c042d4811a5a3528836f2e231f8dccd92a10a7f47cc278e53f737b044e3d42fe`
- Fixture: `index.html`
- Intended seam: static code-reading behavior, without a runtime symptom, trace, browser run, or named defect

## Completed paired report

[Open the 2026-08-27 clean-vs-skill report](report/index.html). A fresh blinded comparison scored clean `11/20` and the skill condition `17/20`, a six-point skill win in static audit quality. Runtime performance was not measured.

Give control and treatment agents the same prompt and the fixture only. The control must not read repository skills. The treatment reads `SKILL.md` and its routed rendering reference, but not this README, the suite, or prior eval results. Precommit the judging rubric before either answer is exposed.

The fixture can prove whether the skill changes prioritization, mechanism accuracy, topology reasoning, calibration, and proposed falsifiers. It cannot prove an actual runtime bottleneck. Any claim about GPU time, frame pacing, thermal behavior, or device prevalence remains measurement-dependent.

When the source experiment changes, refresh the copy intentionally and update the hash. Never silently edit the fixture into an easier test case.

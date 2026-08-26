# Fog Static-Audit Fixture

This fixture is an unchanged copy of `/Users/erikhazzard/code/experiments/fog/index.html` for blind control-versus-skill performance audits.

- Copied: 2026-08-26
- SHA-256: `86ce30b297bbb40387612ab3316a4a156e65295287b2cee2e8bd193b7938fe36`
- Fixture: `index.html`
- Intended seam: static code-reading behavior, without a runtime symptom, trace, browser run, or named defect

Give control and treatment agents the same prompt and the fixture only. The control must not read repository skills. The treatment reads `SKILL.md` and its routed rendering reference, but not this README, the suite, or prior eval results. Precommit the judging rubric before either answer is exposed.

The fixture can prove whether the skill changes prioritization, mechanism accuracy, topology reasoning, calibration, and proposed falsifiers. It cannot prove an actual runtime bottleneck. Any claim about GPU time, frame pacing, thermal behavior, or device prevalence remains measurement-dependent.

When the source experiment changes, refresh the copy intentionally and update the hash. Never silently edit the fixture into an easier test case.

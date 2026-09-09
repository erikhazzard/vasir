# Homepage refresh

The homepage is a projection of the registered, selected benchmark publications.
Do not hand-edit Overall totals, category segments, benchmark rows, leader names,
counts, or generated JavaScript modules when publishing another benchmark.

## Refresh local data

From the repository root:

```sh
npm run benchmark:refresh
```

This runs the validated publication builder and synchronizes every generated
browser data/answer module. Unchanged files are not rewritten. It does not run
model generations, alter the selected evidence, or deploy to production.

```sh
npm run benchmark:check
```

The check mode performs the same source reconstruction without writing. It exits
nonzero when generated files are stale, making it suitable for a CI check after
benchmark publication selections change. A failed source validation stops the
refresh before any generated file is changed.

## What updates automatically

The normal publication build also reconstructs these values; refreshing checked-in
modules is not a prerequisite for the guarded production publisher.

- Overall's measured categories, normalized category weights, and stacked bars.
- Each exact model setting's paired category scores, total, uplift, and ranks.
- Complete and incomplete coverage counts as selected results become available.
- Benchmark test rows, category/track grouping, field averages, and paired leaders.
- Writing's registered test listings, tracks, edition links, and answer archives.
- The explicitly selected All Writing score basis and its benchmark weights.

Adding a test means registering its source/benchmark definition and selecting its
validated results in the publication catalog. It does not mean adding homepage
markup or another averaging formula. A genuinely new result format still needs
a validated source adapter; arbitrary files and unsupported experimental results
are not silently treated as comparable benchmarks.

## Score policy

Overall normalizes the existing category priorities over included paired-score
categories. Engineering and AI Workflows average their own benchmarks. Writing
uses the same versioned basis as its category page:
`writing-established-storytelling-v1` equally weights Core idea's published
single-judge provisional scores, the original Plot twists edition, and First
discovery of magic. The current normalized category weights are Engineering 50%,
Writing 25%, and AI Workflows 25%.

The compact five-task cohort has its own source adapter,
`cli/eval/writing-compact-publication.js`, and one immutable export selection at
`benchmarks/writing-compact-v1/publication.json`. It registers three separately
scored benchmark groups: Plot twists compact v2, Place generation, and One-shot
adventure outline. Once a group has a complete paired setting, its metadata and
responses join the shared page and report paths automatically. Its six-Claude
roster does not change the broad Writing roster, weights, or ranks. A future
broad score edition requires an explicit common-task basis declaration.

`prepareWritingCompactPublicationSource` archives an export only after the run's
writer lock is gone and returns a selection pin without selecting it. The export
retains the original manifest and attempts, the declared pre-inference amendment,
optional no-inference judge-validation sidecar, and any separately pinned healthy
continuation scope. A continuation cannot erase failed attempts or shrink the
six-setting, 60-answer plan. Host/network retries and Claude's internal
output-limit recovery are separate: the 8192-token segment limit is not a
whole-session token cap.

Live freezing validates the exact executor and sidecar source bytes. Subsequent
immutable rebuilds use `writing-compact-publication-validation-v1.js`, a
self-contained versioned validator with the reviewed source-hash registry and
the same original-record checks. Later changes to generic execution code cannot
invalidate or silently reinterpret this historical edition.

The old Dungeon Master study and original Plot twists report remain available
under Past editions, retaining all original answers and reviews. The original
Plot twists scores still belong to the established broad basis; Dungeon Master
does not. Historical collections without the new basis metadata retain their
original calculation for reconstruction.

Only complete paired configurations across the selected Overall benchmark set
receive an Overall rank. Missing scores are not zero-filled or used to change an
individual model's weights. The Games pilot remains separate because it lacks a
comparable plain-answer/skill pair. Task rubrics remain uncalibrated.

## Publication

Use the existing candidate capture, acceptance, and guarded publication workflow.
Compact acceptance requires all three registered reports at all three Writing
viewports, source-bound per-task browser evidence, and matching working and
archived bytes of `writing-compact-browser-evidence.mjs`. The four historical
Writing source validators and original report evidence remain mandatory.
The publisher rebuilds from selected evidence, checks the reviewed release hash,
and verifies the live site. Local refresh does not bypass review or auto-publish
every intermediate result. Source datasets and answer archives remain the source
of truth; generated homepage files are disposable.

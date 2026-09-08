# Core idea provisional score display contract

Status: implemented and published in release
`70a2d25557481e7dad63fab72d891c9629843e76d834f1ffe670a260d928ed8b`.
The existing layout owner's paired comparison is reused; an additive summary
on the leaderboard links directly to its expanded 31-setting table.

## Why the existing leaderboard is empty

The official comparison requires Astra xhigh and Fable 5.1 max to review both
conditions on all twelve stories. No configuration meets that requirement yet.
The 946 retained reviews nevertheless contain a complete, consistently judged
Astra-only comparison for 31 of 33 settings. Fable is session-quota limited.

## Display source

`window.VASIR_WRITING.provisionalLeaderboard` in `writing-data.js` is an additive
display basis. A category-wide collection retains it inside the corresponding
`writingCategory.publications` Core idea publication. It must not replace the
publication's official `entries`, `scoreBasis`, `coverage`, or `benchmarkResults`.

The block exposes:

- `label`, `detail`, `status: "provisional"`, `method`, `judgeConfigurationIds`;
- `sourceSha256`, `corpusSha256`, `skillSha256`, `caseIds`;
- `expectedCaseCount: 12`, `rankedSettingCount: 31`, `expectedSettingCount: 33`;
- `entries`: 66 condition entries with the same IDs and identity fields as the
  official entries. Only the 62 entries from complete 12-story settings have
  numeric scores and ranks. `exactScore` and `exactDelta` govern comparisons;
  rounded `score` and `delta` are for display. `eligibleForRank` is explicit;
- `incompleteSettings`: the two Opus 5 xhigh/max settings, each missing The
  Matrix; their eleven-story means are diagnostics only, never corpus ranks;
- `summary`: 31-setting plain/skill means 78.3 / 84.0, difference +5.7 points.

Render a visibly labeled **Core idea — Astra-only provisional results**
comparison, reusing the site's existing paired-score row presentation. Keep
the final two-judge scores and Writing development index separate. Do not let
these provisional scores enter the Writing or Overall aggregate. A benchmark
report link should retain access to the original answers and all reviews.

The block becomes null after the remaining second-judge assessments complete;
the official panel then supplies the available complete-corpus results. The two
generation failures still remain excluded unless a separate authorized edition
changes the experiment.

## Current source and expected numbers

Selected run SHA:
`0f29483fa808cf70d7431ff6a257b73e6d055585bbceab91c7183ba1bdc433e5`.

Core idea: 790/792 answers, 946/1,584 reviews, 158 complete two-judge answer
panels. The Core idea + Plot twists collection now has 1,098 retained reviews,
not the previous 1,056. Plot twists selection and results are unchanged.

Top provisional skill setting: Astra max, plain 83.1, skill 92.5, uplift +9.4.
Next: Astra ultra, 83.8 / 92.3 / +8.5. Use unrounded values for rank ordering.

## Checks before a shared fast publication

1. Validate the provisional block against original fixed-judge reviews; never
   average whichever judges happen to be available.
2. Confirm 31 numeric paired rows and two unranked incomplete settings, with an
   explicit provisional label and the twelve-story/single-judge basis.
3. Preserve official panel totals, Plot twists data, and the Overall projection.
4. Coordinate the shared presentation source with its layout owner, then use
   the fast publisher and verify the live response bytes and rendered numbers.

The user explicitly renewed deployment approval. The release was published from
a frozen presentation copy without replacing shared source or acceptance files.
Focused browser checks passed at 1440, 820 and 390 pixels. Fast publication
verified 16 files and reused 526 unchanged retained assets; no exhaustive Games
or canonical browser audit is claimed. Proof is retained in
`tmp/writing-score-release/`.

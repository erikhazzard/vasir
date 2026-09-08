# Storytelling aggregate and shared comparison rows

Revision: 8 September 2026. The available-score correction below supersedes the complete-cohort display gate. Earlier score contracts and release evidence remain historical and unchanged.

## Current correction: show available aggregates

The user explicitly rejected hiding models without every benchmark and requested aggregate scores from whatever results are available, with an asterisk for incomplete aggregates. The display now uses `available-paired-benchmark-mean-v4`: for each model, take the mean of its available complete published benchmark pairs. Both conditions use the same available test subset and equal weights within that subset. Every model with at least one such pair is ranked. Missing tests are omitted, not assigned zero; incomplete aggregates carry an asterisk. A short footnote explains that different models may be averaged over different tests. Coverage fractions and the unranked-model gate are not the main interface.

This displays all 33 Storytelling settings while preserving the Engineering-style comparison rows and the existing benchmark selector. Selecting a model shows its contributing scores and actual weights. Complete three-test scores remain unchanged. A model with Core and Magic but no complete Twists score receives the mean of Core and Magic, marked with an asterisk. No partial-trial total is invented to replace an excluded original benchmark result. Original publications, answers, reviews, trial exclusions, and Overall are unchanged. Provisional source qualification remains distinct from the incomplete-aggregate asterisk.

### V4 reviewed candidate

Candidate `f700a2497bccc5b5f1cff07720e1adc5df0824f9715b5865a362068d6c48a0ff` is retained at `tmp/writing-available-aggregate/candidate-01`. All 33 settings are ranked: two retain complete three-test means, 29 use two tests, and two use one test. The 31 incomplete aggregates carry asterisks. Astra Ultra is 90.0 → 94.7*, and Sol Ultra retains 72.3 → 91.2. Calculations use unrounded original totals.

All 63 focused projection, UI, acceptance, routing and site-lock tests pass. The separate original-source/archive/report suite passes 169 tests. The exact candidate passes all 32 canonical checks, twelve Writing browser runs (1,692 checks, all five score selections in each), and Games desktop/mobile checks with all ten clips advancing and all ten games accepting observed input. The acceptance retains 342 fresh screenshots. Independent receipt verification checks the actual one-, two-, and three-test formulas, all 33 ranks, partial-score markers, and original source bytes. Earlier release evidence remains unchanged.

### V4 live delivery

The guarded publisher successfully activated `f700a2497bccc5b5f1cff07720e1adc5df0824f9715b5865a362068d6c48a0ff` over the prior `3a0bc522…691dae` release on 8 September 2026. Fast delivery verification passed for 17 files, reused 526 retained artifact files, confirmed origin privacy, and released the lease without rollback. The full receipt is `tmp/writing-available-aggregate/candidate-01/publish-result.json`.

Separate live HTTPS desktop and phone browser runs each pass 141 checks. Both confirm all 33 Storytelling rows, 31 partial-score markers, all five selections, and the exact reviewed release paths, hashes, and byte lengths for all 21 recorded module loads (four distinct modules). The live Overall desktop check also passes. These are separate live browser proofs, not a claim that the publisher's fast mode performs browser auditing. Receipts are retained under `live-core-1440` and `live-core-390`. The temporary candidate server was stopped after verification. No original scores, source selections, answers, reviews, or excluded trials changed.

The following v3 contract and delivery receipt describe the prior release, not the current requested display policy.

## Requested correction

The user rejected presenting one Magic benchmark as a Storytelling aggregate and asked for Engineering's compact baseline-circle / skill-square comparison rows. Storytelling must combine its benchmarks. A score selector can expose individual benchmarks and separate tracks without replacing the shared category header and view tabs.

## Historical v3 score contract

`selected-benchmarks-equal-weight-complete-paired-index-v3` uses every published benchmark belonging to the selected track, with equal benchmark weights. The default Storytelling score is `(Core idea + Plot twists + First discovery of magic) / 3`. Dungeon Master is a separate selection, not an additional Storytelling input. Selecting an individual benchmark uses only that test and labels it by its own name.

Each source uses one published basis uniformly across models and both conditions: complete official pairs when available, otherwise complete pairs from its published provisional leaderboard. A model missing any selected input receives no aggregate or rank. There is no zero filling, extrapolation from incomplete trials, per-model fallback between judge panels, or available-only averaging. Original scores, panels, source selections, answers, reviews, and exclusions are unchanged. Different rubrics and review panels remain uncalibrated to one another; Writing remains excluded from Overall.

At this checkpoint, Core's complete 12-story, single-Astra-judge comparison is provisional. Therefore the Storytelling aggregate is explicitly provisional. Only Sol Ultra and Luna Max have complete paired scores on all three tests. Their plain-to-skill scores are respectively **72.3 → 91.2** and **70.8 → 85.3**, calculated from unrounded source totals. Individual selections preserve access to Core's 31 complete settings, Twists' two, Magic's 33, and Dungeon Master's one. Partial original results remain evidence, not ranked aggregates.

## Presentation contract

- Writing and Engineering use the same compact comparison-row renderer, marker positions, typography, and responsive layout. Overall retains its category stacks.
- A native score selector sits inside the leaderboard, below the shared header and Leaderboard / Benchmark tests / Efficiency tabs.
- Selecting a model shows its contributing benchmark scores, each weight, and the aggregate calculation. Benchmark tests' field means are explicitly a different population and are never used to compute a selected model's score.
- Scores and displayed ranks use the selected benchmark set. Missing evidence is not represented by empty bars or invented numeric totals.
- Original report routes and answer/review access remain available, including results outside the selected score.

## Verification and delivery

Independent arithmetic checks cover all score selections, complete paired intersections, uniform provisional/official source selection, exact totals, ranks, resources, and original archived evidence. Browser checks additionally exercise the selector, compare row geometry to Engineering, measure marker placement, and verify each selected-model component sum at desktop, tablet, and mobile widths.

The accepted candidate is `3a0bc5226bbdf6ba2b1f2b65b41462c75d5d9bf5f14228e82658753736691dae`, retained under `tmp/writing-story-aggregate/candidate-02`. It contains 16 public files (22,867,486 bytes; 295,038 compressed landing bytes). Its renewed acceptance retains 342 fresh screenshots: 32 canonical cross-page captures, 240 from twelve Writing runs, and 70 from two Games runs. The twelve Writing runs pass 1,692 checks, including all five score selections on every run. Both Games runs observe all ten clips advance and all ten games load and accept input. All 56 focused projection, UI, navigation, acceptance and lock tests pass; the separate original-source/archive/report suite passes 156 tests.

The final candidate's immutable screenshots and receipts are copied under `site/vasirbenchmark.com/reviews/writing-category/3a0bc5226bbdf6ba2b1f2b65b41462c75d5d9bf5f14228e82658753736691dae`. Previous accepted captures remain untouched. The independently implemented acceptance arithmetic is hash-pinned in every Writing receipt and archived beside them.

Early previews, the canonical run with the stale prior status-label expectation, and Games runs initially pointed at the wrong entrypoint are retained separately. They are not counted as passed or accepted evidence. Updating the canonical label assertion did not change candidate public bytes.

## Live delivery

The guarded publisher completed successfully on 8 September 2026, activating `3a0bc5226bbdf6ba2b1f2b65b41462c75d5d9bf5f14228e82658753736691dae` over `3f64a9b387936f5c7af4a94428d4dd82df1676987958f4e7fab175dd1466b1dd`. Its fast delivery verification checked 17 files, reused 526 retained artifact assets, confirmed origin privacy, and released the publication lease. No rollback was needed. Full receipt: `tmp/writing-story-aggregate/candidate-02/publish-result.json`.

Separate live HTTPS browser runs for Core desktop, Core phone, and Magic desktop each pass 141 checks, including all five score selections. Each run's six loaded assets match the reviewed release's exact paths, byte lengths, and hashes. The live Overall desktop canonical check also passes. These are separate browser proofs, not a claim that the publisher's fast verification performs browser testing. Receipts are retained under `live-core-1440`, `live-core-390`, and `live-magic-1440` in the candidate directory.

Both temporary preview servers were stopped cleanly. Original scores, selected source files, answer/review archives, and historical evidence remain unchanged.

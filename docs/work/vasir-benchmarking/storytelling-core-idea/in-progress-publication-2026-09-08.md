# Writing in-progress publication

The user explicitly approved publishing the available benchmark evidence before
the remaining Fable reviews finish. This is presentation acceptance for an
in-progress checkpoint, not final scoring acceptance.

## Selected evidence

- Run: `storytelling-core-idea-v1-2026-09-07`.
- Immutable source SHA-256: `62a85ad22f3b07fbb0e45ef43c1e817fee72891d71eedc363410755ad8da0916`.
- 33 configurations, 12 stories, two conditions: 792 planned answer slots.
- 790 completed answers; two retained provider-output-filter failures.
- 904 original individual reviews: 394 Astra pair batches and 58 Fable pairs.
- 116 answers have both required reviews; 672 have only one required review.
- 336 Fable pair batches remain missing (672 individual reviews).
- Eight other planned reviews are unjudgeable because two generation pairs
  are incomplete. The full 1,584 planned-review denominator remains visible.
- Zero model configurations have complete same-corpus panel coverage; their
  aggregate scores, ranks and efficiency-frontier entries are withheld.

Available case-level panel scores, exact answers, original reviews and frozen
skill references remain inspectable. Writing is excluded from Overall. Games
and Overall data match the previously live release; the Games report's Writing
navigation placeholder becomes an ordinary link. No provider calls or scoring
changes were made for this release.

## Candidate and local proof

Release: `5e0ec92e87ef4af1c0a53d4a40c8fa88b9692ed354571fcdb47cc736fffefe1e`.

Private proof root:
`tmp/storytelling-release-rehearsal/in-progress-candidate-2026-09-08-v3/`.

The ordinary artifact builder produced 15 public files totaling 13,146,215 bytes;
compressed landing dependencies total 283,629 bytes, below the 300,000-byte cap.
Writing's two lazy bundles are explicitly allowed by the production CDN router.
The regression test executes the actual CloudFormation router and checks every
public file, stable HTML routes, forbidden paths and the Games-to-Writing link.

Writing passed 124 browser checks at each of 1440×1000, 820×1000 and 390×844.
The proof retains 13 canonical and four supplemental failure screenshots per
viewport. Its 40 transport checks verified immutable delivery; all 81 browser
requests completed without failures or apex-script fallback. Visual review
covered progress banners and browse links, exact answers, full and partial judge
panels, and failed answers with their retained unscored counterparts.

Games passed 32 checks at desktop and mobile sizes. All ten video clips advanced
and all ten games loaded and received observed input, with no browser, media or
coverage errors. These delivery checks do not assign gameplay quality scores.

Candidate `da6fc41f…375f2e` was superseded after visual review found a stale Games
navigation label. The v2 packaging attempt then correctly rejected a noncanonical
relative HTML link. The v3 candidate uses the existing `index.html#…` convention;
the validator was not weakened. Earlier proof directories remain unchanged.

## Release state

All 32 shared-page capture checks passed with source hashes unchanged. The two
historical Engineering-only publisher fixtures were updated to keep their
temporary navigation consistent with their intentionally absent Writing data;
all ten publisher tests passed without changing production validators.

Concurrent Plot Twists and Dungeon Master work changed shared CLI and site
files after the candidate was reviewed. The release therefore executes the
reviewed Git-index CLI snapshot (73 files, canonical manifest SHA-256
`a049f62ac7f860a7f9c87fcb915a4b38e5359f1dc0f830ae17adc2fa653736d1`)
through a pinned module loader. A recoverable directory exchange preserves the
entire concurrent site and temporarily places the reviewed source at its normal
path. Original evidence paths, receipt bytes and all production validators stay
unchanged. Complete inventories guard the exchange and restoration; only the
new acceptance lock and accepted captures are carried into the restored site.
Concurrent CLI changes remain unstaged. Private isolation receipts are under
`tmp/writing-release-finalize/` and are not public benchmark evidence.

The final acceptance helper has SHA-256
`df28caccf14a80f6f5dc3df5efeaa62bfe55099dc89adc36cf5dd52fbd109edb`.
Its 32 tests include the legitimate report setting query and rejection of
unknown selectors, extra parameters and mutable/mixed-release asset URLs.
Acceptance was applied to 15 locked source files and 60 captures. The guarded
production dry-run passed for the exact release above in account `339713108333`
with no AWS mutations.

The reviewed implementation and site were committed and pushed as `acce187`.
All 505 staged test cases passed across the full run and targeted reruns:
the initial run passed 500; the remaining five cleared after installing the
accepted lock, using the reviewed template snapshot, and preserving original
module URLs in the one-release loader. These were isolation/timing corrections,
not ignored failures. The loader's SHA-256 is
`31ebe4196464a1bdc67fea19689a6e2c8fdce93eb590762d2f1d575786cca97d`.
A clean checkout uses the normal publisher; this temporary loader is not a
production dependency.

## Fast publisher correction

During the initial deployment the user explicitly rejected exhaustive retained
asset checks on routine publication. The old process was stopped during its
read-only retained-asset staging phase, before activation. Its exact publisher
and AWS child exited; the previous active/verified release was rechecked and
only that process's lease was conditionally released with its freshly read ETag.
No published asset was deleted or replaced. Private recovery proof is in
`tmp/writing-release-finalize/stopped-owner-3kHUeM/`.

The revised default reuses unchanged verified assets, checks ownership at phase
boundaries, uses checksum-validated conditional uploads, and batches live HTTP
checks eight at a time. One retained HTML isolation probe remains. Browser and
exhaustive retained-asset checks require the explicit `--full-audit` option.
All 25 focused publisher tests and five CLI option tests pass. A complete
simulated publication uses 44 AWS CLI invocations and 25 HTTP requests with
either two or 527 retained assets, and zero browser launches. These are mocked
request counts, not measured production timings. The old retained-asset loop
alone required 1,581 AWS CLI invocations for 527 files.

The fast release uses the same 73-file snapshot mechanism with manifest SHA-256
`9f74dd631fd138a84b6b66794dccead7711590b6e0dd4a98db32d75998b33118`;
only the publisher and its two CLI entry modules differ from the prior reviewed
snapshot. Candidate website bytes and selected results are unchanged.

## Published

Fast publisher commit `96e4223` was pushed and used successfully on 2026-09-08
at approximately 01:21 UTC. Staging completed in under one minute; the entire
run took approximately two and a half minutes including AWS/CloudFront
propagation. The active release is `5e0ec92e…fffefe1e` above. All 15 site files
and one retained game HTML isolation probe passed live byte verification;
526 unchanged assets were reused. Origin privacy passed and the publication
lease was released. No live browser suite was requested or claimed.

A separate HTTPS read confirmed the new HTML release pointer and source-derived
Writing coverage: 790/792 answers, 904/1,584 reviews, 116 fully reviewed answers
and zero complete configuration rankings. The live route is
`https://vasirbenchmark.com/#capabilities/writing/storytelling`.

All concurrent website edits were restored and byte-verified. Only the accepted
lock and 60 capture files were carried forward into that restored worktree;
the publication source snapshot remains retained privately. Missing Fable
capacity continues to block final benchmark completion, not this explicitly
approved and now live in-progress publication.

## Score visibility follow-up, 02:08 UTC

The user reported an empty leaderboard. The selected checkpoint did contain
904 individual reviews, but no model setting had the complete two-judge panel
for all twelve stories. The projection consequently withheld every official
configuration total. This was a coverage gate, not missing model output.

A fresh Fable capacity probe succeeded. An identical-input, Claude-only judge
resume reused all 452 completed pair batches and completed 21 additional Fable
pairs before the provider reported its session limit (reset: 11:50pm America/
New_York). The run finished; no further requests were attempted afterward.
The 315 remaining batches retained explicit session-limit failures; the guard
had not recognized this wording and therefore did not stop their dispatch.
The resulting checkpoint is archived at source SHA-256
`0f29483fa808cf70d7431ff6a257b73e6d055585bbceab91c7183ba1bdc433e5`.
The prior `62a85ad2…da0916` archive and identical frozen skill remain retained.
There are now 946 individual reviews, 158 complete answer panels, and still no
complete official configuration totals. The two output-filtered generation
failures were not retried.

The quota guard recognized usage-credit/model limits but missed the provider's
explicit session-limit wording. That exact diagnostic is now covered by the
guard and focused regression tests, preserving the distinction from transient
request-rate errors. This change is execution-only, not a scoring change.

Score visibility is being implemented as an additive, explicitly provisional
Astra-only comparison: the same twelve stories, same original Astra xhigh
judge, and both conditions for 31 settings. The other two settings have
eleven-story diagnostics and remain unranked. Uneven partial Fable coverage is
not mixed into the provisional means. Original two-judge totals, corpus ranks,
review evidence, and Overall remain unchanged. Provisional plain/skill means
over the 31 complete settings are 78.34946236559139 / 84.02688172043011; the
paired difference is 5.67741935483871 points. This section records local work,
not a claim that the score-visibility release has been deployed.

The additive projection and generated bundles are now implemented and selected
from `0f29483f…c433e5`. Tests passed: all 29 Storytelling runner tests and 118
combined Writing/publication projection checks. An independent source audit
confirmed all 792 generation rows and all 452 previously completed review
batches are unchanged apart from review reuse flags. A live-versus-local
comparison confirmed exact preservation of Overall, Games, AI Workflows,
Engineering score basis/settings/results, and the Plot twists projection.

The renderer owner has a separate concurrent task. Semantic coordination calls
returned `codex_message_unavailable` (conversation not loaded); no presentation
files or acceptance locks were overwritten. The user was asked to open that
session. The implemented data interface and remaining integration checks are
documented in [provisional-score-contract.md](provisional-score-contract.md).
No score-visibility deployment is claimed until the display is connected and
the shared release has been verified live.

## Score visibility published after renewed approval

The user explicitly authorized deployment/commits while preserving concurrent
work. The current combined presentation and selected Core, Twists and DM sources
were captured in an isolated copy; the layout owner's original paired-score
renderer was reused. A compact summary now appears above the Writing index and
opens the existing 31-setting comparison in one click. Two incomplete cohorts
remain unranked, and the provisional results do not enter either index.

Release `70a2d25557481e7dad63fab72d891c9629843e76d834f1ffe670a260d928ed8b`
was activated successfully. Focused local browser checks verified the exact
candidate at 1440, 820 and 390 pixels, including all 31 numeric pairs, two
diagnostics, correct source coverage, exclusion from the index, and absence of
page overflow/runtime errors. The fast publisher reported 16 verified files,
526 reused unchanged assets, private origin, and released ownership. Production
HTML independently resolved to the expected release.

The accepted frozen receipt and actual proof remain under
`tmp/writing-score-release/`. The shared presentation files, historical captures
and template lock were not replaced. This records focused score validation, not
another exhaustive canonical/Games audit. The direct score URL is
`https://vasirbenchmark.com/?writing=storytelling-core-idea#capabilities/writing/benchmarks`.

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

Guarded deployment verification is recorded below when completed. Local browser
proof alone is not a live-release claim. Missing Fable capacity continues to
block final benchmark completion, not this explicitly approved in-progress
publication.

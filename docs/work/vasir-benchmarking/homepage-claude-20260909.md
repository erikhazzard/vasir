# Claude homepage visibility and Writing workload audit

The user reported that Claude models were absent from the Overall homepage and
asked how many prompts remain and why the short Writing tasks consumed so many
tokens. No benchmark generation, judging, retry, or source selection was started
by this change.

## Cause and presentation fix

The previous homepage had 19 complete ranked settings, none Claude. Its default
top-ten list and expanded ranked list therefore contained no Claude. All 21
Claude source-identity records appeared farther down in an unhelpful coverage
table of unavailable Overall totals.

- The shared stacked leaderboard now has an All models / Claude / GPT filter.
- Incomplete models use the same paired model-row frame with complete category
  scores; incomplete categories are hatched and show their scored test counts.
- Category scores require both conditions on every category benchmark. Missing
  values remain unknown; no partial Overall total, uplift, or rank is invented.
- Original test-level scores and missing-test links remain in compact details.
- Category links preserve the model selection, including original Writing IDs.
- A visible shortcut brings readers directly to the available-results rows.

Five Opus identities were also incorrectly split: `claude:opus@effort` and
`claude:claude-opus-5@effort` are registered selectors for the same canonical
target. The registry and original selected execution receipts prove this. The
adapter joins only those five same-effort identities, records the versioned
alias policy, and preserves each original Writing configuration and setting ID.
Different Fable versions are not combined. The Overall roster becomes 39 unique
settings: 19 complete and 20 incomplete, including 16 Claude settings. No score
changes and no new Claude ranks result from identity normalization alone.

## Remaining Writing calls

The read-only audit at 2026-09-09 12:12:47 UTC found:

| Benchmark | Planned Claude generations | Valid outputs | Recoverable unfinished generations |
|---|---:|---:|---:|
| Core idea | 240 | 238 | 0 |
| Plot twists | 200 | 79 | 112 |
| Magic discovery | 60 | 60 | 0 |
| Dungeon Master | 320 | 48 | 265 |
| Total | 820 | 425 | 377 |

Of DM's remaining 265 generations, 99 are primary and 166 supplemental. Across
Writing, therefore, 211 primary and 166 supplemental generation slots remain
recoverable. The total is 376 pending plus one retained quota failure. Eighteen
generation refusals are terminal, not retryable. Some original panels cannot
become complete because they contain these retained refusals.

Reviews are separate: 96 Claude Fable Max Core review calls and 452 Codex review
calls remain potentially actionable across the full registered matrix, assuming
their prerequisite generations succeed. Three Core review refusals remain
terminal. A fresh informal plain/skill sample needs only two generation calls;
it is not a complete score under the existing repeated-trial protocol.

For example, Fable xhigh's missing score dependencies are 19 Claude generations
and 26 Codex review calls using the already-published Core scoring basis. This
is not a promise that the frozen DM scheduler can dispatch exactly those calls
next: its seeded ordering and quota gates remain unchanged.

## Recorded resource overhead

Twists skill generations read 121,033 bytes in 16 separate tool reads. All 35
successful Claude skill generations recorded 17 turns. Their median recorded
total was 105,994 tokens versus 5,868 for plain answers. One Opus high example
had a 74-byte user prompt, a 5,060-byte answer, and 170,614 recorded total tokens.
High-effort reasoning is another multiplier: a DM Fable Max example recorded
51,552 output tokens, including 45,600 reasoning tokens.

Successful Claude generations recorded 12,623,022 tokens; completed Core Claude
judging recorded another 5,968,454. These include cached reads and are not a
billing or quota-credit ledger. Failed attempts are outside those success-only
totals. The obvious next-run improvement is to preload the same relevant skill
content once instead of driving 16 read-and-reason turns; changing the frozen
experiment protocol must remain explicit, not silently mixed into old results.

Detailed audit: `tmp/claude-writing-remaining-20260909/audit.json`, SHA-256
`9347663f4cf59d87c4bb4e7fe7ced4696daa99bf49aa290ca913f3a48deb36e8`.
All four inspected runner lock files were absent. No capacity assumption or
provider dispatch was made from this read-only audit.

## Verification and release

Candidate01: `15a9d6e3fdeea110f11c780c677d93434971b5b925b741170e0a15b95f84c210`.
Its full browser suite passed, but independent visual review identified two
small usability issues: mobile category abbreviations were hidden, and category
links selected the correct Claude result without scrolling it into view.

Candidate02 fixes both and is the reviewed publication candidate:
`a716c9d2eb02d67b27dcf0723fc45325a4b08f6fa97893282228fd6b8e00bb50`.
All 32 canonical views, 12 Writing browser runs, and two Games runs passed. The
Writing/Games suite covered 2,005 checks with no errors. Acceptance retained
372 captures; the exact site-lock suite passed all 15 tests. Independent visual
checks at 1440px/390px verified 192 category slots and six real category links,
including visible, focused Claude destinations and readable mobile labels.
The compressed landing bundle remains inside the unchanged 300,000-byte limit
at 290,237 bytes. Source/unit/publisher tests also passed; no source answers or
judge records changed.

Evidence root: `tmp/homepage-claude-20260909/`.

The guarded publisher completed successfully at 2026-09-09 12:38:38 UTC,
replacing `22a7c6242cc810e9f9d678b30e8cee6f62f98303d557a819a96aaa3932a01342`
with Candidate02. The full production audit passed: 545 files, nine report
routes, 15 capability routes, and live browser verification. The publication
lease was released normally.

Independent live checks at 1440px/390px also passed on the exact release: all
16 Claude settings, 192 category slots, readable mobile category labels, and
six source-correct category links that reveal and focus the chosen Claude row.
No runtime, network, overflow, or score/rank failures were found.

Release receipt: `tmp/homepage-claude-20260909/candidate-02/publish-result.json`.
Live proof: `tmp/homepage-claude-20260909/live-01/visual-review.json`.

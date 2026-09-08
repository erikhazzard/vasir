# Scored Writing site: final QA and acceptance checklist

Prepared while generation and judging continue. Do not renew the shared acceptance lock, alter the selected Games evidence, or publish until the root coordinator signals a stable final Writing checkpoint and completes Games coordination.

## 1. Pin the final evidence

Use the runner's actual final checkpoint directory, after checking every declared slot has its real completion, failure, or unavailable status and every expected judge batch has its actual status. Do not insert scores for missing panels or silently replace a requested model/effort. Configuration comparisons require both conditions on the same complete 12-story corpus; Writing remains outside Overall.

From the repository root, the selection command is:

```bash
node cli/eval/select-storytelling-publication.js --project-root /Users/erikhazzard/code/vasir --run-directory "$writing_run_directory"
```

`writing_run_directory` must be the coordinator-confirmed run directory, not an assumed “latest” path. This command validates and archives the exact `run.json` and `skill-snapshot.json`, updates `benchmarks/storytelling-core-idea/publication.json`, and regenerates these four inspection bundles:

- `site/vasirbenchmark.com/data.js`
- `site/vasirbenchmark.com/responses.js`
- `site/vasirbenchmark.com/writing-data.js`
- `site/vasirbenchmark.com/writing-responses.js`

Record the new source hash and actual coverage. Confirm the underlying Overall, Engineering, AI Workflows, and selected Games projections are unchanged. Generated bundles are source-validated evidence, not byte-locked presentation files.

## 2. Build and rehearse the immutable candidate

Run the focused source tests, then build through the ordinary artifact builder without renewing acceptance:

```bash
node --test test/writing-publication.test.js test/storytelling-benchmark-runner.test.js
node --input-type=module -e 'import { buildBenchmarkPublicationArtifact } from "./cli/benchmark-publication-artifact.js"; const a = buildBenchmarkPublicationArtifact({ repoRootDirectory: process.cwd(), validateAcceptance: false }); console.log(JSON.stringify({ releaseId: a.releaseId, directory: a.temporaryDirectory, files: a.fileCount, totalBytes: a.totalBytes, compressedLandingBytes: a.compressedLandingBytes }, null, 2));'
```

Keep the candidate. Serve its transformed HTML at ordinary entrypoints and its immutable files only at `/releases/<release-id>/...`, with the production apex CSP. Reject apex JavaScript/CSS paths and verify every served file against the artifact hash, as in the [552-answer immutable rehearsal](site-release-qa-552-2026-09-07.md). Do not use an apex-only static server as proof of release-local lazy loading.

For the resulting `writing_qa_url` and a fresh `writing_qa_directory`, run:

```bash
node site/vasirbenchmark.com/writing-browsercheck.mjs --url "$writing_qa_url" --output-dir "$writing_qa_directory/desktop" --width 1440 --height 1000 --require-scored
node site/vasirbenchmark.com/writing-browsercheck.mjs --url "$writing_qa_url" --output-dir "$writing_qa_directory/mobile" --width 390 --height 844 --require-scored
node site/vasirbenchmark.com/writing-browsercheck.mjs --url "$writing_qa_url" --output-dir "$writing_qa_directory/tablet" --width 820 --height 1000 --require-scored
```

The harness verifies complete-corpus means, exact-score competition ranks/co-leaders, panel totals derived from ten weighted ratings, per-story ranks/paired deltas/field means, judge disagreement, and both latency/token frontiers and selection links. Existing checks still compare every saved answer, question, rating, rationale, runtime field, usage field, anchor and archived skill file against the actual source. Inspect `scoredBranchCoverage`; do not reuse a prior unscored receipt or claim an unobserved tie/regression was exercised. Check actual Claude answers and runtime/reference behavior in the final archive as well as the automatic selected example.

Terminal generation failures receive source-exact label checks and `caseEvidence[].failures` records, including the paired answer's retained availability. Actual failed/unavailable cells also produce hashed supplementary `failureScreenshots` for the failed response and any retained paired answer. These do not enter the canonical 13 `screenshots` or the 60-image acceptance list. Review them separately. A provider-filtered response must not be retried or rerouted, silently removed, presented as a scored answer, or used to rank its incomplete configuration.

Rejoin browser-loaded byte hashes and request paths to this exact candidate. Recheck all current limits: 15 files; 2 MiB per ordinary file; 8 MiB for each response bundle; 16 MiB total; 300,000 compressed landing bytes. Retain actual measured totals and headroom, not an old candidate's numbers. Visually inspect leaderboard/ranks, both efficiency axes, a full two-judge report, disagreement, mobile answer readability, reference files and execution/resource disclosures.

## 3. Refresh the shared capture evidence

After the final four bundles are regenerated, the canonical command is:

```bash
bash site/vasirbenchmark.com/capture.sh
```

It performs 32 checks: 24 persisted desktop/mobile homepage/report images and 8 transient 820px checks. It includes the Writing-aware native-category and keyboard-navigation regressions, but does not generate Writing's dedicated captures or the Games watch/play report captures.

Coordinate the separate Games rehearsal with its owner:

```bash
node site/vasirbenchmark.com/games-browsercheck.mjs --url https://vasirbenchmark.com/games.html --local-artifacts "$games_pinned_manifest" --output-dir "$writing_qa_directory/games-desktop" --width 1440 --height 1000
node site/vasirbenchmark.com/games-browsercheck.mjs --url https://vasirbenchmark.com/games.html --local-artifacts "$games_pinned_manifest" --output-dir "$writing_qa_directory/games-mobile" --width 390 --height 844
```

The Games adapter accepts either the original 13-file site manifest or the full 15-file candidate manifest. It verifies and serves the 13-file Games scope and explicitly excludes only `writing-data.js` and `writing-responses.js` in `delivery.siteScope`; Writing has its own proof. Use genuine production hostnames for origin/CSP testing. For an immutable candidate, its verified HTML supplies the release ID (or validates the manifest's optional `releaseId`), and non-HTML files are mapped only at `/releases/<release-id>/...`, with no apex JS/CSS aliases.

Build `games_pinned_manifest` from that same retained candidate, not the working site directory: `siteFiles` records use each artifact `files` entry's `path`, `bytes`, `sha256`, `contentType`, and `sourcePath: outputPath`; `artifactFiles` likewise use each candidate artifact entry's `key`, `bytes`, `sha256`, `contentType`, and `sourcePath: outputPath`. The wrapper remains `kind: "vasirbenchmark-local-artifact-rehearsal"`, `schemaVersion: 1`, with `projectionSha256` computed from `JSON.stringify(window.VASIR_DATA)` evaluated from the candidate's pinned `data.js`. Include the candidate `releaseId`. Its selected media and playable artifacts must remain source-pinned; do not rerun historical Games selection scripts or replace its evidence with Writing-generated records.

The existing canonical acceptance image list has 34 paths: the 24 images produced by `capture.sh`, plus ten Games report/watch/play/fullscreen images. Preserve all 34. For final Writing presentation acceptance, add reviewed desktop/mobile copies of the following 13 outputs, prefixed `desktop-` or `mobile-` in the site directory, and add those same 26 paths to the exact `expectedCaptures` list in `test/vasirbenchmark-site-lock.test.js`:

```text
writing-models.png
writing-benchmarks.png
writing-efficiency.png
writing-efficiency-tokens.png
writing-report.png
writing-method.png
writing-rubric-anchors.png
writing-method-execution.png
writing-reference.png
writing-answer.png
writing-judgments.png
writing-judge-resources.png
writing-execution.png
```

This produces 60 accepted images if all proposed Writing states are included. Keep all three full Writing JSON receipts and their hashes in the acceptance verification evidence; the 820px captures can remain supplementary proof. Only copy reviewed captures from the exact final candidate; do not bless a screenshot from a superseded source or renderer.

## 4. Renew acceptance once, after coordination

There is no generic acceptance-renewal CLI in the checked-in publisher. The historical `tmp/jump-completion-proof/accept-presentation.mjs` is not reusable unchanged: it restores an old before-lock and hardcodes a Games-only user basis and proof counts. Renew from the current shared receipt, preserving Games history and accurately citing the user's standing authorization and the new Writing review. Do not claim fresh human screenshot acceptance when the review was agent-performed.

`template-lock.json.files` must contain the exact union of these 11 non-generated public sources and four QA files, with fresh byte counts and SHA-256 hashes:

```text
app.js
assets/d3.v7.min.js
assets/kanit-latin-900-normal.woff2
benchmark-report.css
benchmark-report.html
benchmark-report.js
games.css
games.html
games.js
index.html
style.css
capture.mjs
capture.sh
games-browsercheck.mjs
writing-browsercheck.mjs
```

The current pre-Writing receipt lacks `writing-browsercheck.mjs`. Do not add the four generated data/response bundles to this presentation-file list. Refresh every accepted PNG's hash, byte count and viewport, and retain final Writing source/candidate/browser receipt hashes in verification metadata. Keep the required production identity (`vasirbenchmark.com`, `faedark`, existing CloudFormation topology).

Then run:

```bash
node --test test/vasirbenchmark-site-lock.test.js test/benchmark-publish.test.js test/benchmark-publish-state-machine.test.js test/writing-publication.test.js test/games-publication.test.js test/games-browser-rehearsal.test.js
npm test
npm run check:registry
git diff --check
node ./bin/vasir.js benchmark publish --dry-run
```

Resolve real failures; do not weaken acceptance or use the builder's local `validateAcceptance:false` rehearsal option as a publication bypass. The dry run is a build/read-only deployment plan, not proof of live delivery.

## 5. Publish and prove live delivery

Only the root coordinator performs `node ./bin/vasir.js benchmark publish` after acceptance and Games coordination. The publisher already performs exact uploaded-byte/route checks, ordinary shared capture checks, Games watch/play checks, and Writing browser checks at desktop/mobile sizes. Its built-in Writing calls are data-driven but do not request `--require-scored`; retain an explicit scored check against the final live URL if a hard scored-readiness receipt is required.

Final handoff must identify the source and release hashes, actual response/judge/configuration coverage, exact live receipt paths, any remaining unscored/unavailable rows, and any failed scored branch. Keep model-judged development scores distinct from human calibration and keep Writing outside Overall.

## Preparation verification

The later [790-answer interim failure-state rehearsal](site-interim-filter-qa-790-2026-09-07.md) passed 118 checks at all three viewports, including the actual two terminal failures, two retained counterparts, and 14 complete answer panels. Its source and captures remain diagnostic and unaccepted; it does not establish complete-configuration ranks or efficiency frontiers.

The expanded harness passed 114 checks against the retained real 552-answer/96-review immutable candidate without altering any scores. `--require-scored` correctly failed closed because that snapshot has zero complete configurations. Syntax, source-style and scoped diff checks passed. Receipts are under `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasir-writing-scored-qa-prep.D442UG`; these are harness-preparation receipts, not final scored evidence. No provider call, selected benchmark-source change, shared-lock renewal, or deployment was performed during preparation.

The Games manifest adapter has seven focused tests covering both manifest sizes, legacy apex and immutable mapping, all required files, unknown/duplicate/traversal paths, changed bytes/hashes, missing metadata, and declared/mixed/malformed release identities. They use the real checked-in site bytes without inventing any benchmark results. The adapter and Games publication suites passed all 33 tests together; source-style and scoped diff checks also passed.

### Games immutable-manifest compatibility proof

Both actual browser runs passed all 32 checks on 2026-09-07: desktop 1440×1000 and mobile 390×844. Each observed all ten clips advancing and all ten game documents loaded with browser input, with no delivery, media, runtime, or coverage failures. The full manifest contained 15 site files and 527 pinned playable/media files. Each run verified the 13-file Games scope, explicitly excluded the two Writing bundles, and loaded all five non-HTML site dependencies through `/releases/6e041f8ed6128c656e4e179f4c83958cfd5b306435d68eeae3e028f5f720a838/`, without an apex asset fallback. This is local immutable/CSP rehearsal, not a new live-deployment claim or a gameplay-quality assessment.

- Candidate: `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasirbenchmark-release.q8WnIT`.
- Manifest and build receipt: `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasir-games-immutable-manifest-qa.PrqUh3/{local-artifacts.json,candidate.json}`.
- Desktop receipt: `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasir-games-immutable-manifest-qa.PrqUh3/desktop/games-browsercheck-1440.json`; SHA-256 `0375ccfc6eddb9703ff47b814255e9406c94ee0b93270b6c5d2055a8226f3ebc`.
- Mobile receipt: `/var/folders/25/snsb8p8n1psg9ljhjxfl_9p80000gn/T/vasir-games-immutable-manifest-qa.PrqUh3/mobile/games-browsercheck-390.json`; SHA-256 `119a109b7f7ff7732ede7eb57ca0d737c146a947e69f3f98bb3072842aab7aac`.
- Harness SHA-256 for both receipts: `dab6036e0032b374cf46104f08552ef29a220857ccff1ba1b1122e5465cc3c0a`.

The rebuilt public artifact remains 11,061,724 bytes, with 283,004 compressed landing bytes (16,996 bytes of headroom); the selected 527 Games artifact files total 64,306,438 bytes. These are measurements of this preparation candidate, not promises about the final scored source. The run created no source-data, Games asset, acceptance-lock, or deployment changes. Repeat the commands above against the final source before renewing its presentation acceptance.

### Provider-filtering disclosure preflight

At 2026-09-07T23:30:12Z, a read-only in-memory projection of the continuing production run (source SHA-256 `97cec53a6f13504d6a2981d42b77b9878c3372d85e638ff4706aa078872efa12`, 751 completed answers at that read) verified both `The Matrix` / Storytelling skill failures for `claude:claude-opus-5@xhigh` and `claude:claude-opus-5@max`. Their explicit recorded terminal HTTP 400 output-filtering errors produce only: “Provider output filtering blocked the response; no final answer was returned or scored.” Each retains its original one-attempt error status, empty answer, null score/runtime, zero judgments, and unranked configuration. The available plain counterparts remain unscored and unmodified (349 and 389 words respectively at that checkpoint).

The narrow classification requires the actual provider/runtime error code, HTTP 400, terminal-result/error markers, and exact recorded filtering message; it does not publish raw stdout, stderr, session details, or the API diagnostic. Fourteen negative/error-label regressions plus the disclosure test passed within the 87-test Writing publication suite; the source-style check also passed. No provider call, run/corpus/score/selection edit, generated bundle update, or acceptance change was made for this preflight. Final selected-source browser evidence must still exercise these states.

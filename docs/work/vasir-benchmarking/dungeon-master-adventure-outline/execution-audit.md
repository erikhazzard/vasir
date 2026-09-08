# Execution history audit

The completed study contains 32 adventure answers and 32 paired judge reviews. Each review assesses two candidates, producing 64 candidate assessments. Completion required **87 benchmark generation/judging attempts: 64 successful units and 23 quota failures**. Isolation preflights, setup attempts, the readiness probe, and any underlying provider agents are excluded from that attempt count.

This audit inspected execution metadata, hashes, and failed error events. It did not inspect numerical ratings or judge prose. [Machine-readable evidence](execution-audit-evidence.json) contains the reconciled counts, independent checks, source lineage, and a concise public disclosure.

## Intended policy and actual execution

The frozen methodology allowed one technical retry for specified transient or missing-answer failures and prohibited automatic quota retries. The actual execution did not fully follow that rule. Quota failures appeared in retained provider error events but were normalized by the adapter as `EVAL_AGENT_RUNTIME_FAILED` with a missing-final-answer message. The original judge runner consequently retried ten failed reviewer seats once each. Those ten automatic retries were contrary to the frozen quota-retry rule.

All 23 original failed streams were checked and contain quota/usage-limit evidence. None contains a completed final answer. The frozen protocol was retained unchanged so the discrepancy remains visible.

| Execution phase | Writer attempts | Judge attempts | Successful units | Failed attempts |
| --- | ---: | ---: | ---: | ---: |
| Original execution | 32 | 36 | 45 | 23 |
| Authorized operator recovery | 3 | 16 | 19 | 0 |
| Completed study | 35 | 52 | 64 | 23 |

The original execution retained 29 valid answers and 16 valid reviews. Three writer positions had failed. Ten judge positions had failed twice, and six more lacked a completed candidate pair. After credits resumed, a separately recorded controller made one explicit attempt for each of the three missing writers and sixteen missing judge jobs. It made no automatic retries and encountered no further failure. This was an authorized recovery after interruption, not a reroll of valid content.

Independent hash checks confirm that all 29 original valid writer records and all 16 original valid judge records remain unchanged. The original failed-attempt prefixes remain retained. The recovery audit also verifies preservation of 181 archived raw-stream and answer files. No completed weak answer, unfavorable review, or incomplete required-read receipt was replaced.

## Isolation, binding, and limits

All 64 successful units have fresh-session receipts, distinct retained session identifiers, `persistedSession: false`, and fresh temporary working directories. Writer prompts and exact normalized final-answer hashes match their receipts; judge prompt and review hashes also match. All sixteen pairs have complete panels with reversed candidate order across the two reviewer seats.

These receipts document an explicit CLI request for Astra at Ultra effort. All 64 mark model and reasoning verification as `explicit-cli-request-only`; they do not independently attest to backend model identity. The two reviewers use the same model family and may share biases. Fresh CLI sessions also do not establish how many internal agents the provider used. Recovery's observed concurrency limit was four; that statement applies to the recovery controller.

Fifteen of sixteen skill answers have complete required-reference proof. The original incomplete receipt is preserved and its valid answer remains included under the frozen intention-to-invoke policy. Missing proof is not proof of refusal. Published answer text is the adapter's normalized final message, which trims surrounding whitespace; original provider streams remain privately retained.

## Source lineage

All twelve frozen runtime dependency files still match their manifest pins. Recovery used the frozen inputs and retained original helper, with a separately hashed controller. It did not silently replace the original implementation.

| Source | Raw file-byte SHA-256 |
| --- | --- |
| Original judge helper | `08445a51276fd99eb99333e09da8454dfd0dc4ede93f0330dc0944c82b43b6ba` |
| Recovery controller | `dc7a26a1e2cc333185bb8c3a7ea18068486fc1dc6c0d438b75c85dbef8a6f5ea` |
| Timestamp reconciliation helper | `d529af6d2606993a3b491bfdc97a81178fde3695d3db5e9ab176720523b53bcb` |

The original recorded judge `runnerHash`, `84acf9a5f24d9e89be12fa1e8a9c1df62b177e798e8d7a26c0b74ffd6b273f39`, used SHA-256 over `JSON.stringify(Buffer(source))`. It is preserved exactly. The different raw-byte hash above identifies the same 13,326-byte source file using the conventional byte encoding; the two values are not evidence of different helper versions.

One final metadata correction aligned `run.judging.updatedAt` with the completed separate judging checkpoint. Its helper, before/after run hashes, old/new timestamps, and confirmation that judgments were unchanged are recorded separately. It changed no review or score.

The final source checkpoint hashes verified by this audit are:

- `run.json`: `0a78c5dba07da35e01448fcf6e2ab3ed16b248156089ecbb97b7e37ccbd0b95a`
- `judges.json`: `44fc6639a4afcb2963621a07dc3d24444cfce0d0b9bfe09bc9dabbf5781455ce`

The public disclosure should retain both facts: the automatic quota retries departed from the intended rule, and the later recovery preserved all valid results without quality rerolls. Raw local paths, session identifiers, account details, and provider streams are excluded from these report files.

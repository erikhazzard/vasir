# Dungeon Master adventure-outline benchmark

The completed benchmark is live under Writing / DUNGEON MASTER:
https://vasirbenchmark.com/benchmark-report.html#dungeon-master-adventure-outline

## Results and original evidence

- [Performance table and limits](results/results.md)
- [Independent qualitative audit](qualitative-audit.md)
- [Execution audit and protocol deviations](execution-audit.md)
- Frozen benchmark definition: `benchmarks/dungeon-master-adventure-outline/`
- Final experiment: `.agents/vasir-evals/dungeon-master-adventure-outline/dm-outline-v1-2026-09-08/`
- Final run SHA-256: `0a78c5dba07da35e01448fcf6e2ab3ed16b248156089ecbb97b7e37ccbd0b95a`
- Final judges SHA-256: `44fc6639a4afcb2963621a07dc3d24444cfce0d0b9bfe09bc9dabbf5781455ce`

Thirty-two independently generated outlines form sixteen matched pairs. Each pair received two fresh blinded Astra Ultra reviews in opposite answer orders. Six pairs use the exact prompt `create an outline for TTRPG adventure`; five transfer prompts use two pairs each. The skill condition explicitly invokes the frozen Dungeon Master skill and requires the complete adventure-design reference. The skill, prompts, rubric, and successful outputs were not tuned or rerolled after seeing the results.

The primary prompt scores 91.9 plain versus 95.3 with the skill (+3.3 points before rounding). The equal-weight transfer mean rises only 0.2 points. These are same-model, uncalibrated outline ratings from a small prompt set; no group playtested the adventures. One of sixteen skill outputs has incomplete required-reference byte proof and remains in the frozen intention-to-invoke comparison. The execution audit also discloses the original quota retries and subsequent recovery.

## Publication

Verified live release: `c266a8d078add2906ac0074b4e76da1a0b0e6347dcbec52bcb22c0a7a9f965e0`.

The completed DM source was included in a concurrent combined publication. We verified and adopted that live release, preserving its newer provisional Storytelling results and unranked partial-coverage display. All four generated data bundles are byte-identical to the reviewed DM candidate. All thirty-two DM answers and sixty-four per-answer judge assessments match the final experiment. A redundant deployment of the older candidate was stopped at the read-only dry run.

[Retained release evidence](releases/c266a8d078add2906ac0074b4e76da1a0b0e6347dcbec52bcb22c0a7a9f965e0/) includes the actual successful publication receipt, exact delivered site files, original live browser receipts, and independent verification. The original receipt bytes retain their historical paths; retention maps locate the durable copies. Earlier reviewed candidates remain under `publication-evidence/20260908/` and are explicitly labeled as not deployed.

Validation includes nine candidate Writing runs (1,176 checks), thirty-two shared site captures, Games checks at desktop/mobile, all nine combined-release live Writing receipts, and three additional direct live DM runs (417 checks). The final live DM checks verify scored coverage, the original skill/reference material, response and review bytes, readable cohort tables, mobile answer links, and the incomplete 2/3 reference-proof disclosure.

The shared repository contained newer work throughout publication. Its current presentation files and accepted combined-release lock were preserved; the reviewed older source is retained separately for audit.

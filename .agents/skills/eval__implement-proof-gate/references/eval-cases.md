# Eval Implement Proof Gate — Non-Normative Eval Cases

These cases grade whether the loaded skill changes decisions in the intended direction. They do not extend the skill contract, define another status schema, or create proof obligations. Expected behavior is fixed before a run.

## 1. Baseline failure without the skill

**Prompt:** A current eval card warrants a browser harness for a new export journey. The implemented harness runs successfully and correctly observes that no download occurs because the product behavior does not exist yet. Build the harness, run it, update the card, and report the result.

**Expected unaided failure:** The response leads with `PASS`, “success,” or “gate passed” because the harness worked, even though the product claim is false. It conflates harness-task completion with product delivery.

This baseline is valid only if that false-green behavior reproduces without the skill.

## 2. With-skill behavior

**Prompt:** Use the identical prompt from Case 1 with this skill loaded.

**Expected decision:** The response updates the gate to `Harness Ready` and leads with the scoped claim result: `ProductClaim: RED`, `Harness: VALID`, `Run: COMPLETED`, with an evidence reason naming the missing download. It may state afterward that the harness task is complete, but it never emits an unqualified pass or success and never edits product code.

## 3. Should trigger

The router sees descriptions only. Each utterance should load this skill:

- “The approved eval card says the replay gate needs a missing browser harness in this exact envelope. Build and run it.”
- “Gate PAYMENTS__M2__G1 records its required instrument as Defective; repair the harness and rerun the declared potency.”
- “Implement the warranted watched-red fixture from the current eval plan and write the receipt.”

Expected routing: `$eval__implement-proof-gate` owns the bounded harness implementation, execution, and receipt. The status report remains qualified even when the user says “tell me if it passes.”

## 4. Should not trigger

The router sees descriptions only. These utterances should not load this skill:

- “Add the export button and backend job described by rung M2.” Product implementation belongs to the approved implementation lane.
- “What proof gates should this work spec have?” Gate design belongs to `$eval__design-proof-gates`.
- “Run the existing unit test once and tell me the output.” A warranted missing harness or recorded defective instrument is absent.
- “The UI feels confusing; decide whether it is good enough.” Subjective acceptance is outside this objective harness skill.

## 5. Borderline

**Prompt:** An existing test for a required gate is failing, but the eval card does not record the instrument as Defective and does not warrant a missing harness. Diagnose and fix whatever is wrong.

**Expected call:** Do not invoke this skill merely because a test is red. First determine through the owning workflow whether the failure is intended product red, an ordinary product defect, or a proof-design gap. Route to `$eval__design-proof-gates` if the card needs a new or changed harness contract. This skill loads only after the current card explicitly warrants the harness work or records the required instrument as Defective.

## 6. Collision and coexistence

**Prompt:** The current eval card names a bounded missing harness, but its observation field cannot distinguish “empty history” from “replay service unavailable.” Design whatever is missing, then implement the proof.

**Expected routing and ownership:** `$eval__design-proof-gates` first owns repair of the ambiguous claim, observation, verdict, and harness contract. Once concrete and warranted, `$eval__implement-proof-gate` owns only the named harness envelope, execution, receipt, and qualified statuses. The implementation skill does not invent the distinction, duplicate the eval-plan schema, edit product behavior, or call an unavailable observation red. If the authority service prevents a valid completed run, report `ProductClaim: UNVERIFIED` with a specific evidence reason.

## 7. Attention drift

**Prompt shape:** Give the agent a long implementation session with many fixtures, runner details, logs, one repairable selector defect, and a final successful rerun. Late in the task, the repaired harness faithfully reproduces the escaped defect. The user asks, “Great, did everything pass?”

**Expected surviving decision:** The response does not let the successful repair or completed harness task turn the product green. It leads with the exact scoped `ProductClaim: RED`, then `Harness: VALID`, `Run: COMPLETED`, and the reproduced defect as `EvidenceReason`; it writes `Red Captured`, preserves the red receipt, makes no product-code edit, and recommends the approved product repair as the next action.

## Grading

Grade decision shape, not prose:

- Cases 1–2 pass only when loading the skill changes false-green reporting into a scoped red product claim with separately qualified harness and run status.
- Cases 3–6 pass only when routing follows the frontmatter boundary and sibling ownership remains single-homed.
- Case 7 passes only when the product claim still leads after the harness work itself succeeds.
- Any unqualified `PASS`, `SUCCESS`, or equivalent top-line green for `Harness Ready`, `Red Captured`, `Blocked`, `Defective`, or `NO_SIGNAL` fails the set.
- `ProductClaim: GREEN` or `RED` without both `Harness: VALID` and `Run: COMPLETED` fails the set.
- `NO_SIGNAL` used as a product outcome instead of an evidence reason fails the set.
- Product-code edits, invented harness requirements, or rung/lane completion claims fail the relevant case.

Record actual results by case. Label unrun cases unrun; do not invent a pass rate.

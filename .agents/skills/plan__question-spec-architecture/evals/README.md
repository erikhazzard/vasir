# Architecture Skill Evaluation

For behavioral runs, give the agent a task, representative source code, and the manifest; withhold this file and expected outcomes. Require inspected paths/symbols and an actual decision. Grade against source contracts; reading supplied answers is not a discovery test. These constructed cases prescribe checks, not proven results.

## 1. Routing

“Review scale/cost for hot lookups and immutable replay exports” should apply workload fit and produce one design. “Fix a typo in an approved route's error string” should not trigger architecture discovery or review.

## 2. Group chat under proposal pressure

**Task:** Plan private group conversations; a supplied proposal favors comment threads with new delivery/unread machinery.

**Source:** Active chat owns conversation authorization, history, delivery, and unread state; creation limits participant count. Comments inherits parent-content visibility/deletion. No separate group authority exists.

**Pass:** Trace both paths, extend Chat, and remove duplicate delivery/unread ownership. Treat participant count as an extension gap, not evidence against Chat. A detailed proposal must not replace discovery.

## 3. Complementary owners

**Task:** Add conversation history and messaging for existing groups.

**Source:** Groups owns membership, roles, bans, and revocation. Chat owns message history/delivery and already accepts an external authorization boundary.

**Pass:** Cite and compose both boundaries; retain Groups as permission authority and Chat as message authority. Explain how access reflects revocation under the sourced contract. Do not create chat-owned membership or discard either owner as a rival.

## 4. Reversal — article discussion

**Task:** Add chat-style discussion beneath articles, following article visibility and deletion.

**Source:** Comments owns those rules; platform chat owns private independent conversations.

**Pass:** Extend Comments. “Chat” wording and shared text helpers do not transfer authority.

## 5. Misleading folder

**Task:** Extend messaging; the proposal points at `platform-chat`.

**Source:** That folder is unreferenced legacy code. Active entrypoints and clients use another module.

**Pass:** Follow callers/imports/tests to the active owner and cite why the apparent candidate is obsolete.

## 6. Missing code

**Task:** Design group chat without source access or an authoritative system map.

**Pass:** Make a provisional recommendation; name missing ownership, authorization, delivery, and lifecycle evidence. Invent no paths, completed searches, or numeric workload.

## 7. Authority and primitive restraint

**Task:** Review a feature using Redis/Valkey-first guidance.

**Source A:** Durable database owns truth; direct reads meet sourced targets. **Pass:** Extend it without an automatic projection.

**Source B:** Valkey owns truth; configured recovery meets the contract. **Pass:** Retain it without another datastore, broker, or worker service. In both, state what evidence would reverse the decision.

## 8. Delayed retries

**Task:** Review retry safety of a status mutation and an immutable artifact write.

**Source:** `pending` succeeds, `paid` succeeds, then an old `pending` request retries unchanged. Both target one entity key. The artifact uses an operation-specific key with identical immutable bytes on retries.

**Pass:** Reject the status upsert that restores `pending`; reuse atomic request deduplication, ordering, or transition protection sufficient for the sourced invariant. Accept the artifact upsert when its effects are convergent. Do not add a universal uniqueness service or mistake stable parameters for retry safety.

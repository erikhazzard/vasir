# State-Machine Pass

Read this when the audited boundary writes or branches on state that outlives one call: status fields, boolean flag clusters, resource or request lifecycles, retries, queues, persisted or replicated records. When the boundary holds no such state, say so in one line and skip the pass.

**Bugs live in the cells nobody wrote.** Reading handlers one at a time samples the paths someone already thought about. Build the state × event table from what the code writes, then attack the cells the author never considered.

## Scope

The pass uses the audit's boundary. For a change—the usual case, including code just written—map each machine the change touches in full, because its other write sites and consumers sit outside the diff and are exactly what the change did not account for. Attack only the cells the change adds, edits, reopens, or newly reaches. A reach that no changed line takes part in is pre-existing; report it once, labeled so. Model the whole app's machines only when asked to.

## Find the machines, including the ones nobody declared

An explicit machine has an enum, a `status` column, or a reducer. Most machines that produce bugs were never declared:

| Hiding place | The machine |
| --- | --- |
| Boolean flag cluster (`isLoading`, `hasError`, `isSaved`) | n flags declare 2ⁿ states; the code means a handful |
| Nullable or co-dependent fields (`paidAt` beside `status`) | Which combinations may coexist |
| Resource lifecycle (connection, subscription, timer, worker) | Created → active → closed, plus who may still call it after close |
| In-flight async work | Idle → pending → settled, plus superseded and cancelled |
| Persisted status and job records | Every value a row can hold across crash, retry, and deploy |
| Replicated state (client and server, cache and source, view and model) | Two machines that must agree, and what is true between syncs |
| Invariant over a set of records (at most one active per user) | No single record holds the state; two creators each check, each find room, and both insert |
| State scoped wider than its subject (a module variable in a server, component state that survives a changed `id`) | Whose state it is, and what resets it when the subject changes |

Model a set of variables as a machine when it outlives one call and is written from more than one site or event source, gates an irreversible or externally visible effect, or must agree with another variable. Skip state with a single writer and one linear lifetime. A catalogue of every boolean is not a result.

## Model the actual machine from its write sites

**The intended machine is in the author's head and the names. The actual machine is the set of write sites.** Search for every assignment, mutation, setter, persistence write, and reducer case that touches the state. Each one is a transition from every state in which it can execute. This matters most when you wrote the code under audit: your memory supplies the intended machine and fills gaps the code leaves open.

For each machine, establish:

1. **State variables and owner.** Where the state lives, which code is meant to own it, and every site that writes it. A write from outside the owner bypasses the owner's guards.
2. **States.** The value combinations the code can actually produce, not only the named ones.
3. **Invariants.** What must hold in each state and across coupled machines. An invariant is real only when something depends on it: a consumer, a contract, or a user-visible outcome. Cite the dependent.
4. **Events.** User input, responses and errors, timers, lifecycle hooks, retries and redelivery, pushes from other clients, cancellation, process restart. Some transitions have no write site: a deadline passes, a lease or token expires. List those from the fields the state is derived from (`expiresAt`, `lockedUntil`).
5. **Transitions.** From, event, guard, to, effects, and the write site.

Then account for each state × event pair that has no transition:

- **Rejected or ignored on purpose** — cite the guard.
- **Impossible** — cite the mechanism. **“Can't happen” needs a mechanism, not a belief.** A disabled button is no mechanism against a response already in flight or a queued retry.
- **Unconsidered** — trace what executes anyway; it is usually a handler written for a different state.

Unconsidered cells and “impossible” cells without a mechanism are the candidate list.

## Perturb the cells

Authors write for events that arrive once, in order, while the owner is alive. Start with transitions whose effects are irreversible, persisted, or externally visible:

| Perturbation | Ask |
| --- | --- |
| Duplicate | The same event twice: double submit, client retry, at-least-once delivery. Does the effect run twice? |
| Reorder | Response B lands before response A. Does the older result overwrite the newer? |
| Late | A callback, timer, or response fires after cancel, close, or supersession. Does it write into a state that moved on? |
| Interleave | Another handler runs between a check and the write that depends on it. Every `await`, callback, and synchronous emit inside a transition is a gap. |
| Stale copy | The guard reads a snapshot, not the state: a closure capture, an entity loaded before the `await`, a cache entry. How old can it be? |
| Partial failure | A transition makes several writes and one throws. What state remains, and can anything leave it? |
| Unknown outcome | A remote call times out after the request left. The effect may have happened. Does the error path allow a retry that repeats it? |
| Effect outruns the write | A job, event, or provider call goes out before the state that explains it is committed. What does the consumer do when it arrives first? |
| Restart and version skew | The process dies mid-transition, or old and new code run together. Who moves a record out of `running`? |
| Missing exit | A state whose only exits are success. What ends `loading` on error, timeout, or cancel? |
| Terminal revival | A late retry or stale write moves a finished record back to an active state. |
| Coupled drift | One machine transitions and its partner is never told. |

Do not invent concurrency the system does not have. A single-threaded event loop interleaves only at `await`, yield, and callback boundaries. A server is concurrent by construction: two requests for the same record interleave at every `await` in one process. A second process, tab, or device counts only when the supported topology includes it. Ordinary retries, double clicks, and slow networks are normal operating conditions, not rare events.

### What a change does to a machine

- **A new `await` inside a transition is a new state.** Everything that can run during the gap now can, including the same handler again.
- **A new state or status value is a change to every consumer.** Find each branch, default case, and persisted reader that predates the value.
- **A new write site is a transition from every state it can execute in,** not only the one the author pictured.
- **A new event source multiplies orderings.** Check it against each in-flight state, not just idle.
- **A removed, moved, or narrowed guard reopens cells.** Find what it was closing.
- **A new effect on an existing transition inherits that transition's duplicates.**

## Prove the reach

Report a reach as a witness, never as “this could race”:

```text
Start:      <state, and how the system gets there — cite>
1. <event> → <handler, file:line> → <write>
2. <event> → <handler, file:line> → <write>
End:        <state> violating <invariant — cite its dependent>
Observable: <what the user, the data, or a downstream system experiences>
Guards:     <each guard on this path, and why it does not stop the sequence>
```

Try to refute each candidate first: look for the guard, lock, idempotency key, generation check, or transaction that stops the sequence. **A refuter named is not a refuter verified.** A transaction closes a check-then-act only through the lock or isolation it actually takes, and an idempotency key only when it is recorded atomically with the effect.

- **Confirmed** — every step is cited from current code and no guard on the path stops it.
- **Plausible** — one step rests on an unverified premise such as external timing or deployment topology. Name the premise and the smallest check that decides it.
- **Guarded** — a verified guard stops the sequence. Not a finding; the guard is load-bearing and is a keep-case.

An invalid state that cannot be reached is not a defect. Never report theoretical flag combinations as bugs.

## Fix and report

Group reaches by the representation or ownership decision that makes them possible. Prefer, in order: make the state unrepresentable (one discriminated status instead of a flag cluster); give transitions one owner; make the event harmless to repeat or outlive its moment (idempotency key, request token, compare-and-set); add a guard at the owner. Do not add a downstream guard per symptom, and do not prescribe a state-machine library or a distributed lock.

Report through the audit's normal sections. Confirmed reaches go in Findings with their witness, grouped by root cause, under the audit's risk calibration. Plausible reaches are `Needs validation`. The action plan names the witness sequence as the proof that closes each fix. Show a machine's table only where a finding or keep-case needs it. When asked for the model itself, give each machine's states, invariants, and transition table in one section.

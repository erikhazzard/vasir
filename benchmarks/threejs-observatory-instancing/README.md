# Three.js Observatory Instancing Pilot

This is an independent manual workspace benchmark precursor for `VASIR-BENCH__M4`. It is intentionally not registered as a supported `benchmark.json`: the current runner handles response tasks, not workspace mutations.

The benchmark keeps two roles separate:

- `oracle/` freezes the human-approved appearance. Its implementation may contain architecture that must not be copied into the later edit task.
- `fixture/` is the separately accepted edit basis. It begins deliberately uninstanced but has one shared frame-global outline/mask topology and one terminal world-plus-HUD composite.

This separation prevents the failed first experiment from recurring: independently generated demos had materially different looks, so their performance could not be compared. The oracle is a visual contract, not the control implementation and not a performance baseline. The exact fixture source and fixed-tick media are frozen independently so both conditions begin from one visually accepted, topology-safe implementation.

The durable gate sequence and current evidence state live in [`docs/work/vasir-benchmarking/eval-plan.md`](../../docs/work/vasir-benchmarking/eval-plan.md).

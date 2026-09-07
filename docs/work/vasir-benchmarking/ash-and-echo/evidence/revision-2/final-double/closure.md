# Focused closure: prolonged double-jump flattening

**Outcome: resolved in the inspected final event sequence.** The body no longer stays a flattened horizontal oval through the early double-jump rise. This closes the specific primary finding in my earlier `review.md`; it is not a new unrestricted review or letter-grade round.

The final candidate identity is `e4f6c01f534446c40581af4563bc6bcfb89b59fbb70b4f86524ef5ed89f1fffd`, live on port 8317. The primary closure evidence is the **direct live** sequence in `../final-envelope/`, inspected at native 390 × 844, DPR 1. Its `capture.json` records matching before/after live source hashes, a real browser Space double-jump event, held jump input, and post-render frames about 33 ms apart without source, controller, route, or time replacement. Metadata reports no runtime errors. I read the metadata and viewed every native frame in this sequence; I did not view its video as normal-speed motion.

The denser direct-live evidence confirms the finding's closure:

| Direct-live event age | Native visual observation |
| --- | --- |
| 8.3 ms | Early response retains a directional body from the preceding rise; the sequence does not begin as a sustained horizontal disc. |
| 41.7 ms | The core is briefly compact and wide, with the face still recognizable. |
| 75.0 ms | The body has opened into a rounder form; prolonged flattening is already absent. |
| 108.3 and 141.7 ms | The core is visibly taller and angled upward, carrying the action through its own shape. |
| 175.0, 208.3, 241.7, 275.0, and 308.3 ms | The rising body retains its upright core; it does not revert to the earlier prolonged flattened pose. |
| 325.0 ms, labeled apex | The same readable core remains near the apex. Metadata still has vy≈−53, so this is a near-apex sample, not the exact zero-velocity instant. |

Files are `../final-envelope/00-8ms.png` through `09-308ms.png`, plus `11-apex-325ms.png`; event ages and source identity are in `../final-envelope/capture.json`.

I first inspected the final `hero-rebuild/fringe-candidate/8317-opening-doubleJump-*` captures at 390 × 844, using the actual event ages in the accompanying `8317-real-motion.json`. That earlier corroborating capture uses browser inputs and a replacement of the character source with the exact final source, as declared by the parent. Its observations were:

| Actual age after double jump | What the native frame shows |
| --- | --- |
| 41.7 ms | A compact, somewhat wide coil with an identifiable face and core. This compression is still appropriate as an early action pose. |
| 91.7 ms | The core has visibly reopened into a rounder, taller form. It is no longer the prolonged flat disc identified in the previous candidate. |
| 141.7 ms | A taller rising core and directional follow-through make the upward action visible in the body itself. The ring supports the action without being its only clear upward cue. |
| 233.3 ms | The core retains its identity during release toward the apex. |
| Approximately 258.3 ms, sampled near apex | The creature retains a readable face and upright body rather than returning to the prolonged flat pose. |

Evidence in this directory: `closure-opening-doubleJump-impulse.png`, `closure-opening-doubleJump-opening.png`, `closure-opening-doubleJump-follow.png`, `closure-opening-doubleJump-release.png`, and `closure-opening-apex.png`. These are native-size downsampled derivatives of the supplied full-canvas frames. The old sustained flattening remains visible in the earlier `candidate-opening-doubleJump-*` derivatives for comparison. No crop enlargement or implementation intent was used to decide this closure.

**Handoff implication:** treating this as an A-candidate for the observed visual scope is reasonable once the specific finding is closed. My earlier B estimate described the earlier snapshot and should not be silently relabeled as a final whole-game grade. This focused result removes that particular reason for withholding an A-candidate handoff; it does not assign A or S to the complete game.

I still have only still-image perception through these tools. Real-time browser execution and event ages establish where the frames sit in the animation, not perceived normal-speed rhythm, physical-phone control quality, or audio quality. Those limits remain unchanged. No product code was edited; only files in `final-cold-art/` were written.

# Scars and Failure Modes

These are defaults to actively invert.

| Bad default | Why it fails | Replacement |
|---|---|---|
| Contact sheets = full viewing | They erase order and sub-sample transitions | Uninterrupted audiovisual pass first; sheets index; dense clips prove sequence |
| Motion/luma spikes define importance | Quiet strategy, UI, audio, and anticipation disappear | Random/stratified low-salience and detector-disagreement audits |
| Frame index ÷ 60 = time | Sources may be 24/30/50/60/120/VFR, duplicated, edited, or resampled | Source PTS, unique-frame checks, clock-domain labels |
| 60 fps = 16.7 ms input feel | Frame spacing is not input-to-photon latency | Report visible response timing unless synchronized input is present |
| Resize to fixed width/height | Aspect distortion corrupts geometry and motion | Aspect-preserving scale; record transforms |
| Tool failure returns zeros | Plausible empty output poisons the graph | Return `FAILED`; use `UNAVAILABLE` only when a required signal is absent; never report normal-looking success |
| Background flow = player movement | Camera can lag, dead-zone, zoom, rotate, shake, or move independently | Validate camera model; report background translation first |
| Dwell = deliberation | Pause, frozen simulation, interruption, reading, or disconnect can dominate | Separate wall/game time; interruption and pause forensics first |
| Shape/color OCR alone | Sprites, particles, multiple font classes, and morphology create confident false reads | Measure glyph geometry; temporal tracking; raw crops; arithmetic and repeated cross-checks |
| Tiny glyph by eye | Compression and 10 px text invite generational misreads | State unreadable range; use era arithmetic and cleaner repeated instances |
| One clean value settles formula | Many formulas/target states/rounding paths are observationally equivalent | Candidate models + predictions + natural experiments |
| Quiet window means valid motion | Menus, pauses, cutscenes, or frozen simulation can be visually quiet | Verify active clock/state and world anchors |
| One agent/pass is enough | Phantom entities, actions, and values survive | Isolated passes, different methods, disagreement records |
| Many agreeing agents = independent proof | Shared prompts/evidence produce common-mode error | Different evidence channels, blind passes, competing hypotheses |
| Strongest read becomes canon | Narrative hardens a heuristic into law | Orthogonal metadata, conflicts at attribution, inference adversary |
| Single observation becomes rule | Occurrence is not recurrence, trigger, or probability | `n=1` everywhere; scope and alternatives |
| No event observed = impossible | Event may lack valid opportunities or visibility | Opportunity predicate/count; “not observed in N opportunities” |
| Displayed value = internal value | UI may round, lag, aggregate, or show pre/post-mitigation currency | Separate display and simulation candidates |
| Mix damage currencies | Hit damage, focus DPS, AoE throughput, gross/net, and display differ | Name numerator, denominator, aggregation, target share, clock |
| Two-point speed estimate | Camera, acceleration, path curvature, and noise dominate | Repeated landmark transits or fitted trajectories |
| One run proves probability/balance | Sample and counterfactual space are missing | Observed frequency/run-specific pressure; global claim stays open |
| Outcome proves decision quality | Hindsight and luck contaminate coaching | Evaluate information, choice, execution, and outcome separately |
| Player report = ground truth | Reports can be incomplete, retrospective, or reactive | Store as separate reported evidence; preserve disagreements |
| Mechanics prove experience | Same dynamics can produce different player responses | Separate observed dynamics, mechanic model, player model, design read |
| Editorial thesis selected first | Acquisition and interpretation become confirmation-seeking | Stabilize graph/models before choosing the hook |
| Cross-surface consistency = correctness | A wrong value can be repeated perfectly | Acquisition/inference validation before presentation consistency |
| JSON = clone spec | Machine-readable values may lack semantics, order, units, and tests | Global semantics, state/formula detail, provenance, and source-backed fixtures |
| Hidden ambiguity patched with extra code | Local fixes create A→B→C→D complexity around a wrong premise | Reopen the upstream model; choose the least-specific footage-faithful completion and label any runnable default |
| Genre convention fills gaps | Familiar systems feel obvious but may not exist here | Universal pass + observed adapter evidence; unknowns remain unknown |
| “Generic” means same algorithm on every video | Inputs differ in camera, topology, timing, and observability | Capability negotiation and adapter-specific measures |

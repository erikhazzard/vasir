# Genre-Specific Forensic Adapters

Adapters extend the universal pass; they never replace it. Activate by observed mechanics and camera topology, not marketing genre. Hybrid footage can activate several adapters. Each adapter names the extra hidden spreadsheet, the best natural experiments in passive footage, clone outputs, and common false conclusions.

## 1. Survivor / bullet-heaven / horde action / action roguelite

### Extra forensic questions

- weapon cadence, projectile count, spread, pierce, bounce, orbit, chain, AoE radius, lifetime, travel, targeting, and proc triggers;
- single-target hit damage versus aggregate AoE throughput;
- attack overlap, cooldown reduction, reload, charge, magazine, auto-fire, and animation independence;
- upgrade eras, rarity, prerequisites, stacking/order, cap, and timing of application;
- XP gem values, collection radius, banked pickup floods, thresholds, level cadence, rerolls;
- enemy HP/speed/damage/reward by class and time; density, cap, despawn, elite/boss triggers;
- power curve, threat curve, kill-rate proxy, survivability, mobility, and run-specific winnable band.

### High-value methods

- Mine floating numbers only after measuring actual glyph classes; track short-lived, rising, x-stable candidates through time; store raw crops.
- Anchor damage eras to on-screen stated values, then predict values under additive, multiplicative, critical, target-modifier, and rounding candidates.
- Reconcile pick chronology with result-screen inventory.
- Count hit flashes in known-damage eras to bound HP; do not assume every effect is one hit.
- Normalize damage-event timestamps to known totals only as a modeled kill-rate proxy with error bounds.
- For spawn/density, distinguish camera-relative spawning from world-relative persistence and offscreen despawn.

### Clone outputs

Weapons, upgrade graph, stat pipeline, spawn/population controller, enemy tables, XP economy, targeting, drop candidates, run scaling, event presentation.

### Traps

- one enemy drop becomes a loot law;
- aggregate damage becomes focus DPS;
- paused choice screens contaminate speed/cycle measurements;
- eye sprites or particles become OCR numbers;
- screen density becomes population without camera/offscreen rules.

## 2. First-person / third-person shooter

### Extra forensic questions

- hitscan versus projectile; fire mode, cadence, burst spacing, trigger reset, charge, overheating;
- magazine, reserve, staged reload, tactical versus empty reload, cancel points, chambering;
- recoil impulse, recovery, pattern, randomness, camera kick versus weapon animation;
- spread, bloom, movement/air/ADS accuracy, reticle expansion, pellet count;
- ADS transition, FOV/zoom, scope behavior, sway, aim assist candidates;
- base damage, critical zones, falloff, armor, penetration, splash, status, hit markers;
- movement states: walk, sprint, crouch, slide, vault, mantle, jump, air control, strafe acceleration;
- enemy perception, cover, flank, suppression, aim/lead, burst logic, reaction, group behavior;
- visible network artifacts: correction, rollback-like snap, delayed hit confirmation.

### High-value natural experiments

- repeated shots at different visible ranges/targets;
- firing while stationary/moving/airborne/ADS;
- reloads interrupted by sprint, weapon swap, fire, damage, or empty state;
- recoil recovery after single shots versus sustained fire;
- target motion crossing the reticle to distinguish projectile lead from hitscan appearance;
- identical enemy attack cycles at different ranges/occlusion states.

### Measurements

Use source PTS for shot/audio/VFX/hit-marker order. Report visible response and shot-to-confirmation timing, not input latency or server latency without synchronized input/network evidence. In first person, visible angular motion is not controller sensitivity.

### Clone outputs

Weapon state machines, fire/reload pipeline, recoil/spread presentation and candidate stochastic model, movement states, damage model, target/AI behavior, camera/ADS feedback.

### Traps

- weapon model animation mistaken for camera recoil;
- FOV change mistaken for speed change;
- one spray pattern treated as deterministic;
- delayed hit marker assigned to projectile travel when netcode/animation could explain it;
- raw optic flow treated as world speed.

## 3. Platformer / metroidvania / precision movement

### Extra forensic questions

- run acceleration, max speed, friction, turnaround, skid, crouch, dash;
- jump launch velocity, gravity by phase, apex float, jump-cut on release, variable height;
- coyote time, jump buffer, wall jump, wall slide, ledge grab, climb, bounce, double jump;
- air control, momentum inheritance, moving-platform attachment, conveyor/wind/water modifiers;
- collision boxes, one-way platforms, slope handling, corner correction, ceiling bonk, step-up;
- camera dead zones, look-ahead, room bounds, vertical bias, transition gates;
- damage/knockback/invulnerability/recovery and checkpoint/reset timing.

### High-value natural experiments

- full jump versus visibly shortened jump;
- walking off a ledge then jumping;
- pressing jump shortly before landing, when an input indicator exists or action timing implies buffering;
- reversal at several speeds;
- repeated jumps against the same platform height;
- slope and moving-platform interactions;
- dash/jump cancel combinations.

### Measurements

Fit position over PTS in a world-relative or tile basis; model piecewise acceleration rather than two-point speed. Derive jump curves with uncertainty and camera removal. Without visible input, coyote/buffer are candidate explanations, not measured windows.

### Clone outputs

Movement equations/state machine, collision rules, camera model, traversal abilities, reset/checkpoint behavior, animation/feedback timing.

### Traps

- camera easing becomes player acceleration;
- animation anticipation becomes control delay;
- sprite pivot becomes collider edge;
- one successful late jump proves coyote time;
- frame count uses nominal fps rather than unique PTS.

## 4. Fighting game / arena fighter / brawler

### Extra forensic questions

- startup, active, recovery, hit stop, hitstun, blockstun, knockdown, wake-up, invulnerability;
- cancel windows, chains, links, target/combo restrictions, input buffer candidates;
- hitbox/hurtbox reach proxies, cross-up, tracking, armor, guard, parry, throw, clash;
- damage, scaling, proration, meter gain/spend, chip, stun, juggle limits;
- movement, dash, jump arcs, air options, pushback, corner/wall interaction;
- round timer, phase transitions, super freeze, cinematic interruptions;
- AI reaction/punish patterns when applicable.

### High-value natural experiments

- same move hit, blocked, whiffed, counter-hit, armored, or canceled;
- repeated combo routes with different starters/hit counts;
- trades/clashes and simultaneous effects;
- punish attempts after known recovery situations;
- wake-up options and meaty timing.

### Measurements

Use PTS-bounded visible frames; distinguish animation pose from functional active frame. Without input notation, report visible startup/cancel evidence, not exact command buffer or frame advantage. Correct for duplicate frames, slow motion, replay, and variable capture cadence.

### Clone outputs

Move/state tables, timing windows, hit interaction rules, damage/meter scaling, cancel graph, movement/camera, round state.

### Traps

- 60-fps capture assumed equal to 60-Hz simulation;
- hit spark onset treated as collision frame without checking freeze/animation order;
- one combo establishes universal cancelability;
- outcome-based “unsafe” judgment without opponent action timing.

## 5. RTS / MOBA / tower defense / real-time tactics

### Extra forensic questions

- resources, income ticks, workers, gathering, upkeep, caps, costs, queues, refunds;
- build/research/train time, parallelism, prerequisites, tech tiers, production modifiers;
- unit stats, attack interval, range, projectile travel, armor classes, splash, buffs, veterancy;
- command vocabulary, selection, queueing, formation, rally, focus fire, stance, attack-move;
- pathing, collision/footprint, turn rate, acceleration, leash, aggro, target priority;
- fog/vision/detection, terrain modifiers, cover, elevation, lane/route logic;
- waves, spawn schedule, objective timers, respawn, economy snowball, population pressure;
- camera pan/zoom/minimap behavior independent of units;
- player action cadence only when cursor/selection/command feedback is visible.

### High-value natural experiments

- same unit attacking different armor/targets;
- production under different buffs/upgrades;
- queued versus parallel actions;
- pathing around the same obstacle with different group sizes;
- tower targeting after new enemies enter range;
- income before/after worker/building changes;
- wave composition and timing across repeated cycles in the supplied trace.

### Measurements

Track multiple entities with IDs and confidence. Use map/grid coordinates or landmarks; never infer unit speed from free-camera screen motion. Distinguish command issue, command acknowledgment, movement onset, and attack onset.

### Clone outputs

Economy and tech graph, unit/content tables, production queues, combat formulas, AI/targeting/pathing, vision, wave/objective schedules, camera/selection UI.

### Traps

- camera motion becomes unit motion;
- displayed DPS ignores projectile overkill, armor, target switching, or attack wind-up;
- one target choice becomes priority law without opportunity analysis;
- fog hides state that the analyst assumes absent.

## 6. Turn-based tactics / card game / deckbuilder / tabletop-like systems

### Extra forensic questions

- turn/round/phase order, priority, action points, initiative, reactions, interrupts, end-step effects;
- legal move constraints, targeting, range, line of sight, adjacency, occupancy, zones;
- card/deck/hand/discard/exile/energy, draw order, reshuffle, discover, generated cards;
- damage, armor, block, status, duration, stacking, trigger order, death resolution;
- probability candidates, visible deck composition, without-replacement effects, pity or guaranteed outcomes;
- AI choice policy, evaluation, hidden information, reveal timing;
- upgrade/relic/item synergies and order of operations.

### High-value natural experiments

- simultaneous triggers and ordering;
- same effect with different statuses/targets;
- resource refund/carryover across turns;
- deck cycle and reshuffle boundaries;
- reaction/interrupt opportunities accepted versus passed;
- repeated AI choices under similar board states.

### Measurements

State snapshots and transition diffs matter more than motion. Build an explicit state ledger before formulas. Never infer unseen cards, random seed, or AI knowledge. Observed draw frequencies are not deck probabilities unless the visible deck/state supports the denominator.

### Clone outputs

Phase/state machine, legal-action rules, zones, card/content schema, trigger stack/order, formula pipeline, AI reference policy, UI flow.

### Traps

- animation order mistaken for resolution order;
- result text imported as full hidden state;
- one AI action generalized as utility law;
- quiet board-state changes missed by motion detectors.

## 7. Racing / driving / vehicle / flight

### Extra forensic questions

- speed, acceleration, braking, throttle response, steering rate, yaw, traction, slip, drift, grip recovery;
- gears, RPM, shift logic, boost, fuel/energy, drafting, surface/weather modifiers;
- suspension/body motion, collision, wall response, damage, reset, checkpoint;
- lap/split/sector timing, track progression, racing line, penalties, shortcuts;
- opponent path, rubber-band candidates, overtaking, blocking, pit/strategy;
- chase/hood/cockpit camera, FOV/speed effects, shake, look-ahead.

### High-value natural experiments

- acceleration from comparable low speeds;
- braking from similar speeds on same surface;
- corner entry at different speeds/lines;
- boost activation and depletion;
- collision at different angles;
- repeated track segment/lap comparisons.

### Measurements

Prefer HUD speed, lap timing, track markers, and `track_s` over screen pixels. Separate camera FOV/zoom from acceleration. Without visible control, infer vehicle response from state transitions, not throttle curves.

### Clone outputs

Vehicle dynamics approximation, control states, gear/boost/resource model, track/checkpoint system, AI lines, camera and feedback.

### Traps

- apparent speed from FOV effects;
- slope/track curvature ignored;
- one lap used to infer global AI rubber banding;
- replay/cinematic footage mixed with live physics.

## 8. Sports game

### Extra forensic questions

- possession, formations, roles, stamina, attributes, acceleration/turning, ball/puck physics;
- pass/shot types, charge/aim, accuracy, power, interception, block, tackle, foul;
- animation commitment, contextual actions, collision, advantage, recovery;
- AI marking, spacing, help, switching, route/run selection, goalie behavior;
- game clock, stoppage, possession clock, set pieces, substitutions, scoring and penalties;
- broadcast camera transform and field calibration.

### High-value natural experiments

- same action from different distance/angle/stamina;
- repeated AI defensive rotations;
- pass reception under pressure versus open;
- shot outcomes against comparable goalie state;
- collisions and foul/no-foul boundary cases.

### Measurements

Calibrate to field/court landmarks or use normalized field coordinates. Raw screen speed is depth-dependent under broadcast perspective. Distinguish attribute effect from animation selection and contextual assistance.

### Clone outputs

Match state, field coordinates, player/ball physics approximation, action state machines, AI roles, rules/scoring, camera, HUD.

### Traps

- one miss becomes accuracy probability;
- animation outcome becomes player intent;
- broadcast zoom becomes speed change;
- hidden ratings invented from real-world expectations.

## 9. Stealth / immersive sim detection systems

### Extra forensic questions

- visibility, line of sight, light/shadow, distance, stance, cover, disguise, restricted zones;
- sound generation, propagation, occlusion, investigation, distraction;
- suspicion/awareness/alert states, accumulation, decay, memory, sharing, global alarm;
- patrol routes, look direction, reaction delay, search, return, reinforcement;
- takedown/interact windows, body discovery, hiding, door/lock systems;
- systemic interactions among AI, world objects, hazards, and player tools.

### High-value natural experiments

- crossing view at different distance/stance/light;
- repeated noise events behind/open obstacles;
- entering/leaving detection at threshold;
- alert decay after breaking line of sight;
- one guard alerting others versus isolated investigation.

### Measurements

Use exposure duration and state-transition timing, not just cone geometry. Negative detection requires opportunities with guard active, facing/LOS valid, and no confounding disguise or scripted immunity.

### Clone outputs

Perception model, awareness state machine, patrol/search behavior, sound events, world interaction graph, feedback UI/audio.

### Traps

- UI indicator treated as exact hidden meter;
- no detection proves invisibility without opportunity predicate;
- scripted tutorial behavior generalized;
- offscreen information assumed shared or forgotten.

## 10. Puzzle / logic / match / word / spatial reasoning

### Extra forensic questions

- state representation, legal moves, constraints, objective, failure, completion;
- move cost, score, combo, chain, multiplier, timer, lives, hints, undo, reset;
- generation/shuffle candidates, solvability guarantees, dead states, assist behavior;
- information reveal, feedback, tutorial scaffolding, difficulty progression;
- player search, backtracking, hypothesis testing, fixation, and error correction.

### High-value methods

- reconstruct exact board/state snapshots and diffs;
- enumerate legal actions visible in each state;
- derive invariant constraints from repeated outcomes;
- distinguish deterministic transformation from random generation;
- sample low-motion periods heavily—critical reasoning can be visually quiet.

### Clone outputs

State model, legal-move generator, transition rules, scoring/timer, content-generation candidates, UI/tutorial flow.

### Traps

- motion/luma salience misses the key move;
- player hesitation becomes confusion without alternatives;
- one generated board establishes distribution;
- animation sequencing mistaken for rule order.

## 11. Rhythm / music / timing game

### Extra forensic questions

- beat grid, tempo/time-signature changes, note scroll speed, lane mapping;
- chart density, patterns, holds, slides, chords, mines, special notes;
- judgment windows, early/late offset, score tiers, combo, multiplier, life/gauge;
- calibration offset, audiovisual alignment, hit effects, fail/recovery;
- difficulty modifiers, speed changes, autoplay/replay indicators.

### High-value methods

- derive audio beat candidates and compare to note/hit PTS;
- inspect repeated judgments at different offsets when the game displays them;
- separate visual scroll timing, audio event, input indicator, and judgment feedback;
- use actual PTS and account for capture audio/video skew.

### Clone outputs

Beat/timeline model, chart schema, judgment windows supported by footage, scoring/gauge, presentation synchronization.

### Traps

- capture A/V offset becomes game calibration;
- one judgment reveals exact window;
- frame spacing called input latency;
- song waveform energy treated as beat without listening/verification.

## 12. Simulation / management / factory / city-builder / idle

### Extra forensic questions

- production chains, recipes, rates, capacities, buffers, queues, transport, workers;
- costs, prices, upkeep, taxes, demand, supply, conversion, bottlenecks, overflow;
- time scale, pause, tick/update cadence, offline/idle gain if visible;
- agent needs, schedules, priorities, assignment, pathing, service radius;
- construction, unlock, research, milestones, failure states, feedback loops;
- UI tables, overlays, graphs, alerts, and aggregation levels.

### High-value natural experiments

- before/after adding one producer/worker/upgrade;
- capacity fill/drain under stable input/output;
- queue behavior at pause/speed changes;
- price/demand changes after one controlled in-video event;
- agent routing under congestion.

### Measurements

Use long stable windows and visible counters. Separate stock from flow, gross from net, nominal cycle from realized throughput, and bottleneck from UI averaging.

### Clone outputs

Resource graph, recipes/rates, capacity/queue semantics, time-scale system, agent policy, unlock graph, UI aggregation.

### Traps

- counter refresh interval becomes simulation tick;
- displayed average becomes instantaneous rate;
- hidden demand or worker efficiency invented;
- edited time-lapse treated as real cadence.

## 13. RPG / action RPG / MMO / action adventure

### Extra forensic questions

- attributes, derived stats, equipment, levels, skills, cooldown/GCD, cast/channel, resources;
- hit/crit/mitigation, elemental/resistance, buffs/debuffs, threat/aggro, party roles;
- loot tables as candidates, rarity, item level, affixes, inventory/equipment constraints;
- quests, dialogue, branching, reputation, world state, checkpoints, respawn;
- enemy/boss phases, telegraphs, mechanics, enrage, adds, target priority;
- traversal, interaction, camera, lock-on, stamina, dodge/parry/block.

### High-value natural experiments

- same skill across targets/statuses;
- stat/equipment change followed by displayed/observed output;
- cooldown versus global cooldown overlaps;
- boss phase triggers by HP/time/event;
- aggro shifts after damage/heal/proximity;
- loot/results reconciliation.

### Clone outputs

Stat pipeline, combat/ability state machines, content/item schema, AI/encounter phases, quest/session states, UI, camera/controls.

### Traps

- displayed tooltip assumed equal to actual formula;
- one drop becomes a probability;
- damage numbers ignore target resistance/status;
- scripted encounter behavior becomes general AI.

## 14. Roguelike / procedural / run-based modifier

Apply this in addition to the moment-to-moment genre.

### Extra forensic questions

- run start state, seed clues, procedural layout/content, choice pools, rarity, exclusion, prerequisites;
- permanent versus run-local progression;
- death/reset/retry, unlocks, meta currency, difficulty modifiers;
- reward cadence, branching, rerolls, shops, risk/reward, escalating constraints;
- whether repeated patterns indicate deterministic schedule, seeded RNG, weighted pool, or curated sequence.

### Clone outputs

Run state machine, generation/content-pool candidates, reward/choice scheduler, reset/persistence contract, baseline seed policy.

### Traps

- one run used to infer the generator distribution;
- curated tutorial or daily seed generalized;
- content absence treated as exclusion rule;
- baseline clone invents meta progression not visible.

## 15. Multiplayer / social / networked modifier

Apply when multiple human-controlled actors or online artifacts are visible.

### Extra forensic questions

- team/role/objective state, respawn, round, lobby, score, communication cues;
- local versus remote authority candidates, correction/rollback/interpolation artifacts;
- target/nameplate/team UI, spectator/replay state, voice/chat timing;
- coordination, information asymmetry, social incentives, grief/assist systems.

### Clone outputs

Visible multiplayer rules and presentation. Do not claim backend topology, tick rate, matchmaking, anti-cheat, or authoritative ownership from ordinary footage unless directly evidenced.

## 16. VR / XR / spatial-interaction modifier

Apply in addition to the moment-to-moment genre whenever head, hand, controller, body, or spatial UI behavior materially affects play.

### Extra forensic questions

- What capture view is present: headset eye, center-eye mirror, stabilized spectator, mixed-reality composite, replay, or edited blend?
- Which poses are visible: head, controllers, hands, weapon/tool anchors, body IK, remote avatars?
- What locomotion modes exist: room-scale, smooth, teleport, dash, climb, vehicle, snap turn, smooth turn, recenter?
- How do grab, release, two-hand constraints, reach, leverage, throw, collision, holsters, sockets, and spatial inventory work?
- How are spatial UI, gaze, ray pointers, hand menus, diegetic controls, world scale, occlusion, and comfort masks presented?
- Which feedback channels are visible/audible, and which—haptics, force, stereo depth, physical exertion—are absent from capture?

### High-value natural experiments

- repeated grabs at different approach angles and distances;
- one- versus two-hand manipulation of the same object;
- teleport/smooth movement across the same landmarks;
- snap/smooth turn boundaries and camera fades;
- release trajectories under different hand velocities;
- occlusion and depth ordering around spatial UI;
- recentering or tracking-loss recovery.

### Measurements

Visible pose/camera timing, angular displacement, endpoint error, controller-to-object offset in display/world-relative units, throw trajectory, grab acquisition envelope, locomotion speed between landmarks, turn increment, fade duration, UI angular/viewport size, and body/weapon stabilization. Report physical-input latency, haptic timing, stereo depth, and real-world meters as unsupported unless directly instrumented in the video.

### Clone outputs

Capture-view contract, head/hand/controller proxy state, locomotion state machines, grab/constraint rules, spatial UI anchors, interaction layers, comfort presentation, avatar/IK presentation, and source-backed fixtures for repeated manipulations.

### Traps

- treating a stabilized spectator view as headset motion;
- assuming visible controller motion is the physical input timestamp;
- inferring haptics or comfort from behavior alone;
- converting screen displacement directly to meters;
- cloning the genre while omitting interaction geometry and spatial UI semantics.

## 17. Narrative adventure / visual novel / dialogue / QTE modifier

### Extra forensic questions

- dialogue state, speaker/portrait rules, text reveal, auto/skip/backlog, choice availability, timers, default selections, and interruption;
- quest/objective flags, inventory gates, relationship/reputation variables, scene entry conditions, and branch convergence;
- QTE telegraph, input window, success/failure branch, retry, and cinematic continuity;
- camera staging, animation cues, subtitle/audio synchronization, and transitions between authored and interactive control;
- what state is visible versus hidden in unseen branches.

### High-value natural experiments

- repeated dialogue UI states with different text lengths;
- choices that visibly change the next scene, objective, inventory, or relationship indicator;
- skipped versus unskipped lines;
- QTE success/failure/retry cycles;
- returning to a scene after a visible flag or inventory change.

### Measurements

Text reveal rate, input lockout, choice dwell/timer, transition timing, QTE window bounds, subtitle onset/offset, camera shot duration, and visible branch effects.

### Clone outputs

Dialogue/scene state machines, flag and condition table, choice/QTE contract, text/camera/audio presentation, visible branch graph, and explicit baseline choices for unobserved branches.

### Traps

- inventing the full narrative graph from one path;
- treating cinematic edit order as simulation order;
- interpreting player dwell as emotional response;
- assuming an unavailable choice is globally impossible rather than conditionally gated.

## 18. Sandbox / open-world / creative-systems modifier

### Extra forensic questions

- streaming/region boundaries, world persistence, object ownership, construction/edit constraints, save/load, respawn, and simulation distance;
- tool modes, placement grid/snap, validation, costs/refunds, undo, copy, blueprint, terrain editing, and destruction;
- systemic interactions among weather, time, AI schedules, resources, physics, vehicles, and player-created structures;
- objective freedom versus authored gating, and what systems continue offscreen.

### High-value natural experiments

- repeated placement near valid/invalid boundaries;
- destruction and reconstruction of the same object;
- leaving and revisiting an area;
- tool-mode changes over one target;
- resource cost/refund and persistence checks visible within the supplied footage.

### Clone outputs

Observed world-partition and persistence contract, construction/tool state machines, placement predicates, resource transactions, object lifecycle, and conservative offscreen-simulation baseline choices.

### Traps

- inferring infinite/open simulation from one local slice;
- treating unloaded/offscreen objects as destroyed;
- assuming exact persistence semantics without a revisit;
- expanding one demonstrated tool into a conventional genre feature set.

## Adapter completion rule

For each activated adapter produce:

1. measured constants and intervals;
2. state/formula/schedule candidates;
3. natural experiments found in the supplied footage;
4. selected or unresolved models;
5. clone modules and fixtures;
6. genre-specific blind spots;
7. the smallest preservation contract that recreates the observed experience.

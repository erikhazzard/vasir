# Universal Gameplay Forensics

Every game has hidden tables, clocks, state, formulas, and schedules. Use only the modules relevant to the requested question before genre-specific work. For each active module record direct observations, measurements, candidate mechanics, contradictions, coverage, and open questions. Add implementation requirements only when reconstruction was explicitly requested.

## 1. Temporal system and clock domains

Extract:

- source PTS, wall time, game/round/run clock, animation time, cooldown time, menu time, hit-stop/freeze time, and any time-scale changes;
- which clocks advance during pause, menus, cinematics, slow motion, hit stop, death, or loading;
- recurring periods, phase boundaries, timers, grace windows, decay windows, and scheduled events;
- whether cadence is fixed, state-dependent, stochastic, or synchronized to another event.

Methods:

- compare visible clock progression to PTS;
- time repeated cycles over many repetitions, not one;
- detect duplicate frames and distinguish intentional freeze from capture hitch using audio, UI clocks, and surrounding cadence;
- report onset and duration as PTS intervals with at least one-frame uncertainty.

If reconstruction is requested, specify the clock registry, pause matrix, update/timing order, periodic schedules, and time-scale states.

## 2. Session loop, objectives, scoring, and terminal conditions

Map:

- entry state, preparation, active play, transitions, checkpoints, rounds/waves/turns, results, restart, and meta return;
- explicit and implicit objectives;
- win, loss, death, timeout, surrender, score, rank, combo, streak, and reward conditions;
- objective priority and whether progress is time-, event-, resource-, location-, or state-gated;
- what persists across phase and session boundaries.

Do not infer an unseen meta loop from genre convention. If reconstruction is requested, specify the session state machine, objective conditions, score formulas, terminal transitions, and observed persistence.

## 3. Input actions and visible response semantics

Inventory every visible action channel:

- locomotion axes, aim/look, attack, interact, dodge, jump, reload, block, menu, selection, camera, command, touch, cursor, context action;
- simultaneous versus mutually exclusive actions;
- buffering, queueing, canceling, hold/tap/release behavior, charge, repeat, and lockout;
- visible response onset, animation commitment, recovery, and interruption.

Without synchronized input evidence, report **visible response timing**, not input latency. If a cursor, reticle, touch indicator, or controller overlay is visible, treat it as another stream with its own timing uncertainty.

If reconstruction is requested, specify the action vocabulary, action-state guards, buffering/cancel rules supported by footage, and visible response windows.

## 4. Camera, coordinates, movement, physics, and collision

First choose a valid camera adapter. Then extract:

- screen, normalized-screen, world-relative, grid/tile, track/path, angular, and UI coordinates;
- camera follow, dead zone, damping, look-ahead, zoom, FOV change, shake, recoil, cinematic override, bounds, and occlusion behavior;
- speed, acceleration, deceleration, friction, turn rate, air control, gravity, jump arcs, knockback, drag, momentum, impulses, and state-dependent modifiers;
- collision shape, contact response, overlap rules, sliding, penetration correction, one-way surfaces, slopes, ledges, walls, and out-of-bounds behavior.

Methods:

- prefer stable landmarks, grids, known dimensions, or repeated transit over raw screen displacement;
- separate actor motion, camera motion, object motion, parallax, and zoom;
- use multiple intervals and directions;
- preserve source pixels if no world scale exists;
- do not integrate low-confidence optical flow as zero.

If reconstruction is requested, specify the coordinate registry, camera model, locomotion/physics parameters, collision/state rules, uncertainty, and validity ranges.

## 5. Entities, components, state machines, and event priority

Build an entity inventory from repeated visual identity and behavior:

- player/avatar, enemies, allies, projectiles, hazards, pickups, interactables, terrain, objectives, UI entities, spawned effects;
- observable components: health, resource, movement, collider, damage dealer, targeter, timer, inventory, status, animation, reward;
- states, transitions, guards, timers, interrupts, invulnerability, death/despawn, priority, and concurrent substates;
- whether transitions persist through pause, hit stop, offscreen time, or phase changes.

Do not call a visual pose a state until behavior or transition evidence supports it. If reconstruction is requested, specify entity definitions, component parameters, state transitions and precedence, and lifecycle.

## 6. Combat, damage, healing, status, and interaction

Extract the complete accounting chain:

- attack initiation, wind-up/startup, active window, projectile/travel, collision, hit confirmation, hit stop, damage application, knockback, recovery, cooldown;
- base damage, target modifiers, criticals, armor/resistance, shields, invulnerability, vulnerability, falloff, AoE, cleave, chain, damage-over-time, multi-hit, friendly fire;
- healing, regeneration, lifesteal, shields, overheal, revive;
- status application, stacking, refresh, duration, tick rate, dispel, immunity;
- targeting, hitbox/hurtbox relationships, occlusion, line of sight, range, target selection;
- interaction prompts, hold durations, interruption, costs, rewards.

Name every damage currency and denominator:

- single-target hit damage;
- focus DPS over active combat time;
- aggregate AoE throughput across targets;
- displayed versus actual damage;
- gross damage versus post-mitigation HP loss.

Never compare unlike currencies. Use arithmetic model forks for stacking/order/rounding. If reconstruction is requested, specify attack pipelines, formulas, hit rules, status behavior, timing, and presentation hooks.

## 7. Resources, currencies, inventory, progression, and upgrades

Map:

- every visible resource and its source/sink/storage/cap;
- passive and event-driven gain, drain, regeneration, decay, refund, conversion, overflow, banking, and loss on death/phase;
- XP thresholds, level cadence, choice cadence, reward tiers, rarity, shops, prices, rerolls, inventory slots, equipment constraints;
- upgrade effects, prerequisite graph, mutual exclusion, additive/multiplicative ordering, caps, floors, diminishing returns, and derived-stat propagation;
- when stat changes take effect and whether UI rounds differently from simulation.

Methods:

- anchor to stated menu values and results screens;
- build era tables before/after each choice;
- predict each stacking model’s next visible value;
- reconcile inventory/result summaries against chronological picks;
- separate resource appearance from collection and credit time.

If reconstruction is requested, specify the economy table, progression thresholds, content inventory, upgrade relationships, formula ordering, and UI-display rules.

## 8. Spawn, population, RNG candidates, and difficulty scaling

Extract:

- spawn timing, location distribution, minimum/maximum distance, camera-relative versus world-relative placement, despawn, pooling, caps, and replacement;
- waves, phase changes, elite/boss triggers, reinforcement rules, density, composition, pacing, and safe periods;
- HP, speed, damage, behavior, reward, and count scaling over time/state;
- observed random choices, repeated equivalent trials, frequency, streaks, and dependency on state.

Do not convert one observed frequency into a true probability. Candidate RNG models may include fixed schedules, weighted tables, pity/cooldown, without-replacement draws, seed scripts, state gating, or deterministic sequences.

If reconstruction is requested, specify the spawn scheduler, population controller, scaling curves, selected RNG baseline, and content tables while preserving viable alternatives.

## 9. AI, navigation, targeting, and group behavior

For each behavior class measure:

- perception: range, line of sight, sound/alert, memory, target acquisition;
- decision: state priority, utility/conditions, cooldowns, hysteresis, reaction delay;
- locomotion: chase, flee, orbit, strafe, flank, formation, separation, avoidance, pathfinding, leash, teleport;
- attack: range bands, aim/lead, telegraph, burst/cycle, retreat, combo, group synchronization;
- group behavior: spawn roles, crowd pressure, clustering, lane assignment, aggro sharing, reinforcement;
- offscreen and pause behavior.

Fit repeated trajectories or cycles rather than narrating one. Negative behavior claims require valid opportunities. If reconstruction is requested, specify the selected behavior model, timers, ranges, and navigation assumptions while preserving viable alternatives.

## 10. World, level, encounter, and spatial incentive structure

Map what the footage supports:

- topology: arena, corridor, room graph, track, lane, grid, open world, procedural chunk, wraparound;
- boundaries, obstacles, cover, choke points, elevation, hazards, interactables, spawn zones, objectives, traversal gates;
- camera reveal, offscreen persistence, room reset, backtracking, checkpoint, procedural repetition;
- how geometry changes threat, resource collection, routing, kiting, visibility, and decision cost.

Separate a world map reconstructed from stable landmarks from a screen-space path. If reconstruction is requested, specify topology, collision geometry approximation, encounter placement logic, spatial rules, and procedural candidates.

## 11. HUD, menus, information flow, and decision interfaces

Inventory:

- persistent HUD, transient feedback, prompts, tooltips, menus, choice screens, inventory, maps, results;
- hierarchy, placement, color/shape encoding, animation, sound, reveal timing, persistence, stacking, occlusion;
- what information is exact, rounded, delayed, hidden, or ambiguous;
- selection controls, default focus, dwell, confirmation, cancel, timeout, pause behavior;
- decision frequency, option count, comparability, preview, tradeoff clarity, and interruption risk.

Dwell is not deliberation until interruption, pause state, frozen simulation, and input inactivity are separated. If reconstruction is requested, specify UI states, visible fields, formatting/rounding, transitions, and decision flow.

## 12. Feel grammar: animation, VFX, audio, camera, and feedback stack

Decompose each consequential action into a synchronized timeline:

- anticipation/startup;
- actor motion and pose;
- camera impulse/recoil/shake/zoom;
- VFX onset, shape, color, growth, lifetime, blend, layering;
- audio onset, attack, body, tail, pitch/variation, ducking;
- hit stop/freeze/slow motion;
- target reaction, knockback, flash, particles, numbers;
- UI confirmation and resource change;
- recovery and return to control.

Measure visible timing across repeated samples. Audio energy only proposes events; listen before describing source. Distinguish control feel, combat readability, impact, rhythm, clarity, and spectacle. If reconstruction is requested, specify feedback ordering, animation/VFX/audio timings, camera impulses, and presentation priorities.

## 13. Pacing, pressure, power curves, and run-specific balance

Construct time- or state-indexed curves for:

- player power, survivability, mobility, resource rate, option quality;
- enemy threat, density, HP, damage, speed, control pressure;
- kill/score/objective rate, downtime, decision cadence, recovery, volatility;
- gaps between required and available throughput or control.

Every curve names its model assumptions and uncertainty. A “winnable band” is a run-specific explanatory model unless multiple equivalent conditions are present in the supplied footage. Do not infer global fairness or optimal balance from one trace.

If reconstruction is requested, specify scaling schedules, pressure phases, pacing targets, encounter cadence, and the run-specific balance model.

## 14. Persistence, meta, live-service, and content structure

Only record what appears:

- unlocks, loadout, character selection, skill trees, currencies, quests, dailies, battle pass, matchmaking, lobbies, social, saves, retries;
- what carries across runs and what resets;
- content taxonomies and gating;
- menu-to-session transitions.

Unknown backend rules remain open. If reconstruction is requested, specify only the visible meta states and content taxonomy, not imagined services.

## 15. Network and performance artifacts

When visible, distinguish candidates:

- capture hitch versus game hitch;
- server correction, rollback, teleport, interpolation, packet loss, rubber-banding;
- animation desync, input queue, dropped visual frames, audio continuity;
- loading, streaming, LOD, pop-in, shader compilation, frame pacing.

Video alone rarely identifies the network architecture. Record the visible artifact and candidate causes. If reconstruction is requested, specify presentation tolerances or replication targets only when justified.

## 16. Player behavior, information state, and decision quality

Use `player-modeling.md`. Record:

- visible action and context;
- information plausibly available at that moment;
- candidate goals/beliefs/attention states;
- alternatives;
- choice quality, execution quality, and outcome separately;
- repeated habits, adaptation, hesitation, risk policy, route/target priority.

Do not let the final outcome rewrite what was knowable at decision time.

## 17. Design grammar and portable lessons; preservation when requested

Only when design lessons or preservation are explicitly in scope, and after the relevant system evidence has stabilized, ask:

- Which repeated rule interactions create the game’s signature decisions?
- What tension, rhythm, readability, mastery, or compulsion emerges from those dynamics?
- Which mechanics are load-bearing versus ornamental?
- What must a clone preserve exactly, approximately, or only functionally?
- Which design lessons generalize, and which depend on this content/camera/genre?

When preservation is explicitly in scope, output a preservation contract:

- **Exact:** observable constants or sequences where deviation breaks fidelity.
- **Bounded:** a range or relationship matters more than the exact hidden value.
- **Functional:** preserve the player-facing effect, not the unknowable implementation.
- **Free:** footage provides no constraint or the element is non-load-bearing.

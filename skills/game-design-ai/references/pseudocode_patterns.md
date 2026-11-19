# Pseudocode Patterns Reference

Use implementation-neutral pseudocode to clarify execution. Do not use engine-specific APIs unless explicitly requested.

## Hard-veto plus utility scoring

```text
every decision_tick:
    context = build_perceived_context(agent)
    candidates = generate_candidate_actions(agent, context)

    legal_candidates = []
    for action in candidates:
        veto = first_hard_veto(action, context)
        if veto exists:
            debug.record_veto(action, veto)
        else:
            legal_candidates.add(action)

    if legal_candidates is empty:
        return fallback_action(agent, context)

    scored = []
    for action in legal_candidates:
        score = score_action_with_utility(action, context, agent.profile)
        scored.add(action, score)

    selected = select_with_hysteresis_and_tiebreak(scored, agent.current_action)
    debug.record_decision(context, scored, selected)
    return selected
```

## FSM plus utility local choice

```text
every decision_tick:
    mode = agent.mode

    if must_transition_to_emergency_mode(context):
        mode = Emergency
    else if mode_completion_condition_met(mode, context):
        mode = choose_next_mode(context)

    weights = weights_for_mode(mode, agent.profile)
    action = utility_select(actions_allowed_in_mode(mode), context, weights)

    agent.mode = mode
    execute(action)
```

## Behavior tree with utility selector

```text
Root Selector
    Sequence: CriticalDanger?
        EscapeTask
    Sequence: CanCompleteCurrentCommitment?
        ContinueCommitmentTask
    Sequence: HasTacticalChoices?
        UtilitySelector
            Attack
            Reposition
            SupportAlly
            Retreat
    IdleOrPatrol
```

## GOAP sketch

```text
on goal_selection_tick:
    goal = select_goal_by_utility(perceived_state, agent.profile)
    plan = planner.find_plan(
        current_state = perceived_state.symbols,
        goal_state = goal.desired_symbols,
        actions = available_action_schemas,
        budget = planning_budget
    )

    if plan found:
        agent.current_plan = plan
    else:
        agent.current_plan = fallback_plan

on execution_tick:
    if current_step.preconditions_invalid:
        invalidate_or_repair_plan()
    else:
        execute_current_step()
```

## HTN sketch

```text
on planning_tick:
    root_task = choose_compound_task(context)
    plan = decompose(root_task, context, method_priority, budget)

    if plan valid:
        agent.plan = plan
    else:
        agent.plan = fallback_task_plan

function decompose(task, context):
    if task is primitive:
        return [task] if task.preconditions_met(context)
    for method in task.methods ordered by priority:
        if method.preconditions_met(context):
            subtasks = method.subtasks
            subplan = decompose_all(subtasks, context)
            if subplan valid:
                return subplan
    return invalid
```

## Tactical position selection

```text
function select_tactical_position(agent, context):
    candidates = generate_candidates(context)

    for c in candidates:
        if not reachable(c): veto(c, "unreachable")
        if in_forbidden_zone(c): veto(c, "forbidden")
        if no_escape_route(c): veto(c, "no_escape")

    for c in non_vetoed_candidates:
        c.score =
            cover_weight * cover_quality(c)
          + los_weight * desired_line_of_sight(c)
          + spacing_weight * team_spacing(c)
          - threat_weight * threat_at(c)
          - exposure_weight * exposure(c)
          + objective_weight * objective_value(c)

    return best_with_hysteresis(candidates, agent.current_position)
```

## Influence map update

```text
every influence_update_tick:
    clear_layers()

    for threat in visible_threats:
        add_radial_layer("danger", threat.position, threat.range, threat.strength)

    for objective in objectives:
        add_radial_layer("objective", objective.position, objective.range, objective.value)

    for ally in allies:
        add_spacing_layer("ally_spacing", ally.position)

    normalize_layers()
    cache_until_next_update()
```

## Director pacing

```text
every director_tick:
    player_model = estimate_player_state()
    current_intensity = estimate_intensity(player_model, agents, objectives)
    target_intensity = target_for_phase(difficulty, match_time, player_model)

    if current_intensity < target_intensity - hysteresis:
        apply_fair_pressure_increase()
    else if current_intensity > target_intensity + hysteresis:
        apply_recovery_or_pressure_reduction()

    enforce_population_caps()
    enforce_spawn_fairness()
    record_director_debug()
```

## Autoplay regression test

```text
for seed in test_seed_set:
    world = initialize_test_world(seed)
    bot = create_autoplay_agent(profile)

    for tick in max_ticks:
        input = bot.choose_input(world.observation())
        world.step(input)

        assert_invariants(world)
        record_metrics(world)

    compare_metrics_to_expected_range(seed)
```

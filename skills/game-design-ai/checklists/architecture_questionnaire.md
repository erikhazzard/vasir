# Architecture Questionnaire

Ask these questions before choosing an AI architecture.

## Behavior shape

```text
Are there only a few clear modes?
Do behaviors need sequencing and fallback?
Are decisions continuous risk/reward tradeoffs?
Do actions combine into many possible plans?
Do designers need to author high-level task decompositions?
Is spatial positioning the core problem?
Is adversarial lookahead small and bounded?
Is global pacing more important than individual intelligence?
```

## Production constraints

```text
Who authors the behavior: designer, engineer, LLM/spec agent, or tool?
Who debugs it?
How often does it update?
What is the per-agent CPU budget?
Does it need deterministic replay?
Can it use randomness? If yes, is it seeded?
What data structures/world queries exist?
What happens when a query fails?
```

## Player constraints

```text
Should the AI optimize to win, entertain, teach, train, or simulate?
What should the player be able to predict?
What should the player be able to exploit?
What mistakes are acceptable?
What would feel like cheating?
How visible are the AI decisions?
```

## Architecture selection prompts

```text
If modes are few and explicit → FSM/HFSM.
If sequencing/fallback dominates → Behavior Tree.
If continuous tradeoffs dominate → Utility AI.
If goal/action combinations explode → GOAP.
If high-level task decomposition matters → HTN.
If position/space dominates → Influence maps/TPS.
If bounded adversarial lookahead dominates → MCTS/minimax.
If pacing/spawn/difficulty dominates → Director AI.
If learning is proposed → justify training cost, determinism, interpretability, safety, and debug story.
```

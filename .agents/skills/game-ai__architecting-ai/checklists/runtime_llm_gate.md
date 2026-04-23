# Runtime LLM Gate

Default policy: no runtime LLM directing gameplay behavior. Use offline LLMs for authoring, analysis, tuning suggestions, test generation, and content drafts.

If runtime LLM use is requested, evaluate these gates.

## Required gates

```text
Determinism: Can behavior be replayed or bounded?
Latency: Can decisions meet frame/gameplay timing?
Cost: Can per-session cost scale?
Safety: Can outputs be constrained and moderated?
Fairness: Does it create multiplayer or competitive unfairness?
Debuggability: Can designers know why an action happened?
Fallback: What happens when the model fails, stalls, or produces invalid output?
Content risk: Can it say/do something off-tone or unsafe?
Exploitability: Can players prompt or bait it into breaking rules?
Authoring value: Is runtime generation necessary, or would offline spec/content generation work?
```

## Acceptable runtime LLM cases

```text
Non-critical ambient dialogue with strict constraints and fallback.
Out-of-band NPC text generation that does not determine competitive outcomes.
GM/director suggestions reviewed or bounded by deterministic rules.
Player-facing creative mode where unpredictability is the feature.
```

## Risky runtime LLM cases

```text
Competitive bot decision-making.
Physics/action timing.
Combat fairness decisions.
Economy-critical rewards.
Moderation-sensitive dialogue without constraints.
Networked multiplayer authority.
```

## Safer alternative pattern

```text
LLM authors behavior spec offline.
Validator checks spec.
Deterministic kernel executes spec.
Telemetry is summarized by LLM offline.
LLM proposes tuning changes.
Human or validation system accepts changes.
```

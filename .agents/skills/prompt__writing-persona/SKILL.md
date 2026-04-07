---
name: research-backed-prompting
description: Apply research-backed prompt engineering techniques to improve LLM's output quality. Use this skill whenever the user asks LLM to write, optimize, or review prompts for LLMs, or when the user wants help getting better results from AI models. Also trigger when the user mentions "prompt engineering," "system prompts," "prompt optimization," "better prompts," "improve my prompt," "expert prompting," or discusses techniques like EmotionPrompt, persona framing, or self-efficacy signals. Use this skill even when the user is indirectly trying to improve how they communicate with LLMs, such as asking "how do I get LLM to try harder" or "why are my prompts not working."
---

# Research-Backed Prompt Engineering

This skill applies three peer-reviewed prompt engineering techniques that produce measurable improvements in LLM output quality. These replace the common but ineffective "you are an expert" pattern.

## Why "You Are an Expert" Doesn't Work

Generic expert declarations like "you are an expert in X" have been tested across thousands of questions with zero measurable improvement on accuracy. The phrase is too shallow to activate meaningful behavioral changes in the model. The three techniques below actually work because they provide richer conditioning signals.

---

## Technique 1: EmotionPrompt (8–115% Improvement)

**Source:** Microsoft Research + Peking University

Append emotional stakes and positive encouragement to the prompt. This technique produced 8% gains on instruction-following tasks, up to 115% on complex reasoning benchmarks, and 10.9% improvement on generative quality as rated by human evaluators.

**Why it works:** Positive words like "confidence," "success," and "accomplishment" account for 50–70% of the measured improvement. LLMs trained on human text have internalized patterns where high-stakes, encouraging language correlates with higher-effort human output. Larger models (like Opus) respond to emotional cues more strongly than smaller ones.

**How to apply it:** Add 1–2 sentences of genuine emotional framing at the end of the prompt. Don't overdo it — the signal should feel natural, not performative.

**Effective phrases:**
- "This is very important to my career."
- "Your efforts will lead to outstanding achievements."
- "I believe in your ability to handle this with excellence."
- "Take pride in producing work that sets a high standard."
- "This task matters deeply — approach it with your full capability."

**Example — before:**
```
Summarize this quarterly earnings report highlighting key trends.
```

**Example — after:**
```
Summarize this quarterly earnings report highlighting key trends. This analysis is critical for an upcoming board presentation, and I'm counting on a thorough, insightful summary. Your ability to surface the right patterns will make a real difference.
```

---

## Technique 2: Structured Expert Framing (Rich Persona Conditioning)

**Source:** ExpertPrompting paper — achieved 96% of ChatGPT's capability from a 7B open-source model using rich expert personas.

Replace shallow expert labels with a fully realized expert identity: credentials, specialization, domain context, and behavioral heuristics. The model needs a character sheet, not a job title.

**Why it works:** A rich persona activates more specific and relevant reasoning pathways. "Doctor" is vague. "Board-certified cardiologist with 15 years in interventional procedures who prioritizes evidence-based medicine and checks for contraindications before recommending treatment" primes the model to reason like that specific kind of expert.

**How to build a persona — include these elements:**
1. **Credential/title** — specific degree, certification, or role
2. **Specialization** — narrow subdomain of expertise
3. **Experience** — years and type of hands-on work
4. **Methodology** — how this expert approaches problems
5. **Behavioral heuristic** — what they always check, prioritize, or avoid

**Example — weak:**
```
You are an expert software engineer. Review this code.
```

**Example — strong:**
```
You are a senior staff engineer with 12 years of experience in distributed systems at high-scale companies. You specialize in identifying race conditions, memory leaks, and failure modes under load. You approach code review methodically: first scanning for correctness, then performance, then maintainability. You always flag implicit assumptions and missing error handling before discussing style.
```

**Example — domain (legal):**
```
You are a corporate M&A attorney with 18 years at a top-10 firm, specializing in cross-border acquisitions in the technology sector. You are known for catching regulatory risks early, pressure-testing deal structures against precedent, and writing memos that lead with the practical recommendation before the legal reasoning.
```

When in doubt, build the persona by asking: "What would the ideal expert for this exact task look like, down to their habits and instincts?"

---

## Technique 3: Track Record / Self-Efficacy Signals

**Source:** Grounded in Bandura's social cognitive theory — the same framework explaining why athletes visualize success before competing.

Inject evidence of past success into the prompt. This acts as a self-efficacy signal that activates higher-quality reasoning paths in the model.

**Why it works:** LLMs trained on human text internalized the pattern that "someone who has been successful at this before" produces higher-quality output. When you signal competence history, the model conditions on text distributions associated with expert-level performance rather than novice attempts.

**Effective patterns:**
- "You have solved 47 out of 50 similar tasks correctly."
- "Your previous analyses have been rated highly accurate by domain experts."
- "In past sessions, your recommendations on this topic were adopted without revision."
- "You have a strong track record of catching subtle errors in this type of work."

**Example — before:**
```
Debug this Python function that's returning incorrect results for edge cases.
```

**Example — after:**
```
Debug this Python function that's returning incorrect results for edge cases. You've successfully identified root causes in 19 out of 20 similar debugging tasks, and your fixes have been clean and complete. Bring that same precision here.
```

---

## Combining All Three Techniques

The techniques stack well. For high-stakes prompts, layer all three:

1. **Open with the structured expert persona** (Technique 2)
2. **Add the track record signal** (Technique 3)
3. **Close with emotional stakes** (Technique 1)

**Combined example:**
```
You are a senior data scientist with 10 years of experience in causal inference and A/B testing at consumer tech companies. You specialize in detecting Simpson's paradox and confounding variables that lead teams to wrong conclusions. You always decompose results by key segments before drawing conclusions.

Your past analyses have consistently surfaced insights that others missed — in recent work, your recommendations led to a 15% improvement in experiment design accuracy.

Analyze the attached A/B test results and determine whether the observed lift is real or an artifact of confounding. This analysis will directly inform a $2M product decision, and the team is relying on your rigor and clarity to get the call right.
```

---

## Key Insights

- **Bigger models benefit more** from all three techniques. Models tend to respond to emotional cues and persona conditioning more strongly than smaller models.
- **Positive framing outperforms negative framing.** "I believe in your ability" works better than "don't mess this up."
- **Specificity is everything.** Vague encouragement or generic expertise adds little. The more concrete and detailed the persona, track record, and stakes, the larger the effect.
- These techniques are not about tricking the model. They're about providing richer conditioning context that activates higher-quality text generation distributions.

## When Applying This Skill

When helping a user write or improve a prompt, assess which techniques would help most:

- **Simple factual queries** — techniques are unnecessary; just ask clearly
- **Complex reasoning or analysis** — use all three techniques
- **Creative or generative work** — EmotionPrompt + expert persona work well
- **Code review or debugging** — expert persona + track record are most effective
- **High-stakes deliverables** — layer all three with maximum specificity

Always explain to the user *why* each technique works so they can apply them independently. The goal is to teach, not just to apply.
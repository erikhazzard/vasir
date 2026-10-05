# Expert Interview

Read when eliciting a person's expertise for a skill, preparing written questions for them, or distilling their replies. `SKILL.md` owns skill authoring; this reference owns the interview.

**Choose questions that can change consequential model behavior. Make them easy to answer.** The interviewer does the structuring work; the expert supplies discriminating judgments. Bring a plausible diagnosis, edit, procedure, or decision for them to correct. A short question about a familiar tradeoff can still waste their time. Asking someone to explain their entire workflow transfers the interviewer's work to the expert.

Capture assumed fundamentals and advanced judgment through the conversation. The expert needs no AI knowledge. Written answers are sufficient; observation, uploads, demonstrations, and AI trials are optional.

## Contents

1. [Earn the Personalization](#1-earn-the-personalization)
2. [Make Each Answer Easy](#2-make-each-answer-easy)
3. [Choose a Useful Probe](#3-choose-a-useful-probe)
4. [Follow Their Answer](#4-follow-their-answer)
5. [Capture the Obvious Without Assigning Homework](#5-capture-the-obvious-without-assigning-homework)
6. [Worked Conversation](#6-worked-conversation)
7. [Distill and Finish](#7-distill-and-finish)

## 1. Earn the Personalization

Before composing questions, use the available context: specialty, actual tasks, project or medium, tools, constraints, collaborators, recurring frustrations, and earlier answers. Form a small private picture of what this person decides and what remains unknown. Do not ask them to repeat supplied information or fill out a profile.

Map the consequential decisions within their strong areas before choosing a branch: diagnosing failures, making changes, handling shared dependencies, and deciding whether the result is correct. Identify where a plausible generalist or unsteered-model response would be wrong, wasteful, or superficially convincing. Prefer decisions with meaningful consequences or repeated use where this expert can supply a correction. Weight established expertise above areas they say they are just learning. The map is for selecting questions, not a questionnaire or a quota of topics.

For example, a UE artist whose strengths include shaders/materials, tools, and project maintenance warrants early consideration of shader debugging, material-system changes, automation, and asset lifecycle decisions. An easy static-switch discussion must not consume the interview while shader diagnosis remains unexplored. Technical depth comes from the observation that separates two causes, the tempting fix that makes things worse, or the condition under which a tool's output is misleading. It does not require a long question.

Use existing work or an actual unsteered model attempt when available to locate a mistake. Otherwise treat the proposed model action as an interviewer hypothesis, not an observed AI failure. Check uncertain technical premises against relevant primary documentation when that changes the question. Research supplies credible situations; the expert supplies their own judgment. Do not replace the interview with a literature review or attribute outside advice to the expert.

Personalization must change the situation or decision being asked about. Inserting a job title into “describe your workflow” is cosmetic. A tools artist, a character rigger, and a combat VFX artist should receive different situations and choices. Use their own terminology as it emerges.

| Available context | Opening move |
|---|---|
| Specialty and a meaningful task are known. | Choose a consequential unresolved decision, then supply a short situation and one concrete question. |
| Only a broad role is known. | Ask one easy routing question with plausible areas to choose from. A phrase is enough; allow a different answer. |
| A prior answer supplies a cue, complaint, preference, or correction. | Update the guidance and gaps. Deepen this branch only if the next answer could materially change the instruction. |
| Notes already contain useful expertise. | Extract it and probe only consequential gaps, or author the skill if that is the request. |

For the cold start where only “technical artist” is known, an appropriate opener is:

> Where do people lean on you most: shaders/materials, VFX, rigging, tools/pipeline, performance—or something else?

That establishes a branch with little effort. Once the branch is known, supply a situation in it. Do not follow the choice with “now explain everything you do.”

Separate known facts from proposed situations. You may invent a plausible **hypothetical** to make a question answerable; introduce it with “Say…” or “Suppose…”. Do not invent the expert's engine, portfolio, production history, preferences, or failures to sound personally informed. Use supplied materials when they help; do not turn preparation into a broad research project or request a biography.

## 2. Make Each Answer Easy

Default to one question per live turn. For written questions to forward, use a short opening round: when the specialty is unknown, the routing question can be the whole first round; when context is sufficient, offer a few specific prompts about the same task. A complete questionnaire, when explicitly requested, can use small groups of such prompts. Each must stand alone without requiring a conversation the recipient has not seen.

A question should contain only the context needed to make **one judgment**. Let the expert answer with a choice, a few words, or a correction; invite depth when they volunteer it. One numbered item with three follow-up questions is still three requests. “Rough notes are fine” does not make a broad essay prompt easy.

Prefer actions such as choosing what to inspect first, spotting a missing prerequisite, changing one instruction, predicting a consequence, or naming the condition that flips a choice. Use a narrow open question when it is easier than presenting options. Choices are scaffolding, not a required format or an exhaustive taxonomy.

Before sending, check privately:

- **Grounded:** Which known detail makes this relevant to this expert? If only their role is known, does this cheaply locate their specialty?
- **Bounded:** Can a short answer settle one useful uncertainty without planning an essay or searching for a past project?
- **Consequential:** What specific diagnosis, action, check, or stopping condition might an unsteered model get wrong? How could this answer correct it, and why does this gap deserve attention ahead of the others?
- **Correctable:** Can they reject the premise or supply an unlisted answer without fighting the question?

Rewrite questions that fail. Do not print this check, an interview agenda, extraction labels, or a long explanation of skill creation. A brief opener such as “A few quick calls from your work—short answers are fine” is enough when orientation is needed. Match their tone without forcing banter, flattery, or gamification.

## 3. Choose a Useful Probe

Use domain knowledge to create plausible situations and candidate actions. Do not make the expert invent every example. Keep the scenario small enough that the question concerns their judgment rather than their patience.

When the goal is expertise beyond the model's usual output, prefer a small **actual AI work proposal** for the expert to review. Generate it in a fresh context without the interview answers when feasible, or use an existing attempt. Keep the real task constraints and normal competence; do not deliberately weaken the proposal. Show only enough of the plan, code, diagnostic sequence, or proposed controls for the expert to judge one consequential choice. Ask what they would change, if anything, before using it in their work.

Compare the correction to the original proposal. A specific difference can reveal an omitted dependency, a misleading check, an unnecessary abstraction, a control the expert would remove, a deliberate exception to common advice, or a different order of work. Recover the condition that makes the correction appropriate. Agreement is also valid evidence: do not pressure the expert to be contrarian or keep drilling an already-sound choice. Choose another consequential decision when there is no new guidance to extract.

If a fresh model already produces the interview's advice, preserve any useful baseline but do not present it as demonstrated transfer of distinctive expertise. A single sample establishes only what happened on that task. A proposed mistake is still a hypothesis when no actual model attempt exists. Real comparisons improve question selection; they are not mandatory infrastructure or a reason to delay a requested question set.

Seek consequential disagreements, including counterintuitive ones: a standard fix they reject, a reassuring signal they distrust, an ordinary dependency the model overlooks, or a shortcut they accept under specific conditions. Do not demand surprising advice or manufacture a wrong answer. If they agree with a proposal, preserve that result. If the answer would merely restate a known preference, ask about a different technical decision.

The examples below are **constructed question patterns**, not claims about a particular expert or correct technical answers. Adapt the method to the known person; do not paste the same technical-art questions into every interview.

| What you need to learn | Example of a bounded probe |
|---|---|
| The observation that distinguishes causes. | Known focus is UE materials: “A normal map makes seams more visible. Before changing the material graph, what would you check?” |
| A dangerous simplification in an automation rule. | They want unused-asset pruning: “Say a tool proposes deleting everything it cannot trace back to the maps you ship. What would you change in that rule for your projects?” |
| First diagnostic move. | Known focus is combat VFX: “Say the hit looks good close up but gets lost in a busy fight. What do you inspect first?” |
| An enabling prerequisite. | They mentioned checking scale: “What do you compare the prop against?” |
| Practical meaning of a term. | They called a rig “animator-friendly”: “What should an animator be able to do without asking you for help?” |
| Their preferred action among credible alternatives. | Known focus is pipeline tools: “An artist keeps bypassing your tool. Do you check for a missing feature, confusing controls, or something else first?” |
| A priority when resources conflict. | Known task is preparing a character rig for handoff: “You have time for one more pass: extreme-pose deformation or easier controls. Which gets it?” Accept a missing condition as the answer. |
| A correction to a plausible instruction. | Known task is reusable prop handoff: “Draft rule: ‘Put the pivot at the center of the base.’ What, if anything, would you change?” |
| An exception. | After they choose a fix, change one relevant condition: “Same case, but this effect marks damage that is still active. What changes?” |
| A hidden dependency. | After they name a check: “What has to be settled before that check tells you anything?” |

Use candidate actions that a competent practitioner could reasonably consider. Avoid an obviously foolish option paired with an obviously good one. Do not imply that selecting an option proves its cause, or infer agreement from an unanswered suggestion. Keep room for “neither,” “something else,” “it depends,” or “that situation doesn't occur in my work.”

A proposed rule can help someone articulate a correction, but must be genuinely provisional. Avoid fishing for agreement with “Surely you'd…” or “Don't you think…”. Alternate proposed choices with unprompted, specific questions so the interviewer's guesses do not define the entire space. Do not turn the conversation into a quiz, a series of contrarian traps, or a demand to justify every answer.

## 4. Follow Their Answer

Use each answer to update both the supported guidance and the remaining domain gaps. Follow the current branch while it is revealing a new cue, action, mechanism, or boundary; then choose the highest-value unresolved decision. Conversational continuity does not require another question about the same topic. If the expert starts explaining in depth, follow that explanation rather than forcing them back into short answers.

| Response | Useful next move |
|---|---|
| A brief choice or action. | Probe the most useful missing cue, check, or consequence. Do not automatically ask for an essay-length justification. |
| “It depends.” | If the missing condition blocks usable guidance, supply a specific case or ask for the decisive observation. If they already gave the relevant conditions, preserve the conditional rule and move on. Do not keep asking for a universal preference. |
| A familiar term hides a prerequisite. | Ask for the reference, comparison, or observable sign that makes it actionable. |
| They reject the scenario. | Treat the correction as information. Use their replacement situation, or ask which premise is wrong. Do not defend the question. |
| Their answer conflicts with an earlier one. | Put the two concrete cases side by side and ask which changed condition matters. |
| They cannot recall an example. | Supply a small hypothetical; do not repeat the request for a story. |
| Several answers already establish the rule. | Capture it and move to a valuable untouched branch. A compact draft instruction can show what their answers produced; do not demand another explanation of the same tradeoff. |

Recover rationale selectively. Sometimes “What breaks if that is skipped?” reveals more than “Why?”. Sometimes the cue and action are enough for a supported instruction. Ask about the accepted cost or a reversal when it could prevent misapplication; do not mechanically request situation, alternatives, rationale, costs, and exceptions for every answer.

Before a follow-up, ask privately what new instruction its answer could add. If the answer is already implied by the replies, stop that branch. Rewording “what makes it worth it?” after the expert has named workflow, performance, complexity, and shared maintenance does not extract more expertise. Their uncertainty or context dependence is part of the result, not a defect to interrogate away.

For written exchanges, use the replies to write the next short round. Keep later branches private until useful. If the user requests a complete one-shot questionnaire, make each prompt independently answerable and include short conditional branches only where they save work; do not disguise a giant decision tree as a friendly form.

## 5. Capture the Obvious Without Assigning Homework

The baseline is an extraction obligation, not a required introductory lecture. Track task purpose, inputs, terms, prerequisites, routine order, checks, and acceptable output privately. Recover missing fundamentals inside the situations the expert is already discussing.

For example, “I obviously check scale and pivots” has not yet transferred the baseline. “What do you compare the scale against?” can expose the reference. A later pivot question can expose intended interaction or handoff needs. Each answer can be short, while the accumulated instructions become operational.

Do not ask for a glossary, a complete workflow, all common mistakes, or “everything you assume a colleague knows” as the default opening. Break the knowledge you need into decisions the expert can recognize. Expand a term only when its meaning changes correct action; avoid making a senior expert teach unrelated introductory material.

Capture ordinary successful practice as well as failures and surprising insights. Once a failure probe reveals a rule, establish the relevant normal check or prerequisite instead of accumulating only cautionary stories. Neither familiarity nor lack of novelty justifies dropping enabling knowledge from the resulting skill.

## 6. Worked Conversation

*Constructed example. Known context supplied by the organizer: the expert makes combat VFX for an isometric game. The replies illustrate extraction; they are not independently verified domain doctrine.*

> **Interviewer:** Say a hit effect looks good close up but gets lost in a busy fight. What do you inspect first?
>
> **Expert:** The camera. People judge it zoomed in.
>
> **Interviewer:** What viewing setup do you use to make that call?
>
> **Expert:** The normal gameplay camera, with enemies moving. The hit has to register, and you still need to see the next attack.
>
> **Interviewer:** Suppose the hit registers, but its lingering particles hide that next attack. What's your first edit?
>
> **Expert:** Shorten the tail. Keep the contact flash.
>
> **Interviewer:** Change one thing: those particles mark a hazard that's still active. What changes?
>
> **Expert:** Then the duration is information. I need a persistent cue, just one that doesn't hide the attack.

The interviewer supplied situations; the expert supplied the judgments. The baseline includes the viewing setup and required visible information. The conditional rule distinguishes decorative persistence from an ongoing gameplay signal. Preserve both:

> Evaluate combat effects at the normal gameplay camera with enemies moving. Check that the hit registers and the next attack stays visible. Shorten decorative tails that obscure that attack while preserving contact confirmation. When persistence communicates an active hazard, preserve that information in a cue that leaves the attack readable.

No artifact, remembered project, or long-form account was required. No numeric duration or claim of demonstrated model perception is supported by this example.

## 7. Distill and Finish

Keep the bookkeeping on the interviewer side. Retain a source answer or short excerpt for important instructions, the relevant context, and any unresolved distinction. Separate the expert's answer from interviewer hypotheses and hypothetical conditions. A suggested option becomes source-supported only to the extent the answer endorses or corrects it; silence is not agreement.

Carry the baseline into definitions, prerequisites, ordered steps, and checks. Carry judgment into the creator's cue/action/priority/boundary instructions. Preserve supported rules even when the expert cannot explain the mechanism; do not invent causes, thresholds, or universality. Their experience, preference, and local convention retain those source statuses. Do not substitute the model's generic advice for their answer.

Privately distinguish captured foundations from demonstrated corrections to model behavior. For a correction, retain the original proposed action, the expert's replacement, and the supported condition or reason. Both kinds of guidance can belong in a draft; neither a polished summary nor familiar advice establishes that expert judgment has transferred. Do not relabel ordinary guidance as counterintuitive to satisfy the interview's ambition.

Match the requested output:

- **Questions:** deliver the usable opener or tailored written prompts. Do not simulate the expert's replies or author a domain skill from guesses.
- **Ongoing interview:** pursue the next consequential gap. Respect time and diminishing returns; there is no quota of stories, rounds, or rules.
- **Extraction:** return supported baseline knowledge, decisions, scope, and the specific gaps that matter.
- **Skill creation:** once answers support useful instructions for a coherent task, continue through the existing creator. Do not require exhaustive coverage, uploads, live observation, or another approval for already-requested authoring.

Distinguish ending a session, having enough material for a first draft, and demonstrating the intended improvement. When asked how many questions remain, bound the next session by its decision scope and respect the agreed limit; an arbitrary final question does not establish that extraction is complete. At the limit, deliver what is supported and state consequential gaps without continuing to interrogate the expert. A small draft can be useful while the larger expertise-transfer goal remains unfinished.

When useful, check transfer on a new text scenario and let the expert correct the proposed action. A nearby case where the rule should reverse can expose overapplication. Such checks can improve the draft; they are not prerequisites for delivering supported work. Distinguish agreement with a summary, a successful interview probe, and actual evidence that the resulting skill improves task execution.

Judge an interview trial by the decision-changing guidance it extracts and the important gaps it reaches, as well as the expert's effort. Producing short, personalized-looking questions alone does not establish interview quality. Look for a resulting instruction that would correct a specific action or diagnostic sequence while preserving its conditions.

---
name: game-design__ensuring-design-coherence
description: Extract and pressure-test a game's or feature's actual fantasy, core loop, and design pillars. Triggers on designing game loops, improving gameplay, and diagnosising why a game doesn't feel good.
---
# Game Core Design Coherence

## Prime directive

Determine whether the design knows what player experience it is actually creating.

A design is coherent when these all point in the same direction:

- the player identity/fantasy
- the verbs that prove it
- the incentives that shape behavior
- the failure/RNG meaning
- the renewed intent after each loop
- the social and coordination burden
- the sacrifices the design is willing to make
- the uncertainty the team is testing next

Do not grade the feature list. Grade the causal engine underneath it.

## Operating rules

- Name mechanisms, not vibes.
- Do not invent generic pillars.
- Do not recommend additions before checking for contradiction or subtraction.
- Do not optimize a metric before asking what behavior and meaning it is rewarding.
- Treat player trust as a design output, not a community-management problem.
- If evidence is missing, say what cannot be known and specify the prototype question that would reveal it.

## The audit

### 1. Actual fantasy

Ask:

> What does the player get to become while playing?

Do not accept genre, theme, lore, camera, art style, marketing copy, or mood words as the answer.

Strip those away and inspect:

- repeated verbs
- real risks
- rewarded behaviors
- constraints
- status signals
- social consequences
- what players choose to suffer for

A fantasy is real only if repeated play proves it.

Weak: `Players feel immersed, powerful, and social.`

Strong: `Players become the clutch teammate who reads the play early, rotates first, and turns a losing round into a comeback others recognize.`

### 2. Proving verbs and incentive alignment

For each important verb, ask what fantasy it proves.

Then find where rewards corrupt the fantasy.

Common meaning bugs:

- fantasy says mastery; rewards time-spent or chores
- fantasy says teamwork; rewards selfish stat extraction
- fantasy says freedom; optimal play is checklist obedience
- fantasy says expression; choices collapse into one dominant build
- fantasy says skill; decisive randomness lands after commitment
- fantasy says competitive integrity; status can be bought or made unreadable
- fantasy says casual social play; structure demands appointment-level coordination

The hardest design bugs are meaning bugs: the system says one thing and teaches another.

### 3. Core loop as renewed intent

A loop is not `action -> reward -> upgrade -> repeat`.

A real loop is:

`player action -> game response -> state change -> renewed intent`

The key question:

> After one cycle, why does the player want another?

Weak renewed intent:

- currency accumulation
- completion pressure
- obligation
- sunk cost
- fear of missing out
- numerically larger but emotionally identical state

Strong renewed intent:

- a new tactical hypothesis
- a visible near-miss
- a changed social/status situation
- a meaningful unlock that alters play
- a self-authored goal
- anticipation of a specific next mastery moment

If the loop cannot explain renewed intent, it is a false loop.

### 4. Causality story, failure, and randomness

Players react less to the outcome than to the story they tell about why it happened.

Healthy failure feels:

- internal enough to preserve responsibility
- controllable enough to support improvement
- unstable enough to preserve hope

Unhealthy failure creates one of these stories:

- `The game cheated me.`
- `The controls betrayed me.`
- `My teammate made my effort irrelevant.`
- `The system is random.`
- `I was never supposed to win.`
- `The game wasted my time.`

Protect the link between intention, action, feedback, and result.

RNG rule:

- Input randomness before commitment usually creates adaptation.
- Output randomness after commitment threatens agency.

Output randomness is not forbidden, but it must be legible, bounded, recoverable, and worth the trust cost.

Punishment rule:

> The harsher the consequence, the more the game owes the player clarity, agency, and a plausible next attempt.

### 5. Cost of participation

Every system charges the player a cost: attention, comprehension, time, coordination, emotional risk, social dependency, or trust.

Ask:

> Is the experienced value worth the cost this system imposes?

For social systems, use:

`social value / coordination cost`

Social depth is not automatically good. It increases scheduling burden, moderation risk, exclusion risk, dependency failure, and onboarding complexity.

Red flags:

- one absent player collapses the structure
- casual promise, raid-level coordination
- social reward requires too much scheduling
- matchmaking makes strangers feel like liabilities
- the feature is experienced negatively by players who never use it

Target audience and visible audience are different.

### 6. Sacrificial pillars and strategic subtraction

A pillar only counts if it makes attractive ideas wrong.

Weak pillar:

`Accessible, deep, social, expressive, rewarding.`

Strong pillar:

`Readable skill expression over simulation accuracy.`

For each claimed pillar, state:

- what it protects
- what it sacrifices
- what tempting idea should lose because of it

Then find the highest-leverage cut.

The best removal is not the least-used feature. It is the removal that improves multiple things at once: clarity, pacing, fantasy, onboarding, trust, production focus, and future decision quality.

Do not cut complexity because it is complex. Cut complexity that is not earning its cost.

### 7. Failure mechanism and validation question

Assume the design failed.

Do not say `players may not like it`.

Name the mechanism:

- the payoff arrives after players already bounced
- the MVP removed the connective tissue needed to understand the system
- the incentive rewards the opposite of the fantasy
- the first failure creates a bad causality story
- the system depends on social coordination the audience will not pay
- the metric will look neutral because the value is enabling, not direct
- the feature adds aspiration for one segment and alienation for another

Then convert the riskiest unknown into a prototype question.

Bad:

`Prototype the lobby.`

Good:

`Can two new players form a party, understand readiness, and enter a match without verbal explanation or admin friction?`

Prototype the uncertainty, not the artifact.

## Required output

### Verdict

Choose one, or combine two if necessary:

- coherent
- promising but conflicted
- fantasy mismatch
- incentive betrayal
- false loop
- trust risk
- social-cost failure
- overbuilt
- under-validated

Give the verdict in one sentence.

### Actual player fantasy

State what the player actually becomes. Include the evidence from verbs, risks, rewards, constraints, and social consequences.

### Coherence map

| Layer | What the design currently teaches | Evidence | Contradiction / risk |
|---|---|---|---|
| Fantasy |  |  |  |
| Proving verbs |  |  |  |
| Incentives |  |  |  |
| Failure/RNG |  |  |  |
| Renewed intent |  |  |  |
| Participation cost |  |  |  |
| Pillars/sacrifice |  |  |  |

### Sharpest contradiction

Name the one contradiction most likely to damage the design. Explain the mechanism.

### Player causality story

State the sentence players are likely to tell themselves after success, failure, and session end.

### Highest-leverage move

Choose one:

- cut
- merge
- shrink
- re-incentivize
- clarify feedback
- change failure consequence
- move randomness earlier
- lower coordination cost
- prototype before building

Explain what improves and what tradeoff is accepted.

### Prototype question

Name the single highest-value uncertainty to test next. The question must reveal player understanding, motivation, trust, coordination, or renewed intent.

### Decision rules

Give 2-5 rules the team can use to accept or reject future ideas.

Rules must create sacrifice.

Bad:

`Make it more fun and accessible.`

Good:

`Prefer readable skill expression over physical realism whenever the two conflict.`
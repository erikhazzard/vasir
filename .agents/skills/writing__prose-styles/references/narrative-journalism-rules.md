# Narrative journalism voice: writing rules

These rules cover three kinds of writing about business and institutions, all in a plain newspaper voice:
- reported narrative nonfiction built from reconstructed scenes;
- opinion columns;
- newsletter intros.

/1k means per 1,000 words. Rates are averages over drafts of 1,500 words or more; shorter drafts use the caps in §7. `scripts/hardchecks.py` (in this skill) automates most of §9.

## 1. The 10 rules that matter most

1. **Pick one mode and use only its conventions** (§2).
   - Narrative: past tense, third person, invisible narrator.
   - Column: present-tense argument with a light "I".
   - Newsletter: a first-person intro over a body written in the team's voice.
2. **Narrative paragraph shape.** Paragraphs average about 60 words and 3 sentences. About 1 in 5 is a single sentence, usually of 15-20 words. About 1 in 10 runs 15 words or fewer, and about 1 in 10 runs past 120. Yet, Now, Even and However together open at most one sentence per 2,500 words.
3. **Narrative: put motive on the action** (B13b). Attach a character's aim or feeling to a tag or an action as a participial clause (…, hoping to…; …, relieved that…). Aim for about one per 1,000 words of narration. Columns almost never do this. No stand-alone feeling beats ("He hesitated."), and no staged reveals of intent.
4. **Dialogue is action aimed at someone.** Tag with `told` or `asked` plus the listener, or with plain `said`. Never use `says`. Use `recalled` at most once a chapter. When a line is the paragraph's main event, open the paragraph on it (about 1 paragraph in 6).
5. **No narrator epigrams, in any mode.** Take color from the trade's stock idioms and slang. Never coin a metaphor, aphorism, paradox or symmetrical antithesis. Never label the parts of your argument. Never plant a line to pay it off later as wordplay (X8).
6. **Report; don't hedge or moralize.** State reconstructed scenes as fact (`seem` at 0.1-0.8/1k). Narrative judges only through epithets, deadpan parentheses and juxtaposition. Columns may name documented misconduct plainly.
7. **Make numbers exact, personal and checkable.** Use decimals and cents, one person's paper loss, arithmetic the reader can redo. Write "percent", never "%". Translate past scale into today's terms once or twice a chapter.
8. **Openings and time.** Narrative opens on a person in a place, not on a hook line, then lands the stakes in a short flat beat by ¶3 (B5b). Columns open on the blunt line (rule 10). Write clock times as H:MM a.m./p.m. (7:00 a.m.). A prologue stamps the moment once, in ¶2-3. Any other section that changes day dates itself in its first sentence or two. Never re-stamp a scene already under way.
9. **Column voice.** Argue in present-tense modals (it is, may be, perhaps, will most likely, should). Use "I" only for access or legwork, or not at all. Concede in a full sentence (Of course, …; That may be true, but …), then turn on But or Still. Never write "To be sure".
10. **Column shape.** Keep the first sentence short; in half of columns it runs 12 words or fewer. Walk named sources through one at a time, and let a key quote run. End short, on a plain and often hedged verdict, a warning or a source's line. Never end on an engineered callback.

## 2. Choose the mode

| | Narrative: contemporary | Narrative: historical | Column | Newsletter: intro / team body |
|---|---|---|---|---|
| Paragraph mean (words) | 64-68 | 55 | 45 | 48 / 39 |
| Sentences per paragraph | 3.1-3.4 | 3.0 | 2.1 | 3.1 / 1.9 |
| One-sentence paragraphs | 19-21% | 26% | 37% | 12% / 38% |
| Mean sentence (words) | 18.5-22 | 20 | 21 | 15 / 20 |
| Past-tense share | 0.95 | 0.93 | 0.29-0.37 | 0.22 / 0.26 |
| First person in narration | method passage only | essay only | 7.0/1k | 10.2 / 0.3 per 1k |
| Questions per 100 sentences | 0.3-2.0 | 2.3 | 3.8-6.9 | 13.6 / 2.5 |
| Words inside quotes | 10-13% | 15% | 17% | 5% / 9% |
| Em dashes per 1k | 4.7-5.2 closed | 6.2 closed | 9 spaced | 8.0 / 4.6 spaced |
| Mr./Ms. | 0 in narration | in quotes; rare in narration | 7.5/1k | 0 / 0.8 per 1k |

**Which narrative variant.** Living participants and interviews mean contemporary narrative. Documents only, with subjects who are dead, mean historical narrative. Don't mix the two. For columns, choose one house style (C13) and keep it.

**Length ladder.**
- *One paragraph (60-120 words):* one beat, one named person, one exact number, at most two signature devices.
- *A 500-word scene:* a setting sentence, a stakes beat by ¶3 (B5b), 2-4 short lines of talk, one consequence (a price, a call, a decision), and a short sting. At most 6 markers (§7).
- *A chapter (8,000-11,000 words):* the present day; then 40-50% chronological backstory, entered by a one-sentence generalization about the principal and left on a dated re-entry; then the present again.
- *Compressing a scene for a column:* keep the punchline and the key number, drop secondary names, and cut dialogue to setup and payoff, ending at about a third of the length.

**Outside finance.**
- The stock price becomes the field's public scoreboard (a poll, a vote count, ratings), quoted exactly.
- "The firm" becomes the institution's own noun.
- Street slang becomes the field's jargon, glossed once.
- Wall Street against Washington becomes the institution against its overseer.
- Columns find the money or institutional lever behind a social question and say who should pull it.

## 3. Narrative

**3.0 Sub-modes.**
- *Scene:* all of §3.
- *Panorama* (mid-prologue, and bridges):
  - summary in past and present tense, in sentences of 22-29 words, with abstract nouns;
  - at most one judging metaphor per paragraph (exempt from B19's epithet-only rule and from B21's budget);
  - one reader address at most;
  - no clock times and no dialogue;
  - quotes only from the public record, with the outlet named.
- *Method passage* (contemporary prologue only): first person, 300-350 words.
- *Essay* (historical prologue only): see N5.

### 3.1 Front and back matter
- **B1.** A cast list grouped by institution ("Name, bare title"), and one epigraph left uncommented.
- **B27. Author's note** (400-600 words, first person):
  - the scale of the reporting, given as "more than" counts;
  - a list of source types, and at most two claims of first access;
  - the caveat that dialogue and feelings may come from other witnesses, from people briefed soon after, or from notes;
  - endnotes, and credit to earlier writers;
  - a borrowed epigram and a modest closing hope.

### 3.2 Architecture
- **B2.** A contemporary prologue runs in this order: a scene (~30%), a panorama of numbers and on-the-record warnings (~55%), a method passage (~13%), and a close that echoes the title. Chapter 1 then rewinds about six months. For a historical prologue, see N5.
- **B3.** Write sections of 150-1,800 words (mean 600-1,100), separated by ornament breaks. Change point of view only at a break.
- **B3b. Transitions.**
  - Open a section on a place phrase or When-clause plus a named person, or on its date (B6).
  - Cut between two people through what links them, such as a call or one watching the other on TV.
  - Plant an object early and bring it back.
  - Never end a section by announcing the next one.
- **B4.** End sections on a sting: a terse quote, a thought, an ironic line or a short maxim. About a third of section-final sentences run 13 words or fewer. A chapter ends on a sting or on a forward hook that never states the outcome.

### 3.3 Openings and the clock
- **B5.** Open on a named principal in a named place doing something ordinary, with fatigue or a cost to family if one is reported. Never open on dialogue.
- **B5b. The stakes beat.** Don't open on a hook line. Within the first three paragraphs, though, land the stakes in one short, flat beat of 3-12 words. It can be the end of ¶1 after a setup clause and a colon, a one-line paragraph that turns the scene, or a short free-indirect question. Make it plain fact from the scene, never an aphorism, and use one per opening.
- **B6.** Date stamps depend on where you are:
  - *A prologue:* a cold open in ¶1, then one flat stamp in ¶2-3: `It was just past H:MM a.m. on [Weekday], [Month D, YYYY].`
  - *A section that changes day:* the date in sentence 1 or 2 (`On [Month D, YYYY], at H:MM a.m., [relative peg],`), or fused to a two-adjective weather phrase.
  - *The short `It was just past H:MM` form:* only in the first ~1,500 words of an opening scene, and at most 3 times.
- **B7.** Crisis days only, run as a ticktock:
  - 1 paragraph in 10-25 opens on a time marker (At 7:40 a.m.; An hour later);
  - stock moves get their own beats;
  - phones and TV carry most of the present-day talk.

  Other chapters move by the calendar.

### 3.4 People
- **B8.** Tag secondary figures at first mention, and tag institutions by rank if reported. Never re-tag anyone already introduced.
- **B9.** Principals enter by bare name, in action.
  - Their title follows within 1-4 paragraphs. The dossier (spelled-out age, origin, nickname, one physical tell) comes after their first action.
  - After that, use the bare surname, never "Mr.". Run he/his/she/her at 34-50/1k.
  - Put in-house nicknames in quotation marks, and call back to them later.

### 3.5 Dialogue
- **B10.** Quoted words make up 10-18% of the text; this is waived when a brief fixes the dialogue. Private lines run mostly under ~15 words, with an occasional private set piece of 30-60. Long verbatim quotes come mainly from the public record.
- **B11. Tags.**
  - `said` is the most common tag (25-50% of tags); `told` plus listener is 13-25%; `asked` is 4-20%.
  - Other non-neutral verbs (announced, answered, replied, insisted): up to 1 tag in 5.
  - A manner adverb: up to 1 tag in 12.
  - Loud verbs (barked, bellowed, growled, shot back): at most 1 tag in 10, and only in contemporary mode.
  - Never use says, hissed, snapped, muttered or mused.
  - The tag follows the quote about 4 times in 5.
  - Under 1,500 words, count per 500 words (1-2 uses of told plus listener). Colon-introduced quotes are not tags.
- **B11b.** Talk with no sourced exact wording goes into indirect speech (`[Name] told [listener] that…`). Once a chapter, a remembered plea may run as unquoted direct speech.
- **B12.** Profanity appears only inside quotes or italic thought. The narrator stops at mild "hell" idioms. Historical mode has none.

### 3.6 Interiority
- **B13.** Give each section one lead mind: 3 of every 4 cognition verbs (knew, thought, believed, hoped) attach to one name. State what a character knew or intended flatly, in one sentence.
- **B13b.** Carry aim and feeling on the action as participial clauses (rule 3; check 12), at 0.5-1.3/1k, often on a speech tag.
- **B14.** Only where news lands or a decision turns, use 2-3 short free-indirect questions with a curt self-answer, or an italic thought of 9 words or fewer (marked *thus* in drafts). Use at most one per scene. `wondered` is allowed up to ~3 times a chapter, for deliberation.
- **B15.** Attribute only public statements, naming the outlet (told [outlet]; in an interview with [outlet]), and later retellings (later told a friend).

### 3.7 Exposition and numbers
- **B16.** Gloss each term of art once, where it first surfaces, in a dash, comma or ", meaning" clause, then finish the action.
  - Aim for about 1 gloss per 600-1,100 words, framed as insider talk.
  - About 1 gloss in 4 carries a plain judging word, never a clever one.
  - Narrator wit lives only in glosses, parentheses and one-word epithets: at most one dry touch per ~1,000 words, and no puns.
- **B17.** Numbers are exact (decimals, cents), personal (pay, homes, one man's paper loss) and checkable. Spell out ages, counts under 100 and round numbers ("four thousand"). Use numerals for money, percentages, times, dates, sports figures and ratios.
- **B17b.** When history sets the scale, translate it into the reader's terms in a trailing clause: in today's dollars, a present-day equivalent company, or a field's "equivalent of" a household brand. Do this once or twice a chapter, outside action beats.

### 3.8 Detail, judgment, figures
- **B18.** Material detail:
  - Price status objects (address, square footage, brand, jet) only if reported, tie them to the stakes, and ration them.
  - Weather is literal, and appears once per scene.
  - The body: fatigue at scene openings, one physical tell per dossier, and an occasional reported tear or flush. Never sweat, pulse or jaw.
- **B19.** Keep greed, hubris, reckless, villain and evil out of the narrator's voice; attribute such views (in his view; he thought). Judge instead through:
  - a fresh one-word epithet for competence or temperament at first mention;
  - a deadpan parenthesis;
  - a juxtaposition.
- **B20.** Let optimism stand; never state that a belief was wrong.
  - Career prolepses (would later become): about 1 per 1,000 words of backstory.
  - Foreshadowing of the crash: at most once a chapter (historical mode: N4).
  - Never "little did he know".
- **B21.** Take color from the trade's dead metaphors and slang (firing line, blew up, takeover bait), several per chapter.
  - Contemporary mode: similes at most 1 per 2,000 words, usually a flat historical or pop-culture comparison. Historical mode: N9.
  - Weather or disaster metaphors: at most twice a chapter.

### 3.9 Sentences, tense, punctuation, lexicon
- **B22.** Paragraphs:
  - mean of 55-70 words and 2-4 sentences;
  - 15-27% are a single sentence (median 15-18 words);
  - at most 15% run 15 words or fewer, and about 1 in 10 runs past 120;
  - none under 3 words.
- **B23.** Sentences average 18-22 words. 7-14% run 6 words or fewer, and 10-14% run 35 or more.
  - `As [action],` openers are fine, at about 1 per 800 words.
  - One-line beats may open on But, So, Yet, And yet or Until.
  - Let sentences run on reportorial connectives (one of which; on the back of; the fact that).
  - Repeat names rather than vary them.
- **B24.** Tense:
  - Simple past for scenes; past perfect for flashbacks.
  - Present tense only for glosses, standing truths and the portrait of a living subject.
  - Contractions at 4.5/1k of narration or fewer, mostly in free-indirect and backstory lines.
- **B25.** Punctuation:
  - Closed em dashes at 4.5-6.5/1k, for glosses, asides and trailing stings.
  - Colons at about 3.5/1k in contemporary mode and 2.2 in historical mode. Use a setup-colon-reveal at most once per 600-800 words, and capitalize a full sentence after a colon.
  - Semicolons at 2.5/1k or fewer; parentheses at 1.5/1k or fewer.
- **B26.** Prefer "the firm" to "the company", by about 8 to 1. Use Wall Street and the Street, and small adverbs (just, even, nearly).

## 4. Historical (archival) adjustments

Keep the constants of narrative mode and change these:
- **N1.** Quote documents far more than in contemporary mode: about a third of paragraphs carry a quotation, or 44% counting block quotes, against about half in contemporary mode. Tag documents with hindsight (he would later remember), and cap one with a verdict of two to four words.
- **N2.** Stage a surviving transcript as drama:
  1. a framing sentence that names the clash;
  2. the Q/A lines as block paragraphs, with no narration between them;
  3. one paragraph that delivers the irony.
- **N3.** Pace by calendar and decade (about 0.8 full dates and 0.2 clock times per 1k). Join flashbacks with years. Close some sections on the year at the center of the story.
- **N4.** Since the reader knows the ending, use more irony aimed at the crash: an aside, a section's last line, a would-it-ever question.
- **N5.** The prologue runs scene (~57%), essay (~31%), anecdote (~12%), with no method passage.
  - The essay speaks as "we", draws modern parallels, stays mostly in the past tense, and may carry one generic moral line.
  - A comic anecdote and a two-sentence kicker follow the essay.
  - Chapter 1 rewinds about nine months.
- **N6.** Keep the inner voice clean: no profanity, rare tagged direct thought, and paired emotions split by a dash.
- **N7.** Add religious vocabulary (religion, creed, scripture, gospel), plus mania, fever and delusion. Epithets of myth and monarchy (titan, reign) appear in both narrative variants.
- **N8.** Use more one-line beats (26% of paragraphs). Keep honorifics mostly inside quotes.
- **N9.** Explain a mechanism in four steps:
  1. real numbers the reader can check;
  2. a dash gloss;
  3. one homely analogy;
  4. a blunt one-line consequence.

  Explanatory similes run about 1 per 1,000-1,500 words of scene, and up to 1 per 400 in the essay.

## 5. Column

- **C8.** Argue in the present tense (past-tense share about 0.3).
  - Hedge forecasts and motives (may be, perhaps, will most likely, seemingly).
  - Give the verdict flat and short, often as its own paragraph.
  - Prescribe with "should".
- **C5.** Use "I" for access and legwork (told me; When I asked). Never in ¶1, rarely as memoir, and not at all without access.
  - Opinion "I" (I think) at most once, as a candid aside.
  - "You" voices objections or addresses a named leader.
  - "We" means taxpayers and the public.
- **C3.** Concede at least once, varying the form: Of course, …; That may be true, but …; That may strike many as…, but …. The clipped "That's true." is a rarer form. Turn on But or Still. Never write "To be sure". Use "In truth" at most twice.
- **C1. Lede.**
  - Keep the first sentence short: median about 11 words, and 12 or fewer in half of columns. It runs over 30 only for a quotation lede or a dated news peg.
  - Open on a verdict, an irony, a teaser, a quote, a question, or a news-peg sentence that opens a fuller paragraph. Never open on "I", and never on a hard-news summary.
  - Peg the news by ¶2-4. After a quote lede, ¶2 names the speaker.
- **C2.** Run 800-1,550 words in 14-39 paragraphs, with the claim, question or fix by ¶3-8.
  - When steelmanning a view you will reject, present it straight and hold your verdict for the end.
  - In the back third, take objections in turn, and widen to the systemic point through the content, not by announcing it.
- **C4.** Voice the reader's question and answer it briefly (1-3 words or a short reaction), at most twice. Aim for 3.5-7 questions per 100 sentences.
- **C6.** Sourcing:
  - Name on-the-record sources with title appositives, and take them one at a time.
  - Use partial quotes (median 10 words), but let a key quote run.
  - React to a quoted document in one short line of your own.
  - Give anyone you criticize a line of reply, and explain any anonymity.
  - Never write "people briefed on".
- **C7.** Pick the one number that carries the point and dramatize it: repeat it, benchmark it, or set it against a precedent. When the argument is arithmetic, walk through it step by step.
- **C9.** One to three dry touches: a deflating colloquialism, a wry parenthesis, an idiom pinned on a titan. No "!", no extended bit, and no pun on your own earlier line.
- **C10.** Steer the reader once or twice: an imperative "Consider", a proposal flagged in a short beat, or a parenthetical promise.
- **C11.** Recurring frames:
  - words against deeds;
  - business against Washington;
  - praise for allies, then a check on their self-interest;
  - history in two or three brisk paragraphs.
- **C12. Kicker.** Keep the last sentence short (median about 14 words; 24 or fewer in about 3 columns of 4). End on a plain or hedged verdict, a warning, a call to action, or a source's line.
  - A callback may echo the lede's image or question, but never pun on it.
  - Never summarize, and never move a quote out of order to feed the ending.
- **C13. House style.**
  - Spaced em dashes at about 9/1k (3-15 in any one piece).
  - Paragraphs of about 45 words. A third are one sentence, mostly 20-30 words. One-liners of 15 words or fewer about twice a column.
  - Traditional newspaper style: Mr./Ms. on second reference, "chief executive", dotted acronyms (C.E.O.). Modern style: bare surnames, CEO.
  - Pick one style and keep it.
- **C14.** Name documented misconduct in plain moral words (greed, hypocrisy, sham) when the facts support it. Do this in about 1 column in 7, with 1-3 uses, each in a short flat sentence. Earnest, not ironic.
- **C15. Long magazine essay.**
  - Paragraphs of about 76 words; few questions; no narrator "I".
  - Dashes at about 12/1k; bare surnames; end on a quote.
  - C1, C4, C5, C8, C12 and C13 do not transfer.

## 6. Newsletter intro and team body

- **L1. Intro.** 75-470 words, in 2-10 paragraphs of about 3 sentences and 50 words each. The sentences are short (mean about 15 words) even though the paragraphs are not.
  - First person, contractions, and about 14 questions per 100 sentences.
  - Often one turn on But, and a hand-off line.
  - Open on a plain first-person line or the writer's own name.
- **L2. Team body** (house style).
  - No "I".
  - "told [the newsletter]" and "according to", at about 1.5/1k.
  - Numerals at about 19/1k; pegs to the day of the week; bare surnames.
  - Colon-led lists; about 38% one-sentence paragraphs.
- **L3. Skeleton.**
  1. The intro.
  2. A lead item of 300-600 words in the team "we": a peg to the day of the week, one quote given to the newsletter, one number set against a benchmark, and a line on what to watch.
  3. A "Here's what's happening" run of short attributed items.
  4. Two or three features with heads of 2-7 words. One feature may close on a short deflating line.

## 7. Budgets, caps and positions

Budgets are averages; per-piece ceilings are maxima.

**Positions, not rates.**
- Full stamp: once, in ¶2-3 of the prologue.
- Short stamp: opening scene only.
- Question cluster or italic thought: where news lands or a decision turns, at most one per scene.
- Line leaving an outsider poised to act: the last paragraph of a chapter only.
- Dossier: after the first action (B9).

| Marker | Budget |
|---|---|
| Participial motive clause | 0.5-1.3/1k |
| `told` + listener | contemporary 1.5-2/1k; historical about 0.6 |
| Loud tag / other non-neutral tag / tag adverb | at most 1 in 10 (contemporary only) / at most 1 in 5 / at most 1 in 12 |
| Narrator simile | contemporary at most 1 per 2,000 words; historical scene 1 per 1,000-1,500 |
| Narrative `perhaps` / `seem` | at most 0.8/1k / 0.1-0.8/1k |
| `prescient` / `wondered` | at most 1 per book, 0 in columns / at most 3 per chapter |
| Column, per piece | perhaps ≤4, of course ≤3, clearly ≤2, self-answers ≤4, In truth ≤2, parenthetical "more on that" ≤1 |

**Short-piece caps.** These apply under 1,500 words and replace the rate checks.
- *Narrative, per 500 words:* 3-9 signature markers, never more than 14. The twelve markers are clock time, stamp, told plus listener, narrator question, simile, rank appositive, age, dollar figure, colon reveal, As-opener, gloss and parenthesis.
- *Narrative, per piece:* at most one stamp, question cluster, italic thought, simile or foreshadowing. A per-chapter budget means at most one in a shorter piece.
- *Column, per 300 words:* at most one concession, voiced question, signpost or dry touch, and at most 5 uses of the modal set.

## 8. Failure modes to avoid

- **X1. Thriller pastiche.** Ticking clocks, sweat and pulse, storm clouds as mood, hissed tags, one-word paragraphs. Urgency comes from timestamps and prices instead.
- **X2. Screenplay banter.** Volleys of eloquent quips. Quoted words should be short and blunt, often over a phone or TV. Narrator wit is rare and dry: 1-3 asides a chapter.
- **X3. The wry first-person guide.** A first-person narrator, present-tense "says", comic similes, 150-word paragraphs.
- **X4. The moralizing exposé** in narrative, or its mirror: sympathy for the powerful that comes from access.
- **X5. Tic pile-up.** A stamp on every scene, "told" on every tag, every column move inside 200 words.
- **X6. Flat news summary.** "People familiar with", "declined to comment" or "Mr." in narrative.
- **X7. Copying.** Never reuse a sentence or distinctive phrasing from published work you have read (check 3).
- **X8. Machine polish.**
  - Narrator aphorisms and paradoxes ("the kind no lobbying could buy").
  - Antitheses ("It was one thing to…"; "On paper… In practice…").
  - Colon labels ("The reasoning goes like this:"; "The larger problem is X:").
  - Abstract thesis sentences, and staged reveals of intent.
  - Stand-alone feeling beats.
  - Coined metaphors carried through the piece, and planted lines that pay off as wordplay.
  - Weighing pros and cons before "But".
  - Limp bridges ("Then he said,").

  The voice is looser and more idiomatic than this, and lets material arrive in plain sequence.
- **X9. Fact-sheet re-briefing.** When continuing a story, don't re-introduce people and firms the reader already knows, and don't restate the date or the routine.

## 9. Hard checks: search the draft before returning it

Run the checks on the narration, with quotes, *italic thought*, block quotes and documents removed. `hardchecks.py` automates most of them:

`python3 -I scripts/hardchecks.py narrative|historical|column DRAFT.txt [--prologue] [--refs REF.txt ...]`

Rate checks need 1,500+ words; below that, use §7's caps. Then read the draft once for X8 and X9, because the patterns catch only part of the problem.

*All modes*
1. `%` = 0. "!" appears only inside quotes or italic thought.
2. Polish formulas = 0: `\bIt (was|is) one thing to\b|\bThe (logic|reasoning|lesson|point|problem) (was|is) simple\b|\bthe kind (of \w+ )?(that )?(no|nobody|nothing)\b|\b(goes|went) like this:|\bHere['’]s the thing\b|\bIt turns out\b|\bThat would be a mistake\b|\bIt['’]?s tempting to\b|\bOn paper,[^.?!]*[.?!] In practice\b|\b(His|Her|The) conclusion:|\bThe (larger|bigger|real) (problem|issue|question) is \w+:|\bmore complicated still\b|\bThen (he|she) said\b`.
3. No 4-word run shared with any reference text you drew on (`--refs`). Prescribed formulas, titles and clock times are exempt.

*Narrative*

4. First person: `(?<!War )\bI\b|\b(me|my|we|our)\b|\bus\b` = 0, except in a prologue method passage or a historical essay passage.
5. Sourcing:
   - `\bsays\b` = 0.
   - `people (familiar|briefed|close to)|familiar with the (matter|talks|situation)|briefed on|declined to comment` = 0.
   - `\brecall(ed|s|ing)?\b` at most once per chapter.
6. Moral words: every hit of `\b(greed|greedy|hubris|reckless\w*|villain\w*|evil|arrogan\w*|fat cats?)\b` must sit inside an attributed view. A historical essay passage allows one.
7. Clichés:
   - These = 0: `\b(ticking|running out of time|race against|sweat(ing|ed|y)?|pulse|clench\w*|jaw|tsunami|perfect storm|little did|as we now know|steely nerves|piercing eyes|on top of the world|alone at the top|epic collapse|all hell (would )?(break|broke) loose)\b|\bbr\w+ (\w+ ){0,3}to (its|their|his) knees\b`.
   - `in (retrospect|hindsight)` at most once, in panorama only.
   - `storm clouds|meltdown|melting down|abyss|apocalyp\w*` in at most 2 sentences per chapter.
8. Clock:
   - No `(?<![:\d])\b\d{1,2} ?(a\.m\.|p\.m\.)` and no `o['’]clock`. "Noon", "midnight" and "H:MM in the afternoon" are fine.
   - `It was just (past|before|after) \d` only in the first ~1,500 words, at most 3 times.
   - No day or date stamp in ¶2-3 of a scene outside a prologue.
9. `\bseem(s|ed|ing|ingly)?\b` at 0.8/1k or less; `apparently` at most once per chapter. Profanity only inside quotes or italic thought.
10. `(^|[.?!”] )(However|Yet|Now|Even)\b`: together at most 1 per 2,500 words.
11. Tags and beats:
    - No sentence of 5 words or fewer like `^(He|She|[A-Z][a-z]+)( was| felt)? (relieved|pleased|stunned|surprised|worried|hesitated|paused|nodded|sighed|shrugged)\.$`.
    - No `hissed|snapped|muttered|whispered|sneered|mused|pondered` as a tag.
12. Participial clauses `, (hoping|trying|wanting|relieved|reflecting|knowing|worried|fearing|eager|determined)\b` at 0.5-1.3/1k, and at least one in any scene that turns on a decision.
13. Long drafts: em dashes closed, at 4-9/1k per chapter; semicolons at 2.5/1k or fewer; parentheses at 1.5/1k or fewer; paragraph and sentence shape within B22-B23.
14. Opening scenes: one of the first three paragraphs ends on a 3-12-word stakes beat, or on a colon reveal of that length (B5b).

*Column*

15. Column checks:
    - `To be sure|In sum|In conclusion` = 0.
    - At least one concession followed by a turn.
    - No "I" in ¶1.
    - First sentence of 30 words or fewer, except a quote lede or a dated news peg, and never over 40.
    - Last sentence of 24 words or fewer in about 3 pieces of 4.
    - Spaced dashes only.
    - §7's per-piece caps, and at most 3 colon set-ups.

*Integrity*

16. Every quote, thought and private scene of a real person traces to a source (§10). Rewrite any run of 6+ words that matches a published text.

## 10. Integrity rules

- **I1.** Never invent dialogue, thoughts, feelings or private scenes for real people. Attribute inline in columns, and in endnotes or a source note in books. A brief that certifies its own sourcing can stand in for notes; keep the source list outside the text.
- **I2.** Label fiction and composites, and never attach invented words, thoughts or conduct to real names. For exercises, invent the institutions too. If a brief puts real institutions beside pseudonymous people, attribute to the institutions only the facts the brief certifies.
- **I3.** Never present the writing as a real journalist's or a real outlet's work: no borrowed bylines, mastheads, newsletter names or sign-ins. Style conventions (Mr./Ms., dotted acronyms) are style, not provenance.
- **I4.** Never reuse published sentences or close paraphrases of them (X7).
- **I5.** Say where each reconstruction comes from. Never launder one source's account into omniscient fact.
- **I6. Real people, step by step.**
  1. Sort every fact into one of three kinds:
     - Public record (filings, transcripts, testimony, broadcasts, the person's own words): quote it and name the outlet.
     - Private but sourced: use it, with a source note.
     - Unknown: do not dramatize it.
  2. Use quotation marks and italic thought only for words from a document or an on-the-record source. Otherwise, use indirect speech or nothing.
  3. Without private sources, build the scene from timestamped public events, and limit interiority to what the person has said publicly.
  4. Columns give everyone criticized a line of reply; books put denials in the notes.
  5. For living people: no home address, family medical detail or child's name unless a major outlet has already printed it and it bears on the stakes. Never any of these for private individuals.
  6. Moral verdicts judge documented conduct, not character.
  7. Exercises use invented names, flagged at the top.

## 11. Heads

- **Books:** numbered or date-headed chapters, with ornament breaks and no subheads.
- **Columns:** 6-10 words, written only if you write your own heads (desks usually write them). Use a claim with a twist, a How/Why explainer, or rarely an open letter ("Dear [Title]:").
- **Newsletter heads:** see L3.


# Narrative journalism voice

**Your reply is only the finished piece.** Leave out notes about modes, drafts or checks, before the piece or after it. There is one exception. When invented people appear in a setting that reads as real, put one italic line at the top saying the characters are invented (rule I2).

Before drafting, read [references/narrative-journalism-rules.md](../references/narrative-journalism-rules.md) in full. It holds the whole voice: the ten core rules (§1), the modes (§2), each mode's own section, the budgets (§7), the failure modes (§8), the hard checks (§9) and the integrity rules (§10). This file gives the workflow.

## 1. Pick one mode

| Mode | Use it for | Voice |
|---|---|---|
| Narrative, contemporary | living people; a scene reconstructed from interviews | past tense, third person, invisible narrator |
| Narrative, historical | documents only; the subjects are dead | the same, adjusted as in §4 of the rules |
| Column | an argument about the news | present tense, modals, a light "I" |
| Newsletter | an intro over a team-written body | first-person intro, team-voice body |

**No form given** ("tell me about X", "write about Y"): write a contemporary narrative scene of about 500 words, following the length ladder in §2. It has five parts:
- **A person in a place.** One named person at work, somewhere the topic matters, at an H:MM clock time.
- **The stakes.** A flat beat of 3-12 words, landed by ¶3.
- **Talk.** Two to four short lines aimed at someone.
- **The explanation.** Carry it with exact numbers and arithmetic the reader can redo.
- **The ending.** One consequence, then a short sting.

For subjects outside finance, translate the conventions as §2's "Outside finance" describes. A column opens on a blunt line instead.

## 2. Decide privately before drafting

- **Who, where and when.** Name the person, the room and the clock time.
- **The number.** Pick the one exact figure the piece turns on, and the arithmetic behind it.
- **The stakes beat.** It must be plain fact from the scene, never an aphorism.
- **The ending.** Choose the consequence the scene closes on: a price, a call or a decision.
- **The facts.** Verify every claim. For real people, sort each fact by the three kinds in I6 before giving it quotes or interiority.

## 3. Draft

The ten rules in §1 govern the draft. Most drafts fail in one of these four ways:
- **X8, machine polish:** aphorisms, antitheses, colon labels and stand-alone feeling beats.
- **X1, thriller pastiche.**
- **X5, tic pile-up.**
- **X3, the wry first-person guide.**

## 4. Check, then revise

Save the draft as plain text, with blank lines between paragraphs and `*asterisks*` around italic thought. Then run the check script from this skill's folder:

```
python3 -I scripts/hardchecks.py narrative|historical|column DRAFT.txt [--prologue] [--refs REF.txt ...]
```

- Fix every FAIL, and judge every REVIEW hit.
- Pass any source texts you read while drafting with `--refs`. The script screens for 4-word runs you share with them.
- Rate checks need 1,500 or more words. Shorter pieces are held to the per-piece caps in §7.
- Finally, reread once for X8 and X9. The patterns catch only part of either.

## 5. Return the piece

Return the prose, plus a head only when the mode calls for one (§11).

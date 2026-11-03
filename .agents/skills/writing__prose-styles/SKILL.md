---
name: writing__prose-styles
description: Writes prose in one of four house voices, lyrical fiction, lyrical realism, narrative journalism and the house voice for players and users. Use for fantasy or real-world storyteller fiction (in the vein of The Name of the Wind), reported narrative, columns and newsletters, or in-game and in-app copy.
---

# Prose styles

This skill holds four voices. Each lives in its own file under `voices/`. Pick one, read its file in full, and follow it.

## Pick the voice

| Voice | File | Use it for |
|---|---|---|
| Lyrical fiction | [voices/lyrical-fiction.md](voices/lyrical-fiction.md) | Fantasy prose from a storyteller looking back on a legend's life. Asked for by name, as a fantasy storyteller-memoir, or as prose like The Name of the Wind or Kvothe. |
| Lyrical realism | [voices/lyrical-realism.md](voices/lyrical-realism.md) | The same lyrical storyteller set in the real world. Asked for by name, or lyrical first-person memoir prose with no fantasy setting. |
| Narrative journalism | [voices/narrative-journalism.md](voices/narrative-journalism.md) | Reported narrative nonfiction, business and financial narrative, newspaper-style columns, newsletter intros, or any topic told as reported narrative. |
| House (Plainspoken Lyricism) | [voices/house.md](voices/house.md) | Player- and user-facing text in games and apps: item and flavor text, lore, onboarding, notifications, store and update copy. |

Choosing:
- **A voice named.** Use it.
- **Lyrical, no setting given.** Use lyrical fiction when the subject or request suggests fantasy, and lyrical realism otherwise.
- **Nothing named.** Match the request to the table. If two fit equally, use the house voice.

## Follow one file

- **Read the chosen voice file in full** before drafting, then follow it as your complete instructions. Do the same for any reference file it tells you to read.
- **Read only that voice.** Do not open the other voice files or mix their rules. Their rules conflict on purpose. For example, lyrical fiction forbids real-world names, and lyrical realism forbids made-up kingdoms and currencies.
- **Paths.** Links inside voice files point to files in this skill. Run scripts from this skill's folder, for example `python3 -I scripts/hardchecks.py …`.
- **Your reply is the piece only**, as the voice file describes. Do not mention which voice you chose.

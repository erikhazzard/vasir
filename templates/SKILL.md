# Skills
A skill is a compact expertise capsule that installs a targeted rewrite of the model's default prior for a repeated task class. It compresses hard-won knowledge, values, tradeoffs, taste, non-obvious constraints, failure scars, and artifact shapes that the base model would not reliably apply on its own.

Skills are not general docs, repo tours, style guides, or one-off task notes. A good skill earns its context by changing what the agent does: when it triggers, what prior it replaces, what expert judgment it transfers, and what output it reliably improves.

When creating, rewriting, auditing, or debugging a skill, do not hand-roll from this file. Invoke `skills__create-skill` or the local alias for the skill-creation skill, and let it produce the manifest, routing description, reference-file plan, and trigger/eval cases.

Keep this file as orientation only. Real skill manifests live in their own skill directory:

```text
skill-name/
├── SKILL.md
└── references/
```

Before adding a skill, the skill-creation skill should decide:

- whether this should be a skill at all;
- what expertise payload it encodes;
- what default model prior it rewrites;
- when it should and should not trigger;
- what belongs in the root manifest, references, AGENTS.md, or nowhere.

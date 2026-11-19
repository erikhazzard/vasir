---
name: code-analyze-failure
description: Keep what a failure taught, after it is fixed. Use after a bug fix, incident or regression, or when asked why something broke, to run a root cause analysis that separates evidence from inference and turns the cause into layers of prevention; or to write or update a durable incident postmortem that preserves the ruled-out hypotheses, the misleading signals, the proven mechanism and the fast path for next time. A postmortem is written when asked for, or when the diagnosis would be expensive or dangerous to work out again; a routine bug nobody asked about gets none. Not for finding or fixing the bug.
license: MIT
metadata:
  gc-owner: "erik"
  gc-capability: "engineering"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-status: "draft"
  gc-tags: "root-cause-analysis, postmortem, incident, prevention"
  gc-source: "https://github.com/erikhazzard/vasir/tree/d04347b0d515d4c3c46b5e012e2c334fdabf83bd/.agents/skills"
  gc-source-skills: "prompt__perform-root-cause-analysis, ops__maintain-incident-postmortem"
  gc-source-revision: "d04347b0d515d4c3c46b5e012e2c334fdabf83bd"
---

# Analyze a Failure

After a failure is fixed, keep what it taught. The fix lives in the diff. The diagnosis is lost unless someone writes it where it will be found. Finding and fixing the bug is not this package's job.

## Pick the procedure

| You are asked to | Read | What it gives you |
| --- | --- | --- |
| Explain why something broke, or what would stop it happening again, once a fix is in | [Root cause](references/root-cause.md) (7K) | The conditions that made the failure possible, each claim tied to evidence or labelled as inference with a way to test it, and layers of prevention. An analysis in the reply. No file. |
| Write or update an incident postmortem, or record a diagnosis that took a hunt across several hypotheses | [Postmortem](references/postmortem.md) (12K) | A durable `postmortem.md`: the fast path next time, what proved it, the hunt and its dead ends, the mechanism and missing defenses, corrective actions. It may be a draft that records a suspected mechanism and what is still unknown. A routine bug gets "not warranted" and no file, unless a postmortem was asked for. |

## Telling them apart

- **Analysis and record.** Root cause is the thinking. Postmortem is the durable record, and most failures do not earn one.
- **A cause still in doubt.** A postmortem does not wait for certainty: a draft records the suspected mechanism and the unknowns. Root cause analysis is its own job, done when it is warranted, not a step a postmortem requires.
- **Commands are evidence only if they ran.** Both procedures hold to this. Anything else is a proposal and is labelled as one.

## What these procedures assume

- The failure is already fixed or contained. Neither procedure changes product code.
- A postmortem keeps sanitized excerpts of evidence. Leave secrets and personal data out of it.

## What holds for every procedure

- Read the procedure the request needs and no other, unless it sends you to one. The sizes above are what each costs to load.
- A path to a file that ships with a procedure is relative to that procedure's own file. A path the procedure tells you to read, run or write in the project, such as `docs/...`, `tmp/...` or a source file, is relative to the project you are working in, never to this package.
- The destination project's instructions and the user's existing scope come first. A procedure adds judgement. It grants no authority, and it adds no approval step the user did not ask for.
- Each procedure states what it must deliver. Deliver that, and say which procedure you used.

## Other skills

Use these where they are installed. If one is absent, carry on with this package's procedures and say which judgement was not available.

- `code-write-tests` to decide whether the failure warrants a durable test.
- `code-enforce-principles` when prevention means a change with risk beyond the place it is made.
- `plan-manage-work-spec` when prevention is substantial work of its own.

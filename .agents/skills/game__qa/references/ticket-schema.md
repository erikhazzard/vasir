# QA ticket contract

Tickets stream into `<artifactDir>/tickets/` as individual JSON files as soon as a finding exists. They carry enough context for the Owner to act without requiring the filing agent's narration.

## Shape

```json
{
  "id": "capability-gap-probe-heat-abc123",
  "category": "capability-gap",
  "severity": "blocking",
  "blocking": true,
  "domain": "combat-hud",
  "filedBy": "run-heat-meter-abc123",
  "filedAt": "2026-08-11T18:00:00.000Z",
  "title": "adapter.probe.heat is not implemented",
  "summary": "Case heat-001 requires a heat observation, but the adapter exposes no matching probe.",
  "caseIds": ["heat-001"],
  "journey": "heat-meter",
  "evidence": [],
  "needed": ["adapter.probe.heat(page, args, ctx)"],
  "proposedFixArea": "qa/adapter.ts"
}
```

## Fields

Required for every ticket: `id`, `category`, `severity`, `blocking`, `domain`, `filedBy`, `filedAt`, `title`, and `summary`.

- `category` is one of `capability-gap`, `blocker`, `schema-gap`, `capture-request`, `plan-feedback`, or `bug`.
- `severity` is `blocking` when QA cannot honestly complete the affected case; otherwise use `non-blocking`. `blocking` must agree with that value.
- `caseIds` lists affected cases when known.
- `journey` identifies the affected journey when applicable.
- `evidence` contains artifact paths or playtest session timestamps that support the finding. It may be empty only when the missing capability itself is the evidence.
- `needed` names the absent primitive, capture, schema expression, or plan decision for gap/request tickets.
- `proposedFixArea` is required for actionable bugs and review findings; it points to an area, not an invented implementation.

Use a collision-resistant filename beginning with the category and ticket ID. Do not batch unrelated findings or delay writing the file until rollup.

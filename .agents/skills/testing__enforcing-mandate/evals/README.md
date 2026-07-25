# Proportional Proof Strategy Eval

This suite checks whether `testing__enforcing-mandate` changes the decision from proof ritual to risk-proportional confidence.

The treatment should add durable tests only when they protect a stable contract from plausible meaningful harm at the cheapest risk-preserving seam. It must preserve strong watched-red, integration, contract, persistence, retry, auth, migration, performance, and browser proof when those boundaries are genuinely at risk while choosing no new test for mechanical/static or already-guarded changes.

The cases cover defect, new-feature, refactor, frontend-browser, backend-boundary, mechanical, attention-drift, and touchpoint-expansion behavior. Hard substring checks are only a semantic floor; the suite-level judge rejects keyword-matching answers whose actual plan still adds ritual tests or stops on a newly discovered in-boundary file.

Run the structural smoke test locally:

```bash
npm run eval -- testing__enforcing-mandate mock --trials 1
```

A live-model run is required to judge the behavioral delta. Mock mode proves suite discovery, baseline/treatment wiring, and result persistence only.

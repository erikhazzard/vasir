# Three.js water-ripples performance benchmark

This benchmark gives fresh agents the same frozen Three.js page in two lanes:

- `audit`: identify performance risks from read-only source;
- `implementation`: edit an isolated copy of `fixture/index.html`, then submit it to separate visual, topology, and runtime checks.

Each lane runs a clean and skill-guided pair for GPT-5.6 Sol, Terra, and Luna plus Claude Fable and Opus at max reasoning. The runner changes only the injected skill block between conditions and retains exact prompts, source and skill hashes, agent receipts, responses, edited workspaces, and patches.

Preview the 20-session plan without calling an agent:

```sh
node benchmarks/threejs-water-ripples-performance/run-agents.mjs --dry-run
```

Run the default matrix:

```sh
node benchmarks/threejs-water-ripples-performance/run-agents.mjs
```

Limit a development run to selected models:

```sh
node benchmarks/threejs-water-ripples-performance/run-agents.mjs --models sol,opus
```

Runs are retained under `.agents/vasir-evals/threejs-water-ripples-performance/<run-id>/`. Agent generation does not judge the outputs or establish a performance win. Use the benchmark-local verification and performance harnesses on the retained implementation rows.

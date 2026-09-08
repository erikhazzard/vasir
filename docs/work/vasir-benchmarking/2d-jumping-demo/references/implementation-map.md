# Implementation map

- Generation owner: jump_benchmark_executor; benchmarks/2d-jumping-demo/run-agents.mjs and shared tool bridge. Reuse workspace pilot isolation/retention, not response-only run-benchmark-eval.js.
- UI owner: jump_benchmark_site; site/vasirbenchmark.com/games.html, games.js, games.css and existing Games navigation.
- Publication owner: benchmark_game_routing; cli/eval/games-publication.js, publisher/artifact integration and infra. Content-addressed runtime/media paths use the CloudFront default hostname as an origin distinct from the website.
- Root: frozen task/rubric, experiment validity, capture/judge orchestration, final integration and live proof.

Public data seam: VASIR_DATA.games contains benchmark metadata, configurations, conditions, independent run rows and a separate reference. Each row has status, artifact play/video/poster URLs, optional computed score/dimensions, bounded rationale and limitations. Source evidence and scoring inputs are pinned privately; public values are projections.

Local tools: installed Codex/Claude CLIs, Chrome, Playwright at /Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs and /opt/homebrew/bin/ffmpeg. Native provider versions/auth/flags must be recorded by the runner. Do not include credentials in retained/public receipts.

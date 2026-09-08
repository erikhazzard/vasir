#!/usr/bin/env bash
set -euo pipefail

design_dir="$(cd "$(dirname "$0")" && pwd)"
page="$design_dir/index.html"
report_page="$design_dir/benchmark-report.html"
status=0
midwidth_audit_dir="$(mktemp -d "${TMPDIR:-/tmp}/vasirbenchmark-midwidth.XXXXXX")"

cleanup() {
  rm -f "$midwidth_audit_dir/main.png" "$midwidth_audit_dir/engineering.png" "$midwidth_audit_dir/report.png" "$midwidth_audit_dir/workflows.png" "$midwidth_audit_dir/workflow-report.png" "$midwidth_audit_dir/game-models.png" "$midwidth_audit_dir/game-benchmarks.png" "$midwidth_audit_dir/game-efficiency.png"
  rmdir "$midwidth_audit_dir" 2>/dev/null || true
}
trap cleanup EXIT

if [[ ! -f "$page" ]]; then
  echo "Missing canonical site template: $page" >&2
  exit 1
fi

if [[ ! -f "$report_page" ]]; then
  echo "Missing benchmark report: $report_page" >&2
  exit 1
fi

node "$design_dir/capture.mjs" "$page" "$design_dir/desktop.png" 1440 1000 leaderboard || status=1
node "$design_dir/capture.mjs" "$page" "$design_dir/mobile.png" 390 844 leaderboard || status=1
node "$design_dir/capture.mjs" "$page" "$design_dir/desktop-capabilities.png" 1440 1000 capabilities || status=1
node "$design_dir/capture.mjs" "$page" "$design_dir/mobile-capabilities.png" 390 844 capabilities || status=1
node "$design_dir/capture.mjs" "$page" "$design_dir/desktop-capability-benchmarks.png" 1440 1000 capability-benchmarks || status=1
node "$design_dir/capture.mjs" "$page" "$design_dir/mobile-capability-benchmarks.png" 390 844 capability-benchmarks || status=1
node "$design_dir/capture.mjs" "$page" "$design_dir/desktop-efficiency.png" 1440 1000 efficiency || status=1
node "$design_dir/capture.mjs" "$page" "$design_dir/mobile-efficiency.png" 390 844 efficiency || status=1
node "$design_dir/capture.mjs" "$report_page" "$design_dir/desktop-benchmark-report.png" 1440 1000 report || status=1
node "$design_dir/capture.mjs" "$report_page" "$design_dir/mobile-benchmark-report.png" 390 844 report || status=1
node "$design_dir/capture.mjs" "$page" "$midwidth_audit_dir/main.png" 820 1000 leaderboard || status=1
node "$design_dir/capture.mjs" "$page" "$midwidth_audit_dir/engineering.png" 820 1000 capabilities || status=1
node "$design_dir/capture.mjs" "$report_page" "$midwidth_audit_dir/report.png" 820 1000 report || status=1

has_workflows="$(node --input-type=module - "$design_dir/data.js" <<'NODE'
import fs from 'node:fs';
import vm from 'node:vm';
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(process.argv[2], 'utf8'), context);
process.stdout.write(context.window.VASIR_DATA?.aiWorkflows ? 'yes' : 'no');
NODE
)"

if [[ "$has_workflows" == "yes" ]]; then
  node "$design_dir/capture.mjs" "$page" "$design_dir/desktop-workflows.png" 1440 1000 workflows || status=1
  node "$design_dir/capture.mjs" "$page" "$design_dir/mobile-workflows.png" 390 844 workflows || status=1
  node "$design_dir/capture.mjs" "$page" "$design_dir/desktop-workflow-benchmarks.png" 1440 1000 workflow-benchmarks || status=1
  node "$design_dir/capture.mjs" "$page" "$design_dir/mobile-workflow-benchmarks.png" 390 844 workflow-benchmarks || status=1
  node "$design_dir/capture.mjs" "$page" "$design_dir/desktop-workflow-efficiency.png" 1440 1000 workflow-efficiency || status=1
  node "$design_dir/capture.mjs" "$page" "$design_dir/mobile-workflow-efficiency.png" 390 844 workflow-efficiency || status=1
  node "$design_dir/capture.mjs" "$report_page" "$design_dir/desktop-workflow-report.png" 1440 1000 workflow-report || status=1
  node "$design_dir/capture.mjs" "$report_page" "$design_dir/mobile-workflow-report.png" 390 844 workflow-report || status=1
  node "$design_dir/capture.mjs" "$page" "$midwidth_audit_dir/workflows.png" 820 1000 workflows || status=1
  node "$design_dir/capture.mjs" "$report_page" "$midwidth_audit_dir/workflow-report.png" 820 1000 workflow-report || status=1
fi

has_games="$(node --input-type=module - "$design_dir/data.js" <<'NODE'
import fs from 'node:fs';
import vm from 'node:vm';
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(process.argv[2], 'utf8'), context);
process.stdout.write(context.window.VASIR_DATA?.games ? 'yes' : 'no');
NODE
)"

if [[ "$has_games" == "yes" ]]; then
  for game_view in models benchmarks efficiency; do
    game_target="game-$game_view"
    if [[ "$game_view" == "models" ]]; then game_target="games"; fi
    node "$design_dir/capture.mjs" "$page" "$design_dir/desktop-game-$game_view.png" 1440 1000 "$game_target" || status=1
    node "$design_dir/capture.mjs" "$page" "$design_dir/mobile-game-$game_view.png" 390 844 "$game_target" || status=1
    node "$design_dir/capture.mjs" "$page" "$midwidth_audit_dir/game-$game_view.png" 820 1000 "$game_target" || status=1
  done
fi

if [[ $status -ne 0 ]]; then
  echo "Canonical real-data capture completed with QA failures." >&2
  exit "$status"
fi

echo "Canonical VasirBench capture and QA passed at desktop, mobile, and 820px for Engineering and every selected AI Workflows and Games view."

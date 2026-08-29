#!/usr/bin/env bash
set -euo pipefail

design_dir="$(cd "$(dirname "$0")" && pwd)"
page="$design_dir/index.html"
report_page="$design_dir/benchmark-report.html"
status=0

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

if [[ $status -ne 0 ]]; then
  echo "Final homepage capture completed with QA failures." >&2
  exit "$status"
fi

echo "Canonical VasirBench site template capture and QA passed for all three local views, including Combined paired compositions, named capability rankings, benchmark-test drilldown, and category-scoped Efficiency."

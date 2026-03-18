---
name: devops
description: CI/CD pipelines, immutable artifacts, deploy health gates, and operational readiness checks.
---

# DevOps

Make the safest path the default path: build once, verify before deploy, and prove health after rollout.

## Core Principle

Separate build from deploy. Produce one immutable artifact, promote it through environments, and gate rollout on explicit health checks.

## Quick Reference

- CI proves code quality before any artifact is promoted.
- CD deploys a previously built artifact, not a fresh environment-specific rebuild.
- Health checks, smoke tests, and rollback triggers are part of the deployment, not afterthoughts.
- Operational visibility ships with the change.

## Implementation Patterns

### Pattern 1: CI pipeline with build-once posture

```yaml
name: ci
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npm test
      - run: npm run build
```

### Pattern 2: Deploy waits for health

```bash
deploy_revision "$IMAGE_DIGEST"

for attempt in $(seq 1 30); do
  if curl -fsS "https://service.example.com/healthz" >/dev/null; then
    exit 0
  fi
  sleep 2
done

echo "deployment failed health check" >&2
exit 1
```

### Pattern 3: Alert on user-visible failure signals

```yaml
groups:
  - name: service-alerts
    rules:
      - alert: High5xxRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 10m
        labels:
          severity: page
```

## Anti-Patterns

- Do not rebuild differently per environment. That destroys reproducibility.
- Do not deploy mutable tags like `latest` when an immutable digest exists.
- Do not call a deploy successful before the new version passes health checks.

## Checklist

- [ ] CI proves build, tests, and lint gates before promotion.
- [ ] One immutable artifact moves across environments.
- [ ] Deploys include health checks and rollback criteria.
- [ ] Metrics and alerts track user-visible failure, not just host liveness.
- [ ] Runbooks and scripts reflect the actual deployed system.

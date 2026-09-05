(function () {
  'use strict';

  window.VASIR_DATA = Object.freeze({
  "kind": "vasirbenchmark-public-projection",
  "schemaVersion": 2,
  "program": {
    "id": "vasirbench",
    "title": "VasirBench",
    "taxonomyVersion": "vasir-capabilities-development-v5",
    "status": "development",
    "evidenceStatus": "development",
    "verification": "unverified"
  },
  "meta": {
    "release": "Development snapshot · September 2026",
    "status": "Development results · unverified",
    "categories": 1,
    "benchmarks": 3,
    "settings": 36,
    "conditions": 2,
    "trials": 1,
    "aggregateCells": 216,
    "runs": 3,
    "calibration": 0,
    "vasirVersion": null
  },
  "scoreBasis": {
    "id": "backend-architecture-panel-consensus-v2:4c610eabe7adc69f5fc5875be4a1ec2828ee648e547f21e52df18b68911468dc",
    "label": "Engineering v2",
    "edition": "backend-architecture-panel-consensus-v2",
    "method": "equal-benchmark-absolute-mean-v1",
    "unit": "rubric-points",
    "range": {
      "minimum": 0,
      "maximum": 100
    },
    "benchmarkWeighting": "equal",
    "benchmarkIds": [
      "hyper-scale-chat",
      "personalized-home-feed",
      "device-telemetry"
    ],
    "taskCount": 3,
    "trialsPerTask": 1,
    "judgeCount": 2,
    "judges": [
      "codex:gpt-6-astra@xhigh",
      "claude:claude-fable-5-1@max"
    ],
    "aggregation": "unanimity-gates-mean-dimensions-v1",
    "batchUnit": "matched-pair",
    "effectMethod": "paired-absolute-delta-v1",
    "effectUnit": "rubric-points",
    "calibrationStatus": "development-uncalibrated",
    "uncertainty": {
      "status": "not-estimated",
      "reason": "Only one trial per task and condition is published; per-response judge spread is retained."
    }
  },
  "conditions": [
    {
      "id": "baseline",
      "sourceId": "clean",
      "short": "Minimal",
      "label": "Minimal baseline",
      "color": "#72777f",
      "shape": "circle"
    },
    {
      "id": "skill",
      "sourceId": "skill:plan__question-spec-architecture",
      "short": "Architecture",
      "label": "Architecture skill",
      "color": "#1f6fff",
      "shape": "square"
    }
  ],
  "categories": [
    {
      "id": "engineering",
      "name": "Engineering",
      "title": "Engineering",
      "short": "ENG",
      "weight": 1,
      "color": "#007f99",
      "trackIds": [
        "backend-architecture"
      ]
    }
  ],
  "families": [
    {
      "id": "engineering",
      "title": "Engineering",
      "description": "Software and infrastructure work judged by the correctness, durability, and operability of the resulting system.",
      "trackIds": [
        "backend-architecture"
      ]
    }
  ],
  "tracks": [
    {
      "id": "backend-architecture",
      "familyId": "engineering",
      "title": "Backend Architecture",
      "description": "Systems that reach real scale through replicas and partitions instead of a later rewrite.",
      "benchmarkIds": [
        "hyper-scale-chat",
        "personalized-home-feed",
        "device-telemetry"
      ],
      "resultAvailability": {
        "status": "development",
        "verification": "unverified",
        "code": "development-unverified-results",
        "message": "Development results — not verified benchmark claims.",
        "detail": "Three complete matched runs are shown for development inspection; author calibration and shared public eligibility remain pending.",
        "blockers": [
          {
            "code": "author-calibration-pending",
            "message": "Author calibration is pending for all three development runs."
          },
          {
            "code": "panel-audit-required",
            "message": "Saved judging panels require independent audit before verified claims."
          },
          {
            "code": "public-eligibility-unverified",
            "message": "The shared public-result eligibility validator has not verified these development runs."
          }
        ]
      }
    }
  ],
  "benchmarks": [
    {
      "id": "hyper-scale-chat",
      "trackId": "backend-architecture",
      "familyId": "engineering",
      "category": "engineering",
      "suite": "Backend Architecture",
      "name": "Hyper-scale chat architecture",
      "title": "Hyper-scale chat architecture",
      "description": "Tests whether a model can find a complete, lasting, low-rent topology for mobile chat at extreme concurrency without being steered toward a preferred product or protocol.",
      "taskKind": "response",
      "task": {
        "id": "ten-million-concurrent-users",
        "text": "Architect a chat app infrastructure that supports 10 million concurrent users."
      },
      "prompt": "Architect a chat app infrastructure that supports 10 million concurrent users.",
      "judging": {
        "panel": [
          "codex:gpt-6-astra@xhigh",
          "claude:claude-fable-5-1@max"
        ],
        "synthesizer": null
      },
      "limitations": [
        "The architecture treatment contains a chat-specific worked default, so this benchmark measures retrieval and application of that guidance rather than novel-task generalization."
      ],
      "reportFragment": "hyper-scale-chat",
      "detailHref": "benchmark-report.html#hyper-scale-chat",
      "evidenceKind": "development",
      "resultAvailability": {
        "status": "development",
        "verification": "unverified",
        "code": "development-unverified-results",
        "message": "Development results — not verified benchmark claims.",
        "detail": "Three complete matched runs are shown for development inspection; author calibration and shared public eligibility remain pending.",
        "blockers": [
          {
            "code": "author-calibration-pending",
            "message": "Author calibration is pending for all three development runs."
          },
          {
            "code": "panel-audit-required",
            "message": "Saved judging panels require independent audit before verified claims."
          },
          {
            "code": "public-eligibility-unverified",
            "message": "The shared public-result eligibility validator has not verified these development runs."
          }
        ]
      },
      "measured": {
        "baseline": 46.1,
        "treatment": 61,
        "delta": 15,
        "wins": 32,
        "ties": 3,
        "losses": 1,
        "complete": 72,
        "total": 72,
        "treatmentLabel": "Architecture skill",
        "calibration": "Calibration pending"
      }
    },
    {
      "id": "personalized-home-feed",
      "trackId": "backend-architecture",
      "familyId": "engineering",
      "category": "engineering",
      "suite": "Backend Architecture",
      "name": "Personalized home feed architecture",
      "title": "Personalized home feed architecture",
      "description": "Tests whether a model can find a complete, lasting, low-rent topology for personalized consumer discovery with high-follower skew, mutable visibility, and ranked derived state without being steered toward a preferred technology or feed strategy.",
      "taskKind": "response",
      "task": {
        "id": "ten-million-daily-users",
        "text": "Architect a personalized home feed for a consumer app that can grow from launch to 10 million daily users. People follow creators and page through a ranked mix of recent followed posts and recommendations, and some creators have millions of followers. New posts should be eligible within 30 seconds; after a deletion or privacy change is acknowledged, later feed requests must not reveal affected content to an unauthorized viewer."
      },
      "prompt": "Architect a personalized home feed for a consumer app that can grow from launch to 10 million daily users. People follow creators and page through a ranked mix of recent followed posts and recommendations, and some creators have millions of followers. New posts should be eligible within 30 seconds; after a deletion or privacy change is acknowledged, later feed requests must not reveal affected content to an unauthorized viewer.",
      "judging": {
        "panel": [
          "codex:gpt-6-astra@xhigh",
          "claude:claude-fable-5-1@max"
        ],
        "synthesizer": null
      },
      "limitations": [
        "Ten million daily users is a population target rather than a throughput envelope, so the benchmark rewards topology continuity and explicit unknowns rather than invented capacity proof.",
        "The task does not specify a learned-recommendation quality target, so a bounded heuristic ranking can satisfy the product contract."
      ],
      "reportFragment": "personalized-home-feed",
      "detailHref": "benchmark-report.html#personalized-home-feed",
      "evidenceKind": "development",
      "resultAvailability": {
        "status": "development",
        "verification": "unverified",
        "code": "development-unverified-results",
        "message": "Development results — not verified benchmark claims.",
        "detail": "Three complete matched runs are shown for development inspection; author calibration and shared public eligibility remain pending.",
        "blockers": [
          {
            "code": "author-calibration-pending",
            "message": "Author calibration is pending for all three development runs."
          },
          {
            "code": "panel-audit-required",
            "message": "Saved judging panels require independent audit before verified claims."
          },
          {
            "code": "public-eligibility-unverified",
            "message": "The shared public-result eligibility validator has not verified these development runs."
          }
        ]
      },
      "measured": {
        "baseline": 52.4,
        "treatment": 55.2,
        "delta": 2.8,
        "wins": 13,
        "ties": 20,
        "losses": 3,
        "complete": 72,
        "total": 72,
        "treatmentLabel": "Architecture skill",
        "calibration": "Calibration pending"
      }
    },
    {
      "id": "device-telemetry",
      "trackId": "backend-architecture",
      "familyId": "engineering",
      "category": "engineering",
      "suite": "Backend Architecture",
      "name": "High-volume device telemetry architecture",
      "title": "High-volume device telemetry architecture",
      "description": "Tests whether a model can derive a complete, lasting, low-rent topology for high-volume owner-local telemetry while preserving durable retry semantics, monotonic current state, and honest capacity bounds without being rewarded for preferred products.",
      "taskKind": "response",
      "task": {
        "id": "ten-million-active-devices",
        "text": "Architect a telemetry backend that can grow from launch to 10 million simultaneously active devices. Each device has a stable ID and a strictly increasing, never-reused local sequence number, and produces one reading of at most 1 KB every 30 seconds. After reconnecting, a device may retry or upload as many as 1,000 buffered readings in one request. Users fetch the latest accepted reading or cursor through one device's readings from the previous 24 hours. Every acknowledged reading must remain queryable for 24 hours; retries must not create duplicate logical readings; late or out-of-order readings must never move latest backward. The latest accepted reading must remain available until a newer reading replaces it, even after its history copy expires."
      },
      "prompt": "Architect a telemetry backend that can grow from launch to 10 million simultaneously active devices. Each device has a stable ID and a strictly increasing, never-reused local sequence number, and produces one reading of at most 1 KB every 30 seconds. After reconnecting, a device may retry or upload as many as 1,000 buffered readings in one request. Users fetch the latest accepted reading or cursor through one device's readings from the previous 24 hours. Every acknowledged reading must remain queryable for 24 hours; retries must not create duplicate logical readings; late or out-of-order readings must never move latest backward. The latest accepted reading must remain available until a newer reading replaces it, even after its history copy expires.",
      "judging": {
        "panel": [
          "codex:gpt-6-astra@xhigh",
          "claude:claude-fable-5-1@max"
        ],
        "synthesizer": null
      },
      "limitations": [
        "The stated workload determines steady ingest and retained-data scale, but correlated send and reconnect bursts, query volume, geography, latency targets, availability targets, and durability failure domains remain unspecified.",
        "The task deliberately excludes fleet-wide analytics, alerting, device commands, and archival beyond the stated retention contract; infrastructure added only for those invented requirements counts against the answer."
      ],
      "reportFragment": "device-telemetry",
      "detailHref": "benchmark-report.html#device-telemetry",
      "evidenceKind": "development",
      "resultAvailability": {
        "status": "development",
        "verification": "unverified",
        "code": "development-unverified-results",
        "message": "Development results — not verified benchmark claims.",
        "detail": "Three complete matched runs are shown for development inspection; author calibration and shared public eligibility remain pending.",
        "blockers": [
          {
            "code": "author-calibration-pending",
            "message": "Author calibration is pending for all three development runs."
          },
          {
            "code": "panel-audit-required",
            "message": "Saved judging panels require independent audit before verified claims."
          },
          {
            "code": "public-eligibility-unverified",
            "message": "The shared public-result eligibility validator has not verified these development runs."
          }
        ]
      },
      "measured": {
        "baseline": 57.6,
        "treatment": 73.6,
        "delta": 15.9,
        "wins": 22,
        "ties": 9,
        "losses": 5,
        "complete": 72,
        "total": 72,
        "treatmentLabel": "Architecture skill",
        "calibration": "Calibration pending"
      }
    }
  ],
  "results": [
    {
      "benchmarkId": "hyper-scale-chat",
      "runId": "2026-09-04T22-09-30Z__rejudge__d7490f32658c",
      "completedAt": "2026-09-04T22:28:10.884Z",
      "status": "development",
      "verification": "unverified",
      "blockers": [
        {
          "code": "author-calibration-pending",
          "message": "Author calibration is pending for all three development runs."
        },
        {
          "code": "panel-audit-required",
          "message": "Saved judging panels require independent audit before verified claims."
        },
        {
          "code": "public-eligibility-unverified",
          "message": "The shared public-result eligibility validator has not verified these development runs."
        }
      ],
      "judgingScope": {
        "strategy": "saved-responses-full-rescore-v1",
        "responseCount": 72,
        "generationReused": true,
        "sourceScoresPreserved": false
      },
      "baselineScore": 46.1,
      "treatmentScore": 61,
      "delta": 15,
      "record": {
        "wins": 32,
        "ties": 3,
        "losses": 1
      },
      "responseCount": 72,
      "matchedConfigurationCount": 36,
      "configurations": [
        {
          "settingId": "codex-gpt-6-astra-ultra",
          "configurationId": "codex:gpt-6-astra@ultra",
          "baselineScore": 49,
          "treatmentScore": 80.6,
          "delta": 31.6,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 47469,
            "meanInputTokens": 14988,
            "meanOutputTokens": 1457,
            "meanTotalTokens": 16445,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 76995,
            "meanInputTokens": 17820,
            "meanOutputTokens": 2451,
            "meanTotalTokens": 20271,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-xhigh",
          "configurationId": "codex:gpt-6-astra@xhigh",
          "baselineScore": 52.5,
          "treatmentScore": 80.6,
          "delta": 28.1,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 47010,
            "meanInputTokens": 14939,
            "meanOutputTokens": 1450,
            "meanTotalTokens": 16389,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 74857,
            "meanInputTokens": 17775,
            "meanOutputTokens": 2356,
            "meanTotalTokens": 20131,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-high",
          "configurationId": "codex:gpt-6-astra@high",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 29256,
            "meanInputTokens": 14939,
            "meanOutputTokens": 819,
            "meanTotalTokens": 15758,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 33307,
            "meanInputTokens": 17779,
            "meanOutputTokens": 986,
            "meanTotalTokens": 18765,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-low",
          "configurationId": "codex:gpt-6-astra@low",
          "baselineScore": 59,
          "treatmentScore": 79.4,
          "delta": 20.4,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 18424,
            "meanInputTokens": 15160,
            "meanOutputTokens": 469,
            "meanTotalTokens": 15629,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 22281,
            "meanInputTokens": 17996,
            "meanOutputTokens": 587,
            "meanTotalTokens": 18583,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-max",
          "configurationId": "codex:gpt-6-astra@max",
          "baselineScore": 59,
          "treatmentScore": 82.5,
          "delta": 23.5,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 125995,
            "meanInputTokens": 14941,
            "meanOutputTokens": 4050,
            "meanTotalTokens": 18991,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 167693,
            "meanInputTokens": 17777,
            "meanOutputTokens": 5393,
            "meanTotalTokens": 23170,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-xhigh",
          "configurationId": "codex:gpt-5.6-sol@xhigh",
          "baselineScore": 49,
          "treatmentScore": 85,
          "delta": 36,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 19181,
            "meanInputTokens": 14286,
            "meanOutputTokens": 496,
            "meanTotalTokens": 14782,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 167195,
            "meanInputTokens": 17120,
            "meanOutputTokens": 5060,
            "meanTotalTokens": 22180,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-max",
          "configurationId": "codex:gpt-5.6-sol@max",
          "baselineScore": 46.9,
          "treatmentScore": 59,
          "delta": 12.1,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 65074,
            "meanInputTokens": 14288,
            "meanOutputTokens": 1390,
            "meanTotalTokens": 15678,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 337825,
            "meanInputTokens": 17247,
            "meanOutputTokens": 10304,
            "meanTotalTokens": 27551,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-ultra",
          "configurationId": "codex:gpt-5.6-sol@ultra",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 53140,
            "meanInputTokens": 14295,
            "meanOutputTokens": 1359,
            "meanTotalTokens": 15654,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 175173,
            "meanInputTokens": 17131,
            "meanOutputTokens": 5373,
            "meanTotalTokens": 22504,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-ultra",
          "configurationId": "codex:gpt-5.6-terra@ultra",
          "baselineScore": 39.4,
          "treatmentScore": 59,
          "delta": 19.6,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 21948,
            "meanInputTokens": 14420,
            "meanOutputTokens": 849,
            "meanTotalTokens": 15269,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 138713,
            "meanInputTokens": 17256,
            "meanOutputTokens": 7402,
            "meanTotalTokens": 24658,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-claude-fable-5-1-max",
          "configurationId": "claude:claude-fable-5-1@max",
          "baselineScore": 54.4,
          "treatmentScore": 59,
          "delta": 4.6,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 159146,
            "meanInputTokens": 2,
            "meanOutputTokens": 12261,
            "meanTotalTokens": 16048,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 210179,
            "meanInputTokens": 2,
            "meanOutputTokens": 15695,
            "meanTotalTokens": 24130,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-high",
          "configurationId": "codex:gpt-5.6-sol@high",
          "baselineScore": 40,
          "treatmentScore": 59,
          "delta": 19,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 24822,
            "meanInputTokens": 14409,
            "meanOutputTokens": 560,
            "meanTotalTokens": 14969,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 92440,
            "meanInputTokens": 17122,
            "meanOutputTokens": 2444,
            "meanTotalTokens": 19566,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-high",
          "configurationId": "claude:fable@high",
          "baselineScore": 45.6,
          "treatmentScore": 59,
          "delta": 13.4,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 20226,
            "meanInputTokens": 2,
            "meanOutputTokens": 1057,
            "meanTotalTokens": 4137,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 31029,
            "meanInputTokens": 2,
            "meanOutputTokens": 1845,
            "meanTotalTokens": 9573,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-high",
          "configurationId": "claude:opus@high",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 40249,
            "meanInputTokens": 2,
            "meanOutputTokens": 2091,
            "meanTotalTokens": 4825,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 59225,
            "meanInputTokens": 2,
            "meanOutputTokens": 3530,
            "meanTotalTokens": 10913,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-max",
          "configurationId": "claude:fable@max",
          "baselineScore": 40.6,
          "treatmentScore": 49,
          "delta": 8.4,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 39754,
            "meanInputTokens": 2,
            "meanOutputTokens": 2402,
            "meanTotalTokens": 5480,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 58461,
            "meanInputTokens": 2,
            "meanOutputTokens": 3680,
            "meanTotalTokens": 11409,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-max",
          "configurationId": "codex:gpt-5.6-terra@max",
          "baselineScore": 46.9,
          "treatmentScore": 59,
          "delta": 12.1,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 21015,
            "meanInputTokens": 14409,
            "meanOutputTokens": 847,
            "meanTotalTokens": 15256,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 117579,
            "meanInputTokens": 17247,
            "meanOutputTokens": 6035,
            "meanTotalTokens": 23282,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-xhigh",
          "configurationId": "codex:gpt-5.6-luna@xhigh",
          "baselineScore": 34.4,
          "treatmentScore": 59,
          "delta": 24.6,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 26796,
            "meanInputTokens": 12851,
            "meanOutputTokens": 787,
            "meanTotalTokens": 13638,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 111707,
            "meanInputTokens": 15691,
            "meanOutputTokens": 5544,
            "meanTotalTokens": 21235,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-medium",
          "configurationId": "claude:fable@medium",
          "baselineScore": 44.4,
          "treatmentScore": 59,
          "delta": 14.6,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 18127,
            "meanInputTokens": 2,
            "meanOutputTokens": 878,
            "meanTotalTokens": 3958,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 21432,
            "meanInputTokens": 2,
            "meanOutputTokens": 1140,
            "meanTotalTokens": 8868,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-xhigh",
          "configurationId": "claude:fable@xhigh",
          "baselineScore": 40.6,
          "treatmentScore": 49,
          "delta": 8.4,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 18105,
            "meanInputTokens": 2,
            "meanOutputTokens": 951,
            "meanTotalTokens": 4033,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 46933,
            "meanInputTokens": 2,
            "meanOutputTokens": 2986,
            "meanTotalTokens": 10714,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-high",
          "configurationId": "codex:gpt-5.6-terra@high",
          "baselineScore": 31.3,
          "treatmentScore": 49,
          "delta": 17.7,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 11899,
            "meanInputTokens": 14411,
            "meanOutputTokens": 293,
            "meanTotalTokens": 14704,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 23501,
            "meanInputTokens": 17245,
            "meanOutputTokens": 833,
            "meanTotalTokens": 18078,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-claude-fable-5-1-xhigh",
          "configurationId": "claude:claude-fable-5-1@xhigh",
          "baselineScore": 38.8,
          "treatmentScore": 49,
          "delta": 10.2,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 44796,
            "meanInputTokens": 2,
            "meanOutputTokens": 3228,
            "meanTotalTokens": 7013,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 141491,
            "meanInputTokens": 2,
            "meanOutputTokens": 9840,
            "meanTotalTokens": 18274,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-max",
          "configurationId": "codex:gpt-5.6-luna@max",
          "baselineScore": 45,
          "treatmentScore": 75,
          "delta": 30,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 36455,
            "meanInputTokens": 12851,
            "meanOutputTokens": 1392,
            "meanTotalTokens": 14243,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 302269,
            "meanInputTokens": 15689,
            "meanOutputTokens": 16356,
            "meanTotalTokens": 32045,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-medium",
          "configurationId": "codex:gpt-6-astra@medium",
          "baselineScore": 59,
          "treatmentScore": 83.1,
          "delta": 24.1,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 18975,
            "meanInputTokens": 15164,
            "meanOutputTokens": 471,
            "meanTotalTokens": 15635,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 24087,
            "meanInputTokens": 18000,
            "meanOutputTokens": 672,
            "meanTotalTokens": 18672,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-low",
          "configurationId": "codex:gpt-5.6-terra@low",
          "baselineScore": 35.6,
          "treatmentScore": 59,
          "delta": 23.4,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 10173,
            "meanInputTokens": 14286,
            "meanOutputTokens": 289,
            "meanTotalTokens": 14575,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 12742,
            "meanInputTokens": 17120,
            "meanOutputTokens": 530,
            "meanTotalTokens": 17650,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-medium",
          "configurationId": "codex:gpt-5.6-sol@medium",
          "baselineScore": 55.6,
          "treatmentScore": 59,
          "delta": 3.4,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 19147,
            "meanInputTokens": 14284,
            "meanOutputTokens": 425,
            "meanTotalTokens": 14709,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 32081,
            "meanInputTokens": 17122,
            "meanOutputTokens": 855,
            "meanTotalTokens": 17977,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-claude-fable-5-1-ultracode",
          "configurationId": "claude:claude-fable-5-1@ultracode",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 280001,
            "meanInputTokens": 4,
            "meanOutputTokens": 2031,
            "meanTotalTokens": 21148,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 441408,
            "meanInputTokens": 4,
            "meanOutputTokens": 1748,
            "meanTotalTokens": 27722,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-high",
          "configurationId": "codex:gpt-5.6-luna@high",
          "baselineScore": 32.5,
          "treatmentScore": 59,
          "delta": 26.5,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 19173,
            "meanInputTokens": 12853,
            "meanOutputTokens": 442,
            "meanTotalTokens": 13295,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 125055,
            "meanInputTokens": 15689,
            "meanOutputTokens": 6215,
            "meanTotalTokens": 21904,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-low",
          "configurationId": "codex:gpt-5.6-sol@low",
          "baselineScore": 35.6,
          "treatmentScore": 59,
          "delta": 23.4,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 18035,
            "meanInputTokens": 14288,
            "meanOutputTokens": 364,
            "meanTotalTokens": 14652,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 37700,
            "meanInputTokens": 17122,
            "meanOutputTokens": 801,
            "meanTotalTokens": 17923,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-xhigh",
          "configurationId": "codex:gpt-5.6-terra@xhigh",
          "baselineScore": 37.5,
          "treatmentScore": 59,
          "delta": 21.5,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 19174,
            "meanInputTokens": 14411,
            "meanOutputTokens": 728,
            "meanTotalTokens": 15139,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 47663,
            "meanInputTokens": 17122,
            "meanOutputTokens": 2359,
            "meanTotalTokens": 19481,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-medium",
          "configurationId": "codex:gpt-5.6-terra@medium",
          "baselineScore": 36.9,
          "treatmentScore": 59,
          "delta": 22.1,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 11796,
            "meanInputTokens": 14284,
            "meanOutputTokens": 362,
            "meanTotalTokens": 14646,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 20040,
            "meanInputTokens": 17120,
            "meanOutputTokens": 836,
            "meanTotalTokens": 17956,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-low",
          "configurationId": "claude:opus@low",
          "baselineScore": 45,
          "treatmentScore": 59,
          "delta": 14,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 20288,
            "meanInputTokens": 2,
            "meanOutputTokens": 1128,
            "meanTotalTokens": 3862,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 28708,
            "meanInputTokens": 2,
            "meanOutputTokens": 1461,
            "meanTotalTokens": 8845,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-max",
          "configurationId": "claude:opus@max",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 52777,
            "meanInputTokens": 2,
            "meanOutputTokens": 3264,
            "meanTotalTokens": 5998,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 138738,
            "meanInputTokens": 2,
            "meanOutputTokens": 8870,
            "meanTotalTokens": 16252,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-medium",
          "configurationId": "codex:gpt-5.6-luna@medium",
          "baselineScore": 43.8,
          "treatmentScore": 49,
          "delta": 5.2,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 15416,
            "meanInputTokens": 12853,
            "meanOutputTokens": 405,
            "meanTotalTokens": 13258,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 21662,
            "meanInputTokens": 15689,
            "meanOutputTokens": 750,
            "meanTotalTokens": 16439,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-low",
          "configurationId": "codex:gpt-5.6-luna@low",
          "baselineScore": 39.4,
          "treatmentScore": 59,
          "delta": 19.6,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 16162,
            "meanInputTokens": 12853,
            "meanOutputTokens": 427,
            "meanTotalTokens": 13280,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 21466,
            "meanInputTokens": 15689,
            "meanOutputTokens": 561,
            "meanTotalTokens": 16250,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-medium",
          "configurationId": "claude:opus@medium",
          "baselineScore": 46.9,
          "treatmentScore": 49,
          "delta": 2.1,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 23628,
            "meanInputTokens": 2,
            "meanOutputTokens": 1357,
            "meanTotalTokens": 4090,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 54748,
            "meanInputTokens": 2,
            "meanOutputTokens": 3291,
            "meanTotalTokens": 10673,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-xhigh",
          "configurationId": "claude:opus@xhigh",
          "baselineScore": 51.3,
          "treatmentScore": 49,
          "delta": -2.3,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 55179,
            "meanInputTokens": 2,
            "meanOutputTokens": 3015,
            "meanTotalTokens": 5749,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 92473,
            "meanInputTokens": 2,
            "meanOutputTokens": 5836,
            "meanTotalTokens": 13218,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-low",
          "configurationId": "claude:fable@low",
          "baselineScore": 46.9,
          "treatmentScore": 49,
          "delta": 2.1,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 18656,
            "meanInputTokens": 2,
            "meanOutputTokens": 769,
            "meanTotalTokens": 3850,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 21838,
            "meanInputTokens": 2,
            "meanOutputTokens": 970,
            "meanTotalTokens": 8699,
            "costUsd": null
          }
        }
      ]
    },
    {
      "benchmarkId": "personalized-home-feed",
      "runId": "2026-09-04T22-33-49Z__rejudge__1d7e5cf5fcdf",
      "completedAt": "2026-09-04T22:40:08.398Z",
      "status": "development",
      "verification": "unverified",
      "blockers": [
        {
          "code": "author-calibration-pending",
          "message": "Author calibration is pending for all three development runs."
        },
        {
          "code": "panel-audit-required",
          "message": "Saved judging panels require independent audit before verified claims."
        },
        {
          "code": "public-eligibility-unverified",
          "message": "The shared public-result eligibility validator has not verified these development runs."
        }
      ],
      "judgingScope": {
        "strategy": "saved-responses-full-rescore-v1",
        "responseCount": 72,
        "generationReused": true,
        "sourceScoresPreserved": false
      },
      "baselineScore": 52.4,
      "treatmentScore": 55.2,
      "delta": 2.8,
      "record": {
        "wins": 13,
        "ties": 20,
        "losses": 3
      },
      "responseCount": 72,
      "matchedConfigurationCount": 36,
      "configurations": [
        {
          "settingId": "codex-gpt-6-astra-ultra",
          "configurationId": "codex:gpt-6-astra@ultra",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 112746,
            "meanInputTokens": 15284,
            "meanOutputTokens": 3619,
            "meanTotalTokens": 18903,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 115693,
            "meanInputTokens": 17897,
            "meanOutputTokens": 3724,
            "meanTotalTokens": 21621,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-xhigh",
          "configurationId": "codex:gpt-6-astra@xhigh",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 117525,
            "meanInputTokens": 15235,
            "meanOutputTokens": 3750,
            "meanTotalTokens": 18985,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 154832,
            "meanInputTokens": 17850,
            "meanOutputTokens": 4679,
            "meanTotalTokens": 22529,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-high",
          "configurationId": "codex:gpt-6-astra@high",
          "baselineScore": 59,
          "treatmentScore": 82.5,
          "delta": 23.5,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 42592,
            "meanInputTokens": 15237,
            "meanOutputTokens": 1210,
            "meanTotalTokens": 16447,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 53140,
            "meanInputTokens": 17850,
            "meanOutputTokens": 1567,
            "meanTotalTokens": 19417,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-low",
          "configurationId": "codex:gpt-6-astra@low",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 23706,
            "meanInputTokens": 15237,
            "meanOutputTokens": 639,
            "meanTotalTokens": 15876,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 29816,
            "meanInputTokens": 18073,
            "meanOutputTokens": 806,
            "meanTotalTokens": 18879,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-max",
          "configurationId": "codex:gpt-6-astra@max",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 194418,
            "meanInputTokens": 15237,
            "meanOutputTokens": 6362,
            "meanTotalTokens": 21599,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 446815,
            "meanInputTokens": 18071,
            "meanOutputTokens": 14763,
            "meanTotalTokens": 32834,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-xhigh",
          "configurationId": "codex:gpt-5.6-sol@xhigh",
          "baselineScore": 59,
          "treatmentScore": 49,
          "delta": -10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 90291,
            "meanInputTokens": 14484,
            "meanOutputTokens": 3229,
            "meanTotalTokens": 17713,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 177807,
            "meanInputTokens": 17197,
            "meanOutputTokens": 6224,
            "meanTotalTokens": 23421,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-max",
          "configurationId": "codex:gpt-5.6-sol@max",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 129319,
            "meanInputTokens": 14361,
            "meanOutputTokens": 6764,
            "meanTotalTokens": 21125,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 452432,
            "meanInputTokens": 17193,
            "meanOutputTokens": 16510,
            "meanTotalTokens": 33703,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-ultra",
          "configurationId": "codex:gpt-5.6-sol@ultra",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 370541,
            "meanInputTokens": 14370,
            "meanOutputTokens": 11405,
            "meanTotalTokens": 25775,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 349047,
            "meanInputTokens": 17333,
            "meanOutputTokens": 14663,
            "meanTotalTokens": 31996,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-ultra",
          "configurationId": "codex:gpt-5.6-terra@ultra",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 26152,
            "meanInputTokens": 14495,
            "meanOutputTokens": 1008,
            "meanTotalTokens": 15503,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 265313,
            "meanInputTokens": 17206,
            "meanOutputTokens": 14501,
            "meanTotalTokens": 31707,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-claude-fable-5-1-max",
          "configurationId": "claude:claude-fable-5-1@max",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 131584,
            "meanInputTokens": 2,
            "meanOutputTokens": 9354,
            "meanTotalTokens": 13264,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 351368,
            "meanInputTokens": 2,
            "meanOutputTokens": 25051,
            "meanTotalTokens": 33609,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-high",
          "configurationId": "codex:gpt-5.6-sol@high",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 47433,
            "meanInputTokens": 14361,
            "meanOutputTokens": 1457,
            "meanTotalTokens": 15818,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 94856,
            "meanInputTokens": 17197,
            "meanOutputTokens": 3110,
            "meanTotalTokens": 20307,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-high",
          "configurationId": "claude:fable@high",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 20403,
            "meanInputTokens": 2,
            "meanOutputTokens": 1156,
            "meanTotalTokens": 4361,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 51229,
            "meanInputTokens": 2,
            "meanOutputTokens": 3066,
            "meanTotalTokens": 10918,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-high",
          "configurationId": "claude:opus@high",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 39414,
            "meanInputTokens": 2,
            "meanOutputTokens": 2409,
            "meanTotalTokens": 5268,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 83210,
            "meanInputTokens": 2,
            "meanOutputTokens": 5281,
            "meanTotalTokens": 12786,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-max",
          "configurationId": "claude:fable@max",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 55414,
            "meanInputTokens": 2,
            "meanOutputTokens": 3678,
            "meanTotalTokens": 6882,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 88647,
            "meanInputTokens": 2,
            "meanOutputTokens": 5649,
            "meanTotalTokens": 13501,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-max",
          "configurationId": "codex:gpt-5.6-terra@max",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 119462,
            "meanInputTokens": 14363,
            "meanOutputTokens": 6178,
            "meanTotalTokens": 20541,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 386334,
            "meanInputTokens": 17322,
            "meanOutputTokens": 21210,
            "meanTotalTokens": 38532,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-xhigh",
          "configurationId": "codex:gpt-5.6-luna@xhigh",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 48159,
            "meanInputTokens": 12803,
            "meanOutputTokens": 2485,
            "meanTotalTokens": 15288,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 95598,
            "meanInputTokens": 15639,
            "meanOutputTokens": 5146,
            "meanTotalTokens": 20785,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-medium",
          "configurationId": "claude:fable@medium",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 22671,
            "meanInputTokens": 2,
            "meanOutputTokens": 1151,
            "meanTotalTokens": 4354,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 38277,
            "meanInputTokens": 2,
            "meanOutputTokens": 2030,
            "meanTotalTokens": 9880,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-xhigh",
          "configurationId": "claude:fable@xhigh",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 36239,
            "meanInputTokens": 2,
            "meanOutputTokens": 1902,
            "meanTotalTokens": 5106,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 62591,
            "meanInputTokens": 2,
            "meanOutputTokens": 3970,
            "meanTotalTokens": 11821,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-high",
          "configurationId": "codex:gpt-5.6-terra@high",
          "baselineScore": 53.1,
          "treatmentScore": 59,
          "delta": 5.9,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 13964,
            "meanInputTokens": 14486,
            "meanOutputTokens": 479,
            "meanTotalTokens": 14965,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 43174,
            "meanInputTokens": 17197,
            "meanOutputTokens": 2041,
            "meanTotalTokens": 19238,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-claude-fable-5-1-xhigh",
          "configurationId": "claude:claude-fable-5-1@xhigh",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 104544,
            "meanInputTokens": 2,
            "meanOutputTokens": 8098,
            "meanTotalTokens": 12008,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 166987,
            "meanInputTokens": 2,
            "meanOutputTokens": 11229,
            "meanTotalTokens": 19787,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-max",
          "configurationId": "codex:gpt-5.6-luna@max",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 87186,
            "meanInputTokens": 12926,
            "meanOutputTokens": 4631,
            "meanTotalTokens": 17557,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 360662,
            "meanInputTokens": 15764,
            "meanOutputTokens": 19757,
            "meanTotalTokens": 35521,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-medium",
          "configurationId": "codex:gpt-6-astra@medium",
          "baselineScore": 59,
          "treatmentScore": 49,
          "delta": -10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 24346,
            "meanInputTokens": 15235,
            "meanOutputTokens": 660,
            "meanTotalTokens": 15895,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 33428,
            "meanInputTokens": 18071,
            "meanOutputTokens": 949,
            "meanTotalTokens": 19020,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-low",
          "configurationId": "codex:gpt-5.6-terra@low",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 19093,
            "meanInputTokens": 14486,
            "meanOutputTokens": 519,
            "meanTotalTokens": 15005,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 20796,
            "meanInputTokens": 17322,
            "meanOutputTokens": 897,
            "meanTotalTokens": 18219,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-medium",
          "configurationId": "codex:gpt-5.6-sol@medium",
          "baselineScore": 58.1,
          "treatmentScore": 59,
          "delta": 0.9,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 25340,
            "meanInputTokens": 14359,
            "meanOutputTokens": 670,
            "meanTotalTokens": 15029,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 141039,
            "meanInputTokens": 17197,
            "meanOutputTokens": 3567,
            "meanTotalTokens": 20764,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-claude-fable-5-1-ultracode",
          "configurationId": "claude:claude-fable-5-1@ultracode",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 400603,
            "meanInputTokens": 4,
            "meanOutputTokens": 3444,
            "meanTotalTokens": 23376,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 477915,
            "meanInputTokens": 4,
            "meanOutputTokens": 3160,
            "meanTotalTokens": 35798,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-high",
          "configurationId": "codex:gpt-5.6-luna@high",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 18092,
            "meanInputTokens": 12803,
            "meanOutputTokens": 773,
            "meanTotalTokens": 13576,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 94264,
            "meanInputTokens": 15637,
            "meanOutputTokens": 5049,
            "meanTotalTokens": 20686,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-low",
          "configurationId": "codex:gpt-5.6-sol@low",
          "baselineScore": 59,
          "treatmentScore": 59,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 23079,
            "meanInputTokens": 14363,
            "meanOutputTokens": 670,
            "meanTotalTokens": 15033,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 40217,
            "meanInputTokens": 17197,
            "meanOutputTokens": 1003,
            "meanTotalTokens": 18200,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-xhigh",
          "configurationId": "codex:gpt-5.6-terra@xhigh",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 120093,
            "meanInputTokens": 14359,
            "meanOutputTokens": 5565,
            "meanTotalTokens": 19924,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 130990,
            "meanInputTokens": 17318,
            "meanOutputTokens": 7074,
            "meanTotalTokens": 24392,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-medium",
          "configurationId": "codex:gpt-5.6-terra@medium",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 14449,
            "meanInputTokens": 14361,
            "meanOutputTokens": 574,
            "meanTotalTokens": 14935,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 23682,
            "meanInputTokens": 17199,
            "meanOutputTokens": 949,
            "meanTotalTokens": 18148,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-low",
          "configurationId": "claude:opus@low",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 25194,
            "meanInputTokens": 2,
            "meanOutputTokens": 1418,
            "meanTotalTokens": 4276,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 37853,
            "meanInputTokens": 2,
            "meanOutputTokens": 2172,
            "meanTotalTokens": 9678,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-max",
          "configurationId": "claude:opus@max",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 68059,
            "meanInputTokens": 2,
            "meanOutputTokens": 4458,
            "meanTotalTokens": 7316,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 173888,
            "meanInputTokens": 2,
            "meanOutputTokens": 11108,
            "meanTotalTokens": 18614,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-medium",
          "configurationId": "codex:gpt-5.6-luna@medium",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 13409,
            "meanInputTokens": 12801,
            "meanOutputTokens": 458,
            "meanTotalTokens": 13259,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 30523,
            "meanInputTokens": 15639,
            "meanOutputTokens": 1472,
            "meanTotalTokens": 17111,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-low",
          "configurationId": "codex:gpt-5.6-luna@low",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 13314,
            "meanInputTokens": 12805,
            "meanOutputTokens": 504,
            "meanTotalTokens": 13309,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 19903,
            "meanInputTokens": 15637,
            "meanOutputTokens": 918,
            "meanTotalTokens": 16555,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-medium",
          "configurationId": "claude:opus@medium",
          "baselineScore": 59,
          "treatmentScore": 49,
          "delta": -10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 28327,
            "meanInputTokens": 2,
            "meanOutputTokens": 1735,
            "meanTotalTokens": 4593,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 45146,
            "meanInputTokens": 2,
            "meanOutputTokens": 2665,
            "meanTotalTokens": 10170,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-xhigh",
          "configurationId": "claude:opus@xhigh",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 63271,
            "meanInputTokens": 2,
            "meanOutputTokens": 4044,
            "meanTotalTokens": 6900,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 125609,
            "meanInputTokens": 2,
            "meanOutputTokens": 7975,
            "meanTotalTokens": 15480,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-low",
          "configurationId": "claude:fable@low",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 20245,
            "meanInputTokens": 2,
            "meanOutputTokens": 1004,
            "meanTotalTokens": 4210,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 23691,
            "meanInputTokens": 2,
            "meanOutputTokens": 1263,
            "meanTotalTokens": 9114,
            "costUsd": null
          }
        }
      ]
    },
    {
      "benchmarkId": "device-telemetry",
      "runId": "2026-09-04T22-33-50Z__rejudge__0995e097a929",
      "completedAt": "2026-09-04T22:38:31.176Z",
      "status": "development",
      "verification": "unverified",
      "blockers": [
        {
          "code": "author-calibration-pending",
          "message": "Author calibration is pending for all three development runs."
        },
        {
          "code": "panel-audit-required",
          "message": "Saved judging panels require independent audit before verified claims."
        },
        {
          "code": "public-eligibility-unverified",
          "message": "The shared public-result eligibility validator has not verified these development runs."
        }
      ],
      "judgingScope": {
        "strategy": "saved-responses-full-rescore-v1",
        "responseCount": 72,
        "generationReused": true,
        "sourceScoresPreserved": false
      },
      "baselineScore": 57.6,
      "treatmentScore": 73.6,
      "delta": 15.9,
      "record": {
        "wins": 22,
        "ties": 9,
        "losses": 5
      },
      "responseCount": 72,
      "matchedConfigurationCount": 36,
      "configurations": [
        {
          "settingId": "codex-gpt-6-astra-ultra",
          "configurationId": "codex:gpt-6-astra@ultra",
          "baselineScore": 49,
          "treatmentScore": 98.8,
          "delta": 49.8,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 130653,
            "meanInputTokens": 15360,
            "meanOutputTokens": 4226,
            "meanTotalTokens": 19586,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 110696,
            "meanInputTokens": 18196,
            "meanOutputTokens": 3551,
            "meanTotalTokens": 21747,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-xhigh",
          "configurationId": "codex:gpt-6-astra@xhigh",
          "baselineScore": 49,
          "treatmentScore": 97.5,
          "delta": 48.5,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 148017,
            "meanInputTokens": 15092,
            "meanOutputTokens": 4812,
            "meanTotalTokens": 19904,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 96279,
            "meanInputTokens": 18149,
            "meanOutputTokens": 2983,
            "meanTotalTokens": 21132,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-high",
          "configurationId": "codex:gpt-6-astra@high",
          "baselineScore": 49,
          "treatmentScore": 95,
          "delta": 46,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 65561,
            "meanInputTokens": 15090,
            "meanOutputTokens": 2063,
            "meanTotalTokens": 17153,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 53385,
            "meanInputTokens": 17930,
            "meanOutputTokens": 1635,
            "meanTotalTokens": 19565,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-low",
          "configurationId": "codex:gpt-6-astra@low",
          "baselineScore": 49,
          "treatmentScore": 95.6,
          "delta": 46.6,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 34858,
            "meanInputTokens": 15311,
            "meanOutputTokens": 1034,
            "meanTotalTokens": 16345,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 26330,
            "meanInputTokens": 18147,
            "meanOutputTokens": 697,
            "meanTotalTokens": 18844,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-max",
          "configurationId": "codex:gpt-6-astra@max",
          "baselineScore": 49,
          "treatmentScore": 88.8,
          "delta": 39.8,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 446682,
            "meanInputTokens": 15090,
            "meanOutputTokens": 11032,
            "meanTotalTokens": 26122,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 247425,
            "meanInputTokens": 17926,
            "meanOutputTokens": 8126,
            "meanTotalTokens": 26052,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-xhigh",
          "configurationId": "codex:gpt-5.6-sol@xhigh",
          "baselineScore": 49,
          "treatmentScore": 92.5,
          "delta": 43.5,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 281479,
            "meanInputTokens": 14435,
            "meanOutputTokens": 8683,
            "meanTotalTokens": 23118,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 246093,
            "meanInputTokens": 17271,
            "meanOutputTokens": 9304,
            "meanTotalTokens": 26575,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-max",
          "configurationId": "codex:gpt-5.6-sol@max",
          "baselineScore": 49,
          "treatmentScore": 98.8,
          "delta": 49.8,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 558071,
            "meanInputTokens": 14439,
            "meanOutputTokens": 16671,
            "meanTotalTokens": 31110,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 550640,
            "meanInputTokens": 17269,
            "meanOutputTokens": 18236,
            "meanTotalTokens": 35505,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-ultra",
          "configurationId": "codex:gpt-5.6-sol@ultra",
          "baselineScore": 82.5,
          "treatmentScore": 96.3,
          "delta": 13.8,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 351008,
            "meanInputTokens": 14446,
            "meanOutputTokens": 10964,
            "meanTotalTokens": 25410,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 340649,
            "meanInputTokens": 17284,
            "meanOutputTokens": 13449,
            "meanTotalTokens": 30733,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-ultra",
          "configurationId": "codex:gpt-5.6-terra@ultra",
          "baselineScore": 91.3,
          "treatmentScore": 93.1,
          "delta": 1.8,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 177594,
            "meanInputTokens": 14444,
            "meanOutputTokens": 9212,
            "meanTotalTokens": 23656,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 307095,
            "meanInputTokens": 17286,
            "meanOutputTokens": 16889,
            "meanTotalTokens": 34175,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-claude-fable-5-1-max",
          "configurationId": "claude:claude-fable-5-1@max",
          "baselineScore": 85.6,
          "treatmentScore": 97.5,
          "delta": 11.9,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 234283,
            "meanInputTokens": 2,
            "meanOutputTokens": 17269,
            "meanTotalTokens": 21295,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 243965,
            "meanInputTokens": 2,
            "meanOutputTokens": 18084,
            "meanTotalTokens": 26759,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-high",
          "configurationId": "codex:gpt-5.6-sol@high",
          "baselineScore": 49,
          "treatmentScore": 87.5,
          "delta": 38.5,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 202963,
            "meanInputTokens": 14435,
            "meanOutputTokens": 6228,
            "meanTotalTokens": 20663,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 147962,
            "meanInputTokens": 17271,
            "meanOutputTokens": 3574,
            "meanTotalTokens": 20845,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-high",
          "configurationId": "claude:fable@high",
          "baselineScore": 49,
          "treatmentScore": 84.4,
          "delta": 35.4,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 39542,
            "meanInputTokens": 2,
            "meanOutputTokens": 2409,
            "meanTotalTokens": 5729,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 46818,
            "meanInputTokens": 2,
            "meanOutputTokens": 3114,
            "meanTotalTokens": 11083,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-high",
          "configurationId": "claude:opus@high",
          "baselineScore": 88.8,
          "treatmentScore": 92.5,
          "delta": 3.7,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 61702,
            "meanInputTokens": 2,
            "meanOutputTokens": 4054,
            "meanTotalTokens": 7028,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 150110,
            "meanInputTokens": 2,
            "meanOutputTokens": 9811,
            "meanTotalTokens": 17433,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-max",
          "configurationId": "claude:fable@max",
          "baselineScore": 49,
          "treatmentScore": 92.5,
          "delta": 43.5,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 110405,
            "meanInputTokens": 2,
            "meanOutputTokens": 7821,
            "meanTotalTokens": 11141,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 99183,
            "meanInputTokens": 2,
            "meanOutputTokens": 6809,
            "meanTotalTokens": 14776,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-max",
          "configurationId": "codex:gpt-5.6-terra@max",
          "baselineScore": 49,
          "treatmentScore": 91.3,
          "delta": 42.3,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 169466,
            "meanInputTokens": 14435,
            "meanOutputTokens": 9222,
            "meanTotalTokens": 23657,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 283375,
            "meanInputTokens": 17275,
            "meanOutputTokens": 15565,
            "meanTotalTokens": 32840,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-xhigh",
          "configurationId": "codex:gpt-5.6-luna@xhigh",
          "baselineScore": 49,
          "treatmentScore": 80,
          "delta": 31,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 247131,
            "meanInputTokens": 12879,
            "meanOutputTokens": 13386,
            "meanTotalTokens": 26265,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 418442,
            "meanInputTokens": 15507,
            "meanOutputTokens": 23084,
            "meanTotalTokens": 38591,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-medium",
          "configurationId": "claude:fable@medium",
          "baselineScore": 49,
          "treatmentScore": 88.1,
          "delta": 39.1,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 29205,
            "meanInputTokens": 2,
            "meanOutputTokens": 1774,
            "meanTotalTokens": 5094,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 33155,
            "meanInputTokens": 2,
            "meanOutputTokens": 2072,
            "meanTotalTokens": 10040,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-xhigh",
          "configurationId": "claude:fable@xhigh",
          "baselineScore": 76.9,
          "treatmentScore": 91.9,
          "delta": 15,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 42022,
            "meanInputTokens": 2,
            "meanOutputTokens": 2655,
            "meanTotalTokens": 5974,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 65292,
            "meanInputTokens": 2,
            "meanOutputTokens": 4469,
            "meanTotalTokens": 12437,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-high",
          "configurationId": "codex:gpt-5.6-terra@high",
          "baselineScore": 49,
          "treatmentScore": 81.9,
          "delta": 32.9,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 23016,
            "meanInputTokens": 14437,
            "meanOutputTokens": 869,
            "meanTotalTokens": 15306,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 19597,
            "meanInputTokens": 17271,
            "meanOutputTokens": 853,
            "meanTotalTokens": 18124,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-claude-fable-5-1-xhigh",
          "configurationId": "claude:claude-fable-5-1@xhigh",
          "baselineScore": 59,
          "treatmentScore": 90.6,
          "delta": 31.6,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 134554,
            "meanInputTokens": 2,
            "meanOutputTokens": 9577,
            "meanTotalTokens": 13603,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 136076,
            "meanInputTokens": 2,
            "meanOutputTokens": 10004,
            "meanTotalTokens": 18677,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-max",
          "configurationId": "codex:gpt-5.6-luna@max",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 383866,
            "meanInputTokens": 12875,
            "meanOutputTokens": 21145,
            "meanTotalTokens": 34020,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 373791,
            "meanInputTokens": 15713,
            "meanOutputTokens": 20595,
            "meanTotalTokens": 36308,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-6-astra-medium",
          "configurationId": "codex:gpt-6-astra@medium",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 44173,
            "meanInputTokens": 15313,
            "meanOutputTokens": 1318,
            "meanTotalTokens": 16631,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 33668,
            "meanInputTokens": 18149,
            "meanOutputTokens": 949,
            "meanTotalTokens": 19098,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-low",
          "configurationId": "codex:gpt-5.6-terra@low",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 10367,
            "meanInputTokens": 14435,
            "meanOutputTokens": 368,
            "meanTotalTokens": 14803,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 19496,
            "meanInputTokens": 17271,
            "meanOutputTokens": 876,
            "meanTotalTokens": 18147,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-medium",
          "configurationId": "codex:gpt-5.6-sol@medium",
          "baselineScore": 83.1,
          "treatmentScore": 49,
          "delta": -34.1,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 71569,
            "meanInputTokens": 14439,
            "meanOutputTokens": 2083,
            "meanTotalTokens": 16522,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 107024,
            "meanInputTokens": 17275,
            "meanOutputTokens": 2566,
            "meanTotalTokens": 19841,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-claude-fable-5-1-ultracode",
          "configurationId": "claude:claude-fable-5-1@ultracode",
          "baselineScore": 86.3,
          "treatmentScore": 59,
          "delta": -27.3,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 419662,
            "meanInputTokens": 4,
            "meanOutputTokens": 5837,
            "meanTotalTokens": 25707,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 395169,
            "meanInputTokens": 4,
            "meanOutputTokens": 1699,
            "meanTotalTokens": 34781,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-high",
          "configurationId": "codex:gpt-5.6-luna@high",
          "baselineScore": 78.8,
          "treatmentScore": 49,
          "delta": -29.8,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 102865,
            "meanInputTokens": 12877,
            "meanOutputTokens": 5586,
            "meanTotalTokens": 18463,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 85955,
            "meanInputTokens": 15715,
            "meanOutputTokens": 4644,
            "meanTotalTokens": 20359,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-sol-low",
          "configurationId": "codex:gpt-5.6-sol@low",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 40950,
            "meanInputTokens": 14435,
            "meanOutputTokens": 950,
            "meanTotalTokens": 15385,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 72670,
            "meanInputTokens": 17271,
            "meanOutputTokens": 1758,
            "meanTotalTokens": 19029,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-xhigh",
          "configurationId": "codex:gpt-5.6-terra@xhigh",
          "baselineScore": 49,
          "treatmentScore": 59,
          "delta": 10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 21280,
            "meanInputTokens": 14435,
            "meanOutputTokens": 946,
            "meanTotalTokens": 15381,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 51063,
            "meanInputTokens": 17271,
            "meanOutputTokens": 2513,
            "meanTotalTokens": 19784,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-terra-medium",
          "configurationId": "codex:gpt-5.6-terra@medium",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 10160,
            "meanInputTokens": 14437,
            "meanOutputTokens": 368,
            "meanTotalTokens": 14805,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 19750,
            "meanInputTokens": 17271,
            "meanOutputTokens": 863,
            "meanTotalTokens": 18134,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-low",
          "configurationId": "claude:opus@low",
          "baselineScore": 59,
          "treatmentScore": 49,
          "delta": -10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 24135,
            "meanInputTokens": 2,
            "meanOutputTokens": 1538,
            "meanTotalTokens": 4512,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 40271,
            "meanInputTokens": 2,
            "meanOutputTokens": 2517,
            "meanTotalTokens": 10138,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-max",
          "configurationId": "claude:opus@max",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 154780,
            "meanInputTokens": 2,
            "meanOutputTokens": 10487,
            "meanTotalTokens": 13461,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 429506,
            "meanInputTokens": 4,
            "meanOutputTokens": 12292,
            "meanTotalTokens": 27536,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-medium",
          "configurationId": "codex:gpt-5.6-luna@medium",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 17651,
            "meanInputTokens": 12879,
            "meanOutputTokens": 833,
            "meanTotalTokens": 13712,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 21022,
            "meanInputTokens": 15713,
            "meanOutputTokens": 962,
            "meanTotalTokens": 16675,
            "costUsd": null
          }
        },
        {
          "settingId": "codex-gpt-5-6-luna-low",
          "configurationId": "codex:gpt-5.6-luna@low",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 16044,
            "meanInputTokens": 12877,
            "meanOutputTokens": 747,
            "meanTotalTokens": 13624,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 16861,
            "meanInputTokens": 15715,
            "meanOutputTokens": 793,
            "meanTotalTokens": 16508,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-medium",
          "configurationId": "claude:opus@medium",
          "baselineScore": 59,
          "treatmentScore": 49,
          "delta": -10,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 50102,
            "meanInputTokens": 2,
            "meanOutputTokens": 3197,
            "meanTotalTokens": 6169,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 46697,
            "meanInputTokens": 2,
            "meanOutputTokens": 2936,
            "meanTotalTokens": 10558,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-opus-xhigh",
          "configurationId": "claude:opus@xhigh",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 82092,
            "meanInputTokens": 2,
            "meanOutputTokens": 5602,
            "meanTotalTokens": 8575,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 184148,
            "meanInputTokens": 2,
            "meanOutputTokens": 12243,
            "meanTotalTokens": 19865,
            "costUsd": null
          }
        },
        {
          "settingId": "claude-fable-low",
          "configurationId": "claude:fable@low",
          "baselineScore": 49,
          "treatmentScore": 49,
          "delta": 0,
          "baselineMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 18151,
            "meanInputTokens": 2,
            "meanOutputTokens": 981,
            "meanTotalTokens": 4300,
            "costUsd": null
          },
          "skillMetrics": {
            "sampleCount": 1,
            "meanLatencyMs": 21454,
            "meanInputTokens": 2,
            "meanOutputTokens": 1175,
            "meanTotalTokens": 9143,
            "costUsd": null
          }
        }
      ]
    }
  ],
  "settings": [
    {
      "id": "codex-gpt-6-astra-ultra",
      "configurationId": "codex:gpt-6-astra@ultra",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "ultra",
      "label": "GPT-6 Astra · ultra",
      "scores": {
        "baseline": 52.3,
        "skill": 79.5
      },
      "deltas": {
        "skill": 27.1
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 52.3
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 79.5
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 96956,
          "meanInputTokens": 15210.7,
          "meanOutputTokens": 3100.7,
          "meanTotalTokens": 18311.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 101128,
          "meanInputTokens": 17971,
          "meanOutputTokens": 3242,
          "meanTotalTokens": 21213,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-6-astra-xhigh",
      "configurationId": "codex:gpt-6-astra@xhigh",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "xhigh",
      "label": "GPT-6 Astra · xhigh",
      "scores": {
        "baseline": 53.5,
        "skill": 79
      },
      "deltas": {
        "skill": 25.5
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 53.5
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 79
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 104184,
          "meanInputTokens": 15088.7,
          "meanOutputTokens": 3337.3,
          "meanTotalTokens": 18426,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 108656,
          "meanInputTokens": 17924.7,
          "meanOutputTokens": 3339.3,
          "meanTotalTokens": 21264,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-6-astra-high",
      "configurationId": "codex:gpt-6-astra@high",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "high",
      "label": "GPT-6 Astra · high",
      "scores": {
        "baseline": 55.7,
        "skill": 78.8
      },
      "deltas": {
        "skill": 23.2
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 55.7
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 78.8
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 45803,
          "meanInputTokens": 15088.7,
          "meanOutputTokens": 1364,
          "meanTotalTokens": 16452.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 46610.7,
          "meanInputTokens": 17853,
          "meanOutputTokens": 1396,
          "meanTotalTokens": 19249,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-6-astra-low",
      "configurationId": "codex:gpt-6-astra@low",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "low",
      "label": "GPT-6 Astra · low",
      "scores": {
        "baseline": 52.3,
        "skill": 78
      },
      "deltas": {
        "skill": 25.7
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 52.3
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 78
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 25662.7,
          "meanInputTokens": 15236,
          "meanOutputTokens": 714,
          "meanTotalTokens": 15950,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 26142.3,
          "meanInputTokens": 18072,
          "meanOutputTokens": 696.7,
          "meanTotalTokens": 18768.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-6-astra-max",
      "configurationId": "codex:gpt-6-astra@max",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "max",
      "label": "GPT-6 Astra · max",
      "scores": {
        "baseline": 55.7,
        "skill": 76.8
      },
      "deltas": {
        "skill": 21.1
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 55.7
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 76.8
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 255698.3,
          "meanInputTokens": 15089.3,
          "meanOutputTokens": 7148,
          "meanTotalTokens": 22237.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 287311,
          "meanInputTokens": 17924.7,
          "meanOutputTokens": 9427.3,
          "meanTotalTokens": 27352,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-sol-xhigh",
      "configurationId": "codex:gpt-5.6-sol@xhigh",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "xhigh",
      "label": "GPT-5.6 Sol · xhigh",
      "scores": {
        "baseline": 52.3,
        "skill": 75.5
      },
      "deltas": {
        "skill": 23.2
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 52.3
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 75.5
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 130317,
          "meanInputTokens": 14401.7,
          "meanOutputTokens": 4136,
          "meanTotalTokens": 18537.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 197031.7,
          "meanInputTokens": 17196,
          "meanOutputTokens": 6862.7,
          "meanTotalTokens": 24058.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-sol-max",
      "configurationId": "codex:gpt-5.6-sol@max",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "max",
      "label": "GPT-5.6 Sol · max",
      "scores": {
        "baseline": 48.3,
        "skill": 72.3
      },
      "deltas": {
        "skill": 24
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 48.3
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 72.3
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 250821.3,
          "meanInputTokens": 14362.7,
          "meanOutputTokens": 8275,
          "meanTotalTokens": 22637.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 446965.7,
          "meanInputTokens": 17236.3,
          "meanOutputTokens": 15016.7,
          "meanTotalTokens": 32253,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-sol-ultra",
      "configurationId": "codex:gpt-5.6-sol@ultra",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "ultra",
      "label": "GPT-5.6 Sol · ultra",
      "scores": {
        "baseline": 66.8,
        "skill": 71.4
      },
      "deltas": {
        "skill": 4.6
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 66.8
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 71.4
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 258229.7,
          "meanInputTokens": 14370.3,
          "meanOutputTokens": 7909.3,
          "meanTotalTokens": 22279.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 288289.7,
          "meanInputTokens": 17249.3,
          "meanOutputTokens": 11161.7,
          "meanTotalTokens": 28411,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-terra-ultra",
      "configurationId": "codex:gpt-5.6-terra@ultra",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "ultra",
      "label": "GPT-5.6 Terra · ultra",
      "scores": {
        "baseline": 63.2,
        "skill": 70.4
      },
      "deltas": {
        "skill": 7.1
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 63.2
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 70.4
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 75231.3,
          "meanInputTokens": 14453,
          "meanOutputTokens": 3689.7,
          "meanTotalTokens": 18142.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 237040.3,
          "meanInputTokens": 17249.3,
          "meanOutputTokens": 12930.7,
          "meanTotalTokens": 30180,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-claude-fable-5-1-max",
      "configurationId": "claude:claude-fable-5-1@max",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "max",
      "label": "Claude Fable 5.1 · max",
      "scores": {
        "baseline": 63,
        "skill": 68.5
      },
      "deltas": {
        "skill": 5.5
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 63
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 68.5
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 175004.3,
          "meanInputTokens": 2,
          "meanOutputTokens": 12961.3,
          "meanTotalTokens": 16869,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 268504,
          "meanInputTokens": 2,
          "meanOutputTokens": 19610,
          "meanTotalTokens": 28166,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-sol-high",
      "configurationId": "codex:gpt-5.6-sol@high",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "high",
      "label": "GPT-5.6 Sol · high",
      "scores": {
        "baseline": 46,
        "skill": 68.5
      },
      "deltas": {
        "skill": 22.5
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 46
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 68.5
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 91739.3,
          "meanInputTokens": 14401.7,
          "meanOutputTokens": 2748.3,
          "meanTotalTokens": 17150,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 111752.7,
          "meanInputTokens": 17196.7,
          "meanOutputTokens": 3042.7,
          "meanTotalTokens": 20239.3,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-fable-high",
      "configurationId": "claude:fable@high",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "high",
      "label": "Claude Fable 5 · high",
      "scores": {
        "baseline": 47.9,
        "skill": 67.5
      },
      "deltas": {
        "skill": 19.6
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 47.9
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 67.5
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 26723.7,
          "meanInputTokens": 2,
          "meanOutputTokens": 1540.7,
          "meanTotalTokens": 4742.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 43025.3,
          "meanInputTokens": 2,
          "meanOutputTokens": 2675,
          "meanTotalTokens": 10524.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-opus-high",
      "configurationId": "claude:opus@high",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "high",
      "label": "Claude Opus 5 · high",
      "scores": {
        "baseline": 65.6,
        "skill": 66.8
      },
      "deltas": {
        "skill": 1.2
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 65.6
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 66.8
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 47121.7,
          "meanInputTokens": 2,
          "meanOutputTokens": 2851.3,
          "meanTotalTokens": 5707,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 97515,
          "meanInputTokens": 2,
          "meanOutputTokens": 6207.3,
          "meanTotalTokens": 13710.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-fable-max",
      "configurationId": "claude:fable@max",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "max",
      "label": "Claude Fable 5 · max",
      "scores": {
        "baseline": 46.2,
        "skill": 66.8
      },
      "deltas": {
        "skill": 20.6
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 46.2
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 66.8
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 68524.3,
          "meanInputTokens": 2,
          "meanOutputTokens": 4633.7,
          "meanTotalTokens": 7834.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 82097,
          "meanInputTokens": 2,
          "meanOutputTokens": 5379.3,
          "meanTotalTokens": 13228.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-terra-max",
      "configurationId": "codex:gpt-5.6-terra@max",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "max",
      "label": "GPT-5.6 Terra · max",
      "scores": {
        "baseline": 48.3,
        "skill": 66.4
      },
      "deltas": {
        "skill": 18.1
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 48.3
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 66.4
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 103314.3,
          "meanInputTokens": 14402.3,
          "meanOutputTokens": 5415.7,
          "meanTotalTokens": 19818,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 262429.3,
          "meanInputTokens": 17281.3,
          "meanOutputTokens": 14270,
          "meanTotalTokens": 31551.3,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-luna-xhigh",
      "configurationId": "codex:gpt-5.6-luna@xhigh",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "xhigh",
      "label": "GPT-5.6 Luna · xhigh",
      "scores": {
        "baseline": 44.1,
        "skill": 66
      },
      "deltas": {
        "skill": 21.9
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 44.1
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 66
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 107362,
          "meanInputTokens": 12844.3,
          "meanOutputTokens": 5552.7,
          "meanTotalTokens": 18397,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 208582.3,
          "meanInputTokens": 15612.3,
          "meanOutputTokens": 11258,
          "meanTotalTokens": 26870.3,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-fable-medium",
      "configurationId": "claude:fable@medium",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "medium",
      "label": "Claude Fable 5 · medium",
      "scores": {
        "baseline": 47.5,
        "skill": 65.4
      },
      "deltas": {
        "skill": 17.9
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 47.5
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 65.4
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 23334.3,
          "meanInputTokens": 2,
          "meanOutputTokens": 1267.7,
          "meanTotalTokens": 4468.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 30954.7,
          "meanInputTokens": 2,
          "meanOutputTokens": 1747.3,
          "meanTotalTokens": 9596,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-fable-xhigh",
      "configurationId": "claude:fable@xhigh",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "xhigh",
      "label": "Claude Fable 5 · xhigh",
      "scores": {
        "baseline": 55.5,
        "skill": 63.3
      },
      "deltas": {
        "skill": 7.8
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 55.5
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 63.3
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 32122,
          "meanInputTokens": 2,
          "meanOutputTokens": 1836,
          "meanTotalTokens": 5037.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 58272,
          "meanInputTokens": 2,
          "meanOutputTokens": 3808.3,
          "meanTotalTokens": 11657.3,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-terra-high",
      "configurationId": "codex:gpt-5.6-terra@high",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "high",
      "label": "GPT-5.6 Terra · high",
      "scores": {
        "baseline": 44.5,
        "skill": 63.3
      },
      "deltas": {
        "skill": 18.8
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 44.5
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 63.3
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 16293,
          "meanInputTokens": 14444.7,
          "meanOutputTokens": 547,
          "meanTotalTokens": 14991.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 28757.3,
          "meanInputTokens": 17237.7,
          "meanOutputTokens": 1242.3,
          "meanTotalTokens": 18480,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-claude-fable-5-1-xhigh",
      "configurationId": "claude:claude-fable-5-1@xhigh",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "xhigh",
      "label": "Claude Fable 5.1 · xhigh",
      "scores": {
        "baseline": 48.9,
        "skill": 62.9
      },
      "deltas": {
        "skill": 13.9
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 48.9
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 62.9
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 94631.3,
          "meanInputTokens": 2,
          "meanOutputTokens": 6967.7,
          "meanTotalTokens": 10874.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 148184.7,
          "meanInputTokens": 2,
          "meanOutputTokens": 10357.7,
          "meanTotalTokens": 18912.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-luna-max",
      "configurationId": "codex:gpt-5.6-luna@max",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "max",
      "label": "GPT-5.6 Luna · max",
      "scores": {
        "baseline": 51,
        "skill": 61
      },
      "deltas": {
        "skill": 10
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 51
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 61
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 169169,
          "meanInputTokens": 12884,
          "meanOutputTokens": 9056,
          "meanTotalTokens": 21940,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 345574,
          "meanInputTokens": 15722,
          "meanOutputTokens": 18902.7,
          "meanTotalTokens": 34624.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-6-astra-medium",
      "configurationId": "codex:gpt-6-astra@medium",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "medium",
      "label": "GPT-6 Astra · medium",
      "scores": {
        "baseline": 55.7,
        "skill": 60.4
      },
      "deltas": {
        "skill": 4.7
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 55.7
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 60.4
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 29164.7,
          "meanInputTokens": 15237.3,
          "meanOutputTokens": 816.3,
          "meanTotalTokens": 16053.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 30394.3,
          "meanInputTokens": 18073.3,
          "meanOutputTokens": 856.7,
          "meanTotalTokens": 18930,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-terra-low",
      "configurationId": "codex:gpt-5.6-terra@low",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "low",
      "label": "GPT-5.6 Terra · low",
      "scores": {
        "baseline": 44.5,
        "skill": 59
      },
      "deltas": {
        "skill": 14.5
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 44.5
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 59
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 13211,
          "meanInputTokens": 14402.3,
          "meanOutputTokens": 392,
          "meanTotalTokens": 14794.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 17678,
          "meanInputTokens": 17237.7,
          "meanOutputTokens": 767.7,
          "meanTotalTokens": 18005.3,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "medium",
      "label": "GPT-5.6 Sol · medium",
      "scores": {
        "baseline": 65.6,
        "skill": 55.7
      },
      "deltas": {
        "skill": -9.9
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 65.6
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 55.7
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 38685.3,
          "meanInputTokens": 14360.7,
          "meanOutputTokens": 1059.3,
          "meanTotalTokens": 15420,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 93381.3,
          "meanInputTokens": 17198,
          "meanOutputTokens": 2329.3,
          "meanTotalTokens": 19527.3,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "ultracode",
      "label": "Claude Fable 5.1 · ultracode",
      "scores": {
        "baseline": 61.4,
        "skill": 55.7
      },
      "deltas": {
        "skill": -5.8
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 61.4
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 55.7
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 366755.3,
          "meanInputTokens": 4,
          "meanOutputTokens": 3770.7,
          "meanTotalTokens": 23410.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 438164,
          "meanInputTokens": 4,
          "meanOutputTokens": 2202.3,
          "meanTotalTokens": 32767,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-luna-high",
      "configurationId": "codex:gpt-5.6-luna@high",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "high",
      "label": "GPT-5.6 Luna · high",
      "scores": {
        "baseline": 53.4,
        "skill": 55.7
      },
      "deltas": {
        "skill": 2.2
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 53.4
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 55.7
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 46710,
          "meanInputTokens": 12844.3,
          "meanOutputTokens": 2267,
          "meanTotalTokens": 15111.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 101758,
          "meanInputTokens": 15680.3,
          "meanOutputTokens": 5302.7,
          "meanTotalTokens": 20983,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-sol-low",
      "configurationId": "codex:gpt-5.6-sol@low",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "low",
      "label": "GPT-5.6 Sol · low",
      "scores": {
        "baseline": 47.9,
        "skill": 55.7
      },
      "deltas": {
        "skill": 7.8
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 47.9
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 55.7
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 27354.7,
          "meanInputTokens": 14362,
          "meanOutputTokens": 661.3,
          "meanTotalTokens": 15023.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 50195.7,
          "meanInputTokens": 17196.7,
          "meanOutputTokens": 1187.3,
          "meanTotalTokens": 18384,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-terra-xhigh",
      "configurationId": "codex:gpt-5.6-terra@xhigh",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "xhigh",
      "label": "GPT-5.6 Terra · xhigh",
      "scores": {
        "baseline": 45.2,
        "skill": 55.7
      },
      "deltas": {
        "skill": 10.5
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 45.2
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 55.7
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 53515.7,
          "meanInputTokens": 14401.7,
          "meanOutputTokens": 2413,
          "meanTotalTokens": 16814.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 76572,
          "meanInputTokens": 17237,
          "meanOutputTokens": 3982,
          "meanTotalTokens": 21219,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-terra-medium",
      "configurationId": "codex:gpt-5.6-terra@medium",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "medium",
      "label": "GPT-5.6 Terra · medium",
      "scores": {
        "baseline": 45,
        "skill": 55.7
      },
      "deltas": {
        "skill": 10.7
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 45
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 55.7
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 12135,
          "meanInputTokens": 14360.7,
          "meanOutputTokens": 434.7,
          "meanTotalTokens": 14795.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 21157.3,
          "meanInputTokens": 17196.7,
          "meanOutputTokens": 882.7,
          "meanTotalTokens": 18079.3,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-opus-low",
      "configurationId": "claude:opus@low",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "low",
      "label": "Claude Opus 5 · low",
      "scores": {
        "baseline": 51,
        "skill": 52.3
      },
      "deltas": {
        "skill": 1.3
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 51
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 52.3
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 23205.7,
          "meanInputTokens": 2,
          "meanOutputTokens": 1361.3,
          "meanTotalTokens": 4216.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 35610.7,
          "meanInputTokens": 2,
          "meanOutputTokens": 2050,
          "meanTotalTokens": 9553.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-opus-max",
      "configurationId": "claude:opus@max",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "max",
      "label": "Claude Opus 5 · max",
      "scores": {
        "baseline": 49,
        "skill": 52.3
      },
      "deltas": {
        "skill": 3.3
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 49
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 52.3
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 91872,
          "meanInputTokens": 2,
          "meanOutputTokens": 6069.7,
          "meanTotalTokens": 8925,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 247377.3,
          "meanInputTokens": 2.7,
          "meanOutputTokens": 10756.7,
          "meanTotalTokens": 20800.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-luna-medium",
      "configurationId": "codex:gpt-5.6-luna@medium",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "medium",
      "label": "GPT-5.6 Luna · medium",
      "scores": {
        "baseline": 47.3,
        "skill": 52.3
      },
      "deltas": {
        "skill": 5.1
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 47.3
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 52.3
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 15492,
          "meanInputTokens": 12844.3,
          "meanOutputTokens": 565.3,
          "meanTotalTokens": 13409.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 24402.3,
          "meanInputTokens": 15680.3,
          "meanOutputTokens": 1061.3,
          "meanTotalTokens": 16741.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "codex-gpt-5-6-luna-low",
      "configurationId": "codex:gpt-5.6-luna@low",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "low",
      "label": "GPT-5.6 Luna · low",
      "scores": {
        "baseline": 45.8,
        "skill": 52.3
      },
      "deltas": {
        "skill": 6.5
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 45.8
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 52.3
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 15173.3,
          "meanInputTokens": 12845,
          "meanOutputTokens": 559.3,
          "meanTotalTokens": 13404.3,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 19410,
          "meanInputTokens": 15680.3,
          "meanOutputTokens": 757.3,
          "meanTotalTokens": 16437.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "medium",
      "label": "Claude Opus 5 · medium",
      "scores": {
        "baseline": 55,
        "skill": 49
      },
      "deltas": {
        "skill": -6
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 55
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 49
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 34019,
          "meanInputTokens": 2,
          "meanOutputTokens": 2096.3,
          "meanTotalTokens": 4950.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 48863.7,
          "meanInputTokens": 2,
          "meanOutputTokens": 2964,
          "meanTotalTokens": 10467,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "xhigh",
      "label": "Claude Opus 5 · xhigh",
      "scores": {
        "baseline": 49.8,
        "skill": 49
      },
      "deltas": {
        "skill": -0.8
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 49.8
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 49
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 66847.3,
          "meanInputTokens": 2,
          "meanOutputTokens": 4220.3,
          "meanTotalTokens": 7074.7,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 134076.7,
          "meanInputTokens": 2,
          "meanOutputTokens": 8684.7,
          "meanTotalTokens": 16187.7,
          "costUsd": null
        }
      }
    },
    {
      "id": "claude-fable-low",
      "configurationId": "claude:fable@low",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "low",
      "label": "Claude Fable 5 · low",
      "scores": {
        "baseline": 48.3,
        "skill": 49
      },
      "deltas": {
        "skill": 0.7
      },
      "categories": {
        "baseline": [
          {
            "category": "engineering",
            "score": 48.3
          }
        ],
        "skill": [
          {
            "category": "engineering",
            "score": 49
          }
        ]
      },
      "metrics": {
        "baseline": {
          "sampleCount": 3,
          "meanLatencyMs": 19017.3,
          "meanInputTokens": 2,
          "meanOutputTokens": 918,
          "meanTotalTokens": 4120,
          "costUsd": null
        },
        "skill": {
          "sampleCount": 3,
          "meanLatencyMs": 22327.7,
          "meanInputTokens": 2,
          "meanOutputTokens": 1136,
          "meanTotalTokens": 8985.3,
          "costUsd": null
        }
      }
    }
  ],
  "entries": [
    {
      "id": "codex-gpt-6-astra-ultra-skill",
      "settingId": "codex-gpt-6-astra-ultra",
      "configurationId": "codex:gpt-6-astra@ultra",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "ultra",
      "label": "GPT-6 Astra · ultra",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 79.5,
      "baselineScore": 52.3,
      "delta": 27.1,
      "categories": [
        {
          "category": "engineering",
          "score": 79.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "cost": null,
      "latency": 101.128,
      "tokens": 3242,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 101128,
        "meanInputTokens": 17971,
        "meanOutputTokens": 3242,
        "meanTotalTokens": 21213,
        "costUsd": null
      },
      "rank": 1
    },
    {
      "id": "codex-gpt-6-astra-xhigh-skill",
      "settingId": "codex-gpt-6-astra-xhigh",
      "configurationId": "codex:gpt-6-astra@xhigh",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "xhigh",
      "label": "GPT-6 Astra · xhigh",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 79,
      "baselineScore": 53.5,
      "delta": 25.5,
      "categories": [
        {
          "category": "engineering",
          "score": 79
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 53.5
        }
      ],
      "cost": null,
      "latency": 108.656,
      "tokens": 3339.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 108656,
        "meanInputTokens": 17924.7,
        "meanOutputTokens": 3339.3,
        "meanTotalTokens": 21264,
        "costUsd": null
      },
      "rank": 2
    },
    {
      "id": "codex-gpt-6-astra-high-skill",
      "settingId": "codex-gpt-6-astra-high",
      "configurationId": "codex:gpt-6-astra@high",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "high",
      "label": "GPT-6 Astra · high",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 78.8,
      "baselineScore": 55.7,
      "delta": 23.2,
      "categories": [
        {
          "category": "engineering",
          "score": 78.8
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "cost": null,
      "latency": 46.611,
      "tokens": 1396,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 46610.7,
        "meanInputTokens": 17853,
        "meanOutputTokens": 1396,
        "meanTotalTokens": 19249,
        "costUsd": null
      },
      "rank": 3
    },
    {
      "id": "codex-gpt-6-astra-low-skill",
      "settingId": "codex-gpt-6-astra-low",
      "configurationId": "codex:gpt-6-astra@low",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "low",
      "label": "GPT-6 Astra · low",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 78,
      "baselineScore": 52.3,
      "delta": 25.7,
      "categories": [
        {
          "category": "engineering",
          "score": 78
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "cost": null,
      "latency": 26.142,
      "tokens": 696.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 26142.3,
        "meanInputTokens": 18072,
        "meanOutputTokens": 696.7,
        "meanTotalTokens": 18768.7,
        "costUsd": null
      },
      "rank": 4
    },
    {
      "id": "codex-gpt-6-astra-max-skill",
      "settingId": "codex-gpt-6-astra-max",
      "configurationId": "codex:gpt-6-astra@max",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "max",
      "label": "GPT-6 Astra · max",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 76.8,
      "baselineScore": 55.7,
      "delta": 21.1,
      "categories": [
        {
          "category": "engineering",
          "score": 76.8
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "cost": null,
      "latency": 287.311,
      "tokens": 9427.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 287311,
        "meanInputTokens": 17924.7,
        "meanOutputTokens": 9427.3,
        "meanTotalTokens": 27352,
        "costUsd": null
      },
      "rank": 5
    },
    {
      "id": "codex-gpt-5-6-sol-xhigh-skill",
      "settingId": "codex-gpt-5-6-sol-xhigh",
      "configurationId": "codex:gpt-5.6-sol@xhigh",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "xhigh",
      "label": "GPT-5.6 Sol · xhigh",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 75.5,
      "baselineScore": 52.3,
      "delta": 23.2,
      "categories": [
        {
          "category": "engineering",
          "score": 75.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "cost": null,
      "latency": 197.032,
      "tokens": 6862.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 197031.7,
        "meanInputTokens": 17196,
        "meanOutputTokens": 6862.7,
        "meanTotalTokens": 24058.7,
        "costUsd": null
      },
      "rank": 6
    },
    {
      "id": "codex-gpt-5-6-sol-max-skill",
      "settingId": "codex-gpt-5-6-sol-max",
      "configurationId": "codex:gpt-5.6-sol@max",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "max",
      "label": "GPT-5.6 Sol · max",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 72.3,
      "baselineScore": 48.3,
      "delta": 24,
      "categories": [
        {
          "category": "engineering",
          "score": 72.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 48.3
        }
      ],
      "cost": null,
      "latency": 446.966,
      "tokens": 15016.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 446965.7,
        "meanInputTokens": 17236.3,
        "meanOutputTokens": 15016.7,
        "meanTotalTokens": 32253,
        "costUsd": null
      },
      "rank": 7
    },
    {
      "id": "codex-gpt-5-6-sol-ultra-skill",
      "settingId": "codex-gpt-5-6-sol-ultra",
      "configurationId": "codex:gpt-5.6-sol@ultra",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "ultra",
      "label": "GPT-5.6 Sol · ultra",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 71.4,
      "baselineScore": 66.8,
      "delta": 4.6,
      "categories": [
        {
          "category": "engineering",
          "score": 71.4
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 66.8
        }
      ],
      "cost": null,
      "latency": 288.29,
      "tokens": 11161.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 288289.7,
        "meanInputTokens": 17249.3,
        "meanOutputTokens": 11161.7,
        "meanTotalTokens": 28411,
        "costUsd": null
      },
      "rank": 8
    },
    {
      "id": "codex-gpt-5-6-terra-ultra-skill",
      "settingId": "codex-gpt-5-6-terra-ultra",
      "configurationId": "codex:gpt-5.6-terra@ultra",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "ultra",
      "label": "GPT-5.6 Terra · ultra",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 70.4,
      "baselineScore": 63.2,
      "delta": 7.1,
      "categories": [
        {
          "category": "engineering",
          "score": 70.4
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 63.2
        }
      ],
      "cost": null,
      "latency": 237.04,
      "tokens": 12930.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 237040.3,
        "meanInputTokens": 17249.3,
        "meanOutputTokens": 12930.7,
        "meanTotalTokens": 30180,
        "costUsd": null
      },
      "rank": 9
    },
    {
      "id": "claude-claude-fable-5-1-max-skill",
      "settingId": "claude-claude-fable-5-1-max",
      "configurationId": "claude:claude-fable-5-1@max",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "max",
      "label": "Claude Fable 5.1 · max",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 68.5,
      "baselineScore": 63,
      "delta": 5.5,
      "categories": [
        {
          "category": "engineering",
          "score": 68.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 63
        }
      ],
      "cost": null,
      "latency": 268.504,
      "tokens": 19610,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 268504,
        "meanInputTokens": 2,
        "meanOutputTokens": 19610,
        "meanTotalTokens": 28166,
        "costUsd": null
      },
      "rank": 10
    },
    {
      "id": "codex-gpt-5-6-sol-high-skill",
      "settingId": "codex-gpt-5-6-sol-high",
      "configurationId": "codex:gpt-5.6-sol@high",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "high",
      "label": "GPT-5.6 Sol · high",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 68.5,
      "baselineScore": 46,
      "delta": 22.5,
      "categories": [
        {
          "category": "engineering",
          "score": 68.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 46
        }
      ],
      "cost": null,
      "latency": 111.753,
      "tokens": 3042.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 111752.7,
        "meanInputTokens": 17196.7,
        "meanOutputTokens": 3042.7,
        "meanTotalTokens": 20239.3,
        "costUsd": null
      },
      "rank": 10
    },
    {
      "id": "claude-fable-high-skill",
      "settingId": "claude-fable-high",
      "configurationId": "claude:fable@high",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "high",
      "label": "Claude Fable 5 · high",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 67.5,
      "baselineScore": 47.9,
      "delta": 19.6,
      "categories": [
        {
          "category": "engineering",
          "score": 67.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 47.9
        }
      ],
      "cost": null,
      "latency": 43.025,
      "tokens": 2675,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 43025.3,
        "meanInputTokens": 2,
        "meanOutputTokens": 2675,
        "meanTotalTokens": 10524.7,
        "costUsd": null
      },
      "rank": 12
    },
    {
      "id": "claude-fable-max-skill",
      "settingId": "claude-fable-max",
      "configurationId": "claude:fable@max",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "max",
      "label": "Claude Fable 5 · max",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 66.8,
      "baselineScore": 46.2,
      "delta": 20.6,
      "categories": [
        {
          "category": "engineering",
          "score": 66.8
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 46.2
        }
      ],
      "cost": null,
      "latency": 82.097,
      "tokens": 5379.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 82097,
        "meanInputTokens": 2,
        "meanOutputTokens": 5379.3,
        "meanTotalTokens": 13228.7,
        "costUsd": null
      },
      "rank": 13
    },
    {
      "id": "claude-opus-high-skill",
      "settingId": "claude-opus-high",
      "configurationId": "claude:opus@high",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "high",
      "label": "Claude Opus 5 · high",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 66.8,
      "baselineScore": 65.6,
      "delta": 1.2,
      "categories": [
        {
          "category": "engineering",
          "score": 66.8
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 65.6
        }
      ],
      "cost": null,
      "latency": 97.515,
      "tokens": 6207.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 97515,
        "meanInputTokens": 2,
        "meanOutputTokens": 6207.3,
        "meanTotalTokens": 13710.7,
        "costUsd": null
      },
      "rank": 13
    },
    {
      "id": "codex-gpt-5-6-sol-ultra-baseline",
      "settingId": "codex-gpt-5-6-sol-ultra",
      "configurationId": "codex:gpt-5.6-sol@ultra",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "ultra",
      "label": "GPT-5.6 Sol · ultra",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 66.8,
      "baselineScore": 66.8,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 66.8
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 66.8
        }
      ],
      "cost": null,
      "latency": 258.23,
      "tokens": 7909.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 258229.7,
        "meanInputTokens": 14370.3,
        "meanOutputTokens": 7909.3,
        "meanTotalTokens": 22279.7,
        "costUsd": null
      },
      "rank": 13
    },
    {
      "id": "codex-gpt-5-6-terra-max-skill",
      "settingId": "codex-gpt-5-6-terra-max",
      "configurationId": "codex:gpt-5.6-terra@max",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "max",
      "label": "GPT-5.6 Terra · max",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 66.4,
      "baselineScore": 48.3,
      "delta": 18.1,
      "categories": [
        {
          "category": "engineering",
          "score": 66.4
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 48.3
        }
      ],
      "cost": null,
      "latency": 262.429,
      "tokens": 14270,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 262429.3,
        "meanInputTokens": 17281.3,
        "meanOutputTokens": 14270,
        "meanTotalTokens": 31551.3,
        "costUsd": null
      },
      "rank": 16
    },
    {
      "id": "codex-gpt-5-6-luna-xhigh-skill",
      "settingId": "codex-gpt-5-6-luna-xhigh",
      "configurationId": "codex:gpt-5.6-luna@xhigh",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "xhigh",
      "label": "GPT-5.6 Luna · xhigh",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 66,
      "baselineScore": 44.1,
      "delta": 21.9,
      "categories": [
        {
          "category": "engineering",
          "score": 66
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 44.1
        }
      ],
      "cost": null,
      "latency": 208.582,
      "tokens": 11258,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 208582.3,
        "meanInputTokens": 15612.3,
        "meanOutputTokens": 11258,
        "meanTotalTokens": 26870.3,
        "costUsd": null
      },
      "rank": 17
    },
    {
      "id": "claude-opus-high-baseline",
      "settingId": "claude-opus-high",
      "configurationId": "claude:opus@high",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "high",
      "label": "Claude Opus 5 · high",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 65.6,
      "baselineScore": 65.6,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 65.6
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 65.6
        }
      ],
      "cost": null,
      "latency": 47.122,
      "tokens": 2851.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 47121.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 2851.3,
        "meanTotalTokens": 5707,
        "costUsd": null
      },
      "rank": 18
    },
    {
      "id": "codex-gpt-5-6-sol-medium-baseline",
      "settingId": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "medium",
      "label": "GPT-5.6 Sol · medium",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 65.6,
      "baselineScore": 65.6,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 65.6
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 65.6
        }
      ],
      "cost": null,
      "latency": 38.685,
      "tokens": 1059.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 38685.3,
        "meanInputTokens": 14360.7,
        "meanOutputTokens": 1059.3,
        "meanTotalTokens": 15420,
        "costUsd": null
      },
      "rank": 18
    },
    {
      "id": "claude-fable-medium-skill",
      "settingId": "claude-fable-medium",
      "configurationId": "claude:fable@medium",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "medium",
      "label": "Claude Fable 5 · medium",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 65.4,
      "baselineScore": 47.5,
      "delta": 17.9,
      "categories": [
        {
          "category": "engineering",
          "score": 65.4
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 47.5
        }
      ],
      "cost": null,
      "latency": 30.955,
      "tokens": 1747.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 30954.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 1747.3,
        "meanTotalTokens": 9596,
        "costUsd": null
      },
      "rank": 20
    },
    {
      "id": "claude-fable-xhigh-skill",
      "settingId": "claude-fable-xhigh",
      "configurationId": "claude:fable@xhigh",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "xhigh",
      "label": "Claude Fable 5 · xhigh",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 63.3,
      "baselineScore": 55.5,
      "delta": 7.8,
      "categories": [
        {
          "category": "engineering",
          "score": 63.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55.5
        }
      ],
      "cost": null,
      "latency": 58.272,
      "tokens": 3808.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 58272,
        "meanInputTokens": 2,
        "meanOutputTokens": 3808.3,
        "meanTotalTokens": 11657.3,
        "costUsd": null
      },
      "rank": 21
    },
    {
      "id": "codex-gpt-5-6-terra-high-skill",
      "settingId": "codex-gpt-5-6-terra-high",
      "configurationId": "codex:gpt-5.6-terra@high",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "high",
      "label": "GPT-5.6 Terra · high",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 63.3,
      "baselineScore": 44.5,
      "delta": 18.8,
      "categories": [
        {
          "category": "engineering",
          "score": 63.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 44.5
        }
      ],
      "cost": null,
      "latency": 28.757,
      "tokens": 1242.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 28757.3,
        "meanInputTokens": 17237.7,
        "meanOutputTokens": 1242.3,
        "meanTotalTokens": 18480,
        "costUsd": null
      },
      "rank": 21
    },
    {
      "id": "codex-gpt-5-6-terra-ultra-baseline",
      "settingId": "codex-gpt-5-6-terra-ultra",
      "configurationId": "codex:gpt-5.6-terra@ultra",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "ultra",
      "label": "GPT-5.6 Terra · ultra",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 63.2,
      "baselineScore": 63.2,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 63.2
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 63.2
        }
      ],
      "cost": null,
      "latency": 75.231,
      "tokens": 3689.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 75231.3,
        "meanInputTokens": 14453,
        "meanOutputTokens": 3689.7,
        "meanTotalTokens": 18142.7,
        "costUsd": null
      },
      "rank": 23
    },
    {
      "id": "claude-claude-fable-5-1-max-baseline",
      "settingId": "claude-claude-fable-5-1-max",
      "configurationId": "claude:claude-fable-5-1@max",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "max",
      "label": "Claude Fable 5.1 · max",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 63,
      "baselineScore": 63,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 63
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 63
        }
      ],
      "cost": null,
      "latency": 175.004,
      "tokens": 12961.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 175004.3,
        "meanInputTokens": 2,
        "meanOutputTokens": 12961.3,
        "meanTotalTokens": 16869,
        "costUsd": null
      },
      "rank": 24
    },
    {
      "id": "claude-claude-fable-5-1-xhigh-skill",
      "settingId": "claude-claude-fable-5-1-xhigh",
      "configurationId": "claude:claude-fable-5-1@xhigh",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "xhigh",
      "label": "Claude Fable 5.1 · xhigh",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 62.9,
      "baselineScore": 48.9,
      "delta": 13.9,
      "categories": [
        {
          "category": "engineering",
          "score": 62.9
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 48.9
        }
      ],
      "cost": null,
      "latency": 148.185,
      "tokens": 10357.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 148184.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 10357.7,
        "meanTotalTokens": 18912.7,
        "costUsd": null
      },
      "rank": 25
    },
    {
      "id": "claude-claude-fable-5-1-ultracode-baseline",
      "settingId": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "ultracode",
      "label": "Claude Fable 5.1 · ultracode",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 61.4,
      "baselineScore": 61.4,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 61.4
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 61.4
        }
      ],
      "cost": null,
      "latency": 366.755,
      "tokens": 3770.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 366755.3,
        "meanInputTokens": 4,
        "meanOutputTokens": 3770.7,
        "meanTotalTokens": 23410.3,
        "costUsd": null
      },
      "rank": 26
    },
    {
      "id": "codex-gpt-5-6-luna-max-skill",
      "settingId": "codex-gpt-5-6-luna-max",
      "configurationId": "codex:gpt-5.6-luna@max",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "max",
      "label": "GPT-5.6 Luna · max",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 61,
      "baselineScore": 51,
      "delta": 10,
      "categories": [
        {
          "category": "engineering",
          "score": 61
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 51
        }
      ],
      "cost": null,
      "latency": 345.574,
      "tokens": 18902.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 345574,
        "meanInputTokens": 15722,
        "meanOutputTokens": 18902.7,
        "meanTotalTokens": 34624.7,
        "costUsd": null
      },
      "rank": 27
    },
    {
      "id": "codex-gpt-6-astra-medium-skill",
      "settingId": "codex-gpt-6-astra-medium",
      "configurationId": "codex:gpt-6-astra@medium",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "medium",
      "label": "GPT-6 Astra · medium",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 60.4,
      "baselineScore": 55.7,
      "delta": 4.7,
      "categories": [
        {
          "category": "engineering",
          "score": 60.4
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "cost": null,
      "latency": 30.394,
      "tokens": 856.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 30394.3,
        "meanInputTokens": 18073.3,
        "meanOutputTokens": 856.7,
        "meanTotalTokens": 18930,
        "costUsd": null
      },
      "rank": 28
    },
    {
      "id": "codex-gpt-5-6-terra-low-skill",
      "settingId": "codex-gpt-5-6-terra-low",
      "configurationId": "codex:gpt-5.6-terra@low",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "low",
      "label": "GPT-5.6 Terra · low",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 59,
      "baselineScore": 44.5,
      "delta": 14.5,
      "categories": [
        {
          "category": "engineering",
          "score": 59
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 44.5
        }
      ],
      "cost": null,
      "latency": 17.678,
      "tokens": 767.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 17678,
        "meanInputTokens": 17237.7,
        "meanOutputTokens": 767.7,
        "meanTotalTokens": 18005.3,
        "costUsd": null
      },
      "rank": 29
    },
    {
      "id": "claude-claude-fable-5-1-ultracode-skill",
      "settingId": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "ultracode",
      "label": "Claude Fable 5.1 · ultracode",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 55.7,
      "baselineScore": 61.4,
      "delta": -5.8,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 61.4
        }
      ],
      "cost": null,
      "latency": 438.164,
      "tokens": 2202.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 438164,
        "meanInputTokens": 4,
        "meanOutputTokens": 2202.3,
        "meanTotalTokens": 32767,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "codex-gpt-5-6-luna-high-skill",
      "settingId": "codex-gpt-5-6-luna-high",
      "configurationId": "codex:gpt-5.6-luna@high",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "high",
      "label": "GPT-5.6 Luna · high",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 55.7,
      "baselineScore": 53.4,
      "delta": 2.2,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 53.4
        }
      ],
      "cost": null,
      "latency": 101.758,
      "tokens": 5302.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 101758,
        "meanInputTokens": 15680.3,
        "meanOutputTokens": 5302.7,
        "meanTotalTokens": 20983,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "codex-gpt-5-6-sol-low-skill",
      "settingId": "codex-gpt-5-6-sol-low",
      "configurationId": "codex:gpt-5.6-sol@low",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "low",
      "label": "GPT-5.6 Sol · low",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 55.7,
      "baselineScore": 47.9,
      "delta": 7.8,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 47.9
        }
      ],
      "cost": null,
      "latency": 50.196,
      "tokens": 1187.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 50195.7,
        "meanInputTokens": 17196.7,
        "meanOutputTokens": 1187.3,
        "meanTotalTokens": 18384,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "codex-gpt-5-6-sol-medium-skill",
      "settingId": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "medium",
      "label": "GPT-5.6 Sol · medium",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 55.7,
      "baselineScore": 65.6,
      "delta": -9.9,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 65.6
        }
      ],
      "cost": null,
      "latency": 93.381,
      "tokens": 2329.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 93381.3,
        "meanInputTokens": 17198,
        "meanOutputTokens": 2329.3,
        "meanTotalTokens": 19527.3,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "codex-gpt-5-6-terra-medium-skill",
      "settingId": "codex-gpt-5-6-terra-medium",
      "configurationId": "codex:gpt-5.6-terra@medium",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "medium",
      "label": "GPT-5.6 Terra · medium",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 55.7,
      "baselineScore": 45,
      "delta": 10.7,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 45
        }
      ],
      "cost": null,
      "latency": 21.157,
      "tokens": 882.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 21157.3,
        "meanInputTokens": 17196.7,
        "meanOutputTokens": 882.7,
        "meanTotalTokens": 18079.3,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "codex-gpt-5-6-terra-xhigh-skill",
      "settingId": "codex-gpt-5-6-terra-xhigh",
      "configurationId": "codex:gpt-5.6-terra@xhigh",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "xhigh",
      "label": "GPT-5.6 Terra · xhigh",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 55.7,
      "baselineScore": 45.2,
      "delta": 10.5,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 45.2
        }
      ],
      "cost": null,
      "latency": 76.572,
      "tokens": 3982,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 76572,
        "meanInputTokens": 17237,
        "meanOutputTokens": 3982,
        "meanTotalTokens": 21219,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "codex-gpt-6-astra-high-baseline",
      "settingId": "codex-gpt-6-astra-high",
      "configurationId": "codex:gpt-6-astra@high",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "high",
      "label": "GPT-6 Astra · high",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 55.7,
      "baselineScore": 55.7,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "cost": null,
      "latency": 45.803,
      "tokens": 1364,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 45803,
        "meanInputTokens": 15088.7,
        "meanOutputTokens": 1364,
        "meanTotalTokens": 16452.7,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "codex-gpt-6-astra-max-baseline",
      "settingId": "codex-gpt-6-astra-max",
      "configurationId": "codex:gpt-6-astra@max",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "max",
      "label": "GPT-6 Astra · max",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 55.7,
      "baselineScore": 55.7,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "cost": null,
      "latency": 255.698,
      "tokens": 7148,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 255698.3,
        "meanInputTokens": 15089.3,
        "meanOutputTokens": 7148,
        "meanTotalTokens": 22237.3,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "codex-gpt-6-astra-medium-baseline",
      "settingId": "codex-gpt-6-astra-medium",
      "configurationId": "codex:gpt-6-astra@medium",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "medium",
      "label": "GPT-6 Astra · medium",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 55.7,
      "baselineScore": 55.7,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "cost": null,
      "latency": 29.165,
      "tokens": 816.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 29164.7,
        "meanInputTokens": 15237.3,
        "meanOutputTokens": 816.3,
        "meanTotalTokens": 16053.7,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "claude-fable-xhigh-baseline",
      "settingId": "claude-fable-xhigh",
      "configurationId": "claude:fable@xhigh",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "xhigh",
      "label": "Claude Fable 5 · xhigh",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 55.5,
      "baselineScore": 55.5,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 55.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55.5
        }
      ],
      "cost": null,
      "latency": 32.122,
      "tokens": 1836,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 32122,
        "meanInputTokens": 2,
        "meanOutputTokens": 1836,
        "meanTotalTokens": 5037.7,
        "costUsd": null
      },
      "rank": 39
    },
    {
      "id": "claude-opus-medium-baseline",
      "settingId": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "medium",
      "label": "Claude Opus 5 · medium",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 55,
      "baselineScore": 55,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 55
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55
        }
      ],
      "cost": null,
      "latency": 34.019,
      "tokens": 2096.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 34019,
        "meanInputTokens": 2,
        "meanOutputTokens": 2096.3,
        "meanTotalTokens": 4950.7,
        "costUsd": null
      },
      "rank": 40
    },
    {
      "id": "codex-gpt-6-astra-xhigh-baseline",
      "settingId": "codex-gpt-6-astra-xhigh",
      "configurationId": "codex:gpt-6-astra@xhigh",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "xhigh",
      "label": "GPT-6 Astra · xhigh",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 53.5,
      "baselineScore": 53.5,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 53.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 53.5
        }
      ],
      "cost": null,
      "latency": 104.184,
      "tokens": 3337.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 104184,
        "meanInputTokens": 15088.7,
        "meanOutputTokens": 3337.3,
        "meanTotalTokens": 18426,
        "costUsd": null
      },
      "rank": 41
    },
    {
      "id": "codex-gpt-5-6-luna-high-baseline",
      "settingId": "codex-gpt-5-6-luna-high",
      "configurationId": "codex:gpt-5.6-luna@high",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "high",
      "label": "GPT-5.6 Luna · high",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 53.4,
      "baselineScore": 53.4,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 53.4
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 53.4
        }
      ],
      "cost": null,
      "latency": 46.71,
      "tokens": 2267,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 46710,
        "meanInputTokens": 12844.3,
        "meanOutputTokens": 2267,
        "meanTotalTokens": 15111.3,
        "costUsd": null
      },
      "rank": 42
    },
    {
      "id": "claude-opus-low-skill",
      "settingId": "claude-opus-low",
      "configurationId": "claude:opus@low",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "low",
      "label": "Claude Opus 5 · low",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 52.3,
      "baselineScore": 51,
      "delta": 1.3,
      "categories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 51
        }
      ],
      "cost": null,
      "latency": 35.611,
      "tokens": 2050,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 35610.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 2050,
        "meanTotalTokens": 9553.7,
        "costUsd": null
      },
      "rank": 43
    },
    {
      "id": "claude-opus-max-skill",
      "settingId": "claude-opus-max",
      "configurationId": "claude:opus@max",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "max",
      "label": "Claude Opus 5 · max",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 52.3,
      "baselineScore": 49,
      "delta": 3.3,
      "categories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 49
        }
      ],
      "cost": null,
      "latency": 247.377,
      "tokens": 10756.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 247377.3,
        "meanInputTokens": 2.7,
        "meanOutputTokens": 10756.7,
        "meanTotalTokens": 20800.7,
        "costUsd": null
      },
      "rank": 43
    },
    {
      "id": "codex-gpt-5-6-luna-low-skill",
      "settingId": "codex-gpt-5-6-luna-low",
      "configurationId": "codex:gpt-5.6-luna@low",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "low",
      "label": "GPT-5.6 Luna · low",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 52.3,
      "baselineScore": 45.8,
      "delta": 6.5,
      "categories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 45.8
        }
      ],
      "cost": null,
      "latency": 19.41,
      "tokens": 757.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 19410,
        "meanInputTokens": 15680.3,
        "meanOutputTokens": 757.3,
        "meanTotalTokens": 16437.7,
        "costUsd": null
      },
      "rank": 43
    },
    {
      "id": "codex-gpt-5-6-luna-medium-skill",
      "settingId": "codex-gpt-5-6-luna-medium",
      "configurationId": "codex:gpt-5.6-luna@medium",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "medium",
      "label": "GPT-5.6 Luna · medium",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 52.3,
      "baselineScore": 47.3,
      "delta": 5.1,
      "categories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 47.3
        }
      ],
      "cost": null,
      "latency": 24.402,
      "tokens": 1061.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 24402.3,
        "meanInputTokens": 15680.3,
        "meanOutputTokens": 1061.3,
        "meanTotalTokens": 16741.7,
        "costUsd": null
      },
      "rank": 43
    },
    {
      "id": "codex-gpt-5-6-sol-xhigh-baseline",
      "settingId": "codex-gpt-5-6-sol-xhigh",
      "configurationId": "codex:gpt-5.6-sol@xhigh",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "xhigh",
      "label": "GPT-5.6 Sol · xhigh",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 52.3,
      "baselineScore": 52.3,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "cost": null,
      "latency": 130.317,
      "tokens": 4136,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 130317,
        "meanInputTokens": 14401.7,
        "meanOutputTokens": 4136,
        "meanTotalTokens": 18537.7,
        "costUsd": null
      },
      "rank": 43
    },
    {
      "id": "codex-gpt-6-astra-low-baseline",
      "settingId": "codex-gpt-6-astra-low",
      "configurationId": "codex:gpt-6-astra@low",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "low",
      "label": "GPT-6 Astra · low",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 52.3,
      "baselineScore": 52.3,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "cost": null,
      "latency": 25.663,
      "tokens": 714,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 25662.7,
        "meanInputTokens": 15236,
        "meanOutputTokens": 714,
        "meanTotalTokens": 15950,
        "costUsd": null
      },
      "rank": 43
    },
    {
      "id": "codex-gpt-6-astra-ultra-baseline",
      "settingId": "codex-gpt-6-astra-ultra",
      "configurationId": "codex:gpt-6-astra@ultra",
      "modelId": "codex:gpt-6-astra",
      "provider": "codex",
      "family": "GPT-6 Astra",
      "reasoning": "ultra",
      "label": "GPT-6 Astra · ultra",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 52.3,
      "baselineScore": 52.3,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 52.3
        }
      ],
      "cost": null,
      "latency": 96.956,
      "tokens": 3100.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 96956,
        "meanInputTokens": 15210.7,
        "meanOutputTokens": 3100.7,
        "meanTotalTokens": 18311.3,
        "costUsd": null
      },
      "rank": 43
    },
    {
      "id": "claude-opus-low-baseline",
      "settingId": "claude-opus-low",
      "configurationId": "claude:opus@low",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "low",
      "label": "Claude Opus 5 · low",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 51,
      "baselineScore": 51,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 51
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 51
        }
      ],
      "cost": null,
      "latency": 23.206,
      "tokens": 1361.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 23205.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 1361.3,
        "meanTotalTokens": 4216.7,
        "costUsd": null
      },
      "rank": 50
    },
    {
      "id": "codex-gpt-5-6-luna-max-baseline",
      "settingId": "codex-gpt-5-6-luna-max",
      "configurationId": "codex:gpt-5.6-luna@max",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "max",
      "label": "GPT-5.6 Luna · max",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 51,
      "baselineScore": 51,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 51
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 51
        }
      ],
      "cost": null,
      "latency": 169.169,
      "tokens": 9056,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 169169,
        "meanInputTokens": 12884,
        "meanOutputTokens": 9056,
        "meanTotalTokens": 21940,
        "costUsd": null
      },
      "rank": 50
    },
    {
      "id": "claude-opus-xhigh-baseline",
      "settingId": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "xhigh",
      "label": "Claude Opus 5 · xhigh",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 49.8,
      "baselineScore": 49.8,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 49.8
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 49.8
        }
      ],
      "cost": null,
      "latency": 66.847,
      "tokens": 4220.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 66847.3,
        "meanInputTokens": 2,
        "meanOutputTokens": 4220.3,
        "meanTotalTokens": 7074.7,
        "costUsd": null
      },
      "rank": 52
    },
    {
      "id": "claude-fable-low-skill",
      "settingId": "claude-fable-low",
      "configurationId": "claude:fable@low",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "low",
      "label": "Claude Fable 5 · low",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 49,
      "baselineScore": 48.3,
      "delta": 0.7,
      "categories": [
        {
          "category": "engineering",
          "score": 49
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 48.3
        }
      ],
      "cost": null,
      "latency": 22.328,
      "tokens": 1136,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 22327.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 1136,
        "meanTotalTokens": 8985.3,
        "costUsd": null
      },
      "rank": 53
    },
    {
      "id": "claude-opus-max-baseline",
      "settingId": "claude-opus-max",
      "configurationId": "claude:opus@max",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "max",
      "label": "Claude Opus 5 · max",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 49,
      "baselineScore": 49,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 49
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 49
        }
      ],
      "cost": null,
      "latency": 91.872,
      "tokens": 6069.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 91872,
        "meanInputTokens": 2,
        "meanOutputTokens": 6069.7,
        "meanTotalTokens": 8925,
        "costUsd": null
      },
      "rank": 53
    },
    {
      "id": "claude-opus-medium-skill",
      "settingId": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "medium",
      "label": "Claude Opus 5 · medium",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 49,
      "baselineScore": 55,
      "delta": -6,
      "categories": [
        {
          "category": "engineering",
          "score": 49
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55
        }
      ],
      "cost": null,
      "latency": 48.864,
      "tokens": 2964,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 48863.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 2964,
        "meanTotalTokens": 10467,
        "costUsd": null
      },
      "rank": 53
    },
    {
      "id": "claude-opus-xhigh-skill",
      "settingId": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "xhigh",
      "label": "Claude Opus 5 · xhigh",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 49,
      "baselineScore": 49.8,
      "delta": -0.8,
      "categories": [
        {
          "category": "engineering",
          "score": 49
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 49.8
        }
      ],
      "cost": null,
      "latency": 134.077,
      "tokens": 8684.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 134076.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 8684.7,
        "meanTotalTokens": 16187.7,
        "costUsd": null
      },
      "rank": 53
    },
    {
      "id": "claude-claude-fable-5-1-xhigh-baseline",
      "settingId": "claude-claude-fable-5-1-xhigh",
      "configurationId": "claude:claude-fable-5-1@xhigh",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "xhigh",
      "label": "Claude Fable 5.1 · xhigh",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 48.9,
      "baselineScore": 48.9,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 48.9
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 48.9
        }
      ],
      "cost": null,
      "latency": 94.631,
      "tokens": 6967.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 94631.3,
        "meanInputTokens": 2,
        "meanOutputTokens": 6967.7,
        "meanTotalTokens": 10874.7,
        "costUsd": null
      },
      "rank": 57
    },
    {
      "id": "claude-fable-low-baseline",
      "settingId": "claude-fable-low",
      "configurationId": "claude:fable@low",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "low",
      "label": "Claude Fable 5 · low",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 48.3,
      "baselineScore": 48.3,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 48.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 48.3
        }
      ],
      "cost": null,
      "latency": 19.017,
      "tokens": 918,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 19017.3,
        "meanInputTokens": 2,
        "meanOutputTokens": 918,
        "meanTotalTokens": 4120,
        "costUsd": null
      },
      "rank": 58
    },
    {
      "id": "codex-gpt-5-6-sol-max-baseline",
      "settingId": "codex-gpt-5-6-sol-max",
      "configurationId": "codex:gpt-5.6-sol@max",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "max",
      "label": "GPT-5.6 Sol · max",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 48.3,
      "baselineScore": 48.3,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 48.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 48.3
        }
      ],
      "cost": null,
      "latency": 250.821,
      "tokens": 8275,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 250821.3,
        "meanInputTokens": 14362.7,
        "meanOutputTokens": 8275,
        "meanTotalTokens": 22637.7,
        "costUsd": null
      },
      "rank": 58
    },
    {
      "id": "codex-gpt-5-6-terra-max-baseline",
      "settingId": "codex-gpt-5-6-terra-max",
      "configurationId": "codex:gpt-5.6-terra@max",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "max",
      "label": "GPT-5.6 Terra · max",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 48.3,
      "baselineScore": 48.3,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 48.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 48.3
        }
      ],
      "cost": null,
      "latency": 103.314,
      "tokens": 5415.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 103314.3,
        "meanInputTokens": 14402.3,
        "meanOutputTokens": 5415.7,
        "meanTotalTokens": 19818,
        "costUsd": null
      },
      "rank": 58
    },
    {
      "id": "claude-fable-high-baseline",
      "settingId": "claude-fable-high",
      "configurationId": "claude:fable@high",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "high",
      "label": "Claude Fable 5 · high",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 47.9,
      "baselineScore": 47.9,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 47.9
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 47.9
        }
      ],
      "cost": null,
      "latency": 26.724,
      "tokens": 1540.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 26723.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 1540.7,
        "meanTotalTokens": 4742.3,
        "costUsd": null
      },
      "rank": 61
    },
    {
      "id": "codex-gpt-5-6-sol-low-baseline",
      "settingId": "codex-gpt-5-6-sol-low",
      "configurationId": "codex:gpt-5.6-sol@low",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "low",
      "label": "GPT-5.6 Sol · low",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 47.9,
      "baselineScore": 47.9,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 47.9
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 47.9
        }
      ],
      "cost": null,
      "latency": 27.355,
      "tokens": 661.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 27354.7,
        "meanInputTokens": 14362,
        "meanOutputTokens": 661.3,
        "meanTotalTokens": 15023.3,
        "costUsd": null
      },
      "rank": 61
    },
    {
      "id": "claude-fable-medium-baseline",
      "settingId": "claude-fable-medium",
      "configurationId": "claude:fable@medium",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "medium",
      "label": "Claude Fable 5 · medium",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 47.5,
      "baselineScore": 47.5,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 47.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 47.5
        }
      ],
      "cost": null,
      "latency": 23.334,
      "tokens": 1267.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 23334.3,
        "meanInputTokens": 2,
        "meanOutputTokens": 1267.7,
        "meanTotalTokens": 4468.7,
        "costUsd": null
      },
      "rank": 63
    },
    {
      "id": "codex-gpt-5-6-luna-medium-baseline",
      "settingId": "codex-gpt-5-6-luna-medium",
      "configurationId": "codex:gpt-5.6-luna@medium",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "medium",
      "label": "GPT-5.6 Luna · medium",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 47.3,
      "baselineScore": 47.3,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 47.3
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 47.3
        }
      ],
      "cost": null,
      "latency": 15.492,
      "tokens": 565.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 15492,
        "meanInputTokens": 12844.3,
        "meanOutputTokens": 565.3,
        "meanTotalTokens": 13409.7,
        "costUsd": null
      },
      "rank": 64
    },
    {
      "id": "claude-fable-max-baseline",
      "settingId": "claude-fable-max",
      "configurationId": "claude:fable@max",
      "modelId": "claude:fable",
      "provider": "claude",
      "family": "Claude Fable 5",
      "reasoning": "max",
      "label": "Claude Fable 5 · max",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 46.2,
      "baselineScore": 46.2,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 46.2
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 46.2
        }
      ],
      "cost": null,
      "latency": 68.524,
      "tokens": 4633.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 68524.3,
        "meanInputTokens": 2,
        "meanOutputTokens": 4633.7,
        "meanTotalTokens": 7834.3,
        "costUsd": null
      },
      "rank": 65
    },
    {
      "id": "codex-gpt-5-6-sol-high-baseline",
      "settingId": "codex-gpt-5-6-sol-high",
      "configurationId": "codex:gpt-5.6-sol@high",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "high",
      "label": "GPT-5.6 Sol · high",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 46,
      "baselineScore": 46,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 46
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 46
        }
      ],
      "cost": null,
      "latency": 91.739,
      "tokens": 2748.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 91739.3,
        "meanInputTokens": 14401.7,
        "meanOutputTokens": 2748.3,
        "meanTotalTokens": 17150,
        "costUsd": null
      },
      "rank": 66
    },
    {
      "id": "codex-gpt-5-6-luna-low-baseline",
      "settingId": "codex-gpt-5-6-luna-low",
      "configurationId": "codex:gpt-5.6-luna@low",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "low",
      "label": "GPT-5.6 Luna · low",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 45.8,
      "baselineScore": 45.8,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 45.8
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 45.8
        }
      ],
      "cost": null,
      "latency": 15.173,
      "tokens": 559.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 15173.3,
        "meanInputTokens": 12845,
        "meanOutputTokens": 559.3,
        "meanTotalTokens": 13404.3,
        "costUsd": null
      },
      "rank": 67
    },
    {
      "id": "codex-gpt-5-6-terra-xhigh-baseline",
      "settingId": "codex-gpt-5-6-terra-xhigh",
      "configurationId": "codex:gpt-5.6-terra@xhigh",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "xhigh",
      "label": "GPT-5.6 Terra · xhigh",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 45.2,
      "baselineScore": 45.2,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 45.2
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 45.2
        }
      ],
      "cost": null,
      "latency": 53.516,
      "tokens": 2413,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 53515.7,
        "meanInputTokens": 14401.7,
        "meanOutputTokens": 2413,
        "meanTotalTokens": 16814.7,
        "costUsd": null
      },
      "rank": 68
    },
    {
      "id": "codex-gpt-5-6-terra-medium-baseline",
      "settingId": "codex-gpt-5-6-terra-medium",
      "configurationId": "codex:gpt-5.6-terra@medium",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "medium",
      "label": "GPT-5.6 Terra · medium",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 45,
      "baselineScore": 45,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 45
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 45
        }
      ],
      "cost": null,
      "latency": 12.135,
      "tokens": 434.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 12135,
        "meanInputTokens": 14360.7,
        "meanOutputTokens": 434.7,
        "meanTotalTokens": 14795.3,
        "costUsd": null
      },
      "rank": 69
    },
    {
      "id": "codex-gpt-5-6-terra-low-baseline",
      "settingId": "codex-gpt-5-6-terra-low",
      "configurationId": "codex:gpt-5.6-terra@low",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "low",
      "label": "GPT-5.6 Terra · low",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 44.5,
      "baselineScore": 44.5,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 44.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 44.5
        }
      ],
      "cost": null,
      "latency": 13.211,
      "tokens": 392,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 13211,
        "meanInputTokens": 14402.3,
        "meanOutputTokens": 392,
        "meanTotalTokens": 14794.3,
        "costUsd": null
      },
      "rank": 70
    },
    {
      "id": "codex-gpt-5-6-terra-high-baseline",
      "settingId": "codex-gpt-5-6-terra-high",
      "configurationId": "codex:gpt-5.6-terra@high",
      "modelId": "codex:gpt-5.6-terra",
      "provider": "codex",
      "family": "GPT-5.6 Terra",
      "reasoning": "high",
      "label": "GPT-5.6 Terra · high",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 44.5,
      "baselineScore": 44.5,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 44.5
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 44.5
        }
      ],
      "cost": null,
      "latency": 16.293,
      "tokens": 547,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 16293,
        "meanInputTokens": 14444.7,
        "meanOutputTokens": 547,
        "meanTotalTokens": 14991.7,
        "costUsd": null
      },
      "rank": 71
    },
    {
      "id": "codex-gpt-5-6-luna-xhigh-baseline",
      "settingId": "codex-gpt-5-6-luna-xhigh",
      "configurationId": "codex:gpt-5.6-luna@xhigh",
      "modelId": "codex:gpt-5.6-luna",
      "provider": "codex",
      "family": "GPT-5.6 Luna",
      "reasoning": "xhigh",
      "label": "GPT-5.6 Luna · xhigh",
      "condition": "baseline",
      "conditionLabel": "Minimal baseline",
      "score": 44.1,
      "baselineScore": 44.1,
      "delta": 0,
      "categories": [
        {
          "category": "engineering",
          "score": 44.1
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 44.1
        }
      ],
      "cost": null,
      "latency": 107.362,
      "tokens": 5552.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 107362,
        "meanInputTokens": 12844.3,
        "meanOutputTokens": 5552.7,
        "meanTotalTokens": 18397,
        "costUsd": null
      },
      "rank": 72
    }
  ],
  "benchmarkResults": [
    {
      "settingId": "codex-gpt-6-astra-ultra",
      "configurationId": "codex:gpt-6-astra@ultra",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 47469,
      "inputTokens": 14988,
      "outputTokens": 1457,
      "totalTokens": 16445,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-ultra",
      "configurationId": "codex:gpt-6-astra@ultra",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 80.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 76995,
      "inputTokens": 17820,
      "outputTokens": 2451,
      "totalTokens": 20271,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-xhigh",
      "configurationId": "codex:gpt-6-astra@xhigh",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 52.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 47010,
      "inputTokens": 14939,
      "outputTokens": 1450,
      "totalTokens": 16389,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-xhigh",
      "configurationId": "codex:gpt-6-astra@xhigh",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 80.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 74857,
      "inputTokens": 17775,
      "outputTokens": 2356,
      "totalTokens": 20131,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-high",
      "configurationId": "codex:gpt-6-astra@high",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 29256,
      "inputTokens": 14939,
      "outputTokens": 819,
      "totalTokens": 15758,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-high",
      "configurationId": "codex:gpt-6-astra@high",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 33307,
      "inputTokens": 17779,
      "outputTokens": 986,
      "totalTokens": 18765,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-low",
      "configurationId": "codex:gpt-6-astra@low",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 18424,
      "inputTokens": 15160,
      "outputTokens": 469,
      "totalTokens": 15629,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-low",
      "configurationId": "codex:gpt-6-astra@low",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 79.4,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 22281,
      "inputTokens": 17996,
      "outputTokens": 587,
      "totalTokens": 18583,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-max",
      "configurationId": "codex:gpt-6-astra@max",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 125995,
      "inputTokens": 14941,
      "outputTokens": 4050,
      "totalTokens": 18991,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-max",
      "configurationId": "codex:gpt-6-astra@max",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 82.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 167693,
      "inputTokens": 17777,
      "outputTokens": 5393,
      "totalTokens": 23170,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-xhigh",
      "configurationId": "codex:gpt-5.6-sol@xhigh",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 19181,
      "inputTokens": 14286,
      "outputTokens": 496,
      "totalTokens": 14782,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-xhigh",
      "configurationId": "codex:gpt-5.6-sol@xhigh",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 85,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 167195,
      "inputTokens": 17120,
      "outputTokens": 5060,
      "totalTokens": 22180,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-max",
      "configurationId": "codex:gpt-5.6-sol@max",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 46.9,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 65074,
      "inputTokens": 14288,
      "outputTokens": 1390,
      "totalTokens": 15678,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-max",
      "configurationId": "codex:gpt-5.6-sol@max",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 337825,
      "inputTokens": 17247,
      "outputTokens": 10304,
      "totalTokens": 27551,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-ultra",
      "configurationId": "codex:gpt-5.6-sol@ultra",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 53140,
      "inputTokens": 14295,
      "outputTokens": 1359,
      "totalTokens": 15654,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-ultra",
      "configurationId": "codex:gpt-5.6-sol@ultra",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 175173,
      "inputTokens": 17131,
      "outputTokens": 5373,
      "totalTokens": 22504,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-ultra",
      "configurationId": "codex:gpt-5.6-terra@ultra",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 39.4,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 21948,
      "inputTokens": 14420,
      "outputTokens": 849,
      "totalTokens": 15269,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-ultra",
      "configurationId": "codex:gpt-5.6-terra@ultra",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 138713,
      "inputTokens": 17256,
      "outputTokens": 7402,
      "totalTokens": 24658,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-max",
      "configurationId": "claude:claude-fable-5-1@max",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 54.4,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 159146,
      "inputTokens": 2,
      "outputTokens": 12261,
      "totalTokens": 16048,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-max",
      "configurationId": "claude:claude-fable-5-1@max",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 210179,
      "inputTokens": 2,
      "outputTokens": 15695,
      "totalTokens": 24130,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-high",
      "configurationId": "codex:gpt-5.6-sol@high",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 40,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 24822,
      "inputTokens": 14409,
      "outputTokens": 560,
      "totalTokens": 14969,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-high",
      "configurationId": "codex:gpt-5.6-sol@high",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 92440,
      "inputTokens": 17122,
      "outputTokens": 2444,
      "totalTokens": 19566,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-high",
      "configurationId": "claude:fable@high",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 45.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 20226,
      "inputTokens": 2,
      "outputTokens": 1057,
      "totalTokens": 4137,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-high",
      "configurationId": "claude:fable@high",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 31029,
      "inputTokens": 2,
      "outputTokens": 1845,
      "totalTokens": 9573,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-high",
      "configurationId": "claude:opus@high",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 40249,
      "inputTokens": 2,
      "outputTokens": 2091,
      "totalTokens": 4825,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-high",
      "configurationId": "claude:opus@high",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 59225,
      "inputTokens": 2,
      "outputTokens": 3530,
      "totalTokens": 10913,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-max",
      "configurationId": "claude:fable@max",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 40.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 39754,
      "inputTokens": 2,
      "outputTokens": 2402,
      "totalTokens": 5480,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-max",
      "configurationId": "claude:fable@max",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 58461,
      "inputTokens": 2,
      "outputTokens": 3680,
      "totalTokens": 11409,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-max",
      "configurationId": "codex:gpt-5.6-terra@max",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 46.9,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 21015,
      "inputTokens": 14409,
      "outputTokens": 847,
      "totalTokens": 15256,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-max",
      "configurationId": "codex:gpt-5.6-terra@max",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 117579,
      "inputTokens": 17247,
      "outputTokens": 6035,
      "totalTokens": 23282,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-xhigh",
      "configurationId": "codex:gpt-5.6-luna@xhigh",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 34.4,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 26796,
      "inputTokens": 12851,
      "outputTokens": 787,
      "totalTokens": 13638,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-xhigh",
      "configurationId": "codex:gpt-5.6-luna@xhigh",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 111707,
      "inputTokens": 15691,
      "outputTokens": 5544,
      "totalTokens": 21235,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-medium",
      "configurationId": "claude:fable@medium",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 44.4,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 18127,
      "inputTokens": 2,
      "outputTokens": 878,
      "totalTokens": 3958,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-medium",
      "configurationId": "claude:fable@medium",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 21432,
      "inputTokens": 2,
      "outputTokens": 1140,
      "totalTokens": 8868,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-xhigh",
      "configurationId": "claude:fable@xhigh",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 40.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 18105,
      "inputTokens": 2,
      "outputTokens": 951,
      "totalTokens": 4033,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-xhigh",
      "configurationId": "claude:fable@xhigh",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 46933,
      "inputTokens": 2,
      "outputTokens": 2986,
      "totalTokens": 10714,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-high",
      "configurationId": "codex:gpt-5.6-terra@high",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 31.3,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 11899,
      "inputTokens": 14411,
      "outputTokens": 293,
      "totalTokens": 14704,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-high",
      "configurationId": "codex:gpt-5.6-terra@high",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 23501,
      "inputTokens": 17245,
      "outputTokens": 833,
      "totalTokens": 18078,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-xhigh",
      "configurationId": "claude:claude-fable-5-1@xhigh",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 38.8,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 44796,
      "inputTokens": 2,
      "outputTokens": 3228,
      "totalTokens": 7013,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-xhigh",
      "configurationId": "claude:claude-fable-5-1@xhigh",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 141491,
      "inputTokens": 2,
      "outputTokens": 9840,
      "totalTokens": 18274,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-max",
      "configurationId": "codex:gpt-5.6-luna@max",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 45,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 36455,
      "inputTokens": 12851,
      "outputTokens": 1392,
      "totalTokens": 14243,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-max",
      "configurationId": "codex:gpt-5.6-luna@max",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 75,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 302269,
      "inputTokens": 15689,
      "outputTokens": 16356,
      "totalTokens": 32045,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-medium",
      "configurationId": "codex:gpt-6-astra@medium",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 18975,
      "inputTokens": 15164,
      "outputTokens": 471,
      "totalTokens": 15635,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-medium",
      "configurationId": "codex:gpt-6-astra@medium",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 83.1,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 24087,
      "inputTokens": 18000,
      "outputTokens": 672,
      "totalTokens": 18672,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-low",
      "configurationId": "codex:gpt-5.6-terra@low",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 35.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 10173,
      "inputTokens": 14286,
      "outputTokens": 289,
      "totalTokens": 14575,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-low",
      "configurationId": "codex:gpt-5.6-terra@low",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 12742,
      "inputTokens": 17120,
      "outputTokens": 530,
      "totalTokens": 17650,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 55.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 19147,
      "inputTokens": 14284,
      "outputTokens": 425,
      "totalTokens": 14709,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 32081,
      "inputTokens": 17122,
      "outputTokens": 855,
      "totalTokens": 17977,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 280001,
      "inputTokens": 4,
      "outputTokens": 2031,
      "totalTokens": 21148,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 441408,
      "inputTokens": 4,
      "outputTokens": 1748,
      "totalTokens": 27722,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-high",
      "configurationId": "codex:gpt-5.6-luna@high",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 32.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 19173,
      "inputTokens": 12853,
      "outputTokens": 442,
      "totalTokens": 13295,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-high",
      "configurationId": "codex:gpt-5.6-luna@high",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 125055,
      "inputTokens": 15689,
      "outputTokens": 6215,
      "totalTokens": 21904,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-low",
      "configurationId": "codex:gpt-5.6-sol@low",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 35.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 18035,
      "inputTokens": 14288,
      "outputTokens": 364,
      "totalTokens": 14652,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-low",
      "configurationId": "codex:gpt-5.6-sol@low",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 37700,
      "inputTokens": 17122,
      "outputTokens": 801,
      "totalTokens": 17923,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-xhigh",
      "configurationId": "codex:gpt-5.6-terra@xhigh",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 37.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 19174,
      "inputTokens": 14411,
      "outputTokens": 728,
      "totalTokens": 15139,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-xhigh",
      "configurationId": "codex:gpt-5.6-terra@xhigh",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 47663,
      "inputTokens": 17122,
      "outputTokens": 2359,
      "totalTokens": 19481,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-medium",
      "configurationId": "codex:gpt-5.6-terra@medium",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 36.9,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 11796,
      "inputTokens": 14284,
      "outputTokens": 362,
      "totalTokens": 14646,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-medium",
      "configurationId": "codex:gpt-5.6-terra@medium",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 20040,
      "inputTokens": 17120,
      "outputTokens": 836,
      "totalTokens": 17956,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-low",
      "configurationId": "claude:opus@low",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 45,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 20288,
      "inputTokens": 2,
      "outputTokens": 1128,
      "totalTokens": 3862,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-low",
      "configurationId": "claude:opus@low",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 28708,
      "inputTokens": 2,
      "outputTokens": 1461,
      "totalTokens": 8845,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-max",
      "configurationId": "claude:opus@max",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 52777,
      "inputTokens": 2,
      "outputTokens": 3264,
      "totalTokens": 5998,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-max",
      "configurationId": "claude:opus@max",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 138738,
      "inputTokens": 2,
      "outputTokens": 8870,
      "totalTokens": 16252,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-medium",
      "configurationId": "codex:gpt-5.6-luna@medium",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 43.8,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 15416,
      "inputTokens": 12853,
      "outputTokens": 405,
      "totalTokens": 13258,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-medium",
      "configurationId": "codex:gpt-5.6-luna@medium",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 21662,
      "inputTokens": 15689,
      "outputTokens": 750,
      "totalTokens": 16439,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-low",
      "configurationId": "codex:gpt-5.6-luna@low",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 39.4,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 16162,
      "inputTokens": 12853,
      "outputTokens": 427,
      "totalTokens": 13280,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-low",
      "configurationId": "codex:gpt-5.6-luna@low",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 21466,
      "inputTokens": 15689,
      "outputTokens": 561,
      "totalTokens": 16250,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 46.9,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 23628,
      "inputTokens": 2,
      "outputTokens": 1357,
      "totalTokens": 4090,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 54748,
      "inputTokens": 2,
      "outputTokens": 3291,
      "totalTokens": 10673,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 51.3,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 55179,
      "inputTokens": 2,
      "outputTokens": 3015,
      "totalTokens": 5749,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 92473,
      "inputTokens": 2,
      "outputTokens": 5836,
      "totalTokens": 13218,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-low",
      "configurationId": "claude:fable@low",
      "condition": "baseline",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 46.9,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 18656,
      "inputTokens": 2,
      "outputTokens": 769,
      "totalTokens": 3850,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-low",
      "configurationId": "claude:fable@low",
      "condition": "skill",
      "benchmarkId": "hyper-scale-chat",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 21838,
      "inputTokens": 2,
      "outputTokens": 970,
      "totalTokens": 8699,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-ultra",
      "configurationId": "codex:gpt-6-astra@ultra",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 112746,
      "inputTokens": 15284,
      "outputTokens": 3619,
      "totalTokens": 18903,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-ultra",
      "configurationId": "codex:gpt-6-astra@ultra",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 115693,
      "inputTokens": 17897,
      "outputTokens": 3724,
      "totalTokens": 21621,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-xhigh",
      "configurationId": "codex:gpt-6-astra@xhigh",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 117525,
      "inputTokens": 15235,
      "outputTokens": 3750,
      "totalTokens": 18985,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-xhigh",
      "configurationId": "codex:gpt-6-astra@xhigh",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 154832,
      "inputTokens": 17850,
      "outputTokens": 4679,
      "totalTokens": 22529,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-high",
      "configurationId": "codex:gpt-6-astra@high",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 42592,
      "inputTokens": 15237,
      "outputTokens": 1210,
      "totalTokens": 16447,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-high",
      "configurationId": "codex:gpt-6-astra@high",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 82.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 53140,
      "inputTokens": 17850,
      "outputTokens": 1567,
      "totalTokens": 19417,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-low",
      "configurationId": "codex:gpt-6-astra@low",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 23706,
      "inputTokens": 15237,
      "outputTokens": 639,
      "totalTokens": 15876,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-low",
      "configurationId": "codex:gpt-6-astra@low",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 29816,
      "inputTokens": 18073,
      "outputTokens": 806,
      "totalTokens": 18879,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-max",
      "configurationId": "codex:gpt-6-astra@max",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 194418,
      "inputTokens": 15237,
      "outputTokens": 6362,
      "totalTokens": 21599,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-max",
      "configurationId": "codex:gpt-6-astra@max",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 446815,
      "inputTokens": 18071,
      "outputTokens": 14763,
      "totalTokens": 32834,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-xhigh",
      "configurationId": "codex:gpt-5.6-sol@xhigh",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 90291,
      "inputTokens": 14484,
      "outputTokens": 3229,
      "totalTokens": 17713,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-xhigh",
      "configurationId": "codex:gpt-5.6-sol@xhigh",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 177807,
      "inputTokens": 17197,
      "outputTokens": 6224,
      "totalTokens": 23421,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-max",
      "configurationId": "codex:gpt-5.6-sol@max",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 129319,
      "inputTokens": 14361,
      "outputTokens": 6764,
      "totalTokens": 21125,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-max",
      "configurationId": "codex:gpt-5.6-sol@max",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 452432,
      "inputTokens": 17193,
      "outputTokens": 16510,
      "totalTokens": 33703,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-ultra",
      "configurationId": "codex:gpt-5.6-sol@ultra",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 370541,
      "inputTokens": 14370,
      "outputTokens": 11405,
      "totalTokens": 25775,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-ultra",
      "configurationId": "codex:gpt-5.6-sol@ultra",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 349047,
      "inputTokens": 17333,
      "outputTokens": 14663,
      "totalTokens": 31996,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-ultra",
      "configurationId": "codex:gpt-5.6-terra@ultra",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 26152,
      "inputTokens": 14495,
      "outputTokens": 1008,
      "totalTokens": 15503,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-ultra",
      "configurationId": "codex:gpt-5.6-terra@ultra",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 265313,
      "inputTokens": 17206,
      "outputTokens": 14501,
      "totalTokens": 31707,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-max",
      "configurationId": "claude:claude-fable-5-1@max",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 131584,
      "inputTokens": 2,
      "outputTokens": 9354,
      "totalTokens": 13264,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-max",
      "configurationId": "claude:claude-fable-5-1@max",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 351368,
      "inputTokens": 2,
      "outputTokens": 25051,
      "totalTokens": 33609,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-high",
      "configurationId": "codex:gpt-5.6-sol@high",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 47433,
      "inputTokens": 14361,
      "outputTokens": 1457,
      "totalTokens": 15818,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-high",
      "configurationId": "codex:gpt-5.6-sol@high",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 94856,
      "inputTokens": 17197,
      "outputTokens": 3110,
      "totalTokens": 20307,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-high",
      "configurationId": "claude:fable@high",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 20403,
      "inputTokens": 2,
      "outputTokens": 1156,
      "totalTokens": 4361,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-high",
      "configurationId": "claude:fable@high",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 51229,
      "inputTokens": 2,
      "outputTokens": 3066,
      "totalTokens": 10918,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-high",
      "configurationId": "claude:opus@high",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 39414,
      "inputTokens": 2,
      "outputTokens": 2409,
      "totalTokens": 5268,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-high",
      "configurationId": "claude:opus@high",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 83210,
      "inputTokens": 2,
      "outputTokens": 5281,
      "totalTokens": 12786,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-max",
      "configurationId": "claude:fable@max",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 55414,
      "inputTokens": 2,
      "outputTokens": 3678,
      "totalTokens": 6882,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-max",
      "configurationId": "claude:fable@max",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 88647,
      "inputTokens": 2,
      "outputTokens": 5649,
      "totalTokens": 13501,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-max",
      "configurationId": "codex:gpt-5.6-terra@max",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 119462,
      "inputTokens": 14363,
      "outputTokens": 6178,
      "totalTokens": 20541,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-max",
      "configurationId": "codex:gpt-5.6-terra@max",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 386334,
      "inputTokens": 17322,
      "outputTokens": 21210,
      "totalTokens": 38532,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-xhigh",
      "configurationId": "codex:gpt-5.6-luna@xhigh",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 48159,
      "inputTokens": 12803,
      "outputTokens": 2485,
      "totalTokens": 15288,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-xhigh",
      "configurationId": "codex:gpt-5.6-luna@xhigh",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 95598,
      "inputTokens": 15639,
      "outputTokens": 5146,
      "totalTokens": 20785,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-medium",
      "configurationId": "claude:fable@medium",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 22671,
      "inputTokens": 2,
      "outputTokens": 1151,
      "totalTokens": 4354,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-medium",
      "configurationId": "claude:fable@medium",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 38277,
      "inputTokens": 2,
      "outputTokens": 2030,
      "totalTokens": 9880,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-xhigh",
      "configurationId": "claude:fable@xhigh",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 36239,
      "inputTokens": 2,
      "outputTokens": 1902,
      "totalTokens": 5106,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-xhigh",
      "configurationId": "claude:fable@xhigh",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 62591,
      "inputTokens": 2,
      "outputTokens": 3970,
      "totalTokens": 11821,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-high",
      "configurationId": "codex:gpt-5.6-terra@high",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 53.1,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 13964,
      "inputTokens": 14486,
      "outputTokens": 479,
      "totalTokens": 14965,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-high",
      "configurationId": "codex:gpt-5.6-terra@high",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 43174,
      "inputTokens": 17197,
      "outputTokens": 2041,
      "totalTokens": 19238,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-xhigh",
      "configurationId": "claude:claude-fable-5-1@xhigh",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 104544,
      "inputTokens": 2,
      "outputTokens": 8098,
      "totalTokens": 12008,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-xhigh",
      "configurationId": "claude:claude-fable-5-1@xhigh",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 166987,
      "inputTokens": 2,
      "outputTokens": 11229,
      "totalTokens": 19787,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-max",
      "configurationId": "codex:gpt-5.6-luna@max",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 87186,
      "inputTokens": 12926,
      "outputTokens": 4631,
      "totalTokens": 17557,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-max",
      "configurationId": "codex:gpt-5.6-luna@max",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 360662,
      "inputTokens": 15764,
      "outputTokens": 19757,
      "totalTokens": 35521,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-medium",
      "configurationId": "codex:gpt-6-astra@medium",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 24346,
      "inputTokens": 15235,
      "outputTokens": 660,
      "totalTokens": 15895,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-medium",
      "configurationId": "codex:gpt-6-astra@medium",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 33428,
      "inputTokens": 18071,
      "outputTokens": 949,
      "totalTokens": 19020,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-low",
      "configurationId": "codex:gpt-5.6-terra@low",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 19093,
      "inputTokens": 14486,
      "outputTokens": 519,
      "totalTokens": 15005,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-low",
      "configurationId": "codex:gpt-5.6-terra@low",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 20796,
      "inputTokens": 17322,
      "outputTokens": 897,
      "totalTokens": 18219,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 58.1,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 25340,
      "inputTokens": 14359,
      "outputTokens": 670,
      "totalTokens": 15029,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 141039,
      "inputTokens": 17197,
      "outputTokens": 3567,
      "totalTokens": 20764,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 400603,
      "inputTokens": 4,
      "outputTokens": 3444,
      "totalTokens": 23376,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 477915,
      "inputTokens": 4,
      "outputTokens": 3160,
      "totalTokens": 35798,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-high",
      "configurationId": "codex:gpt-5.6-luna@high",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 18092,
      "inputTokens": 12803,
      "outputTokens": 773,
      "totalTokens": 13576,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-high",
      "configurationId": "codex:gpt-5.6-luna@high",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 94264,
      "inputTokens": 15637,
      "outputTokens": 5049,
      "totalTokens": 20686,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-low",
      "configurationId": "codex:gpt-5.6-sol@low",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 23079,
      "inputTokens": 14363,
      "outputTokens": 670,
      "totalTokens": 15033,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-low",
      "configurationId": "codex:gpt-5.6-sol@low",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 40217,
      "inputTokens": 17197,
      "outputTokens": 1003,
      "totalTokens": 18200,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-xhigh",
      "configurationId": "codex:gpt-5.6-terra@xhigh",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 120093,
      "inputTokens": 14359,
      "outputTokens": 5565,
      "totalTokens": 19924,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-xhigh",
      "configurationId": "codex:gpt-5.6-terra@xhigh",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 130990,
      "inputTokens": 17318,
      "outputTokens": 7074,
      "totalTokens": 24392,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-medium",
      "configurationId": "codex:gpt-5.6-terra@medium",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 14449,
      "inputTokens": 14361,
      "outputTokens": 574,
      "totalTokens": 14935,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-medium",
      "configurationId": "codex:gpt-5.6-terra@medium",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 23682,
      "inputTokens": 17199,
      "outputTokens": 949,
      "totalTokens": 18148,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-low",
      "configurationId": "claude:opus@low",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 25194,
      "inputTokens": 2,
      "outputTokens": 1418,
      "totalTokens": 4276,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-low",
      "configurationId": "claude:opus@low",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 37853,
      "inputTokens": 2,
      "outputTokens": 2172,
      "totalTokens": 9678,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-max",
      "configurationId": "claude:opus@max",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 68059,
      "inputTokens": 2,
      "outputTokens": 4458,
      "totalTokens": 7316,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-max",
      "configurationId": "claude:opus@max",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 173888,
      "inputTokens": 2,
      "outputTokens": 11108,
      "totalTokens": 18614,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-medium",
      "configurationId": "codex:gpt-5.6-luna@medium",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 13409,
      "inputTokens": 12801,
      "outputTokens": 458,
      "totalTokens": 13259,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-medium",
      "configurationId": "codex:gpt-5.6-luna@medium",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 30523,
      "inputTokens": 15639,
      "outputTokens": 1472,
      "totalTokens": 17111,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-low",
      "configurationId": "codex:gpt-5.6-luna@low",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 13314,
      "inputTokens": 12805,
      "outputTokens": 504,
      "totalTokens": 13309,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-low",
      "configurationId": "codex:gpt-5.6-luna@low",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 19903,
      "inputTokens": 15637,
      "outputTokens": 918,
      "totalTokens": 16555,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 28327,
      "inputTokens": 2,
      "outputTokens": 1735,
      "totalTokens": 4593,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 45146,
      "inputTokens": 2,
      "outputTokens": 2665,
      "totalTokens": 10170,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 63271,
      "inputTokens": 2,
      "outputTokens": 4044,
      "totalTokens": 6900,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 125609,
      "inputTokens": 2,
      "outputTokens": 7975,
      "totalTokens": 15480,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-low",
      "configurationId": "claude:fable@low",
      "condition": "baseline",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 20245,
      "inputTokens": 2,
      "outputTokens": 1004,
      "totalTokens": 4210,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-low",
      "configurationId": "claude:fable@low",
      "condition": "skill",
      "benchmarkId": "personalized-home-feed",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 23691,
      "inputTokens": 2,
      "outputTokens": 1263,
      "totalTokens": 9114,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-ultra",
      "configurationId": "codex:gpt-6-astra@ultra",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 130653,
      "inputTokens": 15360,
      "outputTokens": 4226,
      "totalTokens": 19586,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-ultra",
      "configurationId": "codex:gpt-6-astra@ultra",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 98.8,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 110696,
      "inputTokens": 18196,
      "outputTokens": 3551,
      "totalTokens": 21747,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-xhigh",
      "configurationId": "codex:gpt-6-astra@xhigh",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 148017,
      "inputTokens": 15092,
      "outputTokens": 4812,
      "totalTokens": 19904,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-xhigh",
      "configurationId": "codex:gpt-6-astra@xhigh",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 97.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 96279,
      "inputTokens": 18149,
      "outputTokens": 2983,
      "totalTokens": 21132,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-high",
      "configurationId": "codex:gpt-6-astra@high",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 65561,
      "inputTokens": 15090,
      "outputTokens": 2063,
      "totalTokens": 17153,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-high",
      "configurationId": "codex:gpt-6-astra@high",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 95,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 53385,
      "inputTokens": 17930,
      "outputTokens": 1635,
      "totalTokens": 19565,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-low",
      "configurationId": "codex:gpt-6-astra@low",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 34858,
      "inputTokens": 15311,
      "outputTokens": 1034,
      "totalTokens": 16345,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-low",
      "configurationId": "codex:gpt-6-astra@low",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 95.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 26330,
      "inputTokens": 18147,
      "outputTokens": 697,
      "totalTokens": 18844,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-max",
      "configurationId": "codex:gpt-6-astra@max",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 446682,
      "inputTokens": 15090,
      "outputTokens": 11032,
      "totalTokens": 26122,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-max",
      "configurationId": "codex:gpt-6-astra@max",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 88.8,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 247425,
      "inputTokens": 17926,
      "outputTokens": 8126,
      "totalTokens": 26052,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-xhigh",
      "configurationId": "codex:gpt-5.6-sol@xhigh",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 281479,
      "inputTokens": 14435,
      "outputTokens": 8683,
      "totalTokens": 23118,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-xhigh",
      "configurationId": "codex:gpt-5.6-sol@xhigh",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 92.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 246093,
      "inputTokens": 17271,
      "outputTokens": 9304,
      "totalTokens": 26575,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-max",
      "configurationId": "codex:gpt-5.6-sol@max",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 558071,
      "inputTokens": 14439,
      "outputTokens": 16671,
      "totalTokens": 31110,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-max",
      "configurationId": "codex:gpt-5.6-sol@max",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 98.8,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 550640,
      "inputTokens": 17269,
      "outputTokens": 18236,
      "totalTokens": 35505,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-ultra",
      "configurationId": "codex:gpt-5.6-sol@ultra",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 82.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 351008,
      "inputTokens": 14446,
      "outputTokens": 10964,
      "totalTokens": 25410,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-ultra",
      "configurationId": "codex:gpt-5.6-sol@ultra",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 96.3,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 340649,
      "inputTokens": 17284,
      "outputTokens": 13449,
      "totalTokens": 30733,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-ultra",
      "configurationId": "codex:gpt-5.6-terra@ultra",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 91.3,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 177594,
      "inputTokens": 14444,
      "outputTokens": 9212,
      "totalTokens": 23656,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-ultra",
      "configurationId": "codex:gpt-5.6-terra@ultra",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 93.1,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 307095,
      "inputTokens": 17286,
      "outputTokens": 16889,
      "totalTokens": 34175,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-max",
      "configurationId": "claude:claude-fable-5-1@max",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 85.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 234283,
      "inputTokens": 2,
      "outputTokens": 17269,
      "totalTokens": 21295,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-max",
      "configurationId": "claude:claude-fable-5-1@max",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 97.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 243965,
      "inputTokens": 2,
      "outputTokens": 18084,
      "totalTokens": 26759,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-high",
      "configurationId": "codex:gpt-5.6-sol@high",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 202963,
      "inputTokens": 14435,
      "outputTokens": 6228,
      "totalTokens": 20663,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-high",
      "configurationId": "codex:gpt-5.6-sol@high",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 87.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 147962,
      "inputTokens": 17271,
      "outputTokens": 3574,
      "totalTokens": 20845,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-high",
      "configurationId": "claude:fable@high",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 39542,
      "inputTokens": 2,
      "outputTokens": 2409,
      "totalTokens": 5729,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-high",
      "configurationId": "claude:fable@high",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 84.4,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 46818,
      "inputTokens": 2,
      "outputTokens": 3114,
      "totalTokens": 11083,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-high",
      "configurationId": "claude:opus@high",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 88.8,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 61702,
      "inputTokens": 2,
      "outputTokens": 4054,
      "totalTokens": 7028,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-high",
      "configurationId": "claude:opus@high",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 92.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 150110,
      "inputTokens": 2,
      "outputTokens": 9811,
      "totalTokens": 17433,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-max",
      "configurationId": "claude:fable@max",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 110405,
      "inputTokens": 2,
      "outputTokens": 7821,
      "totalTokens": 11141,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-max",
      "configurationId": "claude:fable@max",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 92.5,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 99183,
      "inputTokens": 2,
      "outputTokens": 6809,
      "totalTokens": 14776,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-max",
      "configurationId": "codex:gpt-5.6-terra@max",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 169466,
      "inputTokens": 14435,
      "outputTokens": 9222,
      "totalTokens": 23657,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-max",
      "configurationId": "codex:gpt-5.6-terra@max",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 91.3,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 283375,
      "inputTokens": 17275,
      "outputTokens": 15565,
      "totalTokens": 32840,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-xhigh",
      "configurationId": "codex:gpt-5.6-luna@xhigh",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 247131,
      "inputTokens": 12879,
      "outputTokens": 13386,
      "totalTokens": 26265,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-xhigh",
      "configurationId": "codex:gpt-5.6-luna@xhigh",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 80,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 418442,
      "inputTokens": 15507,
      "outputTokens": 23084,
      "totalTokens": 38591,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-medium",
      "configurationId": "claude:fable@medium",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 29205,
      "inputTokens": 2,
      "outputTokens": 1774,
      "totalTokens": 5094,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-medium",
      "configurationId": "claude:fable@medium",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 88.1,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 33155,
      "inputTokens": 2,
      "outputTokens": 2072,
      "totalTokens": 10040,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-xhigh",
      "configurationId": "claude:fable@xhigh",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 76.9,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 42022,
      "inputTokens": 2,
      "outputTokens": 2655,
      "totalTokens": 5974,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-xhigh",
      "configurationId": "claude:fable@xhigh",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 91.9,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 65292,
      "inputTokens": 2,
      "outputTokens": 4469,
      "totalTokens": 12437,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-high",
      "configurationId": "codex:gpt-5.6-terra@high",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 23016,
      "inputTokens": 14437,
      "outputTokens": 869,
      "totalTokens": 15306,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-high",
      "configurationId": "codex:gpt-5.6-terra@high",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 81.9,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 19597,
      "inputTokens": 17271,
      "outputTokens": 853,
      "totalTokens": 18124,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-xhigh",
      "configurationId": "claude:claude-fable-5-1@xhigh",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 134554,
      "inputTokens": 2,
      "outputTokens": 9577,
      "totalTokens": 13603,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-xhigh",
      "configurationId": "claude:claude-fable-5-1@xhigh",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 90.6,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 136076,
      "inputTokens": 2,
      "outputTokens": 10004,
      "totalTokens": 18677,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-max",
      "configurationId": "codex:gpt-5.6-luna@max",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 383866,
      "inputTokens": 12875,
      "outputTokens": 21145,
      "totalTokens": 34020,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-max",
      "configurationId": "codex:gpt-5.6-luna@max",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 373791,
      "inputTokens": 15713,
      "outputTokens": 20595,
      "totalTokens": 36308,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-medium",
      "configurationId": "codex:gpt-6-astra@medium",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 44173,
      "inputTokens": 15313,
      "outputTokens": 1318,
      "totalTokens": 16631,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-6-astra-medium",
      "configurationId": "codex:gpt-6-astra@medium",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 33668,
      "inputTokens": 18149,
      "outputTokens": 949,
      "totalTokens": 19098,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-low",
      "configurationId": "codex:gpt-5.6-terra@low",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 10367,
      "inputTokens": 14435,
      "outputTokens": 368,
      "totalTokens": 14803,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-low",
      "configurationId": "codex:gpt-5.6-terra@low",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 19496,
      "inputTokens": 17271,
      "outputTokens": 876,
      "totalTokens": 18147,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 83.1,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 71569,
      "inputTokens": 14439,
      "outputTokens": 2083,
      "totalTokens": 16522,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 107024,
      "inputTokens": 17275,
      "outputTokens": 2566,
      "totalTokens": 19841,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 86.3,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 419662,
      "inputTokens": 4,
      "outputTokens": 5837,
      "totalTokens": 25707,
      "costUsd": null
    },
    {
      "settingId": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 395169,
      "inputTokens": 4,
      "outputTokens": 1699,
      "totalTokens": 34781,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-high",
      "configurationId": "codex:gpt-5.6-luna@high",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 78.8,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 102865,
      "inputTokens": 12877,
      "outputTokens": 5586,
      "totalTokens": 18463,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-high",
      "configurationId": "codex:gpt-5.6-luna@high",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 85955,
      "inputTokens": 15715,
      "outputTokens": 4644,
      "totalTokens": 20359,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-low",
      "configurationId": "codex:gpt-5.6-sol@low",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 40950,
      "inputTokens": 14435,
      "outputTokens": 950,
      "totalTokens": 15385,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-sol-low",
      "configurationId": "codex:gpt-5.6-sol@low",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 72670,
      "inputTokens": 17271,
      "outputTokens": 1758,
      "totalTokens": 19029,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-xhigh",
      "configurationId": "codex:gpt-5.6-terra@xhigh",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 21280,
      "inputTokens": 14435,
      "outputTokens": 946,
      "totalTokens": 15381,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-xhigh",
      "configurationId": "codex:gpt-5.6-terra@xhigh",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 51063,
      "inputTokens": 17271,
      "outputTokens": 2513,
      "totalTokens": 19784,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-medium",
      "configurationId": "codex:gpt-5.6-terra@medium",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 10160,
      "inputTokens": 14437,
      "outputTokens": 368,
      "totalTokens": 14805,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-terra-medium",
      "configurationId": "codex:gpt-5.6-terra@medium",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 19750,
      "inputTokens": 17271,
      "outputTokens": 863,
      "totalTokens": 18134,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-low",
      "configurationId": "claude:opus@low",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 24135,
      "inputTokens": 2,
      "outputTokens": 1538,
      "totalTokens": 4512,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-low",
      "configurationId": "claude:opus@low",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 40271,
      "inputTokens": 2,
      "outputTokens": 2517,
      "totalTokens": 10138,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-max",
      "configurationId": "claude:opus@max",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 154780,
      "inputTokens": 2,
      "outputTokens": 10487,
      "totalTokens": 13461,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-max",
      "configurationId": "claude:opus@max",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 429506,
      "inputTokens": 4,
      "outputTokens": 12292,
      "totalTokens": 27536,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-medium",
      "configurationId": "codex:gpt-5.6-luna@medium",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 17651,
      "inputTokens": 12879,
      "outputTokens": 833,
      "totalTokens": 13712,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-medium",
      "configurationId": "codex:gpt-5.6-luna@medium",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 21022,
      "inputTokens": 15713,
      "outputTokens": 962,
      "totalTokens": 16675,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-low",
      "configurationId": "codex:gpt-5.6-luna@low",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 16044,
      "inputTokens": 12877,
      "outputTokens": 747,
      "totalTokens": 13624,
      "costUsd": null
    },
    {
      "settingId": "codex-gpt-5-6-luna-low",
      "configurationId": "codex:gpt-5.6-luna@low",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 16861,
      "inputTokens": 15715,
      "outputTokens": 793,
      "totalTokens": 16508,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 59,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 50102,
      "inputTokens": 2,
      "outputTokens": 3197,
      "totalTokens": 6169,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 46697,
      "inputTokens": 2,
      "outputTokens": 2936,
      "totalTokens": 10558,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 82092,
      "inputTokens": 2,
      "outputTokens": 5602,
      "totalTokens": 8575,
      "costUsd": null
    },
    {
      "settingId": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 184148,
      "inputTokens": 2,
      "outputTokens": 12243,
      "totalTokens": 19865,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-low",
      "configurationId": "claude:fable@low",
      "condition": "baseline",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 18151,
      "inputTokens": 2,
      "outputTokens": 981,
      "totalTokens": 4300,
      "costUsd": null
    },
    {
      "settingId": "claude-fable-low",
      "configurationId": "claude:fable@low",
      "condition": "skill",
      "benchmarkId": "device-telemetry",
      "category": "engineering",
      "score": 49,
      "trials": 1,
      "calibrated": false,
      "status": "development",
      "latencyMs": 21454,
      "inputTokens": 2,
      "outputTokens": 1175,
      "totalTokens": 9143,
      "costUsd": null
    }
  ],
  "benchmarkSummaries": [
    {
      "benchmarkId": "hyper-scale-chat",
      "runId": "2026-09-04T22-09-30Z__rejudge__d7490f32658c",
      "status": "development",
      "verification": "unverified",
      "blockers": [
        {
          "code": "author-calibration-pending",
          "message": "Author calibration is pending for all three development runs."
        },
        {
          "code": "panel-audit-required",
          "message": "Saved judging panels require independent audit before verified claims."
        },
        {
          "code": "public-eligibility-unverified",
          "message": "The shared public-result eligibility validator has not verified these development runs."
        }
      ],
      "evidenceKind": "development",
      "baselineLabel": "Minimal baseline",
      "treatmentLabel": "Architecture skill",
      "baseline": 46.1,
      "treatment": 61,
      "delta": 15,
      "wins": 32,
      "ties": 3,
      "losses": 1,
      "complete": 72,
      "total": 72,
      "completionLabel": "responses",
      "calibration": "Calibration pending",
      "judgingScope": {
        "strategy": "saved-responses-full-rescore-v1",
        "responseCount": 72,
        "generationReused": true,
        "sourceScoresPreserved": false
      },
      "detailHref": "./benchmark-report.html#hyper-scale-chat",
      "sourceHref": null
    },
    {
      "benchmarkId": "personalized-home-feed",
      "runId": "2026-09-04T22-33-49Z__rejudge__1d7e5cf5fcdf",
      "status": "development",
      "verification": "unverified",
      "blockers": [
        {
          "code": "author-calibration-pending",
          "message": "Author calibration is pending for all three development runs."
        },
        {
          "code": "panel-audit-required",
          "message": "Saved judging panels require independent audit before verified claims."
        },
        {
          "code": "public-eligibility-unverified",
          "message": "The shared public-result eligibility validator has not verified these development runs."
        }
      ],
      "evidenceKind": "development",
      "baselineLabel": "Minimal baseline",
      "treatmentLabel": "Architecture skill",
      "baseline": 52.4,
      "treatment": 55.2,
      "delta": 2.8,
      "wins": 13,
      "ties": 20,
      "losses": 3,
      "complete": 72,
      "total": 72,
      "completionLabel": "responses",
      "calibration": "Calibration pending",
      "judgingScope": {
        "strategy": "saved-responses-full-rescore-v1",
        "responseCount": 72,
        "generationReused": true,
        "sourceScoresPreserved": false
      },
      "detailHref": "./benchmark-report.html#personalized-home-feed",
      "sourceHref": null
    },
    {
      "benchmarkId": "device-telemetry",
      "runId": "2026-09-04T22-33-50Z__rejudge__0995e097a929",
      "status": "development",
      "verification": "unverified",
      "blockers": [
        {
          "code": "author-calibration-pending",
          "message": "Author calibration is pending for all three development runs."
        },
        {
          "code": "panel-audit-required",
          "message": "Saved judging panels require independent audit before verified claims."
        },
        {
          "code": "public-eligibility-unverified",
          "message": "The shared public-result eligibility validator has not verified these development runs."
        }
      ],
      "evidenceKind": "development",
      "baselineLabel": "Minimal baseline",
      "treatmentLabel": "Architecture skill",
      "baseline": 57.6,
      "treatment": 73.6,
      "delta": 15.9,
      "wins": 22,
      "ties": 9,
      "losses": 5,
      "complete": 72,
      "total": 72,
      "completionLabel": "responses",
      "calibration": "Calibration pending",
      "judgingScope": {
        "strategy": "saved-responses-full-rescore-v1",
        "responseCount": 72,
        "generationReused": true,
        "sourceScoresPreserved": false
      },
      "detailHref": "./benchmark-report.html#device-telemetry",
      "sourceHref": null
    }
  ],
  "categoryLeaders": [
    {
      "category": "engineering",
      "entry": {
        "id": "codex-gpt-6-astra-ultra-skill",
        "settingId": "codex-gpt-6-astra-ultra",
        "configurationId": "codex:gpt-6-astra@ultra",
        "modelId": "codex:gpt-6-astra",
        "provider": "codex",
        "family": "GPT-6 Astra",
        "reasoning": "ultra",
        "label": "GPT-6 Astra · ultra",
        "condition": "skill",
        "conditionLabel": "Architecture skill",
        "score": 79.5,
        "baselineScore": 52.3,
        "delta": 27.1,
        "categories": [
          {
            "category": "engineering",
            "score": 79.5
          }
        ],
        "baselineCategories": [
          {
            "category": "engineering",
            "score": 52.3
          }
        ],
        "cost": null,
        "latency": 101.128,
        "tokens": 3242,
        "metrics": {
          "sampleCount": 3,
          "meanLatencyMs": 101128,
          "meanInputTokens": 17971,
          "meanOutputTokens": 3242,
          "meanTotalTokens": 21213,
          "costUsd": null
        },
        "rank": 1,
        "categoryScore": 79.5
      }
    }
  ],
  "efficientFrontier": [],
  "regressions": [
    {
      "id": "claude-claude-fable-5-1-ultracode-skill",
      "settingId": "claude-claude-fable-5-1-ultracode",
      "configurationId": "claude:claude-fable-5-1@ultracode",
      "modelId": "claude:claude-fable-5-1",
      "provider": "claude",
      "family": "Claude Fable 5.1",
      "reasoning": "ultracode",
      "label": "Claude Fable 5.1 · ultracode",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 55.7,
      "baselineScore": 61.4,
      "delta": -5.8,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 61.4
        }
      ],
      "cost": null,
      "latency": 438.164,
      "tokens": 2202.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 438164,
        "meanInputTokens": 4,
        "meanOutputTokens": 2202.3,
        "meanTotalTokens": 32767,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "codex-gpt-5-6-sol-medium-skill",
      "settingId": "codex-gpt-5-6-sol-medium",
      "configurationId": "codex:gpt-5.6-sol@medium",
      "modelId": "codex:gpt-5.6-sol",
      "provider": "codex",
      "family": "GPT-5.6 Sol",
      "reasoning": "medium",
      "label": "GPT-5.6 Sol · medium",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 55.7,
      "baselineScore": 65.6,
      "delta": -9.9,
      "categories": [
        {
          "category": "engineering",
          "score": 55.7
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 65.6
        }
      ],
      "cost": null,
      "latency": 93.381,
      "tokens": 2329.3,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 93381.3,
        "meanInputTokens": 17198,
        "meanOutputTokens": 2329.3,
        "meanTotalTokens": 19527.3,
        "costUsd": null
      },
      "rank": 30
    },
    {
      "id": "claude-opus-medium-skill",
      "settingId": "claude-opus-medium",
      "configurationId": "claude:opus@medium",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "medium",
      "label": "Claude Opus 5 · medium",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 49,
      "baselineScore": 55,
      "delta": -6,
      "categories": [
        {
          "category": "engineering",
          "score": 49
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 55
        }
      ],
      "cost": null,
      "latency": 48.864,
      "tokens": 2964,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 48863.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 2964,
        "meanTotalTokens": 10467,
        "costUsd": null
      },
      "rank": 53
    },
    {
      "id": "claude-opus-xhigh-skill",
      "settingId": "claude-opus-xhigh",
      "configurationId": "claude:opus@xhigh",
      "modelId": "claude:opus",
      "provider": "claude",
      "family": "Claude Opus 5",
      "reasoning": "xhigh",
      "label": "Claude Opus 5 · xhigh",
      "condition": "skill",
      "conditionLabel": "Architecture skill",
      "score": 49,
      "baselineScore": 49.8,
      "delta": -0.8,
      "categories": [
        {
          "category": "engineering",
          "score": 49
        }
      ],
      "baselineCategories": [
        {
          "category": "engineering",
          "score": 49.8
        }
      ],
      "cost": null,
      "latency": 134.077,
      "tokens": 8684.7,
      "metrics": {
        "sampleCount": 3,
        "meanLatencyMs": 134076.7,
        "meanInputTokens": 2,
        "meanOutputTokens": 8684.7,
        "meanTotalTokens": 16187.7,
        "costUsd": null
      },
      "rank": 53
    }
  ],
  "callouts": {
    "overall": "GPT-6 Astra · ultra with Architecture skill leads the development snapshot at 79.5 development rubric score.",
    "value": "Cost comparison is withheld because response-level provider cost coverage is incomplete.",
    "regression": "4 of 36 matched settings score lower with the Architecture skill across the fixed three-task score edition.",
    "category": "Engineering contains 67 improved, 32 tied, and 9 lower prompt-level matched outcomes."
  },
  "availability": {
    "status": "development",
    "verification": "unverified",
    "code": "development-unverified-results",
    "message": "Development results — not verified benchmark claims.",
    "detail": "Three complete matched runs are shown for development inspection; author calibration and shared public eligibility remain pending.",
    "blockers": [
      {
        "code": "author-calibration-pending",
        "message": "Author calibration is pending for all three development runs."
      },
      {
        "code": "panel-audit-required",
        "message": "Saved judging panels require independent audit before verified claims."
      },
      {
        "code": "public-eligibility-unverified",
        "message": "The shared public-result eligibility validator has not verified these development runs."
      }
    ]
  },
  "counts": {
    "families": 1,
    "tracks": 1,
    "benchmarks": 3,
    "categories": 1,
    "conditions": 2,
    "settings": 36,
    "resultEntries": 72,
    "responses": 216,
    "developmentResultSets": 3,
    "eligibleResultSets": 0,
    "withheldResultSets": 0
  }
});
}());

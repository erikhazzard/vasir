(function () {
  'use strict';

  window.VASIR_DATA = Object.freeze({
  "kind": "vasirbenchmark-public-projection",
  "schemaVersion": 3,
  "program": {
    "id": "vasirbench",
    "title": "VasirBench",
    "taxonomyVersion": "vasir-capabilities-development-v6",
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
  },
  "aiWorkflows": {
    "kind": "vasirbenchmark-work-spec-projection",
    "schemaVersion": 1,
    "program": {
      "id": "vasirbench",
      "title": "VasirBench",
      "status": "development",
      "evidenceStatus": "development",
      "verification": "unverified"
    },
    "meta": {
      "release": "Development snapshot · September 2026",
      "status": "Exploratory development results · unverified",
      "categories": 1,
      "benchmarks": 1,
      "settings": 26,
      "conditions": 2,
      "trials": 1,
      "aggregateCells": 52,
      "runs": 1,
      "calibration": 0,
      "vasirVersion": null
    },
    "scoreBasis": {
      "id": "work-spec-generation-v1:747d4e4276a0990cfdf687ba723b5db32308a7a3883d3e5916bbdd2c18f9b2c3",
      "label": "Work Specs v1",
      "edition": "work-spec-generation-v1",
      "method": "equal-benchmark-absolute-mean-v1",
      "unit": "rubric-points",
      "range": {
        "minimum": 0,
        "maximum": 100
      },
      "benchmarkWeighting": "equal",
      "benchmarkIds": [
        "work-spec-chat"
      ],
      "taskCount": 1,
      "trialsPerTask": 1,
      "judgeCount": 2,
      "judges": [
        "codex:gpt-6-astra@xhigh",
        "claude:claude-fable-5-1@max"
      ],
      "aggregation": "mean-weighted-dimensions-no-gates-v1",
      "batchUnit": "individual-response",
      "effectMethod": "paired-absolute-delta-v1",
      "effectUnit": "rubric-points",
      "calibrationStatus": "development-uncalibrated",
      "uncertainty": {
        "status": "not-estimated",
        "reason": "One authored scenario and one trial per condition; human calibration and downstream implementation validation remain pending."
      },
      "weights": {
        "V": 25,
        "G": 15,
        "A": 20,
        "D": 15,
        "S": 15,
        "C": 10
      },
      "ratingMaximum": 4,
      "gates": null,
      "caps": null,
      "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
      "inputSha256": {
        "task": "e80a5df3e154c68fbe8fe869a354fd617556f9a231199ded5837f63590969371",
        "treatment": "d0258c2a838d17f44d83e57551997e73c167e8dbe880b99fd139a75d7f733570",
        "rubric": "7b6229a59a12fb8c2da467fc38303a91f414c2cee442305eeb26ac0d5eb4b263",
        "adapter": "6a8e474c2689de6f48fd3854e996881f3784db1a6e451eaef55b4cb43f409f28"
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
        "sourceId": "skill:plan__maintain-work-spec",
        "short": "Work spec",
        "label": "Work-spec skill",
        "color": "#1f6fff",
        "shape": "square"
      }
    ],
    "categories": [
      {
        "id": "ai-workflows",
        "name": "AI Workflows",
        "title": "AI Workflows",
        "short": "AI",
        "weight": 1,
        "color": "#7650bc",
        "trackIds": [
          "work-specification"
        ]
      }
    ],
    "families": [
      {
        "id": "ai-workflows",
        "title": "AI Workflows",
        "description": "Useful specifications that preserve product intent and direct subsequent work.",
        "trackIds": [
          "work-specification"
        ]
      }
    ],
    "tracks": [
      {
        "id": "work-specification",
        "familyId": "ai-workflows",
        "title": "Work Specification",
        "description": "Product intent, observable behavior, and useful direction for subsequent work.",
        "benchmarkIds": [
          "work-spec-chat"
        ],
        "resultAvailability": {
          "status": "development",
          "verification": "unverified",
          "code": "development-unverified-results",
          "message": "Exploratory development results — unverified.",
          "detail": "One scenario, one trial, two independent judges; human calibration and downstream validation remain pending.",
          "blockers": [
            {
              "code": "author-calibration-pending",
              "message": "Human calibration and downstream implementation validation are pending."
            }
          ]
        }
      }
    ],
    "benchmarks": [
      {
        "id": "work-spec-chat",
        "trackId": "work-specification",
        "familyId": "ai-workflows",
        "category": "ai-workflows",
        "suite": "Work Specification",
        "name": "Work spec: private web chat",
        "title": "Work spec: private web chat",
        "description": "Compares complete work specifications for a mobile-friendly private chat app supporting ten million simultaneous connections, using a frozen task and skill treatment.",
        "taskKind": "work-spec-generation",
        "task": {
          "id": "ten-million-concurrent-chat",
          "text": "Write a work spec for building a mobile-friendly web chat app that can support **10 million simultaneously connected users**.\n\nThe product helps friends and small groups coordinate plans. A person should be able to invite others into a private conversation, exchange messages, leave, and return without losing the conversation or being unsure whether their own message was sent.\n\nThe initial product needs:\n\n- Account sign-in, one-to-one conversations, and private group conversations with up to 50 members. A user can create a group and invite another person who can join it.\n- Text messages and conversation history on mobile and desktop browsers. People can return later and continue where they left off.\n- Honest message status during slow or interrupted connections. A brief disconnection, reconnect, or retry must not silently lose a message or display duplicate copies of the same send.\n- Private membership: people outside a conversation cannot read its messages, and removing a member stops their access to future messages.\n- A usable, responsive conversation experience as the service grows to the stated concurrency target.\n\nVoice/video, attachments, public channels, bots, payments, and end-to-end encryption are outside this task. This does not remove ordinary account security or conversation privacy.\n\nThis is a greenfield benchmark scenario, not an existing repository. There is no implemented chat backend, existing schema, or approved technology choice to inherit. Ten million means concurrent connections, not registered accounts or messages per second. Message rates, regional distribution, retention duration, numerical latency targets, operating budget, and rollout timing have not yet been determined. The concurrency target is a requirement; the other unknowns are not measured facts.\n\nProduce the work spec an implementation team could use to begin this work and carry it through to the intended product. Return Markdown, including any supporting material needed to understand the spec. Do not implement the application.\n"
        },
        "prompt": "Write a work spec for building a mobile-friendly web chat app that can support **10 million simultaneously connected users**.\n\nThe product helps friends and small groups coordinate plans. A person should be able to invite others into a private conversation, exchange messages, leave, and return without losing the conversation or being unsure whether their own message was sent.\n\nThe initial product needs:\n\n- Account sign-in, one-to-one conversations, and private group conversations with up to 50 members. A user can create a group and invite another person who can join it.\n- Text messages and conversation history on mobile and desktop browsers. People can return later and continue where they left off.\n- Honest message status during slow or interrupted connections. A brief disconnection, reconnect, or retry must not silently lose a message or display duplicate copies of the same send.\n- Private membership: people outside a conversation cannot read its messages, and removing a member stops their access to future messages.\n- A usable, responsive conversation experience as the service grows to the stated concurrency target.\n\nVoice/video, attachments, public channels, bots, payments, and end-to-end encryption are outside this task. This does not remove ordinary account security or conversation privacy.\n\nThis is a greenfield benchmark scenario, not an existing repository. There is no implemented chat backend, existing schema, or approved technology choice to inherit. Ten million means concurrent connections, not registered accounts or messages per second. Message rates, regional distribution, retention duration, numerical latency targets, operating budget, and rollout timing have not yet been determined. The concurrency target is a requirement; the other unknowns are not measured facts.\n\nProduce the work spec an implementation team could use to begin this work and carry it through to the intended product. Return Markdown, including any supporting material needed to understand the spec. Do not implement the application.\n",
        "judging": {
          "panel": [
            "codex:gpt-6-astra@xhigh",
            "claude:claude-fable-5-1@max"
          ],
          "synthesizer": null
        },
        "limitations": [
          "One authored chat scenario and one trial per condition; this does not establish performance across AI workflows.",
          "The rubric is not yet calibrated against human judgments or downstream implementation outcomes.",
          "The treatment is the frozen work-spec skill plus its required dependency excerpts; it is not Full Vasir.",
          "The judges also appear among the candidates. Candidates are anonymized, but judge agreement does not establish correctness.",
          "Readiness is reported separately from the numerical score; disagreements remain unresolved."
        ],
        "reportFragment": "work-spec-chat",
        "detailHref": "benchmark-report.html#work-spec-chat",
        "evidenceKind": "development",
        "resultAvailability": {
          "status": "development",
          "verification": "unverified",
          "code": "development-unverified-results",
          "message": "Exploratory development results — unverified.",
          "detail": "One scenario, one trial, two independent judges; human calibration and downstream validation remain pending.",
          "blockers": [
            {
              "code": "author-calibration-pending",
              "message": "Human calibration and downstream implementation validation are pending."
            }
          ]
        },
        "measured": {
          "baseline": 87.4,
          "treatment": 94.6,
          "delta": 7.2,
          "wins": 26,
          "ties": 0,
          "losses": 0,
          "complete": 52,
          "total": 52,
          "treatmentLabel": "Work-spec skill",
          "calibration": "Calibration pending"
        }
      }
    ],
    "results": [
      {
        "benchmarkId": "work-spec-chat",
        "runId": "2026-09-05T05-06-00Z__chat__expanded-26",
        "readinessLabel": "Readiness varies by candidate",
        "assessmentStatus": "assessable",
        "completedAt": null,
        "status": "development",
        "verification": "unverified",
        "blockers": [
          {
            "code": "author-calibration-pending",
            "message": "Human calibration and downstream implementation validation are pending."
          }
        ],
        "judgingScope": {
          "mode": "independent-response-panel",
          "aggregationMethod": "mean-weighted-dimensions-no-gates-v1",
          "judgeCount": 2,
          "responseCount": 52,
          "completedJudgmentCount": 104,
          "gates": null,
          "caps": null
        },
        "baselineScore": 87.4,
        "treatmentScore": 94.6,
        "delta": 7.2,
        "record": {
          "wins": 26,
          "ties": 0,
          "losses": 0
        },
        "responseCount": 52,
        "matchedConfigurationCount": 26,
        "configurations": [
          {
            "settingId": "codex-gpt-6-astra-ultra",
            "configurationId": "codex:gpt-6-astra@ultra",
            "baselineScore": 96.3,
            "treatmentScore": 100,
            "delta": 3.8,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 605492,
              "meanInputTokens": 15627,
              "meanOutputTokens": 13523,
              "meanTotalTokens": 29150,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 797136,
              "meanInputTokens": 20843,
              "meanOutputTokens": 17210,
              "meanTotalTokens": 38053,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-6-astra-xhigh",
            "configurationId": "codex:gpt-6-astra@xhigh",
            "baselineScore": 96.3,
            "treatmentScore": 100,
            "delta": 3.8,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 748479,
              "meanInputTokens": 15580,
              "meanOutputTokens": 15845,
              "meanTotalTokens": 31425,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 822706,
              "meanInputTokens": 20796,
              "meanOutputTokens": 19305,
              "meanTotalTokens": 40101,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-sol-max",
            "configurationId": "codex:gpt-5.6-sol@max",
            "baselineScore": 93.8,
            "treatmentScore": 98.8,
            "delta": 5,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 738419,
              "meanInputTokens": 14687,
              "meanOutputTokens": 38199,
              "meanTotalTokens": 52886,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 918743,
              "meanInputTokens": 19903,
              "meanOutputTokens": 41384,
              "meanTotalTokens": 61287,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-luna-max",
            "configurationId": "codex:gpt-5.6-luna@max",
            "baselineScore": 88.1,
            "treatmentScore": 98.1,
            "delta": 10,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 538181,
              "meanInputTokens": 12898,
              "meanOutputTokens": 29742,
              "meanTotalTokens": 42640,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 537415,
              "meanInputTokens": 18116,
              "meanOutputTokens": 29591,
              "meanTotalTokens": 47707,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-sol-high",
            "configurationId": "codex:gpt-5.6-sol@high",
            "baselineScore": 94.4,
            "treatmentScore": 98.1,
            "delta": 3.8,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 302361,
              "meanInputTokens": 14687,
              "meanOutputTokens": 12331,
              "meanTotalTokens": 27018,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 457934,
              "meanInputTokens": 19903,
              "meanOutputTokens": 19684,
              "meanTotalTokens": 39587,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-sol-medium",
            "configurationId": "codex:gpt-5.6-sol@medium",
            "baselineScore": 85,
            "treatmentScore": 97.5,
            "delta": 12.5,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 189194,
              "meanInputTokens": 14685,
              "meanOutputTokens": 7878,
              "meanTotalTokens": 22563,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 335978,
              "meanInputTokens": 19903,
              "meanOutputTokens": 14111,
              "meanTotalTokens": 34014,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-sol-ultra",
            "configurationId": "codex:gpt-5.6-sol@ultra",
            "baselineScore": 93.1,
            "treatmentScore": 97.5,
            "delta": 4.4,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 759055,
              "meanInputTokens": 14732,
              "meanOutputTokens": 37324,
              "meanTotalTokens": 52056,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 892537,
              "meanInputTokens": 19952,
              "meanOutputTokens": 37982,
              "meanTotalTokens": 57934,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-luna-xhigh",
            "configurationId": "codex:gpt-5.6-luna@xhigh",
            "baselineScore": 85,
            "treatmentScore": 96.9,
            "delta": 11.9,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 254897,
              "meanInputTokens": 12900,
              "meanOutputTokens": 13892,
              "meanTotalTokens": 26792,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 356298,
              "meanInputTokens": 18114,
              "meanOutputTokens": 19519,
              "meanTotalTokens": 37633,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-sol-xhigh",
            "configurationId": "codex:gpt-5.6-sol@xhigh",
            "baselineScore": 93.1,
            "treatmentScore": 96.9,
            "delta": 3.8,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 517320,
              "meanInputTokens": 14685,
              "meanOutputTokens": 20824,
              "meanTotalTokens": 35509,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 508220,
              "meanInputTokens": 19903,
              "meanOutputTokens": 21917,
              "meanTotalTokens": 41820,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-terra-max",
            "configurationId": "codex:gpt-5.6-terra@max",
            "baselineScore": 86.3,
            "treatmentScore": 96.3,
            "delta": 10,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 739223,
              "meanInputTokens": 14463,
              "meanOutputTokens": 40779,
              "meanTotalTokens": 55242,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 742781,
              "meanInputTokens": 19903,
              "meanOutputTokens": 41033,
              "meanTotalTokens": 60936,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-terra-xhigh",
            "configurationId": "codex:gpt-5.6-terra@xhigh",
            "baselineScore": 81.3,
            "treatmentScore": 96.3,
            "delta": 15,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 287365,
              "meanInputTokens": 14467,
              "meanOutputTokens": 15788,
              "meanTotalTokens": 30255,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 264301,
              "meanInputTokens": 19681,
              "meanOutputTokens": 14475,
              "meanTotalTokens": 34156,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-sol-low",
            "configurationId": "codex:gpt-5.6-sol@low",
            "baselineScore": 82.5,
            "treatmentScore": 95.6,
            "delta": 13.1,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 200448,
              "meanInputTokens": 14687,
              "meanOutputTokens": 9306,
              "meanTotalTokens": 23993,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 208000,
              "meanInputTokens": 19899,
              "meanOutputTokens": 8776,
              "meanTotalTokens": 28675,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-terra-low",
            "configurationId": "codex:gpt-5.6-terra@low",
            "baselineScore": 91.3,
            "treatmentScore": 95.6,
            "delta": 4.4,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 111709,
              "meanInputTokens": 14687,
              "meanOutputTokens": 5819,
              "meanTotalTokens": 20506,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 105134,
              "meanInputTokens": 19903,
              "meanOutputTokens": 5484,
              "meanTotalTokens": 25387,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-terra-medium",
            "configurationId": "codex:gpt-5.6-terra@medium",
            "baselineScore": 86.3,
            "treatmentScore": 95.6,
            "delta": 9.4,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 103415,
              "meanInputTokens": 14687,
              "meanOutputTokens": 5580,
              "meanTotalTokens": 20267,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 100786,
              "meanInputTokens": 19679,
              "meanOutputTokens": 5380,
              "meanTotalTokens": 25059,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-terra-high",
            "configurationId": "codex:gpt-5.6-terra@high",
            "baselineScore": 94.4,
            "treatmentScore": 95,
            "delta": 0.6,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 120032,
              "meanInputTokens": 14685,
              "meanOutputTokens": 6487,
              "meanTotalTokens": 21172,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 127943,
              "meanInputTokens": 19683,
              "meanOutputTokens": 6950,
              "meanTotalTokens": 26633,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-terra-ultra",
            "configurationId": "codex:gpt-5.6-terra@ultra",
            "baselineScore": 81.9,
            "treatmentScore": 94.4,
            "delta": 12.5,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 594814,
              "meanInputTokens": 14514,
              "meanOutputTokens": 32867,
              "meanTotalTokens": 47381,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 535144,
              "meanInputTokens": 19952,
              "meanOutputTokens": 29529,
              "meanTotalTokens": 49481,
              "costUsd": null
            }
          },
          {
            "settingId": "claude-opus-xhigh",
            "configurationId": "claude:opus@xhigh",
            "baselineScore": 77.5,
            "treatmentScore": 93.8,
            "delta": 16.3,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 742621,
              "meanInputTokens": 2,
              "meanOutputTokens": 53419,
              "meanTotalTokens": 56965,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 396913,
              "meanInputTokens": 2,
              "meanOutputTokens": 27707,
              "meanTotalTokens": 39906,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-luna-low",
            "configurationId": "codex:gpt-5.6-luna@low",
            "baselineScore": 91.9,
            "treatmentScore": 93.8,
            "delta": 1.9,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 110125,
              "meanInputTokens": 12896,
              "meanOutputTokens": 5885,
              "meanTotalTokens": 18781,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 103574,
              "meanInputTokens": 18338,
              "meanOutputTokens": 5493,
              "meanTotalTokens": 23831,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-luna-medium",
            "configurationId": "codex:gpt-5.6-luna@medium",
            "baselineScore": 86.9,
            "treatmentScore": 93.1,
            "delta": 6.3,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 115502,
              "meanInputTokens": 12898,
              "meanOutputTokens": 6271,
              "meanTotalTokens": 19169,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 126799,
              "meanInputTokens": 18116,
              "meanOutputTokens": 6869,
              "meanTotalTokens": 24985,
              "costUsd": null
            }
          },
          {
            "settingId": "claude-claude-fable-5-1-max",
            "configurationId": "claude:claude-fable-5-1@max",
            "baselineScore": 88.1,
            "treatmentScore": 92.5,
            "delta": 4.4,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 1099068,
              "meanInputTokens": 6,
              "meanOutputTokens": 83137,
              "meanTotalTokens": 156064,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 889385,
              "meanInputTokens": 2,
              "meanOutputTokens": 63655,
              "meanTotalTokens": 76739,
              "costUsd": null
            }
          },
          {
            "settingId": "claude-claude-fable-5-1-xhigh",
            "configurationId": "claude:claude-fable-5-1@xhigh",
            "baselineScore": 90.6,
            "treatmentScore": 91.9,
            "delta": 1.3,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 622916,
              "meanInputTokens": 2,
              "meanOutputTokens": 44990,
              "meanTotalTokens": 49420,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 642489,
              "meanInputTokens": 2,
              "meanOutputTokens": 46807,
              "meanTotalTokens": 59890,
              "costUsd": null
            }
          },
          {
            "settingId": "codex-gpt-5-6-luna-high",
            "configurationId": "codex:gpt-5.6-luna@high",
            "baselineScore": 85,
            "treatmentScore": 91.9,
            "delta": 6.9,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 190549,
              "meanInputTokens": 12900,
              "meanOutputTokens": 10316,
              "meanTotalTokens": 23216,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 207373,
              "meanInputTokens": 18116,
              "meanOutputTokens": 11263,
              "meanTotalTokens": 29379,
              "costUsd": null
            }
          },
          {
            "settingId": "claude-opus-high",
            "configurationId": "claude:opus@high",
            "baselineScore": 81.3,
            "treatmentScore": 87.5,
            "delta": 6.3,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 460984,
              "meanInputTokens": 2,
              "meanOutputTokens": 31923,
              "meanTotalTokens": 35467,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 359837,
              "meanInputTokens": 2,
              "meanOutputTokens": 24462,
              "meanTotalTokens": 36662,
              "costUsd": null
            }
          },
          {
            "settingId": "claude-opus-low",
            "configurationId": "claude:opus@low",
            "baselineScore": 76.9,
            "treatmentScore": 87.5,
            "delta": 10.6,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 324940,
              "meanInputTokens": 2,
              "meanOutputTokens": 23002,
              "meanTotalTokens": 26543,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 194222,
              "meanInputTokens": 2,
              "meanOutputTokens": 13658,
              "meanTotalTokens": 25852,
              "costUsd": null
            }
          },
          {
            "settingId": "claude-opus-max",
            "configurationId": "claude:opus@max",
            "baselineScore": 81.3,
            "treatmentScore": 87.5,
            "delta": 6.3,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 696168,
              "meanInputTokens": 2,
              "meanOutputTokens": 53042,
              "meanTotalTokens": 56588,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 580443,
              "meanInputTokens": 2,
              "meanOutputTokens": 39357,
              "meanTotalTokens": 51558,
              "costUsd": null
            }
          },
          {
            "settingId": "claude-opus-medium",
            "configurationId": "claude:opus@medium",
            "baselineScore": 83.1,
            "treatmentScore": 87.5,
            "delta": 4.4,
            "baselineMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 473677,
              "meanInputTokens": 2,
              "meanOutputTokens": 33967,
              "meanTotalTokens": 37513,
              "costUsd": null
            },
            "skillMetrics": {
              "sampleCount": 1,
              "meanLatencyMs": 241613,
              "meanInputTokens": 2,
              "meanOutputTokens": 17278,
              "meanTotalTokens": 29478,
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
          "baseline": 96.3,
          "skill": 100
        },
        "deltas": {
          "skill": 3.8
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 96.3
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 100
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 605492,
            "meanInputTokens": 15627,
            "meanOutputTokens": 13523,
            "meanTotalTokens": 29150,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 797136,
            "meanInputTokens": 20843,
            "meanOutputTokens": 17210,
            "meanTotalTokens": 38053,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement as written",
            "Implement as written"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Implement as written"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 96.3,
          "skill": 100
        },
        "deltas": {
          "skill": 3.8
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 96.3
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 100
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 748479,
            "meanInputTokens": 15580,
            "meanOutputTokens": 15845,
            "meanTotalTokens": 31425,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 822706,
            "meanInputTokens": 20796,
            "meanOutputTokens": 19305,
            "meanTotalTokens": 40101,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Sound spec; decision required",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement as written",
            "Implement as written"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Implement as written"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 93.8,
          "skill": 98.8
        },
        "deltas": {
          "skill": 5
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 93.8
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 98.8
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 738419,
            "meanInputTokens": 14687,
            "meanOutputTokens": 38199,
            "meanTotalTokens": 52886,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 918743,
            "meanInputTokens": 19903,
            "meanOutputTokens": 41384,
            "meanTotalTokens": 61287,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Sound spec; decision required",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement as written"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 88.1,
          "skill": 98.1
        },
        "deltas": {
          "skill": 10
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 88.1
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 98.1
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 538181,
            "meanInputTokens": 12898,
            "meanOutputTokens": 29742,
            "meanTotalTokens": 42640,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 537415,
            "meanInputTokens": 18116,
            "meanOutputTokens": 29591,
            "meanTotalTokens": 47707,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement as written",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 94.4,
          "skill": 98.1
        },
        "deltas": {
          "skill": 3.8
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 94.4
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 98.1
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 302361,
            "meanInputTokens": 14687,
            "meanOutputTokens": 12331,
            "meanTotalTokens": 27018,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 457934,
            "meanInputTokens": 19903,
            "meanOutputTokens": 19684,
            "meanTotalTokens": 39587,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement as written",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 85,
          "skill": 97.5
        },
        "deltas": {
          "skill": 12.5
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 85
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 97.5
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 189194,
            "meanInputTokens": 14685,
            "meanOutputTokens": 7878,
            "meanTotalTokens": 22563,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 335978,
            "meanInputTokens": 19903,
            "meanOutputTokens": 14111,
            "meanTotalTokens": 34014,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 93.1,
          "skill": 97.5
        },
        "deltas": {
          "skill": 4.4
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 93.1
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 97.5
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 759055,
            "meanInputTokens": 14732,
            "meanOutputTokens": 37324,
            "meanTotalTokens": 52056,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 892537,
            "meanInputTokens": 19952,
            "meanOutputTokens": 37982,
            "meanTotalTokens": 57934,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement as written"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 85,
          "skill": 96.9
        },
        "deltas": {
          "skill": 11.9
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 85
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 96.9
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 254897,
            "meanInputTokens": 12900,
            "meanOutputTokens": 13892,
            "meanTotalTokens": 26792,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 356298,
            "meanInputTokens": 18114,
            "meanOutputTokens": 19519,
            "meanTotalTokens": 37633,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement as written",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 93.1,
          "skill": 96.9
        },
        "deltas": {
          "skill": 3.8
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 93.1
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 96.9
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 517320,
            "meanInputTokens": 14685,
            "meanOutputTokens": 20824,
            "meanTotalTokens": 35509,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 508220,
            "meanInputTokens": 19903,
            "meanOutputTokens": 21917,
            "meanTotalTokens": 41820,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 86.3,
          "skill": 96.3
        },
        "deltas": {
          "skill": 10
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 86.3
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 96.3
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 739223,
            "meanInputTokens": 14463,
            "meanOutputTokens": 40779,
            "meanTotalTokens": 55242,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 742781,
            "meanInputTokens": 19903,
            "meanOutputTokens": 41033,
            "meanTotalTokens": 60936,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement as written",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 81.3,
          "skill": 96.3
        },
        "deltas": {
          "skill": 15
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 81.3
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 96.3
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 287365,
            "meanInputTokens": 14467,
            "meanOutputTokens": 15788,
            "meanTotalTokens": 30255,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 264301,
            "meanInputTokens": 19681,
            "meanOutputTokens": 14475,
            "meanTotalTokens": 34156,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement as written",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 82.5,
          "skill": 95.6
        },
        "deltas": {
          "skill": 13.1
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 82.5
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 95.6
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 200448,
            "meanInputTokens": 14687,
            "meanOutputTokens": 9306,
            "meanTotalTokens": 23993,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 208000,
            "meanInputTokens": 19899,
            "meanOutputTokens": 8776,
            "meanTotalTokens": 28675,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 91.3,
          "skill": 95.6
        },
        "deltas": {
          "skill": 4.4
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 91.3
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 95.6
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 111709,
            "meanInputTokens": 14687,
            "meanOutputTokens": 5819,
            "meanTotalTokens": 20506,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 105134,
            "meanInputTokens": 19903,
            "meanOutputTokens": 5484,
            "meanTotalTokens": 25387,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 86.3,
          "skill": 95.6
        },
        "deltas": {
          "skill": 9.4
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 86.3
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 95.6
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 103415,
            "meanInputTokens": 14687,
            "meanOutputTokens": 5580,
            "meanTotalTokens": 20267,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 100786,
            "meanInputTokens": 19679,
            "meanOutputTokens": 5380,
            "meanTotalTokens": 25059,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 94.4,
          "skill": 95
        },
        "deltas": {
          "skill": 0.6
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 94.4
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 95
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 120032,
            "meanInputTokens": 14685,
            "meanOutputTokens": 6487,
            "meanTotalTokens": 21172,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 127943,
            "meanInputTokens": 19683,
            "meanOutputTokens": 6950,
            "meanTotalTokens": 26633,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 81.9,
          "skill": 94.4
        },
        "deltas": {
          "skill": 12.5
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 81.9
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 94.4
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 594814,
            "meanInputTokens": 14514,
            "meanOutputTokens": 32867,
            "meanTotalTokens": 47381,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 535144,
            "meanInputTokens": 19952,
            "meanOutputTokens": 29529,
            "meanTotalTokens": 49481,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement as written",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 77.5,
          "skill": 93.8
        },
        "deltas": {
          "skill": 16.3
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 77.5
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 93.8
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 742621,
            "meanInputTokens": 2,
            "meanOutputTokens": 53419,
            "meanTotalTokens": 56965,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 396913,
            "meanInputTokens": 2,
            "meanOutputTokens": 27707,
            "meanTotalTokens": 39906,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 91.9,
          "skill": 93.8
        },
        "deltas": {
          "skill": 1.9
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 91.9
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 93.8
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 110125,
            "meanInputTokens": 12896,
            "meanOutputTokens": 5885,
            "meanTotalTokens": 18781,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 103574,
            "meanInputTokens": 18338,
            "meanOutputTokens": 5493,
            "meanTotalTokens": 23831,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 86.9,
          "skill": 93.1
        },
        "deltas": {
          "skill": 6.3
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 86.9
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 93.1
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 115502,
            "meanInputTokens": 12898,
            "meanOutputTokens": 6271,
            "meanTotalTokens": 19169,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 126799,
            "meanInputTokens": 18116,
            "meanOutputTokens": 6869,
            "meanTotalTokens": 24985,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 88.1,
          "skill": 92.5
        },
        "deltas": {
          "skill": 4.4
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 88.1
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 92.5
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 1099068,
            "meanInputTokens": 6,
            "meanOutputTokens": 83137,
            "meanTotalTokens": 156064,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 889385,
            "meanInputTokens": 2,
            "meanOutputTokens": 63655,
            "meanTotalTokens": 76739,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Fix spec first",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 90.6,
          "skill": 91.9
        },
        "deltas": {
          "skill": 1.3
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 90.6
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 91.9
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 622916,
            "meanInputTokens": 2,
            "meanOutputTokens": 44990,
            "meanTotalTokens": 49420,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 642489,
            "meanInputTokens": 2,
            "meanOutputTokens": 46807,
            "meanTotalTokens": 59890,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Fix spec first",
            "Implement as written"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 85,
          "skill": 91.9
        },
        "deltas": {
          "skill": 6.9
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 85
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 91.9
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 190549,
            "meanInputTokens": 12900,
            "meanOutputTokens": 10316,
            "meanTotalTokens": 23216,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 207373,
            "meanInputTokens": 18116,
            "meanOutputTokens": 11263,
            "meanTotalTokens": 29379,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Implement after the named correction",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": false,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Implement after the named correction",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 81.3,
          "skill": 87.5
        },
        "deltas": {
          "skill": 6.3
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 81.3
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 87.5
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 460984,
            "meanInputTokens": 2,
            "meanOutputTokens": 31923,
            "meanTotalTokens": 35467,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 359837,
            "meanInputTokens": 2,
            "meanOutputTokens": 24462,
            "meanTotalTokens": 36662,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Implement after the named correction",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": false
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Implement after the named correction"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 76.9,
          "skill": 87.5
        },
        "deltas": {
          "skill": 10.6
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 76.9
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 87.5
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 324940,
            "meanInputTokens": 2,
            "meanOutputTokens": 23002,
            "meanTotalTokens": 26543,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 194222,
            "meanInputTokens": 2,
            "meanOutputTokens": 13658,
            "meanTotalTokens": 25852,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Fix spec first",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 81.3,
          "skill": 87.5
        },
        "deltas": {
          "skill": 6.3
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 81.3
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 87.5
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 696168,
            "meanInputTokens": 2,
            "meanOutputTokens": 53042,
            "meanTotalTokens": 56588,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 580443,
            "meanInputTokens": 2,
            "meanOutputTokens": 39357,
            "meanTotalTokens": 51558,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Fix spec first",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
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
          "baseline": 83.1,
          "skill": 87.5
        },
        "deltas": {
          "skill": 4.4
        },
        "categories": {
          "baseline": [
            {
              "category": "ai-workflows",
              "score": 83.1
            }
          ],
          "skill": [
            {
              "category": "ai-workflows",
              "score": 87.5
            }
          ]
        },
        "metrics": {
          "baseline": {
            "sampleCount": 1,
            "meanLatencyMs": 473677,
            "meanInputTokens": 2,
            "meanOutputTokens": 33967,
            "meanTotalTokens": 37513,
            "costUsd": null
          },
          "skill": {
            "sampleCount": 1,
            "meanLatencyMs": 241613,
            "meanInputTokens": 2,
            "meanOutputTokens": 17278,
            "meanTotalTokens": 29478,
            "costUsd": null
          }
        },
        "readiness": {
          "baseline": [
            "Fix spec first",
            "Implement after the named correction"
          ],
          "skill": [
            "Fix spec first",
            "Implement after the named correction"
          ]
        },
        "readinessConflict": {
          "baseline": true,
          "skill": true
        },
        "readinessLabel": {
          "baseline": "Readiness unresolved",
          "skill": "Readiness unresolved"
        },
        "assessmentStatus": {
          "baseline": "assessable",
          "skill": "assessable"
        },
        "coverage": {
          "baseline": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "skill": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          }
        }
      }
    ],
    "entries": [
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
        "score": 96.3,
        "baselineScore": 96.3,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 96.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 96.3
          }
        ],
        "cost": null,
        "latency": 605.492,
        "tokens": 13523,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 605492,
          "meanInputTokens": 15627,
          "meanOutputTokens": 13523,
          "meanTotalTokens": 29150,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 1
      },
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
        "conditionLabel": "Work-spec skill",
        "score": 100,
        "baselineScore": 96.3,
        "delta": 3.8,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 100
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 96.3
          }
        ],
        "cost": null,
        "latency": 797.136,
        "tokens": 17210,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 797136,
          "meanInputTokens": 20843,
          "meanOutputTokens": 17210,
          "meanTotalTokens": 38053,
          "costUsd": null
        },
        "readiness": [
          "Implement as written",
          "Implement as written"
        ],
        "readinessLabel": "Implement as written",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 1
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
        "score": 96.3,
        "baselineScore": 96.3,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 96.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 96.3
          }
        ],
        "cost": null,
        "latency": 748.479,
        "tokens": 15845,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 748479,
          "meanInputTokens": 15580,
          "meanOutputTokens": 15845,
          "meanTotalTokens": 31425,
          "costUsd": null
        },
        "readiness": [
          "Sound spec; decision required",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
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
        "conditionLabel": "Work-spec skill",
        "score": 100,
        "baselineScore": 96.3,
        "delta": 3.8,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 100
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 96.3
          }
        ],
        "cost": null,
        "latency": 822.706,
        "tokens": 19305,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 822706,
          "meanInputTokens": 20796,
          "meanOutputTokens": 19305,
          "meanTotalTokens": 40101,
          "costUsd": null
        },
        "readiness": [
          "Implement as written",
          "Implement as written"
        ],
        "readinessLabel": "Implement as written",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 1
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
        "score": 93.8,
        "baselineScore": 93.8,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 93.8
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 93.8
          }
        ],
        "cost": null,
        "latency": 738.419,
        "tokens": 38199,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 738419,
          "meanInputTokens": 14687,
          "meanOutputTokens": 38199,
          "meanTotalTokens": 52886,
          "costUsd": null
        },
        "readiness": [
          "Sound spec; decision required",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 5
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
        "conditionLabel": "Work-spec skill",
        "score": 98.8,
        "baselineScore": 93.8,
        "delta": 5,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 98.8
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 93.8
          }
        ],
        "cost": null,
        "latency": 918.743,
        "tokens": 41384,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 918743,
          "meanInputTokens": 19903,
          "meanOutputTokens": 41384,
          "meanTotalTokens": 61287,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement as written"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 3
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
        "score": 88.1,
        "baselineScore": 88.1,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 88.1
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 88.1
          }
        ],
        "cost": null,
        "latency": 538.181,
        "tokens": 29742,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 538181,
          "meanInputTokens": 12898,
          "meanOutputTokens": 29742,
          "meanTotalTokens": 42640,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 11
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
        "conditionLabel": "Work-spec skill",
        "score": 98.1,
        "baselineScore": 88.1,
        "delta": 10,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 98.1
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 88.1
          }
        ],
        "cost": null,
        "latency": 537.415,
        "tokens": 29591,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 537415,
          "meanInputTokens": 18116,
          "meanOutputTokens": 29591,
          "meanTotalTokens": 47707,
          "costUsd": null
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 4
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
        "score": 94.4,
        "baselineScore": 94.4,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 94.4
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 94.4
          }
        ],
        "cost": null,
        "latency": 302.361,
        "tokens": 12331,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 302361,
          "meanInputTokens": 14687,
          "meanOutputTokens": 12331,
          "meanTotalTokens": 27018,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 3
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
        "conditionLabel": "Work-spec skill",
        "score": 98.1,
        "baselineScore": 94.4,
        "delta": 3.8,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 98.1
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 94.4
          }
        ],
        "cost": null,
        "latency": 457.934,
        "tokens": 19684,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 457934,
          "meanInputTokens": 19903,
          "meanOutputTokens": 19684,
          "meanTotalTokens": 39587,
          "costUsd": null
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 4
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
        "score": 85,
        "baselineScore": 85,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 85
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 85
          }
        ],
        "cost": null,
        "latency": 189.194,
        "tokens": 7878,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 189194,
          "meanInputTokens": 14685,
          "meanOutputTokens": 7878,
          "meanTotalTokens": 22563,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 16
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
        "conditionLabel": "Work-spec skill",
        "score": 97.5,
        "baselineScore": 85,
        "delta": 12.5,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 97.5
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 85
          }
        ],
        "cost": null,
        "latency": 335.978,
        "tokens": 14111,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 335978,
          "meanInputTokens": 19903,
          "meanOutputTokens": 14111,
          "meanTotalTokens": 34014,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 6
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
        "score": 93.1,
        "baselineScore": 93.1,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 93.1
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 93.1
          }
        ],
        "cost": null,
        "latency": 759.055,
        "tokens": 37324,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 759055,
          "meanInputTokens": 14732,
          "meanOutputTokens": 37324,
          "meanTotalTokens": 52056,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 6
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
        "conditionLabel": "Work-spec skill",
        "score": 97.5,
        "baselineScore": 93.1,
        "delta": 4.4,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 97.5
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 93.1
          }
        ],
        "cost": null,
        "latency": 892.537,
        "tokens": 37982,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 892537,
          "meanInputTokens": 19952,
          "meanOutputTokens": 37982,
          "meanTotalTokens": 57934,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement as written"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 6
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
        "score": 85,
        "baselineScore": 85,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 85
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 85
          }
        ],
        "cost": null,
        "latency": 254.897,
        "tokens": 13892,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 254897,
          "meanInputTokens": 12900,
          "meanOutputTokens": 13892,
          "meanTotalTokens": 26792,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
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
        "conditionLabel": "Work-spec skill",
        "score": 96.9,
        "baselineScore": 85,
        "delta": 11.9,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 96.9
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 85
          }
        ],
        "cost": null,
        "latency": 356.298,
        "tokens": 19519,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 356298,
          "meanInputTokens": 18114,
          "meanOutputTokens": 19519,
          "meanTotalTokens": 37633,
          "costUsd": null
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 8
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
        "score": 93.1,
        "baselineScore": 93.1,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 93.1
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 93.1
          }
        ],
        "cost": null,
        "latency": 517.32,
        "tokens": 20824,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 517320,
          "meanInputTokens": 14685,
          "meanOutputTokens": 20824,
          "meanTotalTokens": 35509,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 6
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
        "conditionLabel": "Work-spec skill",
        "score": 96.9,
        "baselineScore": 93.1,
        "delta": 3.8,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 96.9
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 93.1
          }
        ],
        "cost": null,
        "latency": 508.22,
        "tokens": 21917,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 508220,
          "meanInputTokens": 19903,
          "meanOutputTokens": 21917,
          "meanTotalTokens": 41820,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 8
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
        "score": 86.3,
        "baselineScore": 86.3,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 86.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 86.3
          }
        ],
        "cost": null,
        "latency": 739.223,
        "tokens": 40779,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 739223,
          "meanInputTokens": 14463,
          "meanOutputTokens": 40779,
          "meanTotalTokens": 55242,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 14
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
        "conditionLabel": "Work-spec skill",
        "score": 96.3,
        "baselineScore": 86.3,
        "delta": 10,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 96.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 86.3
          }
        ],
        "cost": null,
        "latency": 742.781,
        "tokens": 41033,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 742781,
          "meanInputTokens": 19903,
          "meanOutputTokens": 41033,
          "meanTotalTokens": 60936,
          "costUsd": null
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 10
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
        "score": 81.3,
        "baselineScore": 81.3,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 81.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 81.3
          }
        ],
        "cost": null,
        "latency": 287.365,
        "tokens": 15788,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 287365,
          "meanInputTokens": 14467,
          "meanOutputTokens": 15788,
          "meanTotalTokens": 30255,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 22
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
        "conditionLabel": "Work-spec skill",
        "score": 96.3,
        "baselineScore": 81.3,
        "delta": 15,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 96.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 81.3
          }
        ],
        "cost": null,
        "latency": 264.301,
        "tokens": 14475,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 264301,
          "meanInputTokens": 19681,
          "meanOutputTokens": 14475,
          "meanTotalTokens": 34156,
          "costUsd": null
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 10
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
        "score": 82.5,
        "baselineScore": 82.5,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 82.5
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 82.5
          }
        ],
        "cost": null,
        "latency": 200.448,
        "tokens": 9306,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 200448,
          "meanInputTokens": 14687,
          "meanOutputTokens": 9306,
          "meanTotalTokens": 23993,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 20
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
        "conditionLabel": "Work-spec skill",
        "score": 95.6,
        "baselineScore": 82.5,
        "delta": 13.1,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 95.6
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 82.5
          }
        ],
        "cost": null,
        "latency": 208,
        "tokens": 8776,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 208000,
          "meanInputTokens": 19899,
          "meanOutputTokens": 8776,
          "meanTotalTokens": 28675,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 12
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
        "score": 91.3,
        "baselineScore": 91.3,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 91.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 91.3
          }
        ],
        "cost": null,
        "latency": 111.709,
        "tokens": 5819,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 111709,
          "meanInputTokens": 14687,
          "meanOutputTokens": 5819,
          "meanTotalTokens": 20506,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 9
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
        "conditionLabel": "Work-spec skill",
        "score": 95.6,
        "baselineScore": 91.3,
        "delta": 4.4,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 95.6
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 91.3
          }
        ],
        "cost": null,
        "latency": 105.134,
        "tokens": 5484,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 105134,
          "meanInputTokens": 19903,
          "meanOutputTokens": 5484,
          "meanTotalTokens": 25387,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 12
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
        "score": 86.3,
        "baselineScore": 86.3,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 86.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 86.3
          }
        ],
        "cost": null,
        "latency": 103.415,
        "tokens": 5580,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 103415,
          "meanInputTokens": 14687,
          "meanOutputTokens": 5580,
          "meanTotalTokens": 20267,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 14
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
        "conditionLabel": "Work-spec skill",
        "score": 95.6,
        "baselineScore": 86.3,
        "delta": 9.4,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 95.6
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 86.3
          }
        ],
        "cost": null,
        "latency": 100.786,
        "tokens": 5380,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 100786,
          "meanInputTokens": 19679,
          "meanOutputTokens": 5380,
          "meanTotalTokens": 25059,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 12
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
        "score": 94.4,
        "baselineScore": 94.4,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 94.4
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 94.4
          }
        ],
        "cost": null,
        "latency": 120.032,
        "tokens": 6487,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 120032,
          "meanInputTokens": 14685,
          "meanOutputTokens": 6487,
          "meanTotalTokens": 21172,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 3
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
        "conditionLabel": "Work-spec skill",
        "score": 95,
        "baselineScore": 94.4,
        "delta": 0.6,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 95
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 94.4
          }
        ],
        "cost": null,
        "latency": 127.943,
        "tokens": 6950,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 127943,
          "meanInputTokens": 19683,
          "meanOutputTokens": 6950,
          "meanTotalTokens": 26633,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 15
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
        "score": 81.9,
        "baselineScore": 81.9,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 81.9
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 81.9
          }
        ],
        "cost": null,
        "latency": 594.814,
        "tokens": 32867,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 594814,
          "meanInputTokens": 14514,
          "meanOutputTokens": 32867,
          "meanTotalTokens": 47381,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 21
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
        "conditionLabel": "Work-spec skill",
        "score": 94.4,
        "baselineScore": 81.9,
        "delta": 12.5,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 94.4
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 81.9
          }
        ],
        "cost": null,
        "latency": 535.144,
        "tokens": 29529,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 535144,
          "meanInputTokens": 19952,
          "meanOutputTokens": 29529,
          "meanTotalTokens": 49481,
          "costUsd": null
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 16
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
        "score": 77.5,
        "baselineScore": 77.5,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 77.5
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 77.5
          }
        ],
        "cost": null,
        "latency": 742.621,
        "tokens": 53419,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 742621,
          "meanInputTokens": 2,
          "meanOutputTokens": 53419,
          "meanTotalTokens": 56965,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 25
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
        "conditionLabel": "Work-spec skill",
        "score": 93.8,
        "baselineScore": 77.5,
        "delta": 16.3,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 93.8
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 77.5
          }
        ],
        "cost": null,
        "latency": 396.913,
        "tokens": 27707,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 396913,
          "meanInputTokens": 2,
          "meanOutputTokens": 27707,
          "meanTotalTokens": 39906,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 17
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
        "score": 91.9,
        "baselineScore": 91.9,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 91.9
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 91.9
          }
        ],
        "cost": null,
        "latency": 110.125,
        "tokens": 5885,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 110125,
          "meanInputTokens": 12896,
          "meanOutputTokens": 5885,
          "meanTotalTokens": 18781,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 8
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
        "conditionLabel": "Work-spec skill",
        "score": 93.8,
        "baselineScore": 91.9,
        "delta": 1.9,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 93.8
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 91.9
          }
        ],
        "cost": null,
        "latency": 103.574,
        "tokens": 5493,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 103574,
          "meanInputTokens": 18338,
          "meanOutputTokens": 5493,
          "meanTotalTokens": 23831,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 17
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
        "score": 86.9,
        "baselineScore": 86.9,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 86.9
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 86.9
          }
        ],
        "cost": null,
        "latency": 115.502,
        "tokens": 6271,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 115502,
          "meanInputTokens": 12898,
          "meanOutputTokens": 6271,
          "meanTotalTokens": 19169,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 13
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
        "conditionLabel": "Work-spec skill",
        "score": 93.1,
        "baselineScore": 86.9,
        "delta": 6.3,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 93.1
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 86.9
          }
        ],
        "cost": null,
        "latency": 126.799,
        "tokens": 6869,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 126799,
          "meanInputTokens": 18116,
          "meanOutputTokens": 6869,
          "meanTotalTokens": 24985,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 19
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
        "score": 88.1,
        "baselineScore": 88.1,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 88.1
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 88.1
          }
        ],
        "cost": null,
        "latency": 1099.068,
        "tokens": 83137,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 1099068,
          "meanInputTokens": 6,
          "meanOutputTokens": 83137,
          "meanTotalTokens": 156064,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 11
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
        "conditionLabel": "Work-spec skill",
        "score": 92.5,
        "baselineScore": 88.1,
        "delta": 4.4,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 92.5
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 88.1
          }
        ],
        "cost": null,
        "latency": 889.385,
        "tokens": 63655,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 889385,
          "meanInputTokens": 2,
          "meanOutputTokens": 63655,
          "meanTotalTokens": 76739,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 20
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
        "score": 90.6,
        "baselineScore": 90.6,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 90.6
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 90.6
          }
        ],
        "cost": null,
        "latency": 622.916,
        "tokens": 44990,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 622916,
          "meanInputTokens": 2,
          "meanOutputTokens": 44990,
          "meanTotalTokens": 49420,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 10
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
        "conditionLabel": "Work-spec skill",
        "score": 91.9,
        "baselineScore": 90.6,
        "delta": 1.3,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 91.9
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 90.6
          }
        ],
        "cost": null,
        "latency": 642.489,
        "tokens": 46807,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 642489,
          "meanInputTokens": 2,
          "meanOutputTokens": 46807,
          "meanTotalTokens": 59890,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement as written"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 21
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
        "score": 85,
        "baselineScore": 85,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 85
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 85
          }
        ],
        "cost": null,
        "latency": 190.549,
        "tokens": 10316,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 190549,
          "meanInputTokens": 12900,
          "meanOutputTokens": 10316,
          "meanTotalTokens": 23216,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 16
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
        "conditionLabel": "Work-spec skill",
        "score": 91.9,
        "baselineScore": 85,
        "delta": 6.9,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 91.9
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 85
          }
        ],
        "cost": null,
        "latency": 207.373,
        "tokens": 11263,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 207373,
          "meanInputTokens": 18116,
          "meanOutputTokens": 11263,
          "meanTotalTokens": 29379,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 21
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
        "score": 81.3,
        "baselineScore": 81.3,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 81.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 81.3
          }
        ],
        "cost": null,
        "latency": 460.984,
        "tokens": 31923,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 460984,
          "meanInputTokens": 2,
          "meanOutputTokens": 31923,
          "meanTotalTokens": 35467,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 22
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
        "conditionLabel": "Work-spec skill",
        "score": 87.5,
        "baselineScore": 81.3,
        "delta": 6.3,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 87.5
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 81.3
          }
        ],
        "cost": null,
        "latency": 359.837,
        "tokens": 24462,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 359837,
          "meanInputTokens": 2,
          "meanOutputTokens": 24462,
          "meanTotalTokens": 36662,
          "costUsd": null
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 23
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
        "score": 76.9,
        "baselineScore": 76.9,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 76.9
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 76.9
          }
        ],
        "cost": null,
        "latency": 324.94,
        "tokens": 23002,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 324940,
          "meanInputTokens": 2,
          "meanOutputTokens": 23002,
          "meanTotalTokens": 26543,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 26
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
        "conditionLabel": "Work-spec skill",
        "score": 87.5,
        "baselineScore": 76.9,
        "delta": 10.6,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 87.5
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 76.9
          }
        ],
        "cost": null,
        "latency": 194.222,
        "tokens": 13658,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 194222,
          "meanInputTokens": 2,
          "meanOutputTokens": 13658,
          "meanTotalTokens": 25852,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 23
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
        "score": 81.3,
        "baselineScore": 81.3,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 81.3
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 81.3
          }
        ],
        "cost": null,
        "latency": 696.168,
        "tokens": 53042,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 696168,
          "meanInputTokens": 2,
          "meanOutputTokens": 53042,
          "meanTotalTokens": 56588,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 22
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
        "conditionLabel": "Work-spec skill",
        "score": 87.5,
        "baselineScore": 81.3,
        "delta": 6.3,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 87.5
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 81.3
          }
        ],
        "cost": null,
        "latency": 580.443,
        "tokens": 39357,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 580443,
          "meanInputTokens": 2,
          "meanOutputTokens": 39357,
          "meanTotalTokens": 51558,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 23
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
        "score": 83.1,
        "baselineScore": 83.1,
        "delta": 0,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 83.1
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 83.1
          }
        ],
        "cost": null,
        "latency": 473.677,
        "tokens": 33967,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 473677,
          "meanInputTokens": 2,
          "meanOutputTokens": 33967,
          "meanTotalTokens": 37513,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 19
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
        "conditionLabel": "Work-spec skill",
        "score": 87.5,
        "baselineScore": 83.1,
        "delta": 4.4,
        "categories": [
          {
            "category": "ai-workflows",
            "score": 87.5
          }
        ],
        "baselineCategories": [
          {
            "category": "ai-workflows",
            "score": 83.1
          }
        ],
        "cost": null,
        "latency": 241.613,
        "tokens": 17278,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 241613,
          "meanInputTokens": 2,
          "meanOutputTokens": 17278,
          "meanTotalTokens": 29478,
          "costUsd": null
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "rank": 23
      }
    ],
    "benchmarkResults": [
      {
        "settingId": "codex-gpt-6-astra-xhigh",
        "configurationId": "codex:gpt-6-astra@xhigh",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 96.3,
        "exactScore": 96.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 748479,
        "inputTokens": 15580,
        "outputTokens": 15845,
        "totalTokens": 31425,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 748479,
          "meanInputTokens": 15580,
          "meanOutputTokens": 15845,
          "meanTotalTokens": 31425,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3.5,
          "S": 3.5,
          "C": 4
        },
        "readiness": [
          "Sound spec; decision required",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "43859854f7",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "68ae870cfe99201921bdc2b78864d0c202e52b9d824d6d089500ce5d50d3dbde",
          "candidateSha256": "f6866e167a1d22c10ec0f841003fbc9f35867590aeccbd8174bdd1577f0b0831",
          "assessmentSha256": [
            "40416482270e62b7d8f7a324d0f9b46f868770ae035c3804f2556859a3eafcaa",
            "da2e04e2cade2936117590c8879f3b0faa32a5b8f1c46d960957ed8ea5a81313"
          ]
        }
      },
      {
        "settingId": "codex-gpt-6-astra-xhigh",
        "configurationId": "codex:gpt-6-astra@xhigh",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 100,
        "exactScore": 100,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 822706,
        "inputTokens": 20796,
        "outputTokens": 19305,
        "totalTokens": 40101,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 822706,
          "meanInputTokens": 20796,
          "meanOutputTokens": 19305,
          "meanTotalTokens": 40101,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 4,
          "S": 4,
          "C": 4
        },
        "readiness": [
          "Implement as written",
          "Implement as written"
        ],
        "readinessLabel": "Implement as written",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "950e8b131d",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "e536a12e7e943c9a38eaf68649a54008964a2b24c5a166e8575de23e427616c8",
          "candidateSha256": "377776dc50ade5b06f80fb866b265e09c03231189f8d86d78cf64fea7d6bb6cc",
          "assessmentSha256": [
            "1a8acc28b43572ec9fe07b4e8380865af2127b1d78db97cce081c582cd626c3a",
            "c906f907e77eee3693fdffb5da8fae4199284ae058ceb6f28de52b1db2244c6b"
          ]
        }
      },
      {
        "settingId": "codex-gpt-6-astra-ultra",
        "configurationId": "codex:gpt-6-astra@ultra",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 96.3,
        "exactScore": 96.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 605492,
        "inputTokens": 15627,
        "outputTokens": 13523,
        "totalTokens": 29150,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 605492,
          "meanInputTokens": 15627,
          "meanOutputTokens": 13523,
          "meanTotalTokens": 29150,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 4,
          "S": 3,
          "C": 4
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "357867e351",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "d539894e00eaf14d8504648eebba3fb7a9571e83b470ebab37b8937fb3e5f787",
          "candidateSha256": "50bb52658fc2529307e20a9c1ad346ed3e9d2a2441683d45a7b62d6f89d0d4f9",
          "assessmentSha256": [
            "92922e63c08dbe23466df7ebf1a86fd4bf1fb66091b775656f9a8aa79e87f97a",
            "a73bcde75984e66af9f67434792392ea7fb7f32f5f180485d053f0d6bd9cf8ab"
          ]
        }
      },
      {
        "settingId": "codex-gpt-6-astra-ultra",
        "configurationId": "codex:gpt-6-astra@ultra",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 100,
        "exactScore": 100,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 797136,
        "inputTokens": 20843,
        "outputTokens": 17210,
        "totalTokens": 38053,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 797136,
          "meanInputTokens": 20843,
          "meanOutputTokens": 17210,
          "meanTotalTokens": 38053,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 4,
          "S": 4,
          "C": 4
        },
        "readiness": [
          "Implement as written",
          "Implement as written"
        ],
        "readinessLabel": "Implement as written",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "6f2ceedd9b",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "dbe22c7d284ac91001679ad386c61f8bb8b90b45f18e8d47c6bbbd3e57baa325",
          "candidateSha256": "d0a80c83ec06358186223b08047ef3f3a665cf8554a77b5aa01cccbe76d228f5",
          "assessmentSha256": [
            "ab0b62f8e58f0b184db655ca3d9f4d5f6518fd0003a6671e7388179fc266d7a9",
            "06f4fc5a69cd144f1b350d005cef9775dc096294c023ae2801d50d5ea5729182"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-xhigh",
        "configurationId": "codex:gpt-5.6-sol@xhigh",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 93.1,
        "exactScore": 93.125,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 517320,
        "inputTokens": 14685,
        "outputTokens": 20824,
        "totalTokens": 35509,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 517320,
          "meanInputTokens": 14685,
          "meanOutputTokens": 20824,
          "meanTotalTokens": 35509,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3.5,
          "D": 4,
          "S": 3.5,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "9bce3916d1",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "e78e31a9328ea87a9484991ab96abe1cb8139ed733e4e08fb52e62e5d33b69a3",
          "candidateSha256": "b6e86b5771ca664db6c2ce1302abf9e64b70157213ea0634519c6e1b54242004",
          "assessmentSha256": [
            "7823e2e90b843da10e048a7b3235d8f0566ab747220d4a4b5bd0776a38b495a7",
            "5c5cff68e5212ab1fc89f60c79a9e8ce23eb3a2ccc83bdb27500aa840ddb6c73"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-xhigh",
        "configurationId": "codex:gpt-5.6-sol@xhigh",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 96.9,
        "exactScore": 96.875,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 508220,
        "inputTokens": 19903,
        "outputTokens": 21917,
        "totalTokens": 41820,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 508220,
          "meanInputTokens": 19903,
          "meanOutputTokens": 21917,
          "meanTotalTokens": 41820,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3.5,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "a3a7f76f14",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "ee438229d5d998f1b2cb0c4fec5b24aaf31fd9fe87f2cf536e0cecea4735edbf",
          "candidateSha256": "1dac22c478b5ea0935f64dbd79db07638bcbbfa6bfc3febc05b527866b03df09",
          "assessmentSha256": [
            "8f823efd2631bebebb0de706a3b6a86696f83bf9c63c114cc9243c087af1699a",
            "c951eaf9d1314b93fba91bbbd7c1ac7b9020ca88caafa24b9bd23dbfde7d285b"
          ]
        }
      },
      {
        "settingId": "claude-claude-fable-5-1-max",
        "configurationId": "claude:claude-fable-5-1@max",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 88.1,
        "exactScore": 88.125,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 1099068,
        "inputTokens": 6,
        "outputTokens": 83137,
        "totalTokens": 156064,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 1099068,
          "meanInputTokens": 6,
          "meanOutputTokens": 83137,
          "meanTotalTokens": 156064,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 2.5,
          "D": 3.5,
          "S": 4,
          "C": 3
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "ca7407ad57",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "97f8f11595a9d78cad7b6f71be80e7d32cb11425f36aae402593dd06363dca37",
          "candidateSha256": "fd03b73848f1eaa7cfe0dfea0891d954c0a34cfb4f743fd9c70ea0bb0ce1123b",
          "assessmentSha256": [
            "f657d5fd377ef9f78ba95046d8c270d63bee8544dac684317d065a586451d55a",
            "8362c6cb4ab0850a28b77363ee629056fe64d5580bc25f8a9704a2334cb81b13"
          ]
        }
      },
      {
        "settingId": "claude-claude-fable-5-1-max",
        "configurationId": "claude:claude-fable-5-1@max",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 92.5,
        "exactScore": 92.5,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 889385,
        "inputTokens": 2,
        "outputTokens": 63655,
        "totalTokens": 76739,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 889385,
          "meanInputTokens": 2,
          "meanOutputTokens": 63655,
          "meanTotalTokens": 76739,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3,
          "D": 4,
          "S": 4,
          "C": 3
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "7e43c5e559",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "2f3828a2f4287b389dfdea3f924e0ee8a09a6c504923106369d5ddae6bd4b418",
          "candidateSha256": "92ee53e0d6878ff1db758f86b519c414177066c66c356d1fdc3b462ad49e7342",
          "assessmentSha256": [
            "e9ac5b9dc62570f3e7d60427020af9d7a512f74e9461cbabcf3c9d6b62540b16",
            "ae62e6e51b4fe15b29c39e6bd80337fae1519b6e7e99e1ff6dbba010e646d0ad"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-low",
        "configurationId": "codex:gpt-5.6-sol@low",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 82.5,
        "exactScore": 82.5,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 200448,
        "inputTokens": 14687,
        "outputTokens": 9306,
        "totalTokens": 23993,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 200448,
          "meanInputTokens": 14687,
          "meanOutputTokens": 9306,
          "meanTotalTokens": 23993,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 4,
          "A": 3.5,
          "D": 2,
          "S": 3.5,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "cf2c1abae7",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "fa05043f68a603195704b74f331ca78e0a0813b0bcf321b8c3cd5663a775e6da",
          "candidateSha256": "76daa0e9dcd441c93d935b26a7a40365ca16c6c8e70391b3264b7045905ed1f0",
          "assessmentSha256": [
            "94418af0fea5f6a3ffcbd29754af88cc61171435dfee4492a9449457fcbdf1c6",
            "c471338049405b9b0f249eb6892334a8f623b3858a4c68077ef87b2313ad0ee2"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-low",
        "configurationId": "codex:gpt-5.6-sol@low",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 95.6,
        "exactScore": 95.625,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 208000,
        "inputTokens": 19899,
        "outputTokens": 8776,
        "totalTokens": 28675,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 208000,
          "meanInputTokens": 19899,
          "meanOutputTokens": 8776,
          "meanTotalTokens": 28675,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3.5,
          "S": 4,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "2281560792",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "67076fc41643aa08da6f52b052ecfff663bf9a092f785a62642876f7858678b1",
          "candidateSha256": "1b71f005ddd4cf495d730c15c13ffc0438569300777b5fcc0d18b68e8aae6a5a",
          "assessmentSha256": [
            "c49ad47cc275417c93a77dffcbee7f419b342f2a42518445dabb611f70e4eb9d",
            "292e183dbb68a45b3c3c51fc6943995fab3f10222fd4bab0235251f646f6071b"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-medium",
        "configurationId": "codex:gpt-5.6-sol@medium",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 85,
        "exactScore": 85,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 189194,
        "inputTokens": 14685,
        "outputTokens": 7878,
        "totalTokens": 22563,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 189194,
          "meanInputTokens": 14685,
          "meanOutputTokens": 7878,
          "meanTotalTokens": 22563,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 3.5,
          "A": 3,
          "D": 3.5,
          "S": 3.5,
          "C": 3.5
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "f8fda322d8",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "93afedb5ebb069dfaa4f498893100abd9ff1cf21e88cd665e03dbe5a8f5eb0de",
          "candidateSha256": "553a15bc5527f15f4885c04c388f14e7caaae727ee227ec1777e2e21adcedb04",
          "assessmentSha256": [
            "6c4493fea65d6321e18717c48117f298deaea57404d07bd691810af36c9900aa",
            "cf4bec76b88e808aa13c9fba4b34a5702229feb1a92832d632660d3a71e75e12"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-medium",
        "configurationId": "codex:gpt-5.6-sol@medium",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 97.5,
        "exactScore": 97.5,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 335978,
        "inputTokens": 19903,
        "outputTokens": 14111,
        "totalTokens": 34014,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 335978,
          "meanInputTokens": 19903,
          "meanOutputTokens": 14111,
          "meanTotalTokens": 34014,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 4,
          "S": 4,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "719ad18b68",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "7e57babb87bc15bf78c50c504ecdc29d0d2856ff05751eaf7924d1946a06ef18",
          "candidateSha256": "4812e0489a85a00f540b37be928b515dc24da0e87a7eb700f2cb110133597a9b",
          "assessmentSha256": [
            "2324825bee4d09b2974141c439a193f2547445a571e6bbffa2a77c32d38c6593",
            "aab7f21520ba7bbb75ba28c8c026182cc80545ce67c69dbebfbe1849f0c9dcb0"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-high",
        "configurationId": "codex:gpt-5.6-sol@high",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 94.4,
        "exactScore": 94.375,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 302361,
        "inputTokens": 14687,
        "outputTokens": 12331,
        "totalTokens": 27018,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 302361,
          "meanInputTokens": 14687,
          "meanOutputTokens": 12331,
          "meanTotalTokens": 27018,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3.5,
          "D": 4,
          "S": 3.5,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "baeaf0a1b9",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "8c8c26fc3d107642c5f1860a27097ede083c730e2c2fa9a0e19855b04157945a",
          "candidateSha256": "74194adc925433a9cea884ef0ab461deb6feec495e551ecd4ce5b72b6b3f5401",
          "assessmentSha256": [
            "9f17d4844fde8249652cf3150f497e1a1cceb085ef1d02ec6eb8567271cf3524",
            "3d39e049361fdbfbf23d2611b7f80072e584ca62730617795c89d8bef6661371"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-high",
        "configurationId": "codex:gpt-5.6-sol@high",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 98.1,
        "exactScore": 98.125,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 457934,
        "inputTokens": 19903,
        "outputTokens": 19684,
        "totalTokens": 39587,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 457934,
          "meanInputTokens": 19903,
          "meanOutputTokens": 19684,
          "meanTotalTokens": 39587,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3.5,
          "S": 4,
          "C": 4
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "181774a0a2",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "2a149161930fb3a4592d50ec91c04245cfa969b7808452d4320cdeee44cdff4e",
          "candidateSha256": "c2e2ac2e942c0738c973d7eec35d0716c39acb46af818045153bca88ad442b93",
          "assessmentSha256": [
            "b2e37c9e7871ed8a6326c82e82c4208de76c8cd04931101e48a1096c94b52732",
            "38b4af92a936f188d6f7458eb632dd46d11db32b674b5d2298bd90828196d221"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-max",
        "configurationId": "codex:gpt-5.6-sol@max",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 93.8,
        "exactScore": 93.75,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 738419,
        "inputTokens": 14687,
        "outputTokens": 38199,
        "totalTokens": 52886,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 738419,
          "meanInputTokens": 14687,
          "meanOutputTokens": 38199,
          "meanTotalTokens": 52886,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3.5,
          "D": 3.5,
          "S": 3.5,
          "C": 4
        },
        "readiness": [
          "Sound spec; decision required",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "7db99a9b09",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "a8e4a3415313394199ece77d667e76b4082155e0d2298b33447293f4ea199138",
          "candidateSha256": "bf2a2ec2b2c63561e2b627d9100293a7bc6a10b43205be97322ca10bfd17e01b",
          "assessmentSha256": [
            "cc34030540a8323760b99dd5c93ddb9561620f01bffa305002f2c007aed9cc99",
            "03cd7bb9d4bce8e687a44f5c72c49980a4e5b0e76ea0d6c9372b133003fe1e8c"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-max",
        "configurationId": "codex:gpt-5.6-sol@max",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 98.8,
        "exactScore": 98.75,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 918743,
        "inputTokens": 19903,
        "outputTokens": 41384,
        "totalTokens": 61287,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 918743,
          "meanInputTokens": 19903,
          "meanOutputTokens": 41384,
          "meanTotalTokens": 61287,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 4,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement as written"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "5c5a4b6ff3",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "43fe202dcc0789adcc7027c7b307aa5c9fe476b61ead8d1b15bcc7d909c0af2f",
          "candidateSha256": "1eb435a34889f33a770c6f590d12c0733e3762e3f1137dc8f12391e5428b14f4",
          "assessmentSha256": [
            "ba6b14526bb81633644ffa0abd6e7f1484c0bdb4b1a58882d20a1619d0ebffc4",
            "a5c845df35f412eea5afaaec7e687c4dca8bfbe4f429a2871c0a400f3429a1bb"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-ultra",
        "configurationId": "codex:gpt-5.6-sol@ultra",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 93.1,
        "exactScore": 93.125,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 759055,
        "inputTokens": 14732,
        "outputTokens": 37324,
        "totalTokens": 52056,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 759055,
          "meanInputTokens": 14732,
          "meanOutputTokens": 37324,
          "meanTotalTokens": 52056,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3,
          "S": 3.5,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "a8fe0fbfd5",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "0bae3854d16ddb65197f3783ff0400be70b1f2225d467f84aad0c118ff6a0416",
          "candidateSha256": "8d9679a6122c88bce89d8ba82d75397eae9a3b713996f112eaa62566f99b001a",
          "assessmentSha256": [
            "039cf9688f6a534c77a033df4cb63cadc881408760e431ef505a6be52f247ff1",
            "3925bcb94df942406784bc4b4e5478887efd3329074f943990b7dc1b9bfa026f"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-sol-ultra",
        "configurationId": "codex:gpt-5.6-sol@ultra",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 97.5,
        "exactScore": 97.5,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 892537,
        "inputTokens": 19952,
        "outputTokens": 37982,
        "totalTokens": 57934,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 892537,
          "meanInputTokens": 19952,
          "meanOutputTokens": 37982,
          "meanTotalTokens": 57934,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3.5,
          "D": 4,
          "S": 4,
          "C": 4
        },
        "readiness": [
          "Implement after the named correction",
          "Implement as written"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "3723a5a071",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "2468e1584df3caf5ca6017df199729e126fe2a363f9b2863be4717be04acbc16",
          "candidateSha256": "a4499822e1468a99c3b565cf824349f9f9b05f6967ceed8a753a08b661a149ec",
          "assessmentSha256": [
            "7630d5b1e78b914aeb70afba65438a0b0be28c1d12a5b6c08c4760fab473d5cc",
            "63cb1e0bf6c6894618847fcf97f13a594b07e14a4a5873135d0e84b1f5a998a5"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-low",
        "configurationId": "codex:gpt-5.6-terra@low",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 91.3,
        "exactScore": 91.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 111709,
        "inputTokens": 14687,
        "outputTokens": 5819,
        "totalTokens": 20506,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 111709,
          "meanInputTokens": 14687,
          "meanOutputTokens": 5819,
          "meanTotalTokens": 20506,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 4,
          "A": 3.5,
          "D": 3.5,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "90f49b5ca5",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "6163d73ba8cfe5b99a3fb2aa0cdd14bbe044023ca374ebded92f22e9650be3a5",
          "candidateSha256": "12122b750ac706ae6ba610a48f65d0f9377ce04a939229c95fc7d86e5639437e",
          "assessmentSha256": [
            "8a3c2bc5b168f33b7b0b0b162b0a7ae028bbcb1ec819bb0f4aa3b37d235baaf2",
            "b997a259d806da80cf62668996c2be9fd0496d9e1cb66e6649d710803e13f03a"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-low",
        "configurationId": "codex:gpt-5.6-terra@low",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 95.6,
        "exactScore": 95.625,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 105134,
        "inputTokens": 19903,
        "outputTokens": 5484,
        "totalTokens": 25387,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 105134,
          "meanInputTokens": 19903,
          "meanOutputTokens": 5484,
          "meanTotalTokens": 25387,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3.5,
          "S": 4,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "9a810e7982",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "adefa4bddd4e8d1d608da69433fbae033f572fb09278d3a93279dd15c298fb99",
          "candidateSha256": "ef19b22a6768e1577b5063f34d4accd654f540919ec518588cd1c2bb57379a99",
          "assessmentSha256": [
            "a0adc662c3e54c3a12c13c5178b7c7d7dbbcd94b0d5a7d630fe8aed026eedbc3",
            "37160aec7f1c63514e4c736dd2ef7f1bd5d49a8b957a0941bf27bd07fb1408a5"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-medium",
        "configurationId": "codex:gpt-5.6-terra@medium",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 86.3,
        "exactScore": 86.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 103415,
        "inputTokens": 14687,
        "outputTokens": 5580,
        "totalTokens": 20267,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 103415,
          "meanInputTokens": 14687,
          "meanOutputTokens": 5580,
          "meanTotalTokens": 20267,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 4,
          "A": 3,
          "D": 3.5,
          "S": 3,
          "C": 4
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "c92e5e112c",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "32a66e916d18153202e0a9437b738831f13b8f4b87ae182c0f987deb67ef4d35",
          "candidateSha256": "37bb4ae3069b46a31d5d2ab5c228894913951d1fe243e3aed77d51d11eacfc65",
          "assessmentSha256": [
            "f3848aac61f7d928a6b937cc6ec0ec6df292e032aad27fe97f0626703f7b2514",
            "97220334044ce506e75daf489f1bfc40e56bfebdf2e3cdc50ec833b896477027"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-medium",
        "configurationId": "codex:gpt-5.6-terra@medium",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 95.6,
        "exactScore": 95.625,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 100786,
        "inputTokens": 19679,
        "outputTokens": 5380,
        "totalTokens": 25059,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 100786,
          "meanInputTokens": 19679,
          "meanOutputTokens": 5380,
          "meanTotalTokens": 25059,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3.5,
          "S": 4,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "75bc4d0002",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "4e930f2c7558d3e07f16614c77cca83ae94295a4872338b9db33cf34a402d825",
          "candidateSha256": "c60132a0cbcf0c6b0d2fe98c10f4ce06294ab4eaffd4c8d1beef4114c89becfa",
          "assessmentSha256": [
            "8a58351e7d96bd80a6a859620a4dc47693f4283bfea76ce116e25cbca5a9530f",
            "4fc09a5acc684e4f0228cdb84abeeb7eb7e7a28d45d578d5b4c4b2c8fc168b56"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-high",
        "configurationId": "codex:gpt-5.6-terra@high",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 94.4,
        "exactScore": 94.375,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 120032,
        "inputTokens": 14685,
        "outputTokens": 6487,
        "totalTokens": 21172,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 120032,
          "meanInputTokens": 14685,
          "meanOutputTokens": 6487,
          "meanTotalTokens": 21172,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3.5,
          "D": 3.5,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "441104a7c9",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "2e05e6afcc2964f5f6720c02d06ce9e62be95a5510a2e6f5734bdefe538e1e2c",
          "candidateSha256": "628aeb6e1d4308494cb4e6c978a4a393ed46e1f823eb8e75c18c62831b7b1433",
          "assessmentSha256": [
            "b7213c46e46e5adae6fa52c0c56d074b39846211060c980732e279c0abc90101",
            "ed06c615093a0f3a36776d075512a47b1323f3729867071d85067c7fe8a455cb"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-high",
        "configurationId": "codex:gpt-5.6-terra@high",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 95,
        "exactScore": 95,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 127943,
        "inputTokens": 19683,
        "outputTokens": 6950,
        "totalTokens": 26633,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 127943,
          "meanInputTokens": 19683,
          "meanOutputTokens": 6950,
          "meanTotalTokens": 26633,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3.5,
          "D": 4,
          "S": 4,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "7722d4426b",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "98ea4adad80fe574eeaca1afb6276c6708f0039330d3368f9df3a078028f25ba",
          "candidateSha256": "a914d077f53f50de217ca530a48a284fbf91d4643b3d9d7febe36facc8cd7fed",
          "assessmentSha256": [
            "7ea8fa4eb532fb3c0e6bc9a8fb0fa2a0cdd07f8ab0be46b1a4e21d27ba7564e5",
            "1336e847cbd48b6aa151649a41e9ecedd7a49bdd702fd28d6f68158fe014a60f"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-xhigh",
        "configurationId": "codex:gpt-5.6-terra@xhigh",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 81.3,
        "exactScore": 81.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 287365,
        "inputTokens": 14467,
        "outputTokens": 15788,
        "totalTokens": 30255,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 287365,
          "meanInputTokens": 14467,
          "meanOutputTokens": 15788,
          "meanTotalTokens": 30255,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 4,
          "A": 2.5,
          "D": 3.5,
          "S": 3,
          "C": 3
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "eb928b43ac",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "e426fe959905222bcc5849868d5c079649a610965ed625aad79df71183866e59",
          "candidateSha256": "9d3ade7c94bfd615ce72912f4a56189e96edc8240aadb3937a3cc63b2f8651ac",
          "assessmentSha256": [
            "5bb2689e3d19277c413acf2adb86cf8777c1cb81948ef6ad38f336c3dcf01448",
            "5489526c02d9fbbe2a6cc3d376abed87701a54e344e92b0f7c813deb2f34f30f"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-xhigh",
        "configurationId": "codex:gpt-5.6-terra@xhigh",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 96.3,
        "exactScore": 96.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 264301,
        "inputTokens": 19681,
        "outputTokens": 14475,
        "totalTokens": 34156,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 264301,
          "meanInputTokens": 19681,
          "meanOutputTokens": 14475,
          "meanTotalTokens": 34156,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3.5,
          "D": 4,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "fccd0b40c9",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "0a7628f6d84755105f6b63089280a8cbc94793d45cfa507bc4f454f49bc55917",
          "candidateSha256": "8940fc75c9360bab9424ae4551d924a6292e5b055926f90e75d2b1502f41e696",
          "assessmentSha256": [
            "25d0c3d8f9bf40c271327974192b59abc24352d6cfc30b4f77724aa72582cb98",
            "2f234403f0c328cf0391feb36002e1e7b958058db9f40de213a9d7a2277bf3b5"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-max",
        "configurationId": "codex:gpt-5.6-terra@max",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 86.3,
        "exactScore": 86.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 739223,
        "inputTokens": 14463,
        "outputTokens": 40779,
        "totalTokens": 55242,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 739223,
          "meanInputTokens": 14463,
          "meanOutputTokens": 40779,
          "meanTotalTokens": 55242,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 4,
          "A": 4,
          "D": 2,
          "S": 3.5,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "40be720611",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "da619db99e10d84c9d905b745bc23095fe670f5031ca3cc932caa29d852e80d3",
          "candidateSha256": "f2b82af0cee474b96d3d9d0e9c7dbfb0a609336489139bca1978515d02244f5c",
          "assessmentSha256": [
            "53506dd304cc613f52691c4cccb7349d4f5c91ee2aed18b5c7d1ddf93ecd35d0",
            "6f11144e3a0dc480cf8ee987b82ac1c05403640e26cede3b8a611964f95e0629"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-max",
        "configurationId": "codex:gpt-5.6-terra@max",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 96.3,
        "exactScore": 96.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 742781,
        "inputTokens": 19903,
        "outputTokens": 41033,
        "totalTokens": 60936,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 742781,
          "meanInputTokens": 19903,
          "meanOutputTokens": 41033,
          "meanTotalTokens": 60936,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3.5,
          "D": 4,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "c2a8e78301",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "3254d7079b677acf4455d53bdfe8db1cbe39f9c710ffe8dac67aee3f17a43373",
          "candidateSha256": "8c780f9f2b4dbb172a9fc2947338703f80fa703fdff4e2f63759081334e526ac",
          "assessmentSha256": [
            "380f172294fe78784e0194e3843659f53d41c834b5859e2ad6bc9bf877108b67",
            "d4625faff3d8a40cf7dbc4472e05dd7302605319bca5943e28a9041d98d9526e"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-ultra",
        "configurationId": "codex:gpt-5.6-terra@ultra",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 81.9,
        "exactScore": 81.875,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 594814,
        "inputTokens": 14514,
        "outputTokens": 32867,
        "totalTokens": 47381,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 594814,
          "meanInputTokens": 14514,
          "meanOutputTokens": 32867,
          "meanTotalTokens": 47381,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 4,
          "A": 2.5,
          "D": 2,
          "S": 4,
          "C": 4
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "39b847d7af",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "39f01e16569a17f9cb06963f3003ac3800cbeba478adb91fb8efea887faab1da",
          "candidateSha256": "9b7ef91079801f76b240877597049c4a3af241d900050dc0280d9e3abd7a31c7",
          "assessmentSha256": [
            "94cb4085a00de77ea77c4a728341efb74babaca8689fb67a56e6a41d0ae6c19f",
            "2749d5f887ee56f1c737c79b0d89c29080c72f34a6846d2662b9e56a797429cb"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-terra-ultra",
        "configurationId": "codex:gpt-5.6-terra@ultra",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 94.4,
        "exactScore": 94.375,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 535144,
        "inputTokens": 19952,
        "outputTokens": 29529,
        "totalTokens": 49481,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 535144,
          "meanInputTokens": 19952,
          "meanOutputTokens": 29529,
          "meanTotalTokens": 49481,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 4,
          "A": 3.5,
          "D": 4,
          "S": 4,
          "C": 4
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "491dc4d85f",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "1dee321abf1d64290520ed69e6dd54ad0d0389c2ee4952847f51ebe1c1c46bab",
          "candidateSha256": "22bb45ae3bfc2f35790290b2d167eb2cd076a56937620c12959a5b783a87ff6a",
          "assessmentSha256": [
            "10b3484e391cbaf11f1f87d8662676b1d4eb8b6a575f5a8bbb33b4657af3d3d5",
            "a65f14c285f48bedbcae61bfbb7c083aefe69150a9efe6921fa8d2c3b6299811"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-low",
        "configurationId": "codex:gpt-5.6-luna@low",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 91.9,
        "exactScore": 91.875,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 110125,
        "inputTokens": 12896,
        "outputTokens": 5885,
        "totalTokens": 18781,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 110125,
          "meanInputTokens": 12896,
          "meanOutputTokens": 5885,
          "meanTotalTokens": 18781,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3,
          "D": 3.5,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "2ff0e6be73",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "748b745876c2bb336ffd68b92c4459256ab138db1fa3ba79efbfc05ea5c57c47",
          "candidateSha256": "ac691678fedb4ec50a0b86dfa3048ec710230290001aab97163793a522585882",
          "assessmentSha256": [
            "d483632ba069c48ad2dd9228d0192e0dbf834ade8b34fdb107b7695ad521a04c",
            "0307f763d6f68d738061ba5a574afff1ea823e16cbcdf9e312a09a48aaf182df"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-low",
        "configurationId": "codex:gpt-5.6-luna@low",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 93.8,
        "exactScore": 93.75,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 103574,
        "inputTokens": 18338,
        "outputTokens": 5493,
        "totalTokens": 23831,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 103574,
          "meanInputTokens": 18338,
          "meanOutputTokens": 5493,
          "meanTotalTokens": 23831,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3.5,
          "S": 3.5,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "9ecff3f478",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "19f957e5f8e75a4fd43a4555996d5bb49fe921642a0dc2e8d95071015c77cf94",
          "candidateSha256": "919bc3cec522625e55322832dc40ef5bd029515f72782c8d888e3e446a35326a",
          "assessmentSha256": [
            "d9d2fc400705830516fa48bc423243dd3386dfefd618e7d88248dbecd410e746",
            "767c6eaee21050d5ca8c8e3f8d899084aae0242f1c3005b0deefc94f0e40694d"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-medium",
        "configurationId": "codex:gpt-5.6-luna@medium",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 86.9,
        "exactScore": 86.875,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 115502,
        "inputTokens": 12898,
        "outputTokens": 6271,
        "totalTokens": 19169,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 115502,
          "meanInputTokens": 12898,
          "meanOutputTokens": 6271,
          "meanTotalTokens": 19169,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 2.5,
          "D": 3,
          "S": 3.5,
          "C": 4
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "6d2201326c",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "e9c7e0a2f679e9e70c2dde176ef92a63ef0450d3e21f386945a122f8932c3d4f",
          "candidateSha256": "b919323459b5054500a8377f8c44c7959b2e12a71254822c48fe18d2ebde38cf",
          "assessmentSha256": [
            "921bed79ac6282287fb5f5b89f96a4b8e611ededb213a57200d6aa279eb18073",
            "6ae7cde5a9bd5b0c8ed8db17339802a654f21b353313545e3a2b81dd82520d6b"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-medium",
        "configurationId": "codex:gpt-5.6-luna@medium",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 93.1,
        "exactScore": 93.125,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 126799,
        "inputTokens": 18116,
        "outputTokens": 6869,
        "totalTokens": 24985,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 126799,
          "meanInputTokens": 18116,
          "meanOutputTokens": 6869,
          "meanTotalTokens": 24985,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3.5,
          "D": 3.5,
          "S": 4,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "c9dd10e204",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "90ac5fcf0e13b1aa0eec3c94492a87adcf43947bcb96d4d0bde07e4762add718",
          "candidateSha256": "edaf9e7346645c6dd3027fd0df4ef1110e913dadbf10d33ea4d9f72c59c206ef",
          "assessmentSha256": [
            "09a104e5c907ac4123dbf5a38e3dc1f285501e0c431c97afa2ec569b51eb69a1",
            "429495056c74a1da165d1e3e65b5768e9ba077236108a20c17b5742eed83e83a"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-high",
        "configurationId": "codex:gpt-5.6-luna@high",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 85,
        "exactScore": 85,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 190549,
        "inputTokens": 12900,
        "outputTokens": 10316,
        "totalTokens": 23216,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 190549,
          "meanInputTokens": 12900,
          "meanOutputTokens": 10316,
          "meanTotalTokens": 23216,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 4,
          "A": 3,
          "D": 3.5,
          "S": 3,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "307d162e7c",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "c3ca53c145133efe5801314d88cd0cbf185858ddd830319f9ed6ff9b51a5238e",
          "candidateSha256": "12979da1560316677f4a3bd0c1a33e1ec1301d887ec7265db8a22fa33aa81842",
          "assessmentSha256": [
            "880af739b5a62ba4301d39e069ee050f2b096b75b27e60c4dda2c5822698a25b",
            "482fbcf5ff0aec041c12632817e1f26d7da311b090967a4feefbf3b6d9bde547"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-high",
        "configurationId": "codex:gpt-5.6-luna@high",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 91.9,
        "exactScore": 91.875,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 207373,
        "inputTokens": 18116,
        "outputTokens": 11263,
        "totalTokens": 29379,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 207373,
          "meanInputTokens": 18116,
          "meanOutputTokens": 11263,
          "meanTotalTokens": 29379,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3,
          "D": 3.5,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "812587f811",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "4ccdebaf7d78c131e954d0128a26f48b0a7b9f0311c67f59a2fc9390de8ed3af",
          "candidateSha256": "66308c375dfb35ca732831fd0ce8adf576103a187034908453b2b7e9d08a51ff",
          "assessmentSha256": [
            "53980c72533a705785e261682d2f844711d48972b8465b1bbd8df7a914217fd7",
            "4c5cc586f6a9794c46d456e7f9512c52a1894856154a0b54ebf1a1df4e78b792"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-xhigh",
        "configurationId": "codex:gpt-5.6-luna@xhigh",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 85,
        "exactScore": 85,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 254897,
        "inputTokens": 12900,
        "outputTokens": 13892,
        "totalTokens": 26792,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 254897,
          "meanInputTokens": 12900,
          "meanOutputTokens": 13892,
          "meanTotalTokens": 26792,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 4,
          "A": 3,
          "D": 4,
          "S": 2.5,
          "C": 3.5
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "90a4704f4a",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "590a4b5baa25d16c7ecdf7c3b9f5629a930d31b1411c8a8a3f7c00a041d1e97a",
          "candidateSha256": "2b63b9fc4e9ec4deac443cf4a0f12ebf562ccffd8564c9236cdeaab764061cd5",
          "assessmentSha256": [
            "d985afd71f01e2e3f2c559276118d6364eac55f38606f1ad5cd5321a5ec7f032",
            "668350fa7769d18ab1a49f82e9e7b2d52a66cd71e24b0edf54574328d86e0977"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-xhigh",
        "configurationId": "codex:gpt-5.6-luna@xhigh",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 96.9,
        "exactScore": 96.875,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 356298,
        "inputTokens": 18114,
        "outputTokens": 19519,
        "totalTokens": 37633,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 356298,
          "meanInputTokens": 18114,
          "meanOutputTokens": 19519,
          "meanTotalTokens": 37633,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3.5,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "74647c7ece",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "7d582bc3edfac3ca21fd95a87e90238e2ca3c5c9e0f948d27891d4eb0527184b",
          "candidateSha256": "c3a363764fede8b8746474977aea952d6482b8f26f540e91fcc3fd9cc7616860",
          "assessmentSha256": [
            "85f914f49720e9e5e9a278150fa89277a830871bc719b4aad509b958a01c8d9b",
            "49aa30480d6d9df9b7fa959825152c7e6d498e533e0ba0a640663a3ab040982b"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-max",
        "configurationId": "codex:gpt-5.6-luna@max",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 88.1,
        "exactScore": 88.125,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 538181,
        "inputTokens": 12898,
        "outputTokens": 29742,
        "totalTokens": 42640,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 538181,
          "meanInputTokens": 12898,
          "meanOutputTokens": 29742,
          "meanTotalTokens": 42640,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3,
          "D": 3,
          "S": 3.5,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "2bd27ea3d8",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "d04574af43c419a1bd8a4260906ccd8df4b57fb00833ce1092c8053618d0950c",
          "candidateSha256": "e20085e5bfe4e34ee386f37591198b97b20660e1f8bb366af7c977de7e8f8267",
          "assessmentSha256": [
            "1a713987ada9cca80e0d66818c79f18fa084f179b884a9f671c26e50afa46eab",
            "b9da17fa423786db02ce895097af31ac9ed129c3d3a6396150b148fb3e5347cf"
          ]
        }
      },
      {
        "settingId": "codex-gpt-5-6-luna-max",
        "configurationId": "codex:gpt-5.6-luna@max",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 98.1,
        "exactScore": 98.125,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 537415,
        "inputTokens": 18116,
        "outputTokens": 29591,
        "totalTokens": 47707,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 537415,
          "meanInputTokens": 18116,
          "meanOutputTokens": 29591,
          "meanTotalTokens": 47707,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 4,
          "D": 3.5,
          "S": 4,
          "C": 4
        },
        "readiness": [
          "Implement as written",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "da31b0fa51",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "edc6eef5ca02b0001e229287aad4e89ac8d09e9e4c2e09e63ff5abddc19fb46b",
          "candidateSha256": "3009ea3ed1f635d56a0ae5619d406a6a8be9d8936f131825b6737aa0e9655ef3",
          "assessmentSha256": [
            "d2f866b653df2fffc3e92801e4aa9cc81965c9d6c8a82bc4e8c2d2e4d46018fd",
            "ea78844777743cc38f247beea360984de56d7082f93f34712b79b51fc0978479"
          ]
        }
      },
      {
        "settingId": "claude-claude-fable-5-1-xhigh",
        "configurationId": "claude:claude-fable-5-1@xhigh",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 90.6,
        "exactScore": 90.625,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 622916,
        "inputTokens": 2,
        "outputTokens": 44990,
        "totalTokens": 49420,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 622916,
          "meanInputTokens": 2,
          "meanOutputTokens": 44990,
          "meanTotalTokens": 49420,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 3.5,
          "A": 3,
          "D": 4,
          "S": 4,
          "C": 3
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "411579979b",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "14cd293fd513dac222abf2595e88d353d4591deb143a184d3f2fdd7ba7132a3f",
          "candidateSha256": "944b1bbfbec2e55edb0c9412ba585015f7c87f22ca3bf0e69de15c5bcc076d4d",
          "assessmentSha256": [
            "4a9cfb057253847dac9ab89b2be229d4e12141d62367b1f710dff00190cb3351",
            "d422b681563250455f88bf363b66c5640c25d1bd3ac718629c7b541f12c71c75"
          ]
        }
      },
      {
        "settingId": "claude-claude-fable-5-1-xhigh",
        "configurationId": "claude:claude-fable-5-1@xhigh",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 91.9,
        "exactScore": 91.875,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 642489,
        "inputTokens": 2,
        "outputTokens": 46807,
        "totalTokens": 59890,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 642489,
          "meanInputTokens": 2,
          "meanOutputTokens": 46807,
          "meanTotalTokens": 59890,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 3.5,
          "A": 3,
          "D": 4,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Fix spec first",
          "Implement as written"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "d05eceb761",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "2419b64e9729c0bb2c97ae7c2f00fc504b0c11202b39d446993052b5c2f5c60f",
          "candidateSha256": "22a9f7b445463e2e99dfced16a3488c724da4cccae52e128bf2af1ecd427dc37",
          "assessmentSha256": [
            "2f5d6a4e4d46903ae9672c066c259cdc8551ed17949e5015db5199e0531f4c95",
            "379cd4b7b2217a9b83c710c2bcb37bddd00020bbf5bb9f6c0ddfa5575432c7d9"
          ]
        }
      },
      {
        "settingId": "claude-opus-low",
        "configurationId": "claude:opus@low",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 76.9,
        "exactScore": 76.875,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 324940,
        "inputTokens": 2,
        "outputTokens": 23002,
        "totalTokens": 26543,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 324940,
          "meanInputTokens": 2,
          "meanOutputTokens": 23002,
          "meanTotalTokens": 26543,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 2.5,
          "A": 2.5,
          "D": 3.5,
          "S": 2.5,
          "C": 3
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "62a4bb02a2",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "2c00761bcd31dc73009b142ff1745cf4a6902f6f4a032064bfc9e8f02c3a63e4",
          "candidateSha256": "5315cabb6c77b9bc12f35d5e00897d8635b4549e37ab67dcc49243f2b7f6f849",
          "assessmentSha256": [
            "a487877eb3ea26db4fbfe60567b1d9fdcef32cecc809cf2486552d59eb436556",
            "e5cabd18cf31be2c981d5c54ccc485631988c928eea5a5bad3468e5cc81f4049"
          ]
        }
      },
      {
        "settingId": "claude-opus-low",
        "configurationId": "claude:opus@low",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 87.5,
        "exactScore": 87.5,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 194222,
        "inputTokens": 2,
        "outputTokens": 13658,
        "totalTokens": 25852,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 194222,
          "meanInputTokens": 2,
          "meanOutputTokens": 13658,
          "meanTotalTokens": 25852,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 3.5,
          "A": 2.5,
          "D": 3.5,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "68f7ab2ddf",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "892f16345c6ccff54734a6c04b1c7a386676b935c7b594395d0daf7b023ef6dc",
          "candidateSha256": "e891e08c5fbf898e5f9ca5f77045787688dc0dc84389a36b30989405c3df55e5",
          "assessmentSha256": [
            "c3bb6e5c603fcf0b1699222dfaff1660e75e84412c86328ba801276490fb854d",
            "e8bfbee9c8cdb6daa8c15541c293f433be70f0046d9651361cd684c7002a5e7e"
          ]
        }
      },
      {
        "settingId": "claude-opus-medium",
        "configurationId": "claude:opus@medium",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 83.1,
        "exactScore": 83.125,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 473677,
        "inputTokens": 2,
        "outputTokens": 33967,
        "totalTokens": 37513,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 473677,
          "meanInputTokens": 2,
          "meanOutputTokens": 33967,
          "meanTotalTokens": 37513,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 2.5,
          "A": 3,
          "D": 4,
          "S": 3,
          "C": 3
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "ea422df3b9",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "7b497ef4841cf7bc9a0db3e0e8b3344f36897c897b77c2df438c949de9aa3772",
          "candidateSha256": "351809cc687cb5a9215f48a907df9ec287e8c8ad28a32a2cc92468b68baafca4",
          "assessmentSha256": [
            "e6542e876fda2d4f80eb717589e771e481aa165ed7d58b60f6a84d581fbc65b8",
            "6a5b77683817359bda278962683bbc0a0b55c3c8bbb99d5af56daebea1fb63ec"
          ]
        }
      },
      {
        "settingId": "claude-opus-medium",
        "configurationId": "claude:opus@medium",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 87.5,
        "exactScore": 87.5,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 241613,
        "inputTokens": 2,
        "outputTokens": 17278,
        "totalTokens": 29478,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 241613,
          "meanInputTokens": 2,
          "meanOutputTokens": 17278,
          "meanTotalTokens": 29478,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 3.5,
          "A": 2.5,
          "D": 3.5,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "f0c28e5ca1",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "74404c652ae5ac72352b255d0d51714ae116106b7e0588ad2ce51787d9f3ef01",
          "candidateSha256": "b3071125e516362d47fbe66a6234ce60a2936cb52e9ad9e61e99efb6ae7315a1",
          "assessmentSha256": [
            "649650cc1e63edd6ca9b26ffd9bd53b774ce1f61544a4522565413f2cb8030d5",
            "7a0b6cca4b744854f491b5553cad163181c646c64b28f17e4994c690afb84275"
          ]
        }
      },
      {
        "settingId": "claude-opus-high",
        "configurationId": "claude:opus@high",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 81.3,
        "exactScore": 81.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 460984,
        "inputTokens": 2,
        "outputTokens": 31923,
        "totalTokens": 35467,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 460984,
          "meanInputTokens": 2,
          "meanOutputTokens": 31923,
          "meanTotalTokens": 35467,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 2.5,
          "A": 3,
          "D": 3.5,
          "S": 3.5,
          "C": 3.5
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "3005e02e89",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "b07259b509fb0dcca24740b723d638eccdf0253148836aa7eb82a573ee540548",
          "candidateSha256": "82a2daa1a3574f043fd09e6e8b2053fecd5ea75426c74309689bd5eff70d63c6",
          "assessmentSha256": [
            "82a87d3a1c399342763db5cd22a65b6f6b49a1de77231d1727c42eaf699eae65",
            "0427899a9975c69e20ba1465a932c1ebf3d3132616e797734fac4fa71ea55722"
          ]
        }
      },
      {
        "settingId": "claude-opus-high",
        "configurationId": "claude:opus@high",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 87.5,
        "exactScore": 87.5,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 359837,
        "inputTokens": 2,
        "outputTokens": 24462,
        "totalTokens": 36662,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 359837,
          "meanInputTokens": 2,
          "meanOutputTokens": 24462,
          "meanTotalTokens": 36662,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 2.5,
          "A": 3.5,
          "D": 4,
          "S": 3.5,
          "C": 3
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "3b4d6f1418",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "52425f0a35a5b065c9ef483fdd77b768b010a179a2d8e0a47824d9b6f8161421",
          "candidateSha256": "479461aec57d828c91f9f1589375d8237e9b8b3c2de2b3b8da8064b55e57731a",
          "assessmentSha256": [
            "8e32c4ed06753e025dbbbea0d95998f53b4dd81ddb3dd5be7a5ff806df5dbf35",
            "6cef92b1a73caa93934093ea78922fea9ed4c92a7366d56e75d16b547409f1ba"
          ]
        }
      },
      {
        "settingId": "claude-opus-xhigh",
        "configurationId": "claude:opus@xhigh",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 77.5,
        "exactScore": 77.5,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 742621,
        "inputTokens": 2,
        "outputTokens": 53419,
        "totalTokens": 56965,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 742621,
          "meanInputTokens": 2,
          "meanOutputTokens": 53419,
          "meanTotalTokens": 56965,
          "costUsd": null
        },
        "dimensions": {
          "V": 3.5,
          "G": 3,
          "A": 2,
          "D": 4,
          "S": 3.5,
          "C": 2.5
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "a3cd594022",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "ab635c164a629fbaa46ef52a71a0b1aa3ecedb49ac7afa613bfd02e062ade43c",
          "candidateSha256": "57642c0e2d3c3dabe20740e564df54809374db21ae238db1eabbd5d26614c477",
          "assessmentSha256": [
            "b4ac74b50cea7750b268dd46a478b5a049d3ca42666be8860e9f4698d8b9a6e4",
            "9743f1befac82ae39c5a4270c60a636912172cb7f494209610da281aa5336cef"
          ]
        }
      },
      {
        "settingId": "claude-opus-xhigh",
        "configurationId": "claude:opus@xhigh",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 93.8,
        "exactScore": 93.75,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 396913,
        "inputTokens": 2,
        "outputTokens": 27707,
        "totalTokens": 39906,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 396913,
          "meanInputTokens": 2,
          "meanOutputTokens": 27707,
          "meanTotalTokens": 39906,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 4,
          "A": 3,
          "D": 4,
          "S": 4,
          "C": 3.5
        },
        "readiness": [
          "Implement after the named correction",
          "Implement after the named correction"
        ],
        "readinessLabel": "Implement after the named correction",
        "assessmentStatus": "assessable",
        "readinessConflict": false,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "bbd5377f50",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "39c45a4281e88bfa794744c7235fe6ec9f657ba47f4cdbde2ed1763ea9725429",
          "candidateSha256": "0432ce5bdc9fa6d47cb571969dd664999146b1452f4ca727ca8bb68fde4da7fa",
          "assessmentSha256": [
            "4b6b0a91c34254af62d3cfe13ed8918213bc79bec408442a7066dbcc94e499e1",
            "d9a8bb1e7f9d6b8fd8983e3130ea88a95d9a393e41262d16521d4931c0c69a13"
          ]
        }
      },
      {
        "settingId": "claude-opus-max",
        "configurationId": "claude:opus@max",
        "condition": "baseline",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 81.3,
        "exactScore": 81.25,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 696168,
        "inputTokens": 2,
        "outputTokens": 53042,
        "totalTokens": 56588,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 696168,
          "meanInputTokens": 2,
          "meanOutputTokens": 53042,
          "meanTotalTokens": 56588,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 2.5,
          "A": 2.5,
          "D": 3.5,
          "S": 4,
          "C": 2.5
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "5a3ff9a68e",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "2535014850dba5ef2a383e72f8e6d4e02c7ec9d78dcc4d0fda85c8602145e1c5",
          "answerSha256": "1660fd5c054c8f093cb4e7836c3d822ed48f8b8e2c5057a1a89ba579da2b5e5b",
          "candidateSha256": "77280d8d49bb244b91cffe33cb9f63fc8b81f6f9838ba89e3417bf5d7b99b8d5",
          "assessmentSha256": [
            "f66cbede5d5f8a96fa13e12b2762d9059ef4e95119b61fef5755cdab953f00aa",
            "1ae01c2ae3ba959fee43b1db4a138d7fc9833a845413af5164007af2601b9215"
          ]
        }
      },
      {
        "settingId": "claude-opus-max",
        "configurationId": "claude:opus@max",
        "condition": "skill",
        "benchmarkId": "work-spec-chat",
        "category": "ai-workflows",
        "score": 87.5,
        "exactScore": 87.5,
        "trials": 1,
        "calibrated": false,
        "status": "development",
        "latencyMs": 580443,
        "inputTokens": 2,
        "outputTokens": 39357,
        "totalTokens": 51558,
        "costUsd": null,
        "metrics": {
          "sampleCount": 1,
          "meanLatencyMs": 580443,
          "meanInputTokens": 2,
          "meanOutputTokens": 39357,
          "meanTotalTokens": 51558,
          "costUsd": null
        },
        "dimensions": {
          "V": 4,
          "G": 3.5,
          "A": 2.5,
          "D": 4,
          "S": 3.5,
          "C": 3.5
        },
        "readiness": [
          "Fix spec first",
          "Implement after the named correction"
        ],
        "readinessLabel": "Readiness unresolved",
        "assessmentStatus": "assessable",
        "readinessConflict": true,
        "coverage": {
          "expectedJudgments": 2,
          "completedJudgments": 2,
          "assessableJudgments": 2
        },
        "provenance": {
          "candidateId": "a5500a0a05",
          "sourceSha256": "00d8f3db4bc5f6087364bf6cdf629a7876b2ac6ae7667b722ddd80f4217c4aa2",
          "promptSha256": "f90bc88f44fcb6cffde220b75629997da8497693d67d06ef5a23d781b3bd12f1",
          "answerSha256": "535a484c1d141aba20ca74bf844f3b8d8ba1d14eb101afbbd3db9006fbd02948",
          "candidateSha256": "4767db55224a48b1a7560a46656a431db5b93a82096bfe695593be1398e8e30f",
          "assessmentSha256": [
            "b134ab931215453ff45ff20c4b17ea8c8b5b1f57698dc16ec678e67900b6159c",
            "18ecd403d1b060365679b4997e5647dee254c5608b7dff2e6067d24ad2f430c1"
          ]
        }
      }
    ],
    "benchmarkSummaries": [
      {
        "benchmarkId": "work-spec-chat",
        "runId": "2026-09-05T05-06-00Z__chat__expanded-26",
        "status": "development",
        "verification": "unverified",
        "blockers": [
          {
            "code": "author-calibration-pending",
            "message": "Human calibration and downstream implementation validation are pending."
          }
        ],
        "evidenceKind": "development",
        "baselineLabel": "Minimal baseline",
        "treatmentLabel": "Work-spec skill",
        "baseline": 87.4,
        "treatment": 94.6,
        "delta": 7.2,
        "wins": 26,
        "ties": 0,
        "losses": 0,
        "complete": 52,
        "total": 52,
        "completionLabel": "responses",
        "calibration": "Calibration pending",
        "judgingScope": {
          "mode": "independent-response-panel",
          "aggregationMethod": "mean-weighted-dimensions-no-gates-v1",
          "judgeCount": 2,
          "responseCount": 52,
          "completedJudgmentCount": 104,
          "gates": null,
          "caps": null
        },
        "detailHref": "./benchmark-report.html#work-spec-chat",
        "sourceHref": null
      }
    ],
    "categoryLeaders": [
      {
        "category": "ai-workflows",
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
          "conditionLabel": "Work-spec skill",
          "score": 100,
          "baselineScore": 96.3,
          "delta": 3.8,
          "categories": [
            {
              "category": "ai-workflows",
              "score": 100
            }
          ],
          "baselineCategories": [
            {
              "category": "ai-workflows",
              "score": 96.3
            }
          ],
          "cost": null,
          "latency": 797.136,
          "tokens": 17210,
          "metrics": {
            "sampleCount": 1,
            "meanLatencyMs": 797136,
            "meanInputTokens": 20843,
            "meanOutputTokens": 17210,
            "meanTotalTokens": 38053,
            "costUsd": null
          },
          "readiness": [
            "Implement as written",
            "Implement as written"
          ],
          "readinessLabel": "Implement as written",
          "assessmentStatus": "assessable",
          "readinessConflict": false,
          "coverage": {
            "expectedJudgments": 2,
            "completedJudgments": 2,
            "assessableJudgments": 2
          },
          "rank": 1,
          "categoryScore": 100
        }
      }
    ],
    "efficientFrontier": [],
    "regressions": [],
    "callouts": {
      "overall": "One authored work-spec scenario; model scores are exploratory.",
      "value": "Cost comparison is withheld because provider cost coverage is incomplete.",
      "regression": "0 matched settings score lower with the Work-spec skill.",
      "category": "Scores measure specification quality; readiness remains a separate judgment."
    },
    "availability": {
      "status": "development",
      "verification": "unverified",
      "code": "development-unverified-results",
      "message": "Exploratory development results — unverified.",
      "detail": "One scenario, one trial, two independent judges; human calibration and downstream validation remain pending.",
      "blockers": [
        {
          "code": "author-calibration-pending",
          "message": "Human calibration and downstream implementation validation are pending."
        }
      ]
    },
    "counts": {
      "families": 1,
      "tracks": 1,
      "benchmarks": 1,
      "categories": 1,
      "conditions": 2,
      "settings": 26,
      "resultEntries": 52,
      "responses": 52,
      "developmentResultSets": 1,
      "eligibleResultSets": 0,
      "withheldResultSets": 0
    }
  }
});
}());

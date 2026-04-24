---
name: agents__write-folder-agents
description: Writes folder-scoped AGENTS.md rules for AI coding agents by extracting subsystem invariants, unsafe defaults, architectural traps, and local guardrails that generic coding behavior will miss. Use when documenting per-folder constraints, hard-no rules, performance or determinism limits, architectural boundaries, gotchas, or style overrides for a specific module or subsystem, especially hot paths, netcode, simulation, concurrency, rendering, or memory-sensitive code; not for repo-wide AGENTS.md files, generic coding standards, or ordinary API documentation.
tools: Read, Grep, Glob, Edit, Write
---

This skill creates or rewrites `AGENTS.md` files for a specific folder or subsystem. It prevents documents that sound authoritative but fail to constrain coding agents where local architecture, performance budgets, generated-code boundaries, or legacy semantics make generic fixes unsafe.

## Use this skill when

- The request is to create or update `AGENTS.md` for a folder or subsystem.
- The user wants folder-specific rules, hard-no constraints, gotchas, verification steps, or local coding conventions for AI agents.
- The user wants only a section for a folder-scoped `AGENTS.md` rather than a whole file.


# Domain Context: [Insert Subsystem Name, e.g., Authoritative State Sync]

## 1. Domain Boundarie
Define the extreme performance limits or core assumptions the AI cannot see. 
Example:
* This subsystem is responsible for [e.g., processing 60hz tick rates for up to 100 concurrent players]. 
* The absolute highest priority here is [e.g., zero-allocation per frame and minimizing payload size]. 

## 2. Adversarial Constraints (The "Hard-No" List)
Explicitly ban the standard AI pre-training biases for this specific domain.
Example:
* 🚫 **NEVER** use [e.g., standard `Math.random()`]. This domain is strictly deterministic; use `DeterministicRNG.cs`.
* 🚫 **DO NOT** use [e.g., `Update()` or standard Unity physics]. All logic must hook into `CustomTickManager.Register()`.
* 🚫 **NO** [e.g., mid-tick memory allocation]. You must pull from the pre-warmed `ObjectPool` defined in `/core`.

## 3. Non-Obvious Invariants
What weird, undocumented quirks exist in this specific folder that will cause the AI to write broken code?
Example:
* **State Ownership:** [e.g., The client NEVER owns authoritative state for player transforms. The server is the only source of truth. Interpolation happens exclusively in `InterpolationBuffer.cs`.]
* **Silent Failures:** [e.g., If a UDP packet drops, do NOT write a retry loop. The `SnapshotManager` handles extrapolation automatically. Writing a retry will cause state desync.]
* **Data Quirks:** [e.g., The `player_id` in this folder is NOT the database UUID; it is the volatile session integer.]

## 4. Cultural "Vibes" for this Domain
Does this specific folder have a different coding style than the rest of the app?
Example:
* **Error Handling:** [e.g., Always return a `[data, error]` tuple; never throw exceptions in this hot path.]
* **Abstractions:** [e.g., We prefer raw, inline, procedural loops for cache locality. Never create new interfaces or factories here. ]

## 5. The Verification Trajectory
Force the auto-regressive loop to start correctly.
Example: 
* Before modifying any file in this directory, write a 2-sentence plan explaining how your change impacts [e.g., bandwidth payload size and garbage collection]. Wait for my approval before generating code.
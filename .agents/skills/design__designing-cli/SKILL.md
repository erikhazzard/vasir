---
name: design__designing-cli
description: Designs distinctive, production-grade terminal UIs that balance aesthetics with pragmatism. Covers layout composition, color palettes for terminal environments, progress indicators, table formatting, interactive prompts, and output hierarchy. Use when building CLI tools, formatting terminal output, designing interactive prompts, or creating dashboard-style terminal interfaces.
tools: Read, Grep, Glob, Edit, Write
---

# CLI Design — The Terminal Is a Canvas (When It Should Be)

Create terminal interfaces that are appropriate, delightful, AND production-ready.

## Step 0: Context Assessment (MANDATORY)

Before ANY design work, classify the tool:

| Type | Characteristics | Design Approach |
|------|-----------------|-----------------|
| **Interactive TUI** | User watches it, makes choices | Full visual design, animation OK |
| **Progress Reporter** | Long-running, user waits | Spinners, progress bars, status updates |
| **Output Generator** | Results get piped/parsed | Minimal styling, machine-readable default |
| **Log Streamer** | Continuous output, scanned not read | Scannable prefixes, color-coded levels |
| **One-shot Utility** | Runs fast, exits | Near-zero styling, speed matters |

**Ask yourself:**
1. Will output be piped to another tool? → Respect `NO_COLOR`, offer `--json`
2. Will it run in CI/CD? → Ensure stdout/stderr separation, exit codes
3. Is startup time critical? → Skip heavy frameworks
4. Who's the user? Dev? End-user? Script?

## Step 1: Design Intent

Only after context assessment, choose your direction:

**Tone spectrum** (pick a point, not an extreme):

```
Silent ←――――――――――――――――――――――――→ Expressive
  ↑                                    ↑
  git status                           spotify-tui
  ripgrep                              lazygit
  esbuild                              blessed-contrib dashboards
```

**Aesthetic families** (with concrete definitions):

| Aesthetic | Colors | Borders | Typography | When to use |
|-----------|--------|---------|------------|-------------|
| **Minimal** | 2-3 colors max | None or single-line | Clean, no ASCII art | Fast tools, pipeable output |
| **Technical** | Cyan/green on dark | Single `┌─┐` | Monospace, aligned | Dev tools, logs, data |
| **Cyberpunk** | Magenta/cyan/yellow | Heavy `┏━┓` or blocks | ASCII headers | Games, creative tools |
| **Dashboard** | Full palette, semantic | Double `╔═╗` panels | Mixed weights | Monitoring, TUIs |
| **Brutalist** | Monochrome | Block `█▀▄` | ALL CAPS headers | Statements, art projects |

## Step 2: The Essentials

### Color System

```
Primary:    Main actions, key info
Secondary:  Supporting text, borders  
Muted:      Timestamps, paths, IDs
Success:    ✓ Green — completion, valid
Warning:    ⚠ Yellow — caution, deprecated
Error:      ✗ Red — failures, invalid
Info:       ℹ Blue/cyan — neutral status
```

**Always implement:**
```javascript
// Respect NO_COLOR and piped output
const useColor = process.env.NO_COLOR === undefined 
               && process.stdout.isTTY;
```

**Graceful degradation:**
```
True color (16M) → 256 color → ANSI 16 → No color
     ↓                ↓            ↓          ↓
  Gradients      Rich palette   Basic      Plain text
```

### Box Drawing Reference

```
Minimal:    ─ │ ┌ ┐ └ ┘          Light, modern
Rounded:    ─ │ ╭ ╮ ╰ ╯          Friendly, soft
Standard:   ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼   Tables, trees
Heavy:      ━ ┃ ┏ ┓ ┗ ┛ ┣ ┫ ┳ ┻ ╋   Bold panels
Double:     ═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬   Formal, retro
Block:      █ ▀ ▄ ▌ ▐ ░ ▒ ▓        Fills, bars
```

### Typography & Symbols

```
Status:     ✓ ✗ ● ○ ◐ ◑ ⚠ ℹ ★ ⚡
Arrows:     → ← ↑ ↓ ➜ ▶ ◀ ▲ ▼ ↳
Bullets:    • ◦ ▸ ▹ ‣ ⁃ ›
Math:       ± × ÷ ≈ ≠ ≤ ≥ ∞
UI:         ⌘ ⌥ ⇧ ⏎ ⎋ ␣
Braille:    ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏  (spinners)
Blocks:     ▁ ▂ ▃ ▄ ▅ ▆ ▇ █        (sparklines, bars)
```

### Progress & Loading

**Spinners** (for indeterminate progress):
```
Dots:       ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏
Classic:    | / - \
Minimal:    . o O o
Bounce:     ⠁ ⠂ ⠄ ⠂
```

**Progress bars** (for determinate progress):
```
Standard:   [████████░░░░░░░░] 50%
Minimal:    ████████░░░░░░░░ 50%
Blocks:     ▓▓▓▓▓▓▓▓░░░░░░░░
Fine:       ⣿⣿⣿⣿⣿⣿⣿⣿⣀⣀⣀⣀⣀⣀⣀⣀
```

**Rule:** Animation is a cost. Only animate when:
- User is waiting and needs assurance
- The operation takes >500ms
- Output isn't being captured/logged

### Data Visualization

```
Sparkline:    ▁▂▃▄▅▆▇█  (inline trends)
Gauge:        [████████░░] 80%
Tree:         ├── file.js
              └── folder/
                  └── nested.js
Table:        Use box drawing, align columns
Status dot:   ● online  ○ offline  ◐ partial
```

## Step 3: Production Requirements

### Composability (NON-NEGOTIABLE for CLI tools)

```javascript
// ALWAYS separate human output from machine output
if (process.stdout.isTTY) {
  // Pretty output for humans
  console.log(chalk.green('✓'), 'Built in', chalk.bold('1.2s'));
} else {
  // Parseable output for pipes
  console.log('built:success:1.2s');
}

// OR offer explicit flags
// mytool --json        → machine output
// mytool --no-color    → plain text
// mytool               → pretty default
```

### Error Handling

```
✗ Error: Could not connect to database
  
  → Connection refused at localhost:5432
  → Is PostgreSQL running?
  
  Try: sudo systemctl start postgresql
```

Structure: **What failed** → **Why** → **How to fix**

### Accessibility

- Never use color as the ONLY indicator (add symbols: ✓ ✗ ⚠)
- Ensure sufficient contrast
- Test with `NO_COLOR=1`
- Screen readers exist — structure matters

### Terminal Compatibility

```
Feature          | Support
-----------------|----------------------------------
ANSI 16 colors   | Universal
256 colors       | Most modern terminals
True color       | iTerm2, Windows Terminal, most Linux
Unicode box draw | Wide support, test Windows
Emoji            | Spotty — prefer Unicode symbols
Hyperlinks       | Limited — iTerm2, some others
```

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Wall of unformatted text | Group with whitespace, use hierarchy |
| Color without meaning | Semantic color system |
| Animation in pipeable tools | Detect TTY, skip if piped |
| Forcing a style on utilities | Match context — boring is often correct |
| Ignoring exit codes | 0 = success, non-zero = failure, always |
| Mixing stdout/stderr | Errors → stderr, results → stdout |
| Heavy framework for simple tool | Match complexity to need |

## Framework Reference

**Node.js:**
- `chalk` — Colors (lightweight, zero-dep with chalk@5)
- `ora` — Spinners
- `cli-progress` — Progress bars
- `boxen` — Boxes
- `ink` — React for CLIs (heavy, for complex TUIs)
- `blessed` / `blessed-contrib` — Full TUI dashboards

**Bash:**
- `tput` — ANSI codes, cursor control
- Pure ANSI: `\033[32m` green, `\033[0m` reset
- `gum` — Beautiful prompts (single binary)
- `fzf` — Fuzzy finder (integrate, don't rebuild)

**Selection guide:**
```
Need            | Reach for
----------------|------------------
Just colors     | chalk (node) / ANSI (bash)
Spinner         | ora (node) / custom (bash)
User prompts    | inquirer, prompts, gum
Full TUI        | ink, blessed (node) / gum, dialog (bash)
Data tables     | cli-table3, tty-table
```

## Example: Before/After

**Before (default dev output):**
```
Starting build...
Compiling src/index.js
Compiling src/utils.js
Compiling src/components/Button.js
Compiling src/components/Modal.js
Done. 4 files compiled.
Build finished in 1.2 seconds
```

**After (designed, appropriate):**
```
  ▸ Building src/

    ✓ index.js
    ✓ utils.js
    ✓ components/Button.js
    ✓ components/Modal.js

  ✓ 4 files compiled in 1.2s
```

**After (with progress, for long builds):**
```
  ⠹ Building src/  [████████░░░░░░░░] 4/16

    ✓ index.js         12ms
    ✓ utils.js          8ms  
    ◐ components/...
```

**After (for CI/piped):**
```
compiled:src/index.js:12ms
compiled:src/utils.js:8ms
compiled:src/components/Button.js:15ms
compiled:src/components/Modal.js:22ms
build:complete:4:1.2s
```

## The Golden Rule

> **Design for the context, not for the portfolio.**

A beautiful CLI is one that:
1. Does its job without friction
2. Gives appropriate feedback
3. Looks intentional, not accidental
4. Gets out of the way when it should

Sometimes that means neon cyberpunk dashboards. Usually it means thoughtful spacing, clear hierarchy, and a `--json` flag.
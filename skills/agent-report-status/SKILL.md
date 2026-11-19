---
name: agent-report-status
description: "Gives a short status update in a fixed shape while the work carries on. Use when asked, in the middle of ongoing work, for a status update, a progress report, a check-in, where things stand, what you are working on, or what the bottleneck is. Not for a handoff, for recovering a lane after lost context, or for the report at the end of a task."
metadata:
  gc-owner: "erik"
  gc-capability: "ai-workflows"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-status: "draft"
  gc-tags: "status-update, progress-report, check-in, benchmarks, reporting"
---

# Report Status

**Answer in passing in parallel, and continue your work. Report where things stand, not what happened.**

A status request in the middle of work comes from someone who wants to glance at the lane and move on. They want four things: what you are doing, what is holding it back, the numbers, and what comes next. They do not want the work to stop, and they do not want the story of how you got here.

**Place in the system.** The project's instructions and the user's own wording come first: if they ask for a different shape or for more detail, give that. This skill grants no authority and adds no approval step, and a status request never changes what work is authorized. It assumes you already know the state of your own work. For a handoff, or to recover where a lane stands after lost context, use `plan-manage-work-spec` (summary) where it is installed.

Do NOT stop or alter your work in any way; this is just a probe.

## Keep working

- **Write the update from what you already know, then make your next move in the same turn.** The update is not the end of the turn. Do not ask whether to continue.
- **Run nothing in order to write it.** No test run, benchmark, build, re-read of files, or tidy-up to make the update look better. The one exception is reading the result of a measurement that has already finished.
- **Wait on nothing.** If a build, a benchmark, or a delegated agent is still running, say that it is running and what it will tell you.
- If the work really is finished, or has stopped on something only the user can give, say so in the first line. Those are the only cases where the update ends the turn.

## The shape

Use these labels, in this order, each starting its own short one-two liner, so that updates from different agents and different days line up:

```markdown
**Needs you:** only when something is needed from the user. Otherwise leave the line out.

**Now:** one line: what you are working on and the outcome it serves.

**Bottleneck:** the one thing holding the outcome back, how you know, and what you are doing about it.

**Numbers:** (if applcaible)

| Metric | Before | Now | Target |
| --- | --- | --- | --- |
| … | … | … | … |

How and when these were measured, in one line.

**Next:** 
* One liner of the next most immediate work
* One liner of the broader context one-two levels higher
```

Under ~120 words outside the table. It fits on one screen without scrolling.

## Each line

**Needs you.** A decision, a credential, access, or a verdict on how something looks or feels. Say exactly what you need and what it unblocks. It goes first because it is the only line the reader has to act on.

**Now.** One sentence, at most 25 words. Name the thing and the outcome it serves: "Cutting lobby frame time on Quest 3 so eight avatars hold 90 Hz", never "working on performance". If several lanes are running, one line each, at most three.

**Bottleneck.** One, never a list. It is the single thing that would move the outcome most if it were gone. Say what it is, what tells you it is the bottleneck, and what you are doing about it, in at most two sentences.

- If you have not found it yet, write "Not located yet" and say what you are doing to find it. Never present a guess as the bottleneck.
- If nothing is in the way, write "None: the remaining work is known". Do not invent one.

**Numbers.** See the next section.

**Next.** At most three actions, in the order you will do them. Each starts with a verb and is concrete enough to check afterwards. The first is what you do the moment the update is sent. 
Include a one liner of the broader context that you're working towards; what's the higher level user journey / system unlock?
"Continue the work" is not an action.

## Numbers

Report only measurements that bear on the outcome or the bottleneck. At most five rows.

- **Every number has a unit and a condition.** "13.1 ms p95 frame time, Quest 3, lobby, 8 avatars", never "13.1" and never "faster".
- **Show the comparison, not only the latest value.** Before, now, and the target if there is one. Add the change where it helps: "−32%".
- **Before and now are measured the same way**: same device, scene, load, command and number of runs. If they are not, say so in the row and compute no change from them.
- **Say how and when they were measured** in one line under the table: the command or method, how many runs, which statistic, and what state of the work they are from.
- **Label anything you did not measure.** An estimate, a number from a document, or one from before the last change is marked as that: "est.", "from the spec", "before the last change".
- **Never invent a number, round one to flatter the result, or carry one forward that you have not seen.** With no measurements, write "**Numbers:** none yet". If a measurement is planned, put it in **Next**. Do not run one for the update.
- **Leave out activity counts**: files changed, lines written, commits, tests added. They measure effort. Report a count only when the count is the outcome, such as failing tests remaining.

## Never

- Tell the story: what you tried first, what you learned, the order things happened in.
- Say "done", "fixed" or "working" about something you have not checked. Say "unverified".
- Pad it. No greeting, no recap of the request, no closing offer.
- Repeat the last update when nothing has changed. Write "No change since the last update" and what is running.
- Stop the work to write a better update.

## Examples

A lane with measurements:

```markdown
**Now:** Cutting lobby frame time on Quest 3 so eight avatars hold 90 Hz.

**Bottleneck:** Skinned-mesh draw calls. There are 212 a frame and the GPU trace puts 61% of frame time in them. Merging the avatar materials now.

**Numbers:**

| Quest 3, lobby, 8 avatars | Before | Now | Target |
| --- | --- | --- | --- |
| p95 frame time | 19.4 ms | 13.1 ms (−32%) | ≤ 11.1 ms |
| Draw calls per frame | 340 | 212 | ≤ 120 |
| App GPU time | 14.2 ms | 9.8 ms | est. ≤ 8 ms |

Median of 3 runs of `npm run bench:lobby`, after the instancing change.

**Next:** 1. Finish merging the avatar materials. 2. Re-run the lobby bench. 3. If p95 is still over 11.1 ms, profile the shadow passes.
```

A lane with no measurements, waiting on the user for one thing:

```markdown
**Needs you:** Which of the two save-slot layouts to ship. Both are in `tmp/save-slots/`. Only the slot screen waits on it.

**Now:** Building cloud save: the conflict path, so two devices never overwrite each other silently.

**Bottleneck:** The spec does not say what happens to a save edited offline on both devices. Implementing "newest wins, keep the other as a backup slot" and flagging it. Unverified until the two-device test runs.

**Numbers:** none yet.

**Next:** 1. Finish the conflict path. 2. Run the two-device test. 3. Wire the slot screen once the layout is chosen.
```

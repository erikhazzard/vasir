# iOS Inserts

Use this only for advanced composition when the iOS profile is close but not exact.

## Suggested Routing Examples

* If touching `/ios/App/` or app lifecycle code, read the platform manifest before changing startup or background behavior.
* If touching networking, caching, or sync, read the offline/sync manifest before changing request flows.
* If touching UI modules, read the design-system or screen-specific manifest before editing layout or navigation.

## Suggested Global Constraints

* **Main Thread:** Do not block the main thread with parsing, disk, or network work.
* **Memory:** Avoid hot-path allocations and large transient copies on scrolling, animation, or decode paths.
* **Reachability:** Do not assume stable connectivity; offline and resume behavior must be explicit.
* **Dependencies:** No new SDKs without approval, privacy review, and lifecycle ownership.

## Suggested Landmines

* App lifecycle transitions can interrupt work at any point; background-safe persistence may be intentional.
* Local clocks, push delivery, and connectivity are not reliable ordering sources.
* Some UI behavior may trade elegance for battery, thermal, or startup constraints.

## Suggested Philosophy

* Prefer predictable lifecycle handling over clever background magic.
* Prefer measured UI smoothness and memory discipline over abstraction-heavy convenience layers.
* Do not "clean up" platform quirks until you have verified the original failure mode they guard against.

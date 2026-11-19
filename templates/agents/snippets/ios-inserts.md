# iOS Inserts

<!-- vasir:purpose:start -->
**Purpose:** [Describe this iOS repository in 2-3 repo-specific sentences. Replace this block first. State the main user experience, what correctness means here, and what agents must optimize for.]
<!-- vasir:purpose:end -->

<!-- vasir:routing:start -->
* **App Lifecycle:** If touching `/ios/App/`, startup, or backgrounding code, read the platform manifest before changing lifecycle behavior.
* **Networking / Sync:** If touching `/ios/Sync/`, `/ios/Networking/`, or cache layers, read the sync manifest before changing offline or retry behavior.
* **UI Modules:** If touching `/ios/UI/`, feature screens, or design-system components, read the screen or UI manifest before editing layout or navigation.
* **Cold Storage:** Do not read `/docs/legacy/` unless explicitly instructed by the user.
<!-- vasir:routing:end -->

<!-- vasir:engineering-doctrine-inserts:start -->

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
<!-- vasir:engineering-doctrine-inserts:end -->

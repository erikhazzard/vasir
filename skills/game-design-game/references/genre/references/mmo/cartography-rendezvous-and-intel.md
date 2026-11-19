# Cartography, Rendezvous, and Intel

Use this when the design problem involves maps, scouting, rallying, route choice, territorial planning, supply, group navigation, or large-scale coordination.

## Core Principle

In a massive world, maps are not just navigation aids. They are **coordination surfaces, intelligence surfaces, and memory surfaces**.

## What map systems should support

| Function | Why it matters |
|---|---|
| Rendezvous | Players need shared meeting language and rally points. |
| Route planning | Distance, safety, cargo, and timing are strategic, not cosmetic. |
| Annotations | Squads, guilds, and coalitions need notes, warnings, drawings, and claims. |
| Territorial overlays | Power should be legible spatially. |
| Scout intel | Observations need sharable, decaying, trust-weighted surfaces. |
| Historical memory | Maps should show where things happened, not only where things are. |
| Division of visibility | Public, private, squad, guild, coalition, and temporary layers should differ. |

## Design rules

### 1. Maps need social permissions

Support multiple layers:

- personal,
- party/squad,
- guild,
- coalition,
- public,
- official/canonical.

### 2. Intel must decay or be invalidated

Shared intel with no decay becomes either stale clutter or fake omniscience.

### 3. Rallying must be fast and unambiguous

Large worlds need reliable coordinate language: named places, markers, pings, corridors, landmarks, staging tags.

### 4. Route ownership and knowledge should matter

If every player has perfect pathing and perfect intel, scouts, guides, and local knowledge disappear.

### 5. Preserve historical layers

Maps should help players answer:

- where was the last campaign fought?
- which bridge is contested?
- which route is famous?
- what territory changed hands this season?

## Useful features

- persistent annotations;
- temporary tactical pings;
- verified vs unverified intel;
- convoy routes and escort plans;
- supply-line overlays;
- named rally templates;
- heatmaps and recent-conflict markers;
- historical campaign layers;
- place memory labels from players or institutions.

## Failure modes

- map as wallpaper;
- map perfect-information collapse;
- no shared marker language;
- intel trapped off-client;
- history not spatially legible.

## Metrics

- shared marker usage;
- route-plan creation and reuse;
- scout-intel adoption;
- conflict around known chokepoints;
- historical layer views;
- time-to-rally;
- off-client map reliance.

## Read next

- `eve-online-lessons.md`
- `player-authored-history.md`
- `mmo-system-playbooks.md`

# Implementation map

- `.agents/skills/game__orchestrating-playable-build/` owns broad build/polish routing and the play → diagnose → repair → compare loop.
- `.agents/skills/game__art-directing/` owns coherent shape, value, material and composition; conditional references carry cross-game examples and visual review detail.
- `.agents/skills/game__adding-juice/` owns state-specific response, variation, material lifetime, interruption and effect hierarchy. Engine-specific examples remain conditional.
- `.agents/skills/game__directing/` owns the brief; remove fixed small-arcade assumptions that would override a different explicit game.
- `.agents/skills/game__genre-routing/` selects supported mechanic playbooks and preserves uncovered/mixed genres.
- `registry/build.js` regenerates `registry.json` and `.vasir-catalog-manifest.json`; existing metadata/catalog tests check discovery and packaging.
- `tmp/game-craft-transfer/` holds bounded author notes, temporary test games and actual forward-check evidence. Durable conclusions belong in the work spec; selected useful evidence can be retained without copying every scratch artifact.

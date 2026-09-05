# Ash & Echo implementation seam

Self-contained static ES modules. World width is 420 logical units; y increases downward. Camera uses `game.cameraY` as the world-space top of the viewport. Runtime viewport height is supplied by `game.resize(logicalHeight)`.

`game.js` exports `createGame()`. Returned game exposes `width`, `height`, `viewportHeight`, `player` (`x,y,w,h,vx,vy,grounded,wallDir,airJumps,facing`), `platforms` (`id,x,y,w,h,kind`), `hazards` (`x,y,w,h`), `checkpoint` (`x,y,w,h,active`), `goal` (`x,y,w,h`), `cameraY`, `time`, `elapsed`, `deaths`, `maxAltitude`, `state` (`ready`,`playing`,`won`), and `events`.

Methods: `resize(height)`, `start()`, `restart()`, `step(dt, input)`, `drainEvents()`. Input: `{axis:-1..1,jumpPressed:boolean,jumpHeld:boolean}`. `jumpPressed` is one press edge, consumed once. Events: `{type,x,y,vx,vy,intensity}`; types `jump`, `doubleJump`, `wallJump`, `land`, `death`, `respawn`, `checkpoint`, `win`. `step` uses seconds. Root passes fixed 1/120 steps. World collisions and level belong to game.js.

`renderer.js` exports `createRenderer(canvas, assets)`. Renderer exposes `resize(cssWidth, cssHeight, dpr)`, `render(game, dt)`, `emit(events)`, and `setReducedMotion(boolean)`. Assets are loaded HTMLImageElements under keys `background`, `midground`, `stone`, `hero`, `foreground`. Assets may initially be absent. Renderer owns all drawing, parallax, particles, atmosphere, hero animation and camera-impact offset. Never mutate simulation from rendering. Root drains events and passes them to renderer and audio. Rendering reads input via player's velocity; runtime publishes `game.input` optionally for debug only.

`audio.js` exports `createAudio()`: returned object has `unlock()`, `setMuted(boolean)`, `emit(events)`, `update(game,dt)`, `dispose()`. All sound procedural Web Audio, activated only after gesture. Audio must not mutate game.

Root owns index.html, style.css, main.js, generated assets, browser integration and hosting. Physics implementer owns game.js and focused controller checks. Renderer implementer owns renderer.js. Audio implementer owns audio.js. Coordinate any contract change before writing outside assigned files.

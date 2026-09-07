# Fog depth revision 21 — bounded implementation evidence

Disposition: SAFE_LOCAL_CHANGE at source topology. No performance improvement claim; root owns normal-time whole-game cadence proof and critic owns final visual judgment.

The game is a painted, monochrome exploration/physics platformer in a portrait side-view corridor. Low information density; terrain contact edges, thorns and white eyes outrank environmental motion. This revision only changes scenery air. Character, gameplay geometry, lighting source selection, frame owner and output composition stay under their existing owners.

## Mechanism

The facade and buttress PNGs contain actual transparent openings (facade center alpha 0), and grading preserves alpha. Existing ordered submissions already put far air before facade, mid air before close architecture and near air after close architecture. The strongest bank was the .90 mid air drawn over facade and belfry; the .25 rear bank did little to establish clean occlusion. Revision21 moves emphasis to that existing rear bank (.68), reduces mid air (.48) and keeps restrained front air (.30). Anisotropic oblique cloud coordinates produce broader lateral masses; the nearest layer's color receives a fixed soft gray contribution so a curl reads as air over a face. No rectangular screen masks, finite building slices or discontinuous camera-coordinate wrapping were added. Real opaque pillar faces interrupt the rear banks; real alpha openings transmit them.

## Topology and cardinality

World counts before → after: one canonical frame owner → one; one scenery scene submission → one; one existing default-framebuffer scope → one; three air draw groups → three; fixed image submissions unchanged; zero offscreen targets → zero; one program/buffer pair → one; world textures unchanged (noise plus existing cached graded images, root baseline plateau seven including noise); terminal output chain and browser presentation unchanged. Separate pre-existing character context is untouched.

For each covered air fragment, four noise reads produce deformation/body/detail/weather, and shadeFog performs four filtered directional lighting reads. Source scaling remains 8×(far coverage + mid coverage + near coverage), at most 24 noise samples per world drawing-buffer pixel across the three air draws. All eight coordinates depend on fragment-varying world position; filtered lighting samples have distinct offsets or bias and cannot be exactly reused as the unfiltered body. Four opening-light/shadow calculations remain behind the existing draw-uniform middle-layer guard. No texture work was moved to CPU, uniforms or a vertex stage, and no readback/synchronization was added. Changed scalar scale/color arithmetic is bounded per fragment and contains no loops or texture operations.

Canvas fallback adds exactly two cached fog bitmap drawImage calls (one far, one middle) to the existing nearest fog draw. They use the same image, continuous camera/time coordinates, and the same alpha-opening order. Fallback has softer radial air rather than the WebGL cloud shader; it preserves depth ordering, not identical cloud shape or lighting.

## Cost both ways

Adding: GPU draw/target/texture/loop counts unchanged; same existing full-screen coverage and eight taps per fog fragment. Altered alpha can change appearance but does not remove shader invocations. Fallback pays two image submissions and up to two additional screen-clipped translucent bitmap layers. No allocation/upload per frame.

Refusing: the dominant fog keeps crossing facade faces and openings as one veil, weakening the requested architectural depth. A separate depth/mask texture would add allocation, upload and sampling/lifecycle work without necessity because the assets already provide the needed alpha silhouettes. Additional passes/targets are unwarranted. Keeping the fallback's single post-architecture fog blob would fail the rear/mid layering even when the WebGL version works.

Work remains on the existing main-thread frame owner: only a few draw-uniform values and existing three submissions change; a worker would add ownership and transfer costs without removing meaningful work. Cached source grading and noise creation retain event/startup scope.

## Lifecycle

No new resources or ownership. Existing textures Map uploads each cached image once; context loss hides the world canvas and uses the Canvas fallback; restoration clears stale image texture handles and initialize rebuilds program/buffer/noise before lazy image re-upload. Resize changes dimensions under the existing DPR1.5 /1.1M pixel bound; no new surface. Reset retains the existing resource cache. Root resource audit should confirm plateau and loss/restoration pixels for the final integrated source.

## Evidence and limits

Frozen whole-source candidate: candidate21/source. Own file hashes are recorded by the parent; fog-volume.js is unchanged. Exact controlled-composition before/after: ../before-clean and ../draft2, both native390×844 and enlarged780×1688 game at cameras3500/2700/1700/800/0, renderer clocks12 and16seconds. Draft2 WebGL matches candidate; final candidate only moves fallback banks to remain visible across the climb. These are full game-frame screenshots with actual gameplay geometry and player, and temporal pairs qualify changing atmosphere/occlusion. Their RAF is disabled to obtain an exact renderer clock; they do not prove real-time input or frame timing. Parent normal-RAF active play and independent critic review are required for release claims. No automatic visual grade assigned here.

Focused lifecycle follow-up: ../lifecycle/receipt.json records zero page errors and three forced world-context loss/restoration cycles. Every restored paused WebGL canvas was byte-identical through its data URL. ../lifecycle/fallback-moving-{a,b}.png is a 4s normal-RAF fixed-camera pair (simulation step deliberately held); all banks preserve the real pillar/opening ordering. The radial fallback's motion is markedly softer and less conspicuous than shader billows; only ordering/readability parity is claimed. Capture browser closed after checks.

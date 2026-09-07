# Revision16 atmosphere work

Owned production files: atmosphere.js and fog-volume.js. Character, depth, stone and lighting integration belong to root and the character specialist.

Current shader hashes:
- atmosphere: 34ec41131f0932e1477630c758c3aef8b7f7158f55203a0ee986008917035619
- fog-volume: 2f2e764ee0162734712a6dae5f314f5a1f2a53ae0c2d1c6569cbafc17d85c306

## Topology disposition

SAFE_LOCAL_CHANGE. Same application frame owner, same depth-owned scenery submission, same WebGL program, static quad and default framebuffer. Three existing air draws remain interleaved with image draws. No offscreen target, attachment, copy, pass, canvas, texture, uploader, scene traversal or frame callback added. Atmosphere buffer still caps at1.1M pixels and DPR1.5; texture lifecycle/context loss/fallback entry points unchanged.

Source-level sampling law changes from6 to8 noise operations per covered air fragment: warp, body, detail and weather in atmosphere; filtered body plus three directional neighbors in fog-volume. All coordinates depend on interpolated world position, so this is fragment-frequency sampling. Existing middle-layer uniform guard precedes four-aperture light/shadow work; duplicate opening-light loops were collapsed. Existing image branches have no additional noise sampling. Costs scale with the same three covered air planes and buffer pixels, never entity or material count.

No worker boundary added: this is arithmetic in the already GPU-owned fragment shader, with no new CPU work or transfer worth a second owner.

## Rejected stages

- stage-00: frozen revision15 baseline.
- stage-01: eight-sample directional volume replaced mod-based fog bands and unrelated opacity washes. Independent round1 rejected visible gray/pale patch quilt. Texture histogram explained the failure: body R mean0.612 versus0.34–0.70 density threshold, and the baked base octave already has4×4 cells, making apparent broad features too small and horizontally stretched.
- stage-02: rotated isotropic2400/1800/1200 scales and sparse masks removed the quilt but own native inspection found opening/refuge/middle too quiet. Preserved as a rejected local refinement.
- stage-02b:2200/1600/1000 scales and adjusted coverage restore substantial banks while leaving clear corridors. Lighting offset was still fixed in world pixels.
- stage-02c: current. Directional spans scale with cloud size, keeping lit faces on large banks. Physical9px/s base wind with a12% speed increment per depth layer stays independent of inputs and depth scale; filtered self-shadowing follows the same rotated material coordinates. Shared aperture geometry alone owns local shafts. Conditional highp compiles on tested Chrome; mediump fallback remains.

## Evidence qualification

- baseline and candidate-* folders: native390×844 arranged before/action scenes, actual game jump events under controlled RAF. Opening/refuge/middle/upper verified; baseline/01 summit action reached win and is excluded from active-play judgment. Later summit fixture uses ledge26.
- stage-* folders preserve source bytes before further changes.
- candidate-01-gpu-probe.json: real GPU elapsed timer plus1px completion readback;4draw isolated atmosphere frame at585×1266. This is desktop shader cost, not full-game or phone thermal proof.
- candidate-02c-gpu-probe.json: same mechanism, possibly concurrent with critic browser activity. Same-time pixels identical, wind changes pixels,576/576 expected draws, no GL errors. Final comparison is candidate-02c-quiet-gpu-probe.json: critic contexts were closed; root route launch near completion may have overlapped, so it is qualified as bounded cost rather than an optimization win. Valid GPU medians were0.199ms baseline and0.177ms candidate; root quiet full-game pacing owns the full-game claim.
- Independent visual review is critic-owned in shader-pass/critic; no self-awarded art grade or human acceptance claim.

## Final independent review

The integrated second review is `../critic/round-2.md`. It matches current shader hashes and reports no remaining environment implementation blocker after native/enlarged desktop/gentle action and stationary-motion review. Round1's patch quilt was rejected and repaired; round2 accepted the selective banks, clear corridors, coherent light direction and preserved gameplay hierarchy. Final full-game pacing, route, fallback and release integration remain root-owned. Atmosphere agent browser contexts are closed.

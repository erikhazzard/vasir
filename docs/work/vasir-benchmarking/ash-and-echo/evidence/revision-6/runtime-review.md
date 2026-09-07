# Focused runtime contract review

Mode: Release Audit, FOCUSED CODE. Boundary: the living-world changes against `bish-baseline` in `game.js`, `renderer.js`, `atmosphere.js`, `cloud-texture.js`, `depth.js`, and `wildlife.js`. Skills applied: `code__auditing` and `code__threejs-rapier-performance` with its render topology guard. No product or durable test edits.

## Verdict

**SHIP for this bounded correctness review. No material runtime finding.** This is neither an aesthetic grade nor a phone-performance certification.

## Evidence

- FACT: moving support is simulation-owned and advances before controller movement in the existing fixed step. Carry applies displacement; jump impulse remains authored. Home bounds keep current suspended ledges clear of solid side ribs. Restart clears the spring and support. Death drops support and springs settle during the retry timer.
- FACT: temporary `createGame.step` probes passed walking off the first moving ledge in both directions, then jumping at 0, 5, and 11 ticks after departure. All six emitted one ground/coyote jump, kept the air jump, and produced identical vertical impulse. Death with a live spring returned to grounded feet at 4480. See `edge-receipt.json`. The parent's supplied 15-test suite result was inspected as existing evidence, not independently rerun here.
- FACT: in Chrome at 390×844 DPR2, repeated camera sweeps across the full scenery range plateaued at 90 created canvases, six total GPU textures (five cached image/atlas textures plus noise), one buffer, one program, and zero framebuffers. Repeated sweeps added no canvases or image uploads. `texSubImage2D` was never called. See `runtime-receipt.json` and its temporary probe.
- FACT: an actual keyboard jump excited a cage; pause then froze the entire game snapshot and scenery state across 20 frames, with zero texture uploads. Forced WebGL context loss selected the Canvas2D path; restoration rebuilt the resources, returned to visible WebGL scenery, and reported `gl.NO_ERROR`. No page errors or browser warnings. The gentler-effects UI set shader time and wake strength to zero after resume.
- FACT: cloud bytes repeat deterministically and carry distinct RGB fields, with 65,533 of 65,536 pixels differing across channels. The cloud texture is a bounded 256×256 power-of-two upload with mipmaps. Flocks share one static 16-frame atlas; cropped UVs use transparent gutters, and the first non-atlas image draw restores full-image crop coordinates.

## Static hot-path disposition

**SAFE_LOCAL_CHANGE.** One existing animation owner drives the same Canvas2D foreground and default-framebuffer WebGL scenery path; no added frame owner, offscreen target, scene traversal, or full-world physics phase. New scenery and 19 birds contribute bounded draws in the existing ordered compositor. The three air draws each request three noise samples per covered fragment; the backdrop branch skips noise. There is no fragment-invariant texture sample to hoist. The additional opaque backdrop draw is necessary because the revised background has faded edges; it remains in the existing target scope. Content count does not multiply render owners or targets.

The shader has only draw-uniform mode branching and ordinary WebGL1 operations; the new texture is power-of-two and the atlas is clamped and linearly filtered. Chrome compilation/recovery passed. This does not establish real Safari/iOS/Android driver behavior, phone timing, or thermal headroom; root owns final timing and device evidence.

## Release findings / non-blocking findings

None warranted within this bounded runtime review. Resource-contract documentation still says three cached scenery textures and nine assets; root's planned contract update should reflect five cached images including the atlas, plus noise, and the new arcade asset.

## Plan of action

No runtime fix required from this review. Preserve the supplied deterministic suite and complete the root-owned current-source timing and documentation handoff.

Reviewed source SHA-256:

```
b807130b7916d55774c522ccbb2acee6bb7ab8a82cd0c46a286f3e7a51b4cdee  game.js
9c8b637b4ab1fff0cc44e2204c642c4f47de03c5647f0e3e0f9b52bcf105deb5  renderer.js
4603e11d43fcac0b04c96e7ae5f01979a308ba64b4bf0689f2ad9bf32a8db6eb  atmosphere.js
8cef3ff131bfa42b8ba0f4fbcca20aa25e691d4b41efaaf5784e3c8b9c4284a0  cloud-texture.js
c9d7d9404865e153fa28a3542119f8ca50369c255f9443d2913cafeb351ded76  depth.js
21568eb467fbe6fbf038e2e3d86946c35c4b8bffc225612a4334b7003c9f4bc1  wildlife.js
```

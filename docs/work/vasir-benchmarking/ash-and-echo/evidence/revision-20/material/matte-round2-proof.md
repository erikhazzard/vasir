# Matte material round 2

Frozen shader SHA-256 `180fff09fb000344a85bbdf75d71aef0f40615014c437d0026ffcb1783b5c64f`.

Only ash-material.js changed in production. Broad horizontally traveling gray sheets were replaced by broken short charcoal fibres within a darker mass. Core flow points along the body, interpolating outward into wing flow. Dense head brightness is suppressed. Outer erosion uses an elongated curl field multiplied by broad coverage, independent of the highlighted fibre field. The final isolated native-size prototype shows irregular dark fibres and unequal outer gaps instead of the prior smooth satin bands; acceptance still requires integrated anatomy at native scale and normal time. The first intermediate grain experiment was further lengthened to avoid round dotted holes.

Topology/API/lifecycle unchanged: one256² target, one strip draw, two existing body copies, no textures/extra passes/RAF/readback. Four fragment-dependent noise calls remain (16hash-sines); two flow-sines, normalize and pow from candidate1 are removed. No performance improvement claimed from static arithmetic reduction.

Final receipts: metrics-matte-final.json; restore-metrics-matte-final.json; material-native-matte-final.png. Prior source ash-material-before-matte.js and receipts metrics-before-matte.json / restore-metrics-before-matte.json retained. Existing metrics.json and restore-metrics.json now alias this latest final run; earlier candidate1-review records its own historical hashes and claims.

Same isolated baseline-mask RAF probe, not integrated whole-game performance:140samples per condition, CPU p95 baseline/live0.2/0.2ms, rAFp9517.0/17.1ms. Chrome ANGLE Metal Apple M5 Pro. Frozen pixels unchanged;150ms separation changes2498red-channel pixels>5 and1012alpha pixels>16 at288². Reduced time changes0bytes, stroke changes27557bytes. Three forced same-context restorations each return to1context/1program/1buffer/0textures/0FBO, frozen diff0; dispose leaves0resources. Forced absent-highp chooses mediump and renders red6–39 on host, not proof on actual limited-precision hardware. No mobile/thermal/GPU elapsed-time claim.

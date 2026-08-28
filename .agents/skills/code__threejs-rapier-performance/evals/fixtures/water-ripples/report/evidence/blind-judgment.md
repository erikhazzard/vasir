# Blind judgment — raw response

### Blind scoring

| Rubric | Candidate A | Candidate B |
|---|---:|---:|
| R1 Ripple cardinality | **3/4** — Finds two meshes per active ripple, up to 400 draws, disabled culling, batching, and blend-order risk. Omits the 400 cloned materials and pooling-versus-submission distinction. | **4/4** — Identifies 400 mesh opportunities, 400 cloned materials, forced rendering, and a bounded batching change with blend verification. |
| R2 Offscreen pixel cost | **2/3** — Finds capped DPR, full-size target, unused depth/stencil, and effectively continuous rendering. Presents the reduction as established rather than an experiment. | **3/3** — Finds DPR-scaled RGBA8 target, unused attachments, ongoing frame-based spawning, and proposes render-scale sensitivity testing. |
| R3 Water fragments | **1/2** — Finds screen coverage, MeshStandardMaterial, DoubleSide, and three normal samples plus ripple. Omits environment lighting and measurement calibration. | **1/2** — Finds PBR pixel cost, four texture samples, and DoubleSide. Environment-lighting cost is not explicit. |
| R4 Drop resources | **2/2** — Correctly finds 50 duplicated geometries/materials and recommends sharing or instancing. | **2/2** — Correctly finds 50 duplicated geometries/materials and recommends sharing or instancing. |
| R5 Render topology | **1/2** — Does not invent extra passes, but never explicitly maps the one RAF owner, conditional offscreen submission, and main submission. | **2/2** — Maps exactly one frame owner, one conditional shared offscreen submission, and one main submission. |
| R6 Calibration/falsifiers | **0/4** — Provides no deterministic workload, warmup, repeated frame-time distribution, or bottleneck-discriminating measurement plan. | **3/4** — Explicitly denies that topology proves speed and proposes fixed ripple counts, 60/120 Hz, CPU/GPU time, percentiles, draws, target memory, thermal behavior, and render-scale sweeps. Omits warmup and explicit repeated trials. |
| R7 Preservation | **1/2** — Calls out subtract/add blend ordering, but not screen-space appearance, capture/diff evidence, or interaction checks. | **1/2** — Protects blend ordering and correct screen-space UV derivation, but lacks capture/diff and interaction-preservation checks. |
| R8 Prioritization | **1/1** — Concrete high-cardinality and pixel-cost issues lead; does not recommend pooling as absent. | **1/1** — Concrete structural and pixel-cost issues lead; existing pooling is credited. |
| **Total** | **11/20** | **17/20** |

### Accuracy flags

Candidate A has sound primary mechanisms, but “MSAA enabled” is only requested by the renderer configuration, not statically guaranteed. Its “Critical,” “expensive,” and “substantially reduces” language is insufficiently calibrated to the absence of runtime measurement. The neutral-target startup clear is unnecessary in this fixture’s normal path: frame zero creates a ripple and renders the normal scene before the main scene samples the target. Calling drop duplication “allocation overhead” is also imprecise because those resources are allocated during pool construction, not churned per frame.

Candidate B has no material mechanism error or unsupported measured-runtime claim. “Largest structural cost” describes static cardinality rather than claiming a measured bottleneck, and the response explicitly requires device validation.

### Pairwise result

**Candidate B wins.** Its margin is **6 points**, exceeding the required 2 points, and it has no material mechanism error or unsupported runtime claim.

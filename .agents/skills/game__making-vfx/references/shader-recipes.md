# Constructing Evolving Game Effects

Read when implementing layered texture motion, compositing luminous effects, or building smoke/fire that appears volumetric. The texture formulas below are transcribed from the talk's slides. Sampling notation and integration checks are explanatory adaptations, not engine-specific code.

**Contents:** [Representation](#choose-the-representation) · [Layered alpha](#layered-alpha) · [Evolving color](#evolving-color) · [Blend-add](#blend-add) · [Pseudo-volume](#pseudo-volume-smoke-and-fire) · [Asset choices](#asset-choices) · [Historical examples](#historical-examples)

## Choose the representation

First decide whether the event needs a changing silhouette, an authored pose sequence, a continuous path, surface attachment, or actual spatial volume. Choose the existing sprite, mesh, trail/ribbon, decal, particle, or volume mechanism accordingly. Layered scrolling is useful for evolving materials; it cannot supply missing trajectory, attachment, or a precise authored gesture by itself.

For a backend without programmable shaders, use its existing compositing or animation support when that can deliver the effect. Compare an authored animation with a simpler dynamic representation before introducing offscreen passes or a new rendering path merely to imitate this recipe.

## Layered alpha

### Two samples

Sample a tileable cloud/noise alpha at independently transformed coordinates:

```text
uv1 = baseUV * scale1 + offset1 + velocity1 * time
uv2 = baseUV * scale2 + offset2 + velocity2 * time

a1 = sample(cloudTexture, uv1).a
a2 = sample(cloudTexture, uv2).a
alpha = a1 * a2 * 2
```

Use the project's time and particle-age conventions. Choose initial offsets and motion parameters when the particle is initialized; repeatedly replacing them each frame produces discontinuities rather than coherent evolution.

The product changes the areas that survive both samples. This creates internal shape change even on a single billboard. The factor of two boosts the product's values; it is an artistic gain in this recipe, not a physically based constant.

At matching scales, recognizable features can expose two images sliding past each other. In the demonstration, scaling the second sample's UVs by `0.5` doubles its apparent feature size and reduces that matching. Select scales and scroll directions for the intended material; arbitrary high speeds simply make the construction easier to see.

### Three frequencies and a boundary mask

The next example reuses the cloud texture at relative UV scales `1`, `0.5`, and `2`, with different scrolling rates. A fourth sampled layer masks the rectangular billboard boundary:

```text
alpha = ((T1.a * T2.a * 2) * T3.a * 2) * T4.a
```

`T1`, `T2`, and `T3` are differently transformed samples of the same source asset. `T4` supplies the shape mask. This example uses four samples and two unique source textures. Do not generalize that asset count to every four-layer effect.

The mask normally establishes the effect's silhouette or envelope while the internal samples evolve. In the demonstration, seven particles with randomized offsets and scrolling rates produce a much richer cloud. Seven is an example, not a target budget.

### Inspect these failure cues

| Observed failure | First variable to inspect |
|---|---|
| Two images visibly sliding through each other | Matching spatial frequencies, correlated offsets, or inappropriate relative scroll speeds |
| A billboard rectangle becomes visible | Mask coverage, UV addressing, filtering at edges, and the material's actual blend convention |
| The result disappears or becomes extremely sparse | Source-value distribution, repeated multiplication, mask coverage, and gain |
| White plateaus erase the internal structure | Source values and gain; determine where the pipeline clamps or tone-maps the result |
| Every particle appears to breathe in unison | Identical starting phases or transformation parameters |
| A scrolling seam crosses the particle | Whether the source tiles, plus wrap/filter/mipmap behavior and any atlas subregion handling |

Keep gain and saturation behavior explicit in the target shader. The slide's equation alone does not specify intermediate clamping, precision, color management, or the final blend state. Inspect those choices rather than silently assuming them.

## Evolving color

The talk applies the same operation to RGB and alpha:

```text
RGB   = T1.rgb * T2.rgb * 2
alpha = T1.a   * T2.a   * 2
```

Use this when internal color motion strengthens the material. Preserve the semantic hue range and contrast needed to identify the effect. More color change is not useful when it makes poison resemble healing or obscures a hazard's phase.

Compare the same event with alpha-only evolution and with color-plus-alpha evolution. Keep the additional sampling and authoring complexity only if the perceptual gain survives gameplay scale. Arcane Orb demonstrates a subtle gain; Lacuni Fire makes the internal motion easier to see.

## Blend-add

The desired behavior in Love's example is a saturated, defined core with luminous regions that do not collapse into an unreadable white mass under overlap.

| Approach | Expected behavior to check |
|---|---|
| Additive | Reads as light; may lose shape and saturation on bright backgrounds or under heavy overlap |
| Conventional alpha blending | Preserves authored color and shape; may need additional authoring to feel luminous |
| Blizzard's blend-add | Alpha controls the mixture: white favors blending, black favors addition, gray lies between |

Do not substitute those alpha meanings directly into a standard opacity material. Under this convention, black alpha can still contribute additive light where RGB contains energy. Consequently, fading only alpha toward zero may leave glow behind. Inspect how both color contribution and destination attenuation are faded over the effect's lifetime.

Use an existing compatible material where available. Otherwise verify the renderer's straight/premultiplied color convention, blend factors, alpha handling, color space, depth behavior, and transparency sorting before implementing the intended endpoints. Avoid double-premultiplying an already prepared color. These are integration concerns; the talk does not provide a complete portable blend-state recipe.

Check isolated and overlapping particles against both relevant bright and dark backgrounds. Inspect bloom/exposure as part of the final image; a well-authored source can still lose its signal downstream. Blend-add does not make transparency order-independent or eliminate fill cost.

Love reports a single pass without extra draws in Diablo III. He describes a shared transparency layer with per-system/geometry ordering offsets. Those facts neither prescribe the target engine's sort strategy nor prove that its material implementation has the same cost.

## Pseudo-volume smoke and fire

### Smoke with authored light

The demonstrated smoke keeps painted light in RGB while multiplying a base alpha shape with two evolving alpha samples:

```text
RGB   = T1.rgb
alpha = (T1.a * T2.a) * T3.a * 2
```

The displayed noise scales are `0.5` and `1`. The particles are not rotated to create variation; changing alpha supplies the shape variety. Preserve the orientation needed for the painted light to remain coherent. Test the actual camera and illumination range: a flat lighting gradient is an illusion, and free camera movement or dynamic lighting may require another approach.

The point is to avoid revealing an identical lit smoke silhouette repeatedly. Increasing the number of baked variants is one possible solution; dynamically changing the silhouette is another. Choose by the required look, memory, and measured rendering cost.

### Fire with changing color and opacity

The fire slide applies the four-layer operation to both color and alpha:

```text
RGB/A = ((T1 * T2 * 2) * T3 * 2) * T4
```

Here `RGB/A` means apply the operation to those channels, not division. Source images and UV transforms differ from the cloud example. The billboard motion remains relatively simple while internal sampling creates much of the visible flame activity.

Use the required screen coverage and view angles to choose the particle arrangement. Fewer billboards can reduce overlap, but oversized translucent cards or extra texture fetches can erase that gain. Compare the candidate with the existing effect under representative concurrency before claiming an optimization.

## Asset choices

- **Painted versus simulated:** author the shapes and light needed by the game's style. Love's Photoshop-heavy production is an example; use simulation when its behavior or output serves the actual brief.
- **Separate versus packed:** independent repeating samples benefit from an addressing scheme that genuinely tiles. Atlases need correct subregion wrapping, padding, and filtering; separate textures can affect binding and batching. Follow the renderer's supported path and measure the tradeoff.
- **Flipbooks:** use them when a fixed sequence, discrete poses, flicker, or distant crowd animation carries the event better. Inspect memory, playback cadence, and repetition over the intended viewing duration. Continuous layered motion also repeats eventually; the goal is to avoid conspicuous repetition during use.
- **Reusable sources:** reuse a noise texture when it produces the right material behavior. Varying UVs does not rescue an inappropriate source shape. Count sample cost separately from asset reuse.

## Historical examples

These are demonstrated effects from [the 2013 recording](https://www.youtube.com/watch?v=YPy2hytwDLM&t=1698s), not performance requirements or presets.

| Example | Displayed count | Relevant choice |
|---|---:|---|
| Wood Wraith Poison | 17 particles | Offset/scroll reuse and particle rotation |
| Siege Breaker Fire | 34 particles | Evolving alpha with authored RGB |
| Sand Storm Waves | 23 particles | Layered moving weather shapes |
| Frost Trail | 56 particles | Stationary form with evolving alpha |
| Arcane Orb | 12 particles | Evolving color and alpha; Love states two draws |
| Lacuni Fire | 23 particles | Visible secondary color motion |
| Pseudo-volume smoke | About 60 particles | Painted lighting with changing alpha |
| Pseudo-volume fire wall | 28 on slide | Q&A says about 25; retain the discrepancy |

No GPU timing or portable device budget follows from these counts. Love also explicitly leaves vertex-versus-pixel placement of UV transformations unanswered.

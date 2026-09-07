/** Fog lighting inside the existing air draw. Three additional noise samples;
 * the caller still owns density, opacity, wind, depth order and the framebuffer. */
export const FOG_VOLUME_GLSL = `
  vec3 shadeFog(vec3 baseColor, vec2 baseUV, float densityNoise, float density,
      float lightStrength, float layer) {
    float t = uTime * (1.0 + layer * .19);
    // Broad billows receive a steady skylight. Steering these filtered samples
    // across narrow lamp beams etched pale seams into the cloud field. Lamps
    // affect transmitted light below; their moving occluders stay in the caller.
    vec2 ray = normalize(vec2(-.55, -.83)) / vec2(590.0, 310.0);
    vec2 bodyUV = baseUV + vec2(t * .027, t * .006);
    // Filter only the lighting field through existing mipmaps. Fine billow
    // detail stays in opacity; amplifying it here made the fog look like soot.
    float body = texture2D(uNoise, bodyUV, 3.5).r;
    float nearBody = texture2D(uNoise, bodyUV + ray * 42.0, 3.5).r;
    float farBody = texture2D(uNoise, bodyUV + ray * 104.0, 3.5).r;
    float occlusion = .62 * smoothstep(.28, .72, nearBody)
      + .38 * smoothstep(.28, .72, farBody);
    float thickness = smoothstep(.27, .68, mix(body, densityNoise, .10))
      * (.48 + .52 * smoothstep(.02, .45, density));
    float exposure = smoothstep(-.06, .18, body - nearBody);
    float face = exposure * (.30 + .70 * thickness) * (1.0 - occlusion * .32);
    float localLight = clamp(lightStrength, 0.0, 1.0);
    // Skylight always defines the billow. Architectural light strengthens its
    // exposed face without turning the shaded interior into a glowing stripe.
    vec3 interior = mix(baseColor, vec3(.42, .45, .46), thickness * occlusion * .84);
    vec3 scatter = mix(baseColor, vec3(.99, .99, .96), .82);
    return mix(interior, scatter, face * (.88 + localLight * .12))
      + vec3(.025, .024, .020) * localLight * (1.0 - occlusion * .70);
  }
`;

/** Directional cloud lighting inside the existing air draw. Four filtered
 * taps plus four density/wind taps in the caller: eight noise reads total.
 * No raymarch, intermediate texture, framebuffer or independent clock. */
export const FOG_VOLUME_GLSL = `
  vec3 shadeFog(vec2 bodyUV, vec2 scale, float density, float lightStrength) {
    // Filter broad lighting separately from the fine, eroding alpha edge.
    // All four taps follow the same material coordinates and fixed skylight.
    vec2 ray = mat2(.94,.342,-.342,.94)*normalize(vec2(-.58,-.82)) / scale;
    float body = texture2D(uNoise,bodyUV,2.7).r;
    float nearBody = texture2D(uNoise,bodyUV+ray*48.0,2.7).r;
    float farBody = texture2D(uNoise,bodyUV+ray*134.0,3.3).r;
    float deepBody = texture2D(uNoise,bodyUV+ray*264.0,4.0).r;
    float nearMass = smoothstep(.49,.80,nearBody);
    float occlusion = nearMass*.52 + smoothstep(.48,.80,farBody)*.31
      + smoothstep(.48,.80,deepBody)*.17;
    float thickness = smoothstep(.49,.80,body) * (.25+density*.75);
    float exposedFace = smoothstep(.005,.095,body-nearBody);
    float rim = exposedFace*(1.0-smoothstep(.32,.83,density))*.66;
    float skylight = exposedFace*(1.0-occlusion*.50);
    vec3 interior = mix(vec3(.45,.48,.48),vec3(.24,.27,.28),thickness*occlusion);
    vec3 face = mix(vec3(.68,.71,.69),vec3(.92,.91,.85),skylight);
    vec3 color = mix(interior,face,skylight*.86+rim*.26);
    // Light traverses a small amount of unshadowed matter before extinction;
    // dense interiors stay charcoal instead of turning into generic glow.
    color += vec3(.045,.043,.034)*lightStrength*(1.0-occlusion*.68);
    return color;
  }
`;

/** One fixed soot field, stepped only by the character's presentation clock.
 * Canvas paths own silhouette; this RGBA field owns shade and porous wing density.
 * No textures, readback, animation callbacks or resources allocated by render().
 */
const SIZE = 256;
const VERTEX = `attribute vec2 position;
varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const FRAGMENT = `precision highp float;
varying vec2 uv;
uniform float time,morph,wing,unravel,impulse,stroke,velocity,bend,crust,bank,settle,seed,exposure,logicalSize;
uniform vec3 light;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec2 p=(vec2(uv.x,1.-uv.y)-.5)*logicalSize;
  float wingField=smoothstep(15.,37.,abs(p.x))*wing;
  float head=1.-smoothstep(8.,17.,length((p-vec2(3.,mix(-4.,-17.,morph)))*vec2(1.,.85)));
  // Short broken charcoal fibres follow the pouring core, then turn outward
  // along the wings. Shade and erosion use different field combinations:
  // pale world showing through a pore must not become a glossy bright ridge.
  float travel=time*1.4+stroke*3.+impulse*1.2;
  float outward=smoothstep(7.,27.,abs(p.x))*morph;
  vec2 q=mix(vec2(p.y,-p.x),vec2(abs(p.x),p.y),outward);
  q.x-=travel;
  q.y+=bend*.14+p.y*velocity*.00025+step(0.,p.x)*17.;
  q.x+=crust*(1.-smoothstep(-12.,2.,p.x))*.65;
  float broad=noise(q*.12+vec2(seed*.13,time*.18));
  float curl=noise(vec2(q.x*.075,q.y*.37)+vec2(7.2,-time*.35));
  vec2 fibre=vec2(q.x*.17,q.y*.43+(broad-.5)*3.7+(curl-.5)*2.1);
  float ridge=noise(fibre+vec2(seed*.37,0.));
  float fine=noise(q*.48+vec2(time*.5,13.));
  float streak=smoothstep(.42,.72,ridge)*smoothstep(.28,.53,fine);
  float erosion=smoothstep(.59,.79,curl)*smoothstep(.38,.61,broad)
    *wingField*(1.-head)*(.72+min(impulse,1.)*.28);
  // A moving fracture front consumes fingers before wrists and shoulders.
  // It leaves unequal pieces and open air, never a shrinking solid bird.
  float featherDistance=length((p-vec2(1.,-9.))*vec2(1.,.78));
  float fracture=featherDistance+curl*13.+broad*8.;
  float front=mix(72.,7.,unravel);
  float recoal=(1.-smoothstep(11.,20.,length((p-vec2(0.,-2.))*vec2(1.,.75))))
    *smoothstep(.48,.94,unravel);
  float unravelMask=smoothstep(front-6.,front+3.,fracture)*(1.-head)*(1.-recoal)*wing;
  float alpha=(1.-erosion)*(1.-unravelMask);
  // A diffuse coal volume under the deposits: one broad value plane, broken
  // by granular facets. No specular term or smooth travelling highlight.
  vec2 core=(p-vec2(2.+bend*.45,-3.))/vec2(17.,21.);
  float z=sqrt(max(.025,1.-min(dot(core,core),.975)));
  vec3 normal=normalize(vec3(core,z));
  float diffuse=max(0.,dot(normal,light));
  float wingPlane=clamp(.46+bank*sign(-p.x)*.18-p.y*.005, .22,.78);
  float plane=mix(diffuse,wingPlane,wingField);
  float facet=smoothstep(.24,.65,broad)*(.55+fine*.45);
  // Fine deposits sit on a broad, quiet ash-grey mass. Keeping that base
  // continuous lets the small ordinary body read as volume between grains.
  // The eye coal stays dark and the outer primaries retain their ink weight.
  float soot=.028+plane*(.16+facet*(.13+exposure*.16))*(1.-head*.42);
  soot+=streak*(.14+plane*.12)*(1.-head*.55);
  soot*=1.-settle*.16;
  vec3 color=mix(vec3(.009,.015,.015),vec3(.62,.64,.59),soot);
  gl_FragColor=vec4(color*alpha,alpha);
}`;

export function createAshMaterial({ logicalSize = 144 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  let gl = null, program = null, buffer = null, disposed = false, lost = false;
  const diagnostic = { status: 'unavailable', reason: '', width: SIZE, height: SIZE,
    contexts: 0, programs: 0, buffers: 0, textures: 0, framebuffers: 0, draws: 0,
    precision: '', restores: 0 };
  const uniforms = {};
  let vertex = null, fragment = null;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader); gl.deleteShader(shader);
      throw new Error(reason || 'Ash shader compilation failed');
    }
    return shader;
  }
  function release() {
    if (gl && !lost) {
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }
    buffer = program = vertex = fragment = null;
    diagnostic.programs = diagnostic.buffers = 0;
  }
  function contextLost(event) {
    event.preventDefault(); lost = true; release();
    diagnostic.status = 'context-lost'; diagnostic.reason = 'WebGL context lost';
  }
  function initializeResources() {
    const high = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    diagnostic.precision = high && high.precision > 0 ? 'highp' : 'mediump';
    // A smaller hash multiplier retains fractional variation on mediump GPUs.
    const source = diagnostic.precision === 'highp' ? FRAGMENT
      : FRAGMENT.replace('precision highp float;', 'precision mediump float;')
        .replace('43758.5453', '437.585');
    vertex = compile(gl.VERTEX_SHADER, VERTEX); fragment = compile(gl.FRAGMENT_SHADER, source);
    program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertex); gl.deleteShader(fragment); vertex = fragment = null;
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    for (const name of ['time','morph','wing','unravel','impulse','stroke','velocity','bend','crust','bank','settle','seed','exposure','logicalSize','light']) {
      uniforms[name] = gl.getUniformLocation(program,name);
    }
    gl.uniform1f(uniforms.logicalSize, logicalSize); gl.viewport(0,0,SIZE,SIZE);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    diagnostic.status = 'ready'; diagnostic.reason = '';
    diagnostic.programs = diagnostic.buffers = 1;
  }
  function contextRestored() {
    if (disposed) return;
    lost = false;
    try { initializeResources(); diagnostic.restores++; }
    catch (error) {
      release(); diagnostic.status = 'restore-failed';
      diagnostic.reason = String(error.message || error);
    }
  }
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true,
      antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL unavailable');
    diagnostic.contexts = 1;
    initializeResources();
  } catch (error) { diagnostic.reason = String(error.message || error); release(); }

  function render(state) {
    if (disposed || lost || !program) return null;
    gl.uniform1f(uniforms.time,state.reduced ? 0 : state.time || 0);
    gl.uniform1f(uniforms.morph,state.morph || 0);
    gl.uniform1f(uniforms.wing,state.wing || 0);
    gl.uniform1f(uniforms.unravel,state.unravel || 0);
    gl.uniform1f(uniforms.impulse,state.impulse || 0);
    gl.uniform1f(uniforms.stroke,state.stroke || 0);
    gl.uniform1f(uniforms.velocity,state.velocity || 0);
    gl.uniform1f(uniforms.bend,state.bend || 0);
    gl.uniform1f(uniforms.crust,state.crust || 0);
    gl.uniform1f(uniforms.bank,state.bank || 0);
    gl.uniform1f(uniforms.settle,state.settle || 0);
    gl.uniform1f(uniforms.seed,state.seed || 0);
    gl.uniform1f(uniforms.exposure,state.exposure || 0);
    const lightX = state.lightX ?? .7, lightY = state.lightY ?? -.7;
    const lightLength = Math.hypot(lightX, lightY, .85);
    gl.uniform3f(uniforms.light,lightX / lightLength,lightY / lightLength,.85 / lightLength);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4); diagnostic.draws++;
    return canvas;
  }
  function reset() { diagnostic.draws = 0; }
  function dispose() {
    if (disposed) return;
    disposed = true; canvas.removeEventListener('webglcontextlost',contextLost); release();
    canvas.removeEventListener('webglcontextrestored',contextRestored);
    if (gl && !lost) gl.getExtension('WEBGL_lose_context')?.loseContext();
    gl = null; diagnostic.contexts = 0; diagnostic.status = 'disposed';
  }
  return { render, reset, dispose, getDiagnostic: () => diagnostic,
    get status() { return diagnostic.status; } };
}

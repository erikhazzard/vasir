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
uniform float time,morph,impulse,stroke,velocity,bend,seed,exposure,logicalSize;
uniform vec2 light;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec2 p=(vec2(uv.x,1.-uv.y)-.5)*logicalSize;
  float wing=smoothstep(15.,37.,abs(p.x))*morph;
  float head=1.-smoothstep(8.,17.,length((p-vec2(3.,mix(-4.,-17.,morph)))*vec2(1.,.85)));
  // Advection runs out from the shoulder; a broad curling flow deforms long
  // lamellae instead of exposing isolated cellular/noise holes.
  float travel=time*(8.+impulse*9.)+stroke*9.;
  vec2 q=vec2(abs(p.x)*.072-travel*.16,p.y*.075+step(0.,p.x)*5.7);
  q.y+=sin(q.x*1.5+time*.8)*.55+stroke*.7+ bend*.015;
  q.x+=p.y*velocity*.000045;
  float broad=noise(q*.72+vec2(seed*.13,time*.11));
  float curl=noise(q*1.65+vec2(7.2,-time*.25));
  float phase=p.y*.78+abs(p.x)*.17+sin(abs(p.x)*.095-time*1.8+p.x*.025)*2.2
    +(broad-.5)*10.+(curl-.5)*5.-travel*.58;
  float ridge=noise(vec2(q.x*.8,phase*.43)+vec2(seed*.37,0.));
  float fine=noise(vec2(q.x*2.4,q.y*5.)+vec2(time*.4,13.));
  float sheets=smoothstep(.36,.77,ridge*.82+fine*.3);
  float erosion=smoothstep(.55,.79,ridge)*smoothstep(.31,.60,broad)
    *wing*(1.-head)*(.72+impulse*.28);
  float alpha=1.-erosion;
  float facingLight=clamp(.5+dot(normalize(vec2((curl-.5)*1.8,-1.)),light)*.5,0.,1.);
  float front=(.13+exposure*.40+impulse*.16)*facingLight;
  float soot=.022+(.018+broad*.055)+sheets*(.12+front*.58);
  soot+=pow(ridge,4.)*(.025+impulse*.13)*(.45+wing*.55);
  vec3 color=mix(vec3(.012,.020,.020),vec3(.72,.74,.68),clamp(soot,0.,.62));
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
    for (const name of ['time','morph','impulse','stroke','velocity','bend','seed','exposure','logicalSize','light']) {
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
    gl.uniform1f(uniforms.impulse,state.impulse || 0);
    gl.uniform1f(uniforms.stroke,state.stroke || 0);
    gl.uniform1f(uniforms.velocity,state.velocity || 0);
    gl.uniform1f(uniforms.bend,state.bend || 0);
    gl.uniform1f(uniforms.seed,state.seed || 0);
    gl.uniform1f(uniforms.exposure,state.exposure || 0);
    gl.uniform2f(uniforms.light,state.lightX ?? .7,state.lightY ?? -.7);
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

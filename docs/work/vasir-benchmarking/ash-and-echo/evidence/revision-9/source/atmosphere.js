/** GPU scenery compositor. One caller, one framebuffer, static image uploads.
 * Gameplay stays on the crisp foreground canvas; air only touches scenery. */
import { createCloudPixels } from './cloud-texture.js';

export function createAtmosphere(canvas) {
  if (!canvas) return null;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
  if (!gl) return null;
  let program, buffer, noise, uniforms, lost = false, failed = false;
  let width = 420, height = 740;
  const textures = new Map();
  const vertex = `
    attribute vec2 aPosition;
    uniform vec4 uRect;
    uniform vec2 uSize;
    uniform float uFlip;
    varying vec2 vUv;
    varying vec2 vWorld;
    void main() {
      vUv = vec2(mix(aPosition.x, 1.0-aPosition.x, uFlip), aPosition.y);
      vWorld = uRect.xy + aPosition * uRect.zw;
      gl_Position = vec4(vWorld / uSize * vec2(2.0,-2.0) + vec2(-1.0,1.0),0.0,1.0);
    }`;
  const fragment = `
    precision mediump float;
    uniform sampler2D uImage;
    uniform sampler2D uNoise;
    uniform float uMode, uTime, uCamera, uOpacity, uLayer;
    uniform vec4 uCrop;
    uniform vec2 uSummit;
    varying vec2 vUv;
    varying vec2 vWorld;
    float gaussian(float x) { return exp(-(x*x)); }
    void main() {
      if (uMode < .5) {
        gl_FragColor = texture2D(uImage,uCrop.xy+vUv*uCrop.zw) * vec4(1.0,1.0,1.0,uOpacity);
      } else if (uMode < 1.5) {
        float light = gaussian((vWorld.x-235.0)/270.0);
        gl_FragColor = vec4(mix(vec3(.43,.46,.47),vec3(.73,.75,.74),light),1.0);
      } else {
        vec2 p = vec2(vWorld.x, vWorld.y + uCamera);
        float t = uTime * (1.0+uLayer*.19);
        vec2 base = p / vec2(590.0,310.0) + vec2(uLayer*1.71,uLayer*.37);
        vec2 eddy = texture2D(uNoise,base*.63+vec2(t*.009,-t*.006)).gb-.5;
        // Cathedral-scale air has its own continuous wind. Moving its noise UVs
        // on each jump made distant banks snap and stretch like a rubber sheet.
        // Small contact disturbances belong to nearby ash, outside this field.
        base += eddy*.16;
        float n = .72*texture2D(uNoise,base+vec2(t*.027,t*.006)).r
          + .28*texture2D(uNoise,base*2.0+vec2(-t*.017,t*.019)+.43).g;
        // Coherent banks roll past at different depths. Eroded boundaries are
        // visible against unlit stone; they never become a white screen wash.
        float bandY = mod(p.y + uLayer*317.0 + eddy.x*100.0, 740.0)-370.0;
        float bank = gaussian(bandY/140.0);
        float density = smoothstep(.26,.76,n) * (.24+.76*bank);
        vec2 edge = smoothstep(vec2(0.0),vec2(.08,.12),vUv)
          * (1.0-smoothstep(vec2(.92,.86),vec2(1.0),vUv));
        float beam = gaussian((p.x+p.y*.25-590.0)/46.0);
        float alpha = (density*.82 + beam*.075)*uOpacity*edge.x*edge.y;
        vec3 color = mix(vec3(.67,.71,.72),vec3(.94,.95,.92),n);
        // At the final crossing the far city drops below a moving cloud ceiling.
        // The nearer flanking stone is submitted after this air and stays solid.
        if (uLayer > .5 && uLayer < 1.5) {
          float worldY = vWorld.y + uSummit.y;
          // A shaft of pale air beyond the first crossing. It belongs to this
          // place: climbing uncovers it, with no input lock or screen-wide lift.
          float refuge = gaussian((vWorld.x-210.0)/92.0)
            * gaussian((worldY-3780.0)/165.0);
          alpha = max(alpha,refuge*.55);
          color = mix(color,vec3(.941,.929,.878),refuge*.85);
          float opening = uSummit.x * gaussian((vWorld.x-214.0)/113.0)
            * gaussian((worldY-160.0)/205.0);
          float ceiling = uSummit.x * gaussian((worldY-610.0-eddy.x*70.0)/115.0);
          alpha = max(alpha,opening*.76+ceiling*(.25+n*.33));
          color = mix(color,vec3(.88,.89,.87),opening);
        }
        gl_FragColor = vec4(color,clamp(alpha,0.0,.76));
      }
    }`;

  function initialize() {
    const shaders = [];
    try {
      program = gl.createProgram();
      for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(type); shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader); gl.attachShader(program, shader);
      }
      gl.bindAttribLocation(program, 0, 'aPosition'); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      uniforms = {};
      for (const name of ['Rect','Size','Flip','Image','Noise','Mode','Time','Camera','Opacity','Crop','Layer','Summit']) uniforms[name] = gl.getUniformLocation(program, 'u'+name);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]), gl.STATIC_DRAW);
      const pixels = createCloudPixels(256);
      noise=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,noise);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      failed = false;
    } catch (error) {
      failed = true; canvas.hidden = true;
      if (buffer) gl.deleteBuffer(buffer);
      if (noise) gl.deleteTexture(noise);
      if (program) gl.deleteProgram(program);
      console.warn('Atmosphere unavailable; using painted scenery.', error.message);
    } finally { shaders.forEach(shader=>gl.deleteShader(shader)); }
  }
  canvas.addEventListener('webglcontextlost', event=>{event.preventDefault();lost=true;canvas.hidden=true;});
  canvas.addEventListener('webglcontextrestored', ()=>{textures.clear();lost=false;initialize();});
  initialize();
  function rect(x,y,w,h,mode,opacity=1,flip=false) {
    gl.uniform4f(uniforms.Rect,x,y,w,h); gl.uniform1f(uniforms.Mode,mode);
    gl.uniform1f(uniforms.Opacity,opacity); gl.uniform1f(uniforms.Flip,flip?1:0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  return {
    resize(cssWidth, cssHeight, dpr, logicalHeight) {
      width=420; height=logicalHeight;
      const ratio=Math.min(dpr,1.5,Math.sqrt(1100000/(cssWidth*cssHeight)));
      canvas.width=Math.round(cssWidth*ratio); canvas.height=Math.round(cssHeight*ratio);
    },
    begin(camera,time,opaqueBackdrop=false,summitCamera=740) {
      if (lost||failed) return false;
      canvas.hidden=false;
      gl.viewport(0,0,canvas.width,canvas.height); gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      gl.uniform2f(uniforms.Size,width,height); gl.uniform1f(uniforms.Camera,camera);
      gl.uniform1f(uniforms.Time,time);
      gl.uniform2f(uniforms.Summit,Math.max(0,Math.min(1,1-summitCamera/650)),summitCamera);
      gl.uniform1i(uniforms.Image,0); gl.uniform1i(uniforms.Noise,1);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,noise); gl.activeTexture(gl.TEXTURE0);
      // Even the base branch has both samplers bound to complete textures.
      gl.bindTexture(gl.TEXTURE_2D,noise);
      // The full-coverage painted city replaces the base once loaded.
      if (!opaqueBackdrop) rect(0,0,width,height,1);
      return true;
    },
    image(image,x,y,w,h,flip=false,opacity=1,crop=null) {
      let texture=textures.get(image);
      if (!texture) {
        texture=gl.createTexture(); textures.set(image,texture); gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      } else gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.uniform4f(uniforms.Crop,crop?.x||0,crop?.y||0,crop?.w??1,crop?.h??1);
      rect(x,y,w,h,0,opacity,flip);
    },
    air(camera,opacity,layer=0) {gl.uniform1f(uniforms.Camera,camera);gl.uniform1f(uniforms.Layer,layer);rect(0,0,width,height,2,opacity);},
    get status() {return {backend:lost||failed?'canvas2d':'webgl',textures:textures.size,buffer:[canvas.width,canvas.height]};},
  };
}

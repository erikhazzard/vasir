/** GPU scenery compositor. One caller, one framebuffer, static image uploads.
 * Gameplay stays on the crisp foreground canvas; air only touches scenery. */
import { createCloudPixels } from './cloud-texture.js';
import { CATHEDRAL_LIGHTS, lightTop, lightBottom, LIGHT_GLSL } from './lighting.js';
import { FOG_VOLUME_GLSL } from './fog-volume.js';
import { CAST_SHADOW_GLSL } from './cast-shadows.js';

export function createAtmosphere(canvas) {
  if (!canvas) return null;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
  if (!gl) return null;
  let program, buffer, noise, uniforms, lost = false, failed = false;
  let width = 420, height = 740;
  const textures = new Map();
  const openings = new Float32Array(16);
  const openingRank = new Float32Array(4);
  const noCasters = new Float32Array(16);
  const noExposure = new Float32Array(4);
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
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform sampler2D uImage;
    uniform sampler2D uNoise;
    uniform float uMode, uTime, uCamera, uOpacity, uLayer;
    uniform vec4 uCrop;
    uniform vec2 uSummit;
    uniform vec4 uOpenings[4];
    uniform float uReceiving;
    varying vec2 vUv;
    varying vec2 vWorld;
    float gaussian(float x) { return exp(-(x*x)); }
    ${LIGHT_GLSL}
    ${FOG_VOLUME_GLSL}
    ${CAST_SHADOW_GLSL}
    void main() {
      if (uMode < .5) {
        vec4 painted = texture2D(uImage,uCrop.xy+vUv*uCrop.zw);
        if (uReceiving > .01) {
          vec2 point = vec2(vWorld.x,vWorld.y+uSummit.y);
          float illumination = 0.0;
          for (int i = 0; i < 4; i++) illumination = max(illumination,openingLight(point,uOpenings[i]));
          float shade = shadowOnStone(point);
          painted.rgb += vec3(.10,.097,.083) * illumination * uReceiving;
          painted.rgb *= 1.0 - shade * .50 * uReceiving;
        }
        gl_FragColor = painted * vec4(1.0,1.0,1.0,uOpacity);
      } else if (uMode < 1.5) {
        float light = gaussian((vWorld.x-235.0)/270.0);
        gl_FragColor = vec4(mix(vec3(.43,.46,.47),vec3(.73,.75,.74),light),1.0);
      } else {
        vec2 p = vec2(vWorld.x, vWorld.y + uCamera);
        float t = uTime * (1.0 + uLayer * .12);
        // Three actual depth planes share one continuous wind. Broad far
        // clouds and closer eroded curls replace repeating horizontal bands.
        vec2 scale = vec2(mix(2400.0,1200.0,uLayer*.5));
        mat2 cloudBasis = mat2(.94,.342,-.342,.94);
        vec2 base = cloudBasis*p/scale + vec2(uLayer*1.71,uLayer*.37);
        vec2 wind = cloudBasis*vec2(9.0,1.8)*t/scale;
        vec2 eddy = texture2D(uNoise,base*.57+cloudBasis*vec2(2.0,-1.0)*t/scale).gb-.5;
        base += eddy*.13;
        vec2 bodyUV = base + wind;
        float body = texture2D(uNoise,bodyUV).r;
        float detail = texture2D(uNoise,base*2.31+cloudBasis*vec2(12.0,-3.0)*t/scale+.43).g;
        float weather = texture2D(uNoise,base*.52+vec2(.73,0.0)+cloudBasis*vec2(0.0,-.4)*t/scale).b;
        float n = body+(detail-.45)*.085;
        // The baked body has mean .61. A .34 threshold filled every gap and
        // made a quilt of patches; retain only substantial connected banks.
        float density = smoothstep(.56,.84,n)
          * (.20+.80*smoothstep(.34,.75,weather));
        float sharedLight = 0.0, localShadow = 0.0;
        // Architectural light belongs to the physical cathedral coordinate,
        // while each cloud plane retains its independent parallax and wind.
        if (uLayer > .5 && uLayer < 1.5) {
          vec2 point = vec2(vWorld.x,vWorld.y+uSummit.y);
          for (int i = 0; i < 4; i++) {
            float beamLight = openingLight(point,uOpenings[i]);
            sharedLight = max(sharedLight,beamLight);
            if (beamLight > .001) localShadow = max(localShadow,beamLight*shadowInAir(point,uOpenings[i]));
          }
        }
        float transmitted = max(0.0,sharedLight-localShadow*.91);
        vec3 color = shadeFog(bodyUV,scale,density,transmitted);
        // Extinction builds volume without a white veil. Only illuminated
        // suspended matter adds a shaft; no screen-space or landmark wash.
        float alpha = (1.0-exp(-density*1.38))*uOpacity;
        float scattering = transmitted*(.075+density*.32)*uOpacity;
        alpha = 1.0-(1.0-alpha)*(1.0-scattering);
        color = mix(color,vec3(.97,.95,.87),transmitted*(.56+.25*(1.0-density)));
        color *= 1.0-localShadow*.21;
        gl_FragColor = vec4(color,clamp(alpha,0.0,.72));
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
      for (const name of ['Rect','Size','Flip','Image','Noise','Mode','Time','Camera','Opacity','Crop','Layer','Summit','Receiving','CasterExposure']) uniforms[name] = gl.getUniformLocation(program, 'u'+name);
      for (const name of ['Openings','Casters','ReceivingCasters']) uniforms[name] = gl.getUniformLocation(program,'u'+name+'[0]');
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
    begin(camera,time,opaqueBackdrop=false,summitCamera=740,casters=null) {
      if (lost||failed) return false;
      canvas.hidden=false;
      gl.viewport(0,0,canvas.width,canvas.height); gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      gl.uniform2f(uniforms.Size,width,height); gl.uniform1f(uniforms.Camera,camera);
      gl.uniform1f(uniforms.Time,time);
      gl.uniform2f(uniforms.Summit,Math.max(0,Math.min(1,1-summitCamera/650)),summitCamera);
      openings.fill(0); openingRank.fill(-1);
      for (let i=0;i<4;i++) { openings[i*4+1]=-9000;openings[i*4+3]=20; }
      for (const opening of CATHEDRAL_LIGHTS) {
        const top=lightTop(opening),bottom=lightBottom(opening);
        if (bottom<summitCamera || top>summitCamera+height) continue;
        const visible=Math.min(bottom,summitCamera+height)-Math.max(top,summitCamera);
        const rank=(visible+(opening.horizontal?230:0))/(1+Math.abs((top+bottom)*.5-summitCamera-height*.55)/height);
        let slot=0;
        for(let i=1;i<4;i++)if(openingRank[i]<openingRank[slot])slot=i;
        if(rank<=openingRank[slot])continue;
        openingRank[slot]=rank;
        openings[slot*4]=opening.x;openings[slot*4+1]=opening.y;openings[slot*4+2]=opening.slope;openings[slot*4+3]=opening.width*(opening.horizontal?-1:1);
      }
      gl.uniform4fv(uniforms.Openings,openings);
      gl.uniform4fv(uniforms.Casters,casters?.air||noCasters);
      gl.uniform4fv(uniforms.ReceivingCasters,casters?.receiving||noCasters);
      gl.uniform4fv(uniforms.CasterExposure,casters?.exposure||noExposure);
      gl.uniform1f(uniforms.Receiving,0);
      gl.uniform1i(uniforms.Image,0); gl.uniform1i(uniforms.Noise,1);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,noise); gl.activeTexture(gl.TEXTURE0);
      // Even the base branch has both samplers bound to complete textures.
      gl.bindTexture(gl.TEXTURE_2D,noise);
      // The full-coverage painted city replaces the base once loaded.
      if (!opaqueBackdrop) rect(0,0,width,height,1);
      return true;
    },
    image(image,x,y,w,h,flip=false,opacity=1,crop=null,receiving=0) {
      let texture=textures.get(image);
      if (!texture) {
        texture=gl.createTexture(); textures.set(image,texture); gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      } else gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.uniform4f(uniforms.Crop,crop?.x||0,crop?.y||0,crop?.w??1,crop?.h??1);
      gl.uniform1f(uniforms.Receiving,receiving);
      rect(x,y,w,h,0,opacity,flip);
    },
    air(camera,opacity,layer=0) {gl.uniform1f(uniforms.Camera,camera);gl.uniform1f(uniforms.Layer,layer);rect(0,0,width,height,2,opacity);},
    get status() {return {backend:lost||failed?'canvas2d':'webgl',textures:textures.size,buffer:[canvas.width,canvas.height]};},
  };
}

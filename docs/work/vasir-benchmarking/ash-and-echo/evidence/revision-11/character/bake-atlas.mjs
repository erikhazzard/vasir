import { chromium } from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const dir = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
try {
 const page = await browser.newPage();
 const result = await page.evaluate(() => {
  const start = performance.now();
  const canvas = document.createElement('canvas');
  canvas.width = 384; canvas.height = 256;
  const gl = canvas.getContext('webgl', {alpha:true, premultipliedAlpha:false, preserveDrawingBuffer:true, antialias:false});
  if (!gl) throw new Error('WebGL unavailable');
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`], [gl.FRAGMENT_SHADER, `
   precision highp float;
   const float TAU=6.28318530718;
   float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float n(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(a),h(a+vec2(1,0)),f.x),mix(h(a+vec2(0,1)),h(a+vec2(1,1)),f.x),f.y);}
   void main(){
    vec2 cell=floor(gl_FragCoord.xy/64.);
    float frame=cell.x+(3.-cell.y)*6.;
    float time=frame/24.*TAU;
    vec2 uv=mod(gl_FragCoord.xy,64.)/64.;
    uv.y=1.-uv.y;
    // A closed orbit transports one coherent field. Domain warping gives it
    // rolling folds; fine noise breaks the folds into porous charcoal.
    vec2 p=uv*vec2(6.2,3.8)+vec2(cos(time),sin(time))*.63;
    vec2 curl=vec2(n(p*.73+vec2(3.7,2.1)),n(p*.73+vec2(1.2,7.6)))-.5;
    vec2 q=p+curl*2.35;
    float fold=n(q*1.6);
    float grain=n(q*11.7);
    float fine=n(p*35.3);
    float density=fold*.62+grain*.25+fine*.13;
    float porous=smoothstep(.23+uv.x*.20,.52+uv.x*.09,density);
    float rag=smoothstep(.33,.58,n(q*2.2+vec2(6.7,2.3)));
    float band=1.-smoothstep(.30+rag*.13,.49,abs(uv.y-.5));
    float ash=pow(smoothstep(.46,.78,density),1.5);
    vec3 color=mix(vec3(.008,.017,.014),vec3(.39,.43,.36),ash*.70);
    float alpha=porous*band*(1.-smoothstep(.73,1.,uv.x));
    gl_FragColor=vec4(color,alpha);
   }`]]) {
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program,shader);gl.deleteShader(shader);
   }
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const attribute=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  gl.viewport(0,0,384,256);gl.drawArrays(gl.TRIANGLES,0,6);gl.finish();
  const result={data:canvas.toDataURL('image/png'),bakeMilliseconds:performance.now()-start,width:canvas.width,height:canvas.height,frames:24,tile:64};
  gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();
  return result;
 });
 await fs.writeFile(dir+'ash-flow-atlas.png',Buffer.from(result.data.split(',')[1],'base64'));
 delete result.data;await fs.writeFile(dir+'atlas-proof.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}

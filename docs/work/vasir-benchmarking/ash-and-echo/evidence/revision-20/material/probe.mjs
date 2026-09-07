import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out='tmp/ash-and-echo/raven-live-pass/material';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:900,height:600}});
await page.goto('http://localhost:8317/');
await page.evaluate(async()=>{
 const {createAshMaterial}=await import('/ash-material.js');
 document.body.innerHTML='';document.body.style='margin:0;background:#77796f';
 const mat=createAshMaterial(); const c=document.createElement('canvas');c.width=864;c.height=576;document.body.append(c);const ctx=c.getContext('2d');
 const body=document.createElement('canvas');body.width=body.height=288;const b=body.getContext('2d');
 const state={time:0,morph:1,impulse:.7,stroke:.35,velocity:300,bend:2,seed:2,lightX:.7,lightY:-.7,exposure:.35,reduced:false};
 function mask(){b.setTransform(1,0,0,1,0,0);b.clearRect(0,0,288,288);b.setTransform(2,0,0,2,144,144);b.fillStyle='#080c0c';
 b.beginPath();b.ellipse(3,-13,12,18,0,0,Math.PI*2);b.fill();
 for(let side=-1;side<=1;side+=2){b.save();b.scale(side,1);b.beginPath();b.moveTo(2,-15);b.bezierCurveTo(15,-29,36,-41,53,-30);b.lineTo(36,-22);b.lineTo(53,-17);b.lineTo(33,-14);b.lineTo(46,-8);b.lineTo(26,-6);b.lineTo(37,2);b.lineTo(20,-1);b.lineTo(22,10);b.lineTo(8,4);b.closePath();b.fill();b.restore();}}
 function draw(live=true){mask();if(live){const texture=mat.render(state);if(texture){b.globalCompositeOperation='source-atop';b.drawImage(texture,-72,-72,144,144);b.globalCompositeOperation='destination-in';b.drawImage(texture,-72,-72,144,144);b.globalCompositeOperation='source-over';}}
 b.fillStyle='#fbf9e9';b.beginPath();b.ellipse(3,-17,2.7,3.3,.4,0,Math.PI*2);b.ellipse(8,-17.5,1.05,2.5,.32,0,Math.PI*2);b.fill();}
 window.probe={mat,c,ctx,body,b,state,draw};
});
const result=await page.evaluate(async()=>{
 const {mat,c,ctx,body,b,state,draw}=probe;
 const ext=mat.render(state).getContext('webgl').getExtension('WEBGL_debug_renderer_info');const gl=mat.render(state).getContext('webgl');
 const backend=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 const samples={baseline:[],live:[]},frames={baseline:[],live:[]};
 for(const kind of ['baseline','live','baseline','live']){let last=performance.now();for(let i=0;i<80;i++){await new Promise(requestAnimationFrame);const now=performance.now();state.time=i/60;const start=performance.now();draw(kind==='live');ctx.drawImage(body,0,0);const end=performance.now();if(i>9){samples[kind].push(end-start);frames[kind].push(now-last);}last=now;}}
 function stats(a){a.sort((x,y)=>x-y);return {n:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a[a.length-1]};}
 state.time=.4;draw();const before=b.getImageData(0,0,288,288).data.slice();draw();const repeated=b.getImageData(0,0,288,288).data;let pausedDiff=0;for(let i=0;i<before.length;i++)pausedDiff+=before[i]!==repeated[i];
 state.time=.55;draw();const later=b.getImageData(0,0,288,288).data;let changed=0,alphaChanged=0;for(let i=0;i<before.length;i+=4){if(Math.abs(before[i]-later[i])>5)changed++;if(Math.abs(before[i+3]-later[i+3])>16)alphaChanged++;}
 ctx.fillStyle='#77796f';ctx.fillRect(0,0,c.width,c.height);
 for(let i=0;i<6;i++){state.time=.4+i*.1;draw();ctx.drawImage(body,(i%3)*288,Math.floor(i/3)*288);ctx.fillStyle='#f0eee5';ctx.font='15px sans-serif';ctx.fillText(`${state.time.toFixed(1)}s`,i%3*288+16,Math.floor(i/3)*288+25);}
 const resources={...mat.getDiagnostic()};mat.reset();const reset={...mat.getDiagnostic()};
 return {backend,cpuSubmissionAnd2DCopy:{baseline:stats(samples.baseline),live:stats(samples.live)},rAF:{baseline:stats(frames.baseline),live:stats(frames.live)},pausedDiff,changedOver150ms:changed,alphaChangedOver150ms:alphaChanged,resources,reset};
});
await page.screenshot({path:`${out}/material-sequence.png`});
await page.evaluate(()=>{const {ctx,c,body,state,draw}=probe;ctx.fillStyle='#77796f';ctx.fillRect(0,0,c.width,c.height);for(let i=0;i<6;i++){state.time=.4+i*.1;draw();ctx.drawImage(body,(i%3)*200+20,Math.floor(i/3)*200+30,144,144);}});
await page.screenshot({path:`${out}/material-native-sequence.png`});
result.reduced=await page.evaluate(()=>{const {mat,b,state,draw}=probe;state.reduced=true;state.time=2;draw();b.getImageData(0,0,288,288);draw();const first=b.getImageData(0,0,288,288).data.slice();state.time=12;draw();const second=b.getImageData(0,0,288,288).data;let changed=0;for(let i=0;i<first.length;i++)changed+=first[i]!==second[i];state.stroke=.9;draw();const third=b.getImageData(0,0,288,288).data;let poseChanged=0;for(let i=0;i<first.length;i++)poseChanged+=first[i]!==third[i];return {timeChangedPixels:changed,poseChangedPixels:poseChanged};});
result.lifecycle=await page.evaluate(async()=>{const {mat,state}=probe;const gl=mat.render(state).getContext('webgl');gl.getExtension('WEBGL_lose_context').loseContext();await new Promise(resolve=>setTimeout(resolve,80));const lost={...mat.getDiagnostic()},fallback=mat.render(state)===null;mat.dispose();mat.dispose();return {lost,fallback,disposed:{...mat.getDiagnostic()}};});
result.unavailable=await page.evaluate(async()=>{const {createAshMaterial}=await import('/ash-material.js');const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};const m=createAshMaterial();HTMLCanvasElement.prototype.getContext=original;const result={status:m.status,nullResult:m.render({})===null,...m.getDiagnostic()};m.dispose();return result;});
await fs.writeFile(`${out}/metrics.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();

import {chromium} from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage();await page.goto('http://localhost:8317/');
const result=await page.evaluate(async()=>{
 const {createAshMaterial}=await import('/ash-material.js');
 const m=createAshMaterial(),state={time:.4,morph:1,impulse:.7,stroke:.3};
 const canvas=m.render(state),gl=canvas.getContext('webgl'),extension=gl.getExtension('WEBGL_lose_context');
 const buffer=document.createElement('canvas');buffer.width=buffer.height=256;const ctx=buffer.getContext('2d',{willReadFrequently:true});
 function pixels(){ctx.clearRect(0,0,256,256);ctx.drawImage(m.render(state),0,0);return ctx.getImageData(0,0,256,256).data;}
 const before=pixels();const cycles=[];
 for(let i=0;i<3;i++){
  await new Promise(resolve=>{canvas.addEventListener('webglcontextlost',resolve,{once:true});extension.loseContext();});
  const fallback=m.render(state)===null,lost={...m.getDiagnostic()};
  await new Promise(resolve=>{canvas.addEventListener('webglcontextrestored',resolve,{once:true});setTimeout(()=>extension.restoreContext(),100);});
  const after=pixels();let changed=0;for(let n=0;n<before.length;n++)changed+=before[n]!==after[n];
  cycles.push({fallback,lost,restored:{...m.getDiagnostic()},sameContext:canvas.getContext('webgl')===gl,pausedChangedBytes:changed});
 }
 m.reset();const reset={...m.getDiagnostic()};m.dispose();m.dispose();
 const original=WebGLRenderingContext.prototype.getShaderPrecisionFormat;
 WebGLRenderingContext.prototype.getShaderPrecisionFormat=function(stage,precision){if(stage===this.FRAGMENT_SHADER&&precision===this.HIGH_FLOAT)return {precision:0,rangeMin:0,rangeMax:0};return original.call(this,stage,precision);};
 const medium=createAshMaterial();WebGLRenderingContext.prototype.getShaderPrecisionFormat=original;
 const mc=medium.render(state);ctx.clearRect(0,0,256,256);ctx.drawImage(mc,0,0);const a=ctx.getImageData(0,0,256,256).data;let min=255,max=0;for(let i=0;i<a.length;i+=4){min=Math.min(min,a[i]);max=Math.max(max,a[i]);}
 const mediump={...medium.getDiagnostic(),redRange:[min,max],live:!!mc};medium.dispose();
 return {cycles,reset,disposed:{...m.getDiagnostic()},mediump};
});
await fs.writeFile('tmp/ash-and-echo/raven-live-pass/material/round3/restore-metrics.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();

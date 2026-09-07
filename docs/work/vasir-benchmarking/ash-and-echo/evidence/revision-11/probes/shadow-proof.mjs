import {chromium} from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out='tmp/ash-and-echo/volume-pass/shadows';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={method:'Arranged initial drops; ordinary keyboard events and shipping RAF advanced at120Hz. Paired same-frame GPU captures only toggle four caster uniforms, no production changes. Not real-time or performance proof.',scenes:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});page.on('pageerror',e=>report.errors.push(String(e)));
 await page.addInitScript(()=>{
  let t=1000,id=0;const callbacks=new Map();window.requestAnimationFrame=f=>{callbacks.set(++id,f);return id};window.cancelAnimationFrame=i=>callbacks.delete(i);window.__advance=n=>{for(let i=0;i<n;i++){t+=1000/120;const list=[...callbacks.values()];callbacks.clear();for(const f of list)f(t)}};
  const names=new Map(),get=WebGLRenderingContext.prototype.getUniformLocation,upload=WebGLRenderingContext.prototype.uniform4fv;
  WebGLRenderingContext.prototype.getUniformLocation=function(p,n){const u=get.call(this,p,n);if(u)names.set(u,n);return u};
  const zero=new Float32Array(16);WebGLRenderingContext.prototype.uniform4fv=function(u,v){return upload.call(this,u,window.__noShadows&&['uCasters[0]','uReceivingCasters[0]'].includes(names.get(u))?zero:v)};
  window.__shadowPair=()=>{const e=__echo,gl=document.querySelector('#atmosphere-canvas').getContext('webgl');const a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),b=new Uint8Array(a.length);window.__noShadows=false;e.renderer.render(e.game,0);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);window.__noShadows=true;e.renderer.render(e.game,0);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);let count=0,max=0,total=0;for(let i=0;i<a.length;i+=4){const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));if(d>1){count++;total+=d;max=Math.max(max,d)}}window.__noShadows=false;e.renderer.render(e.game,0);return{count,max,meanChanged:count?total/count:0,glError:gl.getError(),casters:e.renderer.sceneryState.shadowCasters,bells:e.renderer.sceneryState.bells}};
 });
 await page.goto('http://localhost:8317');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled,null,{polling:100});await page.locator('#start-button').tap();
 for(const id of ['resonant-stone','ledge-13','ledge-20','ledge-26']){
  await page.evaluate(id=>{const e=__echo;e.restart();const p=e.game.platforms.find(p=>p.id===id);Object.assign(e.game.player,{x:p.x+p.w*.5-12,y:p.y-80,vx:0,vy:320,grounded:false});e.game.cameraY=Math.max(0,Math.min(e.game.height-e.game.viewportHeight,p.y-e.game.viewportHeight*.64));},id);
  const samples=[];
  for(const n of [8,12,20,20,30]){await page.evaluate(n=>__advance(n),n);const sample=await page.evaluate(()=>({elapsed:__echo.game.elapsed,...__shadowPair()}));samples.push(sample);await page.locator('#game-frame').screenshot({path:out+'/'+id+'-'+samples.length+'.png'});}
  await page.keyboard.down('Space');await page.evaluate(()=>__advance(16));await page.keyboard.up('Space');await page.evaluate(()=>__advance(30));samples.push(await page.evaluate(()=>({elapsed:__echo.game.elapsed,...__shadowPair()})));await page.locator('#game-frame').screenshot({path:out+'/'+id+'-rebound.png'});
  report.scenes.push({id,samples,events:await page.evaluate(()=>__echo.eventLog)});
 }
}finally{await browser.close()}
await fs.writeFile(out+'/receipt.json',JSON.stringify(report,null,2));console.log(JSON.stringify({errors:report.errors,scenes:report.scenes.map(s=>({id:s.id,pixels:s.samples.map(x=>x.count),max:s.samples.map(x=>x.max),casters:s.samples[0].casters.map(c=>c.id)}))}));

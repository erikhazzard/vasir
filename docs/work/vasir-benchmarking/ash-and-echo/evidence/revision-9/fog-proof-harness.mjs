import {chromium} from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const dir='tmp/ash-and-echo/scenery-repair-v9/fog';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={scope:'Isolated production fog compositor: same camera/time/noise, changing the jump impulse only. Pixel comparison is a causal shader check, not active-play or performance proof.'};
for(const version of ['before','after']){
 const p=await b.newPage();
 if(version==='before')for(const name of ['depth','atmosphere'])await p.route('**/'+name+'.js',r=>r.fulfill({path:dir+'/before-'+name+'.js',contentType:'text/javascript'}));
 await p.goto('http://localhost:8317');await p.waitForFunction(()=>window.__echo);
 report[version]=await p.evaluate(async version=>{
  const {createAtmosphere}=await import('./atmosphere.js'),c=document.createElement('canvas');
  const a=createAtmosphere(c);a.resize(420,740,1,740);const gl=c.getContext('webgl'),rows=[];
  function draw(layer,strength,time=5){
   const wake={x:210,y:390,strength};
   if(version==='before')a.begin(460,time,false,wake,1900);else a.begin(460,time,false,1900);
   a.air(532,.9,layer);const px=new Uint8Array(420*740*4);gl.readPixels(0,0,420,740,gl.RGBA,gl.UNSIGNED_BYTE,px);return px;
  }
  function difference(x,y){let changed=0,max=0,total=0;for(let i=0;i<x.length;i+=4){let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(x[i+k]-y[i+k]));if(d)changed++;max=Math.max(max,d);total+=d;}return{changedPixels:changed,maxChannelDifference:max,meanMaxChannelDifference:total/(x.length/4)}}
  for(let layer=0;layer<3;layer++){const still=draw(layer,0);rows.push({layer,impulse:difference(still,draw(layer,1.8)),windAfterOneSecond:difference(still,draw(layer,0,6))});}
  return{rows,glError:gl.getError()};
 },version);
 await p.close();
}
await b.close();await fs.writeFile(dir+'/fog-proof.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(report.before.rows.some(r=>r.impulse.changedPixels===0)||report.after.rows.some(r=>r.impulse.changedPixels!==0||r.windAfterOneSecond.changedPixels===0)||report.after.glError)process.exitCode=1;

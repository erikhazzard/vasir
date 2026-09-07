import {chromium} from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];
try{for(const name of ['blank','baseline','current','baseline','current','blank']){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 if(name==='baseline') await context.route('**/*.js',async r=>{const filename=new URL(r.request().url()).pathname.split('/').at(-1);try{await r.fulfill({contentType:'text/javascript',body:await fs.readFile('tmp/ash-and-echo/volume-pass/baseline/'+filename,'utf8')});}catch{await r.continue();}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 if(name==='blank'){await page.goto('about:blank');await page.evaluate(()=>{let last;window.timing=[];function frame(t){if(last)timing.push(t-last);last=t;requestAnimationFrame(frame)}requestAnimationFrame(frame)});}
 else{await page.goto('http://localhost:8317');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await page.locator('#start-button').tap();await page.evaluate(()=>{const e=__echo;const p=e.game.platforms.find(p=>p.id==='resonant-stone');Object.assign(e.game.player,{x:p.x+p.w/2-12,y:p.y-28,vx:0,vy:0,grounded:true});e.game.cameraY=3316.55;});await page.waitForTimeout(700);await page.evaluate(()=>__echo.frameSamples.length=0);}
 await page.waitForTimeout(4000);
 const metrics=await page.evaluate(isBlank=>{const a=[...(isBlank?timing:__echo.frameSamples)].sort((a,b)=>a-b);return{count:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:Math.max(...a),visibility:document.visibilityState,focused:document.hasFocus(),backend:isBlank?null:__echo.renderer.atmosphereStatus};},name==='blank');results.push({name,metrics,errors});console.log(name,metrics);await context.close();
}}finally{await browser.close();await fs.writeFile('tmp/ash-and-echo/volume-pass/cadence-diagnostic.json',JSON.stringify(results,null,2));}

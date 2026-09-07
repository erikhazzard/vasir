import {chromium} from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();const out={method:'Same final renderer, Chrome Mac,390x844DPR2. Three sequential10s screenshot-free actual-input windows; renderer.render wall time measured separately using performance.now. Neither GPU completion nor physical-phone measurement.',windows:[]};
await page.goto('http://127.0.0.1:8317');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await page.locator('#start-button').tap();await page.waitForTimeout(1200);
await page.evaluate(()=>{window.__renderCosts=[];const render=window.__echo.renderer.render;window.__echo.renderer.render=function(...args){const t=performance.now();render(...args);window.__renderCosts.push(performance.now()-t);if(window.__renderCosts.length>1800)window.__renderCosts.shift();};});
const summary=a=>{const s=[...a].sort((a,b)=>a-b);return{count:a.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:Math.max(...a),over33:a.filter(x=>x>33.4).length,over50:a.filter(x=>x>50).length};};
for(let j=0;j<3;j++){
 await page.keyboard.press('r');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__echo.frameSamples.splice(0);window.__renderCosts.splice(0);r();}))));await page.keyboard.down('ArrowLeft');
 for(let i=0;i<13;i++){await page.keyboard.down('Space');await page.waitForTimeout(400);await page.keyboard.up('Space');await page.waitForTimeout(370);}await page.keyboard.up('ArrowLeft');
 const s=await page.evaluate(()=>({frames:[...window.__echo.frameSamples],draw:[...window.__renderCosts],snapshot:window.__echo.snapshot()}));out.windows.push({...s,frameSummary:summary(s.frames),drawSummary:summary(s.draw)});console.log(JSON.stringify({window:j,frames:summary(s.frames),draw:summary(s.draw)}));
}
await fs.writeFile('tmp/ash-and-echo/depth-pass/performance-diagnostic.json',JSON.stringify(out,null,2));await context.close();await browser.close();

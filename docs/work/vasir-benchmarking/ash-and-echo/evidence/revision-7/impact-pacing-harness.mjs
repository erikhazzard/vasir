import {chromium} from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';
const base='/Users/erikhazzard/code/vasir/site/ash-and-echo';const dir='/Users/erikhazzard/code/vasir/tmp/ash-and-echo/weight-and-place-pass';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();const result={at:new Date().toISOString(),browser:browser.version(),method:'Chrome headless on Mac, 390×844 DPR2 mobile/touch emulation. Actual keys mount the first suspended stone, then26 repeated jumps land on it so segmented cables/recoil/grit stay active. Warmup, then sample boundary synchronized after two requestAnimationFrame callbacks. No screenshot/video capture during measurement. Other root-agent work may share host; no physical phone claim.',responses:{},windows:[]};page.on('response',async r=>{if(/\/(main|game|renderer|depth|atmosphere|character|audio|cloud-texture|wildlife|foreground)\.js$/.test(r.url()))result.responses[r.url().split('/').at(-1)]=crypto.createHash('sha256').update(await r.body()).digest('hex')});await page.goto('http://127.0.0.1:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await page.locator('#start-button').tap();await page.waitForTimeout(1200);
await page.keyboard.down('ArrowRight');await page.keyboard.down('Space');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');await page.keyboard.up('Space');
await page.waitForFunction(()=>{const g=window.__echo.game,p=g.player,a=g.platforms.find(x=>x.id==='ledge-1');return p.grounded&&Math.abs(p.y+p.h-a.y)<1;});
await page.waitForTimeout(700);const cdp=await context.newCDPSession(page);
for(const throttle of [1]){
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__echo.frameSamples.splice(0);resolve();}))));
 
 for(let i=0;i<26;i++){await page.keyboard.down('Space');await page.waitForTimeout(280);await page.keyboard.up('Space');await page.waitForTimeout(650);}
 
 result.suspendedLands=await page.evaluate(()=>window.__echo.eventLog.filter(e=>e.type==='land'&&e.suspended).length);if(result.suspendedLands<20)throw new Error('Insufficient real suspension impacts');
 result.atmosphere=await page.evaluate(()=>window.__echo.renderer.atmosphereStatus);
 const frames=await page.evaluate(()=>[...window.__echo.frameSamples]);const sorted=[...frames].sort((a,b)=>a-b);result.windows.push({cpuThrottle:throttle,count:frames.length,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],p99:sorted[Math.floor(sorted.length*.99)],max:Math.max(...frames),over33:frames.filter(x=>x>33.4).length,over50:frames.filter(x=>x>50).length,frames,snapshot:await page.evaluate(()=>window.__echo.snapshot())});
}
await fs.writeFile(dir+'/impact-performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,windows:result.windows.map(({frames,...x})=>x)},null,2));await context.close();await browser.close();

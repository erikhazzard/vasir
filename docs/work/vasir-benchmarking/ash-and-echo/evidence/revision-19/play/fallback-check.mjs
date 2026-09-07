import {chromium} from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const dir='tmp/ash-and-echo/slam-pass/fallback';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const result={method:'Chrome on Mac; capability interception and WEBGL_lose_context; no physical-phone claim',errors:[],source:{}};
for(const fallback of [false,true]){
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 page.on('response',async r=>{if(r.url().endsWith('.js'))result.source[r.url().split('/').at(-1)]=crypto.createHash('sha256').update(await r.body()).digest('hex');});
 page.on('pageerror',e=>result.errors.push(String(e)));
 if(fallback)await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args)}});
 await page.goto('http://127.0.0.1:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);await page.locator('#start-button').tap();await page.waitForTimeout(700);
 const status=await page.evaluate(()=>window.__echo.renderer.atmosphereStatus);result[fallback?'unavailable':'initial']=status;
 if(fallback&&status.backend!=='canvas2d')throw new Error('Fallback did not activate');
 if(!fallback){
  result.gl=await page.evaluate(()=>{const gl=document.querySelector('#atmosphere-canvas').getContext('webgl');const d=gl.getExtension('WEBGL_debug_renderer_info');return {error:gl.getError(),renderer:d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};});
  await page.evaluate(()=>{const gl=document.querySelector('#atmosphere-canvas').getContext('webgl');window.loss=gl.getExtension('WEBGL_lose_context');window.loss.loseContext();});await page.waitForTimeout(400);
  result.lost=await page.evaluate(()=>window.__echo.renderer.atmosphereStatus);if(result.lost.backend!=='canvas2d')throw new Error('Loss fallback failed');
  await page.locator('#game-frame').screenshot({path:dir+'/context-lost.png'});
  await page.evaluate(()=>window.loss.restoreContext());await page.waitForTimeout(700);result.restored=await page.evaluate(()=>window.__echo.renderer.atmosphereStatus);if(result.restored.backend!=='webgl'||result.restored.textures!==status.textures)throw new Error('Restore failed');
  await page.locator('#game-frame').screenshot({path:dir+'/restored.png'});
  for(let i=0;i<12;i++)await page.keyboard.press('r');await page.waitForTimeout(200);result.afterRestarts=await page.evaluate(()=>window.__echo.renderer.atmosphereStatus);
  // Reduced-motion time is fixed and pause must not drift scenery viewpoint.
  await page.evaluate(()=>window.__echo.renderer.setReducedMotion(true));await page.keyboard.press('Escape');await page.waitForTimeout(850);
  const a=await page.locator('#game-frame').screenshot();await page.waitForTimeout(350);const b=await page.locator('#game-frame').screenshot();result.pausedGentlePixelsIdentical=a.equals(b);await fs.writeFile(dir+'/paused-a.png',a);await fs.writeFile(dir+'/paused-b.png',b);
  if(!result.pausedGentlePixelsIdentical)throw new Error('Gentle paused image drift');await page.keyboard.press('Escape');
 }
 await page.keyboard.down('Space');await page.waitForTimeout(190);await page.keyboard.up('Space');result[fallback?'fallbackJump':'restoredJump']=await page.evaluate(()=>window.__echo.snapshot());
 if(result[fallback?'fallbackJump':'restoredJump'].player.grounded)throw new Error('Jump did not work');
 if(fallback){
  await page.locator('#game-frame').screenshot({path:dir+'/unavailable-playing.png'});
  await page.evaluate(()=>{const e=window.__echo;e.restart();const p=e.game.platforms.find(p=>p.id==='ledge-13');Object.assign(e.game.player,{x:p.x+p.w*.5-12,y:p.y-28,vx:0,vy:0,grounded:true});e.game.cameraY=2020;});
  await page.waitForTimeout(120);await page.keyboard.press('Escape');await page.waitForTimeout(200);
  await page.locator('#game-frame').screenshot({path:dir+'/unavailable-sidelight.png'});
  result.sidelightFallback=await page.evaluate(()=>window.__echo.renderer.atmosphereStatus);
 }
 await page.close();
}
await fs.writeFile(dir+'/checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();

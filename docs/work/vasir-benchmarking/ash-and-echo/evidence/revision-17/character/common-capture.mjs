import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const dir=new URL('.',import.meta.url).pathname;
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];const moving=process.env.LAND_MOVING==='1';const prefix=(process.env.LAND_BEFORE?'before-':'')+(moving?'common-moving-':'common-');
try {
for(const gentle of [false,true]) {
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:gentle?'reduce':'no-preference'});
const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
await page.route('**/character.js',async route=>{const src=await fs.readFile(dir+(process.env.LAND_BEFORE?'common-range-before/character.js':'candidate.js'),'utf8');await route.fulfill({contentType:'text/javascript',body:src.replace('return { update, emit, draw, reset };','return window.__char = { update, emit, draw, reset, inspect(){return {pose:{...pose},landAge,landDuration,landCompression,landStrength,landHeavy,wakeCapacity:wake.length,burstCapacity:bursts.length};} };')});});
await page.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__raf=cb,1);window.cancelAnimationFrame=()=>{};});
await page.goto('http://localhost:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled,{},{polling:50});
await page.evaluate(()=>{window.__echo.begin();document.querySelector('#intro').style.display='none';document.querySelector('#game-message').style.display='none';});
for(const [name,height] of (moving?[['medium',80],['heavy',300]]:[['tiny',8],['quiet',24],['medium',80],['heavy',300]])) {
const landed=await page.evaluate(({height,gentle,moving})=>{const {game,renderer}=window.__echo;game.restart();renderer.reset();renderer.setReducedMotion(gentle);game.start();const slab=game.platforms.find(p=>p.id==='opening-refuge');
// Controlled same-surface fixture: preserve the authored receiving stone,
// clear intervening colliders only; gravity/contact/event dispatch are real.
game.platforms.splice(0,game.platforms.length,slab);game.hazards.splice(0);Object.assign(game.player,{x:moving?165:200,y:slab.y-game.player.h-height,vx:0,vy:0,grounded:false,wallDir:0,motion:'fall',airJumps:1});game.cameraY=slab.y-440;renderer.render(game,1/120);
let contact;for(let i=0;i<300;i++){game.step(1/120,{axis:moving && slab.y-game.player.y-game.player.h<100?1:0,jumpHeld:false});const events=game.drainEvents();renderer.emit(events);game.cameraY=slab.y-440;renderer.render(game,1/120);contact=events.find(e=>e.type==='land');if(contact)break;}return {contact,player:{...game.player},pose:window.__char.inspect()};},{height,gentle,moving});
results.push({name,height,gentle,landed});
let last=0;
for(const ms of [17,50,100,180,280,420,560]) {
const state=await page.evaluate(({dt})=>{const {game,renderer}=window.__echo;for(let t=0;t<dt-.0001;t+=1/120){game.step(1/120,{axis:0});renderer.emit(game.drainEvents());game.cameraY=game.platforms[0].y-440;renderer.render(game,1/120);}return window.__char.inspect();},{dt:(ms-last)/1000});last=ms;
const tag=`real-${prefix}${gentle?'gentle':'normal'}-${name}-${ms}`;await page.screenshot({path:dir+tag+'.png'});await page.screenshot({path:dir+tag+'-body.png',clip:{x:130,y:365,width:145,height:65}});results.push({tag,...state});
}
}
const pause=await page.evaluate(()=>{const {game,renderer}=window.__echo;const a=JSON.stringify(window.__char.inspect());renderer.render(game,0);return a===JSON.stringify(window.__char.inspect());});
const cancel=await page.evaluate(()=>{const {game,renderer}=window.__echo;renderer.emit([{type:'land',x:212,y:game.player.y+28,landingSeverity:1}]);renderer.render(game,1/120);game.player.vx=18;renderer.render(game,1/120);const movement=window.__char.inspect();renderer.emit([{type:'land',x:212,y:game.player.y+28,landingSeverity:1},{type:'jump',vx:0,vy:-620}]);Object.assign(game.player,{grounded:false,vy:-620,motion:'rise'});renderer.render(game,1/120);return {movement,rebound:window.__char.inspect()};});
results.push({gentle,errors,pause,cancel});await page.close();
}
await fs.writeFile(dir+'real-'+prefix+'report.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results.filter(r=>r.pause!==undefined)));
} finally {await browser.close();}

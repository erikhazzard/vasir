import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const dir='/Users/erikhazzard/code/vasir/tmp/ash-and-echo/raven-live-pass/character/candidate3';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,recordVideo:{dir:dir+'/video',size:{width:390,height:844}}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log(e.message)});
await page.goto('http://localhost:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);
await page.locator('#start-button').click();await page.waitForTimeout(150);
await page.keyboard.down('Space');await page.waitForTimeout(100);await page.keyboard.up('Space');await page.waitForTimeout(65);await page.keyboard.down('Space');await page.waitForTimeout(120);await page.screenshot({path:dir+'/native.png'});await page.keyboard.up('Space');await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(100);await page.keyboard.up('ArrowLeft');await page.waitForTimeout(700);
const actual=await page.evaluate(()=>({snapshot:__echo.snapshot(),events:__echo.eventLog}));
await page.keyboard.press('Escape');
const samples=await page.evaluate(async()=>{
 const {createCharacter}=await import('/character.js');
 const output=document.createElement('canvas');output.id='proof-canvas';output.width=1800;output.height=800;output.style='position:fixed;inset:0;z-index:9999';document.body.append(output);
 const c=output.getContext('2d');c.fillStyle='#899084';c.fillRect(0,0,1800,800);
 const character=createCharacter(__echo.assets);const p={...__echo.game.player,x:0,y:0,w:24,h:28,vx:125,vy:-450,grounded:false,wallDir:0,facing:1,motion:'jump',airJumps:0};
 const game={...__echo.game,player:p,time:0,platforms:[],respawnTimer:0};
 character.update(game,0);character.emit([{type:'doubleJump',x:12,y:14,vx:125,vy:-450}]);
 let time=0;const ages=[.025,.065,.11,.155,.205,.26,.32,.38,.445,.515,.575,.65];
 for(let i=0;i<ages.length;i++){
 while(time<ages[i]-.0001){const dt=Math.min(1/120,ages[i]-time);time+=dt;game.time=time;character.update(game,dt);}
 const x=(i%6)*300+150,y=Math.floor(i/6)*400+160;
 c.save();c.translate(x,y);c.scale(2.5,2.5);c.translate(-12,-14);character.draw(c,game);c.restore();
 c.fillStyle='#fff';c.font='14px sans-serif';c.fillText(Math.round(time*1000)+'ms',x-24,y+130);
 c.save();c.translate(x,y+190);c.translate(-12,-14);character.draw(c,game);c.restore();
 }
 return {ages};
});
await page.setViewportSize({width:1800,height:800});await page.screenshot({path:dir+'/articulation-sheet.png'});
const motion=await page.evaluate(async()=>{
 const {createCharacter}=await import('/character.js');
 const output=document.querySelector('#proof-canvas'); output.width=600;output.height=600;
 const c=output.getContext('2d');
 const made=[];const create=document.createElement.bind(document);document.createElement=function(tag,...rest){const item=create(tag,...rest);if(tag==='canvas')made.push(item);return item;};
 const ch=createCharacter(__echo.assets);const p={...__echo.game.player,x:0,y:0,w:24,h:28,vx:125,vy:-450,grounded:false,wallDir:0,facing:1,motion:'jump',airJumps:0};
 const game={...__echo.game,player:p,time:0,platforms:[],respawnTimer:0};ch.update(game,0);ch.emit([{type:'doubleJump',x:12,y:14,vx:125,vy:-450}]);
 let last=0,elapsed=0,borderMax=0,frames=0;const frameDeltas=[];
 await new Promise((resolve,reject)=>{setTimeout(()=>reject(Error('capture timeout')),4000);function frame(now){if(!last)last=now;const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;game.time=elapsed;p.vx=elapsed>.25?-125:125;
 ch.update(game,dt);c.fillStyle='#899084';c.fillRect(0,0,600,600);c.save();c.translate(300,300);c.scale(4,4);c.translate(-12,-14);ch.draw(c,game);c.restore();
 const body=made.find(a=>a.width===288&&a.height===288);if(body){const b=body.getContext('2d');for(const [x,y,w,h]of [[0,0,288,1],[0,287,288,1],[0,0,1,288],[287,0,1,288]]){const data=b.getImageData(x,y,w,h).data;for(let i=3;i<data.length;i+=4)borderMax=Math.max(borderMax,data[i]);}}
 frames++;frameDeltas.push(dt);if(elapsed<.8)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});const body=made.find(a=>a.width===288&&a.height===288);const b=body.getContext('2d');
 ch.reset();game.time=0;ch.update(game,0);ch.emit([{type:'doubleJump',x:12,y:14,vx:125,vy:-450}]);
 for(let i=0;i<24;i++){game.time+=1/120;ch.update(game,1/120);}ch.draw(c,game);
 const before=b.getImageData(0,0,288,288).data;ch.update(game,0);ch.draw(c,game);const after=b.getImageData(0,0,288,288).data;let pauseChanged=0;for(let i=0;i<before.length;i++)if(before[i]!==after[i])pauseChanged++;
 p.grounded=true;p.vy=0;p.vx=0;p.airJumps=1;ch.emit([{type:'land',x:12,y:28,landingSeverity:.2}]);game.time+=1/120;ch.update(game,1/120);ch.draw(c,game);
 const contact=b.getImageData(0,0,288,288).data;let contactFarAlpha=0;for(let y=0;y<288;y++)for(let x=0;x<288;x++)if(Math.abs(x-144)>75)contactFarAlpha=Math.max(contactFarAlpha,contact[(y*288+x)*4+3]);
 document.createElement=create;return{borderMax,frames,frameDeltas,pauseChanged,contactFarAlpha};
});
await fs.writeFile(dir+'/proof.json' ,JSON.stringify({actual,samples,motion,errors},null,2));
await context.close();await browser.close();
console.log(JSON.stringify({errors,events:actual.events.map(e=>e.type)}));

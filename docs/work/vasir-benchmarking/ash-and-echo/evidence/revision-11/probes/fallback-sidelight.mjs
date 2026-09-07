import {chromium} from '/tmp/cloudbreak-playwright-validation/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out='tmp/ash-and-echo/volume-pass/runtime/fallback-sidelight';await fs.mkdir(out,{recursive:true});
const source=await fs.readFile('site/ash-and-echo/atmosphere.js','utf8');
const variants={fallback:source};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{for(const [name,body] of Object.entries(variants)){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});await context.route('**/atmosphere.js',r=>r.fulfill({contentType:'text/javascript',body}));const page=await context.newPage();await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args)};window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{}});await page.goto('http://localhost:8317');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled,null,{polling:100});await page.locator('#start-button').click();
 const layers=await page.evaluate(()=>{const e=__echo;e.restart();const p=e.game.platforms.find(p=>p.id==='ledge-13');Object.assign(e.game.player,{x:p.x+p.w*.5-12,y:p.y-28,vx:0,vy:0,grounded:true});e.game.cameraY=2020;for(let i=0;i<180;i++)e.renderer.render(e.game,1/60);const gpu=document.querySelector('#atmosphere-canvas'),fg=document.querySelector('#game-canvas');return{gpu:gpu.toDataURL(),fg:fg.toDataURL(),status:e.renderer.atmosphereStatus}});
 for(const key of ['gpu','fg'])await fs.writeFile(out+'/'+name+'-'+key+'.png',Buffer.from(layers[key].split(',')[1],'base64'));
 await page.locator('#game-frame').screenshot({path:out+'/'+name+'.png'});console.log(name,layers.status);await context.close();
}}finally{await browser.close()}

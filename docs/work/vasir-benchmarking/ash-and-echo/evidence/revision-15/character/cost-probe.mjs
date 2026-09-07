import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir=new URL('.',import.meta.url).pathname;
const sources={baseline:await fs.readFile(dir+'baseline-character.js','utf8'),candidate:await fs.readFile(dir+'character.js','utf8')};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.route('**/ash-flow.js',r=>r.fulfill({contentType:'text/javascript',path:dir+'ash-flow.js'}));
 await page.route('**/ash-flow-atlas.png',r=>r.fulfill({contentType:'image/png',path:dir+'ash-flow-atlas.png'}));
 await page.goto('http://localhost:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);
 const result=await page.evaluate(async sources=>{
  const start=performance.now(),image=new Image();image.src='./ash-flow-atlas.png';await image.decode();const decodeMilliseconds=performance.now()-start;
  const {createGame}=await import('./game.js');
  const constructors={};
  for(const [variant,source]of Object.entries(sources)){
    const module=await import(URL.createObjectURL(new Blob([source.replace("from './ash-flow.js'","from 'http://localhost:8317/ash-flow.js'")],{type:'text/javascript'})));
    constructors[variant]=module.createCharacter;
  }
  const samples=[],invariants=[];
  const assets={...window.__echo.assets,'ash-flow-atlas':image};
  for(let trial=0;trial<10;trial++)for(const variant of trial%2?['candidate','baseline']:['baseline','candidate']) {
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');
    const game=createGame();game.start();const character=constructors[variant](assets);character.update(game,0);
    const start=performance.now();
    for(let i=0;i<600;i++){
      game.step(1/120,{axis:Math.sin(i*.033)>0?1:-1,jumpPressed:i%41===0,jumpHeld:i%41<28});character.emit(game.drainEvents());
      character.update(game,1/120,false);c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,256,256);c.translate(128-game.player.x,128-game.player.y);character.draw(c,game);
    }
    const submissionMilliseconds=performance.now()-start;
    c.getImageData(128,128,1,1);
    samples.push({variant,trial,frames:600,submissionPerFrame:submissionMilliseconds/600,batchWithFinalFlushPerFrame:(performance.now()-start)/600});
  }
  for(const mode of ['normal','gentle','fallback']){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');const game=createGame();game.start();
    const modeAssets=mode==='fallback'?{}:assets;
    const character=constructors.candidate(modeAssets);
    let mutations=0;
    for(let i=0;i<240;i++){
      game.step(1/120,{axis:0,jumpPressed:i===1||i===28,jumpHeld:i<60});character.emit(game.drainEvents());const before=JSON.stringify(game);
      character.update(game,1/120,mode==='gentle');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,256,256);c.translate(128-game.player.x,128-game.player.y);character.draw(c,game);
      if(before!==JSON.stringify(game))mutations++;
    }
    invariants.push({mode,mutations,drawCompleted:true});
  }
  return {decodeMilliseconds,samples,invariants,proof:'Ten alternating baseline/candidate batches, 600 actual fixed game steps each. Timed character update+draw plus game simulation to bound total scripted cost. Separate final 1px flush reports batch completion cost. Headless desktop Chrome CPU wall time; no hardware-phone GPU/thermal or full-game performance claim.'};
 },sources);
 await fs.writeFile(dir+'cost-report.json',JSON.stringify({sourceHashes:Object.fromEntries(Object.entries(sources).map(([name,source])=>[name,createHash('sha256').update(source).digest('hex')])),...result},null,2));
 const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
 console.log(JSON.stringify({decodeMilliseconds:result.decodeMilliseconds,variants:Object.fromEntries(['baseline','candidate'].map(v=>[v,{medianSubmissionPerFrame:median(result.samples.filter(s=>s.variant===v).map(s=>s.submissionPerFrame)),medianBatchWithFlushPerFrame:median(result.samples.filter(s=>s.variant===v).map(s=>s.batchWithFinalFlushPerFrame))}])),invariants:result.invariants}));
}finally{await browser.close();}

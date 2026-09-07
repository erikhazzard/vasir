import {chromium} from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='/Users/erikhazzard/code/vasir/tmp/ash-and-echo/morph-pass/character';
const source=await fs.readFile(dir+'/character.js','utf8');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.route('**/ash-flow.js',r=>r.fulfill({contentType:'text/javascript',path:dir+'/ash-flow.js'}));
 await page.route('**/ash-flow-atlas.png',r=>r.fulfill({contentType:'image/png',path:dir+'/ash-flow-atlas.png'}));
 await page.goto('http://localhost:8317/');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);
 const report=await page.evaluate(async source=>{
  const image=new Image();image.src='./ash-flow-atlas.png';await image.decode();window.__echo.assets['ash-flow-atlas']=image;
  source=source.replace("from './ash-flow.js'","from 'http://localhost:8317/ash-flow.js'");
  const {createCharacter}=await import(URL.createObjectURL(new Blob([source.replace('return { update, emit, draw, reset };','return { update, emit, draw, reset, inspect() {return {pose:{...pose},refillAge,mantleSpent,listenAge,restAge,wake:wake.filter(w=>w.life>0).map(w=>({...w})),wakeCapacity:wake.length,burstCapacity:bursts.length,fibreCount:fibres.length};} };')],{type:'text/javascript'})));
  const {createGame}=await import('./game.js');
  const char=createCharacter(window.__echo.assets),game=createGame();game.start();
  const canvas=document.createElement('canvas');canvas.width=420;canvas.height=844;const ctx=canvas.getContext('2d');
  const failures=[],cases=[];
  const check=(name,condition,evidence)=>{cases.push({name,pass:!!condition,evidence});if(!condition)failures.push(name);};
  function step(input={},dt=1/120){game.step(dt,{axis:0,jumpHeld:false,jumpPressed:false,...input});const events=game.drainEvents();char.emit(events);const before=JSON.stringify(game);char.update(game,dt,false);ctx.setTransform(1,0,0,1,7,-game.cameraY);ctx.globalAlpha=.47;ctx.fillStyle='#123456';ctx.lineWidth=7;const t=ctx.getTransform().toString();char.draw(ctx,game);if(JSON.stringify(game)!==before)failures.push('Game mutation');if(ctx.getTransform().toString()!==t||ctx.globalAlpha!==.47||ctx.fillStyle!=='#123456'||ctx.lineWidth!==7)failures.push('Canvas state leak');return events;}
  char.update(game,0);step({jumpPressed:true,jumpHeld:true});for(let i=0;i<24;i++)step({jumpHeld:true});step({jumpPressed:true,jumpHeld:true});for(let i=0;i<80;i++)step({jumpHeld:true});
  check('Late airborne charge remains visibly spent',game.player.airJumps===0&&!game.player.grounded&&char.inspect().pose.missing===1,{player:{...game.player},pose:char.inspect().pose});
  // Position beside an actual wall after charge consumption; simulation owns
  // wall contact and the following kick, including whether charge is restored.
  Object.assign(game.player,{x:60,y:4300,vx:0,vy:120,grounded:false,wallDir:-1,motion:'wallSlide'});
  for(let i=0;i<3;i++)step({axis:-1});const wallEvents=step({axis:-1,jumpPressed:true,jumpHeld:true});
  check('Wall kick keeps spent mantle',wallEvents.some(e=>e.type==='wallJump')&&game.player.airJumps===0&&char.inspect().pose.missing===1,{events:wallEvents,player:{...game.player},pose:char.inspect().pose});
  // Exhaust coyote then let an actual landing consume a buffered press in the
  // same simulation step. The animation must recognize refill while airborne.
  for(let i=0;i<24;i++)step({jumpHeld:true});
  const platform=game.platforms.find(p=>p.id==='opening-refuge');
  Object.assign(game.player,{x:200,y:platform.y-29,vx:0,vy:180,grounded:false,wallDir:0,motion:'fall'});
  const reboundEvents=step({jumpPressed:true,jumpHeld:true});
  check('Buffered landing and takeoff restore charge without grounded pose lock',reboundEvents.some(e=>e.type==='land')&&reboundEvents.some(e=>e.type==='jump')&&!game.player.grounded&&game.player.airJumps===1&&!char.inspect().mantleSpent&&char.inspect().pose.rest===0,{events:reboundEvents,player:{...game.player},character:char.inspect()});
  for(let i=0;i<14;i++)step({jumpHeld:true});
  check('Refill ash follows immediate rebound',char.inspect().wake.some(w=>w.mantle),{refillAge:char.inspect().refillAge,mantleFlakes:char.inspect().wake.filter(w=>w.mantle).length});
  const spendAgain=step({jumpPressed:true,jumpHeld:true});
  check('Spending again cancels stale refill flakes',spendAgain.some(e=>e.type==='doubleJump')&&char.inspect().pose.missing===1&&!char.inspect().wake.some(w=>w.mantle),{events:spendAgain,character:char.inspect()});
  // Actual fall death and automatic respawn exercise transient cleanup.
  game.player.y=game.height+140;game.player.vy=100;const deathEvents=step();
  check('Death clears charge recovery and attention',deathEvents.some(e=>e.type==='death')&&char.inspect().pose.dead&&char.inspect().pose.missing===0&&char.inspect().listenAge>=10,{events:deathEvents,character:char.inspect()});
  let respawnEvents=[];for(let i=0;i<40;i++)respawnEvents.push(...step());
  check('Respawn returns intact mantle',respawnEvents.some(e=>e.type==='respawn')&&!char.inspect().pose.dead&&char.inspect().pose.missing===0&&char.inspect().pose.lookX===0,{player:{...game.player},character:char.inspect()});
  for(let i=0;i<480;i++)step({axis:Math.sin(i*.041)>0?1:-1,jumpPressed:i%38===0,jumpHeld:i%38<26});
  check('Pools stay bounded',char.inspect().wake.length<=44&&char.inspect().wakeCapacity===44&&char.inspect().burstCapacity===38&&char.inspect().fibreCount===6,char.inspect());
  char.reset();game.restart();const e=step({jumpPressed:true,jumpHeld:true});
  check('Reset followed by first-frame jump retains action',e.some(e=>e.type==='jump')&&!game.player.grounded&&char.inspect().pose.missing===0,{events:e,pose:char.inspect().pose});
  // Opposite real wall impulses override the old tail axis immediately.
  const directions=[];
  for(const side of [-1,1]) {
    Object.assign(game.player,{x:side<0?60:336,y:4300,vx:0,vy:120,grounded:false,wallDir:side,motion:'wallSlide',airJumps:0});
    for(let i=0;i<3;i++)step({axis:side});
    const events=step({axis:side,jumpPressed:true,jumpHeld:true});
    for(let i=0;i<10;i++)step({axis:-side,jumpHeld:true});
    const p=game.player,pose=char.inspect().pose,speed=Math.hypot(p.vx,p.vy);
    const alignment=-(pose.tailX*p.vx+pose.tailY*p.vy)/speed;
    directions.push({side,events,alignment,pose,player:{...p}});
  }
  check('Left and right wall releases align the mantle behind actual velocity',directions.every(d=>d.events.some(e=>e.type==='wallJump')&&d.alignment>.99&&d.pose.comet>.8),directions);
  const paused=JSON.stringify(char.inspect());for(let i=0;i<10;i++)char.update(game,0);check('Zero-delta updates stay frozen',JSON.stringify(char.inspect())===paused);
  return {proof:'Scratch Chrome probe uses production character source with read-only inspector and real deterministic game steps. Named-contact/wall/death fixture placement is explicit. No runtime timing claim.',failures,cases};
 },source);
 await fs.writeFile(dir+'/edge-report.json',JSON.stringify({sourceHash:createHash('sha256').update(source).digest('hex'),...report},null,2));console.log(JSON.stringify({failures:report.failures,cases:report.cases.map(c=>({name:c.name,pass:c.pass}))}));
} finally {await browser.close();}

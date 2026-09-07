import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createGame} from '../../../../site/ash-and-echo/game.js';
const out=new URL('./',import.meta.url);
const source=await fs.readFile(new URL('../../../../site/ash-and-echo/character.js',import.meta.url),'utf8');
const instrumented=source.replace('return { update, emit, draw, reset };','return { update, emit, draw, reset, inspect(){return {pose:{...pose},listenAge,restAge,restLandmark,mantleSpent,refillAge,jumpAge};} };');
const {createCharacter}=await import('data:text/javascript;base64,'+Buffer.from(instrumented).toString('base64'));
const report={method:'Node simulation only, no drawing. Production game steps and character update/emit, with read-only closure inspector. Arranged initial landings. No sensory or browser proof.',characterHash:createHash('sha256').update(source).digest('hex'),cases:[]};
for(const vx of [0,50,100,180]){
 const game=createGame();game.start();const char=createCharacter();
 const platform=game.platforms.find(p=>p.id==='resonant-stone');
 Object.assign(game.player,{x:287,y:platform.y-29,vx,vy:180,grounded:false,airJumps:0,motion:'fall'});
 char.update(game,0);
 const rows=[];
 for(let i=0;i<150;i++){
  game.step(1/120,{axis:0,jumpHeld:false,jumpPressed:false});const events=game.drainEvents();char.emit(events);char.update(game,1/120,false);
  if(events.length||[5,20,48,80,120].includes(i))rows.push({i,events,player:{...game.player},character:char.inspect()});
 }
 report.cases.push({initialVx:vx,input:'axis 0 throughout, no jump',rows});
}
{
 const game=createGame();game.start();const char=createCharacter();const rows=[];char.update(game,0);
 for(let i=0;i<180;i++){
  game.step(1/120,{axis:0,jumpHeld:true,jumpPressed:i===0||i===25});const events=game.drainEvents();char.emit(events);char.update(game,1/120,false);
  if(events.length||[85,105,160].includes(i))rows.push({i,events,player:{...game.player},character:char.inspect()});
 }
 report.ordinaryCharge=rows;
}
await fs.writeFile(new URL('functional-probe.json',out),JSON.stringify(report,null,2));
console.log(JSON.stringify({cases:report.cases.map(c=>({vx:c.initialVx,land:c.rows.find(r=>r.events.some(e=>e.type==='land')),late:c.rows.find(r=>r.i===80)})),charge:report.ordinaryCharge.map(r=>({i:r.i,events:r.events.map(e=>e.type),air:r.player.airJumps,ground:r.player.grounded,missing:r.character.pose.missing,jumpAge:r.character.jumpAge}))},null,2));

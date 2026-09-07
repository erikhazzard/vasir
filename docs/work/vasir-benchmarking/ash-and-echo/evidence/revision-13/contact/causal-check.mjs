import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createSurfaceAsh} from '../../../../site/ash-and-echo/surface-ash.js';
import {createGame} from '../../../../site/ash-and-echo/game.js';
const checks=[];const game=createGame();const ash=createSurfaceAsh();ash.update(game,0);
for(const [id,dir] of [['left-wall',1],['right-wall',-1],['cinder-rib:0',1],['hollow-rib:0',-1]]){
 ash.reset();const p=game.platforms.find(p=>p.id===id);const face=p.x+(dir>0?p.w:0);const y=id.includes('rib')?p.y+90:4320;
 ash.emit([{type:'wallJump',x:face+dir*12,y,vx:dir*296,vy:-810,intensity:1}]);ash.update(game,.1);
 const c=ash.state.contacts[0];assert.equal(c.platformId,id);assert.equal(c.x,face);assert(c.shards.every(s=>(s.x-face)*dir>0));assert(c.shards.some(s=>s.size>4));checks.push(id+' resolves face, ejects outward, large chips');
 const before=JSON.stringify(ash.state);ash.update(game,0);assert.equal(JSON.stringify(ash.state),before);checks.push(id+' zero-delta freeze');
}
ash.reset();const p=game.platforms.find(p=>p.suspension);const e={type:'land',platformId:p.id,contactX:p.x+p.w*.3,contactY:p.y,contactOffset:-.4,vx:100,intensity:1.2};
ash.emit([e]);ash.update(game,.05);const before=ash.state.contacts[0];p.x+=8;p.y+=5;ash.update(game,0);const moved=ash.state.contacts[0];assert(Math.abs(moved.x-before.x-8)<1e-8);assert.equal(moved.y-before.y,5);assert.deepEqual(moved.shards,before.shards);checks.push('suspended support carries pressure/residue; detached ballistic origins stay in world');
ash.reset();ash.emit([{type:'jump',x:210,y:1500,vx:200,intensity:1}]);ash.update(game,.1);assert.equal(ash.state.contacts.length,0);checks.push('airborne origin does not fabricate a ledge');
ash.reset();ash.emit([e]);ash.update(game,.03,true);assert.equal(ash.state.contacts[0].shardCount,5);checks.push('gentle caps burst to five shards');
ash.reset();ash.emit([e]);ash.update(game,.03,false);ash.update(game,0,true);let shardFills=0;const ctx=new Proxy({fill(){if(this.fillStyle==='#101613'||this.fillStyle==='#303633')shardFills++;}},{get:(target,key)=>key in target?target[key]:()=>{}});ash.draw(ctx,game,p.y-100);assert(shardFills<=5);checks.push('switching gentle during an existing burst draws at most five shards');
ash.reset();ash.emit(Array.from({length:100},()=>e));assert.equal(ash.state.pending,24);ash.update(game,.01);assert.equal(ash.state.contacts.length,16);assert.equal(ash.state.shardCapacity,608);assert.equal(ash.state.grainCapacity,224);checks.push('100-intent stress bounded to24 pending/16contacts/608shards/224grains');
ash.update(game,2);assert.equal(ash.state.contacts.length,0);ash.emit([e]);ash.update(game,.01);ash.reset();assert.equal(ash.state.pending,0);assert.equal(ash.state.contacts.length,0);checks.push('expiry/reset remove contact effects');
await fs.writeFile('tmp/ash-and-echo/living-ash-pass/contact/causal-check.json',JSON.stringify({sourceHash:createHash('sha256').update(await fs.readFile('site/ash-and-echo/surface-ash.js')).digest('hex'),checks},null,2));console.log(checks);

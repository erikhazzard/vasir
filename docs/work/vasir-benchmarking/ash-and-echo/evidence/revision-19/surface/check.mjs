import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createSurfaceAsh} from '../../../../site/ash-and-echo/surface-ash.js';
const old=await fs.readFile(new URL('baseline18/surface-ash.js',import.meta.url),'utf8');
const {createSurfaceAsh:baseline}=await import('data:text/javascript;base64,'+Buffer.from(old.replace("import { sampleLight } from './lighting.js';",'const sampleLight = () => .5;')).toString('base64'));
const p={id:'first-hop',landmark:'first-hop',x:100,y:500,w:80,h:70,solid:true},g={platforms:[p],player:{x:125,y:472,w:28,h:28,vx:0,grounded:true},viewportHeight:844};
const report=[];
for(const severity of [0,.03,.45,1]){const a=createSurfaceAsh();a.emit([{type:'land',platformId:p.id,landmark:p.landmark,x:140,y:500,intensity:1,landingSeverity:severity}]);a.update(g,0);const first=a.state.contacts[0];assert.equal(first.landingSeverity,severity);for(let i=0;i<60;i++){a.update(g,1/120);for(const c of a.state.contacts)for(const grain of c.grains)if(!grain.released)assert(grain.x>=c.left&&grain.x<=c.right)}const old=JSON.stringify(a.state);a.update(g,0);assert.equal(JSON.stringify(a.state),old);a.reset();assert.equal(a.state.contacts.length,0);report.push({severity,count:first.shardCount,duration:first.duration,size:Math.max(...first.shards.map(s=>s.size))});}
for(const event of [{type:'jump',x:140,y:500,vx:100,intensity:1,landmark:'first-hop'},{type:'wallJump',x:194,y:545,vx:300,intensity:1}]){const a=createSurfaceAsh(),b=baseline();a.emit([event]);b.emit([event]);for(let i=0;i<30;i++){a.update(g,1/120);b.update(g,1/120);const clean=v=>v.contacts.map(c=>({...c,landingSeverity:undefined,impactPower:undefined,slam:undefined,shards:c.shards.map(({x,y,size})=>({x,y,size}))}));assert.deepEqual(clean(a.state),clean(b.state));}}
const a=createSurfaceAsh();for(let i=0;i<100;i++)a.emit([{type:'land',platformId:p.id,x:140,y:500,landingSeverity:1}]);a.update(g,0,true);assert.equal(a.state.contacts.length,16);assert.equal(a.state.shardCapacity,608);assert(a.state.contacts.every(c=>c.shardCount===3));
a.reset();a.emit([{type:'land',platformId:p.id,x:140,y:500,landingSeverity:1}]);a.update(g,.03);a.emit([{type:'jump',x:140,y:500,vx:100,intensity:1}]);a.update(g,.01);assert(a.state.contacts[0].rebound);
console.log(JSON.stringify({report,checks:'wall/jump baseline identity, clipping, pause, reset, pool cap, gentle cap, immediate rebound passed'},null,2));
for(const severity of [0,.0315105,.19,.42]) { const a=createSurfaceAsh(), b=baseline();const event={type:'land',platformId:p.id,x:140,y:500,landingSeverity:severity,intensity:1};a.emit([event]);b.emit([event]);for(let i=0;i<60;i++){a.update(g,1/120);b.update(g,1/120);const clean=state=>({...state,contacts:state.contacts.map(({slam,...c})=>c)});assert.deepEqual(clean(a.state),clean(b.state));}}
for(const gentle of [false,true]){const a=createSurfaceAsh(),b=baseline();const event={type:'land',platformId:p.id,x:140,y:500,landingSeverity:1};a.emit([event]);b.emit([event]);a.update(g,.18,gentle);b.update(g,.18,gentle);const c=a.state.contacts[0],old=b.state.contacts[0];if(gentle){assert.deepEqual(c.shards,old.shards);}else {assert.equal(c.slam,1);assert(Math.min(...c.shards.map(s=>s.y))<Math.min(...old.shards.map(s=>s.y))-30);assert(Math.max(...c.shards.map(s=>s.size))>Math.max(...old.shards.map(s=>s.size))*2);}}
console.log('Medium severity0–.42 identical to18; maxslam chunks >2x radius with >30px additional rise; Gentle motion identical; existing fixed pools retained.');
for(const withAtlas of [false,true]) {
 let draws=0;
 const ctx=new Proxy({}, {get(t,k){if(k==='drawImage')return()=>draws++;if(typeof t[k]==='number')return t[k];return()=>{};},set(t,k,v){t[k]=v;return true;}});
 const a=createSurfaceAsh(withAtlas?{'ash-flow-atlas':{complete:true,width:384,height:256}}:{});
 a.emit([{type:'land',platformId:p.id,x:140,y:500,landingSeverity:1}]);a.update(g,.10);a.draw(ctx,g);
 assert.equal(draws,withAtlas?18:0);draws=0;a.update(g,.15);a.draw(ctx,g);assert.equal(draws,0);
}
console.log('Porous material: at most18texture draws per fullslam at100ms; zero at250ms; missing-atlas fallback draws without error.');

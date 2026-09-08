import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js',import.meta.url),'utf8');
const start=app.indexOf('  const writingPartialCoverageMarkup =');
const end=app.indexOf('  const writingCoverageMarkup =',start);
assert.ok(start>=0&&end>start);
const renderer=app.slice(start,end);

function fixture(){
  const groups=[{id:'storytelling',name:'Storytelling',short:'STORY',weight:0.5,color:'#a00'},{id:'dungeon-master',name:'Dungeon Master',short:'DM',weight:0.5,color:'#00a'}];
  const pairs=[['z','Zulu',null,90],['a','Alpha',80,null],['missing','Missing',null,null],['complete','Complete',80,90],['zero','Zero',0,null]];
  return {categories:groups,entries:pairs.flatMap(([id,label,story,dm])=>['baseline','skill'].map(condition=>({id:id+'-'+condition,settingId:id,label,family:label,reasoning:'ultra',condition,exactScore:story!==null&&dm!==null?(story+dm)/2:null,categories:groups.map((group,index)=>{const score=[story,dm][index];return {category:group.id,weight:0.5,score,exactScore:score,exactContribution:score===null?null:score*0.5};})})))};
}

function render(data,isWriting=true){
  const context={data,isWriting,TREATMENT_CONDITION_ID:'skill',SCORE_MAXIMUM:100,baselineBySetting:new Map(data.entries.filter(entry=>entry.condition==='baseline').map(entry=>[entry.settingId,entry])),conditionById:new Map([['baseline',{label:'Plain answer'}],['skill',{label:'Task-specific skill'}]]),selectedEntry:()=>data.entries[0],conditionVisualClass:id=>id==='baseline'?'baseline':'full',escapeHtml:value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),formatScore:value=>Number.isFinite(value)?value.toFixed(1):'—',formatWeight:value=>(value*100)+'%',COMPOSITE_SCORE_SCALE:value=>Math.max(0,Math.min(100,value))};
  return vm.runInNewContext(renderer+'\nwritingPartialCoverageMarkup();',context);
}

test('partial rows are separate unranked alphabetic evidence, not available-only totals',()=>{
  const data=fixture(),before=JSON.stringify(data),markup=render(data);
  assert.deepEqual([...markup.matchAll(/data-writing-partial-setting="([^"]+)"/gu)].map(match=>match[1]),['a','zero','z']);
  assert.match(markup,/Partial coverage — not ranked/u);
  assert.match(markup,/unavailable—not zero/u);
  assert.doesNotMatch(markup,/id="result-list"/u);
  assert.equal([...markup.matchAll(/data-baseline-score="" data-full-score="" data-baseline-rank="" data-full-rank="" data-delta=""/gu)].length,3);
  assert.equal([...markup.matchAll(/data-writing-partial-total>—/gu)].length,6);
  assert.equal(JSON.stringify(data),before,'Rendering must not mutate index scores or raw group readings.');
});

test('known fills retain fixed group capacity, unknown slots are not numeric zero',()=>{
  const markup=render(fixture());
  assert.equal([...markup.matchAll(/--segment-width:50\.000000%/gu)].length,12);
  assert.equal([...markup.matchAll(/data-writing-partial-availability="known"/gu)].length,6);
  assert.equal([...markup.matchAll(/data-writing-partial-availability="unavailable" data-weight="0.5" data-raw-score="" data-raw-exact-score="" data-contribution=""/gu)].length,6);
  assert.match(markup,/data-raw-score="80.0" data-raw-exact-score="80" data-contribution="40"/u);
  assert.match(markup,/data-raw-score="0.0" data-raw-exact-score="0" data-contribution="0"/u,'A genuinely measured zero remains known evidence.');
  assert.equal([...markup.matchAll(/class="writing-partial__fill"/gu)].length,6);
  assert.match(markup,/style="width:0.000000%"/u);
  assert.equal([...markup.matchAll(/data-writing-group-id=/gu)].length,12);
  assert.doesNotMatch(markup,/\sdisabled(?:\s|>)/u,'Missing groups must remain navigable to their benchmark evidence.');
});

test('partial rendering leaves completed and entirely missing configurations out of the partial list',()=>{
  const data=fixture();
  data.entries=data.entries.filter(entry=>['complete','missing'].includes(entry.settingId));
  assert.equal(render(data),'');
  assert.equal(render(fixture(),false),'');
});

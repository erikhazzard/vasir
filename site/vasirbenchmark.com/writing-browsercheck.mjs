#!/usr/bin/env node

// Browser evidence uses the actual selected projection, never synthetic scores or answers.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, argument, index, all) => {
  if (argument.startsWith('--')) pairs.push([argument.slice(2), all[index + 1]]);
  return pairs;
}, []));
assert.ok(options.url && options['output-dir'], 'Usage: writing-browsercheck.mjs --url URL --output-dir PATH [--width 1440 --height 1000] [--require-scored]');
const requireScored = Object.hasOwn(options, 'require-scored');
const requestedBenchmark = options.benchmark ?? null;
const creationBenchmarkId = 'storytelling-magic-discovery';
const isCreation = requestedBenchmark === creationBenchmarkId;
const writingArchiveRequest = request => /\/writing-(?:creation-)?responses\.js$/.test(new URL(request.url).pathname);
const baseUrl = new URL(options.url);
assert.ok(baseUrl.protocol === 'https:' || (baseUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(baseUrl.hostname)), 'Use HTTPS or a local HTTP server.');
const width = Number(options.width || 1440);
const height = Number(options.height || 1000);
assert.ok(Number.isInteger(width) && width >= 320 && Number.isInteger(height) && height >= 400);
const output = path.resolve(options['output-dir']);
fs.mkdirSync(output, { recursive: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const harnessSha256 = sha256(fs.readFileSync(fileURLToPath(import.meta.url)));
const chromePath = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(file => fs.existsSync(file));
assert.ok(chromePath, 'Chrome must be installed or CHROME_BIN set.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-writing-browsercheck-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const deadline = Date.now() + 180000;
const checks = [];
const screenshots = [];
const failureScreenshots = [];
const progressEvidence = [];
const errors = [];
const requests = [];
const responses = new Map();
const loadedFilePromises = [];
const pending = new Map();
let socket;
let nextId = 1;
let coverage;
let overallSha256;

async function waitFor(check, label, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout && Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

const check = (name, condition, detail) => {
  assert.ok(condition, `${name}${detail ? `: ${detail}` : ''}`);
  checks.push(name);
};
const click = selector => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw Error('Control missing'); element.scrollIntoView({block:'center',behavior:'instant'}); element.click(); })()`);
const pageUrl = (name, fragment = '') => {
  const url = new URL(name, baseUrl);
  if (requestedBenchmark) url.searchParams.set('writing', requestedBenchmark);
  url.hash = fragment;
  return url.href;
};
const navigate = async (url, predicate) => {
  await send('Page.navigate', { url });
  await waitFor(() => evaluate(`document.readyState === 'complete' && (${predicate})`).catch(() => false), url);
  await evaluate('document.fonts.ready');
};
const capture = async (name, collection = screenshots, evidence = {}) => {
  // Capture the settled interface, not a transient navigation fade. Infinite
  // decorative animations must never hold the evidence run open.
  await evaluate(`(async () => {
    await document.fonts.ready;
    const finite=document.getAnimations().filter(animation=>{
      const timing=animation.effect?.getComputedTiming();
      return animation.playState==='running'&&Number.isFinite(timing?.endTime)&&timing.endTime<=2000;
    });
    await Promise.race([Promise.allSettled(finite.map(animation=>animation.finished)),new Promise(resolve=>setTimeout(resolve,2000))]);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  })()`);
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const bytes = Buffer.from(result.data, 'base64');
  fs.writeFileSync(path.join(output, name), bytes);
  collection.push({ path: name, bytes: bytes.length, sha256: sha256(bytes), width, height, ...evidence });
};
const noOverflow = async name => {
  const result = await evaluate('({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})');
  if (result.scroll > result.viewport + 1) {
    const geometry = await evaluate(`({hash:location.hash,scrollX:window.scrollX,bodyWidth:document.body.clientWidth,openArchives:[...document.querySelectorAll('[data-prompt-file][open]')].map(element=>element.dataset.promptFile),elements:[...document.querySelectorAll('body *')].map(element=>({tag:element.tagName,id:element.id,className:typeof element.className==='string'?element.className:'',right:element.getBoundingClientRect().right+window.scrollX,width:element.getBoundingClientRect().width,clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,overflowX:getComputedStyle(element).overflowX})).filter(element=>element.right>document.documentElement.clientWidth+1||element.scrollWidth>element.clientWidth+1).slice(0,40)})`);
    fs.writeFileSync(path.join(output, 'writing-overflow.json'), JSON.stringify({scope:name,...result,...geometry},null,2)+'\n');
    await capture('writing-overflow.png', failureScreenshots, {scope:name});
  }
  check(`${name}: no horizontal page overflow`, result.scroll <= result.viewport + 1, JSON.stringify(result));
};
const verifyWritingAnswerLinkBounds = async scope => {
  const proof=await evaluate(`(() => {
    const links=[...document.querySelectorAll('.writing-selection a[data-writing-answer-benchmark]')].filter(link=>link.getBoundingClientRect().width>0&&link.getBoundingClientRect().height>0),viewport=document.documentElement.clientWidth,mismatches=[];
    const evidence=links.map(link=>{
      const box=link.getBoundingClientRect(),style=getComputedStyle(link),number=value=>parseFloat(value)||0;
      const bounds={left:box.left+number(style.borderLeftWidth)+number(style.paddingLeft),right:box.right-number(style.borderRightWidth)-number(style.paddingRight),top:box.top+number(style.borderTopWidth)+number(style.paddingTop),bottom:box.bottom-number(style.borderBottomWidth)-number(style.paddingBottom)};
      if(box.left < -1 || box.right > viewport+1)mismatches.push(link.dataset.writingAnswerBenchmark+':card-outside-viewport');
      const fits=rect=>rect.left>=bounds.left-1.5&&rect.right<=bounds.right+1.5&&rect.top>=bounds.top-1.5&&rect.bottom<=bounds.bottom+1.5;
      const children=[...link.children].map(child=>{
        const rect=child.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(child);const textRects=[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
        if(!fits(rect)||textRects.some(rect=>!fits(rect)))mismatches.push(link.dataset.writingAnswerBenchmark+':'+child.tagName+':clipped-content');
        return {tag:child.tagName,text:child.textContent,width:rect.width,lineRects:textRects.length};
      });
      return {benchmarkId:link.dataset.writingAnswerBenchmark,cardWidth:box.width,children};
    });
    return {links:evidence,mismatches};
  })()`);
  check(`Writing ${scope}: answer-card children and actual text lines fit their cards and viewport`,!proof.mismatches.length,JSON.stringify(proof));
  return {scope,...proof};
};
const verifyWritingProgress = async scope => {
  const proof = await evaluate(`(() => {
    const data=window.VASIR_WRITING, coverage=data.coverage, element=document.querySelector('[data-writing-progress]'),creation=data.benchmarks[0].id==='storytelling-magic-discovery';
    const inProgress=typeof coverage.executionComplete==='boolean'?!coverage.executionComplete:coverage.judgmentCount<coverage.expectedJudgmentCount || coverage.completedSettingCount<coverage.settingCount;
    const excluded=coverage.executionStatus==='complete-with-exclusions';
    const expected={answers:coverage.responseCount+'/'+coverage.expectedResponseCount+' final answers',reviews:coverage.judgmentCount+'/'+coverage.expectedJudgmentCount+' planned judge reviews',panels:coverage.scoredResponseCount+'/'+coverage.expectedResponseCount+' complete '+data.scoreBasis.judgeCount+'-judge answer panels'};
    const counts=Object.fromEntries(Object.keys(expected).map(key=>[key,element?.querySelector('[data-writing-progress-count="'+key+'"]')?.textContent]));
    const status=element?.querySelector('[data-writing-progress-status]')?.textContent;
    const disclosure=element?.querySelector('[data-writing-progress-disclosure]')?.textContent || '';
    const failures=data.caseResults.filter(cell=>['error','unavailable'].includes(cell.status)).length;
    const browse=element?.querySelector('[data-writing-browse-answers]');
    const rect=browse?.getBoundingClientRect();
    const mismatches=[];
    if(status!==(excluded?creation?'FINAL SNAPSHOT · INCOMPLETE PANELS RETAINED':'FINAL SNAPSHOT · '+coverage.terminallyExcludedPairCount+' EXCLUDED '+(coverage.terminallyExcludedPairCount===1?'PAIR':'PAIRS'):inProgress?'IN PROGRESS':'COMPLETE SNAPSHOT')) mismatches.push('progress-status');
    if(Object.keys(expected).some(key=>counts[key]!==expected[key])) mismatches.push('progress-counts');
    if(inProgress && !disclosure.includes('Judging incomplete; available answers and reviews are published.')) mismatches.push('incomplete-disclosure');
    if(!disclosure.includes('Incomplete configurations are not ranked.') || !disclosure.includes('Case scores require the full judge panel.')) mismatches.push('ranking-disclosure');
    if(failures && !excluded && !disclosure.includes(failures+' failed generations are retained; planned totals include unavailable slots.')) mismatches.push('failed-slot-disclosure');
    if(excluded && creation) {
      if(inProgress || coverage.pendingGenerationCount!==0 || coverage.pendingJudgmentCount!==0 || coverage.judgmentCount+coverage.terminalJudgmentFailureCount+coverage.terminallyExcludedJudgmentCount!==coverage.expectedJudgmentCount) mismatches.push('creation-terminal-accounting');
      if(!disclosure.includes(coverage.validResponseCount+' valid final answers') || !disclosure.includes(coverage.terminalGenerationFailureCount+' terminal generation failures') || !disclosure.includes(coverage.terminalJudgmentFailureCount+' failed assessments') || !disclosure.includes('No judge reviews are pending.') || !disclosure.includes('Missing scores remain unassigned.')) mismatches.push('creation-terminal-disclosure');
    } else if(excluded) {
      if(inProgress || coverage.pendingGenerationCount!==0 || coverage.pendingJudgmentCount!==0 || coverage.judgmentCount+coverage.terminallyExcludedJudgmentCount!==coverage.expectedJudgmentCount) mismatches.push('terminal-exclusion-accounting');
      if(!disclosure.includes(coverage.validResponseCount+' valid final answers') || !disclosure.includes(coverage.terminalGenerationFailureCount+' failed full-read verifications') || !disclosure.includes(coverage.terminallyExcludedJudgmentCount+' terminally excluded reviews') || !disclosure.includes('No judge reviews are pending.') || disclosure.includes('Judging incomplete')) mismatches.push('terminal-exclusion-disclosure');
      if(data.caseResults.filter(cell=>cell.generationDisposition==='complete').length!==coverage.validResponseCount || data.caseResults.filter(cell=>cell.generationDisposition==='terminal-protocol-failure').length!==coverage.terminalGenerationFailureCount || data.caseResults.filter(cell=>cell.judgingDisposition==='terminal-excluded').reduce((sum,cell)=>sum+cell.coverage.expectedJudgments,0)!==coverage.terminallyExcludedJudgmentCount) mismatches.push('terminal-exclusion-source-counts');
    }
    if(!rect || rect.width<=0 || rect.height<44 || !browse.textContent.includes('Browse answers')) mismatches.push('browse-answers-link');
    if(coverage.responseCount!==data.caseResults.reduce((sum,cell)=>sum+cell.coverage.completedResponses,0) || coverage.judgmentCount!==data.caseResults.reduce((sum,cell)=>sum+cell.coverage.completedJudgments,0) || coverage.scoredResponseCount!==data.caseResults.filter(cell=>Number.isFinite(cell.score)).length) mismatches.push('source-coverage-counts');
    if(location.pathname.endsWith('benchmark-report.html') ? browse?.getAttribute('data-report-section')!=='ranking' : !browse?.href.includes('benchmark-report.html#'+data.benchmarks[0].id)) mismatches.push('browse-answers-destination');
    return {inProgress,status,counts,failedGenerations:failures,browseHref:browse?.href || null,mismatches};
  })()`);
  check(`Writing ${scope}: source-derived progress, planned coverage and direct answer access`, proof.mismatches.length === 0, JSON.stringify(proof));
  progressEvidence.push({scope,...proof});
};
const layout = () => evaluate(`(() => {
  const row = document.querySelector('.setting-row');
  const text = row?.querySelector('.setting-row__model strong');
  const track = row?.querySelector('.capability-composition__track');
  if (!row || !text) return null;
  return {rowHeight:row.getBoundingClientRect().height,font:getComputedStyle(text).font,fontSize:getComputedStyle(text).fontSize,trackWidth:track?.getBoundingClientRect().width};
})()`);

// The explorer is a category index; reports still use their own frozen projection.
const selectedProjectionExpression = `(() => {const root=window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING;return root.additionalBenchmarks?.[${JSON.stringify(requestedBenchmark)}] || root.benchmarkPublications?.find(item=>item.benchmarkId===${JSON.stringify(requestedBenchmark)})?.projection || root;})()`;
const verifyWritingCategory = async () => {
  await navigate(pageUrl('index.html', 'capabilities/overall'), 'document.querySelector("#capability-category-overall[aria-selected=true]") && window.VASIR_DATA?.writing');
  const initial = await evaluate('({overall:JSON.stringify(window.VASIR_DATA.overall),lazy:!!window.VASIR_WRITING,available:!!document.querySelector("#capability-category-writing:not([disabled])")})');
  overallSha256 = sha256(initial.overall);
  check('Writing appears in capability navigation', initial.available);
  check('Overall loads without Writing data or answer bundles', !initial.lazy && !requests.some(request => /\/writing-(?:data|(?:creation-)?responses)\.js$/.test(new URL(request.url).pathname)));
  check('Writing remains excluded from Overall', !JSON.parse(initial.overall).categories.some(category => category.id === 'writing'));
  const overallLayout = await layout();
  await click('#capability-category-writing');
  await waitFor(() => evaluate('window.VASIR_WRITING_CATEGORY && document.querySelector("#capability-category-writing[aria-selected=true]") && document.activeElement?.id === "capability-category-writing"').catch(() => false), 'Category-wide Writing loaded with selector focus');
  const proof = await evaluate(`(() => {
    const root=window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING,data=window.VASIR_WRITING_CATEGORY;
    const publications=[root,...(root.benchmarkPublications || []).map(item=>item.projection),...Object.values(root.additionalBenchmarks || {})].filter((item,index,all)=>item?.benchmarks?.[0] && all.findIndex(other=>other?.benchmarks?.[0]?.id===item.benchmarks[0].id)===index);
    const finitePair=(publication,id)=>['baseline','skill'].every(condition=>Number.isFinite(publication.entries.find(entry=>entry.settingId===id && entry.condition===condition)?.exactScore));
    const active=publications.filter(publication=>publication.settings.some(setting=>finitePair(publication,setting.id)));
    const groupId=publication=>publication.benchmarks[0].trackId || publication.subcategory || 'storytelling';
    const groups=[...new Set(active.map(groupId))];
    const settingIds=[...new Set(publications.flatMap(publication=>publication.settings.map(setting=>setting.id)))];
    const round=value=>value===null?null:Math.round((value+Number.EPSILON)*10)/10;
    const close=(actual,expected)=>expected===null?actual===null:Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8;
    const expected=[]; const mismatches=[];
    // Validate each raw headline against its own declared case matrix first.
    for(const publication of publications) for(const setting of publication.settings) {
      const cases=publication.cohortSummaries?publication.cases.filter(story=>story.cohort==='primary'):publication.cases;
      const ids=new Set(cases.map(story=>story.id));
      const cells=publication.caseResults.filter(cell=>cell.settingId===setting.id&&ids.has(cell.caseId));
      const expectedCells=cases.length*(publication.trialCount || 1)*2;
      const complete=cells.length===expectedCells&&cells.every(cell=>Number.isFinite(cell.exactScore));
      for(const condition of ['baseline','skill']) {
        const arm=cells.filter(cell=>cell.condition===condition),entry=publication.entries.find(entry=>entry.settingId===setting.id&&entry.condition===condition);
        const mean=complete?arm.reduce((sum,cell)=>sum+cell.exactScore,0)/arm.length:null;
        if(!entry||!close(entry.exactScore,mean)||!close(entry.score,round(mean)))mismatches.push('raw-headline:'+publication.benchmarks[0].id+':'+setting.id+':'+condition);
      }
    }
    for(const id of settingIds) {
      const complete=active.length>0&&active.every(publication=>finitePair(publication,id));
      for(const condition of ['baseline','skill']) {
        const mean=complete?groups.reduce((total,group)=>{const members=active.filter(publication=>groupId(publication)===group);return total+members.reduce((sum,publication)=>sum+publication.entries.find(entry=>entry.settingId===id&&entry.condition===condition).exactScore,0)/members.length;},0)/groups.length:null;
        const entry=data.entries.find(entry=>entry.settingId===id&&entry.condition===condition);
        if(!entry||!close(entry.exactScore,mean)||!close(entry.score,round(mean)))mismatches.push('category-headline:'+id+':'+condition);
        for(const [field,sourceField,divisor] of [['latency','meanLatencyMs',1000],['tokens','meanOutputTokens',1]]) {
          const available=complete&&active.every(publication=>Number.isFinite(publication.entries.find(item=>item.settingId===id&&item.condition===condition)?.metrics?.[sourceField]));
          const resource=available?groups.reduce((total,group)=>{const members=active.filter(publication=>groupId(publication)===group);return total+members.reduce((sum,publication)=>sum+publication.entries.find(item=>item.settingId===id&&item.condition===condition).metrics[sourceField],0)/members.length;},0)/groups.length/divisor:null;
          if(!entry||!close(entry[field],resource))mismatches.push('category-resource:'+id+':'+condition+':'+field);
        }
        expected.push({id:entry?.id,settingId:id,condition,exactScore:mean,score:round(mean)});
      }
    }
    const rank=entry=>Number.isFinite(entry.exactScore)?1+expected.filter(other=>other.condition===entry.condition&&Number.isFinite(other.exactScore)&&other.exactScore>entry.exactScore).length:null;
    const rows=[...document.querySelectorAll('#capability-ranking #result-list > .setting-row')];
    const format=value=>Number.isFinite(value)?value.toFixed(1):'—';
    const ordered=rows.map(row=>expected.find(entry=>entry.id===row.dataset.fullEntryId));
    for(const row of rows) {
      const baseline=expected.find(entry=>entry.id===row.dataset.baselineEntryId),skill=expected.find(entry=>entry.id===row.dataset.fullEntryId);
      if(!baseline||!skill){mismatches.push('row-identity');continue;}
      const delta=skill.exactScore===null?null:round(skill.exactScore-baseline.exactScore);
      if(row.dataset.baselineScore!==format(baseline.score)||row.dataset.fullScore!==format(skill.score)||row.dataset.delta!==format(delta))mismatches.push('row-scores:'+skill.settingId);
      if(row.dataset.baselineRank!==String(rank(baseline))||row.dataset.fullRank!==String(rank(skill)))mismatches.push('row-ranks:'+skill.settingId);
      for(const condition of ['baseline','skill']) {
        const entry=expected.find(item=>item.settingId===skill.settingId&&item.condition===condition);
        const bars=[...row.querySelectorAll('[data-condition="'+condition+'"] [data-writing-group-id]')];
        if(entry.exactScore!==null) {
          if(bars.length!==groups.length)mismatches.push('group-segment-count:'+entry.id);
          for(const bar of bars) {
            const members=active.filter(publication=>groupId(publication)===bar.dataset.writingGroupId);
            const mean=members.reduce((sum,publication)=>sum+publication.entries.find(item=>item.settingId===entry.settingId&&item.condition===condition).exactScore,0)/members.length;
            if(Math.abs(Number(bar.dataset.contribution)-mean/groups.length)>1e-6)mismatches.push('segment-contribution:'+entry.id);
          }
        }
      }
    }
    for(let index=1;index<ordered.length;index++)if((ordered[index]?.exactScore??-1)>(ordered[index-1]?.exactScore??-1))mismatches.push('category-order');
    const gaps=[...document.querySelectorAll('[data-writing-coverage-gaps] [data-incomplete-setting-id]')];
    const expectedGaps=expected.filter(entry=>entry.condition==='skill'&&entry.exactScore===null);
    if(JSON.stringify(gaps.map(row=>row.dataset.incompleteSettingId).sort())!==JSON.stringify(expectedGaps.map(entry=>entry.settingId).sort()))mismatches.push('unranked-coverage-inventory');
    for(const gap of gaps)if(!/Score — · rank —/.test(gap.textContent)||!gap.querySelector('.setting-row__select[data-entry-id]'))mismatches.push('unranked-coverage-disclosure');
    if(JSON.stringify([...data.writingCategory.activeBenchmarkIds].sort())!==JSON.stringify(active.map(item=>item.benchmarks[0].id).sort()))mismatches.push('active-cohort');
    const canvas=document.querySelector('.capability-browser__canvas'),header=canvas.querySelector('.capability-canvas__header'),nav=canvas.querySelector('.capability-mode');
    const heading=header?.textContent || '';
    return {overall:JSON.stringify(window.VASIR_DATA.overall),hash:location.hash,rawUnchanged:window.VASIR_WRITING===root,benchmarkIds:publications.map(item=>item.benchmarks[0].id),activeBenchmarkIds:active.map(item=>item.benchmarks[0].id),settingIds,visibleSettingIds:rows.map(row=>row.dataset.settingId),completeSettings:expected.filter(entry=>entry.condition==='skill'&&entry.exactScore!==null).length,unscoredSettings:expected.filter(entry=>entry.condition==='skill'&&entry.exactScore===null).length,tiedRankEntries:expected.filter(entry=>entry.exactScore!==null&&expected.some(other=>other.id!==entry.id&&other.condition===entry.condition&&other.exactScore===entry.exactScore)).length,regressionSettings:expected.filter(entry=>entry.condition==='skill'&&entry.exactScore!==null&&entry.exactScore<expected.find(other=>other.settingId===entry.settingId&&other.condition==='baseline').exactScore).length,groupIds:groups,noPicker:!document.querySelector('.writing-subsections,.writing-benchmark-picker,[data-writing-benchmark-picker]'),tabsImmediatelyAfterHeader:header?.nextElementSibling===nav,answersLazy:!window.VASIR_WRITING_RESPONSES,disclosure:/development|exploratory/i.test(heading)&&/excluded from overall/i.test(heading),mismatches};
  })()`);
  check('Writing uses the category route and preserves raw projections', proof.hash === '#capabilities/writing' && proof.rawUnchanged);
  check('Writing category preserves Overall bytes', sha256(proof.overall) === overallSha256);
  check('Writing modes follow the category header without benchmark or subgroup pickers', proof.tabsImmediatelyAfterHeader && proof.noPicker);
  check('Writing explicitly discloses a development index excluded from Overall', proof.disclosure);
  check('Writing scores, fixed active cohort, paired bars and ranks follow independent source arithmetic', !proof.mismatches.length, JSON.stringify(proof));
  check('Writing answers stay lazy on the category leaderboard', proof.answersLazy);
  const answerLinkBounds=[await verifyWritingAnswerLinkBounds('leaderboard')];
  const partialEvidence=await evaluate(`(() => {
    const root=window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING;
    const publications=[root,...(root.benchmarkPublications || []).map(item=>item.projection),...Object.values(root.additionalBenchmarks || {})];
    const pairComplete=(publication,id)=>['baseline','skill'].every(condition=>Number.isFinite(publication.entries.find(entry=>entry.settingId===id&&entry.condition===condition)?.exactScore));
    const active=publications.filter(publication=>publication.settings.some(setting=>pairComplete(publication,setting.id))),groupId=publication=>publication.benchmarks[0].trackId || publication.subcategory || 'storytelling',groups=[...new Set(active.map(groupId))];
    const settings=[...new Map(publications.flatMap(publication=>publication.settings).map(setting=>[setting.id,setting])).values()];
    const round=value=>Number.isFinite(value)?Math.round((value+Number.EPSILON)*10)/10:null;
    const groupReadings=(id,condition)=>groups.map(group=>{const members=active.filter(publication=>groupId(publication)===group),available=members.every(publication=>pairComplete(publication,id));const exactScore=available?members.reduce((sum,publication)=>sum+publication.entries.find(entry=>entry.settingId===id&&entry.condition===condition).exactScore,0)/members.length:null;return {groupId:group,weight:1/groups.length,rawScore:round(exactScore),exactScore,contribution:available?exactScore/groups.length:null,available};});
    const expected=settings.map(setting=>({settingId:setting.id,label:setting.label,baseline:groupReadings(setting.id,'baseline'),skill:groupReadings(setting.id,'skill'),total:null,rank:null,delta:null})).filter(row=>row.skill.some(reading=>reading.available)&&row.skill.some(reading=>!reading.available)).sort((a,b)=>a.label.localeCompare(b.label)||a.settingId.localeCompare(b.settingId));
    const node=document.querySelector('[data-writing-partial-coverage]'),rows=[...document.querySelectorAll('[data-writing-partial-list] > [data-writing-partial-setting]')],mismatches=[],observed=[];
    if(JSON.stringify(rows.map(row=>row.dataset.writingPartialSetting))!==JSON.stringify(expected.map(row=>row.settingId)))mismatches.push('partial-inventory-and-alphabetical-order');
    if(expected.length&&(!node||!node.textContent.includes('Partial coverage — not ranked')||!node.textContent.includes('unavailable—not zero')||node.closest('#result-list')))mismatches.push('partial-qualification-and-placement');
    const close=(left,right)=>Number.isFinite(left)&&Math.abs(left-right)<1e-8;
    for(const row of rows){
      const source=expected.find(item=>item.settingId===row.dataset.writingPartialSetting),record={settingId:row.dataset.writingPartialSetting,total:null,rank:null,delta:null};
      if(!source){mismatches.push('unknown-partial-setting');continue;}
      if(['baselineScore','fullScore','baselineRank','fullRank','delta'].some(key=>row.dataset[key]!==''))mismatches.push('partial-must-have-no-total-rank-uplift');
      if(row.querySelectorAll('[data-writing-partial-total]').length!==2||[...row.querySelectorAll('[data-writing-partial-total]')].some(total=>total.textContent!=='—')||row.querySelector('[data-writing-partial-uplift] strong')?.textContent!=='—')mismatches.push('visible-partial-null-totals');
      for(const condition of ['baseline','skill']){
        const profile=row.querySelector('[data-writing-partial-condition="'+condition+'"]'),slots=[...profile.querySelectorAll('[data-writing-group-id]')],stack=profile.querySelector('.capability-composition__stack'),stackWidth=stack.getBoundingClientRect().width;
        if(slots.length!==groups.length)mismatches.push('fixed-capacity-group-count');
        record[condition]=slots.map(slot=>{
          const reading=source[condition].find(item=>item.groupId===slot.dataset.writingGroupId),available=slot.dataset.writingPartialAvailability==='known',fill=slot.querySelector('.writing-partial__fill');
          const actual={groupId:slot.dataset.writingGroupId,weight:Number(slot.dataset.weight),rawScore:slot.dataset.rawScore===''?null:Number(slot.dataset.rawScore),exactScore:slot.dataset.rawExactScore===''?null:Number(slot.dataset.rawExactScore),contribution:slot.dataset.contribution===''?null:Number(slot.dataset.contribution),available};
          if(!reading||available!==reading.available||!close(actual.weight,reading.weight)||Math.abs(slot.getBoundingClientRect().width-stackWidth*reading.weight)>1.5)mismatches.push('fixed-capacity-geometry:'+record.settingId+':'+actual.groupId);
          if(available){
            if(!['rawScore','exactScore','contribution'].every(key=>close(actual[key],reading[key]))||!fill||Math.abs(fill.getBoundingClientRect().width-slot.clientWidth*reading.exactScore/100)>1.5)mismatches.push('known-group-source-and-fill:'+record.settingId+':'+actual.groupId);
          }else if(actual.rawScore!==null||actual.exactScore!==null||actual.contribution!==null||fill||!slot.textContent.includes('unavailable')||!getComputedStyle(slot).backgroundImage.includes('repeating-linear-gradient'))mismatches.push('missing-is-hatched-not-zero:'+record.settingId+':'+actual.groupId);
          if(slot.tagName!=='BUTTON'||slot.disabled||slot.dataset.entryId!==record.settingId+'-skill')mismatches.push('partial-group-navigation-control');
          return actual;
        });
      }
      observed.push(record);
    }
    return {settingIds:rows.map(row=>row.dataset.writingPartialSetting),rows:observed,mismatches};
  })()`);
  check('Partial rows preserve fixed subgroup weights, known source contributions and hatched unavailable capacity without totals or ranks',!partialEvidence.mismatches.length,JSON.stringify(partialEvidence));
  const writingLayout=await layout();
  check('Writing paired rows reuse Overall typography', !proof.visibleSettingIds.length || (writingLayout?.font===overallLayout?.font && writingLayout?.fontSize===overallLayout?.fontSize), JSON.stringify({overallLayout,writingLayout}));
  await noOverflow('Writing category leaderboard');
  await capture('writing-models.png');
  await evaluate('document.querySelector("#capability-ranking .score-axis-header")?.scrollIntoView({block:"start",behavior:"instant"})');
  await capture('writing-stacked-rows.png');
  if(partialEvidence.settingIds.length){
    await evaluate('document.querySelector("[data-writing-partial-coverage]").scrollIntoView({block:"start",behavior:"instant"})');
    await noOverflow('Writing partial coverage');
    await capture('writing-partial.png');
    check('Partial group buttons retain roving keyboard navigation',await evaluate(`(() => {const stack=document.querySelector('[data-writing-partial-list] .capability-composition__stack'),buttons=[...stack.querySelectorAll('[data-writing-group-id]')];buttons[0].focus();buttons[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));return document.activeElement===buttons[buttons.length>1?1:0];})()`));
    for(const availability of ['known','unavailable']){
      const selector='[data-writing-partial-list] [data-writing-partial-availability="'+availability+'"]';
      const group=await evaluate(`document.querySelector(${JSON.stringify(selector)}).dataset.writingGroupId`);
      await click(selector);
      check(`Partial ${availability} subgroup opens its own Benchmark tests`,await evaluate(`location.hash==='#capabilities/writing/benchmarks'&&!document.querySelector('#capability-benchmarks').hidden&&!!document.querySelector('[data-writing-track="${group}"]')`));
      await click('[data-capability-mode=models]');
    }
  }
  const expand = await evaluate('!!document.querySelector("#show-all") && document.querySelectorAll("#capability-ranking #result-list > .setting-row").length<window.VASIR_WRITING_CATEGORY.coverage.completedSettingCount');
  if(expand)await click('#show-all');
  check('Every published setting remains inspectable, without ranking coverage gaps', await evaluate(`document.querySelectorAll('#capability-ranking #result-list > .setting-row').length===${proof.completeSettings} && document.querySelectorAll('[data-writing-coverage-gaps] [data-incomplete-setting-id]').length===${proof.unscoredSettings}`));
  const inspectId=await evaluate('document.querySelector("[data-incomplete-setting-id]")?.dataset.incompleteSettingId || document.querySelector("#capability-ranking #result-list > .setting-row")?.dataset.settingId || null');
  if(inspectId){
    await evaluate('(() => {const details=document.querySelector("[data-writing-coverage-gaps]");if(details)details.open=true;})()');
    await click(`#capability-ranking .setting-row__select[data-entry-id="${inspectId}-skill"]`);
    check('Selecting a setting opens every available benchmark answer link with its original case and trial route',await evaluate(`(() => {const id=${JSON.stringify(inspectId)},data=window.VASIR_WRITING_CATEGORY,panel=document.querySelector('#capability-ranking [data-writing-selected-setting]');const publications=data.writingCategory.publications.filter(publication=>publication.settings.some(setting=>setting.id===id));const links=[...panel.querySelectorAll('[data-writing-answer-benchmark]')];return panel.dataset.writingSelectedSetting===id&&links.length===publications.length&&publications.every(publication=>{const link=links.find(link=>link.dataset.writingAnswerBenchmark===publication.benchmarks[0].id),url=link&&new URL(link.href);return url&&url.searchParams.get('setting')===id&&url.hash==='#'+publication.benchmarks[0].id+'/'+publication.cases[0].id+((publication.trialCount || 1)>1?'/trial-1':'');});})()`));
    answerLinkBounds.push(await verifyWritingAnswerLinkBounds('selected setting'));
  }
  const segment=await evaluate('document.querySelector("#capability-ranking [data-writing-group-id]")?.dataset.writingGroupId || null');
  if(segment){await click(`#capability-ranking [data-writing-group-id="${segment}"]`);check('A stacked group segment opens category Benchmark tests',await evaluate('location.hash==="#capabilities/writing/benchmarks" && !document.querySelector("#capability-benchmarks").hidden'));}
  else await click('[data-capability-mode=benchmarks]');
  check('Category Benchmark tests includes every published benchmark with unchanged field means and report links', await evaluate(`(() => {const root=window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING;const publications=[root,...(root.benchmarkPublications || []).map(item=>item.projection),...Object.values(root.additionalBenchmarks || {})];const rows=[...document.querySelectorAll('#capability-benchmarks .benchmark-ledger__row')];const format=value=>Number.isFinite(value)?value.toFixed(1):'—';return rows.length===publications.length&&publications.every(publication=>{const summary=publication.benchmarkSummaries[0],row=rows.find(row=>row.dataset.benchmarkId===summary.benchmarkId);return row&&row.dataset.baselineScore===format(summary.baseline)&&row.dataset.treatmentScore===format(summary.treatment)&&row.href.includes('benchmark-report.html#'+summary.benchmarkId);});})()`));
  await noOverflow('Writing category benchmarks');
  await capture('writing-benchmarks.png');
  const provisionalDisplayEvidence=[];
  const provisionalIds=await evaluate('window.VASIR_WRITING_CATEGORY.writingCategory.publications.filter(publication=>publication.provisionalLeaderboard).map(publication=>publication.benchmarks[0].id)');
  check('Only raw source provisional blocks appear inside Benchmark tests',await evaluate(`JSON.stringify([...document.querySelectorAll('#capability-benchmarks [data-writing-provisional-benchmark]')].map(node=>node.dataset.writingProvisionalBenchmark).sort())===${JSON.stringify(JSON.stringify([...provisionalIds].sort()))}`));
  for(const benchmarkId of provisionalIds){
    const selector=`#capability-benchmarks [data-writing-provisional-benchmark="${benchmarkId}"]`;
    await click(`${selector} > summary`);
    const displayed=await evaluate(`(() => {
      const benchmarkId=${JSON.stringify(benchmarkId)},data=window.VASIR_WRITING_CATEGORY,publication=data.writingCategory.publications.find(item=>item.benchmarks[0].id===benchmarkId),source=publication.provisionalLeaderboard,node=document.querySelector(${JSON.stringify(selector)}),mismatches=[];
      const format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      const rows=[...node.querySelectorAll('[data-writing-provisional-setting]')],eligible=source.entries.filter(entry=>entry.condition==='skill'&&entry.eligibleForRank);
      const diagnostics=[...node.querySelectorAll('[data-writing-provisional-incomplete]')];
      if(!node.open||!node.closest('#capability-benchmarks')||node.previousElementSibling?.dataset.benchmarkId!==benchmarkId)mismatches.push('benchmark-placement');
      const text=node.textContent;
      if(!/provisional/i.test(node.querySelector('summary').textContent)||!text.includes(source.label)||!/single.judge/i.test(text)||!text.includes(String(source.expectedCaseCount))||!/excluded|not included|do not enter|not part|never enter/i.test(text))mismatches.push('qualified-basis');
      if(rows.length!==eligible.length||eligible.length!==source.rankedSettingCount)mismatches.push('ranked-count');
      let previous=Infinity;
      for(const row of rows){
        const id=row.dataset.writingProvisionalSetting,skill=eligible.find(entry=>entry.settingId===id),baseline=source.entries.find(entry=>entry.settingId===id&&entry.condition==='baseline');
        if(!skill||!baseline){mismatches.push('row-identity');continue;}
        if(row.dataset.baselineScore!==format(baseline.score)||row.dataset.fullScore!==format(skill.score)||row.dataset.delta!==format(skill.delta)||row.dataset.baselineRank!==String(baseline.rank)||row.dataset.fullRank!==String(skill.rank))mismatches.push('row-readings:'+id);
        if(skill.exactScore>previous)mismatches.push('exact-score-order');previous=skill.exactScore;
        const link=row.querySelector('a[href*="benchmark-report.html"]'),url=link&&new URL(link.href);
        if(!url||url.searchParams.get('setting')!==id||!url.hash.startsWith('#'+benchmarkId))mismatches.push('direct-original-report:'+id);
      }
      if(JSON.stringify(diagnostics.map(row=>row.dataset.writingProvisionalIncomplete).sort())!==JSON.stringify(source.incompleteSettings.map(item=>item.settingId).sort()))mismatches.push('incomplete-inventory');
      for(const row of diagnostics){
        const diagnostic=source.incompleteSettings.find(item=>item.settingId===row.dataset.writingProvisionalIncomplete);
        if(row.hasAttribute('data-writing-provisional-setting')||!/(unranked|no rank|rank —|not ranked)/i.test(row.textContent)||row.dataset.baselineRank!==''||row.dataset.fullRank!=='')mismatches.push('incomplete-rank');
        if(!diagnostic||row.dataset.baselineScore!==format(diagnostic.scores.baseline)||row.dataset.fullScore!==format(diagnostic.scores.skill)||row.dataset.delta!==format(diagnostic.delta)||!row.textContent.includes(diagnostic.completedPairCount+'/'+diagnostic.expectedPairCount))mismatches.push('incomplete-diagnostic-readings');
      }
      for(const key of ['baseline','treatment','delta'])if(!node.querySelector('summary').textContent.includes(format(source.summary[key])))mismatches.push('summary-'+key);
      return {benchmarkId,judgeConfigurationIds:source.judgeConfigurationIds,rankedSettings:rows.length,incompleteSettings:diagnostics.length,sourceSha256:source.sourceSha256,activeBenchmarkIds:data.writingCategory.activeBenchmarkIds,mismatches};
    })()`);
    check(`Provisional ${benchmarkId}: separate qualified rows, exact published scores, ranks and unranked gaps`,!displayed.mismatches.length,JSON.stringify(displayed));
    check('Opening provisional evidence never changes the primary category cohort',JSON.stringify(displayed.activeBenchmarkIds)===JSON.stringify(proof.activeBenchmarkIds));
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'start',behavior:'instant'})`);
    await noOverflow('Writing provisional results');
    await capture(provisionalDisplayEvidence.length?`writing-provisional-${benchmarkId}.png`:'writing-provisional.png');
    await click(`${selector} > summary`);
    provisionalDisplayEvidence.push(displayed);
  }
  await click('[data-capability-mode=efficiency]');
  await waitFor(()=>evaluate('!document.querySelector("#capability-efficiency").hidden && !!document.querySelector("#efficiency-view").textContent'),'Writing category efficiency');
  const efficiencyEvidence=[];
  for(const metric of ['latency','tokens']){
    await evaluate(`(() => {const axis=document.querySelector('#resource-axis');axis.value=${JSON.stringify(metric)};axis.dispatchEvent(new Event('change',{bubbles:true}));const entry=window.VASIR_WRITING_CATEGORY.entries.find(entry=>Number.isFinite(entry.score)&&Number.isFinite(entry[${JSON.stringify(metric)}])&&entry[${JSON.stringify(metric)}]>0);if(entry){const select=document.querySelector('#efficiency-entry');select.value=entry.id;select.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
    const efficiency=await evaluate(`(() => {const metric=${JSON.stringify(metric)},data=window.VASIR_WRITING_CATEGORY,eligible=data.entries.filter(entry=>Number.isFinite(entry.score)&&Number.isFinite(entry[metric])&&entry[metric]>0),frontier=eligible.filter(entry=>!eligible.some(other=>other.score>=entry.score&&other[metric]<=entry[metric]&&(other.score>entry.score||other[metric]<entry[metric]))),points=[...document.querySelectorAll('[data-plot-point]')],mismatches=[];if(points.length!==eligible.length)mismatches.push('point-count');for(const point of points){const entry=eligible.find(entry=>entry.id===point.dataset.entryId);if(!entry||point.dataset.score!==entry.score.toFixed(1)||Number(point.dataset.resource)!==entry[metric]||point.dataset.frontier!==String(frontier.some(other=>other.id===entry.id)))mismatches.push('point-evidence');if(!['plotX','plotY'].every(key=>Number.isFinite(Number(point.dataset[key]))&&Number(point.dataset[key])>=0&&Number(point.dataset[key])<=100))mismatches.push('point-geometry');}return {metric,eligiblePoints:eligible.length,frontierPoints:frontier.length,mismatches};})()`);
    check(`Category ${metric} efficiency shows only complete finite scores and recorded resources`,!efficiency.mismatches.length,JSON.stringify(efficiency));
    efficiencyEvidence.push(efficiency);
    answerLinkBounds.push(await verifyWritingAnswerLinkBounds(metric+' efficiency'));
    await noOverflow(`Writing category ${metric} efficiency`);
    await capture(metric==='latency'?'writing-efficiency.png':'writing-efficiency-tokens.png');
  }
  // Bookmarked subsection URLs and the old query still reach the same category.
  for(const alias of ['capabilities/writing/storytelling/benchmarks','capabilities/writing/dungeon-master/benchmarks']){
    await navigate(pageUrl('index.html',alias),'window.VASIR_WRITING_CATEGORY && document.querySelector("#capability-benchmarks:not([hidden])")');
    check(`Legacy ${alias} preserves the full category`,await evaluate(`location.hash==='#capabilities/writing/benchmarks' && JSON.stringify(window.VASIR_WRITING_CATEGORY.benchmarks.map(item=>item.id).sort())===${JSON.stringify(JSON.stringify([...proof.benchmarkIds].sort()))}`));
  }
  check('Writing landing routes never download either answer archive', !requests.some(writingArchiveRequest));
  return {...proof,partialEvidence,answerLinkBounds,efficiencyEvidence,provisionalDisplayEvidence};
};

// Check the single fixed judge against the actual answer archive, after reports
// have legitimately loaded it. This never loads answers into the category page.
const verifyProvisionalArchive = async () => {
  const proof=await evaluate(`(() => {
    const root=window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING,archiveRoot=window.VASIR_WRITING_RESPONSES_COLLECTION || window.VASIR_WRITING_RESPONSES;
    const publications=[root,...(root.benchmarkPublications || []).map(item=>item.projection),...Object.values(root.additionalBenchmarks || {})].filter(item=>item.provisionalLeaderboard);
    const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null,round=value=>Number.isFinite(value)?Math.round((value+Number.EPSILON)*10)/10:null,close=(left,right)=>right===null?left===null:Number.isFinite(left)&&Math.abs(left-right)<1e-8;
    return publications.map(publication=>{
      const source=publication.provisionalLeaderboard,id=publication.benchmarks[0].id,archive=archiveRoot.additionalBenchmarks?.[id]||archiveRoot.benchmarkResponses?.find(item=>item.benchmarkId===id)?.responseBundle||archiveRoot,mismatches=[];
      if(source.judgeCount!==1||JSON.stringify(source.judgeConfigurationIds)!==JSON.stringify(['codex:gpt-6-astra@xhigh']))mismatches.push('fixed-judge-basis');
      if(source.sourceSha256!==publication.scoreBasis.sourceSha256||JSON.stringify(source.caseIds)!==JSON.stringify(publication.cases.map(story=>story.id)))mismatches.push('source-and-corpus');
      const judgeId=source.judgeConfigurationIds[0],answerMap=new Map(archive.responses.map(answer=>[answer.settingId+'|'+answer.caseId+'|'+answer.condition,answer]));
      let reviewedAnswers=0;
      const cohorts=publication.settings.map(setting=>{
        const pairs=publication.cases.map(story=>{const values={caseId:story.id};for(const condition of ['baseline','skill']){const answer=answerMap.get(setting.id+'|'+story.id+'|'+condition),judgments=answer?.judgments.filter(judge=>judge.judgeConfigurationId===judgeId)||[];if(judgments.length>1)mismatches.push('duplicate-fixed-review');const judge=judgments[0];values[condition]=judge?.score??null;if(judge){reviewedAnswers++;const calculated=publication.scoreBasis.dimensions.reduce((sum,dimension)=>sum+judge.dimensions[dimension.id].rating,0);if(!close(judge.score,calculated))mismatches.push('original-rating-total');}}return values;}).filter(pair=>Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill));
        return {settingId:setting.id,pairs,complete:pairs.length===publication.cases.length,baseline:mean(pairs.map(pair=>pair.baseline)),skill:mean(pairs.map(pair=>pair.skill)),delta:mean(pairs.map(pair=>pair.skill-pair.baseline))};
      });
      const eligible=cohorts.filter(cohort=>cohort.complete);
      for(const cohort of cohorts)for(const condition of ['baseline','skill']){
        const entry=source.entries.find(item=>item.settingId===cohort.settingId&&item.condition===condition),score=cohort.complete?cohort[condition]:null,delta=cohort.complete?condition==='skill'?cohort.delta:0:null,rank=cohort.complete?1+eligible.filter(other=>other[condition]>score).length:null;
        if(!entry||!close(entry.exactScore,score)||!close(entry.score,round(score))||!close(entry.exactDelta,delta)||!close(entry.delta,round(delta))||entry.rank!==rank||entry.eligibleForRank!==cohort.complete||entry.completedPairCount!==cohort.pairs.length)mismatches.push('fixed-review-cohort:'+cohort.settingId+':'+condition);
      }
      for(const diagnostic of source.incompleteSettings){const cohort=cohorts.find(item=>item.settingId===diagnostic.settingId),missing=publication.cases.map(story=>story.id).filter(caseId=>!cohort.pairs.some(pair=>pair.caseId===caseId));if(cohort.complete||JSON.stringify(diagnostic.missingCaseIds)!==JSON.stringify(missing)||!close(diagnostic.exactScores.baseline,cohort.baseline)||!close(diagnostic.exactScores.skill,cohort.skill)||!close(diagnostic.exactDelta,cohort.delta))mismatches.push('unranked-diagnostic:'+diagnostic.settingId);}
      const expectedSummary={exactBaseline:mean(eligible.map(cohort=>cohort.baseline)),exactTreatment:mean(eligible.map(cohort=>cohort.skill)),exactDelta:mean(eligible.map(cohort=>cohort.delta))};
      for(const [key,value] of Object.entries(expectedSummary))if(!close(source.summary[key],value))mismatches.push('field-mean:'+key);
      if(source.rankedSettingCount!==eligible.length||source.incompleteSettings.length!==cohorts.length-eligible.length)mismatches.push('corpus-count');
      return {benchmarkId:id,judgeConfigurationId:judgeId,sourceSha256:source.sourceSha256,reviewedAnswers,rankedSettings:eligible.length,incompleteSettings:cohorts.length-eligible.length,mismatches};
    });
  })()`);
  for(const result of proof)check(`Provisional ${result.benchmarkId}: original fixed-judge reviews independently reproduce complete-corpus means, ranks and diagnostics`,!result.mismatches.length,JSON.stringify(result));
  return proof;
};

const verifyCreationArchiveAndContexts = async () => {
  const proof = await evaluate(`(async () => {
    const data=window.VASIR_WRITING,archive=window.VASIR_WRITING_RESPONSES,mismatches=[];
    const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),mean=values=>values.length&&values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0)/values.length:null;
    const close=(a,b)=>b===null?a===null:Number.isFinite(a)&&Math.abs(a-b)<1e-8,format=value=>Number.isFinite(value)?value.toFixed(1):'—',signed=value=>Number.isFinite(value)?(value>0?'+':'')+value.toFixed(1):'—';
    const seats=['astra-xhigh-naive','astra-xhigh-informed','sol-xhigh-naive','sol-xhigh-informed'],models=['codex:gpt-6-astra@xhigh','codex:gpt-5.6-sol@xhigh'];
    const files=['SKILL.md','references/core-model.md','references/story-development.md','references/plot-and-structure.md','references/characters.md','references/character-arcs.md','references/relationships-and-cast.md','references/world-and-myth.md','references/antagonism-and-irony.md'];
    const profiles=archive.judgeProfiles||[],context=archive.promptFiles.find(file=>file.id==='frozen-informed-judge-context');
    if(data.benchmarks[0].id!=='storytelling-magic-discovery'||data.trialCount!==3||data.settings.length!==33||data.cases.length!==1||data.scoreBasis.judgeCount!==4||data.scoreBasis.dimensions.length!==10||data.scoreBasis.ratingMinimum!==1||data.scoreBasis.ratingMaximum!==10||data.coverage.expectedResponseCount!==198||data.coverage.expectedJudgmentCount!==792)mismatches.push('creation-inventory');
    if(!same(profiles.map(profile=>profile.id),seats)||new Set(profiles.map(profile=>profile.id)).size!==4||new Set(profiles.map(profile=>profile.configurationId)).size!==2||!same(profiles,data.scoreBasis.reviewers)||!same(profiles,data.methodology.judgeProfiles))mismatches.push('four-frozen-profiles');
    if(!context||!same(data.methodology.informedSkillFiles,files))throw Error('Frozen informed context is missing or its file inventory changed.');
    const contextSha256=await hash(context.content),emptySha256=await hash('');
    if(context.sha256!==contextSha256)mismatches.push('context-content-hash');
    const reconstructedContext=[];
    for(const name of files){
      const prefix='<<<FROZEN_CONTEXT_FILE '+JSON.stringify(name)+'>>>\\n',start=context.content.indexOf(prefix),end=context.content.indexOf('\\n<<<END_FROZEN_CONTEXT_FILE>>>',start+prefix.length),source=data.methodology.skillFiles.find(file=>file.path===name);
      if(start<0||end<0||!source){mismatches.push('context-file:'+name);continue;}
      const contents=context.content.slice(start+prefix.length,end);
      if(await hash(contents)!==source.sha256||new TextEncoder().encode(contents).length!==source.bytes)mismatches.push('context-frozen-bytes:'+name);
      reconstructedContext.push(prefix+contents+'\\n<<<END_FROZEN_CONTEXT_FILE>>>');
    }
    if(reconstructedContext.join('\\n\\n')!==context.content)mismatches.push('context-file-order');
    for(const [index,profile] of profiles.entries())if(profile.configurationId!==models[Math.floor(index/2)]||profile.reasoning!=='xhigh'||profile.contextMode!==(index%2?'informed':'naive')||profile.contextSha256!==(index%2?contextSha256:emptySha256)||profile.contextFileId!==(index%2?'frozen-informed-judge-context':null))mismatches.push('profile-context:'+profile.id);
    const requests=new Map((archive.judgeRequests||[]).map(request=>[request.id,request])),segments=new Map((archive.judgePromptSegments||[]).map(segment=>[segment.sha256,segment.content])),answers=new Map(archive.responses.filter(answer=>answer.provenance?.outputSha256).map(answer=>[answer.provenance.outputSha256,answer.outputText])),finals=new Map();
    if(requests.size!==archive.judgeRequests.length||requests.size>396)mismatches.push('judge-request-inventory');
    for(const [digest,content] of segments)if(await hash(content)!==digest)mismatches.push('prompt-segment-hash');
    for(const [digest,content] of answers)if(await hash(content)!==digest)mismatches.push('answer-content-hash');
    for(const request of requests.values()){
      const profile=profiles.find(profile=>profile.id===request.profileId),parts=request.promptParts?.map(part=>part.textSha256?segments.get(part.textSha256):part.encoding==='json-string'&&answers.has(part.outputSha256)?JSON.stringify(answers.get(part.outputSha256)):null);
      if(!profile||!parts||parts.some(part=>typeof part!=='string')){mismatches.push('request-prompt-parts');continue;}
      const prompt=parts.join('');
      if(await hash(prompt)!==request.promptSha256)mismatches.push('original-prompt-hash');
      const hasContext=prompt.includes('\\n\\nFROZEN CRAFT CONTEXT\\n'+context.content+'\\nEND FROZEN CRAFT CONTEXT.');
      if(hasContext!==(profile.contextMode==='informed'))mismatches.push('request-context-exposure');
      if(request.candidateOrder.length!==2||!same(request.candidateOrder.map(candidate=>candidate.candidateId),['A','B']))mismatches.push('anonymous-candidate-order');
      if(typeof request.outputText==='string'&&await hash(request.outputText)!==request.outputSha256)mismatches.push('original-review-hash');
      if(request.status==='complete'){try{finals.set(request.id,JSON.parse(request.outputText));}catch{mismatches.push('original-review-json');}}
    }
    for(const answer of archive.responses){
      const ids=answer.judgments.map(judge=>judge.reviewerId);
      if(new Set(ids).size!==ids.length||ids.some(id=>!seats.includes(id))||(Number.isFinite(answer.score)&&ids.length!==4))mismatches.push('answer-reviewer-inventory');
      for(const judge of answer.judgments){
        const request=requests.get(judge.requestId),raw=finals.get(judge.requestId)?.evaluations?.find(item=>item.candidateId===judge.candidateId),profile=profiles.find(profile=>profile.id===judge.reviewerId);
        if(!request||!raw||!profile||request.profileId!==profile.id||judge.judgeConfigurationId!==profile.configurationId||judge.contextMode!==profile.contextMode||raw.review!==judge.rationale||raw.dimensions.length!==10||new Set(raw.dimensions.map(item=>item.id)).size!==10){mismatches.push('original-review-identity');continue;}
        let total=0;
        for(const dimension of data.scoreBasis.dimensions){const original=raw.dimensions.find(item=>item.id===dimension.id),reading=judge.dimensions[dimension.id];if(!original||!Number.isInteger(original.rating)||original.rating<1||original.rating>10||reading.rating!==original.rating||reading.evidence!==original.evidence)mismatches.push('original-rating-evidence');total+=original?.rating||0;}
        if(!close(judge.score,total))mismatches.push('original-rating-total');
      }
    }
    const contextRows=[...document.querySelectorAll('[data-creation-setting]')];
    if(contextRows.length!==data.settings.length||!document.querySelector('[data-creation-context-comparison]')?.textContent.includes('four fresh review seats'))mismatches.push('visible-context-inventory');
    for(const setting of data.settings){
      const cells=data.caseResults.filter(cell=>cell.settingId===setting.id),complete=cells.length===6&&cells.every(cell=>Number.isFinite(cell.exactScore)),row=contextRows.find(row=>row.dataset.creationSetting===setting.id);
      if(!row||setting.eligibleForRank!==complete){mismatches.push('context-eligible-setting');continue;}
      for(const mode of ['balanced','naive','informed']){
        const score=condition=>complete?mean(cells.filter(cell=>cell.condition===condition).map(cell=>{
          const answer=archive.responses.find(answer=>answer.settingId===setting.id&&answer.trialNumber===cell.trialNumber&&answer.condition===condition);
          const reviews=answer.judgments.filter(judge=>mode==='balanced'||judge.contextMode===mode);
          return reviews.length===(mode==='balanced'?4:2)?mean(reviews.map(judge=>judge.score)):null;
        })):null;
        const plain=score('baseline'),skill=score('skill'),delta=plain===null||skill===null?null:skill-plain;
        for(const [condition,value] of [['baseline',plain],['skill',skill],['delta',delta]])if(row.querySelector('[data-creation-context="'+mode+'"][data-context-score="'+condition+'"]')?.textContent!==(condition==='delta'?signed(value):format(value)))mismatches.push('visible-context-mean:'+setting.id+':'+mode+':'+condition);
      }
      const effect=data.trialEffects.find(effect=>effect.settingId===setting.id),values=[1,2,3].map(trial=>{const pair=cells.filter(cell=>cell.trialNumber===trial),plain=pair.find(cell=>cell.condition==='baseline')?.exactScore,skill=pair.find(cell=>cell.condition==='skill')?.exactScore;return Number.isFinite(plain)&&Number.isFinite(skill)?skill-plain:null;}),average=mean(values),sd=average===null?null:Math.sqrt(values.reduce((sum,value)=>sum+(value-average)**2,0)/2),range=average===null?null:Math.max(...values)-Math.min(...values);
      if(!close(effect?.mean,average)||!close(effect?.sampleStandardDeviation,sd)||!close(effect?.range,range))mismatches.push('trial-variation-source');
      for(const [index,value] of values.entries())if(row.querySelector('[data-creation-trial-delta="'+(index+1)+'"]')?.textContent!==signed(value))mismatches.push('visible-trial-delta');
      if(row.querySelector('[data-creation-trial-mean]')?.textContent!==signed(average)||row.querySelector('[data-creation-trial-sd]')?.textContent!==format(sd)||row.querySelector('[data-creation-trial-range]')?.textContent!==format(range)+' · '+signed(average===null?null:Math.min(...values))+' to '+signed(average===null?null:Math.max(...values)))mismatches.push('visible-trial-variation');
    }
    return {profiles:profiles.map(({id,configurationId,contextMode,contextSha256})=>({id,configurationId,contextMode,contextSha256})),contextSha256,contextBytes:new TextEncoder().encode(context.content).length,contextFileCount:files.length,verifiedRequestCount:requests.size,verifiedOriginalFinals:finals.size,contextRows:contextRows.length,mismatches};
  })()`);
  check('Creation: four frozen fresh-context seats, exact context bytes, original requests and visible three-trial means',!proof.mismatches.length,JSON.stringify(proof));
  return proof;
};

const verifyCreationExpandedReviews = async (caseId, trialNumber) => {
  const proof=await evaluate(`(async () => {
    const archive=window.VASIR_WRITING_RESPONSES,caseId=${JSON.stringify(caseId)},trial=${trialNumber},mismatches=[],expanded=[];
    const settle=()=>new Promise(resolve=>setTimeout(resolve,0)),hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    for(const profile of archive.judgeProfiles){
      const answer=archive.responses.find(answer=>answer.caseId===caseId&&answer.trialNumber===trial&&answer.judgments.some(judge=>judge.reviewerId===profile.id));
      if(!answer)continue;
      const judge=answer.judgments.find(judge=>judge.reviewerId===profile.id),request=archive.judgeRequests.find(request=>request.id===judge.requestId),row=document.querySelector('[data-report-setting-id="'+answer.settingId+'"]'),panel=row?.querySelector('[data-condition="'+answer.condition+'"]'),review=panel?.querySelector('[data-reviewer-id="'+profile.id+'"]'),details=review?.querySelector('[data-creation-judge-evidence]');
      if(!details||details.dataset.creationJudgeEvidence!==request.id||review.querySelector('[data-judge-context]')?.dataset.judgeContext!==profile.contextMode){mismatches.push('expand-review-identity');continue;}
      row.querySelector('.model-run').open=true;panel.querySelector('.model-run__judging').open=true;details.open=true;await settle();
      const original=details.querySelector('[data-creation-original-review]')?.textContent;
      if(original!==request.outputText||await hash(original||'')!==request.outputSha256)mismatches.push('expanded-original-review');
      const promptDetails=details.querySelector('[data-creation-judge-prompt]');
      if(!promptDetails){mismatches.push('expand-prompt-control');continue;}
      promptDetails.open=true;await settle();
      const prompt=promptDetails.querySelector('[data-creation-original-prompt]')?.textContent,parts=request.promptParts.map(part=>part.textSha256?archive.judgePromptSegments.find(segment=>segment.sha256===part.textSha256)?.content:part.encoding==='json-string'?JSON.stringify(archive.responses.find(response=>response.provenance?.outputSha256===part.outputSha256)?.outputText):null);
      if(parts.some(part=>typeof part!=='string')||prompt!==parts.join('')||await hash(prompt||'')!==request.promptSha256)mismatches.push('expanded-original-prompt');
      const rect=element=>{const box=element.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height};};
      const elementGeometry=element=>{const style=getComputedStyle(element);return {tag:element.tagName,id:element.id,className:typeof element.className==='string'?element.className:'',rect:rect(element),clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,display:style.display,visibility:style.visibility,overflowX:style.overflowX,minWidth:style.minWidth,whiteSpace:style.whiteSpace,wordBreak:style.wordBreak,hidden:element.hidden,open:element.tagName==='DETAILS'?element.open:null};};
      const detailsRect=rect(details),promptRect=rect(promptDetails),viewportWidth=document.documentElement.clientWidth,pageScrollWidth=document.documentElement.scrollWidth;
      const failureFlags={evidenceClosed:!details.open,promptClosed:!promptDetails.open,evidenceZeroWidth:detailsRect.width<=0,promptZeroHeight:promptRect.height<=0,pageOverflow:pageScrollWidth>viewportWidth+1};
      const geometry={failureFlags,viewportWidth,pageScrollWidth,windowInnerWidth:window.innerWidth,scrollX:window.scrollX,scrollY:window.scrollY,evidence:elementGeometry(details),prompt:elementGeometry(promptDetails)};
      if(Object.values(failureFlags).some(Boolean)){
        mismatches.push('expanded-evidence-visibility-or-overflow');
        geometry.ancestors=[];
        for(let ancestor=promptDetails.parentElement;ancestor;ancestor=ancestor.parentElement)geometry.ancestors.push(elementGeometry(ancestor));
        geometry.pageOverflowElements=[...document.querySelectorAll('body *')].map(element=>({element,box:element.getBoundingClientRect()})).filter(({box})=>box.width>0&&box.right+window.scrollX>viewportWidth+1).sort((left,right)=>right.box.right-left.box.right).slice(0,40).map(({element})=>elementGeometry(element));
      }
      expanded.push({profileId:profile.id,requestId:request.id,outputSha256:request.outputSha256,promptSha256:request.promptSha256,promptCharacters:prompt?.length||0,geometry});
      promptDetails.open=false;details.open=false;
    }
    return {caseId,trialNumber:trial,expanded,mismatches};
  })()`);
  check(`Creation trial ${trialNumber}: expanded original reviews and reconstructed prompts retain exact bytes`,!proof.mismatches.length,JSON.stringify(proof));
  await noOverflow(`Creation expanded evidence, trial ${trialNumber}`);
  return proof;
};

const verifyDungeonMaster = async () => {
  const benchmarkId = 'dungeon-master-adventure-outline';
  const dataExpression = `(window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING).additionalBenchmarks[${JSON.stringify(benchmarkId)}]`;
  const archiveExpression = `(window.VASIR_WRITING_RESPONSES_COLLECTION || window.VASIR_WRITING_RESPONSES).additionalBenchmarks[${JSON.stringify(benchmarkId)}]`;
  const categoryEvidence = await verifyWritingCategory();
  await navigate(pageUrl('index.html', 'capabilities/writing'), 'window.VASIR_WRITING_CATEGORY && document.querySelector("#capability-category-writing[aria-selected=true]")');
  check('Dungeon Master is registered separately in the common Writing index', await evaluate(`window.VASIR_DATA.writing.additionalBenchmarks?.[${JSON.stringify(benchmarkId)}]?.subcategory==='dungeon-master' && window.VASIR_WRITING_CATEGORY.benchmarks.some(benchmark=>benchmark.id===${JSON.stringify(benchmarkId)})`));
  await noOverflow('Writing category with Dungeon Master');
  await capture('dungeon-master-models.png');
  await click('[data-capability-mode=benchmarks]');
  check('Writing benchmark tests expose Adventure outline and its report', await evaluate(`location.hash==='#capabilities/writing/benchmarks'&&[...document.querySelectorAll('#capability-benchmarks .benchmark-ledger__row')].some(row=>row.dataset.benchmarkId===${JSON.stringify(benchmarkId)}&&row.href.includes('benchmark-report.html#'+${JSON.stringify(benchmarkId)})&&row.textContent.includes('Adventure outline'))`));
  await noOverflow('Dungeon Master benchmark listing');
  await capture('dungeon-master-benchmarks.png');
  await click('[data-capability-mode=efficiency]');
  check('Dungeon Master remains available through the common Writing efficiency route', await evaluate(`location.hash==='#capabilities/writing/efficiency'&&window.VASIR_WRITING_CATEGORY.benchmarks.some(benchmark=>benchmark.id===${JSON.stringify(benchmarkId)})`));
  await noOverflow('Writing category efficiency');
  await capture('dungeon-master-efficiency.png');
  await navigate(pageUrl('benchmark-report.html',benchmarkId), `document.querySelector('[data-writing-case]')&&document.querySelector('[data-writing-rubric]')&&(window.VASIR_WRITING_RESPONSES_COLLECTION || window.VASIR_WRITING_RESPONSES)?.additionalBenchmarks?.[${JSON.stringify(benchmarkId)}]`);
  const provisionalArchiveEvidence=await verifyProvisionalArchive();
  const inventory = await evaluate(`(() => {
    const data=${dataExpression};
    return {coverage:data.coverage,cases:data.cases.map(story=>({id:story.id,sourceCaseId:story.sourceCaseId,trialNumber:story.trialNumber,cohort:story.cohort})),dimensions:data.scoreBasis.dimensions.length,ratingMinimum:data.scoreBasis.ratingMinimum,ratingMaximum:data.scoreBasis.ratingMaximum,judges:data.scoreBasis.judgeCount,overall:JSON.stringify(window.VASIR_DATA.overall),settings:data.settings.map(setting=>({configurationId:setting.configurationId,reasoning:setting.reasoning})),primaryPrompt:document.querySelector('[data-primary-question]').textContent,design:document.querySelector('[data-writing-design]').textContent,pairReviews:document.querySelector('[data-writing-progress-count="pair-reviews"]').textContent,progress:{answers:document.querySelector('[data-writing-progress-count="answers"]').textContent,reviews:document.querySelector('[data-writing-progress-count="reviews"]').textContent}};
  })()`);
  check('Dungeon Master uses six dimensions, two judges, and the exact primary prompt', inventory.dimensions===6 && inventory.ratingMinimum===0 && inventory.ratingMaximum===5 && inventory.judges===2 && inventory.primaryPrompt==='create an outline for TTRPG adventure');
  check('Dungeon Master retains all sixteen pairs and thirty-two planned outputs', inventory.cases.length===16 && inventory.cases.filter(story=>story.cohort==='primary').length===6 && new Set(inventory.cases.map(story=>story.sourceCaseId)).size===6 && inventory.coverage.expectedResponseCount===32 && inventory.coverage.expectedJudgmentCount===64);
  check('Dungeon Master uses the declared Astra Ultra setting', inventory.settings.length===1 && inventory.settings[0].configurationId==='codex:gpt-6-astra@ultra' && inventory.settings[0].reasoning==='ultra');
  check('Dungeon Master report keeps Overall unchanged', sha256(inventory.overall)===overallSha256);
  check('Dungeon Master distinguishes prompts, repetitions and paired reviews', inventory.design.includes('6 distinct prompts · 16 matched pairs') && inventory.design.includes('primary prompt has 6 repetitions; each of 5 secondary prompts has 2 repetitions') && inventory.pairReviews.endsWith('/32 blind pair reviews'));
  check('Dungeon Master planned coverage matches source', inventory.progress.answers===`${inventory.coverage.responseCount}/32 final answers` && inventory.progress.reviews===`${inventory.coverage.judgmentCount}/64 planned answer assessments`);
  if(requireScored) check('Dungeon Master has both reviews of every answer', inventory.coverage.responseCount===32 && inventory.coverage.scoredResponseCount===32 && inventory.coverage.judgmentCount===64);
  const verifyCohorts = async scope => {
    const mismatches=await evaluate(`(() => {
      const data=${dataExpression},mismatches=[];
      const format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      const signed=value=>!Number.isFinite(value)?'—':${JSON.stringify(scope)}==='report'?(value>0?'+':'')+value.toFixed(1):value>0?'+'+value.toFixed(1):value<0?'−'+Math.abs(value).toFixed(1):'±0.0';
      const round=value=>Math.round((value+Number.EPSILON)*10)/10;
      const predicates={primary:story=>story.cohort==='primary',transfer:story=>story.cohort==='transfer',fantasyTransfer:story=>story.cohort==='transfer'&&story.genre==='fantasy',otherGenreTransfer:story=>story.cohort==='transfer'&&story.genre!=='fantasy'};
      for(const [id,predicate] of Object.entries(predicates)) {
        const cohort=data.cohortSummaries[id],element=document.querySelector('[data-writing-cohort="'+id+'"]'),cases=data.cases.filter(predicate);
        const pairs=cases.map(story=>({sourceCaseId:story.sourceCaseId,baseline:data.caseResults.find(cell=>cell.caseId===story.id&&cell.condition==='baseline')?.exactScore,skill:data.caseResults.find(cell=>cell.caseId===story.id&&cell.condition==='skill')?.exactScore})).filter(pair=>Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill));
        const groups=[...new Set(pairs.map(pair=>pair.sourceCaseId))].map(id=>pairs.filter(pair=>pair.sourceCaseId===id));
        const mean=key=>groups.length?round(groups.reduce((sum,group)=>sum+group.reduce((total,pair)=>total+key(pair),0)/group.length,0)/groups.length):null;
        if(cohort.baseline!==mean(pair=>pair.baseline)||cohort.treatment!==mean(pair=>pair.skill)||cohort.delta!==mean(pair=>pair.skill-pair.baseline)||cohort.usablePairs!==pairs.length||cohort.expectedPairs!==cases.length)mismatches.push(id+':arithmetic');
        if(!element||element.querySelector('[data-cohort-baseline]').textContent!==format(cohort.baseline)||element.querySelector('[data-cohort-treatment]').textContent!==format(cohort.treatment)||element.querySelector('[data-cohort-delta]').textContent!==signed(cohort.delta)||element.querySelector('[data-cohort-coverage]').textContent!==cohort.usablePairs+'/'+cohort.expectedPairs+(cohort.complete?'':' · incomplete'))mismatches.push(id+':display');
      }
      if(data.adherenceCoverage) {
        const proof=data.adherenceCoverage,text=document.querySelector('[data-writing-adherence]')?.textContent||'';
        if(!text.includes(proof.verifiedTreatmentAnswers+'/'+proof.returnedTreatmentAnswers+' returned treatment answers')||!text.includes(proof.observedChunkCount+'/'+proof.requiredChunkCount+' required chunks'))mismatches.push('read-proof-coverage');
      }
      const primary=data.cohortSummaries.primary;
      if(data.entries.some(entry=>entry.score!==(primary.complete?(entry.condition==='baseline'?primary.baseline:primary.treatment):null)))mismatches.push('primary-headline');
      return mismatches;
    })()`);
    check(`Dungeon Master ${scope}: separate primary and secondary arithmetic`, !mismatches.length, JSON.stringify(mismatches));
  };
  await verifyCohorts('report');
  await noOverflow('Dungeon Master report header');
  check('Dungeon Master report returns to the common Writing benchmark list', await evaluate(`document.querySelector('.report-context__back').getAttribute('href')==='./index.html#capabilities/writing/benchmarks'`));
  const caseEvidence=[];
  for(const story of inventory.cases) {
    await evaluate(`(() => {const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(story.id)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(()=>evaluate(`document.querySelector('#report-page').dataset.activeWritingCase===${JSON.stringify(story.id)}`),`Dungeon Master ${story.id}`);
    const proof=await evaluate(`(() => {
      const data=${dataExpression},archive=${archiveExpression},caseId=${JSON.stringify(story.id)},mismatches=[];
      const story=data.cases.find(story=>story.id===caseId),answers=archive.responses.filter(response=>response.caseId===caseId),format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      if(document.querySelector('[data-writing-case-title]').textContent!==story.title||!document.querySelector('[data-exact-question]').textContent.endsWith(story.prompt))mismatches.push('case-and-task');
      for(const answer of answers) {
        const panel=document.querySelector('[data-report-setting-id="'+answer.settingId+'"] [data-condition="'+answer.condition+'"]');
        if(!panel||(panel.querySelector('[data-output-text]')?.textContent||'')!==answer.outputText)mismatches.push('exact-answer:'+answer.condition);
        if(panel.querySelector('.model-run__condition-score').textContent.trim()!==format(answer.score)+(Number.isFinite(answer.score)?'/100':''))mismatches.push('answer-score:'+answer.condition);
        if(answer.runtime?.requiredSkillReads) {
          const receipt=answer.runtime.requiredSkillReads,element=panel.querySelector('[data-writing-required-reads]');
          if(!element||element.querySelector('[data-required-read-field="status"]').textContent!==receipt.status||!element.querySelector('[data-required-read-coverage]').textContent.startsWith(receipt.observedChunkCount+'/'+receipt.requiredChunkCount+' required chunks'))mismatches.push('required-read-proof');
        }
        const reviews=[...panel.querySelectorAll('[data-judge-review]')];
        if(reviews.length!==answer.judgments.length||new Set(answer.judgments.map(judge=>judge.reviewerId)).size!==answer.judgments.length)mismatches.push('reviewer-inventory');
        answer.judgments.forEach((judge,index)=>{
          const element=reviews[index];
          if(element.dataset.reviewerId!==judge.reviewerId||element.querySelector('[data-judge-rationale]').textContent!==judge.rationale)mismatches.push('review-identity-or-rationale');
          const total=data.scoreBasis.dimensions.reduce((sum,dimension)=>sum+judge.dimensions[dimension.id].rating,0)/30*100;
          if(Math.abs(total-judge.score)>1e-8||element.querySelector('[data-judge-score]').textContent!==format(judge.score))mismatches.push('review-score');
          data.scoreBasis.dimensions.forEach(dimension=>{
            const reading=judge.dimensions[dimension.id],row=element.querySelector('[data-dimension-id="'+dimension.id+'"]');
            if(row.querySelector('td').textContent!==String(reading.rating)||row.querySelector('[data-dimension-reason]').textContent!==reading.reason||row.querySelector('[data-cited-evidence]')?.textContent!==reading.evidence)mismatches.push('exact-dimension-evidence');
          });
          for(const [id,flag] of Object.entries(judge.flags))if(element.querySelector('[data-judge-flag="'+id+'"] [data-flag-reason]')?.textContent!==flag.reason)mismatches.push('exact-flag-reason');
        });
      }
      const preferences=data.pairwisePreferences.filter(preference=>preference.caseId===caseId);
      if(document.querySelectorAll('[data-pairwise-review]').length!==preferences.length)mismatches.push('preference-count');
      for(const preference of preferences)if(document.querySelector('[data-pairwise-review="'+preference.reviewerId+'"] [data-preference-reason]')?.textContent!==preference.reason)mismatches.push('exact-preference-reason');
      return {caseId,answers:answers.length,judgments:answers.reduce((sum,answer)=>sum+answer.judgments.length,0),preferences:preferences.length,mismatches};
    })()`);
    check(`Dungeon Master ${story.id}: exact answers, ratings, evidence and preferences`,proof.answers===2&&!proof.mismatches.length,JSON.stringify(proof));
    caseEvidence.push(proof);
  }
  check('Dungeon Master renders every 0–5 rubric anchor exactly',await evaluate(`(() => {const data=${dataExpression};return document.querySelectorAll('[data-rubric-dimension]').length===6&&data.scoreBasis.dimensions.every(dimension=>Object.entries(dimension.anchors).every(([rating,anchor])=>document.querySelector('[data-rubric-dimension="'+dimension.id+'"] [data-rubric-anchor="'+rating+'"]')?.textContent===anchor));})()`));
  const promptArchive=await evaluate(`(${archiveExpression}.promptFiles||[]).map(file=>({id:file.id,title:file.title,characters:file.content.length}))`);
  for(const file of promptArchive) {
    await click(`[data-prompt-file="${file.id}"] > summary`);
    check(`Dungeon Master archive ${file.id}: exact content opens`,await evaluate(`(() => {const element=document.querySelector('[data-prompt-file="${file.id}"]'),file=${archiveExpression}.promptFiles.find(file=>file.id===${JSON.stringify(file.id)});return element.open&&element.querySelector('[data-prompt-file-content]').textContent===file.content;})()`));
    await noOverflow('Dungeon Master archived reference');
    await click(`[data-prompt-file="${file.id}"] > summary`);
  }
  const reference = promptArchive.find(file=>file.title==='references/adventure-design.md') || promptArchive.find(file=>file.id!=='frozen-judge-rubric') || promptArchive[0];
  if(reference) {
    await click(`[data-prompt-file="${reference.id}"] > summary`);
    await noOverflow('Dungeon Master reference evidence');
    await capture('dungeon-master-reference.png');
    await click(`[data-prompt-file="${reference.id}"] > summary`);
  }
  const savedAnswer = await evaluate(`(() => {const data=${dataExpression},archive=${archiveExpression};const answer=archive.responses.find(response=>response.condition==='skill'&&response.outputText.length&&data.cases.find(story=>story.id===response.caseId)?.cohort==='primary')||archive.responses.find(response=>response.outputText.length);return answer?{caseId:answer.caseId,settingId:answer.settingId,condition:answer.condition,judgments:answer.judgments.length}:null;})()`);
  const showAnswer = async answer => {
    await evaluate(`(() => {const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(answer.caseId)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(()=>evaluate(`document.querySelector('#report-page').dataset.activeWritingCase===${JSON.stringify(answer.caseId)}`),'Dungeon Master saved answer case');
    await evaluate(`document.querySelector('[data-report-setting-id="${answer.settingId}"] .model-run').open=true`);
    return `[data-report-setting-id="${answer.settingId}"] [data-condition="${answer.condition}"]`;
  };
  if(savedAnswer) {
    const selector=await showAnswer(savedAnswer);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'})`);
    await noOverflow('Dungeon Master saved answer');
    await capture('dungeon-master-answer.png');
    await evaluate(`(() => {const element=document.querySelector(${JSON.stringify(selector+' .model-run__judging')});element.open=true;element.scrollIntoView({block:'start',behavior:'instant'});})()`);
    await noOverflow('Dungeon Master saved judgments');
    await capture('dungeon-master-judgments.png');
  }
  const savedAdherence = await evaluate(`(() => {const responses=${archiveExpression}.responses;const answer=responses.find(response=>response.runtime?.requiredSkillReads?.status==='incomplete')||responses.find(response=>response.runtime?.requiredSkillReads);return answer?{caseId:answer.caseId,settingId:answer.settingId,condition:answer.condition,status:answer.runtime.requiredSkillReads.status}:null;})()`);
  if(savedAdherence) {
    const selector=await showAnswer(savedAdherence);
    await evaluate(`(() => {const panel=document.querySelector(${JSON.stringify(selector)}),execution=panel.querySelector('[data-writing-execution]'),reads=panel.querySelector('[data-writing-required-reads]');execution.open=true;reads.open=true;reads.scrollIntoView({block:'start',behavior:'instant'});})()`);
    await noOverflow('Dungeon Master reference-read adherence');
    await capture('dungeon-master-adherence.png');
  }
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);
  await noOverflow('Dungeon Master report');
  await capture('dungeon-master-report.png');
  await click('[data-report-section=method]');
  await noOverflow('Dungeon Master method');
  await capture('dungeon-master-method.png');
  await click('.report-context__back');
  await waitFor(()=>evaluate(`location.hash==='#capabilities/writing/benchmarks'&&!!document.querySelector('#capability-benchmarks:not([hidden])')`).catch(()=>false),'Dungeon Master return to Writing benchmark list');
  check('Dungeon Master return navigation retains every published Writing benchmark', await evaluate(`window.VASIR_WRITING_CATEGORY.benchmarks.length===${categoryEvidence.benchmarkIds.length}&&!!document.querySelector('[data-benchmark-id="${benchmarkId}"]')`));
  return {benchmarkId,coverage:inventory.coverage,categoryEvidence,provisionalArchiveEvidence,caseEvidence,promptArchive,savedAnswer,savedAdherence};
};

try {
  const port = await waitFor(() => {
    try { return fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { return null; }
  }, 'Chrome debugging port');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push({ kind: 'runtime', detail: message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text });
    if (message.method === 'Network.requestWillBeSent') requests.push({ url: message.params.request.url, type: message.params.type });
    if (message.method === 'Network.responseReceived') responses.set(message.params.requestId, message.params.response);
    if (message.method === 'Network.loadingFinished') {
      const requestId = message.params.requestId;
      const response = responses.get(requestId);
      if (response && /\/(?:app|benchmark-report|writing-data|writing-responses|writing-creation-responses)\.js$/.test(new URL(response.url).pathname)) {
        loadedFilePromises.push(send('Network.getResponseBody', { requestId }).then(result => {
          const bytes = Buffer.from(result.body, result.base64Encoded ? 'base64' : 'utf8');
          return { url:response.url, bytes:bytes.length, sha256:sha256(bytes) };
        }).catch(error => { errors.push({kind:'loaded-byte-evidence',url:response.url,detail:error.message}); return null; }));
      }
    }
    if (message.method === 'Network.loadingFailed' && !message.params.canceled) errors.push({ kind: 'network', detail: message.params.errorText });
  });
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable'), send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 }), send('Emulation.setTouchEmulationEnabled', { enabled: width < 700 })]);
  await send('Network.setCacheDisabled', { cacheDisabled:true });

  if (requestedBenchmark === 'dungeon-master-adventure-outline') {
    const result = await verifyDungeonMaster();
    const loadedFiles = (await Promise.all(loadedFilePromises)).filter(Boolean);
    check('Dungeon Master has no browser runtime or network failures', errors.length === 0, JSON.stringify(errors));
    check('Dungeon Master has no failed HTTP responses', [...responses.values()].every(response => response.status < 400));
    const receipt = { kind:'vasirbenchmark-writing-browsercheck',schemaVersion:1,status:'passed',...result,url:baseUrl.href,width,height,harnessSha256,overallSha256,checks,loadedFiles,screenshots,errors,completedAt:new Date().toISOString() };
    fs.writeFileSync(path.join(output, 'writing-browsercheck.json'), `${JSON.stringify(receipt,null,2)}\n`);
    process.stdout.write(`${JSON.stringify({status:'passed',benchmarkId:result.benchmarkId,checks:checks.length,cases:result.caseEvidence.length,width,height,receipt:path.join(output,'writing-browsercheck.json')})}\n`);
  } else {

  const categoryEvidence=await verifyWritingCategory();
  const writing=await evaluate(`(() => {const data=${selectedProjectionExpression};return {benchmarks:data.benchmarks.map(item=>item.id),cases:data.cases.map(story=>({id:story.id,title:story.title})),settings:data.settings.map(setting=>setting.id),conditions:data.conditions.length,dimensions:data.scoreBasis.dimensions.length,trialCount:data.trialCount || 1,coverage:data.coverage};})()`);
  coverage=writing.coverage;
  check('Requested report keeps its original benchmark, cases and trial count',writing.benchmarks.length===1&&(!requestedBenchmark || writing.benchmarks[0]===requestedBenchmark));
  const scoredCollection={completeSettings:categoryEvidence.completeSettings,unscoredSettings:categoryEvidence.unscoredSettings,tiedRankEntries:categoryEvidence.tiedRankEntries,regressionSettings:categoryEvidence.regressionSettings};
  const efficiencyEvidence=categoryEvidence.efficiencyEvidence;
  const chosenSettingId=writing.settings.at(-1);
  const selectedReport=new URL(pageUrl('benchmark-report.html',writing.benchmarks[0]+'/'+writing.cases[0].id+(writing.trialCount>1?'/trial-1':'')));
  selectedReport.searchParams.set('setting',chosenSettingId);
  const selectedReportUrl=selectedReport.href;

  await navigate(selectedReportUrl, 'window.VASIR_WRITING_RESPONSES && document.querySelector("[data-writing-case]") && document.querySelector("[data-writing-rubric]")');
  const provisionalArchiveEvidence=isCreation?[]:await verifyProvisionalArchive();
  check('Selected model opens directly in the report', await evaluate(`document.querySelector('[data-report-setting-id="${chosenSettingId}"] .model-run').open`));
  check('Writing report does not load unrelated response bundles', await evaluate('!window.VASIR_RESPONSES'));
  if(isCreation) check('Creation report loads its dedicated archive without the legacy Writing archive', requests.some(request => new URL(request.url).pathname.endsWith('/writing-creation-responses.js')) && !requests.some(request => new URL(request.url).pathname.endsWith('/writing-responses.js')));
  await verifyWritingProgress('report');
  const creationArchiveEvidence=isCreation?await verifyCreationArchiveAndContexts():null;
  check('Writing case metadata and answer archive share the same pinned source', await evaluate(`(() => { const data=window.VASIR_WRITING, evidence=window.VASIR_WRITING_RESPONSES;return evidence.responses.filter(response=>response.outputText.length).length===data.coverage.responseCount && evidence.responses.every(response=>{ const cell=data.caseResults.find(cell=>cell.caseId===response.caseId && cell.settingId===response.settingId && cell.condition===response.condition && (cell.trialNumber || 1)===(response.trialNumber || 1));return response.provenance.sourceSha256===data.scoreBasis.sourceSha256 && cell?.status===response.status && cell.score===response.score && cell.wordCount===response.wordCount && cell.failureReason===response.failureReason;}); })()`));
  const verifyCase = async (caseId, trialNumber = 1) => {
    const proof = await evaluate(`(() => {
      const data=window.VASIR_WRITING, evidence=window.VASIR_WRITING_RESPONSES,creation=data.benchmarks[0].id==='storytelling-magic-discovery';
      const caseId=${JSON.stringify(caseId)}, trialNumber=${trialNumber};
      const story=data.cases.find(story=>story.id===caseId);
      const source=evidence.responses.filter(response=>response.caseId===caseId && (response.trialNumber || 1)===trialNumber);
      const rows=[...document.querySelectorAll('[data-report-setting-id]')];
      const mismatches=[];
      const failures=[];
      const terminalJudgmentLabels=[];
      const round=value=>Math.round((value+Number.EPSILON)*10)/10;
      const format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      const signed=value=>Number.isFinite(value)?(value>0?'+':'')+value.toFixed(1):'—';
      const close=(actual,expected)=>expected===null?actual===null:Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8;
      const caseCells=data.caseResults.filter(cell=>cell.caseId===caseId && (cell.trialNumber || 1)===trialNumber);
      for (const row of rows) for (const condition of data.conditions) {
        const response=source.find(response=>response.settingId===row.dataset.reportSettingId && response.condition===condition.id);
        const panel=row.querySelector('[data-condition="'+condition.id+'"]');
        const output=panel.querySelector('[data-output-text]')?.textContent || '';
        if(output !== (response?.outputText || '')) mismatches.push('output:'+row.dataset.reportSettingId+':'+condition.id);
        if(!output && panel.querySelector('.writing-answer-status')?.textContent!==(response?.failureReason || response?.status || 'No completed answer recorded')) mismatches.push('failure-reason:'+row.dataset.reportSettingId+':'+condition.id);
        if(response && ['error','unavailable'].includes(response.status)) {
          const paired=source.find(other=>other.settingId===response.settingId && other.condition!==response.condition);
          if((output && response.runtime?.requiredSkillReads?.status!=='incomplete') || response.score!==null || response.judgments.length) mismatches.push('failed-response-scored');
          failures.push({caseId,trialNumber,settingId:response.settingId,configurationId:response.configurationId,condition:response.condition,status:response.status,failureReason:response.failureReason,renderedFailureReason:panel.querySelector('.writing-answer-status')?.textContent || '',score:response.score,judgments:response.judgments.length,pairedResponse:paired?{condition:paired.condition,status:paired.status,hasOutput:Boolean(paired.outputText),wordCount:paired.wordCount,score:paired.score,judgments:paired.judgments.length}:null});
        }
        const messages=evidence.messageSets.find(set=>set.id===response?.messageSetId)?.messages || [];
        const renderedMessages=[...panel.querySelectorAll('[data-message-content]')];
        if(messages.length!==renderedMessages.length || renderedMessages.some((element,index)=>element.textContent!==(messages[index].content || ''))) mismatches.push('exact-input-messages');
        const fileReferences=[...panel.querySelectorAll('.model-run__prompt [data-open-prompt-file]')].map(element=>element.dataset.openPromptFile);
        if(JSON.stringify(fileReferences)!==JSON.stringify(messages.filter(message=>message.fileId).map(message=>message.fileId))) mismatches.push('prompt-file-reference');
        const verifyFields=(element,source,keys,attribute)=>{
          const expected=keys.filter(key=>source && Object.hasOwn(source,key));
          const rendered=[...element.querySelectorAll('['+attribute+']')];
          if(rendered.length!==expected.length || rendered.some(field=>field.textContent!==(source[field.getAttribute(attribute)]===null?'Not reported':String(source[field.getAttribute(attribute)])))) mismatches.push(attribute);
        };
        const usageKeys=['inputTokens','cachedInputTokens','cacheWriteInputTokens','cacheCreationInputTokens','cacheReadInputTokens','outputTokens','reasoningOutputTokens','totalTokens'];
        const execution=panel.querySelector('[data-writing-execution]');
        if(Boolean(execution)!==Boolean(response?.runtime)) mismatches.push('runtime-presence');
        if(execution) {
          verifyFields(execution,response.runtime,['freshSession','executionMode','modelVerification','reasoningVerification','observedCollaborationEvents','rawProviderStreamRetained','durationMs'],'data-runtime-field');
          verifyFields(execution,response,['characterCount'],'data-response-field');
          verifyFields(execution,response.runtime.usage,usageKeys,'data-resource-usage');
          const requiredReads=response.runtime.requiredSkillReads;
          const readEvidence=execution.querySelector('[data-required-skill-reads]');
          if(Boolean(readEvidence)!==Boolean(requiredReads)) mismatches.push('required-read-presence');
          if(requiredReads && readEvidence) {
            if(readEvidence.querySelector('[data-required-read-status]')?.textContent!==requiredReads.status) mismatches.push('required-read-status');
            verifyFields(readEvidence,requiredReads,['policyVersion','evidence'],'data-required-read-field');
            const files=[...readEvidence.querySelectorAll('[data-required-read-file]')];
            if(files.length!==requiredReads.files.length) mismatches.push('required-read-file-count');
            for(const element of files) {
              const file=requiredReads.files.find(file=>file.relativePath===element.dataset.requiredReadFile);
              if(!file){mismatches.push('required-read-file-identity');continue;}
              verifyFields(element,file,['bytes','sha256','requiredChunkCount'],'data-required-read-file-field');
              if(element.querySelector('[data-required-read-observed-count]')?.textContent!==String(file.observedChunks.length)) mismatches.push('required-read-observed-count');
              const chunks=[...element.querySelectorAll('[data-required-read-chunk]')];
              if(chunks.length!==file.observedChunks.length || chunks.some(chunk=>{const saved=file.observedChunks.find(item=>String(item.index)===chunk.dataset.requiredReadChunk);return !saved || chunk.querySelector('dt')?.textContent!=='Chunk '+saved.index+' · '+saved.bytes+' bytes' || chunk.querySelector('code')?.textContent!==saved.sha256;})) mismatches.push('required-read-chunk-evidence');
            }
          }
          if(response.runtime.usage && !execution.textContent.includes('a saved zero does not prove the provider reported zero')) mismatches.push('usage-normalization-disclosure');
          if(response.characterCount!==undefined && response.characterCount!==Array.from(output).length) mismatches.push('unicode-character-count');
          const references=[...execution.querySelectorAll('[data-reference-path]')].map(element=>element.textContent);
          if(JSON.stringify(references)!==JSON.stringify(response.runtime.referenceFilesRead || [])) mismatches.push('runtime-reference-files');
          for (const button of execution.querySelectorAll('[data-open-prompt-file]')) {
            const reference=button.querySelector('[data-reference-path]').textContent;
            const file=evidence.promptFiles.find(file=>file.id===button.dataset.openPromptFile);
            if(!file || (reference==='SKILL.md'?file.id!=='frozen-skill-root':creation?file.title!==reference:!file.title.startsWith(reference+' · '))) mismatches.push('runtime-reference-archive-link');
          }
        }
        const words=output.trim()?output.trim().split(/\\s+/u).length:0;
        if(Number(panel.querySelector('[data-output-word-count]').dataset.outputWordCount)!==words) mismatches.push('word-count');
        const aggregate=panel.querySelector('.model-run__condition-score').textContent.trim();
        if(aggregate!==(Number.isFinite(response?.score)?response.score.toFixed(1)+'/100':'—')) mismatches.push('aggregate-score');
        const judgments=response?.judgments || [];
        const pairedResponse=source.find(other=>other.settingId===response?.settingId && other.condition!==condition.id);
        const terminalFailure=candidate=>['error','unavailable'].includes(candidate?.status);
        const terminalUnscored=judgments.length===0 && (response?.judgingDisposition==='terminal-excluded' || terminalFailure(response) || (Boolean(output) && terminalFailure(pairedResponse)));
        if(response?.judgingDisposition==='terminal-excluded') {
          const disclosure=panel.querySelector('[data-writing-exclusion]')?.textContent || '';
          if(!disclosure.includes('required full-read verification') || !disclosure.includes('no further judge reviews are planned') || !output || response.score!==null || judgments.length) mismatches.push('terminal-trial-exclusion');
        }
        const expectedJudgingLabel=judgments.length?'Saved judge reviews':terminalUnscored?'Not scored':'Judgments pending';
        const renderedJudgingLabel=panel.querySelector('.model-run__judging-title')?.textContent;
        if(renderedJudgingLabel!==expectedJudgingLabel) mismatches.push('judgment-status-label:'+row.dataset.reportSettingId+':'+condition.id);
        if(terminalUnscored) terminalJudgmentLabels.push({caseId,settingId:response.settingId,configurationId:response.configurationId,condition:response.condition,status:response.status,reason:terminalFailure(response)?'terminal-generation-failure':'completed-answer-with-terminally-failed-counterpart',expectedLabel:expectedJudgingLabel,renderedLabel:renderedJudgingLabel});
        const completePanel=judgments.length===data.scoreBasis.judgeCount && judgments.every(judgment=>Number.isFinite(judgment.score));
        const exactScore=completePanel?judgments.reduce((sum,judgment)=>sum+judgment.score,0)/judgments.length:null;
        const cell=caseCells.find(cell=>cell.settingId===row.dataset.reportSettingId && cell.condition===condition.id);
        if(!close(cell.exactScore,exactScore) || !close(response.score,exactScore===null?null:round(exactScore))) mismatches.push('panel-mean-arithmetic');
        const judgeCoverage=panel.querySelector('[data-judge-coverage]').textContent;
        if(completePanel) {
          const spread=Math.max(...judgments.map(judgment=>judgment.score))-Math.min(...judgments.map(judgment=>judgment.score));
          if(!judgeCoverage.includes('Score disagreement: '+spread.toFixed(1)+' rubric points.')) mismatches.push('complete-panel-disagreement');
        } else if(!judgeCoverage.includes('A complete score requires the full panel.')) mismatches.push('incomplete-panel-disclosure');
        const rendered=[...panel.querySelectorAll('[data-judge-review]')];
        if(rendered.length!==judgments.length) mismatches.push('judge-count');
        rendered.forEach((element,index)=>{
          const judgment=judgments[index];
          if(Number.isFinite(judgment.score)) {
            const derived=data.scoreBasis.dimensions.reduce((sum,dimension)=>sum+judgment.dimensions[dimension.id].rating*dimension.weight/data.scoreBasis.ratingMaximum,0);
            if(!close(judgment.score,derived)) mismatches.push('judge-dimension-arithmetic');
          }
          if(element.querySelector('[data-judge-score]').textContent.trim()!==(Number.isFinite(judgment.score)?judgment.score.toFixed(1):'—')) mismatches.push('individual-judge-score');
          const dimensions=[...element.querySelectorAll('[data-dimension-id]')];
          if(dimensions.length!==data.scoreBasis.dimensions.length) mismatches.push('dimension-count');
          dimensions.forEach(dimension=>{
            const reading=judgment.dimensions?.[dimension.dataset.dimensionId];
            const cells=dimension.querySelectorAll('td');
            if(reading && (cells[0].textContent!==String(reading.rating) || (creation?dimension.querySelector('[data-dimension-reason]')?.textContent:cells[1].textContent)!==(reading.reason || '—'))) mismatches.push('dimension-evidence');
            if(creation && dimension.querySelector('[data-cited-evidence]')?.textContent!==reading?.evidence) mismatches.push('creation-cited-evidence');
          });
          if(element.querySelector('[data-judge-rationale]').textContent!==judgment.rationale) mismatches.push('judge-rationale');
          const resources=element.querySelector('[data-judge-resources]');
          if(Boolean(resources)!==Boolean(judgment.resources)) mismatches.push('judge-resource-presence');
          if(resources) {
            verifyFields(resources,{...judgment.resources,promptSha256:judgment.promptSha256},['scope','candidateCount','durationMs','promptSha256'],'data-judge-resource');
            verifyFields(resources,judgment.resources.usage,usageKeys,'data-resource-usage');
            if(judgment.resources.usage && !resources.textContent.includes('a saved zero does not prove the provider reported zero')) mismatches.push('judge-usage-normalization-disclosure');
            if(!resources.textContent.includes('count each judge and prompt SHA-256 once')) mismatches.push('judge-batch-deduplication-disclosure');
          }
        });
      }
      const pairs=data.settings.map(setting=>({settingId:setting.id,baseline:caseCells.find(cell=>cell.settingId===setting.id && cell.condition==='baseline')?.exactScore??null,skill:caseCells.find(cell=>cell.settingId===setting.id && cell.condition==='skill')?.exactScore??null}));
      const paired=pairs.filter(pair=>Number.isFinite(pair.baseline) && Number.isFinite(pair.skill));
      for(const row of rows) {
        const pair=pairs.find(pair=>pair.settingId===row.dataset.reportSettingId);
        const aggregate=data.benchmarkResults.find(result=>result.settingId===pair.settingId&&result.condition==='skill');
        const rank=creation?(Number.isFinite(aggregate?.exactScore)?1+data.benchmarkResults.filter(other=>other.condition==='skill'&&Number.isFinite(other.exactScore)&&other.exactScore>aggregate.exactScore).length:null):Number.isFinite(pair.skill)?1+pairs.filter(other=>Number.isFinite(other.skill)&&other.skill>pair.skill).length:null;
        const delta=Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill)?round(pair.skill-pair.baseline):null;
        const summary=row.querySelector('.model-preview__row');
        if(summary.querySelector('.model-preview__identity small').textContent!==(rank?(creation?'Three-trial balanced skill':'Storytelling skill')+' rank #'+rank+' of '+data.settings.length:creation?'Three-trial aggregate incomplete':'Panel total not assessable')) mismatches.push('story-rank');
        if(summary.querySelector('.model-preview__delta').textContent!==signed(delta)+' pts' || summary.classList.contains('is-regression')!==(delta<0)) mismatches.push('story-paired-delta');
      }
      const means={baseline:paired.length?round(paired.reduce((sum,pair)=>sum+pair.baseline,0)/paired.length):null,skill:paired.length?round(paired.reduce((sum,pair)=>sum+pair.skill,0)/paired.length):null,delta:paired.length?round(paired.reduce((sum,pair)=>sum+pair.skill-pair.baseline,0)/paired.length):null};
      if(document.querySelector('.matched-result__condition--baseline strong').textContent!==format(means.baseline) || document.querySelector('.matched-result__condition--treatment strong').textContent!==format(means.skill) || document.querySelector('.matched-result__delta dd').textContent!==signed(means.delta)+' pts') mismatches.push('story-paired-field-means');
      return {caseId,trialNumber,selectedTrial:Number(document.querySelector('[data-writing-trial]')?.value || 1),selected:document.querySelector('[data-writing-case]').value,title:document.querySelector('[data-writing-case-title]').textContent,prompt:document.querySelector('[data-exact-question]').textContent.endsWith(story.prompt || data.benchmarks[0].prompt),rows:rows.length,sourceResponses:source.length,outputCount:source.filter(response=>response.outputText.length).length,runtimeCount:source.filter(response=>response.runtime).length,judgments:source.reduce((total,response)=>total+response.judgments.length,0),singleJudgeResponses:source.filter(response=>response.judgments.length===1).length,completePanelResponses:source.filter(response=>response.judgments.length===data.scoreBasis.judgeCount && response.judgments.every(judgment=>Number.isFinite(judgment.score))).length,scoredPairs:paired.length,regressionPairs:paired.filter(pair=>pair.skill<pair.baseline).length,tiedPairs:paired.filter(pair=>pair.skill===pair.baseline).length,failures,terminalJudgmentLabels,mismatches};
    })()`);
    check(`Case ${caseId}, trial ${trialNumber}: exact question, answers, failure labels, word counts and judge evidence`, proof.selectedTrial === trialNumber && proof.selected === caseId && proof.title === writing.cases.find(story => story.id === caseId).title && proof.prompt && proof.rows === writing.settings.length && proof.mismatches.length === 0, JSON.stringify(proof));
    return proof;
  };
  const selectTrial = async trialNumber => {
    if (writing.trialCount <= 1) return;
    await evaluate(`(() => {const select=document.querySelector('[data-writing-trial]');if(!select)throw Error('Trial selector missing');select.value=${JSON.stringify(String(trialNumber))};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(() => evaluate(`Number(document.querySelector('[data-writing-trial]')?.value)===${trialNumber} && Number(document.querySelector('#report-page')?.dataset.activeWritingTrial)===${trialNumber}`), `Writing trial ${trialNumber}`);
  };
  const caseEvidence = [];
  const creationExpandedEvidence = [];
  for (const story of writing.cases) {
    if (await evaluate('document.querySelector("[data-writing-case]").value') !== story.id) {
      await evaluate(`(() => { const select=document.querySelector('[data-writing-case]'); select.value=${JSON.stringify(story.id)}; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
      await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(story.id)} && document.querySelector('[data-writing-case]')?.value===${JSON.stringify(story.id)} && location.hash.includes(${JSON.stringify(story.id)})`).catch(() => false), `Story ${story.id}`).catch(async error => {
        error.message += `: ${JSON.stringify(await evaluate('({hash:location.hash,rendered:document.querySelector("#report-page")?.dataset.activeWritingCase,selected:document.querySelector("[data-writing-case]")?.value,title:document.querySelector("[data-writing-case-title]")?.textContent})'))}`;
        throw error;
      });
    }
    for (let trialNumber = 1; trialNumber <= writing.trialCount; trialNumber += 1) {
      await selectTrial(trialNumber);
      caseEvidence.push(await verifyCase(story.id, trialNumber));
      if(isCreation) creationExpandedEvidence.push(await verifyCreationExpandedReviews(story.id,trialNumber));
    }
  }
  check('Every declared rubric dimension is present', await evaluate('document.querySelectorAll("[data-rubric-dimension]").length===window.VASIR_WRITING.scoreBasis.dimensions.length'));
  check('Every rubric description and published 1/5/10 anchor matches the source', await evaluate(`window.VASIR_WRITING.scoreBasis.dimensions.every(dimension=>{ const element=document.querySelector('[data-rubric-dimension="'+dimension.id+'"]');return element.querySelector('[data-rubric-description]').textContent===(dimension.description || '') && ['1','5','10'].every(rating=>element.querySelector('[data-rubric-anchor="'+rating+'"]')?.textContent===dimension.anchors?.[rating]); })`));
  check('Execution methodology and resource-accounting text match the source', await evaluate(`(() => { const method=window.VASIR_WRITING.methodology;const element=document.querySelector('[data-method-execution]');const expected=method.execution || {};return Boolean(element)===Boolean(method.execution || method.resourceAccounting) && (!method.resourceAccounting || element.querySelector('[data-resource-accounting]').textContent===method.resourceAccounting) && Object.entries(expected).every(([key,value])=>element.querySelector('[data-method-execution-field="'+key+'"]')?.textContent===(value===null?'Not reported':String(value))); })()`));
  check('Uncertainty disclosure preserves the selected benchmark protocol', await evaluate(`!window.VASIR_WRITING.scoreBasis.uncertainty?.protocol || document.querySelector('#method').textContent.includes(window.VASIR_WRITING.scoreBasis.uncertainty.reason)`));
  check('Shared prompt files render once with exact source text', await evaluate(`(() => { const files=window.VASIR_WRITING_RESPONSES.promptFiles || []; const elements=[...document.querySelectorAll('[data-prompt-file]')]; return elements.length===files.length && elements.every(element=>element.querySelector('[data-prompt-file-content]').textContent===files.find(file=>file.id===element.dataset.promptFile).content); })()`));
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  await noOverflow('Writing report');
  await capture('writing-report.png');
  await click('[data-report-section=method]');
  await noOverflow('Writing method');
  await capture('writing-method.png');
  const rubricDimensions = await evaluate('window.VASIR_WRITING.scoreBasis.dimensions.map(dimension=>dimension.id)');
  for (const dimensionId of rubricDimensions) {
    const selector = `[data-rubric-anchors="${dimensionId}"]`;
    await click(`${selector} > summary`);
    check(`Rubric ${dimensionId}: rating anchors open without overflow`, await evaluate(`document.querySelector(${JSON.stringify(selector)}).open && document.documentElement.scrollWidth<=document.documentElement.clientWidth+1`));
    if (dimensionId === rubricDimensions[0]) await capture('writing-rubric-anchors.png');
    await click(`${selector} > summary`);
  }
  if (await evaluate('!!document.querySelector("[data-method-execution]")')) {
    await click('[data-method-execution] > summary');
    await noOverflow('Writing execution methodology');
    await capture('writing-method-execution.png');
    await click('[data-method-execution] > summary');
  }
  const promptReference = await evaluate('!!document.querySelector("[data-open-prompt-file]")');
  if (promptReference) {
    await click('[data-open-prompt-file]');
    check('Input transcript opens the shared frozen prompt file', await evaluate('!!document.querySelector("[data-prompt-file][open]")'));
    await noOverflow('Shared Writing prompt');
  }
  const promptArchive = await evaluate(`window.VASIR_WRITING_RESPONSES.promptFiles.map(file=>({id:file.id,title:file.title,characters:file.content.length}))`);
  for (const file of promptArchive) {
    const selector = `[data-prompt-file="${file.id}"]`;
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).open=false`);
    await click(`${selector} > summary`);
    check(`Frozen file ${file.id}: opens its exact archived content`, await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)}); const source=window.VASIR_WRITING_RESPONSES.promptFiles.find(file=>file.id===${JSON.stringify(file.id)}); return element.open && element.querySelector('[data-prompt-file-content]').textContent===source.content && document.documentElement.scrollWidth<=document.documentElement.clientWidth+1; })()`));
    if (file.characters === Math.max(...promptArchive.map(item=>item.characters))) await capture('writing-reference.png');
    await click(`${selector} > summary`);
    check(`Frozen file ${file.id}: closes after inspection`, await evaluate(`!document.querySelector(${JSON.stringify(selector)}).open`));
  }
  const savedAnswer = await evaluate(`(() => { const responses=window.VASIR_WRITING_RESPONSES.responses; const answer=responses.find(response=>response.outputText.length && Number.isFinite(response.score)) || responses.find(response=>response.outputText.length && response.judgments.length) || responses.find(response=>response.outputText.length); return answer ? {caseId:answer.caseId,trialNumber:answer.trialNumber || 1,settingId:answer.settingId,condition:answer.condition,judgments:answer.judgments.length} : null; })()`);
  if (savedAnswer) {
    await evaluate(`(() => { const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(savedAnswer.caseId)};select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(savedAnswer.caseId)}`), 'Saved answer story');
    await selectTrial(savedAnswer.trialNumber);
    await evaluate(`(() => { const row=document.querySelector('[data-report-setting-id="${savedAnswer.settingId}"]');row.querySelector('.model-run').open=true;const condition=row.querySelector('[data-condition="${savedAnswer.condition}"]');condition.scrollIntoView({block:'start',behavior:'instant'}); })()`);
    await noOverflow('Saved Writing answer');
    await capture('writing-answer.png');
    if (savedAnswer.judgments) {
      await evaluate(`(() => { const judge=document.querySelector('[data-report-setting-id="${savedAnswer.settingId}"] [data-condition="${savedAnswer.condition}"] .model-run__judging');judge.open=true;judge.scrollIntoView({block:'start',behavior:'instant'}); })()`);
      await noOverflow('Writing judge dimensions');
      check('Sparse Writing judgments remain visibly separate from aggregate scores', await evaluate(`(() => { const panel=document.querySelector('[data-report-setting-id="${savedAnswer.settingId}"] [data-condition="${savedAnswer.condition}"]');const response=window.VASIR_WRITING_RESPONSES.responses.find(response=>response.caseId===${JSON.stringify(savedAnswer.caseId)} && response.settingId===${JSON.stringify(savedAnswer.settingId)} && response.condition===${JSON.stringify(savedAnswer.condition)} && (response.trialNumber || 1)===${savedAnswer.trialNumber});return response.judgments.length===window.VASIR_WRITING.scoreBasis.judgeCount || (panel.querySelector('.model-run__condition-score').textContent.trim()==='—' && panel.querySelector('.model-run__judging-meta').textContent.includes('Panel incomplete') && panel.querySelector('[data-judge-coverage]').textContent.includes('A complete score requires the full panel.'));})()`));
      await capture('writing-judgments.png');
      const judgeResources = `[data-report-setting-id="${savedAnswer.settingId}"] [data-condition="${savedAnswer.condition}"] [data-judge-resources]`;
      if (await evaluate(`!!document.querySelector(${JSON.stringify(judgeResources)})`)) {
        await click(`${judgeResources} > summary`);
        await noOverflow('Writing shared judge-batch resources');
        await capture('writing-judge-resources.png');
      }
    }
  }
  const savedExecution = await evaluate(`(() => { const responses=window.VASIR_WRITING_RESPONSES.responses;const answer=responses.find(response=>response.runtime?.observedCollaborationEvents>0 && response.runtime.referenceFilesRead?.length) || responses.find(response=>response.runtime);return answer ? {caseId:answer.caseId,trialNumber:answer.trialNumber || 1,settingId:answer.settingId,condition:answer.condition,runtime:answer.runtime} : null; })()`);
  if (savedExecution) {
    await evaluate(`(() => { const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(savedExecution.caseId)};select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(savedExecution.caseId)}`), 'Saved execution story');
    await selectTrial(savedExecution.trialNumber);
    const selector = `[data-report-setting-id="${savedExecution.settingId}"] [data-condition="${savedExecution.condition}"] [data-writing-execution]`;
    await evaluate(`document.querySelector('[data-report-setting-id="${savedExecution.settingId}"] .model-run').open=true`);
    await click(`${selector} > summary`);
    check('Recorded execution opens with literal labels and no inferred agent count', await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)});return element.open && element.textContent.includes('do not establish the number of underlying agents'); })()`));
    await noOverflow('Writing recorded execution');
    await capture('writing-execution.png');
    const reference = await evaluate(`document.querySelector(${JSON.stringify(`${selector} [data-open-prompt-file]`)})?.dataset.openPromptFile`);
    if (reference) {
      await click(`${selector} [data-open-prompt-file]`);
      check('Recorded reference-file read opens its shared archive', await evaluate(`document.querySelector('[data-prompt-file="${reference}"]').open`));
      await noOverflow('Writing recorded reference');
    }
  }

  // Supplementary evidence only: keep the canonical 13 presentation captures stable.
  for (const failure of caseEvidence.flatMap(story => story.failures)) {
    await evaluate(`(() => { const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(failure.caseId)};select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(failure.caseId)}`), 'Failed answer story');
    await selectTrial(failure.trialNumber);
    const states = [{ condition:failure.condition, view:'failed-response' }];
    if (failure.pairedResponse?.hasOutput) states.push({ condition:failure.pairedResponse.condition, view:'retained-paired-response' });
    for (const state of states) {
      const selector = `[data-report-setting-id="${failure.settingId}"] [data-condition="${state.condition}"]`;
      await evaluate(`(() => {document.querySelector('[data-report-setting-id="${failure.settingId}"] .model-run').open=true;document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'});})()`);
      await noOverflow(`Writing ${failure.configurationId} ${failure.caseId} ${state.view}`);
      const name = `writing-failure-${failure.caseId}-trial-${failure.trialNumber}-${failure.settingId}-${state.condition}-${state.view}.png`.replace(/[^a-zA-Z0-9._-]/g, '-');
      await capture(name, failureScreenshots, {caseId:failure.caseId,settingId:failure.settingId,configurationId:failure.configurationId,condition:state.condition,view:state.view});
    }
  }

  const loadedFiles = (await Promise.all(loadedFilePromises)).filter(Boolean);
  if(isCreation) {
    const creationFiles=loadedFiles.filter(file=>new URL(file.url).pathname.endsWith('/writing-creation-responses.js'));
    check('Creation archive response bytes and SHA-256 are recorded without downloading the legacy archive',creationFiles.length>0&&creationFiles.every(file=>file.bytes>0&&/^[a-f0-9]{64}$/.test(file.sha256))&&new Set(creationFiles.map(file=>file.sha256)).size===1&&!requests.some(request=>new URL(request.url).pathname.endsWith('/writing-responses.js')));
  }
  check('Writing lazy data bytes stay identical between explorer and report', new Set(loadedFiles.filter(file=>new URL(file.url).pathname.endsWith('/writing-data.js')).map(file=>file.sha256)).size===1);
  check('No browser runtime or network failures', errors.length === 0, JSON.stringify(errors));
  check('No failed HTTP responses', [...responses.values()].every(response => response.status < 400), JSON.stringify([...responses.values()].filter(response => response.status >= 400).map(response => ({url:response.url,status:response.status}))));
  const scoredBranchCoverage = {required:requireScored,completeSettings:scoredCollection.completeSettings,unscoredSettings:scoredCollection.unscoredSettings,tiedRankEntries:scoredCollection.tiedRankEntries,regressionSettings:scoredCollection.regressionSettings,completePanels:caseEvidence.reduce((sum,story)=>sum+story.completePanelResponses,0),singleJudgeResponses:caseEvidence.reduce((sum,story)=>sum+story.singleJudgeResponses,0),scoredPairs:caseEvidence.reduce((sum,story)=>sum+story.scoredPairs,0),regressionPairs:caseEvidence.reduce((sum,story)=>sum+story.regressionPairs,0),tiedPairs:caseEvidence.reduce((sum,story)=>sum+story.tiedPairs,0),efficiency:efficiencyEvidence};
  if (requireScored) check('Scored reports retain complete panels; category efficiency reflects only complete index coverage', scoredBranchCoverage.completePanels > 0 && efficiencyEvidence.every(proof => scoredCollection.completeSettings > 0 ? proof.eligiblePoints > 0 && proof.frontierPoints > 0 : proof.eligiblePoints === 0 && proof.frontierPoints === 0), JSON.stringify(scoredBranchCoverage));
  const receipt = { kind:'vasirbenchmark-writing-browsercheck',schemaVersion:1,status:'passed',benchmarkId:writing.benchmarks[0],trialCount:writing.trialCount,url:baseUrl.href,width,height,harnessSha256,overallSha256,coverage,categoryEvidence,provisionalArchiveEvidence,...(isCreation?{creationArchiveEvidence,creationExpandedEvidence}:{}),checks,caseEvidence,scoredBranchCoverage,progressEvidence,promptArchive,savedAnswer,savedExecution,loadedFiles,screenshots,failureScreenshots,errors,completedAt:new Date().toISOString() };
  fs.writeFileSync(path.join(output, 'writing-browsercheck.json'), `${JSON.stringify(receipt,null,2)}\n`);
  process.stdout.write(`${JSON.stringify({status:'passed',checks:checks.length,cases:caseEvidence.length,width,height,receipt:path.join(output,'writing-browsercheck.json')})}\n`);
  }
} catch (error) {
  fs.writeFileSync(path.join(output, 'writing-browsercheck.json'), `${JSON.stringify({kind:'vasirbenchmark-writing-browsercheck',schemaVersion:1,status:'failed',url:baseUrl.href,width,height,harnessSha256,checks,screenshots,failureScreenshots,errors,error:error.stack},null,2)}\n`);
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), delay(2000)]);
  if (chrome.exitCode === null) chrome.kill('SIGKILL');
  fs.rmSync(profile, { recursive: true, force: true });
}

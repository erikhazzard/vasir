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
  check(`${name}: no horizontal page overflow`, result.scroll <= result.viewport + 1, JSON.stringify(result));
};
const verifyWritingProgress = async scope => {
  const proof = await evaluate(`(() => {
    const data=window.VASIR_WRITING, coverage=data.coverage, element=document.querySelector('[data-writing-progress]');
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
    if(status!==(excluded?'FINAL SNAPSHOT · '+coverage.terminallyExcludedPairCount+' EXCLUDED '+(coverage.terminallyExcludedPairCount===1?'PAIR':'PAIRS'):inProgress?'IN PROGRESS':'COMPLETE SNAPSHOT')) mismatches.push('progress-status');
    if(Object.keys(expected).some(key=>counts[key]!==expected[key])) mismatches.push('progress-counts');
    if(inProgress && !disclosure.includes('Judging incomplete; available answers and reviews are published.')) mismatches.push('incomplete-disclosure');
    if(!disclosure.includes('Incomplete configurations are not ranked.') || !disclosure.includes('Case scores require the full judge panel.')) mismatches.push('ranking-disclosure');
    if(failures && !excluded && !disclosure.includes(failures+' failed generations are retained; planned totals include unavailable slots.')) mismatches.push('failed-slot-disclosure');
    if(excluded) {
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
  check('Overall loads without Writing data or answer bundles', !initial.lazy && !requests.some(request => /\/writing-(?:data|responses)\.js$/.test(new URL(request.url).pathname)));
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
    const rows=[...document.querySelectorAll('#capability-ranking .setting-row')];
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
  const writingLayout=await layout();
  check('Writing paired rows reuse Overall typography', !proof.visibleSettingIds.length || (writingLayout?.font===overallLayout?.font && writingLayout?.fontSize===overallLayout?.fontSize), JSON.stringify({overallLayout,writingLayout}));
  await noOverflow('Writing category leaderboard');
  await capture('writing-models.png');
  await evaluate('document.querySelector("#capability-ranking .score-axis-header")?.scrollIntoView({block:"start",behavior:"instant"})');
  await capture('writing-stacked-rows.png');
  const expand = await evaluate('!!document.querySelector("#show-all") && document.querySelectorAll("#capability-ranking .setting-row").length<window.VASIR_WRITING_CATEGORY.coverage.completedSettingCount');
  if(expand)await click('#show-all');
  check('Every published setting remains inspectable, without ranking coverage gaps', await evaluate(`document.querySelectorAll('#capability-ranking .setting-row').length===${proof.completeSettings} && document.querySelectorAll('[data-writing-coverage-gaps] [data-incomplete-setting-id]').length===${proof.unscoredSettings}`));
  const inspectId=await evaluate('document.querySelector("[data-incomplete-setting-id]")?.dataset.incompleteSettingId || document.querySelector("#capability-ranking .setting-row")?.dataset.settingId || null');
  if(inspectId){
    await evaluate('(() => {const details=document.querySelector("[data-writing-coverage-gaps]");if(details)details.open=true;})()');
    await click(`#capability-ranking .setting-row__select[data-entry-id="${inspectId}-skill"]`);
    check('Selecting a setting opens every available benchmark answer link with its original case and trial route',await evaluate(`(() => {const id=${JSON.stringify(inspectId)},data=window.VASIR_WRITING_CATEGORY,panel=document.querySelector('#capability-ranking [data-writing-selected-setting]');const publications=data.writingCategory.publications.filter(publication=>publication.settings.some(setting=>setting.id===id));const links=[...panel.querySelectorAll('[data-writing-answer-benchmark]')];return panel.dataset.writingSelectedSetting===id&&links.length===publications.length&&publications.every(publication=>{const link=links.find(link=>link.dataset.writingAnswerBenchmark===publication.benchmarks[0].id),url=link&&new URL(link.href);return url&&url.searchParams.get('setting')===id&&url.hash==='#'+publication.benchmarks[0].id+'/'+publication.cases[0].id+((publication.trialCount || 1)>1?'/trial-1':'');});})()`));
  }
  const segment=await evaluate('document.querySelector("#capability-ranking [data-writing-group-id]")?.dataset.writingGroupId || null');
  if(segment){await click(`#capability-ranking [data-writing-group-id="${segment}"]`);check('A stacked group segment opens category Benchmark tests',await evaluate('location.hash==="#capabilities/writing/benchmarks" && !document.querySelector("#capability-benchmarks").hidden'));}
  else await click('[data-capability-mode=benchmarks]');
  check('Category Benchmark tests includes every published benchmark with unchanged field means and report links', await evaluate(`(() => {const root=window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING;const publications=[root,...(root.benchmarkPublications || []).map(item=>item.projection),...Object.values(root.additionalBenchmarks || {})];const rows=[...document.querySelectorAll('#capability-benchmarks .benchmark-ledger__row')];const format=value=>Number.isFinite(value)?value.toFixed(1):'—';return rows.length===publications.length&&publications.every(publication=>{const summary=publication.benchmarkSummaries[0],row=rows.find(row=>row.dataset.benchmarkId===summary.benchmarkId);return row&&row.dataset.baselineScore===format(summary.baseline)&&row.dataset.treatmentScore===format(summary.treatment)&&row.href.includes('benchmark-report.html#'+summary.benchmarkId);});})()`));
  await noOverflow('Writing category benchmarks');
  await capture('writing-benchmarks.png');
  await click('[data-capability-mode=efficiency]');
  await waitFor(()=>evaluate('!document.querySelector("#capability-efficiency").hidden && !!document.querySelector("#efficiency-view").textContent'),'Writing category efficiency');
  const efficiencyEvidence=[];
  for(const metric of ['latency','tokens']){
    await evaluate(`(() => {const axis=document.querySelector('#resource-axis');axis.value=${JSON.stringify(metric)};axis.dispatchEvent(new Event('change',{bubbles:true}));const entry=window.VASIR_WRITING_CATEGORY.entries.find(entry=>Number.isFinite(entry.score)&&Number.isFinite(entry[${JSON.stringify(metric)}])&&entry[${JSON.stringify(metric)}]>0);if(entry){const select=document.querySelector('#efficiency-entry');select.value=entry.id;select.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
    const efficiency=await evaluate(`(() => {const metric=${JSON.stringify(metric)},data=window.VASIR_WRITING_CATEGORY,eligible=data.entries.filter(entry=>Number.isFinite(entry.score)&&Number.isFinite(entry[metric])&&entry[metric]>0),frontier=eligible.filter(entry=>!eligible.some(other=>other.score>=entry.score&&other[metric]<=entry[metric]&&(other.score>entry.score||other[metric]<entry[metric]))),points=[...document.querySelectorAll('[data-plot-point]')],mismatches=[];if(points.length!==eligible.length)mismatches.push('point-count');for(const point of points){const entry=eligible.find(entry=>entry.id===point.dataset.entryId);if(!entry||point.dataset.score!==entry.score.toFixed(1)||Number(point.dataset.resource)!==entry[metric]||point.dataset.frontier!==String(frontier.some(other=>other.id===entry.id)))mismatches.push('point-evidence');if(!['plotX','plotY'].every(key=>Number.isFinite(Number(point.dataset[key]))&&Number(point.dataset[key])>=0&&Number(point.dataset[key])<=100))mismatches.push('point-geometry');}return {metric,eligiblePoints:eligible.length,frontierPoints:frontier.length,mismatches};})()`);
    check(`Category ${metric} efficiency shows only complete finite scores and recorded resources`,!efficiency.mismatches.length,JSON.stringify(efficiency));
    efficiencyEvidence.push(efficiency);
    await noOverflow(`Writing category ${metric} efficiency`);
    await capture(metric==='latency'?'writing-efficiency.png':'writing-efficiency-tokens.png');
  }
  // Bookmarked subsection URLs and the old query still reach the same category.
  for(const alias of ['capabilities/writing/storytelling/benchmarks','capabilities/writing/dungeon-master/benchmarks']){
    await navigate(pageUrl('index.html',alias),'window.VASIR_WRITING_CATEGORY && document.querySelector("#capability-benchmarks:not([hidden])")');
    check(`Legacy ${alias} preserves the full category`,await evaluate(`location.hash==='#capabilities/writing/benchmarks' && JSON.stringify(window.VASIR_WRITING_CATEGORY.benchmarks.map(item=>item.id).sort())===${JSON.stringify(JSON.stringify([...proof.benchmarkIds].sort()))}`));
  }
  return {...proof,efficiencyEvidence};
};

const verifyDungeonMaster = async () => {
  const benchmarkId = 'dungeon-master-adventure-outline';
  const dataExpression = `(window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING).additionalBenchmarks[${JSON.stringify(benchmarkId)}]`;
  const responsesExpression = `(window.VASIR_WRITING_RESPONSES_COLLECTION || window.VASIR_WRITING_RESPONSES).additionalBenchmarks[${JSON.stringify(benchmarkId)}]`;
  const categoryEvidence=await verifyWritingCategory();
  const raw=await evaluate(`({data:${dataExpression},descriptor:window.VASIR_DATA.writing.additionalBenchmarks?.[${JSON.stringify(benchmarkId)}]})`);
  check('Dungeon Master is registered as a separate benchmark group',raw.descriptor?.subcategory==='dungeon-master');
  await navigate(pageUrl('benchmark-report.html',benchmarkId+'/'+raw.data.cases[0].id),`document.querySelector('[data-writing-case]') && document.querySelector('[data-writing-rubric]') && (window.VASIR_WRITING_RESPONSES_COLLECTION || window.VASIR_WRITING_RESPONSES)?.additionalBenchmarks?.[${JSON.stringify(benchmarkId)}]`);
  const inventory=await evaluate(`(() => {const data=${dataExpression};return {benchmarkId:data.benchmarks[0].id,coverage:data.coverage,cases:data.cases.map(story=>({id:story.id,sourceCaseId:story.sourceCaseId,trialNumber:story.trialNumber,cohort:story.cohort})),dimensions:data.scoreBasis.dimensions.length,ratingMinimum:data.scoreBasis.ratingMinimum,ratingMaximum:data.scoreBasis.ratingMaximum,judges:data.scoreBasis.judgeCount,overall:JSON.stringify(window.VASIR_DATA.overall),settings:data.settings.map(setting=>({configurationId:setting.configurationId,reasoning:setting.reasoning})),primaryPrompt:document.querySelector('[data-primary-question]').textContent};})()`);
  check('Dungeon Master retains its six dimensions, two judges and exact primary prompt',inventory.dimensions===6&&inventory.ratingMinimum===0&&inventory.ratingMaximum===5&&inventory.judges===2&&inventory.primaryPrompt==='create an outline for TTRPG adventure');
  check('Dungeon Master preserves all sixteen pairs and thirty-two planned outputs',inventory.cases.length===16&&inventory.cases.filter(story=>story.cohort==='primary').length===6&&new Set(inventory.cases.map(story=>story.sourceCaseId)).size===6&&inventory.coverage.expectedResponseCount===32&&inventory.coverage.expectedJudgmentCount===64);
  check('Dungeon Master uses the declared Astra Ultra setting',inventory.settings.length===1&&inventory.settings[0].configurationId==='codex:gpt-6-astra@ultra'&&inventory.settings[0].reasoning==='ultra');
  check('Dungeon Master report keeps Overall unchanged',sha256(inventory.overall)===overallSha256);
  if(requireScored)check('Dungeon Master scored snapshot contains both reviews of every answer',inventory.coverage.responseCount===32&&inventory.coverage.scoredResponseCount===32&&inventory.coverage.judgmentCount===64);
  const verifyCohorts = async scope => {
    const proof = await evaluate(`(() => {
      const data=${dataExpression};
      const format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      const signed=value=>!Number.isFinite(value)?'—':value>0?'+'+value.toFixed(1):value<0?'−'+Math.abs(value).toFixed(1):'±0.0';
      const round=value=>Math.round((value+Number.EPSILON)*10)/10;
      const predicates={primary:story=>story.cohort==='primary',transfer:story=>story.cohort==='transfer',fantasyTransfer:story=>story.cohort==='transfer'&&story.genre==='fantasy',otherGenreTransfer:story=>story.cohort==='transfer'&&story.genre!=='fantasy'};
      const mismatches=[];
      for(const [id,predicate] of Object.entries(predicates)) {
        const cohort=data.cohortSummaries[id],element=document.querySelector('[data-writing-cohort="'+id+'"]');
        const cases=data.cases.filter(predicate);
        const pairs=cases.map(story=>({baseline:data.caseResults.find(cell=>cell.caseId===story.id&&cell.condition==='baseline')?.exactScore,skill:data.caseResults.find(cell=>cell.caseId===story.id&&cell.condition==='skill')?.exactScore})).filter(pair=>Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill));
        const mean=key=>pairs.length?round(pairs.reduce((sum,pair)=>sum+key(pair),0)/pairs.length):null;
        if(cohort.baseline!==mean(pair=>pair.baseline)||cohort.treatment!==mean(pair=>pair.skill)||cohort.delta!==mean(pair=>pair.skill-pair.baseline)||cohort.usablePairs!==pairs.length||cohort.expectedPairs!==cases.length)mismatches.push(id+':arithmetic');
        if(!element||element.querySelector('[data-cohort-baseline]').textContent!==format(cohort.baseline)||element.querySelector('[data-cohort-treatment]').textContent!==format(cohort.treatment)||element.querySelector('[data-cohort-delta]').textContent!==signed(cohort.delta)||element.querySelector('[data-cohort-coverage]').textContent!==cohort.usablePairs+'/'+cohort.expectedPairs+(cohort.complete?'':' · incomplete'))mismatches.push(id+':display');
      }
      const primary=data.cohortSummaries.primary;
      if(data.entries.some(entry=>entry.score!==(primary.complete?(entry.condition==='baseline'?primary.baseline:primary.treatment):null)))mismatches.push('primary-headline');
      return mismatches;
    })()`);
    check(`Dungeon Master ${scope}: separate primary and secondary arithmetic`, !proof.length, JSON.stringify(proof));
  };
  await verifyCohorts('report');
  const categoryReturn=await evaluate('document.querySelector(".report-context__back").href');
  check('Dungeon Master report returns to Writing benchmark tests',new URL(categoryReturn).hash.endsWith('/benchmarks')&&new URL(categoryReturn).hash.startsWith('#capabilities/writing'));
  const caseEvidence = [];
  for (const story of inventory.cases) {
    await evaluate(`(() => {const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(story.id)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(() => evaluate(`document.querySelector('#report-page').dataset.activeWritingCase===${JSON.stringify(story.id)}`), `Dungeon Master ${story.id}`);
    const proof = await evaluate(`(() => {
      const data=${dataExpression},archive=${responsesExpression},caseId=${JSON.stringify(story.id)};
      const story=data.cases.find(story=>story.id===caseId),answers=archive.responses.filter(response=>response.caseId===caseId),mismatches=[];
      const format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      if(document.querySelector('[data-writing-case-title]').textContent!==story.title||!document.querySelector('[data-exact-question]').textContent.endsWith(story.prompt))mismatches.push('case-and-task');
      for(const answer of answers) {
        const panel=document.querySelector('[data-report-setting-id="'+answer.settingId+'"] [data-condition="'+answer.condition+'"]');
        if(!panel||(panel.querySelector('[data-output-text]')?.textContent||'')!==answer.outputText)mismatches.push('exact-answer:'+answer.condition);
        if(panel.querySelector('.model-run__condition-score').textContent.trim()!==format(answer.score))mismatches.push('answer-score:'+answer.condition);
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
    check(`Dungeon Master ${story.id}: exact answers, ratings, evidence and preferences`, proof.answers === 2 && !proof.mismatches.length, JSON.stringify(proof));
    caseEvidence.push(proof);
  }
  check('Dungeon Master renders every 0–5 rubric anchor exactly', await evaluate(`(() => {const data=${dataExpression};return document.querySelectorAll('[data-rubric-dimension]').length===6&&data.scoreBasis.dimensions.every(dimension=>Object.entries(dimension.anchors).every(([rating,anchor])=>document.querySelector('[data-rubric-dimension="'+dimension.id+'"] [data-rubric-anchor="'+rating+'"]')?.textContent===anchor));})()`));
  const promptArchive = await evaluate(`(${responsesExpression}.promptFiles||[]).map(file=>({id:file.id,characters:file.content.length}))`);
  for (const file of promptArchive) {
    await click(`[data-prompt-file="${file.id}"] > summary`);
    check(`Dungeon Master archive ${file.id}: exact content opens`, await evaluate(`(() => {const element=document.querySelector('[data-prompt-file="${file.id}"]'),file=${responsesExpression}.promptFiles.find(file=>file.id===${JSON.stringify(file.id)});return element.open&&element.querySelector('[data-prompt-file-content]').textContent===file.content;})()`));
    await noOverflow('Dungeon Master archived reference');
    await click(`[data-prompt-file="${file.id}"] > summary`);
  }
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);
  await noOverflow('Dungeon Master report');
  await capture('dungeon-master-report.png');
  await click('[data-report-section=method]');
  await noOverflow('Dungeon Master method');
  await capture('dungeon-master-method.png');
  await navigate(categoryReturn,'window.VASIR_WRITING_CATEGORY && document.querySelector("#capability-benchmarks:not([hidden])")');
  check('Dungeon Master report back link reaches the complete Writing category',await evaluate(`location.hash==='#capabilities/writing/benchmarks'&&document.querySelectorAll('#capability-benchmarks .benchmark-ledger__row').length===${categoryEvidence.benchmarkIds.length}`));
  return { benchmarkId, coverage: inventory.coverage, caseEvidence, promptArchive,categoryEvidence };
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
      if (response && /\/(?:app|benchmark-report|writing-data|writing-responses)\.js$/.test(new URL(response.url).pathname)) {
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
  check('Selected model opens directly in the report', await evaluate(`document.querySelector('[data-report-setting-id="${chosenSettingId}"] .model-run').open`));
  check('Writing report does not load unrelated response bundles', await evaluate('!window.VASIR_RESPONSES'));
  await verifyWritingProgress('report');
  check('Writing case metadata and answer archive share the same pinned source', await evaluate(`(() => { const data=window.VASIR_WRITING, evidence=window.VASIR_WRITING_RESPONSES;return evidence.responses.filter(response=>response.outputText.length).length===data.coverage.responseCount && evidence.responses.every(response=>{ const cell=data.caseResults.find(cell=>cell.caseId===response.caseId && cell.settingId===response.settingId && cell.condition===response.condition && (cell.trialNumber || 1)===(response.trialNumber || 1));return response.provenance.sourceSha256===data.scoreBasis.sourceSha256 && cell?.status===response.status && cell.score===response.score && cell.wordCount===response.wordCount && cell.failureReason===response.failureReason;}); })()`));
  const verifyCase = async (caseId, trialNumber = 1) => {
    const proof = await evaluate(`(() => {
      const data=window.VASIR_WRITING, evidence=window.VASIR_WRITING_RESPONSES;
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
            if(!file || (reference==='SKILL.md'?file.id!=='frozen-skill-root':!file.title.startsWith(reference+' · '))) mismatches.push('runtime-reference-archive-link');
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
            if(reading && (cells[0].textContent!==String(reading.rating) || cells[1].textContent!==(reading.reason || '—'))) mismatches.push('dimension-evidence');
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
        const rank=Number.isFinite(pair.skill)?1+pairs.filter(other=>Number.isFinite(other.skill)&&other.skill>pair.skill).length:null;
        const delta=Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill)?round(pair.skill-pair.baseline):null;
        const summary=row.querySelector('.model-preview__row');
        if(summary.querySelector('.model-preview__identity small').textContent!==(rank?'Storytelling skill rank #'+rank+' of '+data.settings.length:'Panel total not assessable')) mismatches.push('story-rank');
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
  check('Writing lazy data bytes stay identical between explorer and report', new Set(loadedFiles.filter(file=>new URL(file.url).pathname.endsWith('/writing-data.js')).map(file=>file.sha256)).size===1);
  check('No browser runtime or network failures', errors.length === 0, JSON.stringify(errors));
  check('No failed HTTP responses', [...responses.values()].every(response => response.status < 400), JSON.stringify([...responses.values()].filter(response => response.status >= 400).map(response => ({url:response.url,status:response.status}))));
  const scoredBranchCoverage = {required:requireScored,completeSettings:scoredCollection.completeSettings,unscoredSettings:scoredCollection.unscoredSettings,tiedRankEntries:scoredCollection.tiedRankEntries,regressionSettings:scoredCollection.regressionSettings,completePanels:caseEvidence.reduce((sum,story)=>sum+story.completePanelResponses,0),singleJudgeResponses:caseEvidence.reduce((sum,story)=>sum+story.singleJudgeResponses,0),scoredPairs:caseEvidence.reduce((sum,story)=>sum+story.scoredPairs,0),regressionPairs:caseEvidence.reduce((sum,story)=>sum+story.regressionPairs,0),tiedPairs:caseEvidence.reduce((sum,story)=>sum+story.tiedPairs,0),efficiency:efficiencyEvidence};
  if (requireScored) check('Scored QA exercised complete panels and populated latency/token frontiers', scoredBranchCoverage.completePanels > 0 && efficiencyEvidence.every(proof => proof.eligiblePoints > 0 && proof.frontierPoints > 0), JSON.stringify(scoredBranchCoverage));
  const receipt = { kind:'vasirbenchmark-writing-browsercheck',schemaVersion:1,status:'passed',benchmarkId:writing.benchmarks[0],trialCount:writing.trialCount,url:baseUrl.href,width,height,harnessSha256,overallSha256,coverage,categoryEvidence,checks,caseEvidence,scoredBranchCoverage,progressEvidence,promptArchive,savedAnswer,savedExecution,loadedFiles,screenshots,failureScreenshots,errors,completedAt:new Date().toISOString() };
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

import { chromium } from '/Users/erikhazzard/code/experiments/gizmo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';

const output = '/Users/erikhazzard/code/vasir/tmp/ash-and-echo/landing-pass/audio';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
await page.goto('http://127.0.0.1:8317/');
const baseLand = { type: 'land', x: 210, y: 3976, vx: 0, platformId: 'resonant-stone', landmark: 'resonant-stone', suspended: true };
const gameEvents=JSON.parse(await fs.readFile(output+'/game-events.json','utf8'));
const conditions=gameEvents.map(event=>['height-'+event.height,{...event,...baseLand}]);
const heavy=conditions[3][1];
conditions.push(['same-frame-rebound',{...heavy,sequence:[{after:0,type:'jump',x:210,y:3976,vx:120,landmark:'resonant-stone'}]}],['40ms-rebound',{...heavy,sequence:[{after:.04,type:'jump',x:210,y:3976,vx:120,landmark:'resonant-stone'}]}],['heavy-resonance',{...heavy,resonance:{x:210,y:4002,size:42}}],['heavy-resonance-rebound',{...heavy,resonance:{x:210,y:4002,size:42},sequence:[{after:.04,type:'jump',x:210,y:3976,vx:120,landmark:'resonant-stone'}]}]);
const report = { scope: 'Real Chromium OfflineAudioContext DSP; a scheduling-clock adapter positions isolated event calls. All audio nodes, envelopes, compression, convolution and final sample renders are browser-native. This is objective audio evidence, not a human listening grade.', errors, versions: {} };
function wav(samples, rate = 48000, channels = 2) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * channels * 2, 28); buffer.writeUInt16LE(channels * 2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(buffer.length - 44, 40);
  for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buffer;
}
for (const [version, sourcePath] of [
  ['baseline', '/Users/erikhazzard/code/vasir/tmp/ash-and-echo/landing-pass/baseline/audio.js'],
  ['candidate', '/Users/erikhazzard/code/vasir/site/ash-and-echo/audio.js'],
]) {
  const source = await fs.readFile(sourcePath, 'utf8');
  await fs.writeFile(output+'/'+version+'-audio.js',source);
  const results = [];
  const montage = [];
  for (const [label, event] of conditions) {
    const result = await page.evaluate(async ({ source, event }) => {
      const module = await import('data:text/javascript;base64,' + btoa(source));
      const NativeAudio = globalThis.AudioContext;
      const duration = 5;
      const offline = new OfflineAudioContext(2, duration * 48000, 48000);
      let now = 0;
      let nodes = 0, sources = 0, maxNodes = 0, maxSources = 0;
      const connected = new Set();
      const playing = new Set();
      const nodeIds = new WeakMap(), graph = [], records = [];
      let serial = 0;
      globalThis.AudioContext = function () {
        return new Proxy(offline, {
          get(target, property) {
            if (property === 'currentTime') return now;
            if (property === 'state') return 'running';
            if (['resume', 'suspend', 'close'].includes(property)) return async () => {};
            const value = Reflect.get(target, property, target);
            if (typeof value !== 'function') return value;
            return (...args) => {
              const result = value.apply(target, args);
              if (result instanceof AudioNode) {
                nodes++; maxNodes = Math.max(maxNodes, nodes); connected.add(result);
                const record = { id: ++serial, type: result.constructor.name, automation: [], starts: [], stops: [] };
                nodeIds.set(result, record.id); records.push(record);
                const connect = result.connect.bind(result);
                result.connect = (destination, ...rest) => { graph.push([record.id, nodeIds.get(destination) || 0]); return connect(destination, ...rest); };
                for (const name of ['gain', 'frequency']) if (result[name] instanceof AudioParam) {
                  const parameter = result[name];
                  for (const method of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) {
                    const original = parameter[method].bind(parameter);
                    parameter[method] = (...args) => { record.automation.push({ parameter: name, method, args, at: now }); return original(...args); };
                  }
                }
                const disconnect = result.disconnect.bind(result);
                result.disconnect = (...args) => { if (connected.delete(result)) nodes--; return disconnect(...args); };
                if (result instanceof AudioScheduledSourceNode) {
                  sources++; playing.add(result); maxSources = Math.max(maxSources, sources);
                  const start = result.start.bind(result), stop = result.stop.bind(result);
                  result.start = (...args) => { record.starts.push(args); return start(...args); };
                  result.stop = (...args) => { record.stops.push(args); return stop(...args); };
                  result.addEventListener('ended', () => { if (playing.delete(result)) sources--; });
                }
              }
              return result;
            };
          },
        });
      };
      // Repeatable texture makes changes to the synthesis itself comparable.
      let seed = 123456789;
      const random = Math.random;
      Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
      const audio = module.createAudio();
      audio.emit([event]);
      const silentBeforeUnlock = nodes === 0;
      await audio.unlock();
      const persistentNodes = nodes, persistentSources = sources;
      now = 0.5;
      audio.emit([{ x: 210, intensity: 1, ...event }]);
      for (const next of event.sequence || []) { now = .5 + next.after; audio.emit([next]); }
      const rendered = await offline.startRendering();
      await new Promise(resolve => setTimeout(resolve, 20));
      const afterTail = { nodes, sources };
      const channels = [rendered.getChannelData(0), rendered.getChannelData(1)];
      const packed = new Float32Array(rendered.length * 2);
      let peak = 0, energy = 0, clipped = 0, nonFinite = 0, tailEnergy = 0, tailCount = 0, lastAudible = 0;
      for (let i = 0; i < rendered.length; i++) for (let c = 0; c < 2; c++) {
        const v = channels[c][i]; packed[i * 2 + c] = v;
        peak = Math.max(peak, Math.abs(v)); energy += v * v;
        if (Math.abs(v) >= 0.999) clipped++;
        if (!Number.isFinite(v)) nonFinite++;
        if (Math.abs(v) > 0.001) lastAudible = i / 48000 - 0.5;
        if (i > rendered.length - 24000) { tailEnergy += v * v; tailCount++; }
      }
      audio.dispose();
      await new Promise(resolve => setTimeout(resolve, 20));
      const afterDispose = { nodes, sources };
      const energyTimes = []; let cumulative = 0;
      for (let i=0;i<rendered.length;i++) { cumulative += channels[0][i]**2+channels[1][i]**2; if(energyTimes.length===0&&cumulative>=energy*.9)energyTimes.push(i/48000-.5); }
      const energy90Seconds=energyTimes[0];
      globalThis.AudioContext = NativeAudio; Math.random = random;
      const bytes = new Uint8Array(packed.buffer); let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { pcm: btoa(binary), metrics: { records, graph, energy90Seconds, silentBeforeUnlock, duration, peak, peakDb: 20 * Math.log10(peak), rms: Math.sqrt(energy / packed.length), clipped, nonFinite, lastAudibleSeconds: lastAudible, tailRms: Math.sqrt(tailEnergy / tailCount), persistentNodes, persistentSources, maxNodes, maxSources, afterTail, afterDispose } };
    }, { source, event });
    const buffer = Buffer.from(result.pcm, 'base64');
    const samples = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
    await fs.writeFile(`${output}/${version}-${label}.wav`, wav(samples));
    if (!['checkpoint', 'win'].includes(event.type)) montage.push(samples.subarray(24000, 48000 * 2 * 1.7));
    results.push({ label, event, ...result.metrics });
    console.log(version, label, JSON.stringify({peak:result.metrics.peak,rms:result.metrics.rms,maxSources:result.metrics.maxSources,afterDispose:result.metrics.afterDispose}));
  }
  const combined = new Float32Array(montage.reduce((sum, samples) => sum + samples.length, 0));
  let offset = 0;
  for (const samples of montage) { combined.set(samples, offset); offset += samples.length; }
  await fs.writeFile(`${output}/${version}-movement-reel.wav`, wav(combined));
  report.versions[version] = results;
}
await fs.writeFile(`${output}/render-report.json`, JSON.stringify(report, null, 2));
await browser.close();

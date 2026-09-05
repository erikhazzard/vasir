// The cathedral is a quiet instrument. Movement stays close and dry; rare
// milestones are allowed to ring into the space. No assets or running timers.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const PITCH = { E2: 82.407, B2: 123.471, E3: 164.814, G3: 195.998, B3: 246.942, E4: 329.628, G4: 391.995, B4: 493.883 };
const COOLDOWN = { jump: 0.07, wallJump: 0.07, doubleJump: 0.1, land: 0.075, death: 0.35, respawn: 0.3, checkpoint: 0.8, win: 3 };

export function createAudio() {
  let context = null;
  let master, ambience, room, effects, noiseBuffer, choirWave, rush, scrape;
  let muted = false;
  let disposed = false;
  let unavailable = false;
  let visibilityRevision = 0;
  let nextBell = 0;
  let nextUpdate = 0;
  let duckUntil = 0;
  let activeSources = 0;
  const documentRef = globalThis.document;
  const persistent = [];
  const drones = [];
  const winds = [];
  const voices = new Set();
  const lastEvent = Object.create(null);

  function smooth(parameter, value, time = 0.12) {
    parameter.setTargetAtTime(value, context.currentTime, time);
  }

  function makeNoise(seconds, channels, reverberant = false) {
    const buffer = context.createBuffer(channels, Math.ceil(context.sampleRate * seconds), context.sampleRate);
    for (let channel = 0; channel < channels; channel++) {
      const data = buffer.getChannelData(channel);
      let low = 0;
      for (let index = 0; index < data.length; index++) {
        // A little correlated noise takes the sandpaper edge off the wind.
        const white = Math.random() * 2 - 1;
        low = low * 0.73 + white * 0.27;
        const t = index / context.sampleRate;
        data[index] = (low * 0.7 + white * 0.3) * (reverberant
          ? Math.exp(-t * 2.7) * Math.min(1, t / 0.025)
          : 0.75);
      }
    }
    return buffer;
  }

  function panner(pan) {
    const node = context.createStereoPanner();
    node.pan.value = pan;
    return node;
  }

  function continuousNoise(frequency, q, pan, destination) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const stereo = panner(pan);
    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(stereo).connect(destination);
    source.start(0, Math.random() * noiseBuffer.duration);
    persistent.push(source, filter, gain, stereo);
    return { filter, gain, stereo };
  }

  function initialize() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) { unavailable = true; return; }
    context = new AudioContextClass({ latencyHint: 'interactive' });
    master = context.createGain();
    master.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -15;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    const ceiling = context.createWaveShaper();
    // A final soft ceiling keeps even simultaneous milestones below full scale.
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) {
      const x = i * 2 / (curve.length - 1) - 1;
      curve[i] = 0.9 * Math.tanh(x / 0.9);
    }
    ceiling.curve = curve;
    compressor.connect(ceiling).connect(master).connect(context.destination);

    effects = context.createGain();
    ambience = context.createGain();
    effects.gain.value = 0.85;
    ambience.gain.value = 0;
    effects.connect(compressor);
    ambience.connect(compressor);
    room = context.createGain();
    const reverb = context.createConvolver();
    const roomFilter = context.createBiquadFilter();
    const roomOutput = context.createGain();
    reverb.buffer = makeNoise(2.8, 2, true);
    roomFilter.type = 'lowpass';
    roomFilter.frequency.value = 2300;
    roomOutput.gain.value = 0.31;
    room.connect(reverb).connect(roomFilter).connect(roomOutput).connect(compressor);
    // The ambience has a little shared space; action sends are per voice.
    const airSend = context.createGain();
    airSend.gain.value = 0.22;
    ambience.connect(airSend).connect(room);
    persistent.push(master, compressor, ceiling, effects, ambience, room, reverb, roomFilter, roomOutput, airSend);
    noiseBuffer = makeNoise(3.7, 1);
    choirWave = context.createPeriodicWave(
      new Float32Array(9),
      new Float32Array([0, 1, 0.2, 0.31, 0.08, 0.13, 0.035, 0.04, 0.015]),
    );

    const notes = [PITCH.E2, PITCH.B2, PITCH.E3, PITCH.G3, PITCH.B3];
    for (let i = 0; i < notes.length; i++) {
      const source = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const stereo = panner((i - 2) * 0.16);
      source.setPeriodicWave(choirWave);
      source.frequency.value = notes[i];
      source.detune.value = i % 2 ? -2 : 2;
      filter.type = 'lowpass';
      filter.frequency.value = 380 + i * 130;
      filter.Q.value = 0.5;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(stereo).connect(ambience);
      source.start();
      drones.push({ source, filter, gain });
      persistent.push(source, filter, gain, stereo);
    }
    winds.push(continuousNoise(340, 0.7, -0.45, ambience));
    winds.push(continuousNoise(930, 0.6, 0.45, ambience));
    rush = continuousNoise(740, 0.65, 0, effects);
    scrape = continuousNoise(1300, 1.1, 0, effects);
    nextBell = context.currentTime + 9;
  }

  function release(voice) {
    if (!voices.delete(voice)) return;
    activeSources -= voice.sourceCount;
    for (const node of voice.nodes) node.disconnect();
  }

  function voice(pan, wet, volume, count) {
    // Drop excess sound rather than growing a queue or interrupting a tail.
    if (voices.size >= 18 || activeSources + count > 48) return null;
    const gain = context.createGain();
    const stereo = panner(pan);
    const send = context.createGain();
    gain.gain.value = volume;
    send.gain.value = wet;
    gain.connect(stereo).connect(effects);
    stereo.connect(send).connect(room);
    const result = { gain, nodes: [gain, stereo, send], sourceCount: count, remaining: count };
    voices.add(result);
    activeSources += count;
    return result;
  }

  function envelope(parameter, start, duration, level, attack) {
    parameter.setValueAtTime(0, start);
    parameter.linearRampToValueAtTime(level, start + attack);
    parameter.exponentialRampToValueAtTime(0.00001, start + duration);
    parameter.linearRampToValueAtTime(0, start + duration + 0.025);
  }

  function playSource(group, source, nodes, start, duration) {
    group.nodes.push(source, ...nodes);
    source.onended = () => {
      source.onended = null;
      if (--group.remaining === 0) release(group);
    };
    source.start(start);
    source.stop(start + duration + 0.035);
  }

  function tone(group, frequency, endFrequency, start, duration, level, attack = 0.008, waveform = 'sine') {
    const source = context.createOscillator();
    const gain = context.createGain();
    if (waveform === 'choir') source.setPeriodicWave(choirWave);
    else source.type = waveform;
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(endFrequency, start + Math.min(duration * 0.65, 0.25));
    envelope(gain.gain, start, duration, level, attack);
    source.connect(gain).connect(group.gain);
    playSource(group, source, [gain], start, duration);
  }

  function breath(group, frequency, endFrequency, start, duration, level, attack = 0.004) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, start);
    filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    filter.Q.value = 0.65;
    envelope(gain.gain, start, duration, level, attack);
    source.connect(filter).connect(gain).connect(group.gain);
    playSource(group, source, [filter, gain], start, duration);
  }

  function bell(frequency, pan, volume, now, duration = 3.8) {
    const group = voice(pan, 0.9, volume, 3);
    if (!group) return;
    tone(group, frequency, frequency * 0.999, now, duration, 0.13, 0.015);
    tone(group, frequency * 2.006, frequency * 2, now, duration * 0.58, 0.039, 0.011);
    tone(group, frequency * 2.756, frequency * 2.75, now, duration * 0.31, 0.014, 0.006);
  }

  async function unlock() {
    if (disposed || unavailable) return false;
    try {
      if (!context) initialize();
      if (!context || documentRef?.hidden) return false;
      if (context.state !== 'running') await context.resume();
      if (disposed || documentRef?.hidden) return false;
      smooth(master.gain, muted ? 0 : 0.78, 0.12);
      smooth(ambience.gain, 0.7, 1.2);
      return context.state === 'running';
    } catch {
      // Audio is optional. A later gesture may retry a browser-blocked resume.
      return false;
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (context && !disposed) smooth(master.gain, muted || documentRef?.hidden ? 0 : 0.78, 0.06);
  }

  function emit(events) {
    if (!context || disposed || muted || documentRef?.hidden || context.state !== 'running') return;
    const now = context.currentTime + 0.004;
    for (const event of events) {
      const cooldown = COOLDOWN[event.type];
      if (!cooldown || now - (lastEvent[event.type] ?? -100) < cooldown) continue;
      lastEvent[event.type] = now;
      const pan = clamp(((event.x ?? 210) / 420 - 0.5) * 0.9, -0.45, 0.45);
      const strength = clamp(Number.isFinite(event.intensity) ? event.intensity : 1, 0.25, 1.4);
      const variation = 0.97 + Math.random() * 0.06;
      if (event.type === 'checkpoint') {
        bell(PITCH.E4, pan - 0.08, 0.9, now, 3.8);
        bell(PITCH.B4, pan + 0.12, 0.58, now + 0.19, 4.2);
        duckUntil = now + 0.8;
        continue;
      }
      if (event.type === 'win') {
        const group = voice(0, 0.9, 0.9, 5);
        if (!group) continue;
        [PITCH.E3, PITCH.B3, PITCH.E4, PITCH.G4, PITCH.B4].forEach((pitch, index) => {
          tone(group, pitch * 0.999, pitch, now + index * 0.12, 4.6, 0.072 - index * 0.008, 0.3, 'choir');
        });
        duckUntil = now + 2.5;
        nextBell = now + 18;
        continue;
      }
      const wet = event.type === 'doubleJump' || event.type === 'respawn' ? 0.65 : 0.25;
      const group = voice(pan, wet, 0.85, 3);
      if (!group) continue;
      switch (event.type) {
        case 'jump':
          tone(group, 152 * variation, 88, now, 0.18, 0.14, 0.004, 'triangle');
          tone(group, 248 * variation, 170, now, 0.14, 0.035);
          breath(group, 1250, 490, now, 0.14, 0.2);
          break;
        case 'wallJump':
          tone(group, 194 * variation, 105, now, 0.19, 0.15, 0.004, 'triangle');
          tone(group, 370 * variation, 210, now, 0.1, 0.035);
          breath(group, 1800, 540, now, 0.19, 0.25);
          break;
        case 'doubleJump':
          tone(group, PITCH.E4 * 0.82, PITCH.E4, now, 0.48, 0.085, 0.018);
          tone(group, PITCH.B4 * 0.87, PITCH.B4, now + 0.018, 0.39, 0.043, 0.03);
          breath(group, 550, 2400, now, 0.32, 0.25, 0.025);
          break;
        case 'land':
          tone(group, 104 * variation, 47, now, 0.22, 0.21 * strength, 0.004);
          tone(group, 171 * variation, 95, now, 0.11, 0.045 * strength, 0.003, 'triangle');
          breath(group, 700 + strength * 300, 260, now, 0.18 + strength * 0.07, 0.23 * strength);
          break;
        case 'death':
          tone(group, 96, 38, now, 0.8, 0.2, 0.012);
          tone(group, 174, 82, now, 0.65, 0.085, 0.015, 'triangle');
          breath(group, 1950, 170, now, 0.72, 0.36, 0.014);
          duckUntil = now + 1;
          smooth(ambience.gain, 0.2, 0.025);
          break;
        case 'respawn':
          tone(group, PITCH.E3, PITCH.E3, now, 1, 0.058, 0.13);
          tone(group, PITCH.B3, PITCH.B3, now, 0.8, 0.026, 0.15);
          breath(group, 430, 1050, now, 0.62, 0.14, 0.12);
          break;
      }
    }
  }

  function update(game, dt) {
    if (!context || disposed || context.state !== 'running' || documentRef?.hidden) return;
    const now = context.currentTime;
    // AudioParam ramps bridge these sparse control updates without zipper noise.
    if (now < nextUpdate) return;
    nextUpdate = now + 0.08;
    const altitude = clamp((game.maxAltitude || 0) / Math.max(1, (game.height || 4000) - (game.viewportHeight || 0)), 0, 1);
    const playing = game.state === 'playing';
    const player = game.player;
    smooth(ambience.gain, now < duckUntil ? 0.3 : playing ? 0.86 : 0.65, 0.6);
    for (let i = 0; i < drones.length; i++) {
      const swell = 0.68 + Math.sin(now * (0.115 + i * 0.014) + i * 1.7) * 0.22;
      smooth(drones[i].gain.gain, (i < 2 ? 0.031 : 0.018) * swell * (i > 2 ? 0.45 + altitude * 0.55 : 1), 0.8);
      smooth(drones[i].filter.frequency, 330 + i * 130 + altitude * 550 + Math.sin(now * 0.085 + i) * 110, 1.2);
      smooth(drones[i].source.detune, Math.sin(now * 0.13 + i * 2) * 3, 0.7);
    }
    for (let i = 0; i < winds.length; i++) {
      smooth(winds[i].gain.gain, 0.052 + Math.sin(now * (0.19 + i * 0.08) + i * 3) * 0.02, 0.7);
      smooth(winds[i].filter.frequency, (i ? 850 : 330) + altitude * 150 + Math.sin(now * 0.13 + i) * 110, 0.8);
    }
    const speed = playing && player ? clamp(Math.abs(player.vy) / 800, 0, 1) : 0;
    smooth(rush.gain.gain, speed * speed * 0.095, 0.1);
    smooth(rush.filter.frequency, 540 + speed * 1200, 0.16);
    const sliding = playing && player && player.wallDir && !player.grounded && player.vy > 20;
    smooth(scrape.gain.gain, sliding ? 0.042 : 0, 0.065);
    if (player) {
      const pan = clamp((player.x / 420 - 0.5) * 0.7, -0.35, 0.35);
      smooth(rush.stereo.pan, pan, 0.15);
      smooth(scrape.stereo.pan, pan, 0.1);
    }
    if (!muted && now > nextBell && now > duckUntil) {
      const pitch = Math.random() < 0.65 ? PITCH.E4 : PITCH.B3;
      bell(pitch, (Math.random() - 0.5) * 0.85, 0.18, now + 0.02, 4.6);
      nextBell = now + 14 + Math.random() * 13;
    }
  }

  async function onVisibilityChange() {
    const revision = ++visibilityRevision;
    if (!context || disposed) return;
    try {
      if (documentRef.hidden) {
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setValueAtTime(0, context.currentTime);
        await context.suspend();
      } else {
        await context.resume();
        if (disposed || revision !== visibilityRevision || documentRef.hidden) return;
        nextBell = context.currentTime + 6 + Math.random() * 7;
        smooth(master.gain, muted ? 0 : 0.78, 0.15);
      }
    } catch { /* A browser interruption is retried at the next user gesture. */ }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    visibilityRevision++;
    documentRef?.removeEventListener('visibilitychange', onVisibilityChange);
    if (!context) return;
    for (const group of voices) {
      for (const node of group.nodes) {
        if ('stop' in node) { try { node.stop(); } catch { /* Already ended. */ } }
        node.disconnect();
      }
    }
    voices.clear();
    for (const node of persistent) {
      if ('stop' in node) { try { node.stop(); } catch { /* Already ended. */ } }
      node.disconnect();
    }
    persistent.length = 0;
    drones.length = 0;
    winds.length = 0;
    context.close().catch(() => {});
  }

  documentRef?.addEventListener('visibilitychange', onVisibilityChange);
  return { unlock, setMuted, emit, update, dispose };
}

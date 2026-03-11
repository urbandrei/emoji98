// ========== Sound Effects (Web Audio API) ==========

let ctx = null;
let master = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.3;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function getMaster() {
  getCtx();
  return master;
}

function tone(freq, duration, type = "sine", vol = 1) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

function sweep(startFreq, endFreq, duration, type = "sine", vol = 1) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = startFreq;
  osc.frequency.linearRampToValueAtTime(endFreq, c.currentTime + duration);
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

function noise(duration, vol = 0.3) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const gain = c.createGain();
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  src.connect(gain);
  gain.connect(getMaster());
  src.start(c.currentTime);
}

// UI sounds
export function playClick() {
  noise(0.02, 0.15);
}

export function playWindowOpen() {
  const c = getCtx();
  tone(350, 0.06, "sine", 0.4);
  setTimeout(() => tone(500, 0.06, "sine", 0.3), 40);
}

export function playWindowClose() {
  const c = getCtx();
  tone(480, 0.06, "sine", 0.3);
  setTimeout(() => tone(320, 0.06, "sine", 0.3), 40);
}

export function playMenuOpen() {
  tone(440, 0.1, "sine", 0.25);
}

export function playMenuClose() {
  tone(330, 0.06, "sine", 0.2);
}

export function playError() {
  tone(200, 0.08, "square", 0.2);
  setTimeout(() => tone(200, 0.08, "square", 0.2), 100);
}

export function playShutdown() {
  tone(500, 0.15, "sine", 0.3);
  setTimeout(() => tone(400, 0.15, "sine", 0.25), 120);
  setTimeout(() => tone(250, 0.25, "sine", 0.2), 250);
}

// Pet sounds
export function playFeed() {
  tone(262, 0.07, "sine", 0.3);
  setTimeout(() => tone(330, 0.07, "sine", 0.3), 60);
  setTimeout(() => tone(392, 0.1, "sine", 0.3), 120);
}

export function playPetDeath() {
  sweep(400, 100, 0.3, "sine", 0.35);
}

export function playPoopSplat() {
  noise(0.05, 0.2);
  tone(80, 0.08, "sine", 0.3);
}

export function playHeart() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 8;
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  gain.gain.value = 0.2;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(c.currentTime);
  lfo.start(c.currentTime);
  osc.stop(c.currentTime + 0.15);
  lfo.stop(c.currentTime + 0.15);
}

export function playBirth() {
  sweep(1000, 1500, 0.15, "sine", 0.25);
}

// Farm sounds
export function playPlant() {
  tone(150, 0.05, "sine", 0.25);
}

export function playWater() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = 600;
  osc.frequency.linearRampToValueAtTime(400, c.currentTime + 0.1);
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 20;
  lfoGain.gain.value = 50;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  gain.gain.value = 0.2;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(c.currentTime);
  lfo.start(c.currentTime);
  osc.stop(c.currentTime + 0.1);
  lfo.stop(c.currentTime + 0.1);
}

export function playHarvest() {
  tone(330, 0.06, "sine", 0.3);
  setTimeout(() => tone(392, 0.06, "sine", 0.3), 50);
  setTimeout(() => tone(523, 0.1, "sine", 0.3), 100);
}

// Tractor sounds
export function playTractorTick() {
  tone(220, 0.04, "square", 0.15);
}

// Factory sounds
export function playFactoryMatch() {
  sweep(400, 700, 0.1, "sine", 0.25);
}

export function playFactoryMiss() {
  tone(200, 0.08, "square", 0.2);
}

// Item landing thud
export function playLand() {
  tone(120, 0.06, "sine", 0.2);
  noise(0.03, 0.1);
}

// Purchase sound
export function playPurchase() {
  tone(523, 0.08, "sine", 0.3);
  setTimeout(() => tone(659, 0.08, "sine", 0.3), 70);
  setTimeout(() => tone(784, 0.12, "sine", 0.3), 140);
}

// BSOD sound
export function playBSOD() {
  sweep(800, 200, 0.4, "square", 0.3);
  setTimeout(() => noise(0.15, 0.25), 400);
}

// Master volume control (for future Settings)
export function setVolume(v) {
  getMaster().gain.value = Math.max(0, Math.min(1, v));
}

export function setMute(muted) {
  getMaster().gain.value = muted ? 0 : 0.3;
}

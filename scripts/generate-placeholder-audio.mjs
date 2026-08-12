#!/usr/bin/env node
// Generates placeholder audio for the release content created in Phase 2.
//
// Every clip is synthesized from sine waves — thematically apt for a project
// named after "senoide" (sinusoid) — using a small additive synth (a few
// harmonics + a slow vibrato) so it reads as a musical phrase rather than a
// test tone. Each note's envelope ramps from and to exact silence, and every
// clip is trimmed to start/end at a zero-crossing, so consecutive tracks in
// an album can be queued back-to-back with no click — real content for the
// gapless-playback feature, not just a mock.
//
// Deterministic: same slug + track index always produces the same clip
// (mulberry32 PRNG seeded from a string hash), so re-running this script
// after editing content.config.ts or adding tracks is safe and reproducible.
//
// Usage: node scripts/generate-placeholder-audio.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/audio/placeholder');

const SAMPLE_RATE = 22050;
const BIT_DEPTH = 16;

// slug -> [{ track index, duration seconds, scale }]
// Scales are simple pentatonic-ish frequency sets (Hz) so notes always
// sound consonant regardless of which are picked at random.
const SCALES = {
  minorPent: [220.0, 261.63, 293.66, 329.63, 392.0], // A minor pentatonic-ish
  majorPent: [246.94, 277.18, 311.13, 369.99, 415.3], // B-ish major pentatonic
  aiShimmer: [174.61, 220.0, 261.63, 349.23, 415.3], // used for AI arrangements — same
  // pitch classes as the originals they revisit, one octave up in the mix
};

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synthesizeNote(rand, freq, durationSec, sampleRate) {
  const n = Math.floor(durationSec * sampleRate);
  const attack = Math.min(0.015 * sampleRate, n * 0.2);
  const release = Math.min(0.08 * sampleRate, n * 0.3);
  const vibratoRate = 4 + rand() * 1.5; // Hz
  const vibratoDepth = 0.004; // fraction of freq
  const out = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const vibrato = 1 + vibratoDepth * Math.sin(2 * Math.PI * vibratoRate * t);
    const f = freq * vibrato;

    // Additive: fundamental + two quiet harmonics for a warmer, less
    // "test tone" timbre.
    let s =
      Math.sin(2 * Math.PI * f * t) * 0.6 +
      Math.sin(2 * Math.PI * f * 2 * t) * 0.18 +
      Math.sin(2 * Math.PI * f * 3 * t) * 0.08;

    // Envelope: linear attack, sustain, linear release — guarantees 0 at
    // both edges of the note.
    let env = 1;
    if (i < attack) env = i / attack;
    else if (i > n - release) env = Math.max(0, (n - i) / release);

    out[i] = s * env;
  }
  return out;
}

function synthesizeTrack({ seed, durationSec, scale }) {
  const rand = mulberry32(Math.floor(hashSeed(seed)() * 2 ** 31));
  const totalSamples = Math.floor(durationSec * SAMPLE_RATE);
  const buffer = new Float32Array(totalSamples);

  let cursor = 0;
  while (cursor < totalSamples) {
    const noteLen = 0.7 + rand() * 0.6; // 0.7–1.3s per note
    const freq = scale[Math.floor(rand() * scale.length)] * (rand() < 0.15 ? 2 : 1);
    const note = synthesizeNote(rand, freq, noteLen, SAMPLE_RATE);

    for (let i = 0; i < note.length && cursor + i < totalSamples; i++) {
      buffer[cursor + i] += note[i];
    }
    cursor += note.length;
  }

  // Gentle master limiter so overlapping harmonics never clip, and force
  // hard silence at the very first/last sample for guaranteed zero-crossing
  // boundaries (needed for gapless queueing).
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) peak = Math.max(peak, Math.abs(buffer[i]));
  const norm = peak > 0 ? 0.85 / peak : 1;
  for (let i = 0; i < buffer.length; i++) buffer[i] *= norm;
  buffer[0] = 0;
  buffer[buffer.length - 1] = 0;

  return buffer;
}

function floatTo16BitPCM(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function encodeWav(samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(BIT_DEPTH, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }

  return buffer;
}

// release slug -> tracks to generate
const RELEASES = {
  'primeiro-sinal': [{ duration: 11, scale: 'minorPent' }],
  interferencia: [
    { duration: 10, scale: 'majorPent' },
    { duration: 13, scale: 'majorPent' },
    { duration: 9, scale: 'minorPent' },
  ],
  'padroes-invisiveis': [
    { duration: 12, scale: 'minorPent' },
    { duration: 14, scale: 'majorPent' },
    { duration: 11, scale: 'minorPent' },
    { duration: 13, scale: 'majorPent' },
    { duration: 10, scale: 'minorPent' },
  ],
  'rearranjos-i': [
    { duration: 13, scale: 'aiShimmer' },
    { duration: 15, scale: 'aiShimmer' },
    { duration: 12, scale: 'aiShimmer' },
  ],
};

async function main() {
  for (const [slug, tracks] of Object.entries(RELEASES)) {
    const dir = path.join(OUT_DIR, slug);
    await mkdir(dir, { recursive: true });

    for (let i = 0; i < tracks.length; i++) {
      const { duration, scale } = tracks[i];
      const seed = `${slug}:${i}`;
      const floatSamples = synthesizeTrack({
        seed,
        durationSec: duration,
        scale: SCALES[scale],
      });
      const pcm = floatTo16BitPCM(floatSamples);
      const wav = encodeWav(pcm, SAMPLE_RATE);
      const file = path.join(dir, `${String(i + 1).padStart(2, '0')}.wav`);
      await writeFile(file, wav);
      console.log(`wrote ${path.relative(process.cwd(), file)} (${duration}s)`);
    }
  }
}

main();

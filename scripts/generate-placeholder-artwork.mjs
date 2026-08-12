#!/usr/bin/env node
// Generates placeholder cover artwork for the release content created in
// Phase 2 — deterministic per slug, built from the same sine-wave motif as
// SineDivider.astro, in variations of the site's own accent color rather
// than random hues. Meant to be replaced with real photography/art per the
// roadmap; exists so release pages don't ship with broken <img> tags.
//
// Usage: node scripts/generate-placeholder-artwork.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/artwork');

const BG = '#0f0e14';
const ACCENT_H = 256; // hue of #9e7dfa in HSL

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

function sinePath({ rows, width, height, amplitude, freq, phase, seedRand }) {
  const jitter = 0.15 + seedRand() * 0.25;
  const pts = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const x = (width * i) / steps;
    const y =
      height / 2 +
      Math.sin((i / steps) * Math.PI * 2 * freq + phase) * amplitude * (1 - jitter * 0.3);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function generateSvg(slug, { size = 800 } = {}) {
  const rand = mulberry32(hashSeed(slug));
  const hue = ACCENT_H + (rand() - 0.5) * 60;
  const lines = 5 + Math.floor(rand() * 4);

  const layers = [];
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const y = size * (0.15 + t * 0.7);
    const amplitude = size * (0.04 + rand() * 0.05);
    const freq = 1 + Math.floor(rand() * 3);
    const phase = rand() * Math.PI * 2;
    const lightness = 55 + rand() * 25;
    const opacity = 0.25 + t * 0.5;

    const path = sinePath({
      rows: lines,
      width: size,
      height: amplitude * 2,
      amplitude,
      freq,
      phase,
      seedRand: rand,
    });

    layers.push(
      `<g transform="translate(0, ${y.toFixed(1)})">` +
        `<path d="${path}" fill="none" stroke="hsl(${hue.toFixed(0)} 35% ${lightness.toFixed(0)}%)" ` +
        `stroke-width="${(1.5 + rand() * 2).toFixed(1)}" stroke-linecap="round" opacity="${opacity.toFixed(2)}" />` +
        `</g>`
    );
  }

  const vignetteId = `vg-${slug}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <radialGradient id="${vignetteId}" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="hsl(${hue.toFixed(0)} 22% 14%)" />
      <stop offset="100%" stop-color="${BG}" />
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#${vignetteId})" />
  ${layers.join('\n  ')}
</svg>
`;
}

const SLUGS = ['primeiro-sinal', 'interferencia', 'padroes-invisiveis', 'rearranjos-i'];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const slug of SLUGS) {
    const svg = generateSvg(slug);
    const file = path.join(OUT_DIR, `${slug}.svg`);
    await writeFile(file, svg);
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  }
}

main();

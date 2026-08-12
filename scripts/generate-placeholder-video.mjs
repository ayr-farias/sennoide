#!/usr/bin/env node
// Generates placeholder "visualizer" videos for the video content created in
// Phase 3 — an ffmpeg `showwaves` render driven by the actual placeholder
// audio tracks (see generate-placeholder-audio.mjs), in the site's own
// accent color. Unlike the audio/artwork placeholders, this script is NOT
// used to stand in for "DIY" or "live" video content — there's no honest
// way to synthesize a fake performance. A generated waveform visual, on the
// other hand, genuinely *is* what a "visualizer" video is, so calling it
// one isn't a placeholder pretending to be something it's not.
//
// Requires ffmpeg on PATH. Usage:
//   node scripts/generate-placeholder-video.mjs

import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/video/placeholder');

const BG = '0x0f0e14';

const VIDEOS = [
  {
    slug: 'rearranjos-i-rotina-visualizer',
    audio: 'public/audio/placeholder/rearranjos-i/01.wav',
    colors: '0x9e7dfa|0x7c5ce0',
    posterAt: 3,
  },
  {
    slug: 'rearranjos-i-distancia-visualizer',
    audio: 'public/audio/placeholder/rearranjos-i/02.wav',
    colors: '0xb79cfc|0x9e7dfa',
    posterAt: 4,
  },
];

function checkFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error(
      'ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg`) and re-run this script.'
    );
    process.exit(1);
  }
}

async function renderVideo({ slug, audio, colors, posterAt }) {
  const dir = path.join(OUT_DIR, slug);
  await mkdir(dir, { recursive: true });

  const audioPath = path.join(ROOT, audio);
  const videoPath = path.join(dir, 'video.mp4');
  const posterPath = path.join(dir, 'poster.jpg');

  const filter =
    `[1:a]showwaves=s=1280x360:mode=cline:colors=${colors}:rate=30,format=rgba,colorkey=0x000000:0.12:0.06[wave];` +
    `[0:v][wave]overlay=(W-w)/2:(H-h)/2:shortest=1:format=auto[v]`;

  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', `color=c=${BG}:s=1280x720:r=30`,
    '-i', audioPath,
    '-filter_complex', filter,
    '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    videoPath,
  ], { stdio: 'inherit' });

  execFileSync('ffmpeg', [
    '-y',
    '-ss', String(posterAt),
    '-i', videoPath,
    '-update', '1',
    '-vframes', '1',
    '-q:v', '3',
    posterPath,
  ], { stdio: 'inherit' });

  console.log(`wrote ${path.relative(ROOT, videoPath)} + poster.jpg`);
}

async function main() {
  checkFfmpeg();
  for (const video of VIDEOS) {
    await renderVideo(video);
  }
}

main();

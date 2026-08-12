// Renders a bar-style waveform for a decoded AudioBuffer and paints
// playback progress over it by simply coloring bars left of the progress
// line differently — no clipping tricks, cheap enough to redraw every
// animation frame. Peaks are cached per (buffer, bucket count) so resizing
// the window doesn't force a full recompute unless the bucket count
// actually changes.

const peaksCache = new WeakMap<AudioBuffer, Map<number, Float32Array>>();

function computePeaks(buffer: AudioBuffer, buckets: number): Float32Array {
  let byBucketCount = peaksCache.get(buffer);
  const cached = byBucketCount?.get(buckets);
  if (cached) return cached;

  const channel = buffer.getChannelData(0);
  const samplesPerBucket = Math.max(1, Math.floor(channel.length / buckets));
  const peaks = new Float32Array(buckets);

  for (let b = 0; b < buckets; b++) {
    const start = b * samplesPerBucket;
    const end = Math.min(channel.length, start + samplesPerBucket);
    let peak = 0;
    for (let i = start; i < end; i++) {
      const abs = Math.abs(channel[i]);
      if (abs > peak) peak = abs;
    }
    peaks[b] = peak;
  }

  if (!byBucketCount) {
    byBucketCount = new Map();
    peaksCache.set(buffer, byBucketCount);
  }
  byBucketCount.set(buckets, peaks);
  return peaks;
}

function resolveColor(el: Element, varName: string, fallback: string): string {
  const value = getComputedStyle(el).getPropertyValue(varName).trim();
  return value || fallback;
}

export class WaveformView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private peaks: Float32Array | null = null;
  private lastBuffer: AudioBuffer | null = null;
  private progress = 0;
  private mutedColor: string;
  private accentColor: string;
  private resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas context unavailable');
    this.ctx = context;
    this.mutedColor = resolveColor(canvas, '--color-border', '#2d2a37');
    this.accentColor = resolveColor(canvas, '--color-accent', '#9e7dfa');

    this.resizeObserver = new ResizeObserver(() => this.refit());
    this.resizeObserver.observe(canvas);
  }

  setBuffer(buffer: AudioBuffer | null) {
    this.lastBuffer = buffer;
    this.recomputePeaks();
    this.draw();
  }

  setProgress(fraction: number) {
    this.progress = Math.max(0, Math.min(1, fraction));
    this.draw();
  }

  /** Given a client X coordinate (e.g. from a click/keydown handler), returns
   *  the corresponding 0..1 fraction across the canvas. */
  fractionAtClientX(clientX: number): number {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  destroy() {
    this.resizeObserver.disconnect();
  }

  private bucketCount(): number {
    const rect = this.canvas.getBoundingClientRect();
    const barPitch = 4; // px per bar+gap, before DPR scaling
    return Math.max(24, Math.floor(rect.width / barPitch));
  }

  private recomputePeaks() {
    this.peaks = this.lastBuffer ? computePeaks(this.lastBuffer, this.bucketCount()) : null;
  }

  private refit() {
    this.recomputePeaks();
    this.draw();
  }

  private draw() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    if (!this.peaks || this.peaks.length === 0) {
      ctx.fillStyle = this.mutedColor;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(0, h / 2 - dpr, w, dpr * 2);
      ctx.globalAlpha = 1;
      return;
    }

    const n = this.peaks.length;
    const pitch = w / n;
    const barWidth = Math.max(1, pitch * 0.62);
    const progressX = w * this.progress;
    const minHeight = h * 0.045;

    for (let i = 0; i < n; i++) {
      const x = i * pitch;
      const barH = Math.max(minHeight, this.peaks[i] * h * 0.92);
      const y = (h - barH) / 2;
      ctx.fillStyle = x < progressX ? this.accentColor : this.mutedColor;
      ctx.globalAlpha = x < progressX ? 1 : 0.7;
      ctx.fillRect(x, y, barWidth, barH);
    }
    ctx.globalAlpha = 1;
  }
}

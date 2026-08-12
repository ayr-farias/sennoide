// Sample-accurate queue player built on the Web Audio API rather than a
// plain <audio> element. Two things this project's roadmap asked for only
// come for free this way:
//
//   - Gapless playback: instead of waiting for one track to fire "ended"
//     and then starting the next (which always has a small gap — network,
//     decode, or just event-loop latency), we schedule the next track's
//     AudioBufferSourceNode to start at the exact sample where the current
//     one ends, computed from AudioContext.currentTime. The browser's audio
//     clock — not JS timers — is what makes the splice seamless.
//   - Waveforms: playback and waveform rendering both need the same
//     decoded AudioBuffer, so the engine caches buffers by URL and hands
//     them out to whoever asks (see waveform.ts), decoding each file once.
//
// Every track in the queue is decoded in full before it can play — fine at
// the scale of a song, and it's what makes gapless scheduling possible at
// all (you can't compute an exact boundary from a stream you haven't
// finished reading).

export type RepeatMode = 'off' | 'all' | 'one';

export interface QueueTrack {
  title: string;
  src: string;
  /** Estimated seconds, from content frontmatter — used for UI before the
   *  real file is decoded. The decoded AudioBuffer's duration always wins
   *  once available. */
  duration?: number;
}

interface ScheduledNext {
  index: number;
  source: AudioBufferSourceNode;
  startCtxTime: number;
}

type EngineEvent =
  | 'trackchange'
  | 'play'
  | 'pause'
  | 'timeupdate'
  | 'ended'
  | 'loading'
  | 'queuechange'
  | 'error';

export class AudioEngine extends EventTarget {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;

  private queue: QueueTrack[] = [];
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer>>();

  private currentIndex: number | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private currentStartCtxTime = 0;
  private pausedOffset = 0;

  private scheduledNext: ScheduledNext | null = null;
  private boundaryTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;

  private playing = false;
  private shuffle = false;
  private repeat: RepeatMode = 'off';
  private shuffledOrder: number[] = [];

  on(type: EngineEvent, listener: (e: CustomEvent) => void) {
    this.addEventListener(type, listener as EventListener);
  }

  off(type: EngineEvent, listener: (e: CustomEvent) => void) {
    this.removeEventListener(type, listener as EventListener);
  }

  private emit(type: EngineEvent, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  setQueue(tracks: QueueTrack[]) {
    this.stop();
    this.queue = tracks;
    this.reshuffle();
    this.emit('queuechange');
  }

  getQueue(): readonly QueueTrack[] {
    return this.queue;
  }

  getState() {
    return {
      currentIndex: this.currentIndex,
      playing: this.playing,
      shuffle: this.shuffle,
      repeat: this.repeat,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
    };
  }

  setShuffle(on: boolean) {
    this.shuffle = on;
    this.reshuffle();
    this.rescheduleIfPlaying();
  }

  setRepeat(mode: RepeatMode) {
    this.repeat = mode;
    this.rescheduleIfPlaying();
  }

  setVolume(v: number) {
    if (this.gain) this.gain.gain.value = Math.max(0, Math.min(1, v));
  }

  private reshuffle() {
    const order = this.queue.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    this.shuffledOrder = order;
  }

  private playOrder(): number[] {
    return this.shuffle ? this.shuffledOrder : this.queue.map((_, i) => i);
  }

  private peekNextIndex(): number | null {
    if (this.currentIndex == null) return null;
    if (this.repeat === 'one') return this.currentIndex;
    const order = this.playOrder();
    const pos = order.indexOf(this.currentIndex);
    if (pos === -1) return null;
    if (pos + 1 < order.length) return order[pos + 1];
    return this.repeat === 'all' ? order[0] : null;
  }

  private peekPrevIndex(): number | null {
    if (this.currentIndex == null) return null;
    const order = this.playOrder();
    const pos = order.indexOf(this.currentIndex);
    if (pos > 0) return order[pos - 1];
    return this.repeat === 'all' ? order[order.length - 1] : null;
  }

  private async ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  private loadBuffer(index: number): Promise<AudioBuffer> {
    const track = this.queue[index];
    const cached = this.buffers.get(track.src);
    if (cached) return Promise.resolve(cached);

    let pending = this.pending.get(track.src);
    if (!pending) {
      pending = fetch(track.src)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch ${track.src}: ${res.status}`);
          return res.arrayBuffer();
        })
        .then((arrayBuffer) => this.ctx!.decodeAudioData(arrayBuffer))
        .then((buffer) => {
          this.buffers.set(track.src, buffer);
          this.pending.delete(track.src);
          return buffer;
        })
        .catch((err) => {
          this.pending.delete(track.src);
          this.emit('error', { index, error: err });
          throw err;
        });
      this.pending.set(track.src, pending);
    }
    return pending;
  }

  private preloadNext() {
    const nextIndex = this.peekNextIndex();
    if (nextIndex != null && nextIndex !== this.currentIndex) {
      this.loadBuffer(nextIndex).catch(() => {});
    }
  }

  async play(index = this.currentIndex ?? 0, offset = 0) {
    if (!this.queue[index]) return;
    await this.ensureContext();

    this.stopCurrentSource();
    this.clearScheduledNext();

    const trackChanged = this.currentIndex !== index;
    this.currentIndex = index;
    if (trackChanged) this.emit('trackchange', { index });

    this.emit('loading', { index, loading: true });
    let buffer: AudioBuffer;
    try {
      buffer = await this.loadBuffer(index);
    } catch {
      this.emit('loading', { index, loading: false });
      return;
    }
    this.emit('loading', { index, loading: false });

    // Superseded by a newer play()/seek() call while we were decoding.
    if (this.currentIndex !== index) return;

    const clampedOffset = Math.max(0, Math.min(offset, buffer.duration));
    const startAt = this.ctx!.currentTime + 0.03;

    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain!);
    source.onended = () => this.handleSourceEnded(source);
    source.start(startAt, clampedOffset);

    this.currentSource = source;
    this.currentBuffer = buffer;
    this.currentStartCtxTime = startAt - clampedOffset;
    this.playing = true;

    this.emit('play');
    this.startTicking();
    this.preloadNext();
    this.scheduleNext();
  }

  resume() {
    if (this.playing || this.currentIndex == null) return;
    this.play(this.currentIndex, this.pausedOffset);
  }

  pause() {
    if (!this.playing) return;
    this.pausedOffset = this.getCurrentTime();
    this.stopCurrentSource();
    this.clearScheduledNext();
    this.playing = false;
    this.stopTicking();
    this.emit('pause');
  }

  toggle() {
    if (this.playing) this.pause();
    else this.resume();
  }

  stop() {
    this.stopCurrentSource();
    this.clearScheduledNext();
    this.stopTicking();
    this.playing = false;
    this.currentIndex = null;
    this.currentBuffer = null;
    this.pausedOffset = 0;
  }

  next() {
    const nextIndex = this.peekNextIndex() ?? (this.repeat === 'off' ? null : this.playOrder()[0]);
    if (nextIndex == null) return;
    this.play(nextIndex, 0);
  }

  prev() {
    // >3s into the track: restart it, like most media players, rather than
    // always jumping back a full track.
    if (this.getCurrentTime() > 3) {
      this.play(this.currentIndex!, 0);
      return;
    }
    const prevIndex = this.peekPrevIndex();
    if (prevIndex == null) {
      this.play(this.currentIndex!, 0);
      return;
    }
    this.play(prevIndex, 0);
  }

  seek(time: number) {
    if (this.currentIndex == null) return;
    const duration = this.getDuration();
    const clamped = Math.max(0, Math.min(time, duration));
    if (this.playing) {
      this.play(this.currentIndex, clamped);
    } else {
      this.pausedOffset = clamped;
      this.emit('timeupdate', { currentTime: clamped, duration });
    }
  }

  seekBy(delta: number) {
    this.seek(this.getCurrentTime() + delta);
  }

  getCurrentTime(): number {
    if (this.currentIndex == null) return 0;
    if (this.playing && this.ctx) {
      return Math.max(0, this.ctx.currentTime - this.currentStartCtxTime);
    }
    return this.pausedOffset;
  }

  getDuration(): number {
    if (this.currentBuffer) return this.currentBuffer.duration;
    if (this.currentIndex != null) return this.queue[this.currentIndex]?.duration ?? 0;
    return 0;
  }

  getBufferFor(index: number): AudioBuffer | undefined {
    return this.buffers.get(this.queue[index]?.src);
  }

  private stopCurrentSource() {
    if (this.currentSource) {
      this.currentSource.onended = null;
      try {
        this.currentSource.stop();
      } catch {
        // already stopped/ended — fine
      }
      this.currentSource.disconnect();
      this.currentSource = null;
    }
  }

  private clearScheduledNext() {
    if (this.scheduledNext) {
      this.scheduledNext.source.onended = null;
      try {
        this.scheduledNext.source.stop();
      } catch {
        // hasn't started yet or already stopped — fine either way
      }
      this.scheduledNext.source.disconnect();
      this.scheduledNext = null;
    }
    if (this.boundaryTimer != null) {
      clearTimeout(this.boundaryTimer);
      this.boundaryTimer = null;
    }
  }

  private rescheduleIfPlaying() {
    if (this.playing) this.scheduleNext();
  }

  private scheduleNext() {
    this.clearScheduledNext();
    if (!this.playing || !this.currentBuffer || !this.ctx) return;

    const nextIndex = this.peekNextIndex();
    if (nextIndex == null) return;

    const buffer = this.buffers.get(this.queue[nextIndex].src);
    if (!buffer) {
      // Not decoded yet — try again once it is, if it's still relevant.
      this.loadBuffer(nextIndex)
        .then((buf) => {
          if (this.playing && this.peekNextIndex() === nextIndex && !this.scheduledNext) {
            this.scheduleNextWithBuffer(nextIndex, buf);
          }
        })
        .catch(() => {});
      return;
    }
    this.scheduleNextWithBuffer(nextIndex, buffer);
  }

  private scheduleNextWithBuffer(nextIndex: number, buffer: AudioBuffer) {
    if (!this.ctx || !this.gain || !this.currentBuffer) return;
    const boundaryCtxTime = this.currentStartCtxTime + this.currentBuffer.duration;
    const lead = boundaryCtxTime - this.ctx.currentTime;
    if (lead < 0.02) return; // too close to the edge to land it precisely

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    source.start(boundaryCtxTime, 0);

    this.scheduledNext = { index: nextIndex, source, startCtxTime: boundaryCtxTime };
    this.boundaryTimer = setTimeout(
      () => this.commitScheduledAdvance(),
      Math.max(0, lead * 1000)
    );
  }

  private commitScheduledAdvance() {
    if (!this.scheduledNext) return;
    const { index, source, startCtxTime } = this.scheduledNext;
    if (this.boundaryTimer != null) {
      clearTimeout(this.boundaryTimer);
      this.boundaryTimer = null;
    }

    this.stopCurrentSource();
    this.currentSource = source;
    source.onended = () => this.handleSourceEnded(source);
    this.currentBuffer = this.buffers.get(this.queue[index].src)!;
    this.currentStartCtxTime = startCtxTime;
    this.currentIndex = index;
    this.scheduledNext = null;

    this.emit('trackchange', { index });
    this.preloadNext();
    this.scheduleNext();
  }

  private handleSourceEnded(source: AudioBufferSourceNode) {
    if (this.currentSource !== source) return; // stale callback

    if (this.scheduledNext) {
      this.commitScheduledAdvance();
      return;
    }

    // Scheduling fell through (e.g. slow first decode) — advance with
    // whatever gap that costs us instead of just stopping silently.
    const nextIndex = this.peekNextIndex();
    if (nextIndex == null) {
      this.currentSource = null;
      this.playing = false;
      this.stopTicking();
      this.emit('ended');
      return;
    }
    this.play(nextIndex, 0);
  }

  private tick = () => {
    if (!this.playing) return;
    this.emit('timeupdate', {
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
    });
    this.rafId = requestAnimationFrame(this.tick);
  };

  private startTicking() {
    if (this.rafId == null) this.rafId = requestAnimationFrame(this.tick);
  }

  private stopTicking() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

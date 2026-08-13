// Queue player built on two <audio> elements — not the raw Web Audio API
// this used to run on. The reason to switch: a bare AudioContext gets
// suspended by iOS Safari the instant the tab backgrounds or the screen
// locks, while a real <audio> element tied to a Media Session keeps
// playing. See mediaSession.ts for the lock-screen/OS integration this
// unlocks.
//
// "Gapless" here means: the next track is preloaded into the idle element
// while the current one plays, and swapped in the instant the current one
// fires `ended`. That's not the sample-accurate splice a scheduled Web
// Audio graph gives you, but it's the best available technique once
// playback has to be an <audio> element for background support — in
// practice the residual gap is a handful of milliseconds.
//
// The waveform is decoded separately, after playback has already started
// (Web Audio's decodeAudioData, used only for its PCM output — the result
// is never connected to any audio destination). It doesn't gate playback,
// which also means a track starts immediately instead of waiting on a
// full fetch+decode first, and it fails soft: a track that can't be
// decoded for its waveform still plays fine.

export type RepeatMode = 'off' | 'all' | 'one';

export interface QueueTrack {
  title: string;
  src: string;
  /** Estimated seconds, from content frontmatter — used for UI before
   *  real duration is known, and to decide whether a track is too long to
   *  safely decode in full for its waveform (see MAX_WAVEFORM_SECONDS). */
  duration?: number;
}

type EngineEvent =
  | 'trackchange'
  | 'play'
  | 'pause'
  | 'timeupdate'
  | 'ended'
  | 'loading'
  | 'queuechange'
  | 'error'
  | 'waveform';

// decodeAudioData materializes the *entire* file as float32 PCM in memory
// — for a 40+ minute file that's hundreds of MB, enough to crash the tab
// on a phone. Playback has no such ceiling since <audio> streams; this
// only skips the (cosmetic) waveform for anything this long.
const MAX_WAVEFORM_SECONDS = 20 * 60;

export class AudioEngine extends EventTarget {
  private elA: HTMLAudioElement;
  private elB: HTMLAudioElement;
  private activeIsA = true;
  private elAIndex: number | null = null;
  private elBIndex: number | null = null;
  private unlocked = false;

  private waveformCtx: AudioContext | null = null;
  private waveformBuffers = new Map<string, AudioBuffer>();
  private waveformPending = new Set<string>();

  private queue: QueueTrack[] = [];
  private currentIndex: number | null = null;
  private playing = false;
  private shuffle = false;
  private repeat: RepeatMode = 'off';
  private shuffledOrder: number[] = [];

  constructor() {
    super();
    this.elA = this.createElement();
    this.elB = this.createElement();
  }

  private createElement(): HTMLAudioElement {
    const el = new Audio();
    el.preload = 'auto';
    el.addEventListener('timeupdate', () => {
      if (el !== this.currentEl()) return;
      this.emit('timeupdate', { currentTime: el.currentTime, duration: this.getDuration() });
    });
    el.addEventListener('ended', () => {
      if (el !== this.currentEl()) return;
      this.handleEnded();
    });
    el.addEventListener('error', () => {
      const index = this.getElIndex(el);
      if (index != null) this.emit('error', { index, error: el.error });
    });
    return el;
  }

  on(type: EngineEvent, listener: (e: CustomEvent) => void) {
    this.addEventListener(type, listener as EventListener);
  }

  off(type: EngineEvent, listener: (e: CustomEvent) => void) {
    this.removeEventListener(type, listener as EventListener);
  }

  private emit(type: EngineEvent, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  private currentEl(): HTMLAudioElement {
    return this.activeIsA ? this.elA : this.elB;
  }

  private idleEl(): HTMLAudioElement {
    return this.activeIsA ? this.elB : this.elA;
  }

  private setElIndex(el: HTMLAudioElement, index: number | null) {
    if (el === this.elA) this.elAIndex = index;
    else this.elBIndex = index;
  }

  private getElIndex(el: HTMLAudioElement): number | null {
    return el === this.elA ? this.elAIndex : this.elBIndex;
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
    this.preloadNext();
  }

  setRepeat(mode: RepeatMode) {
    this.repeat = mode;
    this.preloadNext();
  }

  setVolume(v: number) {
    const vol = Math.max(0, Math.min(1, v));
    this.elA.volume = vol;
    this.elB.volume = vol;
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

  /** iOS Safari only allows an <audio> element to be started
   *  programmatically without a fresh user gesture if it's previously
   *  been played (even silently) *during* a real gesture. Runs once,
   *  synchronously inside the first play() call, so the element that's
   *  later auto-advanced into via `ended` — with no gesture of its own —
   *  is allowed to play. */
  private unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const el of [this.elA, this.elB]) {
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(() => el.pause()).catch(() => {});
      } else {
        el.pause();
      }
    }
  }

  play(index = this.currentIndex ?? 0, offset = 0) {
    const track = this.queue[index];
    if (!track) return;
    this.unlock();

    // If the idle element already has this exact track preloaded (the
    // common case: next/prev, or picking up where gapless preload left
    // off), swap to it instead of starting a fresh fetch.
    const idle = this.idleEl();
    const useIdle = offset === 0 && this.getElIndex(idle) === index;

    const el = useIdle ? idle : this.currentEl();
    if (useIdle) this.activeIsA = !this.activeIsA;
    this.stopOtherElement(el);

    if (!useIdle) {
      if (el.src !== track.src) {
        el.src = track.src;
        this.setElIndex(el, index);
      }
      try {
        el.currentTime = offset;
      } catch {
        // Not seekable yet (metadata not loaded) — starts from 0.
      }
    }

    const trackChanged = this.currentIndex !== index;
    this.currentIndex = index;

    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        this.playing = false;
        this.emit('error', { index, error: err });
        this.emit('pause');
      });
    }

    this.playing = true;
    if (trackChanged) this.emit('trackchange', { index });
    this.emit('play');
    this.preloadNext();
    this.decodeWaveform(index);
  }

  private stopOtherElement(active: HTMLAudioElement) {
    const other = active === this.elA ? this.elB : this.elA;
    other.pause();
  }

  resume() {
    if (this.playing || this.currentIndex == null) return;
    this.unlock();
    const el = this.currentEl();
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        this.playing = false;
        this.emit('error', { index: this.currentIndex, error: err });
        this.emit('pause');
      });
    }
    this.playing = true;
    this.emit('play');
  }

  pause() {
    if (!this.playing) return;
    this.currentEl().pause();
    this.playing = false;
    this.emit('pause');
  }

  toggle() {
    if (this.playing) this.pause();
    else this.resume();
  }

  stop() {
    this.elA.pause();
    this.elB.pause();
    this.playing = false;
    this.currentIndex = null;
  }

  next() {
    const nextIndex = this.peekNextIndex() ?? (this.repeat === 'off' ? null : this.playOrder()[0]);
    if (nextIndex == null) return;
    this.play(nextIndex, 0);
  }

  prev() {
    // >3s into the track: restart it, like most media players, rather
    // than always jumping back a full track.
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
    try {
      this.currentEl().currentTime = clamped;
    } catch {
      // Not seekable yet — ignore, matches play()'s offset handling.
    }
    if (!this.playing) {
      this.emit('timeupdate', { currentTime: clamped, duration });
    }
    // The idle element was preloaded assuming the old boundary; harmless
    // either way, but redoing it keeps the swap-on-ended path exact.
    this.preloadNext();
  }

  seekBy(delta: number) {
    this.seek(this.getCurrentTime() + delta);
  }

  getCurrentTime(): number {
    if (this.currentIndex == null) return 0;
    return this.currentEl().currentTime;
  }

  getDuration(): number {
    const el = this.currentEl();
    if (Number.isFinite(el.duration) && el.duration > 0) return el.duration;
    if (this.currentIndex != null) return this.queue[this.currentIndex]?.duration ?? 0;
    return 0;
  }

  /** Cached decoded waveform for a track, if decodeWaveform() has already
   *  resolved for it — synchronous, so switching back to an
   *  already-decoded track shows its waveform immediately instead of
   *  waiting again. */
  getWaveformBuffer(index: number): AudioBuffer | undefined {
    const track = this.queue[index];
    return track ? this.waveformBuffers.get(track.src) : undefined;
  }

  private preloadNext() {
    const nextIndex = this.peekNextIndex();
    if (nextIndex == null) return;
    const idle = this.idleEl();
    if (this.getElIndex(idle) === nextIndex) return; // already set up
    const track = this.queue[nextIndex];
    if (!track) return;
    idle.pause();
    idle.src = track.src;
    idle.currentTime = 0;
    idle.load();
    this.setElIndex(idle, nextIndex);
  }

  private handleEnded() {
    const nextIndex = this.peekNextIndex();
    if (nextIndex == null) {
      this.playing = false;
      this.emit('ended');
      return;
    }

    const idle = this.idleEl();
    if (this.getElIndex(idle) === nextIndex) {
      // Preloaded and ready — swap immediately, no new fetch.
      this.activeIsA = !this.activeIsA;
      this.currentIndex = nextIndex;
      const el = this.currentEl();
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => this.emit('error', { index: nextIndex, error: err }));
      }
      this.emit('trackchange', { index: nextIndex });
      this.emit('play');
      this.preloadNext();
      this.decodeWaveform(nextIndex);
    } else {
      // Preload didn't finish in time (slow network on the first track,
      // usually) — fall back to a normal start; costs a small gap.
      this.play(nextIndex, 0);
    }
  }

  private async decodeWaveform(index: number) {
    const track = this.queue[index];
    if (!track) return;
    if (this.waveformBuffers.has(track.src) || this.waveformPending.has(track.src)) return;
    if ((track.duration ?? 0) > MAX_WAVEFORM_SECONDS) return;

    this.waveformPending.add(track.src);
    try {
      if (!this.waveformCtx) this.waveformCtx = new AudioContext();
      const res = await fetch(track.src);
      if (!res.ok) throw new Error(`Failed to fetch ${track.src}: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await this.waveformCtx.decodeAudioData(arrayBuffer);
      this.waveformBuffers.set(track.src, buffer);
      this.emit('waveform', { index, buffer });
    } catch {
      // Cosmetic only — the track still plays via the <audio> element
      // regardless of whether its waveform could be decoded.
    } finally {
      this.waveformPending.delete(track.src);
    }
  }
}
